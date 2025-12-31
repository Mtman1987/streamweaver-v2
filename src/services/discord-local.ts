'use server';

import axios from 'axios';
import FormData from 'form-data';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

function getDiscordHeaders(isFormData = false) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error('Discord bot token is not provided in environment variables (DISCORD_BOT_TOKEN).');
  }
  const headers: any = {
    Authorization: `Bot ${botToken}`,
    'User-Agent': 'StreamWeave-Bot (1.0)',
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

/**
 * Sends a message to a specified Discord channel using a bot token.
 * @param channelId The ID of the Discord channel.
 * @param message The content of the message to send.
 */
export async function sendDiscordMessage(channelId: string, message: string): Promise<{ id: string } | void> {
  if (!channelId) {
    throw new Error('Discord channel ID is not provided.');
  }

  const url = `${DISCORD_API_BASE}/channels/${channelId}/messages`;

  try {
    const response = await axios.post(url, { content: message }, { headers: getDiscordHeaders() });

    console.log(`Successfully sent message to Discord channel ${channelId}.`);
    return { id: response.data.id };
  } catch (error: any) {
    console.error('Error sending message to Discord:', error.response?.data || error.message);
    if (error.response?.data?.code === 10003) {
      // Specifically handle "Unknown Channel"
      throw new Error('Discord Channel ID is invalid or the bot is not a member of that channel.');
    }
    throw new Error(`Failed to send message to Discord channel. ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Fetches a Discord user's profile by their ID.
 * @param userId The ID of the Discord user.
 * @returns The user's profile information or null if not found.
 */
export async function getDiscordUser(
  userId: string
): Promise<{ username: string; avatarUrl: string } | null> {
  if (!userId) {
    throw new Error('Discord user ID is not provided.');
  }
  const url = `${DISCORD_API_BASE}/users/${userId}`;

  try {
    const response = await axios.get(url, { headers: getDiscordHeaders() });
    const { id, username, avatar } = response.data;

    const avatarUrl = avatar
      ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(username.split('#')[1] || '0') % 5}.png`; // Default avatar

    return {
      username,
      avatarUrl,
    };
  } catch (error: any) {
    console.error('Error fetching Discord user:', error.response?.data || error.message);
    // Don't throw here, just return null so the UI doesn't break if Discord is down.
    return null;
  }
}

/**
 * Uploads a file to a specified Discord channel.
 * @param channelId The ID of the Discord channel.
 * @param fileContent The content of the file as a string.
 * @param fileName The name for the file.
 * @param messageContent Optional message to send along with the file.
 * @returns The message object from Discord API.
 */
export async function uploadFileToDiscord(
  channelId: string,
  fileContent: string,
  fileName: string,
  messageContent?: string
) {
  const url = `${DISCORD_API_BASE}/channels/${channelId}/messages`;
  const form = new FormData();

  // Append the file
  form.append('files[0]', Buffer.from(fileContent), {
    filename: fileName,
    contentType: 'application/json',
  });

  // Append the message payload
  const payload = {
    content: messageContent || `New file uploaded: ${fileName}`,
  };
  form.append('payload_json', JSON.stringify(payload));

  try {
    const response = await axios.post(url, form, {
      headers: {
        ...getDiscordHeaders(true),
        ...form.getHeaders(),
      },
    });

    const guildId = response.data.guild_id;
    const messageId = response.data.id;
    const messageUrl = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;

    return {
      success: true,
      messageUrl: messageUrl,
      data: response.data,
    };
  } catch (error: any) {
    console.error('Error uploading file to Discord:', error.response?.data || error.message);
    throw new Error(`Failed to upload file to Discord. ${error.response?.data?.message || error.message}`);
  }
}

// Rate limiting cache
const messageCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds
const rateLimitState = { lastRequest: 0, retryAfter: 0 };

/**
 * Fetches recent messages from a Discord channel with rate limiting and caching.
 * @param channelId The ID of the Discord channel.
 * @param limit The number of messages to fetch (max 100).
 * @returns An array of message objects.
 */
export async function getChannelMessages(channelId: string, limit: number = 50) {
  if (!channelId) {
    throw new Error('Discord channel ID is not provided.');
  }

  const cacheKey = `${channelId}:${limit}`;
  const now = Date.now();

  // Check cache first
  const cached = messageCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Check rate limit
  if (now < rateLimitState.retryAfter) {
    const waitTime = rateLimitState.retryAfter - now;
    console.log(`[Discord] Rate limited, waiting ${waitTime}ms`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  const url = `${DISCORD_API_BASE}/channels/${channelId}/messages?limit=${limit}`;

  try {
    rateLimitState.lastRequest = now;
    const response = await axios.get(url, { headers: getDiscordHeaders() });

    // Cache the response
    messageCache.set(cacheKey, { data: response.data, timestamp: now });

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 429) {
      const retryAfter = error.response.data?.retry_after || 1;
      rateLimitState.retryAfter = now + retryAfter * 1000;
      console.log(`[Discord] Rate limited, retry after ${retryAfter}s`);

      // Return cached data if available, even if stale
      if (cached) {
        console.log('[Discord] Returning stale cached data due to rate limit');
        return cached.data;
      }
    }

    console.error('Error fetching Discord channel messages:', error.response?.data || error.message);
    throw new Error(`Failed to fetch messages from Discord channel. ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Deletes a message from a Discord channel.
 * @param channelId The ID of the Discord channel.
 * @param messageId The ID of the message to delete.
 */
export async function deleteMessage(channelId: string, messageId: string): Promise<void> {
  if (!channelId || !messageId) {
    throw new Error('Channel ID and Message ID are required.');
  }

  const url = `${DISCORD_API_BASE}/channels/${channelId}/messages/${messageId}`;

  try {
    await axios.delete(url, { headers: getDiscordHeaders() });
    console.log(`[Discord] Successfully deleted message ${messageId} from channel ${channelId}`);
  } catch (error: any) {
    console.error(`[Discord] Error deleting message ${messageId}:`, error.response?.data || error.message);
    throw new Error(`Failed to delete message. ${error.response?.data?.message || error.message}`);
  }
}
