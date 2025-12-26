
'use server';

/**
 * @fileOverview A Genkit flow for executing arbitrary JavaScript code in a sandboxed environment.
 *
 * - runCode - A function that handles executing the code.
 * - RunCodeInput - The input type for the runCode function.
 * - RunCodeOutput - The return type for the runCode function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { createContext, runInContext } from 'node:vm';

// We need to import all the functions that might be used in the sandboxed code.
// import * as genkit from 'genkit'; // Disabled for build
// import * as shoutoutFlow from '@/ai/flows/generate-shoutout'; // File doesn't exist yet
import * as athenaFlow from '@/ai/flows/chat-with-athena';
import { conversationalResponse, conversationalResponseFlow } from '@/ai/flows/conversational-response';
import * as textToSpeechFlow from '@/ai/flows/text-to-speech';
import * as sendTwitchMessageFlow from '@/ai/flows/send-twitch-message';
import * as sendDiscordMessageFlow from '@/ai/flows/send-discord-message';
import * as aiResponseFlow from '@/ai/flows/ai-response';
import * as twitchService from '@/services/twitch';
import * as discordService from '@/services/discord';
import * as storageService from '@/services/storage';
import * as pointsService from '@/services/points';
import * as usernameMatcher from '@/lib/username-matcher';


const RunCodeInputSchema = z.object({
  code: z.string().describe('The JavaScript code to execute.'),
});
export type RunCodeInput = z.infer<typeof RunCodeInputSchema>;

const RunCodeOutputSchema = z.object({
  output: z.any().optional().describe('The output from the executed code.'),
  error: z.string().optional().describe('Any error that occurred during execution.'),
});
export type RunCodeOutput = z.infer<typeof RunCodeOutputSchema>;


const runCodeFlow = ai.defineFlow(
  {
    name: 'runCodeFlow',
    inputSchema: RunCodeInputSchema,
    outputSchema: RunCodeOutputSchema,
  },
  async (input) => {
    let capturedOutput: any[] = [];
    
    // Define the modules that can be 'required' inside the sandbox.
    const requireableModules = {
      // 'genkit': genkit, // Disabled for build
      'zod': z,
      '@/ai/flows/chat-with-athena': athenaFlow,
      '@/ai/flows/conversational-response': { conversationalResponse, conversationalResponseFlow },
      '@/ai/flows/text-to-speech': textToSpeechFlow,
      '@/ai/flows/send-twitch-message': sendTwitchMessageFlow,
      '@/ai/flows/send-discord-message': sendDiscordMessageFlow,
      '@/ai/flows/ai-response': aiResponseFlow,
      '@/services/twitch': twitchService,
      '@/services/discord': discordService,
      '@/services/storage': storageService,
      '@/services/points': pointsService,
      '@/lib/username-matcher': usernameMatcher,
      // Add any other modules you want to be accessible
    };
    
    const sandbox = {
        console: {
            log: (...args: any[]) => {
                // The global console.log is already broadcasting,
                // so we just call it directly.
                console.log(...args);
            },
            error: (...args: any[]) => {
                // The global console.error is already broadcasting.
                console.error(...args);
            },
            warn: (...args: any[]) => capturedOutput.push(['WARN:', ...args]),
        },
        require: (path: string) => {
            if (path in requireableModules) {
                return requireableModules[path as keyof typeof requireableModules];
            }
            throw new Error(`Module not found: Cannot find module '${path}'. Only whitelisted modules are available.`);
        },
        process: {
            env: process.env // Expose environment variables
        },
        // The broadcast function is injected from the global scope of server.ts
        broadcast: (global as any).broadcast,
        // Async timers
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        // HTTP requests
        fetch: global.fetch || require('node-fetch'),
        // Add any other globals you want to expose
        args: [], // Placeholder for command arguments
        tags: {}, // Placeholder for Twitch message tags
        global: {
            botPersonality: (global as any).botPersonality,
            botVoice: (global as any).botVoice
        }
    };
    
    const context = createContext(sandbox);

    try {
        // Wrap the user's code in an async IIFE (Immediately Invoked Function Expression)
        // to allow top-level await and return values.
        const codeToRun = `
            (async () => {
                try {
                    ${input.code}
                } catch(e) {
                    // Catch errors inside the sandbox and re-throw to be caught outside.
                    throw e;
                }
            })();
        `;
        
        const result = await runInContext(codeToRun, context, { timeout: 10000 }); // 10 second timeout

        // Combine any returned value with console output
        const finalOutput = {
            returned: result,
            console: capturedOutput,
        };

        // Ensure the output is serializable
        const output = JSON.parse(JSON.stringify(finalOutput ?? null));

        return { output };
    } catch (error: any) {
      console.error("[runCode Flow] Error executing user code:", error);
      const errorOutput = {
        message: error.message || String(error),
        stack: error.stack,
        console: capturedOutput
      }
      // Return a structured error that the calling function can use.
      return { error: JSON.stringify(errorOutput, null, 2) };
    }
  }
);

// Flow object not exported - 'use server' restriction

export async function runCode(input: RunCodeInput): Promise<RunCodeOutput> {
    let capturedOutput: any[] = [];
    
    // Define the modules that can be 'required' inside the sandbox.
    const requireableModules = {
      'zod': z,
      '@/ai/flows/chat-with-athena': athenaFlow,
      '@/ai/flows/conversational-response': { conversationalResponse, conversationalResponseFlow },
      '@/ai/flows/text-to-speech': textToSpeechFlow,
      '@/ai/flows/send-twitch-message': sendTwitchMessageFlow,
      '@/ai/flows/send-discord-message': sendDiscordMessageFlow,
      '@/ai/flows/ai-response': aiResponseFlow,
      '@/services/twitch': twitchService,
      '@/services/discord': discordService,
      '@/services/storage': storageService,
      '@/services/points': pointsService,
      '@/lib/username-matcher': usernameMatcher,
    };
    
    const sandbox = {
        console: {
            log: (...args: any[]) => {
                console.log(...args);
            },
            error: (...args: any[]) => {
                console.error(...args);
            },
            warn: (...args: any[]) => capturedOutput.push(['WARN:', ...args]),
        },
        require: (path: string) => {
            if (path in requireableModules) {
                return requireableModules[path as keyof typeof requireableModules];
            }
            throw new Error(`Module not found: Cannot find module '${path}'. Only whitelisted modules are available.`);
        },
        process: {
            env: process.env
        },
        broadcast: (global as any).broadcast,
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        fetch: global.fetch || require('node-fetch'),
        args: [],
        tags: {},
        global: {
            botPersonality: (global as any).botPersonality,
            botVoice: (global as any).botVoice
        }
    };
    
    const context = createContext(sandbox);

    try {
        const codeToRun = `
            (async () => {
                try {
                    ${input.code}
                } catch(e) {
                    throw e;
                }
            })();
        `;
        
        const result = await runInContext(codeToRun, context, { timeout: 10000 });

        const finalOutput = {
            returned: result,
            console: capturedOutput,
        };

        const output = JSON.parse(JSON.stringify(finalOutput ?? null));

        return { output };
    } catch (error: any) {
      console.error("[runCode] Error executing user code:", error);
      const errorOutput = {
        message: error.message || String(error),
        stack: error.stack,
        console: capturedOutput
      }
      return { error: JSON.stringify(errorOutput, null, 2) };
    }
}
