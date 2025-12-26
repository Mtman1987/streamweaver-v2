// The directive tells Next.js it's a server-side module.
'use server';

/**
 * @fileOverview AI-powered unit test generation for custom stream commands.
 *
 * - generateCommandTests - Generates unit tests for a given stream command.
 * - GenerateCommandTestsInput - The input type for the generateCommandTests function.
 * - GenerateCommandTestsOutput - The return type for the generateCommandTests function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCommandTestsInputSchema = z.object({
  commandCode: z
    .string()
    .describe('The code of the stream command for which to generate unit tests.'),
  commandDescription: z
    .string()
    .describe('A description of what the stream command does.'),
});
export type GenerateCommandTestsInput = z.infer<typeof GenerateCommandTestsInputSchema>;

const GenerateCommandTestsOutputSchema = z.object({
  unitTests: z
    .string()
    .describe('The generated unit tests for the stream command, as a string of code.'),
});
export type GenerateCommandTestsOutput = z.infer<typeof GenerateCommandTestsOutputSchema>;

export async function generateCommandTests(input: GenerateCommandTestsInput): Promise<GenerateCommandTestsOutput> {
  return generateCommandTestsFlow(input);
}

const generateCommandTestsPrompt = ai.definePrompt({
  name: 'generateCommandTestsPrompt',
  input: {schema: GenerateCommandTestsInputSchema},
  output: {schema: GenerateCommandTestsOutputSchema},
  prompt: `You are an AI assistant specializing in generating unit tests for stream commands.

  Given the code and description of a stream command, your task is to generate comprehensive unit tests to ensure its correct functionality.
  The unit tests should cover various scenarios, including normal cases, edge cases, and error conditions.
  Make sure to import everything you need at the top of the file. Do not use any functions that are not defined or imported.

  Command Description: {{{commandDescription}}}

  Command Code:
  \`\`\`typescript
  {{{commandCode}}}
  \`\`\`

  Unit Tests:
  \`\`\`typescript
  `, // The closing \\`\`\` will be appended to the result
});

const generateCommandTestsFlow = ai.defineFlow(
  {
    name: 'generateCommandTestsFlow',
    inputSchema: GenerateCommandTestsInputSchema,
    outputSchema: GenerateCommandTestsOutputSchema,
  },
  async input => {
    const {output} = await generateCommandTestsPrompt(input);
    return {
      unitTests: output!.unitTests + '\`\`\`',
    };
  }
);
