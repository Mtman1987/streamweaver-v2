const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MESH_STATE_FILE = path.join(__dirname, 'mesh_state.json');

// Create HTTP server for serving files
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(302, { 'Location': '/mesh_user.html' });
    res.end();
    return;
  }
  
  const filePath = path.join(__dirname, req.url);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json'
    }[ext] || 'text/plain';
    
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// WebSocket server for voice signaling
const wss = new WebSocket.Server({ server });

const rooms = new Map();
const users = new Map();
const adminClients = new Set();
const overlayClients = new Set();
const publicRooms = new Set(['lobby', 'mod_room', 'silent_watch']);

wss.on('connection', (ws) => {
  console.log('[Voice] New connection');
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      await handleMessage(ws, message);
    } catch (err) {
      console.error('[Voice] Message error:', err);
    }
  });
  
  ws.on('close', () => {
    handleDisconnect(ws);
  });
});

async function handleMessage(ws, message) {
  const { type, payload } = message;
  
  switch (type) {
    case 'join_voice':
      await handleJoinVoice(ws, payload);
      break;
    case 'leave_voice':
      handleLeaveVoice(ws, payload);
      break;
    case 'webrtc_offer':
      handleWebRTCOffer(ws, payload);
      break;
    case 'webrtc_answer':
      handleWebRTCAnswer(ws, payload);
      break;
    case 'webrtc_ice':
      handleWebRTCIce(ws, payload);
      break;
    case 'voice_state':
      handleVoiceState(ws, payload);
      break;
    case 'admin_connect':
      adminClients.add(ws);
      broadcastAdminUpdate();
      break;
    case 'overlay_connect':
      overlayClients.add(ws);
      broadcastOverlayUpdate();
      break;
    case 'admin_create_room':
      handleCreatePublicRoom(payload);
      break;
    case 'admin_broadcast':
      handleAdminBroadcast(payload);
      break;
    case 'admin_mute_all':
      handleMuteAll();
      break;
    case 'admin_close_room':
      handleCloseRoom(payload);
      break;
    case 'admin_kick_user':
      handleKickUser(payload);
      break;
  }
}

async function handleJoinVoice(ws, { userId, userName, roomId, avatar }) {
  // Store user info
  users.set(ws, { userId, userName, roomId, avatar });
  
  // Add to room
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(ws);
  
  // Update mesh state
  await updateMeshState();
  
  // Notify room members
  broadcastToRoom(roomId, {
    type: 'user_joined_voice',
    payload: { userId, userName, roomId, avatar }
  }, ws);
  
  // Update admin and overlay
  broadcastAdminUpdate();
  broadcastOverlayUpdate();
  
  // Send current room members to new user
  const roomMembers = Array.from(rooms.get(roomId) || [])
    .filter(client => client !== ws)
    .map(client => {
      const user = users.get(client);
      return user ? {
        userId: user.userId,
        userName: user.userName,
        avatar: user.avatar
      } : null;
    })
    .filter(Boolean);
  
  ws.send(JSON.stringify({
    type: 'room_members',
    payload: { roomId, members: roomMembers }
  }));
  
  console.log(`[Voice] ${userName} joined voice in ${roomId}`);
}

function handleLeaveVoice(ws, { userId, roomId }) {
  const user = users.get(ws);
  if (!user) return;
  
  // Remove from room
  if (rooms.has(roomId)) {
    rooms.get(roomId).delete(ws);
    if (rooms.get(roomId).size === 0) {
      rooms.delete(roomId);
    }
  }
  
  // Notify room
  broadcastToRoom(roomId, {
    type: 'user_left_voice',
    payload: { userId, userName: user.userName, roomId }
  });
  
  users.delete(ws);
  updateMeshState();
  broadcastAdminUpdate();
  broadcastOverlayUpdate();
  
  console.log(`[Voice] ${user.userName} left voice`);
}

function handleWebRTCOffer(ws, { targetUserId, offer }) {
  const sourceUser = users.get(ws);
  if (!sourceUser) return;
  
  // Find target user
  const targetWs = findUserSocket(targetUserId);
  if (!targetWs) return;
  
  targetWs.send(JSON.stringify({
    type: 'webrtc_offer',
    payload: {
      sourceUserId: sourceUser.userId,
      sourceUserName: sourceUser.userName,
      offer
    }
  }));
}

function handleWebRTCAnswer(ws, { targetUserId, answer }) {
  const sourceUser = users.get(ws);
  if (!sourceUser) return;
  
  const targetWs = findUserSocket(targetUserId);
  if (!targetWs) return;
  
  targetWs.send(JSON.stringify({
    type: 'webrtc_answer',
    payload: {
      sourceUserId: sourceUser.userId,
      answer
    }
  }));
}

function handleWebRTCIce(ws, { targetUserId, candidate }) {
  const targetWs = findUserSocket(targetUserId);
  if (!targetWs) return;
  
  const sourceUser = users.get(ws);
  targetWs.send(JSON.stringify({
    type: 'webrtc_ice',
    payload: {
      sourceUserId: sourceUser.userId,
      candidate
    }
  }));
}

