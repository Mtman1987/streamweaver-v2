
'use server';

/**
 * @fileOverview A Genkit flow for exporting a StreamWeave action to a Discord channel as a JSON file.
 *
 * - exportActionToDiscord - A function that handles the export process.
 * - ExportActionTo-DiscordInput - The input type for the exportActionToDiscord function.
 * - ExportActionToDiscordOutput - The return type for the exportActionToDiscord function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { uploadFileToDiscord } from '@/services/discord';

const ActionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  trigger: z.string(),
  status: z.string(),
  config: z.any().optional(),
  code: z.string().optional(),
  language: z.string().optional(),
});

const ExportActionToDiscordInputSchema = z.object({
  action: ActionSchema.describe("The action object to be exported."),
  description: z.string().optional().describe("A brief description of the action."),
});
export type ExportActionToDiscordInput = z.infer<typeof ExportActionToDiscordInputSchema>;

const ExportActionToDiscordOutputSchema = z.object({
  success: z.boolean().describe('Whether the action was exported successfully.'),
  messageUrl: z.string().optional().describe('The URL of the message in Discord.'),
});
export type ExportActionToDiscordOutput = z.infer<typeof ExportActionToDiscordOutputSchema>;

const exportActionToDiscordFlow = ai.defineFlow(
  {
    name: 'exportActionToDiscordFlow',
    inputSchema: ExportActionToDiscordInputSchema,
    outputSchema: ExportActionToDiscordOutputSchema,
  },
  async (input) => {
    const channelId = process.env.NEXT_PUBLIC_DISCORD_SHARE_CHANNEL_ID;
    if (!channelId) {
      throw new Error("Discord share channel ID is not configured in environment variables.");
    }
    
    // Prepare the JSON content
    const exportData = {
        name: input.action.name,
        description: input.description || `A shared action for the command: ${input.action.trigger}`,
        action: input.action,
    };
    const jsonContent = JSON.stringify(exportData, null, 2);
    const fileName = `${input.action.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
    
    try {
      const messageContent = `New Action Shared: **${input.action.name}**\nTrigger: \`${input.action.trigger}\`\nDescription: ${input.description || "No description provided."}`;
      
      const result = await uploadFileToDiscord(channelId, jsonContent, fileName, messageContent);
      
      console.log(`Successfully exported action '${input.action.name}' to Discord.`);

      return { 
        success: true,
        messageUrl: result.messageUrl
      };
    } catch (error: any) {
      console.error(`Failed to export action to Discord: ${error.message}`);
      throw error;
    }
  }
);

// Flow object not exported - 'use server' restriction

export async function exportActionToDiscord(input: ExportActionToDiscordInput): Promise<ExportActionToDiscordOutput> {
  const channelId = process.env.NEXT_PUBLIC_DISCORD_SHARE_CHANNEL_ID;
  if (!channelId) {
    throw new Error("Discord share channel ID is not configured in environment variables.");
  }
  
  const exportData = {
      name: input.action.name,
      description: input.description || `A shared action for the command: ${input.action.trigger}`,
      action: input.action,
  };
  const jsonContent = JSON.stringify(exportData, null, 2);
  const fileName = `${input.action.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
  
  try {
    const messageContent = `New Action Shared: **${input.action.name}**\nTrigger: \`${input.action.trigger}\`\nDescription: ${input.description || "No description provided."}`;
    
    const result = await uploadFileToDiscord(channelId, jsonContent, fileName, messageContent);
    
    console.log(`Successfully exported action '${input.action.name}' to Discord.`);

    return { 
      success: true,
      messageUrl: result.messageUrl
    };
  } catch (error: any) {
    console.error(`Failed to export action to Discord: ${error.message}`);
    throw error;
  }
}
