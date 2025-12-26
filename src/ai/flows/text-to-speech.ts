
export type TextToSpeechInput = {
  text: string;
  voice: string;
};

export type TextToSpeechOutput = {
  audioDataUri: string;
};

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: input.text,
        voice: input.voice
      })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        audioDataUri: data.audioDataUri
      };
    }
  } catch (error) {
    console.error('TTS error:', error);
  }

  // Fallback to browser TTS
  return new Promise((resolve) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(input.text);
      utterance.onend = () => {
        resolve({
          audioDataUri: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAA=='
        });
      };
      speechSynthesis.speak(utterance);
    } else {
      resolve({
        audioDataUri: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAA=='
      });
    }
  });
}

export const textToSpeechFlow = textToSpeech;
