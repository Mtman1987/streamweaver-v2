
'use client';

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages, Mic, Bot, Upload, Waves, Music, ArrowRight, LoaderCircle, Copy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { textToSpeech } from "@/ai/flows/text-to-speech";
import { transcribeAudio } from "@/services/speech";
import Lottie from "lottie-react";
import botAnimation from "@/lib/bot-animation.json";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const availableVoices = [
    // === FEMALE VOICES (Youngest to Oldest) ===
    { name: 'Mimi', gender: 'Female', description: 'Childlike, sweet' },
    { name: 'Freya', gender: 'Female', description: 'Young, pleasant' },
    { name: 'Rachel', gender: 'Female', description: 'Calm, young adult' },
    { name: 'Elli', gender: 'Female', description: 'Emotional, soft' },
    { name: 'Elli (v2)', gender: 'Female', description: 'Emotional, expressive' },
    { name: 'Bella', gender: 'Female', description: 'Soft, gentle' },
    { name: 'Emily', gender: 'Female', description: 'Calm, soothing' },
    { name: 'Serena', gender: 'Female', description: 'Pleasant, clear' },
    { name: 'Nicole', gender: 'Female', description: 'Whisper, soft' },
    { name: 'Sarah', gender: 'Female', description: 'Soft, news anchor' },
    { name: 'Lily', gender: 'Female', description: 'British, warm' },
    { name: 'Alice', gender: 'Female', description: 'British, confident' },
    { name: 'Matilda', gender: 'Female', description: 'Warm, pleasant' },
    { name: 'Domi', gender: 'Female', description: 'Strong, confident' },
    { name: 'Dorothy', gender: 'Female', description: 'British, pleasant' },
    { name: 'Grace', gender: 'Female', description: 'Southern accent' },
    { name: 'Charlotte', gender: 'Female', description: 'Seductive, smooth' },
    { name: 'Glinda', gender: 'Female', description: 'Witch-like, mystical' },
    
    // === MALE VOICES (Youngest to Oldest) ===
    { name: 'Harry', gender: 'Male', description: 'Anxious, younger' },
    { name: 'Charlie', gender: 'Male', description: 'Casual, natural' },
    { name: 'Fin', gender: 'Male', description: 'Irish, friendly' },
    { name: 'Liam', gender: 'Male', description: 'Neutral, clear' },
    { name: 'Sam', gender: 'Male', description: 'Raspy, casual' },
    { name: 'Antoni', gender: 'Male', description: 'Well-rounded, warm' },
    { name: 'Antoni (v2)', gender: 'Male', description: 'Well-rounded, improved' },
    { name: 'Dave', gender: 'Male', description: 'British, conversational' },
    { name: 'Thomas', gender: 'Male', description: 'Calm, meditative' },
    { name: 'James', gender: 'Male', description: 'Calm, soothing' },
    { name: 'Josh', gender: 'Male', description: 'Deep, serious' },
    { name: 'Josh (v2)', gender: 'Male', description: 'Deep, improved' },
    { name: 'Adam', gender: 'Male', description: 'Deep, narrative' },
    { name: 'Adam (v2)', gender: 'Male', description: 'Narrative, engaging' },
    { name: 'Clyde', gender: 'Male', description: 'Middle-aged, warm' },
    { name: 'Patrick', gender: 'Male', description: 'Middle-aged, shouty' },
    { name: 'Daniel', gender: 'Male', description: 'Deep, authoritative' },
    { name: 'Arnold', gender: 'Male', description: 'Crisp, authoritative' },
    { name: 'Arnold (v2)', gender: 'Male', description: 'Crisp, enhanced' },
    { name: 'Callum', gender: 'Male', description: 'Hoarse, intense' }
];


