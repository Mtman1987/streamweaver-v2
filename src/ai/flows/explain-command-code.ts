'use server';

/**
 * @fileOverview An AI agent that explains command code in plain language.
 *
 * - explainCommandCode - A function that handles the explanation of command code.
 * - ExplainCommandCodeInput - The input type for the explainCommandCode function.
 * - ExplainCommandCodeOutput - The return type for the explainCommandCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainCommandCodeInputSchema = z.object({
  commandCode: z
    .string()
    .describe('The command code to be explained in plain language.'),
});
export type ExplainCommandCodeInput = z.infer<typeof ExplainCommandCodeInputSchema>;

const ExplainCommandCodeOutputSchema = z.object({
  explanation: z.string().describe('The plain language explanation of the command code.'),
});
export type ExplainCommandCodeOutput = z.infer<typeof ExplainCommandCodeOutputSchema>;

export async function explainCommandCode(input: ExplainCommandCodeInput): Promise<ExplainCommandCodeOutput> {
  return explainCommandCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainCommandCodePrompt',
  input: {schema: ExplainCommandCodeInputSchema},
  output: {schema: ExplainCommandCodeOutputSchema},
  prompt: `You are an expert code explainer.  You take code as input, and return a plain language explanation of what the code does.

Code:
{{commandCode}}`,
});

const explainCommandCodeFlow = ai.defineFlow(
  {
    name: 'explainCommandCodeFlow',
    inputSchema: ExplainCommandCodeInputSchema,
    outputSchema: ExplainCommandCodeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
