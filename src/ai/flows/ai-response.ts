'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiResponseInputSchema = z.object({
  prompt: z.string().describe('The prompt to send to the AI'),
});
export type AiResponseInput = z.infer<typeof AiResponseInputSchema>;

const AiResponseOutputSchema = z.object({
  response: z.string().describe('The AI response'),
});
export type AiResponseOutput = z.infer<typeof AiResponseOutputSchema>;

const aiResponseFlow = ai.defineFlow(
  {
    name: 'aiResponseFlow',
    inputSchema: AiResponseInputSchema,
    outputSchema: AiResponseOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: ai.defaultModel,
      prompt: input.prompt,
    });

    return { response: output?.text || 'No response generated' };
  }
);

// Flow object not exported - 'use server' restriction

export async function aiResponse(input: AiResponseInput): Promise<AiResponseOutput> {
  return await aiResponseFlow(input);
}