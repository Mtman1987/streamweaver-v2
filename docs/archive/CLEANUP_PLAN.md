# Cleanup Plan for Root Directory Files

## Files to Review in `C:\Users\mtman\Desktop\Enviroment\`

### ✅ Useful - Keep and Consider Integrating

#### Voice Command Files
- **Smart_Voice_Commands.cs** - Smart voice command processing with username matching
  - Features: Voice-activated shoutouts with AI username matching
  - Uses: Active chatter list, phonetic matching, AI prompt for disambiguation
  - **Integration Priority: HIGH** - Useful for voice control feature
  
- **Smart_Voice_Clarification.cs** - Clarification system for voice commands
  - **Integration Priority: MEDIUM**

- **Streamer_Bot_Voice_Commander.cs** - Voice commander implementation
  - **Integration Priority: MEDIUM**

- **Streamer_Bot_Voice_UI.cs** - Voice control UI
  - **Integration Priority: LOW** (we have web UI)

- **Final_Voice_Command_Logic.cs** - Finalized voice command logic
  - **Integration Priority: HIGH**

- **Structured_Voice_Commands.cs** - Structured command parsing
  - **Integration Priority: MEDIUM**

#### AI/Memory System Files
- **AI_Memory_System.cs** - Two-tier AI memory system
  - Features: Recent context (50 messages) + condensed old context
  - Uses: User-specific memory, context condensing with AI
  - **Integration Priority: HIGH** - Useful for Athena conversations

#### Discord Integration Files
- **Discord_Chat_Bridge.cs** - Discord chat bridge
  - **Integration Priority: MEDIUM** (already have Discord service)

- **Discord_Connection_Status.cs** - Connection status monitoring
  - **Integration Priority: LOW** (have connection management)

- **Discord_Control_Panel.cs** - Control panel for Discord
  - **Integration Priority: LOW** (web UI preferred)

- **Discord_Integration_Final.cs** - Final Discord integration
  - **Integration Priority: MEDIUM** - Review for any missing features

- **Discord_Panel_Launcher.cs** - Panel launcher
  - **Integration Priority: LOW**

- **Discord_Platform_UI.cs** - Platform UI
  - **Integration Priority: LOW**

- **Discord_Shared_Bot_Setup.cs** - Shared bot setup
  - **Integration Priority: MEDIUM** - Review setup patterns

#### DLL/Project Files
- **Streamer.bot.Discord.dll_Project.cs** - DLL project code
  - **Integration Priority: LOW** - Reference material only

- **Streamer.bot.Discord.dll_source.cs** - DLL source
  - **Integration Priority: LOW** - Reference material only

### 📄 Documentation Files - Keep for Reference
- **Connection_Status_Setup.md**
- **Discord_Integration_Setup.md**
- **Discord_Native_Integration_Guide.md**
- **Discord_Setup_Flow.md**
- **Discord_User_Setup_Flow.md**
- **DLL_Installation_Guide.md**
- **Memory_System_Example.md**
- **Voice_Commander_Setup.md**
- **Voice_UI_Integration.md**
- **q-dev-chat-2025-12-14.md**

### ❌ Can Delete
- **Enviroment.sln** - Visual Studio solution file (not needed for Node.js project)

## Integration Recommendations

### Phase 1: Voice Commands (High Priority)
1. Review **Smart_Voice_Commands.cs** patterns
2. Review **Final_Voice_Command_Logic.cs**
3. Implement in `src/services/voice-commands.ts`:
   - Voice recognition integration
   - Active chatter matching
   - AI-powered username disambiguation
   - Command routing

### Phase 2: AI Memory (High Priority)
1. Review **AI_Memory_System.cs** two-tier memory approach
2. Implement in `src/services/ai-memory.ts`:
   - Recent context (last 50 messages per user)
   - Old context (condensed historical messages)
   - Automatic condensing when threshold reached
   - User-specific context storage

