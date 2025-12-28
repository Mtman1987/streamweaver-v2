import { NextRequest, NextResponse } from 'next/server';
import { getBrokerAuthHeaders, getBrokerBaseUrl, joinBrokerUrl } from '@/lib/broker';

type Body = {
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
};

function getApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY
  );
}

export async function POST(req: NextRequest) {
  try {
    const brokerBaseUrl = getBrokerBaseUrl();

    const apiKey = getApiKey();
    const body = (await req.json()) as Partial<Body>;
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    if (!prompt.trim()) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.8;
    const maxOutputTokens = typeof body.maxOutputTokens === 'number' ? body.maxOutputTokens : 150;

    if (brokerBaseUrl) {
      const upstream = await fetch(joinBrokerUrl(brokerBaseUrl, '/v1/ai/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getBrokerAuthHeaders()),
        },
        body: JSON.stringify({ prompt, temperature, maxOutputTokens }),
      });

      const contentType = upstream.headers.get('content-type') || 'application/json';
      const payload = await upstream.text();
      return new NextResponse(payload, {
        status: upstream.status,
        headers: { 'Content-Type': contentType },
      });
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server missing API key. Set GEMINI_API_KEY (or GOOGLE_GENAI_API_KEY).' },
        { status: 500 }
      );
    }

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens },
        }),
      }
    );

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const details = typeof (data as any)?.error?.message === 'string' ? (data as any).error.message : undefined;
      return NextResponse.json(
        { error: 'Gemini API failed', status: upstream.status, details },
        { status: 502 }
      );
    }

    const text = (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text;
    return NextResponse.json({ text: typeof text === 'string' ? text : '' });
  } catch (error: any) {
    console.error('[ai/generate] Error:', error);
    return NextResponse.json({ error: 'AI generate failed' }, { status: 500 });
  }
}
