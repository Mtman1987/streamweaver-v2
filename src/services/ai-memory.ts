/**
 * Two-Tier AI Memory System
 * Based on AI_Memory_System.cs patterns
 * Manages per-user conversation history with recent + condensed old context
 */

import { generate } from '@genkit-ai/ai';
import { gemini20FlashExp } from '@genkit-ai/googleai';
import { db } from '@/lib/firebase-config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface UserMemory {
  recentContext: string; // Last 50 messages
  oldContext: string;    // Condensed historical summaries
  lastUpdated: Date;
}

interface ConversationMessage {
  timestamp: string;
  speaker: string;
  message: string;
}

export class AIMemoryService {
  private static MAX_RECENT_MESSAGES = 50;
  private static MAX_OLD_SUMMARIES = 10;
  private defaultPersonality = 'You are Athena, a helpful AI assistant for a Twitch streamer. You are friendly, knowledgeable, and remember past conversations.';

  /**
   * Process AI conversation with memory context
   */
  async processAIConversation(
    username: string,
    userMessage: string,
    customPersonality?: string
  ): Promise<string> {
    const userKey = username.toLowerCase();

    try {
      // Get both memory tiers
      const memory = await this.getUserMemory(userKey);

      // Add current message to recent context
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const newEntry = `[${timestamp}] ${username}: ${userMessage}`;
      
      let recentContext = memory.recentContext 
        ? `${memory.recentContext}\n${newEntry}`
        : newEntry;

      // Check if recent context needs condensing
      const recentLines = recentContext.split('\n');
      if (recentLines.length >= AIMemoryService.MAX_RECENT_MESSAGES) {
        await this.condenseAndArchive(userKey, recentContext, memory.oldContext);
        recentContext = newEntry; // Start fresh with current message
      }

      // Build full context for AI
      const fullContext = this.buildContextPrompt(
        username,
        memory.oldContext,
        recentContext,
        customPersonality
      );

      // Get AI response
      const aiResponse = await this.getAIResponse(fullContext);

      if (aiResponse) {
        // Add AI response to recent context
        const aiEntry = `[${timestamp}] Athena: ${aiResponse}`;
        recentContext += `\n${aiEntry}`;

        // Save updated recent context
        await this.saveUserMemory(userKey, {
          recentContext,
          oldContext: memory.oldContext,
          lastUpdated: new Date()
        });

        return aiResponse;
      }

      return 'Sorry, I had trouble processing that request.';

    } catch (error) {
      console.error(`AI conversation error for ${username}:`, error);
      return 'Sorry, I encountered an error processing your message.';
    }
  }

  /**
   * Condense recent context and archive to old context
   */
  private async condenseAndArchive(
    userKey: string,
    recentContext: string,
    oldContext: string
  ): Promise<void> {
    try {
      // Use AI to condense recent conversations
      const condensePrompt = `Condense this conversation history into 2-3 sentences capturing the key topics, relationships, and important details that should be remembered long-term. Focus on facts about the person, their interests, ongoing situations, and meaningful context:

${recentContext}

Condensed summary:`;

      const condensedSummary = await this.getAIResponse(condensePrompt);

      if (condensedSummary) {
        // Add to old context with timestamp
        const archiveEntry = `[${new Date().toLocaleDateString()}] ${condensedSummary}`;
        
        const updatedOldContext = oldContext 
          ? `${oldContext}\n${archiveEntry}`
          : archiveEntry;

        // Keep old context reasonable (max 10 summaries)
        const oldLines = updatedOldContext.split('\n');
        const finalOldContext = oldLines.length > AIMemoryService.MAX_OLD_SUMMARIES
          ? oldLines.slice(-AIMemoryService.MAX_OLD_SUMMARIES).join('\n')
          : updatedOldContext;

        // Update old context
        await this.saveUserMemory(userKey, {
          recentContext: '',
          oldContext: finalOldContext,
          lastUpdated: new Date()
        });

        console.log(`Condensed conversation history for ${userKey}`);
      }

    } catch (error) {
      console.error(`Failed to condense context for ${userKey}:`, error);
    }
  }

  /**
   * Build context prompt with personality and memory
   */
  private buildContextPrompt(
    username: string,
    oldContext: string,
    recentContext: string,
    customPersonality?: string
  ): string {
    const personality = customPersonality || this.defaultPersonality;
    
    let contextPrompt = `${personality}\n\n`;

    if (oldContext) {
      contextPrompt += `Long-term memory about ${username}:\n${oldContext}\n\n`;
    }

    if (recentContext) {
      contextPrompt += `Recent conversation with ${username}:\n${recentContext}\n\n`;
    }

    contextPrompt += `Respond to ${username}'s latest message. Reference past conversations naturally when relevant:`;

    return contextPrompt;
  }

  /**
   * Get AI response
   */
  private async getAIResponse(prompt: string): Promise<string | null> {
    try {
      const { text } = await generate({
        model: gemini20FlashExp,
        prompt,
        config: {
          temperature: 0.8,
          maxOutputTokens: 150
        }
      });

      return text()?.trim() || null;

    } catch (error) {
      console.error('AI API error:', error);
      return null;
    }
  }

  /**
   * Get user memory from database
   */
  private async getUserMemory(userKey: string): Promise<UserMemory> {
    try {
      const docRef = doc(db, 'ai_memory', userKey);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          recentContext: data.recentContext || '',
          oldContext: data.oldContext || '',
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        };
      }

      return {
        recentContext: '',
        oldContext: '',
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error(`Error fetching memory for ${userKey}:`, error);
      return {
        recentContext: '',
        oldContext: '',
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Save user memory to database
   */
  private async saveUserMemory(userKey: string, memory: UserMemory): Promise<void> {
    try {
      const docRef = doc(db, 'ai_memory', userKey);
      await setDoc(docRef, {
        recentContext: memory.recentContext,
        oldContext: memory.oldContext,
        lastUpdated: memory.lastUpdated
      });
    } catch (error) {
      console.error(`Error saving memory for ${userKey}:`, error);
    }
  }

  /**
   * Clear user memory (for testing or user request)
   */
  async clearUserMemory(userKey: string): Promise<void> {
    await this.saveUserMemory(userKey, {
      recentContext: '',
      oldContext: '',
      lastUpdated: new Date()
    });
  }

  /**
   * Get memory stats for debugging
   */
  async getMemoryStats(userKey: string): Promise<{ recentMessages: number; oldSummaries: number }> {
    const memory = await this.getUserMemory(userKey);
    return {
      recentMessages: memory.recentContext.split('\n').filter(l => l.trim()).length,
      oldSummaries: memory.oldContext.split('\n').filter(l => l.trim()).length
    };
  }
}

// Singleton instance
export const aiMemoryService = new AIMemoryService();
