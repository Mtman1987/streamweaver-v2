
'use server';

/**
 * @fileOverview A Genkit flow for uploading the current stream metrics to a Discord channel.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { uploadFileToDiscord } from '@/services/discord';
import * as fs from 'fs/promises';
import * as path from 'path';

const METRICS_FILE_PATH = path.resolve(process.cwd(), 'src', 'data', 'stream-metrics.json');

const SyncStreamMetricsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SyncStreamMetricsOutput = z.infer<typeof SyncStreamMetricsOutputSchema>;

export async function syncStreamMetrics(): Promise<SyncStreamMetricsOutput> {
  return await syncStreamMetricsFlow(null);
}

const syncStreamMetricsFlow = ai.defineFlow(
  {
    name: 'syncStreamMetricsFlow',
    inputSchema: z.null(),
    outputSchema: SyncStreamMetricsOutputSchema,
  },
  async () => {
    const channelId = process.env.NEXT_PUBLIC_DISCORD_METRICS_CHANNEL_ID;
    if (!channelId) {
      throw new Error("Discord metrics channel ID (NEXT_PUBLIC_DISCORD_METRICS_CHANNEL_ID) is not configured.");
    }
    
    try {
      // Read the local metrics file
      const fileContent = await fs.readFile(METRICS_FILE_PATH, 'utf-8');
      
      const fileName = `stream-metrics_${Date.now()}.json`;
      const messageContent = `Stream metrics backup from ${new Date().toISOString()}`;
      
      await uploadFileToDiscord(channelId, fileContent, fileName, messageContent);
      
      const successMessage = "Successfully synced stream metrics to Discord.";
      console.log(successMessage);
      return { success: true, message: successMessage };

    } catch (error: any) {
      const errorMessage = `Failed to sync stream metrics: ${error.message}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
);
