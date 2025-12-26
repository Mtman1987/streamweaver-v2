import { NextRequest, NextResponse } from 'next/server';
import { getStoredTokens } from '@/lib/token-utils.server';

export async function POST(request: NextRequest) {
  try {
    const { message, as = 'broadcaster' } = await request.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const broadcasterId = process.env.NEXT_PUBLIC_HARDCODED_ADMIN_TWITCH_ID;

    if (!clientId || !broadcasterId) {
      return NextResponse.json({ error: 'Twitch configuration missing' }, { status: 500 });
    }

    const { ensureValidToken } = await import('@/lib/token-utils.server');
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    
    if (!clientSecret) {
      return NextResponse.json({ error: 'Twitch client secret missing' }, { status: 500 });
    }

    const storedTokens = await getStoredTokens();
    if (!storedTokens) {
      return NextResponse.json({ error: 'No stored tokens found' }, { status: 500 });
    }

    const tokenType = as === 'bot' ? 'bot' : 'broadcaster';
    const token = await ensureValidToken(clientId, clientSecret, tokenType, storedTokens);
    const senderId = as === 'bot' ? "1213513185" : broadcasterId;

    const response = await fetch(`https://api.twitch.tv/helix/chat/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.replace('oauth:', '')}`,
        'Client-ID': clientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        broadcaster_id: broadcasterId,
        sender_id: senderId,
        message: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Twitch API error sending message:", errorText);
      return NextResponse.json({ error: 'Failed to send message to Twitch' }, { status: response.status });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in chat send API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}