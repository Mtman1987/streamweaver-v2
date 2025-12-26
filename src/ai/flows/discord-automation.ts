/**
 * @fileOverview Enhanced Discord Integration for Automation Building
 * Allows users to build automations via Discord using natural language
 */

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { buildAutomation } from './build-automation';
import { generateCodeSnippet } from './generate-code-snippet';
import { chatWithWorkflowAssistant } from './workflow-assistant';
import { sendDiscordMessage } from './send-discord-message';

const DiscordAutomationCommandInputSchema = z.object({
  userId: z.string().describe("Discord user ID"),
  userName: z.string().describe("Discord username"),
  channelId: z.string().describe("Discord channel ID"),
  command: z.string().describe("The command (build, code, help, explain)"),
  message: z.string().describe("The message content"),
  guildId: z.string().optional().describe("Discord guild/server ID")
});

const DiscordAutomationCommandOutputSchema = z.object({
  response: z.string().describe("Response to send to Discord"),
  automation: z.any().optional().describe("Generated automation if applicable"),
  embed: z.object({
    title: z.string(),
    description: z.string(),
    fields: z.array(z.object({
      name: z.string(),
      value: z.string(),
      inline: z.boolean().optional()
    })).optional(),
    color: z.number().optional(),
    footer: z.object({
      text: z.string()
    }).optional()
  }).optional().describe("Formatted Discord embed")
});

export type DiscordAutomationCommandInput = z.infer<typeof DiscordAutomationCommandInputSchema>;
export type DiscordAutomationCommandOutput = z.infer<typeof DiscordAutomationCommandOutputSchema>;

/**
 * Handle automation building commands from Discord
 */
const discordAutomationCommandFlow = ai.defineFlow(
  {
    name: 'discordAutomationCommandFlow',
    inputSchema: DiscordAutomationCommandInputSchema,
    outputSchema: DiscordAutomationCommandOutputSchema,
  },
  async (input) => {
    const { command, message, userName, channelId } = input;
    
    try {
      switch (command.toLowerCase()) {
        case 'build':
        case 'create':
        case 'make': {
          // Build automation from natural language
          const automation = await buildAutomation({
            userRequest: message,
            context: {
              platform: 'discord',
              userName
            }
          });
          
          return {
            response: `✅ I've designed an automation for you!`,
            automation: automation.action,
            embed: {
              title: `🤖 ${automation.action.name}`,
              description: automation.explanation,
              fields: [
                {
                  name: '⚡ Triggers',
                  value: automation.action.triggers.map(t => `• Trigger ID ${t.type}`).join('\n') || 'None',
                  inline: true
                },
                {
                  name: '🔧 Sub-Actions',
                  value: `${automation.action.subActions.length} configured`,
                  inline: true
                }
              ],
              color: 0x5865F2,
              footer: {
                text: 'Use !sw apply to add this to your StreamWeaver'
              }
            }
          };
        }
        
        case 'code':
        case 'generate': {
          // Generate code snippet
          const codeRequest = await generateCodeSnippet({
            description: message,
            language: 'csharp', // Default to C# for Streamer.bot compatibility
            context: {
              platform: 'discord'
            }
          });
          
          return {
            response: `\`\`\`csharp\n${codeRequest.code}\n\`\`\``,
            embed: {
              title: '💻 Generated Code',
              description: codeRequest.explanation,
              fields: [
                {
                  name: '📥 Input Variables',
                  value: codeRequest.variables.input.join(', ') || 'None',
                  inline: true
                },
                {
                  name: '📤 Output Variables',
                  value: codeRequest.variables.output.join(', ') || 'None',
                  inline: true
                }
              ],
              color: 0x00FF00
            }
          };
        }
        
        case 'help':
        case 'assist':
        case 'chat': {
          // Chat with workflow assistant
          const assistantResponse = await chatWithWorkflowAssistant({
            message,
            userName
          });
          
          const embed: any = {
            title: '🤖 StreamWeaver AI Assistant',
            description: assistantResponse.response,
            color: 0x9B59B6
          };
          
          if (assistantResponse.nextSteps && assistantResponse.nextSteps.length > 0) {
            embed.fields = [{
              name: '💡 Next Steps',
              value: assistantResponse.nextSteps.map(s => `• ${s}`).join('\n')
            }];
          }
          
          return {
            response: assistantResponse.response,
            embed
          };
        }
        
        case 'explain': {
          // Explain a sub-action or trigger
          const explanation = await chatWithWorkflowAssistant({
            message: `Explain this in detail: ${message}`,
            userName
          });
          
          return {
            response: explanation.response,
            embed: {
              title: '📚 Explanation',
              description: explanation.response,
              color: 0xE67E22
            }
          };
        }
        
        default: {
          // General chat with AI
          const response = await chatWithWorkflowAssistant({
            message: `${command} ${message}`,
            userName
          });
          
          return {
            response: response.response,
            embed: {
              title: '💬 StreamWeaver AI',
              description: response.response,
              color: 0x3498DB
            }
          };
        }
      }
    } catch (error) {
      console.error('Discord automation command error:', error);
      const message = error instanceof Error ? error.message : String(error);
      return {
        response: `❌ Sorry, I encountered an error: ${message}`,
        embed: {
          title: '❌ Error',
          description: `I couldn't process that command: ${message}`,
          color: 0xFF0000
        }
      };
    }
  }
);

export async function handleDiscordAutomationCommand(input: DiscordAutomationCommandInput): Promise<DiscordAutomationCommandOutput> {
  return await discordAutomationCommandFlow(input);
}

/**
 * Format and send the response back to Discord
 */
export async function sendDiscordAutomationResponse(
  channelId: string, 
  response: DiscordAutomationCommandOutput
): Promise<void> {
  const parts: string[] = [];

  if (response.response?.trim()) {
    parts.push(response.response);
  }

  if (response.embed) {
    parts.push(`\n**${response.embed.title}**`);
    if (response.embed.description?.trim()) {
      parts.push(response.embed.description);
    }
    if (response.embed.fields && response.embed.fields.length > 0) {
      for (const field of response.embed.fields) {
        parts.push(`\n**${field.name}**\n${field.value}`);
      }
    }
    if (response.embed.footer?.text?.trim()) {
      parts.push(`\n_${response.embed.footer.text}_`);
    }
  }

  await sendDiscordMessage({
    channelId,
    message: parts.join('\n').trim() || ' ',
  });
}

/**
 * Example Discord bot message handler
 * This would be called by your Discord bot when it receives a message
 */
export async function onDiscordMessage(
  userId: string,
  userName: string,
  channelId: string,
  messageContent: string,
  guildId?: string
): Promise<void> {
  // Check if message starts with !sw (StreamWeaver command)
  if (!messageContent.startsWith('!sw ')) {
    return;
  }
  
  // Parse command
  const parts = messageContent.slice(4).trim().split(' ');
  const command = parts[0];
  const message = parts.slice(1).join(' ');
  
  // Process command
  const response = await handleDiscordAutomationCommand({
    userId,
    userName,
    channelId,
    command,
    message,
    guildId
  });
  
  // Send response
  await sendDiscordAutomationResponse(channelId, response);
}
