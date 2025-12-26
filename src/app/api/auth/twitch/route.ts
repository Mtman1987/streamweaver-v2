import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  
  if (!clientId) {
    return NextResponse.json({
      error: 'Twitch client ID not configured'
    }, { status: 500 });
  }

  // Construct the Twitch OAuth URL
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3100'}/auth/twitch/callback`;
  const scope = [
    'chat:read',
    'chat:edit',
    'moderator:read:chatters',
    'channel:manage:broadcast',
    'moderator:manage:announcements',
    'channel:read:redemptions',
    'user:write:chat'
  ].join(' ');

  const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', 'broadcaster');

  return NextResponse.redirect(authUrl.toString());
}
