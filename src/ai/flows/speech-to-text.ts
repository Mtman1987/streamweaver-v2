
'use server';

/**
 * @fileOverview This file is being deprecated and is no longer used.
 * The speech-to-text functionality has been moved to a dedicated service
 * at src/services/speech.ts using the @google-cloud/speech client.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SpeechToTextInputSchema = z.object({
  audioDataUri: z.string(),
});
export type SpeechToTextInput = z.infer<typeof SpeechToTextInputSchema>;

const SpeechToTextOutputSchema = z.object({
  transcription: z.string(),
});
export type SpeechToTextOutput = z.infer<typeof SpeechToTextOutputSchema>;


export async function speechToText(input: SpeechToTextInput): Promise<SpeechToTextOutput> {
  // This flow is deprecated.
  console.warn("speechToText flow is deprecated and should not be used.");
  return { transcription: "This feature has been moved." };
}

const speechToTextFlow = ai.defineFlow(
  {
    name: 'speechToTextFlow_DEPRECATED',
    inputSchema: SpeechToTextInputSchema,
    outputSchema: SpeechToTextOutputSchema,
  },
  async (input) => {
    return { transcription: "This flow is deprecated." };
  }
);
