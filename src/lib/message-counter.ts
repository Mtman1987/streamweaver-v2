import * as fs from 'fs/promises';
import { resolve } from 'path';

const COUNTER_FILE = resolve(process.cwd(), 'src', 'data', 'message-counter.json');

interface MessageCounter {
  count: number;
  lastCleanup: number;
}

let counter: MessageCounter = { count: 0, lastCleanup: 0 };

export async function loadCounter(): Promise<void> {
  try {
    const data = await fs.readFile(COUNTER_FILE, 'utf-8');
    counter = JSON.parse(data);
  } catch (error) {
    // File doesn't exist, start with 0
    await saveCounter();
  }
}

export async function saveCounter(): Promise<void> {
  try {
    await fs.writeFile(COUNTER_FILE, JSON.stringify(counter, null, 2));
  } catch (error) {
    console.error('Error saving message counter:', error);
  }
}

export async function getNextMessageNumber(): Promise<number> {
  // Reload counter from file to ensure we have the latest value
  await loadCounter();
  counter.count++;
  await saveCounter();
  console.log(`[Counter] Generated message number: ${counter.count}`);
  return counter.count;
}

export async function cleanupOldMessages(channelId: string): Promise<void> {
  try {
    // Skip cleanup for AI chat channel - keep long conversation history
    const aiChatChannelId = process.env.DISCORD_AI_CHAT_CHANNEL_ID || process.env.NEXT_PUBLIC_DISCORD_AI_CHAT_CHANNEL_ID;
    if (channelId === aiChatChannelId) {
      console.log('[Counter] Skipping cleanup for AI chat channel (preserving conversation history)');
      return;
    }
    
    const discord = require('../services/discord');
    const messages = await discord.getChannelMessages(channelId, 60); // Get more than 50
    
    console.log(`[Counter] Checking messages: found ${messages.length} total messages`);
    
    if (messages.length > 50) {
      // Delete messages beyond the 50 most recent (only for Twitch chat)
      const messagesToDelete = messages.slice(50);
      console.log(`[Counter] Deleting ${messagesToDelete.length} old messages...`);
      
      for (const msg of messagesToDelete) {
        try {
          await discord.deleteMessage(channelId, msg.id);
          console.log(`[Counter] Deleted message ${msg.id}`);
        } catch (error: any) {
          console.error(`[Counter] Error deleting message ${msg.id}:`, error.message);
        }
      }
      console.log(`[Counter] Cleaned up ${messagesToDelete.length} old Twitch chat messages`);
    } else {
      console.log(`[Counter] No cleanup needed (${messages.length} messages < 50 limit)`);
    }
    
    counter.lastCleanup = Date.now();
    await saveCounter();
  } catch (error: any) {
    console.error('[Counter] Error cleaning up messages:', error.message || error);
  }
}