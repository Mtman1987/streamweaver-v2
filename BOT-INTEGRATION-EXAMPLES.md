# Bot Integration Examples

## Discord.js Example

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const API_BASE = 'https://your-app-domain.com';
const BOT_SECRET = '1234';

const headers = {
  'Authorization': `Bearer ${BOT_SECRET}`,
  'Content-Type': 'application/json'
};

// Command: !rank @user
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!rank')) {
    const mention = message.mentions.users.first();
    if (!mention) return message.reply('Please mention a user!');
    
    try {
      const response = await axios.post(`${API_BASE}/api/points/user-rank`, {
        userId: mention.id,
        username: mention.username
      }, { headers });
      
      message.reply(response.data.message);
    } catch (error) {
      message.reply('Error fetching rank!');
    }
  }
});

// Command: !addpoints @user 100
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!addpoints') && message.member.permissions.has('ADMINISTRATOR')) {
    const args = message.content.split(' ');
    const mention = message.mentions.users.first();
    const points = parseInt(args[2]);
    
    if (!mention || !points) return message.reply('Usage: !addpoints @user amount');
    
    try {
      const response = await axios.post(`${API_BASE}/api/points/add`, {
        userId: mention.id,
        username: mention.username,
        displayName: mention.displayName || mention.username,
        points: points
      }, { headers });
      
      message.reply(response.data.message);
    } catch (error) {
      message.reply('Error adding points!');
    }
  }
});

// Command: !leaderboard
client.on('messageCreate', async (message) => {
  if (message.content === '!leaderboard') {
    try {
      const response = await axios.get(`${API_BASE}/api/points/leaderboard-image`, {
        headers,
        responseType: 'arraybuffer'
      });
      
      const attachment = new AttachmentBuilder(response.data, { name: 'leaderboard.png' });
      message.reply({ files: [attachment] });
    } catch (error) {
      message.reply('Error generating leaderboard!');
    }
  }
});

// Command: !shoutout username
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!shoutout')) {
    const username = message.content.split(' ')[1];
    if (!username) return message.reply('Please provide a username!');
    
    try {
      const response = await axios.post(`${API_BASE}/api/shoutouts/generate`, {
        username: username,
        type: 'regular'
      }, { headers });
      
      message.reply(response.data.shoutout);
    } catch (error) {
      message.reply('Error generating shoutout!');
    }
  }
});

// Command: !raidtrain
client.on('messageCreate', async (message) => {
  if (message.content === '!raidtrain') {
    try {
      const response = await axios.post(`${API_BASE}/api/shoutouts/raid-train`, {}, { headers });
      message.reply(response.data.shoutout);
    } catch (error) {
      message.reply('Error generating raid train shoutout!');
    }
  }
});

// Track Discord messages
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  try {
    await axios.post(`${API_BASE}/api/community/track`, {
      userId: message.author.id,
      username: message.author.username,
      displayName: message.author.displayName || message.author.username,
      platform: 'discord',
      activityType: 'message'
    }, { headers });
  } catch (error) {
    console.error('Error tracking Discord message:', error);
  }
});

// Track helpful reactions (when someone reacts with ✅ or ❤️)
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  if (!['✅', '❤️', '👍', '🔥'].includes(reaction.emoji.name)) return;
  
  try {
    // Award points to the person who got the helpful reaction
    await axios.post(`${API_BASE}/api/community/track`, {
      userId: reaction.message.author.id,
      username: reaction.message.author.username,
      displayName: reaction.message.author.displayName || reaction.message.author.username,
      platform: 'discord',
      activityType: 'help_reaction',
      metadata: { 
        reactorId: user.id,
        emoji: reaction.emoji.name,
        messageId: reaction.message.id
      }
    }, { headers });
    
    // Also award points to the person giving the reaction
    await axios.post(`${API_BASE}/api/community/track`, {
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      platform: 'discord',
      activityType: 'reaction'
    }, { headers });
  } catch (error) {
    console.error('Error tracking helpful reaction:', error);
  }
});

