import { NextRequest, NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import serviceAccount from '../../../../firebase-service-account.json';

let ttsClient: TextToSpeechClient | null = null;

function getTTSClient(): TextToSpeechClient {
    if (!ttsClient) {
        ttsClient = new TextToSpeechClient({
            credentials: {
                client_email: serviceAccount.client_email,
                private_key: serviceAccount.private_key,
            },
            projectId: serviceAccount.project_id,
        });
    }
    return ttsClient;
}

export async function POST(request: NextRequest) {
    try {
        const { text, voice = 'en-US-Wavenet-F' } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const client = getTTSClient();

        const [response] = await client.synthesizeSpeech({
            input: { text },
            voice: { 
                languageCode: 'en-US', 
                name: voice,
                ssmlGender: 'FEMALE'
            },
            audioConfig: { audioEncoding: 'MP3' },
        });

        return NextResponse.json({ 
            audioContent: response.audioContent?.toString('base64') 
        });

    } catch (error) {
        console.error('Google TTS API Error:', error);
        return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
    }
}