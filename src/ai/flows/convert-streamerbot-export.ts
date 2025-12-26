'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { uudecode, isUUEncoded } from '@/lib/uudecoder';

const ConvertStreamerbotExportInputSchema = z.object({
  exportData: z.string().describe("The Streamerbot export data (UUEncoded or JSON)"),
});

const ConvertStreamerbotExportOutputSchema = z.object({
  actions: z.array(z.object({
    name: z.string(),
    trigger: z.string(),
    type: z.string(),
    status: z.string(),
    code: z.string().optional(),
    language: z.string().optional(),
    config: z.any().optional(),
  })).describe("Converted StreamWeave actions"),
  commands: z.array(z.object({
    name: z.string(),
    trigger: z.string(),
    response: z.string(),
    enabled: z.boolean(),
    cooldown: z.number().optional(),
  })).describe("Converted StreamWeave commands"),
  changes: z.array(z.string()).describe("List of changes made during conversion"),
});

export async function convertStreamerbotExport(input: { exportData: string }) {
  return await convertStreamerbotExportFlow(input);
}

const convertStreamerbotExportFlow = ai.defineFlow(
  {
    name: 'convertStreamerbotExport',
    inputSchema: ConvertStreamerbotExportInputSchema,
    outputSchema: ConvertStreamerbotExportOutputSchema,
  },
  async ({ exportData }) => {
    let jsonData: any;
    const changes: string[] = [];

    // Decode UUEncoded data if needed
    if (isUUEncoded(exportData)) {
      try {
        const decoded = uudecode(exportData);
        jsonData = JSON.parse(decoded);
        changes.push("Decoded UUEncoded Streamerbot export");
      } catch (error) {
        throw new Error("Failed to decode UUEncoded data");
      }
    } else {
      try {
        jsonData = JSON.parse(exportData);
      } catch (error) {
        throw new Error("Invalid JSON format");
      }
    }

    const actions: any[] = [];
    const commands: any[] = [];

    // Convert Streamerbot actions to StreamWeave format
    if (jsonData.actions) {
      for (const sbAction of jsonData.actions) {
        const action: any = {
          name: sbAction.name || "Untitled Action",
          trigger: sbAction.trigger || "manual",
          type: "custom",
          status: sbAction.enabled ? "active" : "inactive",
        };

        // Convert C# code to JavaScript
        if (sbAction.subActions) {
          const codeBlocks = sbAction.subActions
            .filter((sub: any) => sub.type === "Code")
            .map((sub: any) => sub.code)
            .join('\n');

          if (codeBlocks) {
            action.code = convertCSharpToJS(codeBlocks);
            action.language = "javascript";
            changes.push(`Converted C# code to JavaScript for action: ${action.name}`);
          }
        }

        // Convert triggers
        if (sbAction.triggers) {
          const trigger = sbAction.triggers[0];
          if (trigger?.type === "Command") {
            action.trigger = trigger.command || action.trigger;
            changes.push(`Converted command trigger for action: ${action.name}`);
          }
        }

        actions.push(action);
      }
    }

    // Convert Streamerbot commands to StreamWeave format
    if (jsonData.commands) {
      for (const sbCommand of jsonData.commands) {
        const command = {
          name: sbCommand.command || sbCommand.name || "Untitled Command",
          trigger: sbCommand.command || sbCommand.trigger,
          response: sbCommand.message || sbCommand.response || "No response configured",
          enabled: sbCommand.enabled !== false,
          cooldown: sbCommand.cooldown || 0,
        };

        // Convert Streamerbot variables to StreamWeave format
        if (command.response.includes('%')) {
          command.response = command.response
            .replace(/%user%/g, '{user}')
            .replace(/%targetUser%/g, '{args[0]}')
            .replace(/%rawInput%/g, '{message}');
          changes.push(`Converted variable syntax for command: ${command.name}`);
        }

        commands.push(command);
      }
    }

    return { actions, commands, changes };
  }
);

function convertCSharpToJS(csharpCode: string): string {
  let jsCode = csharpCode;

  // Convert C# syntax to JavaScript
  jsCode = jsCode
    .replace(/CPH\./g, 'api.')
    .replace(/args\["([^"]+)"\]/g, 'args.$1')
    .replace(/string\s+(\w+)\s*=/g, 'let $1 =')
    .replace(/int\s+(\w+)\s*=/g, 'let $1 =')
    .replace(/bool\s+(\w+)\s*=/g, 'let $1 =')
    .replace(/var\s+(\w+)\s*=/g, 'let $1 =')
    .replace(/\.ToString\(\)/g, '.toString()')
    .replace(/\.ToLower\(\)/g, '.toLowerCase()')
    .replace(/\.ToUpper\(\)/g, '.toUpperCase()')
    .replace(/Console\.WriteLine/g, 'console.log')
    .replace(/return;/g, 'return null;');

  return jsCode;
}