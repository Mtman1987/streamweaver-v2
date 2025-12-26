/**
 * Voice Command Processing Service
 * Based on Smart_Voice_Commands.cs patterns
 * Handles voice-activated commands with AI-powered username matching
 */

import { generate } from '@genkit-ai/ai';
import { gemini20FlashExp } from '@genkit-ai/googleai';

interface VoiceCommandResult {
  success: boolean;
  action?: string;
  targetUser?: string;
  message?: string;
}

interface ActiveChatter {
  login: string;
  displayName?: string;
}

export class VoiceCommandService {
  private activeChatters: Map<string, ActiveChatter> = new Map();

  /**
   * Update the list of active chatters (called when users chat)
   */
  addActiveChatter(login: string, displayName?: string): void {
    this.activeChatters.set(login.toLowerCase(), { login, displayName });
  }

  /**
   * Get list of active chatters
   */
  getActiveChatters(): ActiveChatter[] {
    return Array.from(this.activeChatters.values());
  }

  /**
   * Clear chatters that haven't been active (call periodically)
   */
  clearInactiveChatters(): void {
    this.activeChatters.clear();
  }

  /**
   * Process voice command transcription
   */
  async processVoiceCommand(transcription: string): Promise<VoiceCommandResult> {
    const lowerTranscription = transcription.toLowerCase();

    // Check for shoutout command
    if (lowerTranscription.includes('shout out') || lowerTranscription.includes('shoutout')) {
      return await this.processShoutoutCommand(transcription);
    }

    // Check for Athena command
    if (lowerTranscription.startsWith('athena')) {
      return {
        success: true,
        action: 'ai-conversation',
        message: transcription.replace(/^athena\s*/i, '')
      };
    }

    return {
      success: false,
      message: 'Unknown voice command'
    };
  }

  /**
   * Process shoutout command with AI username matching
   */
  private async processShoutoutCommand(transcription: string): Promise<VoiceCommandResult> {
    try {
      const chatters = this.getActiveChatters();

      if (chatters.length === 0) {
        return {
          success: false,
          message: 'No active chatters found for shoutout'
        };
      }

      // Create chatter list for AI
      const chatterList = chatters.map(c => c.login).join(', ');

      // Ask AI to identify the intended user
      const aiPrompt = `The user said: "${transcription}"

Active chatters in chat: ${chatterList}

Based on the voice command, which username from the active chatters list did they want to shout out? 
Consider partial matches, nicknames, and phonetic similarities.

Respond with ONLY the exact username from the list, or 'NONE' if unclear.`;

      const targetUser = await this.getAIUsernameMatch(aiPrompt);

      // Validate AI picked a real user
      if (targetUser && targetUser !== 'NONE') {
        const matchedChatter = chatters.find(
          c => c.login.toLowerCase() === targetUser.toLowerCase()
        );

        if (matchedChatter) {
          return {
            success: true,
            action: 'shoutout',
            targetUser: matchedChatter.login,
            message: `Voice shoutout executed for: ${matchedChatter.login}`
          };
        }
      }

      // Fallback - unclear match
      return {
        success: false,
        message: `🎤 I heard a shoutout request but couldn't identify the user. Active chatters: ${chatterList}`
      };

    } catch (error) {
      console.error('Shoutout command processing failed:', error);
      return {
        success: false,
        message: 'Failed to process shoutout command'
      };
    }
  }

  /**
   * Use AI to match username from voice transcription
   */
  private async getAIUsernameMatch(prompt: string): Promise<string | null> {
    try {
      const { text } = await generate({
        model: gemini20FlashExp,
        prompt,
        config: {
          temperature: 0.1, // Low temperature for consistent matching
          maxOutputTokens: 50
        }
      });

      return text()?.trim() || null;
    } catch (error) {
      console.error('AI username matching failed:', error);
      return null;
    }
  }

  /**
   * Execute the matched action (call appropriate action based on result)
   */
  async executeVoiceAction(result: VoiceCommandResult, sendMessage: (msg: string) => void): Promise<void> {
    if (!result.success) {
      if (result.message) {
        sendMessage(result.message);
      }
      return;
    }

    switch (result.action) {
      case 'shoutout':
        if (result.targetUser) {
          // This would trigger the shoutout action in the automation system
          console.log(`Executing shoutout for: ${result.targetUser}`);
          // In real implementation, call: automationEngine.runAction('Shoutout Action', { targetUser: result.targetUser })
        }
        break;

      case 'ai-conversation':
        // Handle AI conversation
        console.log('Processing AI conversation:', result.message);
        break;

      default:
        console.log('Unknown action:', result.action);
    }
  }
}

// Singleton instance
export const voiceCommandService = new VoiceCommandService();
