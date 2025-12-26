
'use client';

import { useState, useEffect, useRef } from 'react';
import Lottie from 'lottie-react';
import { cn } from '@/lib/utils';
import botAnimation from "@/lib/bot-animation.json";

export default function AvatarOverlayPage() {
    const [idleAnimationData, setIdleAnimationData] = useState<any>(botAnimation);
    const [talkingAnimationData, setTalkingAnimationData] = useState<any>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const visibilityTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Function to handle hiding the avatar after a delay
    const scheduleHide = () => {
        // Clear any existing timer
        if (visibilityTimerRef.current) {
            clearTimeout(visibilityTimerRef.current);
        }
        // Set a new timer to hide the avatar after 90 seconds
        visibilityTimerRef.current = setTimeout(() => {
            setIsVisible(false);
        }, 90000); // 90 seconds
    };

    useEffect(() => {
        // Load initial animations from localStorage
        const savedIdle = localStorage.getItem("bot_idle_animation");
        const savedTalking = localStorage.getItem("bot_talking_animation");
        if (savedIdle) setIdleAnimationData(JSON.parse(savedIdle));
        if (savedTalking) setTalkingAnimationData(JSON.parse(savedTalking));

        // Listen for storage changes from other tabs/windows
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'bot_idle_animation' && event.newValue) {
                setIdleAnimationData(JSON.parse(event.newValue));
            }
            if (event.key === 'bot_talking_animation' && event.newValue) {
                setTalkingAnimationData(JSON.parse(event.newValue));
            }
            if (event.key === 'bot_tts_audio_data_uri' && event.newValue) {
                // When new audio comes in, make the avatar visible immediately
                setIsVisible(true);
                // Clear any pending hide timer because we are about to speak
                if (visibilityTimerRef.current) {
                    clearTimeout(visibilityTimerRef.current);
                }
                setAudioUrl(event.newValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            if (visibilityTimerRef.current) {
                clearTimeout(visibilityTimerRef.current);
            }
        };
    }, []);

    const handlePlay = () => {
        setIsSpeaking(true);
        setIsVisible(true); // Ensure visible when playing
        // Clear any pending hide timer
        if (visibilityTimerRef.current) {
            clearTimeout(visibilityTimerRef.current);
        }
    };

    const handleEnded = () => {
        setIsSpeaking(false);
        setAudioUrl(null); // Clear audio after playing
        scheduleHide(); // Schedule to hide after idle period
    };
    
    const handleError = () => {
        setIsSpeaking(false);
        setAudioUrl(null);
        scheduleHide(); // Also schedule hide on error
    };

    return (
        <div className="relative w-screen h-screen bg-transparent">
            {/* The container can be sized and positioned via OBS/Streamlabs */}
            <div className={cn(
                "absolute bottom-0 left-0 w-[300px] h-[300px] transition-opacity duration-500",
                isVisible ? "opacity-100" : "opacity-0"
            )}>
                <div className="relative w-full h-full">
                    {idleAnimationData && <Lottie animationData={idleAnimationData} loop={true} />}
                    {talkingAnimationData && (
                        <div className={cn("absolute inset-0 transition-opacity duration-200", isSpeaking ? 'opacity-100' : 'opacity-0')}>
                            <Lottie animationData={talkingAnimationData} loop={true} />
                        </div>
                    )}
                </div>
            </div>

            {audioUrl && (
                <audio
                    src={audioUrl}
                    autoPlay
                    onPlay={handlePlay}
                    onEnded={handleEnded}
                    onError={handleError}
                >
                    Your browser does not support the audio element.
                </audio>
            )}
        </div>
    );
}
