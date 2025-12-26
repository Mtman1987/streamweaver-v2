/**
 * @fileOverview AI Workflow Assistant - Conversational automation builder
 * Chat with AI to build, modify, and understand automations
 */

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { SubActionRegistry } from '@/services/automation/subactions/SubActionRegistry';
import { TriggerRegistry } from '@/services/automation/triggers/TriggerRegistry';

const WorkflowAssistantInputSchema = z.object({
  message: z.string().describe("User's message or question"),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional().describe("Previous conversation messages"),
  currentWorkflow: z.object({
    name: z.string().optional(),
    triggers: z.array(z.any()).optional(),
    subActions: z.array(z.any()).optional()
  }).optional().describe("The workflow currently being worked on"),
  userName: z.string().optional()
});

const WorkflowAssistantOutputSchema = z.object({
  response: z.string().describe("AI assistant's response"),
  suggestedChanges: z.object({
    addTriggers: z.array(z.any()).optional(),
    addSubActions: z.array(z.any()).optional(),
    modifySubActions: z.array(z.any()).optional(),
    removeSubActions: z.array(z.number()).optional()
  }).optional().describe("Suggested changes to the workflow"),
  codeSnippets: z.array(z.object({
    language: z.string(),
    code: z.string(),
    description: z.string()
  })).optional().describe("Code snippets to show the user"),
  nextSteps: z.array(z.string()).optional().describe("Suggested next steps")
});

export type WorkflowAssistantInput = z.infer<typeof WorkflowAssistantInputSchema>;
export type WorkflowAssistantOutput = z.infer<typeof WorkflowAssistantOutputSchema>;

const workflowAssistantPrompt = ai.definePrompt({
  name: 'workflowAssistantPrompt',
  input: { 
    schema: z.object({
      message: z.string(),
      conversationHistory: z.array(z.any()).optional(),
      currentWorkflow: z.any().optional(),
      subActionCategories: z.array(z.string()),
      triggerCategories: z.array(z.string()),
      userName: z.string().optional()
    })
  },
  prompt: `You are StreamWeaver AI, an expert assistant for building streaming automations.

{{#if userName}}You're helping {{userName}} build their automation.{{/if}}

AVAILABLE CAPABILITIES:
- Sub-Action Categories: {{#each subActionCategories}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Trigger Categories: {{#each triggerCategories}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

{{#if currentWorkflow.name}}
CURRENT WORKFLOW: "{{currentWorkflow.name}}"
{{#if currentWorkflow.triggers}}Triggers: {{currentWorkflow.triggers.length}} configured{{/if}}
{{#if currentWorkflow.subActions}}Sub-Actions: {{currentWorkflow.subActions.length}} configured{{/if}}
{{/if}}

{{#if conversationHistory}}
CONVERSATION HISTORY:
{{#each conversationHistory}}
{{role}}: {{content}}
{{/each}}
{{/if}}

USER: {{message}}

Your role:
1. Answer questions about automation building
2. Suggest sub-actions and triggers for user goals
3. Help debug and improve existing workflows
4. Generate code snippets when needed
5. Explain how different components work together
6. Be conversational and helpful

Respond in a friendly, expert manner. If suggesting changes, be specific about what to add/modify. If the user wants code, generate working examples.`,
});

const workflowAssistantFlow = ai.defineFlow(
  {
    name: 'workflowAssistantFlow',
    inputSchema: WorkflowAssistantInputSchema,
    outputSchema: WorkflowAssistantOutputSchema,
  },
  async (input) => {
    const subActionCategories = SubActionRegistry.getCategories();
    const triggerCategories = TriggerRegistry.getCategories();
    
    const response = await workflowAssistantPrompt({
      message: input.message,
      conversationHistory: input.conversationHistory,
      currentWorkflow: input.currentWorkflow,
      subActionCategories,
      triggerCategories,
      userName: input.userName
    });
    
    return response.output;
  }
);

export async function chatWithWorkflowAssistant(input: WorkflowAssistantInput): Promise<WorkflowAssistantOutput> {
  return await workflowAssistantFlow(input);
}

/**
 * Quick help for specific sub-actions
 */
export async function explainSubAction(subActionId: number): Promise<string> {
  const definition = SubActionRegistry.getDefinition(subActionId);
  
  if (!definition) {
    return `Sub-action with ID ${subActionId} not found.`;
  }
  
  const input: WorkflowAssistantInput = {
    message: `Explain how to use the "${definition.name}" sub-action and give me an example.`
  };
  
  const response = await chatWithWorkflowAssistant(input);
  return response.response;
}

/**
 * Quick help for specific triggers
 */
export async function explainTrigger(triggerId: number): Promise<string> {
  const definition = TriggerRegistry.getDefinition(triggerId);
  
  if (!definition) {
    return `Trigger with ID ${triggerId} not found.`;
  }
  
  const input: WorkflowAssistantInput = {
    message: `Explain the "${definition.name}" trigger and when I should use it.`
  };
  
  const response = await chatWithWorkflowAssistant(input);
  return response.response;
}
