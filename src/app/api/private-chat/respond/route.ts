import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  appendPrivateChatMessages,
  readPrivateChatMessages,
  type PrivateChatMessage,
} from '@/lib/private-chat-store';

type RequestBody = {
  username: string;
  message: string;
  personality?: string;
  historyLimit?: number;
};

function formatHistory(messages: PrivateChatMessage[]): string {
  if (messages.length === 0) return '';

  const lines = messages.map((m) => {
    const role = m.type === 'ai' ? 'Athena' : m.username || 'User';
    return `${role}: ${m.message}`;
  });

  return `Conversation so far:\n${lines.join('\n')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<RequestBody>;

    const username = (body.username || '').trim();
    const message = (body.message || '').trim();
    const personality = body.personality;
    const historyLimit = Number.isFinite(body.historyLimit)
      ? Math.max(0, Math.min(100, body.historyLimit as number))
      : 20;

    if (!username || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: username, message' },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Server missing API key. Set GEMINI_API_KEY (or GOOGLE_GENAI_API_KEY).',
        },
        { status: 500 }
      );
    }

    const history = await readPrivateChatMessages(historyLimit);

    const systemPrompt = personality
      ? `You are an AI assistant with the following personality:\n${personality}`
      : 'You are a helpful AI assistant for a streamer. Your name is Athena.';

    const historyText = formatHistory(history);

    const promptParts = [
      systemPrompt,
      'You are having a private conversation. Respond naturally and conversationally.',
      historyText,
      `Latest message from ${username}: ${message}`,
      'Respond as Athena:',
    ].filter(Boolean);

    const prompt = promptParts.join('\n\n');

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName =
      process.env.GEMINI_MODEL ||
      process.env.GOOGLE_GENAI_MODEL ||
      'gemini-2.0-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    const userEntry: PrivateChatMessage = {
      type: 'user',
      username,
      message,
      timestamp: new Date().toISOString(),
    };

    // Save the user message first so the log is complete even if the model fails.
    await appendPrivateChatMessages([userEntry]);

    const result = await model.generateContent(prompt);
    const responseText = result.response.text()?.trim() || '';

    if (!responseText) {
      return NextResponse.json(
        { error: 'AI returned an empty response' },
        { status: 502 }
      );
    }

    const aiEntry: PrivateChatMessage = {
      type: 'ai',
      username: 'Athena',
      message: responseText,
      timestamp: new Date().toISOString(),
    };

    await appendPrivateChatMessages([aiEntry]);

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error('Private chat respond API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate private chat response' },
      { status: 500 }
    );
  }
}
