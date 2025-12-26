import { redirect } from 'next/navigation';
import { readUserConfig } from '@/lib/user-config';
import { getStoredTokens } from '@/lib/token-utils.server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const cfg = await readUserConfig();
  const tokens = await getStoredTokens();

  const hasTwitchAuth = Boolean(
    tokens?.broadcasterToken ||
      tokens?.broadcasterRefreshToken ||
      tokens?.botToken ||
      tokens?.botRefreshToken
  );

  if (!hasTwitchAuth) {
    redirect('/login');
  }

  const isConfigured = Boolean(cfg.TWITCH_BROADCASTER_USERNAME);
  redirect(isConfigured ? '/bot-functions' : '/setup');
}
