
'use client';

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, LoaderCircle, Bot, Send, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { transcribeAudio } from "@/services/speech";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TwitchIcon, DiscordIcon } from "@/components/icons";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getBrowserWebSocketUrl } from "@/lib/ws-config";

// AI and service flows
import { sendTwitchMessage } from "@/ai/flows/send-twitch-message";
import { sendDiscordMessage } from "@/ai/flows/send-discord-message";
import { conversationalResponse } from "@/ai/flows/conversational-response";
import { textToSpeech } from "@/ai/flows/text-to-speech";

type UserConfigPayload = {
    config?: Record<string, string>;
    complete?: boolean;
};

type Destination = 'twitch' | 'discord' | 'ai' | 'private';
type Speaker = 'broadcaster' | 'bot';

interface TranscribedMessage {
    id: number;
    text: string;
    status: 'pending' | 'sent' | 'error';
    speaker: 'commander' | 'ai-input'; // To distinguish user's speech to AI
}

type VoiceCommanderVariant = 'card' | 'embedded';

interface VoiceCommanderProps {
    variant?: VoiceCommanderVariant;
    className?: string;
}


export function VoiceCommander({ variant = 'card', className }: VoiceCommanderProps) {
    const { toast } = useToast();
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [userConfig, setUserConfig] = useState<Record<string, string>>({});
    const [messages, setMessages] = useState<TranscribedMessage[]>([]);
    const [destination, setDestination] = useState<Destination>('private');
    const [sendAsCommander, setSendAsCommander] = useState(true);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const ws = useRef<WebSocket | null>(null);
    const personalityRef = useRef<string>("");
    const voiceRef = useRef<string>("Algieba");


      useEffect(() => {
          // Load user-specific config (saved by /setup) so this works for anyone without editing .env
          fetch('/api/user-config', { cache: 'no-store' })
                .then((res) => res.json())
                .then((data: UserConfigPayload) => setUserConfig(data?.config || {}))
                .catch(() => setUserConfig({}));

        const wsUrl = getBrowserWebSocketUrl();
        if (!wsUrl) return;

        // Load settings from localStorage
        personalityRef.current = localStorage.getItem("bot_personality") || "";
        voiceRef.current = localStorage.getItem("bot_tts_voice") || "Algieba";

        let isCancelled = false;
        
        const handleBotMessageTTS = async (event: Event) => {
            const customEvent = event as CustomEvent;
            const textToSpeak = customEvent.detail.text;
            
            try {
                const ttsRes = await textToSpeech({ text: textToSpeak, voice: voiceRef.current as any });
                setAudioUrl(ttsRes.audioDataUri);
            } catch (error) {
                 console.error("Failed to generate TTS for bot message:", error);
            }
        };

        window.addEventListener('play-bot-tts', handleBotMessageTTS);

        function connect() {
            if (isCancelled || !wsUrl) return;
            
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                if (isCancelled) return;
                console.log('[WebSocket] VoiceCommander connected to server');
                ws.current?.send(JSON.stringify({
                    type: 'update-bot-settings',
                    payload: { 
                        personality: personalityRef.current,
                        voice: voiceRef.current
                    }
                }));
            };

            ws.current.onmessage = (event) => {
                if (isCancelled) return;
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'play-tts' && data.payload?.audioDataUri) {
                        setAudioUrl(data.payload.audioDataUri);
                    }
                } catch (error) {
                    console.error("Error parsing message in VoiceCommander:", error);
                }
            };

            ws.current.onclose = () => {
                if (isCancelled) return;
                setTimeout(connect, 5000);
            };
            
            ws.current.onerror = () => {
                if (isCancelled) return;
                ws.current?.close(); 
            };
        }

        connect();
        
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'bot_personality' && e.newValue) {
                personalityRef.current = e.newValue;
                 ws.current?.send(JSON.stringify({
                    type: 'update-bot-settings',
                    payload: { personality: e.newValue }
                }));
            }
             if (e.key === 'bot_tts_voice' && e.newValue) {
                voiceRef.current = e.newValue;
                 ws.current?.send(JSON.stringify({
                    type: 'update-bot-settings',
                    payload: { voice: e.newValue }
                }));
            }
        }
        window.addEventListener('storage', handleStorageChange);


        return () => {
            isCancelled = true;
            ws.current?.close();
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('play-bot-tts', handleBotMessageTTS);
        };
    }, []); 

    const processTranscription = async (transcription: string) => {
        if (!transcription || transcription === "Could not understand audio. Please try again.") {
            return;
        }

        // Prevent recursion
        if (isProcessing) {
            console.log('Already processing, skipping...');
            return;
        }

        const lowerTranscription = transcription.toLowerCase();
        
        // For AI Bot and Private modes, all voice input goes directly to AI (no "athena" prefix needed)
        if (destination === 'ai' || destination === 'private') {
            // Check if it starts with "athena" - this indicates a command
            if (lowerTranscription.startsWith('athena')) {
                // Check if it's a shoutout command
                if (lowerTranscription.includes('shout')) {
                    // Handle shoutout via AI
                    const newMessage: TranscribedMessage = { 
                        id: Date.now(), 
                        text: `Voice shoutout: ${transcription}`, 
                        status: 'pending', 
                        speaker: 'ai-input' 
                    };
                    setMessages(prev => [newMessage, ...prev.slice(0, 4)]);
                    setIsProcessing(true);

                    try {
                        const chattersResponse = await fetch('/api/chat/chatters');
                        let chatters = [];
                        if (chattersResponse.ok) {
                            const chattersData = await chattersResponse.json();
                            chatters = chattersData.chatters?.map((c: any) => c.user_display_name || c.user_login) || [];
                        }
                        
                        const aiPrompt = `Voice command: "${transcription}"
Active chatters: ${chatters.join(', ')}

Find the best matching username from the chatters list and respond with ONLY the shoutout command in this format: !so @username

If no good match, respond with: Could not find matching user`;
                        
                        const aiResponse = await fetch('/api/ai/generate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                prompt: aiPrompt,
                                temperature: 0.1,
                                maxOutputTokens: 50,
                            })
                        });
                        
                        if (aiResponse.ok) {
                            const aiData = await aiResponse.json();
                            const reply = aiData?.text?.trim();
                            
                            if (reply && reply.startsWith('!so @')) {
                                await sendTwitchMessage({ message: reply, as: 'broadcaster' });
                            }
                        }
                        
                        setMessages(prev => prev.map(msg => msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg));
                    } catch (error: any) {
                        console.error("Failed to process AI shoutout:", error);
                        setMessages(prev => prev.map(msg => msg.id === newMessage.id ? { ...msg, status: 'error' } : msg));
                    } finally {
                        setIsProcessing(false);
                    }
                    return;
                }
                
                // Other "athena [command]" - send to Twitch for server-side command processing
                await sendTwitchMessage({ message: transcription, as: 'broadcaster' });
                const newMessage: TranscribedMessage = { 
                    id: Date.now(), 
                    text: `Voice command: ${transcription}`, 
                    status: 'sent', 
                    speaker: 'commander' 
                };
                setMessages(prev => [newMessage, ...prev.slice(0, 4)]);
                return;
            }
            
            // Check if it contains "shout" without "athena" prefix
            if (lowerTranscription.includes('shout')) {
                // Handle shoutout via AI
                const newMessage: TranscribedMessage = { 
                    id: Date.now(), 
                    text: `Voice shoutout: ${transcription}`, 
                    status: 'pending', 
                    speaker: 'ai-input' 
                };
                setMessages(prev => [newMessage, ...prev.slice(0, 4)]);
                setIsProcessing(true);

                try {
                    const chattersResponse = await fetch('/api/chat/chatters');
                    let chatters = [];
                    if (chattersResponse.ok) {
                        const chattersData = await chattersResponse.json();
                        chatters = chattersData.chatters?.map((c: any) => c.user_display_name || c.user_login) || [];
                    }
                    
                    const aiPrompt = `Voice command: "${transcription}"
Active chatters: ${chatters.join(', ')}

Find the best matching username from the chatters list and respond with ONLY the shoutout command in this format: !so @username

If no good match, respond with: Could not find matching user`;
                    
                    const aiResponse = await fetch('/api/ai/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: aiPrompt,
                            temperature: 0.1,
                            maxOutputTokens: 50,
                        })
                    });
                    
                    if (aiResponse.ok) {
                        const aiData = await aiResponse.json();
                        const reply = aiData?.text?.trim();
                        
                        if (reply && reply.startsWith('!so @')) {
                            await sendTwitchMessage({ message: reply, as: 'broadcaster' });
                        }
                    }
                    
                    setMessages(prev => prev.map(msg => msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg));
                } catch (error: any) {
                    console.error("Failed to process AI shoutout:", error);
                    setMessages(prev => prev.map(msg => msg.id === newMessage.id ? { ...msg, status: 'error' } : msg));
                } finally {
                    setIsProcessing(false);
                }
                return;
            }
            
            // Regular AI conversation - use full transcription as message
            const aiMessage = transcription;
            
            const newMessage: TranscribedMessage = { id: Date.now(), text: aiMessage, status: 'pending', speaker: 'ai-input' };
            setMessages(prev => [newMessage, ...prev.slice(0, 4)]);
            setIsProcessing(true);

            try {
                // Define variables for Discord logging
                const aiChannelId = userConfig.NEXT_PUBLIC_DISCORD_AI_CHAT_CHANNEL_ID;
                const username = userConfig.TWITCH_BROADCASTER_USERNAME || 'Commander';

                // For non-private destinations, log to Discord
                if (destination !== 'private' && aiChannelId) {
                    const msgNum = await fetch('/api/counter/next', { method: 'POST' })
                        .then(res => res.json())
                        .then(data => data.number)
                        .catch(() => Date.now());
                    
                    sendDiscordMessage({ channelId: aiChannelId, message: `[${msgNum}][AI][U1] ${username}: "${aiMessage}"` }).catch(console.error);
                }

                // Generate AI response
                console.log('Using personality:', personalityRef.current);
                let reply: string | undefined;

                if (destination === 'private') {
                    const resp = await fetch('/api/private-chat/respond', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username,
                            message: aiMessage,
                            personality: personalityRef.current,
                            historyLimit: 20
                        })
                    });

                    if (!resp.ok) {
                        const err = await resp.json().catch(() => ({}));
                        throw new Error(err?.error || `Private chat AI failed: ${resp.status}`);
                    }

                    const data = await resp.json();
                    reply = data?.response?.trim();
                } else {
                    const prompt = `${personalityRef.current}\n\nYou are having a voice conversation with your Commander. Respond naturally and conversationally. Keep responses under 400 characters.\n\nCurrent message from Commander: ${aiMessage}\n\nRespond as Athena:`;
                    const aiResponse = await fetch('/api/ai/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt,
                            temperature: 0.8,
                            maxOutputTokens: 150,
                        })
                    });

                    if (aiResponse.ok) {
                        const aiData = await aiResponse.json();
                        reply = aiData?.text?.trim();
                    }
                }
                
                if (reply) {
                        if (destination !== 'private' && aiChannelId) {
                            const msgNum = await fetch('/api/counter/next', { method: 'POST' })
                                .then(res => res.json())
                                .then(data => data.number)
                                .catch(() => Date.now());
                            
                            sendDiscordMessage({ channelId: aiChannelId, message: `[${msgNum}][AI][U1] Athena: "${reply}"` }).catch(console.error);
                        }
                        
                        // Generate TTS
                        try {
                            const voiceMap: Record<string, string> = {
                                'Rachel': '21m00Tcm4TlvDq8ikWAM', 'Domi': 'AZnzlk1XvdvUeBnXmlld', 'Bella': 'EXAVITQu4vr4xnSDxMaL',
                                'Antoni': 'ErXwobaYiN019PkySvjV', 'Elli': 'MF3mGyEYCl7XYWbV9V6O', 'Josh': 'TxGEqnHWrfWFTfGW9XjX'
                            };
                            const voiceId = voiceMap[voiceRef.current] || '21m00Tcm4TlvDq8ikWAM';
                            
                            const ttsResponse = await fetch('/api/tts', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: reply, voice: voiceRef.current })
                            });

                            if (ttsResponse.ok) {
                                const { audioDataUri } = await ttsResponse.json();
                                if (audioDataUri) setAudioUrl(audioDataUri);
                            } else {
                                console.error('TTS API failed:', ttsResponse.status, ttsResponse.statusText);
                                // Fallback to Google Cloud TTS
                                try {
                                    const googleTTSResponse = await fetch('/api/google-tts', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ text: reply, voice: 'en-US-Wavenet-F' })
                                    });

                                    if (googleTTSResponse.ok) {
                                        const { audioContent } = await googleTTSResponse.json();
                                        setAudioUrl(`data:audio/mp3;base64,${audioContent}`);
                                        console.log('Using Google TTS fallback');
                                    }
                                } catch (googleError) {
                                    console.error('Google TTS fallback failed:', googleError);
                                }
                            }
                        } catch (ttsError) {
                            console.error('TTS generation failed:', ttsError);
                            // Fallback to Google Cloud TTS
                            try {
                                const googleTTSResponse = await fetch('/api/google-tts', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ text: reply, voice: 'en-US-Wavenet-F' })
                                });
                                
                                if (googleTTSResponse.ok) {
                                    const { audioContent } = await googleTTSResponse.json();
                                    setAudioUrl(`data:audio/mp3;base64,${audioContent}`);
                                    console.log('Using Google TTS fallback after error');
                                }
                            } catch (googleError) {
                                console.error('Google TTS fallback failed:', googleError);
                            }
                        }
                }
                
                setMessages(prev => prev.map(msg => msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg));
            } catch (error: any) {
                console.error("Failed to process AI conversation:", error);
                toast({ variant: "destructive", title: "Error", description: error.message });
                setMessages(prev => prev.map(msg => msg.id === newMessage.id ? { ...msg, status: 'error' } : msg));
            } finally {
                setIsProcessing(false);
            }
            return;
        }

        // For Twitch/Discord modes, require "athena" prefix
        if (lowerTranscription.startsWith('athena') && lowerTranscription.includes('shout')) {
            // (destination is twitch/discord here)
            await sendTwitchMessage({ message: transcription, as: 'broadcaster' });
            const newMessage: TranscribedMessage = { 
                id: Date.now(), 
                text: `Voice shoutout: ${transcription}`, 
                status: 'sent', 
                speaker: 'commander' 
            };
            setMessages(prev => [newMessage, ...prev.slice(0, 4)]);
            return;
        }

        if (lowerTranscription.startsWith('athena')) {
            // Force AI processing regardless of destination
            const aiMessage = transcription.replace(/^athena\s*/i, '');
            
            const newMessage: TranscribedMessage = { id: Date.now(), text: `Athena: ${aiMessage}`, status: 'pending', speaker: 'ai-input' };
            setMessages(prev => [newMessage, ...prev.slice(0, 4)]);
            setIsProcessing(true);

            try {
                const aiChannelId = userConfig.NEXT_PUBLIC_DISCORD_AI_CHAT_CHANNEL_ID || null;
                const username = userConfig.TWITCH_BROADCASTER_USERNAME || 'Commander';

                // Generate AI response
                console.log('Using personality:', personalityRef.current);
                let reply: string | undefined;

                const prompt = `${personalityRef.current}\n\nYou are having a voice conversation with your Commander. Respond naturally and conversationally. Keep responses under 400 characters.\n\nCurrent message from Commander: ${aiMessage}\n\nRespond as Athena:`;
                const aiResponse = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt,
                        temperature: 0.8,
                        maxOutputTokens: 150,
                    })
                });

                if (aiResponse.ok) {
                    const aiData = await aiResponse.json();
                    reply = aiData?.text?.trim();
                }

                if (reply) {
                        if (aiChannelId) {
                            const msgNum = await fetch('/api/counter/next', { method: 'POST' })
                                .then(res => res.json())
                                .then(data => data.number)
                                .catch(() => Date.now());
                            
                            sendDiscordMessage({ channelId: aiChannelId, message: `[${msgNum}][AI][U1] Athena: "${reply}"` }).catch(console.error);
                        }
                        
                        // Generate TTS - Google TTS as primary, ElevenLabs as fallback
                        try {
                            const googleTTSResponse = await fetch('/api/google-tts', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: reply, voice: 'en-US-Wavenet-F' })
                            });
                            
                            if (googleTTSResponse.ok) {
                                const { audioContent } = await googleTTSResponse.json();
                                setAudioUrl(`data:audio/mp3;base64,${audioContent}`);
                                console.log('Using Google TTS (primary)');
                            } else {
                                console.error('Google TTS failed:', googleTTSResponse.status, googleTTSResponse.statusText);
                                // Fallback to ElevenLabs
                                const voiceMap: Record<string, string> = {
                                    'Rachel': '21m00Tcm4TlvDq8ikWAM', 'Domi': 'AZnzlk1XvdvUeBnXmlld', 'Bella': 'EXAVITQu4vr4xnSDxMaL',
                                    'Antoni': 'ErXwobaYiN019PkySvjV', 'Elli': 'MF3mGyEYCl7XYWbV9V6O', 'Josh': 'TxGEqnHWrfWFTfGW9XjX'
                                };
                                const voiceId = voiceMap[voiceRef.current] || '21m00Tcm4TlvDq8ikWAM';
                                
                                const ttsResponse = await fetch('/api/tts', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ text: reply, voice: voiceRef.current })
                                });

                                if (ttsResponse.ok) {
                                    const { audioDataUri } = await ttsResponse.json();
                                    if (audioDataUri) setAudioUrl(audioDataUri);
                                    console.log('Using ElevenLabs TTS (fallback)');
                                } else {
                                    console.error('ElevenLabs TTS fallback also failed:', ttsResponse.status);
                                }
                            }
                        } catch (ttsError) {
                            console.error('TTS generation failed:', ttsError);
                        }
                }
                
                setMessages(prev => prev.map(msg => msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg));
            } catch (error: any) {
                console.error("Failed to process Athena command:", error);
                toast({ variant: "destructive", title: "Error", description: error.message });
                setMessages(prev => prev.map(msg => msg.id === newMessage.id ? { ...msg, status: 'error' } : msg));
            } finally {
                setIsProcessing(false);
            }
            return;
        }

        // Continue with normal processing based on destination
        let processedText = transcription;

        const speakerForHistory: TranscribedMessage['speaker'] = 'commander';
        const newMessage: TranscribedMessage = { id: Date.now(), text: processedText, status: 'pending', speaker: speakerForHistory };
        setMessages(prev => [newMessage, ...prev.slice(0, 4)]);
        setIsProcessing(true);

        try {
            const speaker: Speaker = sendAsCommander ? 'broadcaster' : 'bot';

            if (destination === 'twitch') {
                await sendTwitchMessage({ message: processedText, as: speaker });
            } else if (destination === 'discord') {
                const shoutoutChannelId = userConfig.NEXT_PUBLIC_DISCORD_SHOUTOUT_CHANNEL_ID;
                if (!shoutoutChannelId) throw new Error("Discord shoutout channel ID not configured.");
                await sendDiscordMessage({ channelId: shoutoutChannelId, message: processedText });
            }

            setMessages(prev => prev.map(msg => msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg));

        } catch (error: any) {
            console.error("Failed to process transcription:", error);
            toast({
                variant: "destructive",
                title: "Error Sending Message",
                description: error.message || "An unknown error occurred.",
            });
            setMessages(prev => prev.map(msg => msg.id === newMessage.id ? { ...msg, status: 'error' } : msg));
        } finally {
            setIsProcessing(false);
        }
    };

    const startRecording = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                audioChunksRef.current = [];

                mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);

                mediaRecorderRef.current.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = async () => {
                        setIsTranscribing(true);
                        try {
                            const base64DataUri = reader.result as string;
                            const result = await transcribeAudio(base64DataUri.split(',')[1]);
                            if (result.error) throw new Error(result.error);
                            await processTranscription(result.transcription);
                        } catch (error: any) {
                            toast({ variant: "destructive", title: "Transcription Failed", description: error.message });
                        } finally {
                            setIsTranscribing(false);
                            stream.getTracks().forEach(track => track.stop());
                        }
                    };
                };

                mediaRecorderRef.current.start();
                setIsRecording(true);
            } catch (err) {
                toast({ variant: "destructive", title: "Microphone Access Denied" });
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };
    
    const handleMicClick = () => isRecording ? stopRecording() : startRecording();

    const getStatusText = () => {
        if (isRecording) return "Recording... Click to stop.";
        if (isTranscribing) return "Transcribing...";
        if (isProcessing) return "Processing...";
        return "Push to talk";
    }

    const commanderBody = (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center gap-4">
                <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                        onClick={handleMicClick}
                        disabled={isTranscribing || isProcessing}
                        className={cn("w-28 h-28 rounded-full transition-colors", isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90')}
                    >
                        {isTranscribing || isProcessing ? <LoaderCircle className="h-12 w-12 animate-spin" /> : <Mic className="h-12 w-12" />}
                    </Button>
                </motion.div>
                <p className="text-sm text-muted-foreground">{getStatusText()}</p>
            </div>
            <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <h4 className="font-medium mb-2">Destination</h4>
                        <RadioGroup value={destination} onValueChange={(v) => setDestination(v as Destination)} className="flex flex-wrap gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="private" id="dest-private" />
                                <Label htmlFor="dest-private" className="flex items-center gap-2 cursor-pointer"><Bot /> Private</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="ai" id="dest-ai" />
                                <Label htmlFor="dest-ai" className="flex items-center gap-2 cursor-pointer"><Bot /> AI Bot</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="twitch" id="dest-twitch" />
                                <Label htmlFor="dest-twitch" className="flex items-center gap-2 cursor-pointer"><TwitchIcon /> Twitch</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="discord" id="dest-discord" />
                                <Label htmlFor="dest-discord" className="flex items-center gap-2 cursor-pointer"><DiscordIcon /> Discord</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <div className={cn("flex items-center space-x-2", (destination === 'ai' || destination === 'private') && 'opacity-50')}>
                        <Switch id="send-as-commander" checked={sendAsCommander} onCheckedChange={setSendAsCommander} disabled={destination === 'ai' || destination === 'private'} />
                        <Label htmlFor="send-as-commander">Send as Commander</Label>
                    </div>
                </div>
                <div>
                    <h4 className="font-medium mb-2">History</h4>
                    <ScrollArea className="h-32">
                        <div className="space-y-2">
                            {messages.length > 0 ? (
                                messages.map(msg => (
                                    <div key={msg.id} className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md flex gap-2 items-center">
                                       {msg.speaker === 'ai-input' ? <Bot className="h-4 w-4 shrink-0" /> : <User className="h-4 w-4 shrink-0"/>}
                                       <span className={cn("truncate", msg.status === 'error' && 'text-destructive')}>"{msg.text}"</span> 
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground italic text-center py-4">No messages yet. Use the microphone to start.</p>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );

    const audioElement = audioUrl && (
        <audio
            src={audioUrl}
            autoPlay
            onEnded={() => setAudioUrl(null)}
            onError={() => setAudioUrl(null)}
            className="hidden"
        />
    );

    if (variant === 'embedded') {
        return (
            <div className={cn("space-y-4", className)}>
                <div>
                    <h3 className="text-lg font-semibold">Voice Commander</h3>
                    <p className="text-sm text-muted-foreground">Use your voice to control your stream and interact with your bot.</p>
                </div>
                {commanderBody}
                {audioElement}
            </div>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>Voice Commander</CardTitle>
                <CardDescription>Use your voice to control your stream and interact with your bot.</CardDescription>
            </CardHeader>
            <CardContent>
                {commanderBody}
            </CardContent>
            {audioElement}
        </Card>
    );
}

    
