import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { FlowNodeKind } from '@/types/flows';

const FlowNodeKindEnum = z.enum(['trigger', 'condition', 'action', 'logic', 'output']);

const FlowNodeSchema = z.object({
  label: z.string().min(1),
  type: FlowNodeKindEnum,
  subtype: z.string().min(1),
  data: z.record(z.any()).default({}),
});

const GenerateNodeInputSchema = z.object({
  description: z.string().min(5),
  context: z.object({
    availablePlugins: z.array(z.string()).optional(),
    defaultVoice: z.string().optional(),
  }).optional(),
});

export type GenerateFlowNodeInput = z.infer<typeof GenerateNodeInputSchema>;
export type GeneratedFlowNode = z.infer<typeof FlowNodeSchema>;

const systemPrompt = `
You are an assistant that designs JSON nodes for a stream-automation flow builder.
Always respond with a single JSON object matching the schema:
{
  "label": string,
  "type": "trigger" | "action" | "condition" | "logic" | "output",
  "subtype": string,
  "data": { ... }
}

Guidelines:
- Keep label concise.
- If subtype relates to plugins or services, note it.
- For plugin commands, include fields: pluginId, command, payload.
- Never include backticks or extra commentary, only JSON.
`;

const generateFlowNodeFlow = ai.defineFlow(
  {
    name: 'generateFlowNode',
    inputSchema: GenerateNodeInputSchema,
    outputSchema: FlowNodeSchema,
  },
  async (input) => {
    const contextLines: string[] = [];
    if (input.context?.availablePlugins?.length) {
      contextLines.push(
        `Available plugins: ${input.context.availablePlugins.join(', ')}.`
      );
    }
    if (input.context?.defaultVoice) {
      contextLines.push(`Default TTS voice: ${input.context.defaultVoice}.`);
    }

    const userPrompt = `
${systemPrompt}

Description: ${input.description}
${contextLines.join('\n')}
`;

    const { output } = await ai.generate({
      model: ai.defaultModel,
      prompt: userPrompt,
      config: {
        temperature: 0.2,
      },
    });

    if (!output?.text) {
      throw new Error('AI did not return text output.');
    }

    let parsed: GeneratedFlowNode | null = null;
    try {
      parsed = FlowNodeSchema.parse(JSON.parse(output.text));
    } catch (error) {
      console.error('[generateFlowNode] Failed to parse JSON:', error, output.text);
      throw new Error('AI returned invalid node JSON.');
    }

    return parsed;
  }
);

export async function generateFlowNode(input: GenerateFlowNodeInput): Promise<GeneratedFlowNode> {
  const contextLines: string[] = [];
  if (input.context?.availablePlugins?.length) {
    contextLines.push(
      `Available plugins: ${input.context.availablePlugins.join(', ')}.`
    );
  }
  if (input.context?.defaultVoice) {
    contextLines.push(`Default TTS voice: ${input.context.defaultVoice}.`);
  }

  const userPrompt = `
${systemPrompt}

Description: ${input.description}
${contextLines.join('\n')}
`;

  const { output } = await ai.generate({
    model: ai.defaultModel,
    prompt: userPrompt,
    config: {
      temperature: 0.2,
    },
  });

  if (!output?.text) {
    throw new Error('AI did not return text output.');
  }

  let parsed: GeneratedFlowNode | null = null;
  try {
    parsed = FlowNodeSchema.parse(JSON.parse(output.text));
  } catch (error) {
    console.error('[generateFlowNode] Failed to parse JSON:', error, output.text);
    throw new Error('AI returned invalid node JSON.');
  }

  return parsed;
}
