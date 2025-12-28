import { NextRequest, NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { getBrokerAuthHeaders, getBrokerBaseUrl, joinBrokerUrl } from '@/lib/broker';

let ttsClient: TextToSpeechClient | null = null;

type ServiceAccountJson = {
    project_id?: string;
    client_email?: string;
    private_key?: string;
};

function getServiceAccountFromEnv(): ServiceAccountJson | null {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON;
    if (!raw) return null;
    try {
        return JSON.parse(raw) as ServiceAccountJson;
    } catch (error) {
        console.error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON:', error);
        return null;
    }
}

function getTTSClient(): TextToSpeechClient {
    if (!ttsClient) {
        const serviceAccount = getServiceAccountFromEnv();
        if (serviceAccount?.client_email && serviceAccount?.private_key) {
            ttsClient = new TextToSpeechClient({
                credentials: {
                    client_email: serviceAccount.client_email,
                    private_key: serviceAccount.private_key,
                },
                projectId: serviceAccount.project_id,
            });
        } else {
            // Relies on Application Default Credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS)
            ttsClient = new TextToSpeechClient();
        }
    }
    return ttsClient;
}

export async function POST(request: NextRequest) {
    try {
        const { text, voice = 'en-US-Wavenet-F' } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const brokerBaseUrl = getBrokerBaseUrl();
        if (brokerBaseUrl) {
            const upstream = await fetch(joinBrokerUrl(brokerBaseUrl, '/v1/google-tts'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(await getBrokerAuthHeaders()),
                },
                body: JSON.stringify({ text, voice }),
            });

            const contentType = upstream.headers.get('content-type') || 'application/json';
            const payload = await upstream.text();
            return new NextResponse(payload, {
                status: upstream.status,
                headers: { 'Content-Type': contentType },
            });
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