
import { config } from 'dotenv';
config();

import { WebSocketServer, WebSocket } from 'ws';
import * as tmi from 'tmi.js';
import { getChannelBadges, getTwitchUser } from './src/services/twitch';
import { runCode } from './src/ai/flows/run-code';
import { sendDiscordMessage } from './src/services/discord';
import { getUserTokens } from './src/lib/firestore';
import { StoredTokens } from './src/lib/token-utils';
import { getStoredTokens, ensureValidToken } from './src/lib/token-utils.server';
import * as fs from 'fs/promises';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import { runFlowGraph, defaultFlowServices } from './src/lib/flow-runtime';
import { setupDefaultPlugins, listPlugins } from './src/plugins';
import { AutomationEngine } from './src/services/automation/AutomationEngine';
import { loadAutomationFromSbDir, watchSbAutomationFiles } from './src/services/automation/sb-loader';
import { TwitchHandlers } from './src/services/automation/subactions/TwitchHandlers';
import { OBSHandlers } from './src/services/automation/subactions/OBSHandlers';
import type { Action as ActionDefinition } from './src/services/automation/types';
import OBSWebSocket from 'obs-websocket-js';
import { readVault, getEffectiveObsUrlFromEnvOrVault } from './src/lib/vault-store';
const ProcessManager = require('./process-manager');
import {
    getAllActions,
    watchActionsFile,
} from './src/lib/actions-store';
import { loadCounter, getNextMessageNumber, cleanupOldMessages } from './src/lib/message-counter';
import { PortManager } from './src/lib/port-manager';

const METRICS_FILE_PATH = resolve(process.cwd(), 'src', 'data', 'stream-metrics.json');

// --- Metrics Management ---
type Metrics = {
    totalCommands: number;
    shoutoutsGiven: number;
    athenaCommands: number;
    lurkCommands: number;
};

let metrics: Metrics = {
    totalCommands: 0,
    shoutoutsGiven: 0,
    athenaCommands: 0,
    lurkCommands: 0,
};

async function loadMetrics(): Promise<void> {
    try {
        const data = await fs.readFile(METRICS_FILE_PATH, 'utf-8');
        metrics = JSON.parse(data);
        console.log('[Metrics] Stream metrics loaded successfully.');
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.log('[Metrics] No metrics file found, starting with fresh stats.');
            await saveMetrics(); // Create the file
        } else {
            console.error('[Metrics] Error loading metrics file:', error);
        }
    }
}

async function saveMetrics(): Promise<void> {
    try {
        await fs.writeFile(METRICS_FILE_PATH, JSON.stringify(metrics, null, 2));
    } catch (error) {
        console.error('[Metrics] Error saving metrics file:', error);
    }
}

async function incrementMetric(key: keyof Metrics, amount = 1) {
    metrics[key] = (metrics[key] || 0) + amount;
    await saveMetrics();
}


const portManager = PortManager.getInstance();
let websocketPort: number = 8090; // Default value

let actionsCache: Record<string, ActionDefinition> = {};
let stopWatchingActions: (() => void) | null = null;

let automationEngine: AutomationEngine | null = null;
let stopWatchingSbAutomation: (() => void) | null = null;

let obsClient: OBSWebSocket | null = null;
let eventSubSocket: WebSocket | null = null;
let eventSubReconnectTimeout: NodeJS.Timeout | null = null;

async function loadActionsIntoCache() {
    try {
        const actions = await getAllActions();
        actionsCache = actions.reduce((acc, action) => {
            acc[action.id] = action;
            return acc;
        }, {} as Record<string, ActionDefinition>);
        console.log(`[Actions] Loaded ${actions.length} actions.`);
    } catch (error) {
        console.error('[Actions] Failed to load actions:', error);
    }
}

function watchActionsForChanges() {
    stopWatchingActions?.();
    stopWatchingActions = watchActionsFile(() => {
        console.log('[Actions] Detected change to actions file, reloading...');
        loadActionsIntoCache().catch((error) =>
            console.error('[Actions] Failed to reload after change:', error)
        );
    });
}

function getActionByTrigger(trigger: string): ActionDefinition | undefined {
    return Object.values(actionsCache).find((action) => action.trigger === trigger);
}

function setupAutomationFromSb(): void {
    const sbDir = resolve(process.cwd(), '..', 'sb');

    automationEngine = new AutomationEngine();

    // Minimal Twitch service bridge so Streamer.bot sub-actions can actually talk to chat.
    TwitchHandlers.setTwitchService({
        sendMessage: async (message: string) => {
            if (!twitchClient) throw new Error('Twitch client not initialized');

            const joined = typeof (twitchClient as any).getChannels === 'function'
                ? (twitchClient as any).getChannels()?.[0]
                : undefined;

            const envChannel = process.env.TWITCH_BROADCASTER_USERNAME || process.env.NEXT_PUBLIC_TWITCH_BROADCASTER_USERNAME;
            const channel = joined || envChannel;
            if (!channel) throw new Error('No Twitch channel configured');

            const normalized = channel.startsWith('#') ? channel : `#${channel}`;
            await twitchClient.say(normalized, message);
        },
        getUserInfo: async (userName: string) => {
            // Best-effort: use existing app-token based lookup.
            const normalized = userName.replace(/^@/, '');
            const user = await getTwitchUser(normalized, 'login');
            if (!user) return {};
            return {
                id: user.id,
                login: normalized,
                display_name: user.displayName,
                description: user.bio,
                profile_image_url: user.profileImageUrl,
                created_at: user.createdAt,
            };
        },
    });

    const load = async () => {
        try {
            const result = await loadAutomationFromSbDir(automationEngine!, sbDir);
            console.log(
                `[Automation] Loaded from sb/: ${result.commandsLoaded} commands, ${result.actionsLoaded} actions (${result.queuesLoaded} queues)`
            );
        } catch (error) {
            console.error('[Automation] Failed to load sb/ automation data:', error);
        }
    };

    void load();

    stopWatchingSbAutomation?.();
    stopWatchingSbAutomation = watchSbAutomationFiles(sbDir, () => {
        console.log('[Automation] Detected change in sb/ commands/actions, reloading...');
        void load();
    });
}

