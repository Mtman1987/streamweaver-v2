
'use server';

/**
 * @fileOverview A Genkit flow for retrieving shared actions from a Discord channel.
 *
 * - getSharedActions - Fetches and parses actions shared in a Discord channel.
 * - SharedAction - The type for a single shared action.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getChannelMessages } from '@/services/discord';
import axios from 'axios';

const SharedActionSchema = z.object({
  id: z.string().describe("The Discord message ID of the shared action."),
  name: z.string().describe("The name of the action."),
  description: z.string().describe("The description of the action provided when sharing."),
  url: z.string().url().describe("The direct URL to the action's JSON file."),
});
type SharedAction = z.infer<typeof SharedActionSchema>;

const GetSharedActionsOutputSchema = z.object({
  actions: z.array(SharedActionSchema).describe("A list of shared actions found in the channel."),
});
type GetSharedActionsOutput = z.infer<typeof GetSharedActionsOutputSchema>;


const getSharedActionsFlow = ai.defineFlow(
  {
    name: 'getSharedActionsFlow',
    inputSchema: z.null(),
    outputSchema: GetSharedActionsOutputSchema,
  },
  async (input) => {
    const channelId = process.env.NEXT_PUBLIC_DISCORD_SHARE_CHANNEL_ID;
    if (!channelId) {
      throw new Error("Discord share channel ID is not configured in environment variables.");
    }
    
    const messages = await getChannelMessages(channelId);
    const sharedActions: SharedAction[] = [];

    for (const message of messages) {
      // We are looking for messages that have attachments
      if (message.attachments?.length > 0) {
        const attachment = message.attachments[0];

        // Ensure the attachment is a JSON file
        if (attachment.content_type?.startsWith('application/json') && attachment.filename.endsWith('.json')) {
            try {
                // We need to fetch the content of the JSON file to get the action's real name
                const response = await axios.get(attachment.url);
                const actionData = response.data;
                
                // The message content sent with the file upload is used as the description
                // We parse it to extract the user-provided description.
                const descriptionMatch = message.content.match(/Description: (.*)/);
                const description = descriptionMatch ? descriptionMatch[1].trim() : (actionData.description || "No description provided.");

                sharedActions.push({
                    id: message.id,
                    name: actionData.name || "Untitled Action",
                    description: description,
                    url: attachment.url,
                });

            } catch (error: any) {
                console.error(`Failed to fetch or parse action JSON from ${attachment.url}:`, error.message);
                // Silently ignore files that can't be parsed.
            }
        }
      }
    }

    return { actions: sharedActions };
  }
);

// Flow object exported for internal use only - not exported due to 'use server' restrictions

export async function getSharedActions(): Promise<GetSharedActionsOutput> {
  const channelId = process.env.NEXT_PUBLIC_DISCORD_SHARE_CHANNEL_ID;
  if (!channelId) {
    throw new Error("Discord share channel ID is not configured in environment variables.");
  }
  
  const messages = await getChannelMessages(channelId);
  const sharedActions: SharedAction[] = [];

  for (const message of messages) {
    if (message.attachments?.length > 0) {
      const attachment = message.attachments[0];

      if (attachment.content_type?.startsWith('application/json') && attachment.filename.endsWith('.json')) {
          try {
              const response = await axios.get(attachment.url);
              const actionData = response.data;
              
              const descriptionMatch = message.content.match(/Description: (.*)/);
              const description = descriptionMatch ? descriptionMatch[1].trim() : (actionData.description || "No description provided.");

              sharedActions.push({
                  id: message.id,
                  name: actionData.name || "Untitled Action",
                  description: description,
                  url: attachment.url,
              });

          } catch (error: any) {
              console.error(`Failed to fetch or parse action JSON from ${attachment.url}:`, error.message);
          }
      }
    }
  }

  return { actions: sharedActions };
}
