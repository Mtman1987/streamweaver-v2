import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json();
    const elevenlabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenlabsKey) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    console.log('[TTS] Using ElevenLabs API');

    // Map voice names to ElevenLabs voice IDs
    const voiceMap: Record<string, string> = {
      'Rachel': '21m00Tcm4TlvDq8ikWAM',
      'Domi': 'AZnzlk1XvdvUeBnXmlld',
      'Bella': 'EXAVITQu4vr4xnSDxMaL',
      'Antoni': 'ErXwobaYiN019PkySvjV',
      'Elli': 'MF3mGyEYCl7XYWbV9V6O',
      'Josh': 'TxGEqnHWrfWFTfGW9XjX',
      'Arnold': 'VR6AewLTigWG4xSOukaG',
      'Adam': 'pNInz6obpgDQGcFmaJgB',
      'Sam': 'yoZ06aMxZJJ28mfd3POQ',
      'Nicole': 'piTKgcLEGmPE4e6mEKli',
      'Glinda': 'z9fAnlkpzviPz146aGWa',
      'Mimi': 'zrHiDhphv9ZnVXBqCLjz',
      'Freya': 'jsCqWAovK2LkecY7zXl4',
      'Grace': 'oWAxZDx7w5VEj9dCyTzz',
      'Daniel': 'onwK4e9ZLuTAKqWW03F9',
      'Lily': 'pFGqcJuEUvpDKhWRSBjb',
      'Serena': 'pMsXgVXv3BLzUgSXRplE',
      'Adam (v2)': 'pNInz6obpgDQGcFmaJgB',
      'Clyde': '2EiwWnXFnvU5JabPnv8n',
      'Dave': 'CYw3kZ02Hs0563khs1Fj',
      'Fin': 'D38z5RcWu1voky8WS1ja',
      'Sarah': 'EXAVITQu4vr4xnSDxMaL',
      'Antoni (v2)': 'ErXwobaYiN019PkySvjV',
      'Thomas': 'GBv7mTt0atIp3Br8iCZE',
      'Charlie': 'IKne3meq5aSn9XLyUdCD',
      'Emily': 'LcfcDJNUP1GQjkzn1xUU',
      'Elli (v2)': 'MF3mGyEYCl7XYWbV9V6O',
      'Callum': 'N2lVS1w4EtoT3dr4eOWO',
      'Patrick': 'ODq5zmih8GrVes37Dizd',
      'Harry': 'SOYHLrjzK2X1ezoPC6cr',
      'Liam': 'TX3LPaxmHKxFdv7VOQHJ',
      'Dorothy': 'ThT5KcBeYPX3keUQqHPh',
      'Josh (v2)': 'TxGEqnHWrfWFTfGW9XjX',
      'Arnold (v2)': 'VR6AewLTigWG4xSOukaG',
      'Charlotte': 'XB0fDUnXU5powFXDhCwa',
      'Alice': 'Xb7hH8MSUJpSbSDYk0k2',
      'Matilda': 'XrExE9yKIg1WjnnlVkGX',
      'James': 'ZQe5CZNOzWyzPSCn5a3c',
    };

    const voiceName = typeof voice === 'string' ? voice : 'Rachel';
    const voiceId = voiceMap[voiceName] || '21m00Tcm4TlvDq8ikWAM'; // Default to Rachel

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenlabsKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error('[TTS] ElevenLabs error:', response.status, details);
      return NextResponse.json(
        { error: 'ElevenLabs TTS failed', status: response.status, details },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    return NextResponse.json({
      audioDataUri: `data:audio/mpeg;base64,${base64Audio}`,
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}