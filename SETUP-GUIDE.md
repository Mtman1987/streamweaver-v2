# StreamWeave Setup Guide

## Quick Setup Steps

### 1. Environment Configuration
Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

**Required Variables:**
- `TWITCH_CLIENT_ID` - Your Twitch app client ID
- `TWITCH_CLIENT_SECRET` - Your Twitch app client secret  
- `NEXT_PUBLIC_HARDCODED_ADMIN_TWITCH_ID` - Your Twitch user ID
- `NEXT_PUBLIC_TWITCH_CLIENT_ID` - Same as TWITCH_CLIENT_ID (for frontend)
- `NEXT_PUBLIC_TWITCH_CLIENT_SECRET` - Same as TWITCH_CLIENT_SECRET (for frontend)

### 2. Twitch App Setup
1. Go to https://dev.twitch.tv/console/apps
2. Create a new application
3. Set OAuth Redirect URL to: `http://localhost:3100/auth/callback/twitch`
4. Copy Client ID and Client Secret to your `.env` file

### 3. Get Your Twitch User ID
Visit: `https://www.streamweasels.com/twitch-tools/convert-twitch-username-to-user-id/`

### 4. Initial Token Setup
1. Run `npm run dev` 
2. Visit `http://localhost:3100/auth/signin`
3. Sign in with Twitch (both broadcaster and bot accounts)
4. Tokens will be saved to `tokens/twitch-tokens.json`

### 5. Discord Integration (Optional)
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `NEXT_PUBLIC_DISCORD_LOG_CHANNEL_ID` - Channel ID for chat logs
- `NEXT_PUBLIC_DISCORD_SHOUTOUT_CHANNEL_ID` - Channel ID for shoutouts

## Common Issues

### "No stored tokens found"
- Make sure you've completed the auth flow at `/auth/signin`
- Check that `tokens/twitch-tokens.json` exists and has valid tokens

### "Authentication failed" 
- Your Twitch tokens may need the `user:write:chat` scope
- Re-authenticate at `/auth/signin`

### WebSocket connection errors
- Make sure port 8090 is available
- Check firewall settings

## Testing
1. Start the app: `npm run dev`
2. Open chat client at `http://localhost:3100/dashboard`
3. Send a test message
4. Try commands like `!test` (if configured)

## Features
- ✅ Twitch chat integration
- ✅ Custom commands with flows
- ✅ Discord logging
- ✅ Real-time dashboard
- ✅ Bot personality settings
- ✅ Stream metrics tracking