// Track voice chat participation
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (newState.member.user.bot) return;
  
  // User joined voice channel
  if (!oldState.channel && newState.channel) {
    // Start tracking voice time (you'd need to implement a timer system)
    console.log(`${newState.member.user.username} joined voice chat`);
  }
  
  // User left voice channel
  if (oldState.channel && !newState.channel) {
    // Calculate time spent and award points
    // This is a simplified example - you'd need proper time tracking
    const minutesSpent = 30; // Example: 30 minutes
    
    try {
      await axios.post(`${API_BASE}/api/community/track`, {
        userId: oldState.member.user.id,
        username: oldState.member.user.username,
        displayName: oldState.member.displayName || oldState.member.user.username,
        platform: 'discord',
        activityType: 'voice_minute',
        metadata: { minutes: minutesSpent }
      }, { headers });
    } catch (error) {
      console.error('Error tracking voice time:', error);
    }
  }
});

// Command to manually award community help points
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!helpaward') && message.member.permissions.has('MANAGE_MESSAGES')) {
    const mention = message.mentions.users.first();
    if (!mention) return message.reply('Please mention a user!');
    
    try {
      await axios.post(`${API_BASE}/api/community/track`, {
        userId: mention.id,
        username: mention.username,
        displayName: mention.displayName || mention.username,
        platform: 'discord',
        activityType: 'community_help',
        metadata: { awardedBy: message.author.id }
      }, { headers });
      
      message.reply(`🌟 Awarded community help points to ${mention.displayName || mention.username}!`);
    } catch (error) {
      message.reply('Error awarding points!');
    }
  }
});

client.login('YOUR_BOT_TOKEN');
```

## Python Example

```python
import discord
import aiohttp
import asyncio
from discord.ext import commands

bot = commands.Bot(command_prefix='!', intents=discord.Intents.all())

API_BASE = 'https://your-app-domain.com'
BOT_SECRET = '1234'
HEADERS = {
    'Authorization': f'Bearer {BOT_SECRET}',
    'Content-Type': 'application/json'
}

@bot.command()
async def rank(ctx, member: discord.Member = None):
    if not member:
        await ctx.reply("Please mention a user!")
        return
    
    async with aiohttp.ClientSession() as session:
        async with session.post(f'{API_BASE}/api/points/user-rank', 
                               json={'userId': str(member.id), 'username': member.name},
                               headers=HEADERS) as resp:
            data = await resp.json()
            await ctx.reply(data['message'])

@bot.command()
@commands.has_permissions(administrator=True)
async def addpoints(ctx, member: discord.Member, points: int):
    async with aiohttp.ClientSession() as session:
        async with session.post(f'{API_BASE}/api/points/add',
                               json={
                                   'userId': str(member.id),
                                   'username': member.name,
                                   'displayName': member.display_name,
                                   'points': points
                               },
                               headers=HEADERS) as resp:
            data = await resp.json()
            await ctx.reply(data['message'])

@bot.command()
async def leaderboard(ctx):
    async with aiohttp.ClientSession() as session:
        async with session.get(f'{API_BASE}/api/points/leaderboard-image',
                              headers=HEADERS) as resp:
            if resp.status == 200:
                image_data = await resp.read()
                file = discord.File(io.BytesIO(image_data), filename='leaderboard.png')
                await ctx.reply(file=file)

bot.run('YOUR_BOT_TOKEN')
```

## Twitch Chat Integration

```javascript
const tmi = require('tmi.js');
const axios = require('axios');

const client = new tmi.Client({
  options: { debug: true },
  connection: {
    reconnect: true,
    secure: true
  },
  identity: {
    username: 'your_bot_username',
    password: 'oauth:your_oauth_token'
  },
  channels: ['your_channel']
});

client.connect();

// Log all chat messages
client.on('message', async (channel, tags, message, self) => {
  if (self) return;
  
  try {
    await axios.post(`${API_BASE}/api/chat/log`, {
      username: tags.username,
      message: message,
      timestamp: new Date().toISOString(),
      platform: 'twitch',
      userId: tags['user-id'],
      badges: Object.keys(tags.badges || {}),
      color: tags.color
    }, { headers });
  } catch (error) {
    console.error('Error logging chat:', error);
  }
});

