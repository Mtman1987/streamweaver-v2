"use server";

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export type GenerateActionCodeInput = {
  description: string;
  language: string;
};

export type GenerateActionCodeOutput = {
  code: string;
};

const GenerateActionCodeInputSchema = z.object({
  description: z.string(),
  language: z.string(),
});

const GenerateActionCodeOutputSchema = z.object({
  code: z.string(),
});

const generateActionCodeFlow = ai.defineFlow(
  {
    name: 'generateActionCodeFlow',
    inputSchema: GenerateActionCodeInputSchema,
    outputSchema: GenerateActionCodeOutputSchema,
  },
  async (input) => {
    const prompt = `You are generating code for a streaming automation system.

Output requirements:
- Output ONLY code. No markdown fences. No explanations.
- Language: ${input.language}

Task:
${input.description}
`;

    const { output } = await ai.generate({
      model: ai.defaultModel,
      prompt,
      config: {
        temperature: 0.2,
      },
    });

    const code = output?.text?.trim();
    if (!code) {
      throw new Error('AI did not return code output.');
    }

    return { code };
  }
);

export async function generateActionCode(input: GenerateActionCodeInput): Promise<GenerateActionCodeOutput> {
  return await generateActionCodeFlow(input);
}
