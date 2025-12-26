
'use server';

import * as local from './discord-local';

type BrokerConfig = {
    baseUrl: string;
    apiKey?: string;
};

function getBrokerConfig(): BrokerConfig | null {
    const baseUrl = process.env.DISCORD_BROKER_URL?.trim();
    if (!baseUrl) return null;
    return {
        baseUrl: baseUrl.replace(/\/$/, ''),
        apiKey: process.env.DISCORD_BROKER_API_KEY?.trim() || undefined,
    };
}

async function brokerRequest<T>(path: string, body: unknown): Promise<T> {
    const broker = getBrokerConfig();
    if (!broker) {
        throw new Error('Discord broker is not configured (missing DISCORD_BROKER_URL).');
    }

    const res = await fetch(`${broker.baseUrl}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(broker.apiKey ? { Authorization: `Bearer ${broker.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        cache: 'no-store',
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Discord broker error (${res.status}): ${text || res.statusText}`);
    }

    return (await res.json()) as T;
}

/**
 * Single entrypoint for privileged Discord actions.
 *
 * Today (default): executes locally using DISCORD_BOT_TOKEN.
 * Future: set DISCORD_BROKER_URL to delegate to a hosted broker service.
 */

export async function sendDiscordMessage(channelId: string, message: string): Promise<void> {
    const broker = getBrokerConfig();
    if (!broker) return local.sendDiscordMessage(channelId, message);
    await brokerRequest('/discord/send-message', { channelId, message });
}

export async function getDiscordUser(
    userId: string
): Promise<{ username: string; avatarUrl: string } | null> {
    const broker = getBrokerConfig();
    if (!broker) return local.getDiscordUser(userId);
    return await brokerRequest('/discord/get-user', { userId });
}

export async function uploadFileToDiscord(
    channelId: string,
    fileContent: string,
    fileName: string,
    messageContent?: string
) {
    const broker = getBrokerConfig();
    if (!broker) return local.uploadFileToDiscord(channelId, fileContent, fileName, messageContent);
    return await brokerRequest('/discord/upload-file', { channelId, fileContent, fileName, messageContent });
}

export async function getChannelMessages(channelId: string, limit: number = 50) {
    const broker = getBrokerConfig();
    if (!broker) return local.getChannelMessages(channelId, limit);
    return await brokerRequest('/discord/get-channel-messages', { channelId, limit });
}

export async function deleteMessage(channelId: string, messageId: string): Promise<void> {
    const broker = getBrokerConfig();
    if (!broker) return local.deleteMessage(channelId, messageId);
    await brokerRequest('/discord/delete-message', { channelId, messageId });
}