// Command: !rank
client.on('message', async (channel, tags, message, self) => {
  if (message.toLowerCase() === '!rank') {
    try {
      const response = await axios.post(`${API_BASE}/api/points/user-rank`, {
        userId: tags['user-id'],
        username: tags.username
      }, { headers });
      
      client.say(channel, response.data.message);
    } catch (error) {
      client.say(channel, 'Error fetching rank!');
    }
  }
});

// Track all chat messages for points
client.on('message', async (channel, tags, message, self) => {
  if (self) return;
  
  // Award points for chatting
  try {
    await axios.post(`${API_BASE}/api/community/track`, {
      userId: tags['user-id'],
      username: tags.username,
      displayName: tags['display-name'],
      platform: 'twitch',
      activityType: 'message'
    }, { headers });
  } catch (error) {
    console.error('Error tracking message:', error);
  }
});

// Track follows
client.on('follow', async (channel, username, methods) => {
  try {
    await axios.post(`${API_BASE}/api/community/track`, {
      userId: methods.userId,
      username: username,
      displayName: username,
      platform: 'twitch',
      activityType: 'follow'
    }, { headers });
    
    client.say(channel, `Welcome to the Space Mountain crew, ${username}! 🚀`);
  } catch (error) {
    console.error('Error tracking follow:', error);
  }
});

// Track subscriptions
client.on('subscription', async (channel, username, methods, message, userstate) => {
  try {
    await axios.post(`${API_BASE}/api/community/track`, {
      userId: userstate['user-id'],
      username: username,
      displayName: userstate['display-name'],
      platform: 'twitch',
      activityType: 'subscription'
    }, { headers });
  } catch (error) {
    console.error('Error tracking subscription:', error);
  }
});

// Track bits
client.on('cheer', async (channel, userstate, message) => {
  try {
    await axios.post(`${API_BASE}/api/community/track`, {
      userId: userstate['user-id'],
      username: userstate.username,
      displayName: userstate['display-name'],
      platform: 'twitch',
      activityType: 'bits',
      metadata: { amount: userstate.bits }
    }, { headers });
  } catch (error) {
    console.error('Error tracking bits:', error);
  }
});

// Track raids
client.on('raided', async (channel, username, viewers) => {
  try {
    await axios.post(`${API_BASE}/api/community/track`, {
      userId: username, // Note: May need to get actual user ID
      username: username,
      displayName: username,
      platform: 'twitch',
      activityType: 'raid',
      metadata: { viewers: viewers }
    }, { headers });
  } catch (error) {
    console.error('Error tracking raid:', error);
  }
});
```

## Webhook Integration

```javascript
// Express.js webhook receiver
const express = require('express');
const app = express();

app.use(express.json());

// Receive points from external system
app.post('/webhook/points', async (req, res) => {
  const { userId, username, displayName, points, reason } = req.body;
  
  try {
    await axios.post(`${API_BASE}/api/points/add`, {
      userId,
      username,
      displayName,
      points
    }, { headers });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add points' });
  }
});

app.listen(3000);
```

## Raid Pile Integration

```javascript
// Discord.js Raid Pile Commands

// Command: !joinpile
client.on('messageCreate', async (message) => {
  if (message.content === '!joinpile') {
    try {
      const response = await axios.post(`${API_BASE}/api/raid-pile/join`, {
        userId: message.author.id,
        username: message.author.username,
        displayName: message.author.displayName || message.author.username
      }, { headers });
      
      message.reply(response.data.message);
    } catch (error) {
      message.reply('Error joining raid pile!');
    }
  }
});

// Command: !leavepile
client.on('messageCreate', async (message) => {
  if (message.content === '!leavepile') {
    try {
      const response = await axios.post(`${API_BASE}/api/raid-pile/leave`, {
        userId: message.author.id,
        username: message.author.username,
        displayName: message.author.displayName || message.author.username
      }, { headers });
      
      message.reply(response.data.message);
    } catch (error) {
      message.reply('Error leaving raid pile!');
    }
  }
});

