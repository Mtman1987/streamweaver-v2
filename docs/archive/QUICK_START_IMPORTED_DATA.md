# Quick Start: Using Imported Streamer.bot Data

## ✅ Import Complete!

Your Streamer.bot data has been successfully imported:
- **165 Actions** ready to use
- **83 Commands** ready to trigger

## Access Your Data

### View Actions
```
http://localhost:3100/actions
```
Or navigate to: Dashboard → Actions

### View Commands
```
http://localhost:3100/commands
```
Or navigate to: Dashboard → Commands

### Import More Data
```
http://localhost:3100/import/streamerbot
```
Or use CLI: `npm run import:streamerbot`

## Command Groups Imported

### 🎮 Chat Actions
- !hug, !cuddle, !highfive, !fistbump
- !tickle, !headpat, !boop, !love
- !dance, !roll, !coinflip, !duel

### 🔗 Social Links
- !discord, !twitter, !youtube
- !tiktok, !instagram, !merch
- !hover (hoverboard link)

### 💰 Currency System (StreamUP)
- !addPoints, !setPoints
- !addToAll, !setToAll, !resetAllPoints
- Full currency management

### ⚔️ Classic Chat Gamble
- !gamble - Test your luck
- !shop - View shop items
- !stealpoints - Take from others
- !trade - Trade with users

### 📊 Stream Info
- !followage - Check follow duration
- !created - Account creation date
- !followers - Follower count
- !leader - Leaderboard positions

### 💀 Death Counter
- !deaths+ - Increment counter
- !deathsset - Set count
- !deathsreset - Reset to zero

### 🛡️ Mod Commands
- !so / !setso - Shoutout streamers
- !setgame - Change game
- !emergency / !emergencyover - Emergency mode

### 🏆 Channel Points
- !championstart - Special redemption

## Action Groups Imported

### 🎯 Menu Mode
Cursor controls and menu overlays for interactive streams

### 🎴 PokemonTCG
Card game integration with trading and logging

### 📈 Leaderboards
Tracking and display systems

### 💬 ChatRD
Multi-platform chat integration (Twitch, YouTube, TikTok, Kick)

### 🤖 Athenabot87
ChatGPT/AI integration for intelligent responses

### 🎲 Classic Chat Gamble
Full casino-style gambling system

### 🎵 TikTok
TikTok event handling and integration

### 💬 Discord
Discord message integration

### ⚡ Kick
Kick.com platform integration

## Quick Actions

### Test a Command
```bash
# Use StreamWeaver's chat interface or test directly
echo "Testing !hello command"
```

### Create New Action
1. Go to Actions page
2. Click "New Action"
3. Choose trigger (Follow, Sub, Command, etc.)
4. Add SubActions (Chat, Sound, OBS, etc.)
5. Save and enable

### Edit Existing Action
1. Find action in list
2. Click to expand
3. Edit triggers or subactions
4. Save changes

### Clone Streamer.bot Action
1. Find imported action
2. Click "Duplicate"
3. Modify as needed
4. Rename and save

## Common Tasks

### Update Sound File Path
```typescript
// In action config
{
  "soundFile": "C:\\Users\\mtman\\Sounds\\welcome.mp3",
  "volume": 0.7
}
```

### Convert C# Code to JavaScript
```csharp
// Streamer.bot C# code:
CPH.SendMessage("Hello, world!");
int random = CPH.Between(1, 100);
```

```javascript
// StreamWeaver JavaScript:
await sendChatMessage("Hello, world!");
const random = Math.floor(Math.random() * 100) + 1;
```

### Add Custom Trigger
```typescript
{
  "type": "Chat Command",
  "config": {
    "command": "!custom",
    "aliases": ["!c", "!cu"],
    "permissions": ["moderator"]
  }
}
```

## Testing Your Setup

### 1. Test Simple Command
- Type `!discord` in chat
- Should see Discord link response

### 2. Test Currency Command
- Type `!gamble 100` in chat
- Should interact with currency system

### 3. Test Action Trigger
- Follow your channel (if testing follows)
- Should trigger welcome action

### 4. Check OBS Integration
- Ensure OBS WebSocket is connected
- Test OBS-related actions

## Troubleshooting

### Commands Not Working
1. Check command is enabled
2. Verify cooldown hasn't expired
3. Check user has required permissions
4. Look at logs for errors

### Actions Not Triggering
1. Verify action is enabled
2. Check trigger configuration
3. Ensure event source is connected (Twitch, OBS, etc.)
4. Review action logs

### File Path Issues
1. Update paths to your system
2. Use absolute paths
3. Check file permissions
4. Verify files exist

### C# Code Errors
1. Convert C# to JavaScript
2. Update API calls to StreamWeaver format
3. Test thoroughly
4. Check console for errors

## Variables & Placeholders

### User Variables
- `{user}` - Username who triggered
- `{targetUser}` - Mentioned username
- `{displayName}` - Display name
- `{userId}` - User ID

### Channel Variables
- `{channel}` - Channel name
- `{game}` - Current game
- `{title}` - Stream title
- `{viewers}` - Current viewers

### Event Variables
- `{amount}` - Bits, subs, or currency amount
- `{tier}` - Subscription tier
- `{raiders}` - Number of raiders
- `{message}` - Chat message text

## Advanced Features

### Conditional SubActions
Add conditions to subactions based on variables

### Random Selection
Use random numbers for varied responses

### Queued Actions
Set `queue: true` for sequential execution

### Concurrent Actions
Set `concurrent: true` for parallel execution

## Integration Points

### Twitch
- Chat commands
- Channel points
- Followers, subs, raids
- Bits and cheers

### OBS
- Scene switching
- Source visibility
- Filter controls
- Recording/streaming

### Discord
- Send messages
- Role management
- Webhooks

### Multi-Platform
- ChatRD for unified chat
- TikTok, Kick, YouTube

## Resources

### Documentation
- `/docs/blueprint.md` - Architecture overview
- `ARCHITECTURE.md` - Technical details
- `BOT-INTEGRATION-EXAMPLES.md` - Integration examples

### Support Files
- `src/data/actions.json` - All actions
- `src/data/commands.json` - All commands
- `STREAMERBOT_IMPORT_SUMMARY.md` - Import details

## Next Steps

1. ✅ **Browse your actions** - See what was imported
2. ✅ **Test key commands** - Verify they work
3. ✅ **Update file paths** - Fix any broken references
4. ✅ **Customize** - Make it yours
5. ✅ **Go Live** - Use StreamWeaver for your stream!

---

**Need Help?**
- Check logs in the app
- Review action configurations
- Test individual components
- Refer to Streamer.bot docs for original behavior

**Ready to stream? Let's go! 🚀**
