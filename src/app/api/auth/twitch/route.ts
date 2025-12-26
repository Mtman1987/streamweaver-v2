import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  
  if (!clientId) {
    return NextResponse.json({
      error: 'Twitch client ID not configured'
    }, { status: 500 });
  }

  // Construct the Twitch OAuth URL
  const originFromRequest = new URL(request.url).origin;
  const envOrigin = process.env.NEXTAUTH_URL;
  const preferRequestOrigin = originFromRequest.includes('localhost') || originFromRequest.includes('127.0.0.1');
  const origin = (preferRequestOrigin ? originFromRequest : envOrigin) || originFromRequest || 'http://localhost:3100';
  const redirectUri = `${origin}/auth/twitch/callback`;

  console.log('[twitch-oauth] originFromRequest:', originFromRequest);
  console.log('[twitch-oauth] NEXTAUTH_URL:', envOrigin);
  console.log('[twitch-oauth] chosen origin:', origin);
  console.log('[twitch-oauth] redirectUri:', redirectUri);
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

  console.log('[twitch-oauth] authUrl:', authUrl.toString());

  return NextResponse.redirect(authUrl.toString());
}
