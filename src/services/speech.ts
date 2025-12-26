
'use server';

import { SpeechClient } from '@google-cloud/speech';
import serviceAccount from '../../firebase-service-account.json';

let speechClient: SpeechClient | null = null;

function getSpeechClient(): SpeechClient {
    if (!speechClient) {
        // Explicitly use the imported service account credentials
        speechClient = new SpeechClient({
            credentials: {
                client_email: serviceAccount.client_email,
                private_key: serviceAccount.private_key,
            },
            projectId: serviceAccount.project_id,
        });
    }
    return speechClient;
}

/**
 * Transcribes a base64 encoded audio string using Google Cloud Speech-to-Text v1 API.
 * @param base64Audio The base64 encoded audio data (without the data:audio/webm;base64, prefix).
 * @returns The transcription text.
 */
export async function transcribeAudio(base64Audio: string): Promise<{ transcription: string, error?: string}> {
    const client = getSpeechClient();
    
    const projectId = serviceAccount.project_id;
    if (!projectId) {
        console.error("Project ID is missing from service account.");
        return { transcription: "", error: "Server configuration error: Project ID is missing."};
    }
    
    const audio = {
        content: base64Audio,
    };
    
    const config = {
        encoding: 'WEBM_OPUS' as const,
        sampleRateHertz: 48000, // Common for webm from browsers
        languageCode: 'en-US',
        model: 'default', // Using a standard model for broad compatibility
    };
    
    const request = {
        audio: audio,
        config: config,
    };
    
    try {
        console.log("Sending transcription request to Speech-to-Text API (v1)...");
        const [response] = await client.recognize(request);
        
        const transcription = response.results
            ?.map(result => result.alternatives?.[0].transcript)
            .join('\n');
            
        if (!transcription) {
            console.log("Transcription result was empty or audio was not understood.");
            return { transcription: "Could not understand audio. Please try again." };
        }
        
        console.log("Transcription successful:", transcription);
        return { transcription };

    } catch (error: any) {
        console.error('ERROR in speech service (recognize v1):', error);
        return { transcription: "", error: `Speech API Error: ${error.message || "An unknown error occurred."}`};
    }
}
