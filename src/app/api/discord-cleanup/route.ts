import { NextRequest, NextResponse } from 'next/server';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export async function POST(request: NextRequest) {
  if (!DISCORD_BOT_TOKEN) {
    return NextResponse.json({ error: 'Discord bot token not configured' }, { status: 500 });
  }

  try {
    const { action, channelId } = await request.json();

    if (action === 'cleanup') {
      return await cleanupNumberedMessages(channelId);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Discord cleanup error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

async function cleanupNumberedMessages(channelId: string) {
  try {
    let deletedCount = 0;
    let lastMessageId = null;

    while (true) {
      const url = `https://discord.com/api/v10/channels/${channelId}/messages?limit=100${lastMessageId ? `&before=${lastMessageId}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`);
      }

      const messages = await response.json();
      
      if (messages.length === 0) break;

      const numberedMessages = messages.filter((msg: any) => 
        msg.content && /^\d+[\.\s]/.test(msg.content.trim())
      );

      if (numberedMessages.length === 0) {
        lastMessageId = messages[messages.length - 1].id;
        continue;
      }

      for (const message of numberedMessages) {
        try {
          await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${message.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bot ${DISCORD_BOT_TOKEN}`
            }
          });
          deletedCount++;
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          console.error('Failed to delete message:', message.id);
        }
      }

      lastMessageId = messages[messages.length - 1].id;
      if (deletedCount > 1000) break;
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount,
      message: `Deleted ${deletedCount} numbered messages`
    });
  } catch (error) {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}