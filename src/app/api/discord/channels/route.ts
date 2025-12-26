import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { resolve } from 'path';

const SETTINGS_FILE = resolve(process.cwd(), 'src', 'data', 'discord-channels.json');

export async function GET() {
  try {
    const data = await readFile(SETTINGS_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({
      logChannelId: process.env.NEXT_PUBLIC_DISCORD_LOG_CHANNEL_ID || '',
      aiChatChannelId: process.env.NEXT_PUBLIC_DISCORD_AI_CHAT_CHANNEL_ID || '',
      shoutoutChannelId: process.env.NEXT_PUBLIC_DISCORD_SHOUTOUT_CHANNEL_ID || ''
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();
    await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}