async function setupObsWebSocket(): Promise<void> {
    const vault = await readVault().catch(() => ({}));
    const effective = getEffectiveObsUrlFromEnvOrVault(vault);
    const url = effective.url;
    const password = effective.password;

    if (!url) {
        console.log('[OBS] OBS_WS_URL not set; OBS control disabled.');
        return;
    }

    try {
        obsClient = new OBSWebSocket();

        // Best-effort event listeners (API differs slightly across versions)
        try {
            (obsClient as any).on?.('ConnectionOpened', () => console.log('[OBS] Connected'));
            (obsClient as any).on?.('ConnectionClosed', () => console.log('[OBS] Disconnected'));
        } catch {
            // ignore
        }

        console.log(`[OBS] Connecting to ${url} ...`);

        const passwordTrimmed = typeof password === 'string' ? password.trim() : '';
        if (passwordTrimmed.length > 0) {
            await (obsClient as any).connect(url, passwordTrimmed);
        } else {
            await (obsClient as any).connect(url);
        }
        OBSHandlers.setOBSConnection('default', obsClient);
        console.log('[OBS] Connected and registered with automation engine.');
    } catch (error) {
        console.error('[OBS] Failed to connect to OBS WebSocket:', error);
        obsClient = null;
    }
}

async function getBroadcasterAuth(): Promise<{ clientId: string; accessToken: string; broadcasterId: string } | null> {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const broadcasterId = process.env.TWITCH_BROADCASTER_ID || process.env.NEXT_PUBLIC_HARDCODED_ADMIN_TWITCH_ID;
    if (!clientId || !clientSecret || !broadcasterId) {
        console.warn('[EventSub] Missing TWITCH_CLIENT_ID/TWITCH_CLIENT_SECRET and a broadcaster id (TWITCH_BROADCASTER_ID or NEXT_PUBLIC_HARDCODED_ADMIN_TWITCH_ID)');
        return null;
    }

    const tokens = await getStoredTokens();
    if (!tokens) {
        console.warn('[EventSub] No stored tokens found.');
        return null;
    }

    const accessToken = await ensureValidToken(clientId, clientSecret, 'broadcaster', tokens);
    return { clientId, accessToken: accessToken.replace('oauth:', ''), broadcasterId };
}

async function getBroadcasterTokenScopes(auth: { accessToken: string }): Promise<string[] | null> {
    const res = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.scopes) ? data.scopes : [];
}

async function logBroadcasterTokenScopes(): Promise<void> {
    try {
        const auth = await getBroadcasterAuth();
        if (!auth) return;
        const scopes = await getBroadcasterTokenScopes(auth);
        if (!scopes) {
            console.warn('[EventSub] Token validate failed');
            return;
        }
        console.log('[EventSub] Broadcaster token scopes:', scopes.join(', ') || '(none)');
    } catch (error) {
        console.warn('[EventSub] Failed to validate token scopes:', error);
    }
}

async function deleteExistingChannelPointSubscriptions(auth: { clientId: string; accessToken: string; broadcasterId: string }): Promise<void> {
    try {
        const res = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions?first=100', {
            headers: {
                'Client-ID': auth.clientId,
                Authorization: `Bearer ${auth.accessToken}`,
            },
        });
        if (!res.ok) {
            const text = await res.text();
            console.warn('[EventSub] Failed to list subscriptions:', res.status, text);
            return;
        }
        const data = await res.json();
        const subs = Array.isArray(data?.data) ? data.data : [];
        const matches = subs.filter((s: any) =>
            s?.type === 'channel.channel_points_custom_reward_redemption.add' &&
            String(s?.condition?.broadcaster_user_id || '') === String(auth.broadcasterId)
        );

        for (const sub of matches) {
            const id = String(sub?.id || '');
            if (!id) continue;
            const del = await fetch(`https://api.twitch.tv/helix/eventsub/subscriptions?id=${encodeURIComponent(id)}`, {
                method: 'DELETE',
                headers: {
                    'Client-ID': auth.clientId,
                    Authorization: `Bearer ${auth.accessToken}`,
                },
            });
            if (del.ok) {
                console.log('[EventSub] Deleted old channel point subscription:', id);
            } else {
                const text = await del.text();
                console.warn('[EventSub] Failed to delete subscription:', id, del.status, text);
            }
        }
    } catch (error) {
        console.warn('[EventSub] Error deleting old subscriptions:', error);
    }
}

