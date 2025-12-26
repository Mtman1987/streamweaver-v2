
'use server';

/**
 * @fileOverview A Genkit flow that handles a chat user interacting with the AI bot.
 *
 * - chatWithAthena - The main function that orchestrates the response.
 * - ChatWithAthenaInput - The input type for the function.
 * - ChatWithAthenaOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendTwitchMessage } from './send-twitch-message';
import { textToSpeech } from './text-to-speech';
import { sendDiscordMessage } from './send-discord-message';

// Copied from text-to-speech.ts to avoid 'use server' export error
const allVoices = [
    'Achernar', 'Algenib', 'Algieba', 'Alnilam', 'Aoede', 'Autonoe', 
    'Callirrhoe', 'Despina', 'Enceladus', 'Erinome', 'Fenrir', 'Gacrux', 
    'Iapetus', 'Kore', 'Laomedeia', 'Leda', 'Orus', 'Puck', 'Pulcherrima', 
    'Rasalgethi', 'Sadachbia', 'Sadaltager', 'Schedar', 'Sulafat', 'Umbriel', 
    'Vindemiatrix', 'Zephyr', 'Zubenelgenubi'
];


const ChatWithAthenaInputSchema = z.object({
  username: z.string().describe("The Twitch username of the person sending the message."),
  message: z.string().describe("The message from the user."),
  personality: z.string().optional().describe("The personality profile for the AI bot."),
  voice: z.enum(allVoices as [string, ...string[]]).optional().describe("The voice to use for the TTS."),
});
export type ChatWithAthenaInput = z.infer<typeof ChatWithAthenaInputSchema>;

const ChatWithAthenaOutputSchema = z.object({
  audioDataUri: z.string().describe("A data URI of the generated audio in WAV format."),
});
export type ChatWithAthenaOutput = z.infer<typeof ChatWithAthenaOutputSchema>;

const athenaPrompt = ai.definePrompt({
  name: 'athenaPrompt',
  input: { schema: ChatWithAthenaInputSchema },
  prompt: `{{#if personality}}
You are an AI assistant with the following personality:
{{personality}}
{{else}}
You are a helpful AI assistant for a streamer. Your name is Athena.
A user named {{username}} is talking to you in the Twitch chat.
Provide a concise, friendly, and conversational response to their message.
{{/if}}

A user named {{username}} is talking to you in the Twitch chat.
Provide a concise, friendly, and conversational response to their message.

User Message: "{{{message}}}"
Your Response:
  `,
});

const chatWithAthenaFlow = ai.defineFlow(
  {
    name: 'chatWithAthenaFlow',
    inputSchema: ChatWithAthenaInputSchema,
    outputSchema: ChatWithAthenaOutputSchema,
  },
  async (input) => {
    const logChannelId = process.env.NEXT_PUBLIC_DISCORD_LOG_CHANNEL_ID;

    // Log the incoming message
    if (logChannelId) {
        sendDiscordMessage({ channelId: logChannelId, message: `💬 ${input.username}: "!athena ${input.message}"` }).catch(console.error);
    }
    
    // 1. Generate a text response from the LLM.
    const llmResponse = await athenaPrompt(input);
    const responseText = llmResponse.output;

    if (!responseText) {
      throw new Error("The AI failed to generate a response.");
    }

    // Log the AI response
     if (logChannelId) {
        sendDiscordMessage({ channelId: logChannelId, message: `🤖 Athena: "${responseText}"` }).catch(console.error);
    }
    
    // 2. Send the text response back to Twitch chat.
    await sendTwitchMessage({ message: `@${input.username}, ${responseText}` });
    
    // 3. Generate TTS audio from the response.
    const ttsResponse = await textToSpeech({
        text: responseText,
        voice: input.voice || 'Algieba' // Using a female voice for Athena, with fallback
    });

    // 4. Return the audio data to be played by the client.
    return {
        audioDataUri: ttsResponse.audioDataUri
    };
  }
);

// Flow object not exported - 'use server' restriction

export async function chatWithAthena(input: ChatWithAthenaInput): Promise<ChatWithAthenaOutput> {
  return await chatWithAthenaFlow(input);
}
