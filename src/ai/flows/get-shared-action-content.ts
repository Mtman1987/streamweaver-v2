
'use server';

/**
 * @fileOverview A Genkit flow for retrieving the content of a shared action's JSON file from a URL.
 *
 * - getSharedActionContent - Fetches the JSON content from a given URL.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import axios from 'axios';

const GetSharedActionContentInputSchema = z.object({
  url: z.string().url().describe("The URL of the JSON file to fetch."),
});
export type GetSharedActionContentInput = z.infer<typeof GetSharedActionContentInputSchema>;

// The output can be any valid JSON, so we use z.any()
const GetSharedActionContentOutputSchema = z.any();


const getSharedActionContentFlow = ai.defineFlow(
  {
    name: 'getSharedActionContentFlow',
    inputSchema: GetSharedActionContentInputSchema,
    outputSchema: GetSharedActionContentOutputSchema,
  },
  async ({ url }) => {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to fetch action content from ${url}:`, error.message);
      throw new Error(`Could not download action content from the specified URL. ${error.message}`);
    }
  }
);

// Flow object not exported - 'use server' restriction

export async function getSharedActionContent(input: GetSharedActionContentInput): Promise<any> {
  return await getSharedActionContentFlow(input);
}
