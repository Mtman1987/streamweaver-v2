
'use server';

/**
 * @fileOverview A Genkit flow for retrieving the latest stream metrics from a Discord channel.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getChannelMessages } from '@/services/discord';
import axios from 'axios';

const StreamMetricsSchema = z.object({
  totalCommands: z.number().default(0),
  shoutoutsGiven: z.number().default(0),
  athenaCommands: z.number().default(0),
  lurkCommands: z.number().default(0),
});
export type StreamMetrics = z.infer<typeof StreamMetricsSchema>;

const GetStreamMetricsOutputSchema = z.object({
  metrics: StreamMetricsSchema.describe("The latest stream metrics."),
});
type GetStreamMetricsOutput = z.infer<typeof GetStreamMetricsOutputSchema>;

export async function getStreamMetrics(): Promise<GetStreamMetricsOutput> {
  return await getStreamMetricsFlow(null);
}

const getStreamMetricsFlow = ai.defineFlow(
  {
    name: 'getStreamMetricsFlow',
    inputSchema: z.null(),
    outputSchema: GetStreamMetricsOutputSchema,
  },
  async () => {
    const channelId = process.env.NEXT_PUBLIC_DISCORD_METRICS_CHANNEL_ID;
    if (!channelId) {
      console.warn("Discord metrics channel ID not configured. Returning default metrics.");
      return { metrics: { totalCommands: 0, shoutoutsGiven: 0, athenaCommands: 0, lurkCommands: 0 } };
    }

    // Fetch the most recent message from the channel.
    const messages = await getChannelMessages(channelId, 1);
    if (messages.length === 0) {
      return { metrics: { totalCommands: 0, shoutoutsGiven: 0, athenaCommands: 0, lurkCommands: 0 } };
    }

    const latestMessage = messages[0];
    const attachment = latestMessage.attachments?.[0];

    if (attachment && attachment.content_type?.startsWith('application/json')) {
      try {
        const response = await axios.get(attachment.url);
        const metricsData = response.data;
        // Validate the data with Zod schema. It will throw an error if it doesn't match.
        const parsedMetrics = StreamMetricsSchema.parse(metricsData);
        return { metrics: parsedMetrics };
      } catch (error: any) {
        console.error(`Failed to fetch or parse metrics JSON from ${attachment.url}:`, error.message);
        // Fallback to default metrics on error.
        return { metrics: { totalCommands: 0, shoutoutsGiven: 0, athenaCommands: 0, lurkCommands: 0 } };
      }
    }

    // Fallback if no valid attachment is found
    return { metrics: { totalCommands: 0, shoutoutsGiven: 0, athenaCommands: 0, lurkCommands: 0 } };
  }
);
