import { NextRequest, NextResponse } from 'next/server';
import { getStoredTokens, ensureValidToken } from '@/lib/token-utils.server';
import { readUserConfig } from '@/lib/user-config';
import { getTwitchUser } from '@/services/twitch';

export async function GET(request: NextRequest) {
  try {
    const userConfig = await readUserConfig();

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    let broadcasterId =
      userConfig.NEXT_PUBLIC_HARDCODED_ADMIN_TWITCH_ID ||
      process.env.NEXT_PUBLIC_HARDCODED_ADMIN_TWITCH_ID ||
      userConfig.TWITCH_BROADCASTER_ID ||
      process.env.TWITCH_BROADCASTER_ID;

    if (!broadcasterId) {
      const username = userConfig.TWITCH_BROADCASTER_USERNAME || process.env.TWITCH_BROADCASTER_USERNAME;
      if (username) {
        const twitchUser = await getTwitchUser(username, 'login');
        broadcasterId = twitchUser?.id;
      }
    }

    if (!clientId || !clientSecret || !broadcasterId) {
      return NextResponse.json({ error: 'Twitch configuration missing' }, { status: 500 });
    }

    const storedTokens = await getStoredTokens();
    if (!storedTokens) {
      return NextResponse.json({ error: 'No stored tokens found' }, { status: 500 });
    }

    // Ensure we have a valid broadcaster token with the right scopes
    const broadcasterToken = await ensureValidToken(clientId, clientSecret, 'broadcaster', storedTokens);
    if (!broadcasterToken) {
      return NextResponse.json({ error: 'Broadcaster token not found' }, { status: 500 });
    }

    const url = `https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}`;

    console.log('[Chatters API] Fetching from:', url);
    console.log('[Chatters API] Using broadcaster ID:', broadcasterId);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${broadcasterToken.replace('oauth:', '')}`,
        'Client-ID': clientId,
      },
    });

    console.log('[Chatters API] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[Chatters API] Twitch API error:', response.status, errorText);

      return NextResponse.json(
        {
          error: 'Twitch API request failed',
          status: response.status,
          details: errorText,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    console.log('[Chatters API] Success, found', data.data?.length || 0, 'chatters');
    return NextResponse.json({ chatters: data.data || [] });

  } catch (error) {
    console.error('[Chatters API] Error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch chatters', details: String((error as any)?.message || error) },
      { status: 500 }
    );
  }
}