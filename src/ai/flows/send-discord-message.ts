'use server';

import { sendDiscordMessage as sendDiscordMessageService } from '@/services/discord';

export interface SendDiscordMessageInput {
  channelId: string;
  message: string;
}

export interface SendDiscordMessageOutput {
  success: boolean;
}

export async function sendDiscordMessage(input: SendDiscordMessageInput): Promise<SendDiscordMessageOutput> {
  try {
    await sendDiscordMessageService(input.channelId, input.message);
    return { success: true };
  } catch (error) {
    console.error('Failed to send Discord message:', error);
    return { success: false };
  }
}

export async function sendDiscordMessageFlow(input: SendDiscordMessageInput): Promise<SendDiscordMessageOutput> {
  return await sendDiscordMessage(input);
}