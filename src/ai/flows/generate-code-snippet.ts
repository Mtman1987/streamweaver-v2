/**
 * @fileOverview AI-powered Code Generator for Execute Code Sub-Actions
 * Generates C#, JavaScript, or Python code snippets based on user intent
 */

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateCodeSnippetInputSchema = z.object({
  description: z.string().describe("What the code should do"),
  language: z.enum(['csharp', 'javascript', 'python']).describe("Programming language"),
  context: z.object({
    availableVariables: z.array(z.string()).optional().describe("Variables available in the context"),
    platform: z.string().optional().describe("Platform context (twitch, discord, etc)"),
    triggerType: z.string().optional().describe("What triggered this action")
  }).optional()
});

const GenerateCodeSnippetOutputSchema = z.object({
  code: z.string().describe("The generated code"),
  explanation: z.string().describe("Explanation of what the code does"),
  variables: z.object({
    input: z.array(z.string()).describe("Variables the code uses"),
    output: z.array(z.string()).describe("Variables the code creates")
  }),
  requirements: z.array(z.string()).optional().describe("Any special requirements or dependencies")
});

export type GenerateCodeSnippetInput = z.infer<typeof GenerateCodeSnippetInputSchema>;
export type GenerateCodeSnippetOutput = z.infer<typeof GenerateCodeSnippetOutputSchema>;

const csharpCodePrompt = ai.definePrompt({
  name: 'csharpCodePrompt',
  input: { schema: GenerateCodeSnippetInputSchema },
  prompt: `You are an expert C# programmer for Streamer.bot automations.

TASK: Generate C# code that {{description}}

CONTEXT:
{{#if context.availableVariables}}
Available Variables: {{#each context.availableVariables}}%{{this}}%{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{#if context.platform}}Platform: {{context.platform}}{{/if}}
{{#if context.triggerType}}Triggered by: {{context.triggerType}}{{/if}}

REQUIREMENTS:
1. Use the CPH class for Streamer.bot methods (CPH.SendMessage, CPH.LogInfo, etc.)
2. Code must be inside: public class CPHInline { public bool Execute() { /* code here */ return true; } }
3. Access variables using: CPH.TryGetArg("variableName", out string value)
4. Set variables using: CPH.SetArgument("variableName", value)
5. Include error handling with try-catch
6. Add helpful comments
7. Return false on critical errors, true on success

Generate clean, production-ready C# code.`,
});

const javascriptCodePrompt = ai.definePrompt({
  name: 'javascriptCodePrompt',
  input: { schema: GenerateCodeSnippetInputSchema },
  prompt: `You are an expert JavaScript programmer for streaming automations.

TASK: Generate JavaScript code that {{description}}

CONTEXT:
{{#if context.availableVariables}}
Available Variables: {{#each context.availableVariables}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{#if context.platform}}Platform: {{context.platform}}{{/if}}
{{#if context.triggerType}}Triggered by: {{context.triggerType}}{{/if}}

REQUIREMENTS:
1. Use modern ES6+ JavaScript
2. Access context variables via the 'context' object
3. Use async/await for asynchronous operations
4. Include error handling with try-catch
5. Add helpful comments
6. Return an object with success status and any output variables

Generate clean, production-ready JavaScript code.`,
});

const pythonCodePrompt = ai.definePrompt({
  name: 'pythonCodePrompt',
  input: { schema: GenerateCodeSnippetInputSchema },
  prompt: `You are an expert Python programmer for streaming automations.

TASK: Generate Python code that {{description}}

CONTEXT:
{{#if context.availableVariables}}
Available Variables: {{#each context.availableVariables}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{#if context.platform}}Platform: {{context.platform}}{{/if}}
{{#if context.triggerType}}Triggered by: {{context.triggerType}}{{/if}}

REQUIREMENTS:
1. Use Python 3.x syntax
2. Access context variables via the context dictionary
3. Include error handling with try-except
4. Add helpful comments and docstrings
5. Follow PEP 8 style guidelines
6. Return a dictionary with success status and any output variables

Generate clean, production-ready Python code.`,
});

const generateCodeSnippetFlow = ai.defineFlow(
  {
    name: 'generateCodeSnippetFlow',
    inputSchema: GenerateCodeSnippetInputSchema,
    outputSchema: GenerateCodeSnippetOutputSchema,
  },
  async (input) => {
    let prompt;
    
    switch (input.language) {
      case 'csharp':
        prompt = csharpCodePrompt;
        break;
      case 'javascript':
        prompt = javascriptCodePrompt;
        break;
      case 'python':
        prompt = pythonCodePrompt;
        break;
      default:
        throw new Error(`Unsupported language: ${input.language}`);
    }
    
    const response = await prompt(input);
    
    return response.output;
  }
);

export async function generateCodeSnippet(input: GenerateCodeSnippetInput): Promise<GenerateCodeSnippetOutput> {
  return await generateCodeSnippetFlow(input);
}