### Phase 3: Discord Enhancements (Medium Priority)
1. Review **Discord_Integration_Final.cs** and **Discord_Shared_Bot_Setup.cs**
2. Check for any missing features in our current Discord service
3. Update `src/services/discord.ts` if needed

## Cleanup Actions

### Immediate
1. ✅ Copy useful patterns to StreamWeaver-v2
2. ❌ Delete Enviroment.sln (not needed)
3. 📁 Move all C# files to `/Enviroment/Reference/` subdirectory
4. 📁 Move all .md files to `/Enviroment/Docs/` subdirectory

### After Integration
1. Archive reference C# files (compress to .zip)
2. Keep documentation files for reference
3. Consider deleting `/OldBot/` folder if not needed (check with user first)

## File Organization Structure

```
C:\Users\mtman\Desktop\Enviroment\
├── StreamWeaver/           (original - keep for reference)
├── StreamWeaver-v2/        (active development)
├── docs-main/              (keep)
├── TestHarness/            (keep if testing)
├── OldBot/                 (check with user - possible deletion)
├── Reference/              (NEW - move all .cs files here)
│   ├── VoiceCommands/
│   ├── AIMemory/
│   └── Discord/
└── Docs/                   (NEW - move all .md files here)
    ├── Voice/
    ├── Discord/
    └── General/
```

## Commands to Execute

```powershell
# Create new directories
New-Item -ItemType Directory -Path "C:\Users\mtman\Desktop\Enviroment\Reference\VoiceCommands" -Force
New-Item -ItemType Directory -Path "C:\Users\mtman\Desktop\Enviroment\Reference\AIMemory" -Force
New-Item -ItemType Directory -Path "C:\Users\mtman\Desktop\Enviroment\Reference\Discord" -Force
New-Item -ItemType Directory -Path "C:\Users\mtman\Desktop\Enviroment\Docs\Voice" -Force
New-Item -ItemType Directory -Path "C:\Users\mtman\Desktop\Enviroment\Docs\Discord" -Force
New-Item -ItemType Directory -Path "C:\Users\mtman\Desktop\Enviroment\Docs\General" -Force

# Move Voice Command files
Move-Item "C:\Users\mtman\Desktop\Enviroment\*Voice*.cs" "C:\Users\mtman\Desktop\Enviroment\Reference\VoiceCommands\" -Force

# Move AI Memory files
Move-Item "C:\Users\mtman\Desktop\Enviroment\AI_Memory*.cs" "C:\Users\mtman\Desktop\Enviroment\Reference\AIMemory\" -Force

# Move Discord files
Move-Item "C:\Users\mtman\Desktop\Enviroment\Discord*.cs" "C:\Users\mtman\Desktop\Enviroment\Reference\Discord\" -Force
Move-Item "C:\Users\mtman\Desktop\Enviroment\Streamer.bot.Discord*.cs" "C:\Users\mtman\Desktop\Enviroment\Reference\Discord\" -Force

# Move documentation
Move-Item "C:\Users\mtman\Desktop\Enviroment\*Voice*.md" "C:\Users\mtman\Desktop\Enviroment\Docs\Voice\" -Force
Move-Item "C:\Users\mtman\Desktop\Enviroment\Discord*.md" "C:\Users\mtman\Desktop\Enviroment\Docs\Discord\" -Force
Move-Item "C:\Users\mtman\Desktop\Enviroment\*Memory*.md" "C:\Users\mtman\Desktop\Enviroment\Docs\General\" -Force
Move-Item "C:\Users\mtman\Desktop\Enviroment\DLL*.md" "C:\Users\mtman\Desktop\Enviroment\Docs\General\" -Force
Move-Item "C:\Users\mtman\Desktop\Enviroment\Connection*.md" "C:\Users\mtman\Desktop\Enviroment\Docs\General\" -Force

# Delete unnecessary files
Remove-Item "C:\Users\mtman\Desktop\Enviroment\Enviroment.sln" -Force
```

## Notes
- Keep all files until integration patterns are reviewed
- OldBot folder check: May contain useful configuration or data
- Consider creating git repository for historical reference before cleanup
