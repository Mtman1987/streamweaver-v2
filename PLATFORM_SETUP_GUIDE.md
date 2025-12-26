# 🚀 Multi-Platform Setup Guide

## Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install googleapis pusher-js tiktok-live-connector
```

### 2. Configure YouTube (OAuth)

**Get API Credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **YouTube Data API v3**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs: `http://localhost:3100/api/auth/youtube/callback`
7. Copy **Client ID** and **Client Secret**

**Add to .env:**
```env
YOUTUBE_CLIENT_ID=your_client_id_here
YOUTUBE_CLIENT_SECRET=your_client_secret_here
YOUTUBE_REDIRECT_URI=http://localhost:3100/api/auth/youtube/callback
```

### 3. Connect Platforms in UI

**Start your app:**
```bash
npm run dev
```

**Navigate to:** http://localhost:3100/integrations

**YouTube:**
- Click "Connect via OAuth" next to YouTube
- Sign in with your YouTube account
- Grant permissions for live chat access
- Auto-redirected back - you're connected!

**Kick:**
- Click "Connect" next to Kick
- Enter your Kick channel name (e.g., "yourname")
- Connected! (read-only, no OAuth needed)

**TikTok:**
- Click "Connect" next to TikTok
- Enter your TikTok username (e.g., "@yourname")
- Connected! (read-only, monitors your live streams)

## 🎯 What Each Platform Does

### YouTube Live
- **Reads:** Chat messages, Super Chats, memberships
- **Writes:** Send chat messages, delete messages, ban users
- **OAuth Required:** Yes (Google account)
- **Use Cases:** Respond to chat, moderate, thank Super Chats

### Kick
- **Reads:** Chat messages, subscriptions, follows, gifts
- **Writes:** Requires auth token (not implemented yet)
- **OAuth Required:** No (username only for reading)
- **Use Cases:** Monitor chat, respond to subs/follows

### TikTok Live
- **Reads:** Chat, gifts, follows, shares, likes, viewer count
- **Writes:** Not possible (TikTok has no public API)
- **OAuth Required:** No (username only)
- **Use Cases:** Monitor your TikTok Live, thank gifters

## 📊 Testing Connections

**Check connection status:**
1. Open `/integrations` page
2. Green checkmark = connected
3. Red X = disconnected

**Monitor messages from all platforms:**
```typescript
import { getMultiPlatformManager } from '@/services/multi-platform';

const manager = getMultiPlatformManager();

manager.on('message', (msg) => {
  console.log(`[${msg.platform}] ${msg.displayName}: ${msg.message}`);
});

manager.on('event', (event) => {
  console.log(`[${event.platform}] ${event.type}:`, event.data);
});
```

## 🔧 Server Integration

The multi-platform manager is already integrated in `server.ts`. When you connect platforms via UI, they automatically:
- Start receiving messages
- Forward events to your automations
- Show up in unified chat history
- Trigger actions based on platform events

## 🎨 UI Features

**Integrations Page:**
- Connect/disconnect each platform
- See connection status in real-time
- OAuth flows handled automatically
- Username-based connections with simple prompts

**Connection States:**
- 🟢 **Connected** - Platform is active and receiving events
- 🔴 **Disconnected** - Platform needs to be connected
- ⚙️ **Configured via ENV** - Discord (uses bot token from .env)

## 🚨 Troubleshooting

**YouTube "Invalid redirect URI":**
- Make sure redirect URI in Google Console matches exactly:
  `http://localhost:3100/api/auth/youtube/callback`

**Kick not connecting:**
- Make sure channel name is correct (no @ symbol)
- Check if channel exists on kick.com

**TikTok not finding stream:**
- TikTok username needs @ symbol
- Only works when you're actually live
- Check console for connection errors

**No messages appearing:**
- Check browser console for errors
- Make sure platform is connected (green checkmark)
- For YouTube, make sure you have an active live stream

## 🎯 Next Steps

Once connected, your automations can respond to events from ALL platforms:
- Thank followers on YouTube, Kick, TikTok, and Twitch
- Respond to Super Chats/Gifts across platforms
- Unified chat commands that work everywhere
- Single automation triggers on any platform event