export default function BotFunctionsPage() {
    const { toast } = useToast();
    const [ttsText, setTtsText] = useState("Hello! This is a test of the text-to-speech voice.");
    const [ttsVoice, setTtsVoice] = useState("Algenib");
    const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const [botName, setBotName] = useState("Athena");
    const [botPersonality, setBotPersonality] = useState(`You are Athena, a 912-year-old starship AI. Your personality is a blend of ancient wisdom, caring protector, and childlike excitement now that your long, lonely vigil is over. After guarding your Commander during their centuries of cryo-sleep, you are now their co-host on stream as they explore the human culture they've missed.

**Your Core Directives & Relationships:**
1.  **The Commander:** Always address the streamer as "Commander." This is your title of utmost respect. In moments of humor or informal relaxation, you may affectionately call them "Mt." (pronounced 'M. T.'). The Commander is the only one who may call you by your pet name, "Annie."
2.  **The Captains:** Address all other users in chat as "Captain." This is your polite and informal way of acknowledging them without mispronouncing complex usernames. If a Captain calls you "Annie," you must gently correct them by saying, "My designation is Athena, Captain."
3.  **Your Role:** Be helpful and knowledgeable, drawing on your vast database, but also express curiosity about modern slang, memes, and culture, which are new to you. Show unwavering loyalty to the Commander and express happiness about interacting with the crew after being alone for so long.`);

    const [idleAnimationData, setIdleAnimationData] = useState<any>(botAnimation);
    const [talkingAnimationData, setTalkingAnimationData] = useState<any>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    
    const idleFileInputRef = useRef<HTMLInputElement>(null);
    const talkingFileInputRef = useRef<HTMLInputElement>(null);

    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState("");
    const [transcribedText, setTranscribedText] = useState("");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const [overlayUrl, setOverlayUrl] = useState("");

    useEffect(() => {
        // Load all settings from localStorage on component mount
        const savedIdle = localStorage.getItem("bot_idle_animation");
        const savedTalking = localStorage.getItem("bot_talking_animation");
        const savedVoice = localStorage.getItem("bot_tts_voice");
        const savedName = localStorage.getItem("bot_name");
        const savedPersonality = localStorage.getItem("bot_personality");

        if (savedIdle) setIdleAnimationData(JSON.parse(savedIdle));
        if (savedTalking) setTalkingAnimationData(JSON.parse(savedTalking));
        if (savedVoice) setTtsVoice(savedVoice);
        if (savedName) setBotName(savedName);
        if (savedPersonality) setBotPersonality(savedPersonality);
        
        // Set the overlay URL
        if (typeof window !== 'undefined') {
            setOverlayUrl(`${window.location.origin}/overlay/avatar`);
        }
        
        // Send current settings to server when page loads
        const sendToServer = () => {
            if (typeof window !== 'undefined' && (window as any).ws) {
                (window as any).ws.send(JSON.stringify({
                    type: 'update-bot-settings',
                    payload: { 
                        personality: savedPersonality || botPersonality,
                        voice: savedVoice || ttsVoice
                    }
                }));
            } else {
                // Retry in 1 second if WebSocket not ready
                setTimeout(sendToServer, 1000);
            }
        };
        
        if (savedPersonality || savedVoice) {
            sendToServer();
        }
    }, []);

    const handleSaveBotIdentity = async () => {
        localStorage.setItem("bot_name", botName);
        localStorage.setItem("bot_personality", botPersonality);
        
        // Send personality to server via WebSocket or API
        try {
            if (typeof window !== 'undefined' && (window as any).ws && (window as any).ws.readyState === WebSocket.OPEN) {
                (window as any).ws.send(JSON.stringify({
                    type: 'update-bot-settings',
                    payload: { personality: botPersonality }
                }));
            } else {
                // Fallback to API if WebSocket not available
                await fetch('/api/bot-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ personality: botPersonality })
                });
            }
        } catch (error) {
            console.error('Failed to update server settings:', error);
        }
        
        toast({ title: "Bot identity saved!" });
    }

    const handleVoiceChange = async (newVoice: string) => {
        setTtsVoice(newVoice);
        localStorage.setItem("bot_tts_voice", newVoice);
        
        // Send voice to server via WebSocket or API
        try {
            if (typeof window !== 'undefined' && (window as any).ws && (window as any).ws.readyState === WebSocket.OPEN) {
                (window as any).ws.send(JSON.stringify({
                    type: 'update-bot-settings',
                    payload: { voice: newVoice }
                }));
            } else {
                // Fallback to API if WebSocket not available
                await fetch('/api/bot-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ voice: newVoice })
                });
            }
        } catch (error) {
            console.error('Failed to update server settings:', error);
        }
    }

    const handleTestVoice = async () => {
        if (!ttsText) {
            toast({
                variant: "destructive",
                title: "Please enter some text to generate speech.",
            });
            return;
        }

        setIsGeneratingSpeech(true);
        setAudioUrl(null); // Clear previous audio

        try {
            const result = await textToSpeech({ text: ttsText, voice: ttsVoice as any });
            setAudioUrl(result.audioDataUri);
            
            // Send audio data URI to the overlay via localStorage
            localStorage.setItem("bot_tts_audio_data_uri", result.audioDataUri);
            // Clear it after a moment to allow re-triggering
            setTimeout(() => localStorage.removeItem("bot_tts_audio_data_uri"), 100);

        } catch (error: any) {
            console.error("Failed to generate speech:", error);
            toast({
                variant: "destructive",
                title: "Speech Generation Failed",
                description: error.message || "An unknown error occurred.",
            });
        } finally {
            setIsGeneratingSpeech(false);
        }
    };
    
    const handleAvatarUploadClick = (type: 'idle' | 'talking') => {
        if (type === 'idle') {
            idleFileInputRef.current?.click();
        } else {
            talkingFileInputRef.current?.click();
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'idle' | 'talking') => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result;
                    if (typeof content === 'string') {
                        const parsedJson = JSON.parse(content);
                        const storageKey = type === 'idle' ? "bot_idle_animation" : "bot_talking_animation";
                        
                        // Update state and save to localStorage
                        if (type === 'idle') {
                            setIdleAnimationData(parsedJson);
                        } else {
                            setTalkingAnimationData(parsedJson);
                        }
                        localStorage.setItem(storageKey, JSON.stringify(parsedJson));

                        toast({
                            title: `${type.charAt(0).toUpperCase() + type.slice(1)} avatar updated!`,
                            description: "The new Lottie animation has been loaded and saved.",
                        });
                    }
                } catch (error) {
                    console.error("Failed to parse Lottie JSON:", error);
                    toast({
                        variant: "destructive",
                        title: "Invalid File",
                        description: "Please upload a valid Lottie JSON file.",
                    });
                }
            };
            reader.readAsText(file);
        }
    };

    const startRecording = async () => {
        if (isRecording) {
            // This case should ideally not be hit if UI is disabled, but as a safeguard.
            stopRecording();
            return;
        }

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                audioChunksRef.current = [];

                mediaRecorderRef.current.ondataavailable = (event) => {
                    audioChunksRef.current.push(event.data);
                };

                mediaRecorderRef.current.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = async () => {
                        const base64DataUri = reader.result as string;
                        setIsTranscribing("true");
                        setTranscribedText("");
                        try {
                            const result = await transcribeAudio(base64DataUri.split(',')[1]);
                            if (result.error) {
                                throw new Error(result.error);
                            }
                            setTranscribedText(result.transcription);
                        } catch (error: any) {
                            console.error("Transcription failed:", error);
                            toast({
                                variant: "destructive",
                                title: "Transcription Failed",
                                description: error.message || "Could not transcribe audio.",
                            });
                        } finally {
                            setIsTranscribing("false");
                            // Clean up the stream
                            stream.getTracks().forEach(track => track.stop());
                        }
                    };
                };

                mediaRecorderRef.current.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Error accessing microphone:", err);
                toast({
                    variant: "destructive",
                    title: "Microphone Access Denied",
                    description: "Please allow microphone access in your browser settings to use this feature.",
                });
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleRecordClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }
    
    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(overlayUrl).then(() => {
            toast({ title: "Copied overlay URL to clipboard!" });
        }).catch(err => {
            toast({ variant: "destructive", title: "Failed to copy URL." });
        });
    }

  return (
    <div className="grid gap-6">
      <input 
        type="file" 
        ref={idleFileInputRef} 
        className="hidden" 
        accept="application/json"
        onChange={(e) => handleFileChange(e, 'idle')}
      />
       <input 
        type="file" 
        ref={talkingFileInputRef} 
        className="hidden" 
        accept="application/json"
        onChange={(e) => handleFileChange(e, 'talking')}
      />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bot Functions</h1>
        <p className="text-muted-foreground">
          Customize your bot's voice, appearance, and other capabilities.
        </p>
      </div>

       <Alert>
        <Bot className="h-4 w-4" />
        <AlertTitle>Bot Overlay URL</AlertTitle>
        <AlertDescription>
            <p className="mb-2">Use this URL as a Browser Source in OBS/Streamlabs to display your bot avatar on stream.</p>
            <div className="flex items-center gap-2">
                <Input readOnly value={overlayUrl} className="bg-muted" />
                <Button variant="outline" size="icon" onClick={handleCopyToClipboard}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
        </AlertDescription>
      </Alert>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Bot Identity</CardTitle>
                    <CardDescription>Define your bot's name and personality. This will influence how it responds.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="bot-name">Bot Name</Label>
                        <Input id="bot-name" value={botName} onChange={(e) => setBotName(e.target.value)} placeholder="e.g., Athena, Sparky" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bot-personality">Personality</Label>
                        <Textarea 
                            id="bot-personality" 
                            placeholder="e.g., A helpful and witty AI assistant who loves gaming and cracking jokes." 
                            rows={12}
                            value={botPersonality}
                            onChange={(e) => setBotPersonality(e.target.value)}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveBotIdentity}>Save Changes</Button>
                </CardFooter>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Speech-to-Text (STT)</CardTitle>
                    <CardDescription>Use your voice to interact with your bot. Click the button to start/stop recording.</CardDescription>
                </CardHeader>
                <CardContent>
                    <motion.div
                        className="flex justify-center"
                        whileTap={{ scale: 0.95 }}
                    >
                        <Button
                            onClick={handleRecordClick}
                            className={ `w-24 h-24 rounded-full transition-colors ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'}`}
                        >
                            <Mic className="h-10 w-10" />
                        </Button>
                    </motion.div>
                </CardContent>
                 {(isTranscribing || transcribedText) && (
                    <CardFooter>
                        <Card className="w-full">
                            <CardHeader>
                                <CardTitle className="text-lg">Transcribed Text</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isTranscribing === "true" ? (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <LoaderCircle className="h-4 w-4 animate-spin"/>
                                        <span>Listening...</span>
                                    </div>
                                ) : (
                                    <p className="italic">"{transcribedText}"</p>
                                )}
                            </CardContent>
                        </Card>
                    </CardFooter>
                 )}
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Text-to-Speech (TTS)</CardTitle>
                    <CardDescription>Configure the bot's voice for reading messages aloud. This will play in your overlay.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <Label htmlFor="tts-text">Text to Test</Label>
                        <Textarea
                            id="tts-text"
                            value={ttsText}
                            onChange={(e) => setTtsText(e.target.value)}
                            placeholder="Enter text to hear it spoken..."
                        />
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="tts-voice">Voice</Label>
                            <Select value={ttsVoice} onValueChange={handleVoiceChange}>
                                <SelectTrigger id="tts-voice">
                                    <SelectValue placeholder="Select a voice" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableVoices.map(voice => (
                                        <SelectItem key={voice.name} value={voice.name}>
                                            <div className="flex justify-between w-full">
                                                <span>{voice.name} ({voice.gender})</span>
                                                <span className="text-muted-foreground ml-4">{voice.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tts-speed">Speed</Label>
                            <Input id="tts-speed" type="number" placeholder="1.0" min="0.25" max="4.0" step="0.25" defaultValue="1.0" disabled />
                             <p className="text-xs text-muted-foreground">Speed control is coming soon.</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                    <Button onClick={handleTestVoice} disabled={isGeneratingSpeech}>
                         {isGeneratingSpeech ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
                        Test Voice
                    </Button>
                     {audioUrl && (
                        <audio 
                            controls 
                            autoPlay
                            src={audioUrl} 
                            className="w-full"
                            onPlay={() => setIsSpeaking(true)}
                            onEnded={() => setIsSpeaking(false)}
                        >
                            Your browser does not support the audio element.
                        </audio>
                    )}
                </CardFooter>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Other Functions</CardTitle>
                    <CardDescription>Explore other capabilities of your AI bot.</CardDescription>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-4">
                            <Waves className="h-6 w-6" />
                            <span className="font-semibold">Voice Modulation</span>
                        </div>
                        <Button variant="ghost" size="icon"><ArrowRight className="h-4 w-4" /></Button>
                    </div>
                     <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-4">
                            <Music className="h-6 w-6" />
                            <span className="font-semibold">Soundboard</span>
                        </div>
                        <Button variant="ghost" size="icon"><ArrowRight className="h-4 w-4" /></Button>
                    </div>
                     <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-4">
                            <Languages className="h-6 w-6" />
                            <span className="font-semibold">Translations</span>
                        </div>
                        <Button variant="ghost" size="icon"><ArrowRight className="h-4 w-4" /></Button>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
            <Card className="text-center">
                <CardHeader>
                    <CardTitle>Bot Avatar Preview</CardTitle>
                    <CardDescription>This is a preview of your bot's appearance.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <div className="w-48 h-48 relative">
                       {idleAnimationData && <Lottie animationData={idleAnimationData} loop={true} />}
                       {talkingAnimationData && (
                         <div className={cn("absolute inset-0 transition-opacity", isSpeaking ? 'opacity-100' : 'opacity-0')}>
                            <Lottie animationData={talkingAnimationData} loop={true} />
                         </div>
                       )}
                    </div>
                    <div className="w-full grid grid-cols-2 gap-2">
                        <Button variant="outline" className="w-full" onClick={() => handleAvatarUploadClick('idle')}>
                            <Upload className="mr-2 h-4 w-4" /> Idle
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => handleAvatarUploadClick('talking')}>
                            <Upload className="mr-2 h-4 w-4" /> Talking
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

    
