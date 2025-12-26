/**
 * @fileOverview AI-powered Automation Builder
 * Allows users to create actions, triggers, and sub-actions using natural language
 */

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { SubActionRegistry } from '@/services/automation/subactions/SubActionRegistry';
import { TriggerRegistry } from '@/services/automation/triggers/TriggerRegistry';

const BuildAutomationInputSchema = z.object({
  userRequest: z.string().describe("The user's natural language description of what they want to automate"),
  context: z.object({
    platform: z.string().optional().describe("The platform (twitch, discord, youtube)"),
    existingActions: z.array(z.string()).optional().describe("Names of existing actions"),
    userName: z.string().optional().describe("Username of the person requesting")
  }).optional()
});

const BuildAutomationOutputSchema = z.object({
  action: z.object({
    name: z.string().describe("Action name"),
    description: z.string().describe("What the action does"),
    enabled: z.boolean().describe("Whether action is enabled"),
    group: z.string().optional().describe("Action group"),
    randomAction: z.boolean().describe("Random action mode"),
    concurrent: z.boolean().describe("Concurrent execution"),
    triggers: z.array(z.object({
      type: z.number().describe("Trigger type ID"),
      config: z.record(z.any()).describe("Trigger configuration")
    })),
    subActions: z.array(z.object({
      type: z.number().describe("Sub-action type ID"),
      name: z.string().describe("Sub-action name"),
      config: z.record(z.any()).describe("Sub-action configuration"),
      enabled: z.boolean()
    }))
  }),
  explanation: z.string().describe("Human-readable explanation of what was built"),
  suggestions: z.array(z.string()).optional().describe("Additional suggestions for improvement")
});

export type BuildAutomationInput = z.infer<typeof BuildAutomationInputSchema>;
export type BuildAutomationOutput = z.infer<typeof BuildAutomationOutputSchema>;

// Get available sub-actions and triggers for the AI
const getAvailableSubActions = () => {
  return SubActionRegistry.getAllDefinitions().map(def => ({
    id: def.id,
    name: def.name,
    category: def.category,
    description: def.description,
    fields: def.fields?.map(f => ({ name: f.name, type: f.type, label: f.label }))
  }));
};

const getAvailableTriggers = () => {
  return TriggerRegistry.getAllDefinitions().map(def => ({
    id: def.id,
    name: def.name,
    category: def.category,
    description: def.description,
    platform: def.platform,
    fields: def.fields?.map(f => ({ name: f.name, type: f.type, label: f.label }))
  }));
};

const automationBuilderPrompt = ai.definePrompt({
  name: 'automationBuilderPrompt',
  input: { 
    schema: z.object({
      userRequest: z.string(),
      subActions: z.array(z.any()),
      triggers: z.array(z.any()),
      context: z.any().optional()
    })
  },
  prompt: `You are an expert automation builder for a streaming platform. Your job is to convert natural language requests into complete automation workflows.

USER REQUEST: "{{userRequest}}"

{{#if context.platform}}PLATFORM: {{context.platform}}{{/if}}
{{#if context.userName}}USER: {{context.userName}}{{/if}}

AVAILABLE SUB-ACTIONS (you can use these):
{{#each subActions}}
- [{{id}}] {{name}} ({{category}}): {{description}}
  {{#if fields}}Fields: {{#each fields}}{{name}} ({{type}}){{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{/each}}

AVAILABLE TRIGGERS (you can use these):
{{#each triggers}}
- [{{id}}] {{name}} ({{category}}){{#if platform}} - Platform: {{platform}}{{/if}}: {{description}}
  {{#if fields}}Fields: {{#each fields}}{{name}} ({{type}}){{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{/each}}

Your task:
1. Understand what the user wants to automate
2. Choose appropriate trigger(s) for when the automation should run
3. Design a sequence of sub-actions that accomplish the goal
4. Configure each sub-action with appropriate parameters
5. Use variables (like %user%, %message%, %rawInput%) to pass data between sub-actions

Guidelines:
- Keep it simple but effective
- Use the most appropriate trigger type
- Chain sub-actions logically
- Include delays if needed for rate limiting
- Add error handling where appropriate
- Suggest improvements

Return a complete automation configuration with explanation.`,
});

const buildAutomationFlow = ai.defineFlow(
  {
    name: 'buildAutomationFlow',
    inputSchema: BuildAutomationInputSchema,
    outputSchema: BuildAutomationOutputSchema,
  },
  async (input) => {
    const subActions = getAvailableSubActions();
    const triggers = getAvailableTriggers();
    
    const response = await automationBuilderPrompt({
      userRequest: input.userRequest,
      subActions,
      triggers,
      context: input.context
    });
    
    return response.output;
  }
);

export async function buildAutomation(input: BuildAutomationInput): Promise<BuildAutomationOutput> {
  return await buildAutomationFlow(input);
}
