class VoiceClient {
  constructor() {
    this.ws = null;
    this.localStream = null;
    this.peerConnections = new Map();
    this.audioElements = new Map();
    this.userId = null;
    this.userName = null;
    this.roomId = null;
    this.avatar = null;
    this.muted = false;
    this.deafened = false;
    this.connected = false;
    
    this.onUserJoined = null;
    this.onUserLeft = null;
    this.onVoiceStateChanged = null;
    this.onConnectionStateChanged = null;
  }
  
  async connect(serverUrl = 'ws://localhost:8080') {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(serverUrl);
      
      this.ws.onopen = () => {
        console.log('[Voice] Connected to voice server');
        this.connected = true;
        if (this.onConnectionStateChanged) {
          this.onConnectionStateChanged(true);
        }
        resolve();
      };
      
      this.ws.onerror = (error) => {
        console.error('[Voice] Connection error:', error);
        reject(error);
      };
      
      this.ws.onclose = () => {
        console.log('[Voice] Disconnected from voice server');
        this.connected = false;
        if (this.onConnectionStateChanged) {
          this.onConnectionStateChanged(false);
        }
        this.cleanup();
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };
    });
  }
  
  async joinVoice(userId, userName, roomId, avatar = null) {
    if (!this.connected) {
      throw new Error('Not connected to voice server');
    }
    
    this.userId = userId;
    this.userName = userName;
    this.roomId = roomId;
    this.avatar = avatar;
    
    // Get user media
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      console.log('[Voice] Got local audio stream');
    } catch (err) {
      console.error('[Voice] Failed to get user media:', err);
      
      // Provide specific error messages
      if (err.name === 'NotAllowedError') {
        throw new Error('Microphone access denied. Please allow microphone access and try again.');
      } else if (err.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone and try again.');
      } else if (err.name === 'NotSupportedError') {
        throw new Error('Microphone not supported. Please use a modern browser with HTTPS.');
      } else {
        throw new Error(`Microphone error: ${err.message}`);
      }
    }
    
    // Join voice room
    this.send({
      type: 'join_voice',
      payload: { userId, userName, roomId, avatar }
    });
  }
  
  leaveVoice() {
    if (this.userId && this.roomId) {
      this.send({
        type: 'leave_voice',
        payload: { userId: this.userId, roomId: this.roomId }
      });
    }
    
    this.cleanup();
  }
  
  setMuted(muted) {
    this.muted = muted;
    
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
    
    this.send({
      type: 'voice_state',
      payload: { muted, deafened: this.deafened }
    });
  }
  
  setDeafened(deafened) {
    this.deafened = deafened;
    
    // Mute all remote audio
    this.audioElements.forEach(audio => {
      audio.muted = deafened;
    });
    
    this.send({
      type: 'voice_state',
      payload: { muted: this.muted, deafened }
    });
  }
  
  async handleMessage(message) {
    const { type, payload } = message;
    
    switch (type) {
      case 'room_members':
        await this.handleRoomMembers(payload);
        break;
      case 'user_joined_voice':
        await this.handleUserJoined(payload);
        break;
      case 'user_left_voice':
        this.handleUserLeft(payload);
        break;
      case 'webrtc_offer':
        await this.handleWebRTCOffer(payload);
        break;
      case 'webrtc_answer':
        await this.handleWebRTCAnswer(payload);
        break;
      case 'webrtc_ice':
        await this.handleWebRTCIce(payload);
        break;
      case 'voice_state_changed':
        this.handleVoiceStateChanged(payload);
        break;
    }
  }
  
  async handleRoomMembers({ roomId, members }) {
    console.log(`[Voice] Room members in ${roomId}:`, members);
    
    // Create peer connections for existing members
    for (const member of members) {
      await this.createPeerConnection(member.userId, true);
    }
  }
  
  async handleUserJoined({ userId, userName, avatar }) {
    console.log(`[Voice] ${userName} joined voice`);
    
    if (this.onUserJoined) {
      this.onUserJoined({ userId, userName, avatar });
    }
    
    // Create peer connection as initiator
    await this.createPeerConnection(userId, true);
  }
  
  handleUserLeft({ userId, userName }) {
    console.log(`[Voice] ${userName} left voice`);
    
    if (this.onUserLeft) {
      this.onUserLeft({ userId, userName });
    }
    
    this.removePeerConnection(userId);
  }
  
  async handleWebRTCOffer({ sourceUserId, sourceUserName, offer }) {
    console.log(`[Voice] Received offer from ${sourceUserName}`);
    
    const pc = await this.createPeerConnection(sourceUserId, false);
    await pc.setRemoteDescription(offer);
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    this.send({
      type: 'webrtc_answer',
      payload: {
        targetUserId: sourceUserId,
        answer
      }
    });
  }
  
  async handleWebRTCAnswer({ sourceUserId, answer }) {
    const pc = this.peerConnections.get(sourceUserId);
    if (pc) {
      await pc.setRemoteDescription(answer);
    }
  }
  
  async handleWebRTCIce({ sourceUserId, candidate }) {
    const pc = this.peerConnections.get(sourceUserId);
    if (pc && candidate) {
      await pc.addIceCandidate(candidate);
    }
  }
  
  handleVoiceStateChanged({ userId, muted, deafened }) {
    if (this.onVoiceStateChanged) {
      this.onVoiceStateChanged({ userId, muted, deafened });
    }
  }
  
  async createPeerConnection(userId, isInitiator) {
    if (this.peerConnections.has(userId)) {
      return this.peerConnections.get(userId);
    }
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    this.peerConnections.set(userId, pc);
    
    // Add local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log(`[Voice] Received remote stream from ${userId}`);
      const [remoteStream] = event.streams;
      this.createAudioElement(userId, remoteStream);
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({
          type: 'webrtc_ice',
          payload: {
            targetUserId: userId,
            candidate: event.candidate
          }
        });
      }
    };
    
    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log(`[Voice] Connection to ${userId}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeerConnection(userId);
      }
    };
    
    // Create offer if initiator
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      this.send({
        type: 'webrtc_offer',
        payload: {
          targetUserId: userId,
          offer
        }
      });
    }
    
    return pc;
  }
  
  createAudioElement(userId, stream) {
    // Remove existing audio element
    if (this.audioElements.has(userId)) {
      const oldAudio = this.audioElements.get(userId);
      oldAudio.remove();
    }
    
    // Create new audio element
    const audio = document.createElement('audio');
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.muted = this.deafened;
    audio.style.display = 'none';
    
    document.body.appendChild(audio);
    this.audioElements.set(userId, audio);
    
    console.log(`[Voice] Created audio element for ${userId}`);
  }
  
  removePeerConnection(userId) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }
    
    const audio = this.audioElements.get(userId);
    if (audio) {
      audio.remove();
      this.audioElements.delete(userId);
    }
  }
  
  cleanup() {
    // Close all peer connections
    this.peerConnections.forEach((pc, userId) => {
      this.removePeerConnection(userId);
    });
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Reset state
    this.userId = null;
    this.userName = null;
    this.roomId = null;
    this.avatar = null;
    this.muted = false;
    this.deafened = false;
  }
  
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
  
  disconnect() {
    this.leaveVoice();
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Export for use in HTML
window.VoiceClient = VoiceClient;