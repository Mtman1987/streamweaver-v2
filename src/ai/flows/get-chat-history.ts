
'use server';

/**
 * @fileOverview A Genkit flow for retrieving chat history from a Discord log channel.
 *
 * - getChatHistory - Fetches and parses messages logged in a Discord channel.
 * - ChatMessage - The type for a single chat message object.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getChannelMessages } from '@/services/discord';

const ChatMessageSchema = z.object({
  id: z.string(),
  user: z.string().optional(),
  message: z.string(),
  color: z.string().optional(),
  badges: z.record(z.string()).optional(),
  isSystemMessage: z.boolean().optional(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const GetChatHistoryOutputSchema = z.object({
  messages: z.array(ChatMessageSchema).describe("A list of chat messages from the history."),
});
type GetChatHistoryOutput = z.infer<typeof GetChatHistoryOutputSchema>;


const getChatHistoryFlow = ai.defineFlow(
  {
    name: 'getChatHistoryFlow',
    inputSchema: z.null(),
    outputSchema: GetChatHistoryOutputSchema,
  },
  async (input) => {
    const channelId = process.env.NEXT_PUBLIC_DISCORD_LOG_CHANNEL_ID;
    if (!channelId) {
      // Return empty if not configured, rather than throwing an error.
      return { messages: [] };
    }
    
    // Fetch the last 50 messages. Discord returns them newest-first.
    const discordMessages = await getChannelMessages(channelId, 50);
    const formattedMessages: ChatMessage[] = [];

    for (const msg of discordMessages) {
        let parsedMessage: ChatMessage | null = null;
        
        // Example format: "[Twitch] UserName: The message content"
        const twitchMatch = msg.content.match(/^\[Twitch\] (.*?): (.*)/s);
        if (twitchMatch) {
            parsedMessage = {
                id: msg.id,
                user: twitchMatch[1],
                message: twitchMatch[2],
            };
        }

        // Example format: "[Twitch System] User subscribed for 5 months!"
        const systemMatch = msg.content.match(/^\[Twitch System\] (.*)/s);
        if (systemMatch) {
             parsedMessage = {
                id: msg.id,
                message: systemMatch[1],
                isSystemMessage: true,
            };
        }

        // Add more parsers here for other formats if needed (e.g., [Discord], [AI], etc.)
        const aiMatch = msg.content.match(/^🤖 AI: "(.*)"/s);
        if(aiMatch) {
            parsedMessage = {
                id: msg.id,
                user: "Athena", // Hardcoding the bot name for now
                message: aiMatch[1],
                badges: { bot: "1" } // Give the bot a badge
            }
        }

        if (parsedMessage) {
            formattedMessages.push(parsedMessage);
        }
    }

    // Reverse the array to have the oldest messages first for correct display order.
    return { messages: formattedMessages.reverse() };
  }
);

export async function getChatHistory(): Promise<GetChatHistoryOutput> {
  return await getChatHistoryFlow(null);
}
