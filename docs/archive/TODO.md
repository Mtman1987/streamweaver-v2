# TODO: Fix Twitch Chat Issues

## Completed
- Analyzed code and identified issues: token scope, send mode, history logging.
- Updated `src/services/twitch.ts`: Modified `sendChatMessage` to use appropriate token (broadcaster/bot) from `/api/tokens` based on mode, removed env usage.
- Updated `src/app/(app)/dashboard/chat-client.tsx`: Added toggle for send mode (broadcaster/bot), default broadcaster.
- Modified `server.ts`: Updated WebSocket handler to pass send mode to `sendChatMessage` and log sent messages to Discord; removed chat mode switching as connection always uses broadcaster.
- Updated `src/app/(app)/integrations/page.tsx`: Added `user:write:chat` scope to broadcaster auth link.

## Pending Tasks
- [ ] Test: Dev server started, send messages as broadcaster/bot, check history logging to Discord.

## Notes
- Broadcaster token needs `user:write:chat` scope; re-auth if necessary.
- History fetches from Discord, so logging sent messages ensures they appear.
- Connection always uses broadcaster token/username; toggle only affects sending.
