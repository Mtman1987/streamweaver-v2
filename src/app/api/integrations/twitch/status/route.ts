import { NextResponse } from 'next/server';

import { getStoredTokens } from '@/lib/token-utils.server';

export async function GET() {
  const tokens = await getStoredTokens();

  const broadcasterConnected = !!(tokens?.broadcasterToken && tokens?.broadcasterRefreshToken);
  const botConnected = !!(tokens?.botToken && tokens?.botRefreshToken);

  return NextResponse.json({
    broadcasterConnected,
    botConnected,
    broadcasterUsername: tokens?.broadcasterUsername || null,
    botUsername: tokens?.botUsername || null,
    lastUpdated: tokens?.lastUpdated || null,
  });
}
