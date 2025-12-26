import { genkit } from 'genkit';
import { googleAI, gemini20FlashExp } from '@genkit-ai/googleai';

export { z } from 'genkit';

// Back-compat: some parts of the project use GEMINI_API_KEY.
// Genkit's Google AI plugin expects GOOGLE_GENAI_API_KEY.
if (!process.env.GOOGLE_GENAI_API_KEY && process.env.GEMINI_API_KEY) {
  process.env.GOOGLE_GENAI_API_KEY = process.env.GEMINI_API_KEY;
}

export const ai = genkit({
  plugins: [googleAI()],
  model: gemini20FlashExp,
});

export const DEFAULT_MODEL = gemini20FlashExp;
