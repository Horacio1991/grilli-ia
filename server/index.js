import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { createApp } from './app.js';
import { MAX_HISTORY_MESSAGES } from './config.js';

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

if (!apiKey) console.warn('GEMINI_API_KEY falta. El servidor inicia, pero el chat responderá con un error amigable.');

async function generateAnswer({ systemPrompt, messages }) {
  const contents = messages.slice(-MAX_HISTORY_MESSAGES).map(({ role, content }) => ({
    role: role === 'assistant' ? 'model' : 'user', parts: [{ text: content }],
  }));
  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          isEducational: { type: 'BOOLEAN' },
          answer: { type: 'STRING' },
        },
        required: ['isEducational', 'answer'],
      },
      temperature: 0.35,
      maxOutputTokens: 1200,
    },
  });
  return JSON.parse(response.text);
}

const app = createApp({ generateAnswer: ai ? generateAnswer : undefined, hasApiKey: Boolean(ai) });
const port = Number(process.env.PORT) || 3001;
app.listen(port, '0.0.0.0', () => console.log(`Backend Grilli IA listo en http://localhost:${port}`));
