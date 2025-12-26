'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating stream command suggestions based on a description.
 *
 * It includes:
 * - generateCommandSuggestions: The main function to generate command suggestions.
 * - GenerateCommandSuggestionsInput: The input type for the function.
 * - GenerateCommandSuggestionsOutput: The output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCommandSuggestionsInputSchema = z.object({
  commandDescription: z.string().describe('A description of what the stream command should do.'),
});
export type GenerateCommandSuggestionsInput = z.infer<typeof GenerateCommandSuggestionsInputSchema>;

const GenerateCommandSuggestionsOutputSchema = z.object({
  suggestedCommand: z.string().describe('A suggested stream command based on the description.'),
  suggestedCodeImplementation: z.string().describe('A code implementation for the suggested stream command.'),
});
export type GenerateCommandSuggestionsOutput = z.infer<typeof GenerateCommandSuggestionsOutputSchema>;

export async function generateCommandSuggestions(input: GenerateCommandSuggestionsInput): Promise<GenerateCommandSuggestionsOutput> {
  return generateCommandSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCommandSuggestionsPrompt',
  input: {schema: GenerateCommandSuggestionsInputSchema},
  output: {schema: GenerateCommandSuggestionsOutputSchema},
  prompt: `You are an AI Stream Command Suggestion generator. Your role is to take a description of what the user wants a stream command to do, and then suggest a stream command that satisfies the description.

Description: {{{commandDescription}}}

Here is the suggested command in plain text:

Here is the code implementation for the suggested stream command:`,
});

const generateCommandSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateCommandSuggestionsFlow',
    inputSchema: GenerateCommandSuggestionsInputSchema,
    outputSchema: GenerateCommandSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
