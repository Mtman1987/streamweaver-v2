import * as tmi from 'tmi.js';
import axios from 'axios';

// In-memory cache for the app access token
let appAccessToken: { token: string; expires: number } | null = null;
let badgeCache: { badges: any, expires: number } | null = null;

/**
 * Gets a Twitch App Access Token using Client Credentials Grant Flow.
 * Caches the token to avoid re-fetching on every request.
 * @returns A valid app access token.
 */
async function getTwitchAppAccessToken(): Promise<string> {
  if (appAccessToken && appAccessToken.expires > Date.now()) {
    return appAccessToken.token;
  }

  let clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  let clientSecret = process.env.NEXT_PUBLIC_TWITCH_CLIENT_SECRET;

  // Client credentials should be in environment variables
  if (!clientId) {
    clientId = process.env.TWITCH_CLIENT_ID;
  }
  if (!clientSecret) {
    clientSecret = process.env.TWITCH_CLIENT_SECRET;
  }

  if (!clientId || !clientSecret) {
    throw new Error('Twitch client ID or secret is not configured in environment variables.');
  }

  try {
    const response = await axios.post(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`
    );

    const { access_token, expires_in } = response.data;
    const now = Date.now();
    // Set expiry to 1 minute before it actually expires, as a buffer
    const expires = now + (expires_in - 60) * 1000;

    appAccessToken = { token: access_token, expires };

    console.log('Successfully fetched new Twitch app access token.');
    return access_token;
  } catch (error: any) {
    console.error('Error fetching Twitch app access token:', error.response?.data || error.message);
    throw new Error('Could not fetch Twitch app access token.');
  }
}


/**
 * Sends a chat message to Twitch via API route.
 * @param message The message to send.
 * @param as The identity to send the message as ('bot' or 'broadcaster'). Defaults to 'broadcaster'.
 */
export async function sendChatMessage(message: string, as: 'bot' | 'broadcaster' = 'broadcaster'): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_STREAMWEAVE_URL || 'http://localhost:3100';
    const response = await fetch(`${baseUrl}/api/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, as }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send message');
    }

    console.log(`[Twitch] Message sent as ${as}: ${message}`);
  } catch (error) {
    console.error('Error sending Twitch message:', error);
    throw error;
  }
}


type TwitchUser = {
    id: string;
    login: string;
    display_name: string;
    description: string;
    profile_image_url: string;
    created_at?: string;
};

// Get User Information from Twitch API
export async function getTwitchUser(usernameOrId: string, by: "login" | "id" = "login"): Promise<{ id: string; bio: string; lastGame: string; displayName: string; profileImageUrl: string; createdAt?: string; } | null> {
    const appToken = await getTwitchAppAccessToken();
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;

    if (!clientId) {
        throw new Error("Twitch client ID is missing from environment variables.");
    }

    try {
        const userQuery = by === 'login' ? `login=${usernameOrId}` : `id=${usernameOrId}`;
        // Step 1: Get user ID from username
        const userResponse = await fetch(`https://api.twitch.tv/helix/users?${userQuery}`, {
            headers: {
                'Authorization': `Bearer ${appToken}`,
                'Client-ID': clientId,
            },
        });

        if (!userResponse.ok) {
            const errorBody = await userResponse.text();
            console.error('Failed to fetch Twitch user:', userResponse.status, userResponse.statusText, errorBody);
            throw new Error(`Failed to fetch Twitch user: ${userResponse.statusText}`);
        }

        const userData = await userResponse.json();
        const user: TwitchUser = userData.data[0];

        if (!user) {
            return null;
        }

        const { id, description, display_name, profile_image_url, created_at } = user;

        // Step 2: Get channel information (for last game played)
        const channelResponse = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${id}`, {
            headers: {
                'Authorization': `Bearer ${appToken}`,
                'Client-ID': clientId,
            },
        });

        let gameName = "No recent game played.";
        if (channelResponse.ok) {
            const channelData = await channelResponse.json();
            const channel = channelData.data[0];
            if (channel?.game_name) {
                gameName = channel.game_name;
            }
        } else {
             console.warn('Failed to fetch Twitch channel info for user:', usernameOrId);
        }
        
        return {
            id: id,
            bio: description || "This user has no bio.",
            lastGame: gameName,
            displayName: display_name,
            profileImageUrl: profile_image_url,
            createdAt: created_at,
        };

    } catch (error) {
        console.error('Error fetching Twitch user data:', error);
        throw error;
    }
}

/**
 * Gets Twitch user information by user ID.
 * @param userId The Twitch user ID.
 * @returns A promise that resolves to the user information or null if not found.
 */
export async function getTwitchUserById(userId: string): Promise<{ id: string; bio: string; lastGame: string; displayName: string; profileImageUrl: string; } | null> {
    return getTwitchUser(userId, "id");
}

/**
 * Fetches the chat badges for a specific channel or globally.
 * @param broadcasterId The ID of the broadcaster. If not provided, fetches global badges.
 * @returns A promise that resolves to the badge sets.
 */
export async function getChannelBadges(broadcasterId?: string): Promise<any> {
    const appToken = await getTwitchAppAccessToken();
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const url = broadcasterId
        ? `https://api.twitch.tv/helix/chat/badges?broadcaster_id=${broadcasterId}`
        : 'https://api.twitch.tv/helix/chat/badges/global';
    
    // Simple in-memory cache for badges to avoid spamming the API
    if (badgeCache && badgeCache.expires > Date.now()) {
        // This is a simplified cache; a real app might need separate caches for global vs channel.
        // For our purpose, we'll just re-fetch if the ID changes. A more robust cache is needed for multiple channels.
        // return badgeCache.badges; 
    }

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${appToken}`,
                'Client-ID': clientId!,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch Twitch badges: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Flatten the array of badge sets into an object keyed by set_id
        const badgesBySetId = data.data.reduce((acc: any, badgeSet: any) => {
            acc[badgeSet.set_id] = badgeSet.versions.reduce((versionsAcc: any, version: any) => {
                versionsAcc[version.id] = version;
                return versionsAcc;
            }, {});
            return acc;
        }, {});
        
        badgeCache = {
            badges: badgesBySetId,
            expires: Date.now() + 60 * 60 * 1000 // Cache for 1 hour
        };
        
        return badgesBySetId;
    } catch (error) {
        console.error(`Error fetching Twitch badges for ${broadcasterId || 'global'}:`, error);
        throw error;
    }
}


/**
 * Fetches the list of chatters from a Twitch channel via API route.
 * @returns A promise that resolves to an array of chatter objects.
 */
export async function getChatters(): Promise<{ user_id: string; user_login: string; user_display_name: string; }[]> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_STREAMWEAVE_URL || 'http://localhost:3100';
        const response = await fetch(`${baseUrl}/api/chat/chatters`);
        
        if (!response.ok) {
            console.warn('Failed to fetch chatters from API');
            return [];
        }

        const data = await response.json();
        return data.chatters || [];
    } catch (error) {
        console.warn('Error fetching Twitch chatters:', error);
        return [];
    }
}
