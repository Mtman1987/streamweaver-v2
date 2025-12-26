# Space Mountain Bot API Reference

Base URL: `https://your-app-domain.com`

## Authentication
All endpoints require the `BOT_SECRET_KEY` in headers:
```
Authorization: Bearer 1234
```

## Points System

### Get User Rank
**POST** `/api/points/user-rank`

Request:
```json
{
  "userId": "94371378",
  "username": "mtman1987"
}
```

Response:
```json
{
  "rank": 5,
  "points": 1250,
  "username": "mtman1987",
  "displayName": "MTMan",
  "message": "MTMan is rank #5 with 1,250 points!"
}
```

Response (No rank):
```json
{
  "rank": null,
  "points": 0,
  "message": "mtman1987 is not on the leaderboard yet!"
}
```

### Add Points to User
**POST** `/api/points/add`

Request:
```json
{
  "userId": "94371378",
  "username": "mtman1987",
  "displayName": "MTMan",
  "points": 100
}
```

Response:
```json
{
  "success": true,
  "user": {
    "userId": "94371378",
    "username": "mtman1987",
    "displayName": "MTMan",
    "points": 1350,
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  },
  "message": "Added 100 points to MTMan. New total: 1350"
}
```

### Get Leaderboard
**GET** `/api/points/leaderboard?limit=10`

Response:
```json
[
  {
    "userId": "94371378",
    "username": "mtman1987",
    "displayName": "MTMan",
    "points": 2500,
    "rank": 1,
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  },
  {
    "userId": "123456789",
    "username": "captain2",
    "displayName": "Captain Two",
    "points": 2000,
    "rank": 2,
    "lastUpdated": "2024-01-15T09:15:00.000Z"
  }
]
```

### Get Leaderboard Image
**GET** `/api/points/leaderboard-image`

Returns: PNG image file (binary data)
- Content-Type: `image/png`
- Use for Discord attachments

## Raid Train System

### Update Raid Train Channel
**POST** `/api/discord/raid-train-channel`

Request:
```json
{
  "channelId": "1341946492696526858",
  "date": "2024-01-15"
}
```

Response:
```json
{
  "success": true,
  "messageId": "1234567890123456789",
  "shoutout": "🚂 Next stop on the Space Mountain Express: Captain MTMan's stellar station!",
  "hasScheduledUser": true,
  "username": "mtman1987"
}
```

### Handle Raid Train Signup/Cancel
**POST** `/api/discord/raid-train-signup`

Signup Request:
```json
{
  "action": "signup",
  "date": "2024-01-16",
  "hour": 15,
  "userId": "94371378",
  "username": "mtman1987",
  "displayName": "MTMan"
}
```

Cancel Request:
```json
{
  "action": "cancel",
  "date": "2024-01-16",
  "hour": 15,
  "userId": "94371378"
}
```

Success Response:
```json
{
  "type": "INTERACTION_CALLBACK_TYPE",
  "data": {
    "content": "🚂 Welcome aboard, Captain MTMan! You're now scheduled for 15:00 on 2024-01-16. Emergency slot - 50 points deducted.",
    "flags": 64
  }
}
```

Error Response:
```json
{
  "type": "INTERACTION_CALLBACK_TYPE",
  "data": {
    "content": "❌ Insufficient points. Need 100 points.",
    "flags": 64
  }
}
```

## Shoutout System

### Generate Regular Shoutout
**POST** `/api/shoutouts/generate`

Request:
```json
{
  "username": "mtman1987",
  "type": "regular"
}
```

Response:
```json
{
  "shoutout": "Commander, diverting power to welcome Captain MTMan to the bridge! They were last seen charting a course through Just Chatting. All hands, prepare to engage their channel at twitch.tv/mtman1987!",
  "username": "mtman1987"
}
```

### Generate Raid Train Shoutout
**POST** `/api/shoutouts/raid-train`

Request:
```json
{
  "forceUsername": "mtman1987"
}
```

Response:
```json
{
  "shoutout": "🚂 Next stop on the Space Mountain Express: Captain MTMan's stellar station! They were last seen navigating the cosmic rails through Just Chatting. All passengers, prepare for departure to twitch.tv/mtman1987!",
  "username": "mtman1987",
  "hasScheduledUser": true
}
```

## Calendar System

### Generate Calendar Image
**GET** `/api/calendar/image?month=2024-01&theme=space`

Returns: PNG image file (binary data)
- Content-Type: `image/png`
- Query params: `month` (YYYY-MM), `theme` (optional)

## Community Tracking

### Track Activity
**POST** `/api/community/track`

Twitch Activity Request:
```json
{
  "userId": "94371378",
  "username": "mtman1987",
  "displayName": "MTMan",
  "platform": "twitch",
  "activityType": "follow",
  "metadata": {}
}
```

Discord Activity Request:
```json
{
  "userId": "767875979561009173",
  "username": "mtman",
  "displayName": "MTMan",
  "platform": "discord",
  "activityType": "help_reaction",
  "metadata": { "messageId": "123456789" }
}
```

Bits Activity Request:
```json
{
  "userId": "94371378",
  "username": "mtman1987",
  "displayName": "MTMan",
  "platform": "twitch",
  "activityType": "bits",
  "metadata": { "amount": 100 }
}
```

Response:
```json
{
  "success": true,
  "message": "Tracked follow activity for MTMan on twitch"
}
```

### Get User Metrics
**GET** `/api/community/metrics?userId=94371378`

