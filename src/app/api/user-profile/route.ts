import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const profile: any = {};
    
    // Read tokens from file
    const tokensFile = path.join(process.cwd(), 'tokens', 'twitch-tokens.json');
    let tokens = null;
    
    try {
      const tokensData = await fs.readFile(tokensFile, 'utf-8');
      tokens = JSON.parse(tokensData);
    } catch (error) {
      return NextResponse.json({ error: 'No authentication tokens found' }, { status: 401 });
    }

    // Fetch Twitch profile using stored token
    if (tokens.broadcasterToken) {
      const twitchResponse = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID!,
          'Authorization': `Bearer ${tokens.broadcasterToken}`
        }
      });

      if (twitchResponse.ok) {
        const twitchData = await twitchResponse.json();
        if (twitchData.data && twitchData.data.length > 0) {
          const user = twitchData.data[0];
          profile.twitch = {
            name: user.display_name,
            avatar: user.profile_image_url
          };
        }
      }
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}