function handleVoiceState(ws, { muted, deafened }) {
  const user = users.get(ws);
  if (!user) return;
  
  // Update user state
  user.muted = muted;
  user.deafened = deafened;
  
  // Broadcast to room
  broadcastToRoom(user.roomId, {
    type: 'voice_state_changed',
    payload: {
      userId: user.userId,
      muted,
      deafened
    }
  }, ws);
}

function handleDisconnect(ws) {
  const user = users.get(ws);
  if (user) {
    handleLeaveVoice(ws, { userId: user.userId, roomId: user.roomId });
  }
  adminClients.delete(ws);
  overlayClients.delete(ws);
}

function handleCreatePublicRoom({ roomName }) {
  const roomId = 'public_' + roomName.toLowerCase().replace(/\s+/g, '_');
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
    publicRooms.add(roomId);
  }
  broadcastAdminUpdate();
}

function handleAdminBroadcast({ message }) {
  const broadcastMessage = {
    type: 'admin_broadcast',
    payload: { message }
  };
  
  users.forEach((user, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(broadcastMessage));
    }
  });
}

function handleMuteAll() {
  users.forEach((user, ws) => {
    user.muted = true;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'admin_mute_toggle',
        payload: { muted: true }
      }));
    }
  });
  broadcastAdminUpdate();
}

function broadcastAdminUpdate() {
  const adminData = {
    type: 'admin_update',
    payload: {
      rooms: Array.from(rooms.entries()).map(([roomId, clients]) => ({
        id: roomId,
        name: roomId.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
        userCount: clients.size,
        users: Array.from(clients).map(ws => {
          const user = users.get(ws);
          return user ? {
            userId: user.userId,
            userName: user.userName,
            muted: user.muted || false,
            deafened: user.deafened || false
          } : null;
        }).filter(Boolean)
      })),
      totalUsers: users.size
    }
  };
  
  adminClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(adminData));
    }
  });
}

function broadcastOverlayUpdate() {
  const overlayData = {
    type: 'overlay_update',
    payload: {
      voiceUsers: Array.from(users.values()).map(user => ({
        userId: user.userId,
        userName: user.userName,
        roomId: user.roomId,
        muted: user.muted || false,
        deafened: user.deafened || false
      }))
    }
  };
  
  overlayClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(overlayData));
    }
  });
}

function handleKickUser({ userId }) {
  const userWs = findUserSocket(userId);
  if (userWs) {
    const user = users.get(userWs);
    if (user) {
      userWs.send(JSON.stringify({
        type: 'admin_kicked',
        payload: { message: 'You have been removed from voice chat' }
      }));
      userWs.close();
    }
  }
}

function handleCloseRoom({ roomId }) {
  const room = rooms.get(roomId);
  if (room && roomId !== 'lobby' && roomId !== 'mod_room' && roomId !== 'on_stream') {
    room.forEach(client => {
      const user = users.get(client);
      if (user) {
        client.send(JSON.stringify({
          type: 'room_closed',
          payload: { roomId, message: 'Room closed by admin' }
        }));
        // Move to lobby
        handleLeaveVoice(client, { userId: user.userId, roomId });
        setTimeout(() => {
          handleJoinVoice(client, { userId: user.userId, userName: user.userName, roomId: 'lobby', avatar: user.avatar });
        }, 100);
      }
    });
    rooms.delete(roomId);
  }
  broadcastAdminUpdate();
}

function broadcastToRoom(roomId, message, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const messageStr = JSON.stringify(message);
  room.forEach(client => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

function findUserSocket(userId) {
  for (const [ws, user] of users.entries()) {
    if (user.userId === userId) {
      return ws;
    }
  }
  return null;
}

async function updateMeshState() {
  try {
    let meshState = {};
    if (fs.existsSync(MESH_STATE_FILE)) {
      meshState = JSON.parse(fs.readFileSync(MESH_STATE_FILE, 'utf8'));
    }
    
    // Initialize rooms structure
    if (!meshState.rooms) {
      meshState.rooms = {};
    }
    
    // Update rooms from voice server
    rooms.forEach((clients, roomId) => {
      if (!meshState.rooms[roomId]) {
        meshState.rooms[roomId] = { name: roomId.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) };
      }
    });
    
    // Update with voice users
    const voiceUsers = {};
    for (const [ws, user] of users.entries()) {
      voiceUsers[user.userId] = {
        name: user.userName,
        room: user.roomId,
        avatar: user.avatar,
        source: 'voice',
        stars: 0,
        roles: ['Voice User'],
        voiceConnected: true,
        muted: user.muted || false,
        deafened: user.deafened || false
      };
    }
    
    // Merge with existing users
    meshState.users = { ...meshState.users, ...voiceUsers };
    meshState.timestamp = new Date().toISOString();
    
    fs.writeFileSync(MESH_STATE_FILE, JSON.stringify(meshState, null, 2));
  } catch (err) {
    console.error('[Voice] Failed to update mesh state:', err);
  }
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Voice] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[Voice] WebSocket server ready for voice connections`);
  console.log(`[Voice] Access from network: http://YOUR_IP:${PORT}`);
});