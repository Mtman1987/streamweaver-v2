
'use server';

import { sendChatMessage } from '@/services/twitch';

export interface SendTwitchMessageInput {
  message: string;
  as?: 'bot' | 'broadcaster';
}

export interface SendTwitchMessageOutput {
  success: boolean;
}

export async function sendTwitchMessage(input: SendTwitchMessageInput): Promise<SendTwitchMessageOutput> {
  try {
    await sendChatMessage(input.message, input.as);
    return { success: true };
  } catch (error) {
    console.error('Failed to send Twitch message:', error);
    return { success: false };
  }
}

export async function sendTwitchMessageFlow(input: SendTwitchMessageInput): Promise<SendTwitchMessageOutput> {
  return await sendTwitchMessage(input);
}
