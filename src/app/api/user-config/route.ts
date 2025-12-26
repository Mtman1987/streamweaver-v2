import { NextRequest, NextResponse } from 'next/server';
import { isUserConfigComplete, readUserConfig, writeUserConfig } from '@/lib/user-config';

export const dynamic = 'force-dynamic';

const ALLOWED_KEYS = new Set([
  // Twitch (user-specific)
  'TWITCH_BROADCASTER_USERNAME',
  'TWITCH_BROADCASTER_ID',
  'NEXT_PUBLIC_TWITCH_BROADCASTER_USERNAME',
  'NEXT_PUBLIC_HARDCODED_ADMIN_TWITCH_ID',

  // Discord (user-specific)
  'NEXT_PUBLIC_DISCORD_LOG_CHANNEL_ID',
  'NEXT_PUBLIC_DISCORD_AI_CHAT_CHANNEL_ID',
  'NEXT_PUBLIC_DISCORD_SHOUTOUT_CHANNEL_ID',
  'NEXT_PUBLIC_DISCORD_SHARE_CHANNEL_ID',
  'NEXT_PUBLIC_DISCORD_METRICS_CHANNEL_ID',
  'DISCORD_RAID_TRAIN_CHANNEL_ID',

  // Raid train tuning (user-specific)
  'EMERGENCY_SLOTS_LOOKAHEAD_HOURS',
  'RAID_TRAIN_SLOT_COST',
  'EMERGENCY_SLOT_COST',
]);

export async function GET() {
  const config = await readUserConfig();
  const complete = await isUserConfigComplete();
  return NextResponse.json({ config, complete });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    patch[key] = value;
  }

  const config = await writeUserConfig(patch);
  const complete = Boolean(config.TWITCH_BROADCASTER_USERNAME);

  return NextResponse.json({ config, complete });
}