// Command: !nexttarget (for streamers ending their stream)
client.on('messageCreate', async (message) => {
  if (message.content === '!nexttarget') {
    try {
      const response = await axios.post(`${API_BASE}/api/raid-pile/next-target`, {
        userId: message.author.id,
        username: message.author.username,
        displayName: message.author.displayName || message.author.username
      }, { headers });
      
      message.reply(response.data.data.content);
    } catch (error) {
      message.reply('Error getting next raid target!');
    }
  }
});

// Twitch Chat Integration for Raid Pile

// Command: !joinpile
client.on('message', async (channel, tags, message, self) => {
  if (message.toLowerCase() === '!joinpile') {
    try {
      const response = await axios.post(`${API_BASE}/api/raid-pile/join`, {
        userId: tags['user-id'],
        username: tags.username,
        displayName: tags['display-name'] || tags.username
      }, { headers });
      
      client.say(channel, response.data.message);
    } catch (error) {
      client.say(channel, 'Error joining raid pile!');
    }
  }
});

// Command: !raidnext (for streamers)
client.on('message', async (channel, tags, message, self) => {
  if (message.toLowerCase() === '!raidnext' && tags.badges?.broadcaster) {
    try {
      const response = await axios.post(`${API_BASE}/api/raid-pile/next-target`, {
        userId: tags['user-id'],
        username: tags.username,
        displayName: tags['display-name'] || tags.username
      }, { headers });
      
      client.say(channel, response.data.data.content);
    } catch (error) {
      client.say(channel, 'Error getting next raid target!');
    }
  }
});

// Auto-update viewer counts for pile members
setInterval(async () => {
  try {
    // Get current pile status
    const pilesResponse = await axios.get(`${API_BASE}/api/raid-pile/status`, { headers });
    const piles = pilesResponse.data;
    
    // Update viewer counts for all live members
    for (const pile of piles) {
      for (const member of pile.members) {
        if (member.isLive) {
          // Get current viewer count from Twitch API
          const twitchResponse = await axios.get(`https://api.twitch.tv/helix/streams?user_id=${member.userId}`, {
            headers: {
              'Client-ID': TWITCH_CLIENT_ID,
              'Authorization': `Bearer ${TWITCH_ACCESS_TOKEN}`
            }
          });
          
          const streamData = twitchResponse.data.data[0];
          const viewers = streamData ? streamData.viewer_count : 0;
          const isLive = !!streamData;
          
          // Update in raid pile system
          await axios.post(`${API_BASE}/api/raid-pile/update-viewers`, {
            userId: member.userId,
            viewers: viewers,
            isLive: isLive
          }, { headers });
        }
      }
    }
  } catch (error) {
    console.error('Error updating viewer counts:', error);
  }
}, 5 * 60 * 1000); // Update every 5 minutes
```

// Update raid pile channel every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  try {
    await axios.post(`${API_BASE}/api/raid-pile/channel`, {
      channelId: 'YOUR_RAID_PILE_CHANNEL_ID'
    }, { headers });
    
    console.log('Raid pile channel updated');
  } catch (error) {
    console.error('Error updating raid pile channel:', error);
  }
});
```

## Scheduled Tasks

```javascript
const cron = require('node-cron');

// Update raid train channel every hour
cron.schedule('0 * * * *', async () => {
  try {
    await axios.post(`${API_BASE}/api/discord/raid-train-channel`, {
      channelId: 'YOUR_CHANNEL_ID',
      date: new Date().toISOString().split('T')[0]
    }, { headers });
    
    console.log('Raid train channel updated');
  } catch (error) {
    console.error('Error updating raid train channel:', error);
  }
});

// Generate daily leaderboard at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const response = await axios.get(`${API_BASE}/api/points/leaderboard-image`, {
      headers,
      responseType: 'arraybuffer'
    });
    
    // Post to Discord channel
    const channel = client.channels.cache.get('LEADERBOARD_CHANNEL_ID');
    const attachment = new AttachmentBuilder(response.data, { name: 'daily-leaderboard.png' });
    await channel.send({ content: '🏆 Daily Leaderboard Update!', files: [attachment] });
  } catch (error) {
    console.error('Error posting daily leaderboard:', error);
  }
});
```