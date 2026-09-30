import express from 'express';
import { MODEL, MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH } from './config.js';
import { OUT_OF_SCOPE_MESSAGE, SYSTEM_PROMPT } from './prompt.js';

function cleanPersonalDetails(text) {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[correo omitido; recomendá no compartir datos personales]')
    .replace(/\b(?:DNI|documento(?: nacional(?: de identidad)?)?)\s*(?:n[°º.]?\s*)?[:#-]?\s*\d{7,8}\b/gi, '[documento omitido; recomendá no compartir datos personales]')
    .replace(/\b(?:tel[eé]fono|celular|whatsapp|n[uú]mero de contacto)\s*(?:es|:)?\s*\+?[\d\s().-]{8,20}\d/gi, '[teléfono omitido; recomendá no compartir datos personales]');
}

export function createApp({ generateAnswer, hasApiKey = true } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '48kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.post('/api/chat', async (req, res) => {
    if (!hasApiKey || !generateAnswer) {
      return res.status(503).json({ error: 'service_unavailable' });
    }
    const { messages } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length < 1 || messages.length > MAX_HISTORY_MESSAGES) {
      return res.status(400).json({ error: 'invalid_request' });
    }
    const valid = messages.every((item) => item && ['user', 'assistant'].includes(item.role)
      && typeof item.content === 'string' && item.content.trim().length > 0
      && item.content.length <= MAX_MESSAGE_LENGTH);
    if (!valid || messages.at(-1)?.role !== 'user') {
      return res.status(400).json({ error: 'invalid_request' });
    }

    try {
      const safeMessages = messages.map(({ role, content }) => ({ role, content: cleanPersonalDetails(content) }));
      const result = await generateAnswer({ model: MODEL, systemPrompt: SYSTEM_PROMPT, messages: safeMessages });
      if (!result || typeof result.isEducational !== 'boolean') throw new Error('invalid_model_response');
      if (!result.isEducational) return res.json({ answer: OUT_OF_SCOPE_MESSAGE });
      if (typeof result.answer !== 'string' || !result.answer.trim()) throw new Error('empty_model_response');
      return res.json({ answer: result.answer.trim() });
    } catch (error) {
      console.error('Gemini request failed:', error?.status || error?.name || 'unknown');
      return res.status(502).json({ error: 'generation_failed' });
    }
  });

  app.use((error, _req, res, _next) => {
    if (error?.type === 'entity.too.large' || error instanceof SyntaxError) {
      return res.status(400).json({ error: 'invalid_request' });
    }
    return res.status(500).json({ error: 'server_error' });
  });
  return app;
}