Response:
```json
{
  "userId": "94371378",
  "username": "mtman1987",
  "displayName": "MTMan",
  "totalMessages": 1250,
  "helpfulReactions": 45,
  "voiceMinutes": 3600,
  "streamAttendance": 25,
  "lastSeen": "2024-01-15T10:30:00.000Z",
  "dailyStreak": 7
}
```

### Get Top Contributors
**GET** `/api/community/metrics?type=contributors&limit=10`

Response:
```json
[
  {
    "userId": "94371378",
    "username": "mtman1987",
    "displayName": "MTMan",
    "totalMessages": 1250,
    "helpfulReactions": 45,
    "voiceMinutes": 3600,
    "streamAttendance": 25,
    "lastSeen": "2024-01-15T10:30:00.000Z",
    "dailyStreak": 7
  }
]
```

## Activity Types

### Twitch Activities
- `follow` - New follower (25 points)
- `subscription` - New subscriber (100 points)
- `bits` - Bits donation (1 point per bit)
- `raid` - Incoming raid (50 points)
- `host` - Channel host (30 points)
- `stream_attendance` - Watching stream (10 points)

### Discord Activities
- `message` - Send message (1 point)
- `reaction` - Add reaction (2 points)
- `voice_minute` - Voice chat participation (5 points per minute)
- `help_reaction` - Helpful reaction received (10 points)
- `community_help` - Helping another member (50 points)

## Chat Logging

### Log Chat Message
**POST** `/api/chat/log`

Request:
```json
{
  "username": "mtman1987",
  "message": "Hello everyone!",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "platform": "twitch",
  "userId": "94371378",
  "badges": ["broadcaster", "subscriber"],
  "color": "#FF0000"
}
```

Response:
```json
{
  "success": true,
  "logId": "log_123456789"
}
```

## Raid Pile System

### Join Raid Pile
**POST** `/api/raid-pile/join`

Request:
```json
{
  "userId": "94371378",
  "username": "mtman1987",
  "displayName": "MTMan"
}
```

Response:
```json
{
  "success": true,
  "pileId": "pile_1642345678901",
  "message": "🏔️ MTMan joined the Space Mountain Raid Pile!"
}
```

### Leave Raid Pile
**POST** `/api/raid-pile/leave`

Request:
```json
{
  "userId": "94371378",
  "username": "mtman1987",
  "displayName": "MTMan"
}
```

Response:
```json
{
  "success": true,
  "message": "MTMan left the raid pile. Safe travels, Captain!"
}
```

### Get Next Raid Target
**POST** `/api/raid-pile/next-target`

Request:
```json
{
  "userId": "94371378",
  "username": "mtman1987",
  "displayName": "MTMan"
}
```

Response:
```json
{
  "type": "INTERACTION_CALLBACK_TYPE",
  "data": {
    "content": "🎯 Next raid target: Captain2 (@captain2) - 15 viewers\n\n🎉 You earned 25 points for participating in the pile!",
    "flags": 64
  }
}
```

### Update Member Viewers
**POST** `/api/raid-pile/update-viewers`

Request:
```json
{
  "userId": "94371378",
  "viewers": 42,
  "isLive": true
}
```

Response:
```json
{
  "success": true,
  "message": "Updated viewer count for user 94371378: 42 viewers"
}
```

### Update Raid Pile Channel
**POST** `/api/raid-pile/channel`

Request:
```json
{
  "channelId": "1341946492696526858"
}
```

Response:
```json
{
  "success": true,
  "messageId": "1234567890123456789",
  "totalMembers": 25,
  "totalPiles": 1
}
```

### Get Raid Pile Status
**GET** `/api/raid-pile/status`

Response:
```json
[
  {
    "id": "pile_1642345678901",
    "holderId": "94371378",
    "holderUsername": "mtman1987",
    "holderDisplayName": "MTMan",
    "members": [
      {
        "userId": "94371378",
        "username": "mtman1987",
        "displayName": "MTMan",
        "joinedAt": "2024-01-15T10:30:00.000Z",
        "lastRaidedAt": "2024-01-15T09:00:00.000Z",
        "currentViewers": 42,
        "isLive": true,
        "pileId": "pile_1642345678901"
      }
    ],
    "createdAt": "2024-01-15T08:00:00.000Z",
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
]
```

## Raid Pile Features

### Intelligent Target Selection
- **60% weight** on lowest viewer count
- **40% weight** on longest time since last raid
- Automatically excludes the requesting user
- Awards points for participating in raids

### Dynamic Pile Management
- **Auto-split** when pile exceeds max size (default: 40 members)
- **Auto-merge** when multiple piles below min size (default: 10 members)
- **Infinite scaling** - can create as many piles as needed
- **Holder system** - special members get enhanced shoutouts

### Shoutout Integration
- Regular members get standard AI-generated shoutouts
- Pile holders get enhanced shoutouts with rotating clips
- All shoutouts use Space Mountain theming

## Emergency Slots

Emergency slots are automatically detected when:
- Slot is within next 12 hours (configurable)
- Slot is currently empty
- Cost is reduced to 50 points (vs 100 regular)

## Error Responses

All endpoints may return:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common HTTP status codes:
- `400`: Bad Request (missing/invalid parameters)
- `401`: Unauthorized (invalid/missing BOT_SECRET_KEY)
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limits

- Points operations: 100 requests/minute
- Image generation: 10 requests/minute
- Chat logging: 1000 requests/minute
- Other endpoints: 200 requests/minute