async function createChannelPointSubscription(auth: { clientId: string; accessToken: string; broadcasterId: string }, sessionId: string): Promise<void> {
    // Requires broadcaster token with channel:read:redemptions
    const body = {
        type: 'channel.channel_points_custom_reward_redemption.add',
        version: '1',
        condition: {
            broadcaster_user_id: auth.broadcasterId,
        },
        transport: {
            method: 'websocket',
            session_id: sessionId,
        },
    };

    const res = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST',
        headers: {
            'Client-ID': auth.clientId,
            Authorization: `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        console.warn('[EventSub] Failed to create channel point subscription:', res.status, text);
        return;
    }

    const data = await res.json().catch(() => null);
    const createdId = data?.data?.[0]?.id;
    console.log('[EventSub] Channel point subscription created:', createdId || '(unknown id)');
}

function scheduleEventSubReconnect(url: string, delayMs = 2000) {
    if (eventSubReconnectTimeout) return;
    eventSubReconnectTimeout = setTimeout(() => {
        eventSubReconnectTimeout = null;
        void startEventSub(url);
    }, delayMs);
}

async function startEventSub(url = 'wss://eventsub.wss.twitch.tv/ws'): Promise<void> {
    if (eventSubSocket) {
        try { eventSubSocket.close(); } catch { /* ignore */ }
        eventSubSocket = null;
    }

    const auth = await getBroadcasterAuth();
    if (!auth) return;

    const scopes = await getBroadcasterTokenScopes(auth);
    if (!scopes) {
        console.warn('[EventSub] Cannot validate broadcaster token; EventSub disabled.');
        return;
    }
    const hasRedemptionsScope = scopes.includes('channel:read:redemptions') || scopes.includes('channel:manage:redemptions');
    if (!hasRedemptionsScope) {
        console.warn('[EventSub] Missing channel point scope (channel:read:redemptions); EventSub disabled. Reconnect Twitch to grant this scope.');
        return;
    }

    console.log('[EventSub] Connecting:', url);
    eventSubSocket = new WebSocket(url);

    eventSubSocket.on('open', () => {
        console.log('[EventSub] Socket open');
    });

    eventSubSocket.on('close', (code, reason) => {
        console.warn('[EventSub] Socket closed:', code, reason?.toString?.() || '');
        scheduleEventSubReconnect('wss://eventsub.wss.twitch.tv/ws', 3000);
    });

    eventSubSocket.on('error', (err) => {
        console.warn('[EventSub] Socket error:', err);
    });

    eventSubSocket.on('message', async (raw) => {
        try {
            const msg = JSON.parse(raw.toString());
            const messageType = msg?.metadata?.message_type;

            if (messageType === 'session_welcome') {
                const sessionId = msg?.payload?.session?.id;
                if (!sessionId) return;
                console.log('[EventSub] Session established:', sessionId);

                // Avoid accumulating subscriptions across restarts.
                await deleteExistingChannelPointSubscriptions(auth);
                await createChannelPointSubscription(auth, sessionId);
                return;
            }

            if (messageType === 'session_reconnect') {
                const reconnectUrl = msg?.payload?.session?.reconnect_url;
                if (typeof reconnectUrl === 'string' && reconnectUrl.startsWith('wss://')) {
                    console.log('[EventSub] Reconnect requested');
                    scheduleEventSubReconnect(reconnectUrl, 500);
                }
                return;
            }

            if (messageType !== 'notification') return;

            const subType = msg?.payload?.subscription?.type;
            if (subType !== 'channel.channel_points_custom_reward_redemption.add') return;

            const event = msg?.payload?.event;
            if (!event) return;

            const rewardId = String(event?.reward?.id || '');
            const rewardTitle = String(event?.reward?.title || '');
            const rewardCost = Number(event?.reward?.cost || 0) || 0;
            const userLogin = String(event?.user_login || event?.user_name || '');
            const userInput = String(event?.user_input || '');

            console.log(`[EventSub] Channel point redeem: ${rewardTitle} (${rewardId}) by ${userLogin}`);

            if (automationEngine) {
                await automationEngine.processEvent({
                    type: 'channelPointReward',
                    platform: 'twitch',
                    user: userLogin,
                    data: {
                        rewardId,
                        rewardTitle,
                        rewardCost,
                        userInput,
                        rawInput: userInput,
                    },
                });
            }
        } catch (error) {
            console.warn('[EventSub] Failed to process message:', error);
        }
    });
}

function emitFlowLog(action: ActionDefinition, trigger: string, event: any) {
    const payload = {
        actionId: action.id,
        actionName: action.name,
        trigger,
        ...event,
        timestamp: event.timestamp || Date.now(),
    };
    broadcast({ type: 'flow-log', payload });
    const prefix = `[Flow][${action.name}]`;
    const message = `${prefix} ${event.message}`;
    if (event.type === 'node-error') {
        console.error(message);
    } else {
        console.log(message);
    }
}


// --- WebSocket Server Setup ---
let wss: WebSocketServer;

// --- Log Broadcasting ---
const originalLog = console.log;
const originalError = console.error;

// A safe stringify function that handles circular references
function safeStringify(obj: any): string {
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (cache.has(value)) {
                // Circular reference found, discard key
                return '[Circular]';
            }
            // Store value in our collection
            cache.add(value);
        }
        return value;
    }, 2); // The '2' argument prettifies the JSON output
}


function formatArgs(args: any[]): string {
    return args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (typeof arg === 'object' && arg !== null) {
            return safeStringify(arg);
        }
        return String(arg);
    }).join(' ');
}


function broadcast(message: object) {
    if (wss && wss.clients) {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}

// Add the broadcast function to the global scope so it can be used inside the sandboxed `runCode` flow.
(global as any).broadcast = broadcast;
(global as any).botPersonality = "You are a helpful AI assistant."; // Default personality
(global as any).botVoice = "Algieba"; // Default voice


console.log = (...args: any[]) => {
    originalLog.apply(console, args);
    if (wss && wss.clients) {
        broadcast({ type: 'log-message', payload: { level: 'log', message: formatArgs(args) } });
    }
};

console.error = (...args: any[]) => {
    originalError.apply(console, args);
    if (wss && wss.clients) {
        broadcast({ type: 'log-message', payload: { level: 'error', message: formatArgs(args) } });
    }
};


console.log(`[WebSocket] Server is running on ws://0.0.0.0:${websocketPort}`);

// --- Twitch Chat Integration ---
let twitchStatus: 'connected' | 'disconnected' | 'connecting' = 'connecting';
let twitchClient: tmi.Client;

async function sendChatMessage(text: string): Promise<void> {
    try {
        const channel = process.env.TWITCH_BROADCASTER_USERNAME || process.env.NEXT_PUBLIC_TWITCH_BROADCASTER_USERNAME;
        if (!channel) {
            console.warn('[Twitch] Cannot send chat message: no channel configured');
            return;
        }
        if (!twitchClient) {
            console.warn('[Twitch] Cannot send chat message: client not initialized');
            return;
        }
        await twitchClient.say(channel, text);
    } catch (error) {
        console.error('[Twitch] Failed to send chat message:', error);
    }
}
type TwitchBadgeVersion = {
    id: string;
    image_url_1x: string;
    image_url_2x: string;
    image_url_4x: string;
};

type TwitchBadgeSet = Record<string, TwitchBadgeVersion>;

type TwitchBadges = Record<string, TwitchBadgeSet>;

let channelBadges: TwitchBadges = {}; // Cache for channel badges
let recentlySentMessages: Set<string> = new Set(); // Track recently sent messages to avoid double logging
let processManager: any = null;
let lastDiscordMessageId: string | null = null; // Track last Discord message for updates
let cachedChatHistory: any[] = []; // Cache chat history to avoid repeated Discord API calls
let chatHistoryLoaded = false; // Track if we've loaded history once
let sentToTwitchIds = new Set<string>(); // Track Discord message IDs already sent to Twitch

if (process.env.DASHBOARD_MODE === 'true') {
    processManager = new (require('./process-manager'))();
}


// Direct Twitch API message sending (for server-side use)
async function sendTwitchChatMessage(message: string, as: 'bot' | 'broadcaster' = 'broadcaster'): Promise<void> {
    try {
        const clientId = process.env.TWITCH_CLIENT_ID;
        const clientSecret = process.env.TWITCH_CLIENT_SECRET;
        const broadcasterId = process.env.NEXT_PUBLIC_HARDCODED_ADMIN_TWITCH_ID;

        if (!clientId || !clientSecret || !broadcasterId) {
            throw new Error('Twitch configuration missing');
        }

        const storedTokens = await getStoredTokens();
        if (!storedTokens) {
            throw new Error('No stored tokens found');
        }

        const tokenType = as === 'bot' ? 'bot' : 'broadcaster';
        const token = await ensureValidToken(clientId, clientSecret, tokenType, storedTokens);
        const senderId = as === 'bot' ? "1213513185" : broadcasterId;

        const response = await fetch(`https://api.twitch.tv/helix/chat/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.replace('oauth:', '')}`,
                'Client-ID': clientId,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                broadcaster_id: broadcasterId,
                sender_id: senderId,
                message: message,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Twitch] API error sending message:`, errorText);
            throw new Error(`Failed to send message to Twitch: ${response.status}`);
        }

        console.log(`[Twitch] Message sent as ${as}: ${message}`);
    } catch (error) {
        console.error('[Twitch] Error sending chat message:', error);
        throw error;
    }
}

async function initializeBadges() {
    const broadcasterId = process.env.NEXT_PUBLIC_HARDCODED_ADMIN_TWITCH_ID;
    if (!broadcasterId) {
        console.error('[Twitch] NEXT_PUBLIC_HARDCODED_ADMIN_TWITCH_ID not set. Retrying in 5 seconds...');
        setTimeout(initializeBadges, 5000); // Retry after a delay
        return;
    }
    try {
        console.log(`[Twitch] Fetching user data for broadcaster: ${broadcasterId}`);
        const user = await getTwitchUser(broadcasterId, "id");
        console.log(`[Twitch] User data fetched:`, user);
        if (user?.id) {
            console.log(`[Twitch] Broadcaster ID: ${user.id}`);
            // First, get global badges
            const globalBadges = await getChannelBadges();
            // Then, get channel-specific badges and merge them
            const specificBadges = await getChannelBadges(user.id);
            channelBadges = { ...globalBadges, ...specificBadges };
            console.log('[Twitch] Successfully fetched and cached channel badges.');
        } else {
             console.error('[Twitch] Could not fetch user ID for broadcaster. Badges will not be loaded.');
        }
    } catch (error) {
        console.error('[Twitch] Failed to initialize channel badges:', error);
    }
}


// Function to set up the Twitch client
async function setupTwitchClient(userId?: string) {
    let broadcasterUsername: string | undefined;
    let botUsername: string | undefined;
    let broadcasterOauthToken: string | undefined;
    let botOauthToken: string | undefined;
    const logChannelId = process.env.NEXT_PUBLIC_DISCORD_LOG_CHANNEL_ID;
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('[Twitch] Twitch client credentials not configured. Cannot proceed with token refresh.');
        twitchStatus = 'disconnected';
        broadcast({ type: 'twitch-status', payload: { status: 'disconnected', reason: 'Server configuration error.' } });
        setTimeout(() => setupTwitchClient(userId), 5000); // Retry setup
        return;
    }

    try {
        let tokens: StoredTokens | null = null;
        if (userId) {
            tokens = await getUserTokens(userId);
        } else {
            tokens = await getStoredTokens();
        }

        if (tokens) {
            broadcasterUsername = tokens.broadcasterUsername;
            botUsername = tokens.botUsername;

            broadcasterOauthToken = await ensureValidToken(clientId, clientSecret, 'broadcaster', tokens);
            botOauthToken = await ensureValidToken(clientId, clientSecret, 'bot', tokens);
        }
    } catch (error) {
        console.error('[Twitch] Error ensuring valid tokens:', error);
        twitchStatus = 'disconnected';
        broadcast({ type: 'twitch-status', payload: { status: 'disconnected', reason: 'Token refresh failed.' } });
        setTimeout(() => setupTwitchClient(userId), 5000); // Retry setup
        return;
    }

    // Validate required variables
    if (!broadcasterUsername || !botUsername || !broadcasterOauthToken || !botOauthToken) {
        console.error('[Twitch] Missing required credentials for Twitch chat connection. Retrying in 5 seconds...');
        twitchStatus = 'disconnected';
        broadcast({ type: 'twitch-status', payload: { status: 'disconnected', reason: 'Server configuration error.' } });
        setTimeout(() => setupTwitchClient(userId), 5000); // Retry setup
        return; // Stop the setup for now
    }

    // Always use broadcaster token and username for connection, as per user requirement
    const chatToken = broadcasterOauthToken;
    const chatUsername = broadcasterUsername;

    if (!chatToken) {
        console.error('[Twitch] No broadcaster token available for chat connection');
        twitchStatus = 'disconnected';
        broadcast({ type: 'twitch-status', payload: { status: 'disconnected', reason: 'No broadcaster token available.' } });
        return;
    }

    console.log(`[Twitch] Attempting to connect to Twitch as '${chatUsername}' to join channel '${broadcasterUsername}'`);

    twitchClient = new tmi.Client({
        options: { debug: false },
        identity: {
            username: chatUsername,
            password: `oauth:${chatToken.replace('oauth:', '')}`
        },
        channels: [ broadcasterUsername ]
    });

    // Add error event listener to catch authentication failures
    twitchClient.on('notice', (channel, msgid, message) => {
        console.log(`[Twitch] Notice: ${msgid} - ${message}`);
        if (String(msgid) === 'login_failure' || String(msgid) === 'invalid_oauth') {
            console.log('[Twitch] Authentication failed. This might be due to insufficient scopes on the broadcaster token.');
        }
    });

    // --- Twitch Event Listeners ---
    twitchClient.on('connected', (address, port) => {
        console.log(`[Twitch] Connected to chat at ${address}:${port}`);
        twitchStatus = 'connected';
        broadcast({ type: 'twitch-status', payload: { status: 'connected' } });
    });

    twitchClient.on('disconnected', (reason) => {
        console.log(`[Twitch] Disconnected from chat: ${reason || 'Unknown reason'}`);
        twitchStatus = 'disconnected';
        broadcast({ type: 'twitch-status', payload: { status: 'disconnected', reason } });
        // Attempt to reconnect after a delay
        console.log('[Twitch] Attempting to reconnect in 5 seconds...');
        setTimeout(() => twitchClient.connect().catch(console.error), 5000);
    });
    
    // twitchClient.on('usernotice', (channel, tags, message) => {
    //     const systemMessage = tags['system-msg'] || message;
    //     broadcast({
    //         type: 'twitch-system-message',
    //         payload: {
    //             id: tags.id,
    //             message: systemMessage
    //         }
    //     });

    //     if (logChannelId) {
    //         // Log system messages to Discord
    //         sendDiscordMessage(logChannelId, `[Twitch System] ${systemMessage}`).catch(console.error);
    //     }
    // });
    
    twitchClient.on('message', async (channel, tags, message, self) => {
        // Allow broadcaster's own messages for voice commands, but skip other self messages
        const isFromBroadcaster = tags['display-name'] === 'Mtman1987' || tags['display-name'] === 'mtman1987';
        if (self && !isFromBroadcaster) return;
        
        console.log(`[Debug] Raw message: "${message}", from: ${tags['display-name']}, self: ${self}, isFromBroadcaster: ${isFromBroadcaster}`);
        console.log(`[Debug] Message starts with 'athena shout'?`, message.toLowerCase().startsWith('athena shout'));
        console.log(`[Debug] Is athenabot87?`, tags['display-name']?.toLowerCase() === 'athenabot87');

        // Check if this is a recently sent message to avoid double logging
        const username = tags['display-name'] || '';
        const messageKey = `${username.toLowerCase()}:${message}`;
        if (recentlySentMessages.has(messageKey)) {
            recentlySentMessages.delete(messageKey); // Remove it since we found the match
            return; // Skip logging this echoed message
        }

        broadcast({
            type: 'twitch-message',
            payload: {
                user: tags['display-name'],
                message: message,
                color: tags['color'],
                emotes: tags['emotes'],
                id: tags['id'],
                badges: tags['badges']
            }
        });

        // Log every message to Discord with message counter
        if (logChannelId && tags['display-name'] && !message.startsWith('[Discord]')) {
            getNextMessageNumber().then(async (msgNum) => {
                await sendDiscordMessage(logChannelId, `[${msgNum}][Twitch] ${tags['display-name']}: ${message}`);
                
                // Cleanup old messages every 10 messages (only for Twitch chat, not AI chat)
                if (msgNum % 10 === 0) {
                    cleanupOldMessages(logChannelId).catch(console.error);
                }
            }).catch(console.error);
        }

        // Auto-TTS for Athenabot87 messages
        if (tags['display-name']?.toLowerCase() === 'athenabot87') {
            try {
                const voiceMap: Record<string, string> = {
                    'Rachel': '21m00Tcm4TlvDq8ikWAM', 'Domi': 'AZnzlk1XvdvUeBnXmlld', 'Bella': 'EXAVITQu4vr4xnSDxMaL',
                    'Antoni': 'ErXwobaYiN019PkySvjV', 'Elli': 'MF3mGyEYCl7XYWbV9V6O', 'Josh': 'TxGEqnHWrfWFTfGW9XjX',
                    'Arnold': 'VR6AewLTigWG4xSOukaG', 'Adam': 'pNInz6obpgDQGcFmaJgB', 'Sam': 'yoZ06aMxZJJ28mfd3POQ'
                };
                const voice = (global as any).botVoice || 'Rachel';
                const voiceId = voiceMap[voice] || '21m00Tcm4TlvDq8ikWAM';

                const headers: Record<string, string> = {
                    Accept: 'audio/mpeg',
                    'Content-Type': 'application/json',
                };
                if (process.env.ELEVENLABS_API_KEY) {
                    headers['xi-api-key'] = process.env.ELEVENLABS_API_KEY;
                }
                
                const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        text: message,
                        model_id: 'eleven_flash_v2_5',
                        voice_settings: { stability: 0.5, similarity_boost: 0.5 }
                    })
                });
                
                if (response.ok) {
                    const audioBuffer = await response.arrayBuffer();
                    const base64Audio = Buffer.from(audioBuffer).toString('base64');
                    const audioDataUri = `data:audio/mpeg;base64,${base64Audio}`;
                    
                    broadcast({
                        type: 'tts-audio',
                        payload: { audioDataUri, text: message, voice }
                    });
                    
                    console.log(`[TTS] ElevenLabs success for ${tags['display-name']}: ${message}`);
                } else {
                    console.error(`[TTS] ElevenLabs failed. Status: ${response.status}`);
                }
            } catch (error) {
                console.error('[TTS] Error with ElevenLabs API:', error);
            }
        }

        // Command handling logic
        if (message.startsWith('!')) {
            if (automationEngine) {
                await automationEngine.processEvent({
                    type: 'command',
                    platform: 'twitch',
                    user: (tags['display-name'] || tags['username'] || '').toString(),
                    message,
                });
            }
        } else if (message.toLowerCase().replace(/\s+/g, ' ').trim().startsWith('athena shout')) {
            // Handle voice commands that don't start with !
            console.log(`[Voice Command] Detected athena shoutout: "${message}"`);
            const args = message.replace(/^athena shout\s*out?\s*/i, '').trim().split(' ').filter(arg => arg.length > 0);
            console.log(`[Voice Command] Extracted args:`, args);
            
            // Try to find the closest matching username from recent chatters
            const targetName = args.join(' ').toLowerCase();
            if (!targetName) {
                await sendChatMessage('Please specify a username for the shoutout.');
                return;
            }
            
            // Get real chatters from the API
            let possibleMatches: string[] = [];
            try {
                const baseUrl = process.env.NEXT_PUBLIC_STREAMWEAVE_URL || 'http://localhost:3100';
                const chattersResponse = await fetch(`${baseUrl}/api/chat/chatters`);
                if (chattersResponse.ok) {
                    const chattersData = await chattersResponse.json();
                    possibleMatches = chattersData.chatters?.map((c: any) => c.user_display_name || c.user_login) || [];
                    console.log(`[Voice Shoutout] Found ${possibleMatches.length} active chatters:`, possibleMatches);
                }
            } catch (error) {
                console.error('[Voice Shoutout] Failed to fetch chatters:', error);
            }
            
            // Fallback to hardcoded list if API fails
            if (possibleMatches.length === 0) {
                possibleMatches = ['mtman1987', 'athenabot87'];
                console.log('[Voice Shoutout] Using fallback chatter list');
            }
            
            let bestMatch = null;
            let bestScore = 0;
            
            // Enhanced matching logic
            for (const chatter of possibleMatches) {
                const chatterLower = chatter.toLowerCase();
                
                // Exact match gets highest score
                if (chatterLower === targetName) {
                    bestMatch = chatter;
                    bestScore = 100;
                    break;
                }
                
                // Partial matches
                if (chatterLower.includes(targetName) || targetName.includes(chatterLower)) {
                    const score = Math.max(targetName.length, chatterLower.length) - Math.abs(targetName.length - chatterLower.length);
                    if (score > bestScore) {
                        bestMatch = chatter;
                        bestScore = score;
                    }
                }
                
                // Fuzzy matching for similar names
                const words = targetName.split(' ');
                for (const word of words) {
                    if (word.length > 2 && chatterLower.includes(word)) {
                        const score = word.length;
                        if (score > bestScore) {
                            bestMatch = chatter;
                            bestScore = score;
                        }
                    }
                }
            }
            
            if (bestMatch && bestScore > 2) {
                // Execute the actual shoutout command
                await sendChatMessage(`!so @${bestMatch}`);
                console.log(`[Voice Shoutout] Executed !so @${bestMatch} for voice command: ${targetName} (score: ${bestScore})`);
                
                // Don't send voice command logs to Discord - only console logs
            } else {
                const availableUsers = possibleMatches.slice(0, 5).join(', ');
                await sendChatMessage(`Could not find a matching user for: ${targetName}. Available: ${availableUsers}`);
                console.log(`[Voice Shoutout] No match found for: ${targetName}. Available chatters:`, possibleMatches);
            }
            
            // Increment metrics
            await incrementMetric('totalCommands');
            if (bestMatch && bestScore > 2) await incrementMetric('shoutoutsGiven');
        }
    });

    // --- Connect to Twitch ---
    try {
        console.log('[Twitch] Attempting to connect...');
        twitchStatus = 'connecting';
        broadcast({ type: 'twitch-status', payload: { status: 'connecting' } });
        twitchClient.connect().catch(error => {
            console.error('[Twitch] Connection failed during connect():', error);
            twitchStatus = 'disconnected';
            broadcast({ type: 'twitch-status', payload: { status: 'disconnected', reason: 'Connection rejected' } });
        });
    } catch (e) {
        console.error('[Twitch] Failed to initiate Twitch connection:', e);
        twitchStatus = 'disconnected';
        broadcast({ type: 'twitch-status', payload: { status: 'disconnected', reason: 'Failed to create client' }});
    }
}



// Graceful shutdown
async function shutdown() {
    console.log('[Server] Shutting down...');
    
    try {
        if (twitchClient) {
            twitchClient.disconnect();
        }

        if (eventSubReconnectTimeout) {
            clearTimeout(eventSubReconnectTimeout);
            eventSubReconnectTimeout = null;
        }
        if (eventSubSocket) {
            try { eventSubSocket.close(); } catch { /* ignore */ }
            eventSubSocket = null;
        }

        if (obsClient) {
            try { await (obsClient as any).disconnect?.(); } catch { /* ignore */ }
            obsClient = null;
        }
        
        if (stopWatchingActions) {
            stopWatchingActions();
            stopWatchingActions = null;
        }
        
        if (wss) {
            await new Promise<void>((resolve) => {
                wss.close((err) => {
                    if (err) {
                        console.error('[WebSocket] Error closing server:', err);
                    }
                    resolve();
                });
            });
        }
        
        // Cleanup ports
        await portManager.gracefulShutdown();
        
        console.log('[Server] Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('[Server] Error during shutdown:', error);
        process.exit(1);
    }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Load chat history once on startup
async function loadChatHistory() {
    if (chatHistoryLoaded) return;
    
    try {
        const { getChannelMessages } = require('./src/services/discord');
        const logChannelId = process.env.NEXT_PUBLIC_DISCORD_LOG_CHANNEL_ID;
        
        if (!logChannelId) return;
        
        console.log('[Discord] Loading chat history...');
        const messages = await getChannelMessages(logChannelId, 50);
        const chatHistory = [];
        
        for (const msg of messages) {
            // Parse [##][Twitch] Username: Message format (strip the number)
            const twitchMatch = msg.content.match(/^\[\d+\]\[Twitch\] (.*?): (.*)$/s);
            if (twitchMatch) {
                chatHistory.push({
                    id: msg.id,
                    user: twitchMatch[1],
                    message: twitchMatch[2],
                    color: undefined,
                    badges: undefined,
                    isSystemMessage: false
                });
            }
            
            // Parse regular Discord messages (not prefixed)
            else if (!msg.content.startsWith('[') && msg.author && !msg.author.bot) {
                chatHistory.push({
                    id: msg.id,
                    user: `[Discord] ${msg.author.username}`,
                    message: msg.content,
                    color: '#5865F2',
                    badges: { discord: '1' },
                    isSystemMessage: false
                });
            }
        }
        
        // Reverse to show oldest first
        chatHistory.reverse();
        cachedChatHistory = chatHistory;
        chatHistoryLoaded = true;
        
        // Update last message ID
        if (messages.length > 0) {
            lastDiscordMessageId = messages[0].id;
        }
        
        console.log(`[Discord] Loaded ${chatHistory.length} chat history messages`);
    } catch (error) {
        console.error('Failed to load chat history from Discord:', error);
    }
}

// Check for new messages and update active users
async function checkChatActivity() {
    try {
        const { getChannelMessages } = require('./src/services/discord');
        const logChannelId = process.env.NEXT_PUBLIC_DISCORD_LOG_CHANNEL_ID;
        
        console.log(`[Chat Check] Checking Discord channel ${logChannelId} and Twitch activity...`);
        
        // Discord message checking
        if (logChannelId && lastDiscordMessageId) {
            const messages = await getChannelMessages(logChannelId, 10);
            console.log(`[Chat Check] Found ${messages.length} recent Discord messages`);
            
            // Find new messages (messages are in reverse chronological order - newest first)
            const newMessages = [];
            for (const msg of messages) {
                if (msg.id === lastDiscordMessageId) {
                    console.log(`[Chat Check] Reached last processed message ${msg.id}`);
                    break;
                }
                newMessages.push(msg);
            }
            
            // Process messages in chronological order (oldest to newest)
            for (const msg of newMessages.reverse()) {
                console.log(`[Chat Check] Processing message ${msg.id}: "${msg.content}" from ${msg.author?.username} (bot: ${msg.author?.bot})`);
                
                // Send new Discord messages to Twitch (but don't add to app chat)
                if (!msg.content.startsWith('[') && msg.author && !msg.author.bot && !sentToTwitchIds.has(msg.id)) {
                    try {
                        let twitchMessage;
                        if (msg.content.startsWith('!')) {
                            // Send commands directly without username prefix
                            twitchMessage = msg.content;
                        } else {
                            // Regular messages get the Discord username prefix
                            twitchMessage = `[Discord] ${msg.author.username}: ${msg.content}`;
                        }
                        
                        console.log(`[Discord→Twitch] Sending: ${twitchMessage}`);
                        await sendTwitchChatMessage(twitchMessage);
                        sentToTwitchIds.add(msg.id);
                        
                        // Mark as recently sent to avoid echo when Twitch client receives it
                        const messageKey = msg.content.startsWith('!') 
                            ? `mtman1987:${msg.content}`.toLowerCase()
                            : `mtman1987:[discord] ${msg.author.username}: ${msg.content}`.toLowerCase();
                        recentlySentMessages.add(messageKey);
                        setTimeout(() => recentlySentMessages.delete(messageKey), 10000);
                        
                        console.log(`[Discord→Twitch] Successfully sent: ${msg.author.username}: ${msg.content}`);
                    } catch (error: any) {
                        console.error(`[Discord→Twitch] Failed to send message:`, error.message || error);
                    }
                } else {
                    console.log(`[Chat Check] Skipping message: starts with [ (${msg.content.startsWith('[')}), no author (${!msg.author}), is bot (${msg.author?.bot}), already sent (${sentToTwitchIds.has(msg.id)})`);
                }
            }
            
            // Update to the most recent message ID
            if (messages.length > 0 && messages[0].id !== lastDiscordMessageId) {
                console.log(`[Chat Check] Updating lastDiscordMessageId from ${lastDiscordMessageId} to ${messages[0].id}`);
                lastDiscordMessageId = messages[0].id;
            }
        }
        
        // Broadcast updated user activity to all connected clients
        broadcast({
            type: 'chat-activity-update',
            payload: {
                timestamp: Date.now(),
                discord: logChannelId ? true : false,
                twitch: twitchStatus === 'connected'
            }
        });
        
        // Update Discord viewers from Dyno logs
        // Disabled - endpoint not implemented
        /*
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
            
            const dynoResponse = await fetch('http://localhost:3100/api/discord/dyno-voice', {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (dynoResponse.ok) {
                const discordViewers = await dynoResponse.json();
                broadcast({
                    type: 'discord-viewers-update',
                    payload: { viewers: discordViewers }
                });
            }
        } catch (error: any) {
            // Only log if it's not a connection refused error to reduce spam
            if (error.code !== 'ECONNREFUSED' && !error.message?.includes('ECONNREFUSED')) {
                console.error('[Chat Check] Failed to update Discord viewers:', error);
            }
        }
        */
        
    } catch (error) {
        console.error('Error checking chat activity:', error);
    }
}

// Main startup logic
async function startServer() {
    try {
        // Only clean up WebSocket port if needed (not Next.js or Genkit ports)
        console.log('[Server] Checking for ports in use...');
        const websocketPort = 8090;
        
        if (await portManager.isPortInUse(websocketPort)) {
            console.log(`[Server] WebSocket port ${websocketPort} is in use, cleaning up...`);
            await portManager.cleanupPorts([websocketPort]);
        } else {
            console.log('[Server] WebSocket port is available');
        }
        
        // Get available port for WebSocket server
        const finalPort = await portManager.getPortFromEnv('WS_PORT', 8090);
        
        // Update environment variable for other processes
        process.env.WS_PORT = finalPort.toString();
        
        // Create WebSocket server with the available port
        wss = new WebSocketServer({ port: finalPort, host: '0.0.0.0' });
        console.log(`[WebSocket] Server is running on ws://0.0.0.0:${finalPort}`);
        
        // Handle new WebSocket connections
        wss.on('connection', (ws) => {
            console.log('[WebSocket] New client connected');
            
            // Send current Twitch connection status to the new client
            ws.send(JSON.stringify({ 
                type: 'twitch-status', 
                payload: { status: twitchStatus } 
            }));
            
            // Send cached badges to the new client
            ws.send(JSON.stringify({ 
                type: 'twitch-badges', 
                payload: { badges: channelBadges } 
            }));
            
            // Send chat history to the new client
            cachedChatHistory.forEach(msg => {
                ws.send(JSON.stringify({ 
                    type: 'twitch-message', 
                    payload: msg 
                }));
            });
            
            // Handle incoming messages from client
            ws.on('message', async (data: any) => {
                try {
                    const message = JSON.parse(data.toString());
                    
                    if (message.type === 'send-twitch-message') {
                        const { message: text, as } = message.payload;
                        console.log(`[WebSocket] Received message to send as ${as}: ${text}`);
                        
                        if (!twitchClient || !twitchClient.readyState || twitchClient.readyState() !== 'OPEN') {
                            console.error('[WebSocket] Twitch client not connected');
                            ws.send(JSON.stringify({
                                type: 'error',
                                payload: { message: 'Twitch client not connected' }
                            }));
                            return;
                        }
                        
                        const channel = process.env.TWITCH_BROADCASTER_USERNAME || process.env.NEXT_PUBLIC_TWITCH_BROADCASTER_USERNAME;
                        if (!channel) {
                            console.error('[WebSocket] No Twitch channel configured');
                            return;
                        }
                        
                        // Send message via Twitch IRC
                        await twitchClient.say(channel, text);
                        console.log(`[WebSocket] Message sent to Twitch as ${as}: ${text}`);
                    } else if (message.type === 'update-bot-settings') {
                        // Update global bot personality and voice
                        const { personality, voice } = message.payload;
                        if (personality !== undefined) {
                            (global as any).botPersonality = personality;
                            console.log('[WebSocket] Updated bot personality');
                        }
                        if (voice !== undefined) {
                            (global as any).botVoice = voice;
                            console.log('[WebSocket] Updated bot voice to:', voice);
                        }
                    }
                } catch (error) {
                    console.error('[WebSocket] Error processing client message:', error);
                }
            });
        });
        
        await loadMetrics();
        await loadCounter();
        await loadActionsIntoCache();
        watchActionsForChanges();
        setupDefaultPlugins();
        console.log('[Plugins] Active plugins:', listPlugins().map(p => p.id).join(', ') || 'none');
        await setupObsWebSocket();
        await initializeBadges();
        
        // Load chat history once on startup
        await loadChatHistory();

        // Load Streamer.bot-like automation from the workspace root sb/ folder.
        setupAutomationFromSb();
        
        // For now, start without user ID - will use environment variables
        setupTwitchClient();

        // EventSub (Channel Points) — uses the stored broadcaster token.
        await logBroadcasterTokenScopes();
        void startEventSub();
        
        // Check for chat activity every 5 seconds
        console.log('[Chat] Starting chat activity monitoring every 5 seconds...');
        setInterval(() => {
            console.log('[Chat] Running checkChatActivity...');
            checkChatActivity().catch(error => {
                console.error('[Chat] Error in activity check interval:', error);
            });
        }, 5000);
        
        // Run once immediately
        console.log('[Chat] Running initial chat activity check...');
        checkChatActivity().catch(error => {
            console.error('[Chat] Error in initial activity check:', error);
        });
        
        console.log('[Server] All services started successfully');
        
    } catch (error) {
        console.error('[Server] Failed to start server:', error);
        await portManager.gracefulShutdown();
        process.exit(1);
    }
}

startServer();

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('[Server] Uncaught Exception:', error);
    // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - keep server running
});
    
