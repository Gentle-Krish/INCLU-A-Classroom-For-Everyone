import { STRONG_GEMMA_MODEL } from '../../constants';

const SPEECH_TYPE_MESSAGE = 'Speech could not be heard. Type the question.';

const usableGeminiKey = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const key = value.trim();
  if (key.length < 20) return '';
  if (/dummy|placeholder|your_gemini|your-api-key|changeme/i.test(key)) return '';
  return key;
};

const isQuota = (status: number, message: string) => {
  const raw = `${status} ${message}`.toLowerCase();
  return status === 429 || status === 402
    || raw.includes('resource_exhausted')
    || raw.includes('quota')
    || raw.includes('too many')
    || raw.includes('prepayment')
    || raw.includes('rate');
};

const modelForSavedKey = (selected: unknown): string => {
  if (typeof selected === 'string') {
    const name = selected.trim();
    if (name.startsWith('gemma-') && !/e2b/i.test(name)) return name;
  }
  return STRONG_GEMMA_MODEL;
};

const busy = (res: any, code: 'rate_limited' | 'missing_key') => res.status(code === 'missing_key' ? 503 : 429).json({
  error: SPEECH_TYPE_MESSAGE,
  code,
  retryable: false
});

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    body = body || {};

    const { base64Audio, selectedVertexModel, selectedGeminiModel, geminiApiKey } = body;
    if (!base64Audio || typeof base64Audio !== 'string') {
      return res.status(400).json({ error: 'Base64 audio data is required.' });
    }

    let audioMimeType = 'audio/webm';
    const mimeMatch = base64Audio.match(/^data:(audio\/[a-zA-Z0-9+.-]+);base64,/);
    if (mimeMatch) audioMimeType = mimeMatch[1];
    const cleanAudio = base64Audio.replace(/^data:audio\/[a-zA-Z0-9+.-]+;base64,/, '').trim();

    const personalKey = usableGeminiKey(geminiApiKey) || usableGeminiKey(process.env.GEMINI_API_KEY || process.env.API_KEY || '');
    if (personalKey) {
      const explicitSavedKey = usableGeminiKey(geminiApiKey);
      const key = explicitSavedKey || personalKey;
      const modelName = modelForSavedKey(selectedGeminiModel);
      const generationConfig: Record<string, unknown> = {
        temperature: 0.1,
        maxOutputTokens: 2048
      };
      if (!modelName.startsWith('gemma-')) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key
          },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { inlineData: { mimeType: audioMimeType, data: cleanAudio } },
                { text: 'Transcribe this audio exactly as spoken. Detect the language automatically and return the transcript in that same language. Return only the transcribed text — no commentary, no explanation, no punctuation corrections. If there is no human speech, return an empty string.' }
              ]
            }],
            generationConfig
          })
        }
      );

      const data = await geminiRes.json().catch(() => ({}));
      if (!geminiRes.ok) {
        const message = data?.error?.message || geminiRes.statusText || '';
        if (isQuota(geminiRes.status, message)) return busy(res, 'rate_limited');
        return res.status(geminiRes.status || 500).json({
          error: 'Could not transcribe the audio.',
          code: 'server_error',
          retryable: false
        });
      }

      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      text = text.replace(/^["']|["']$/g, '').trim();
      return res.status(200).json({ text });
    }

    const rawModel = selectedVertexModel || process.env.VERTEX_MODEL || 'gemini-3.8-flash';
    const modelName = (rawModel === 'gemini-3.7-flash' ? 'gemini-3.8-flash' : rawModel).trim();

    const { GoogleAuth } = await import('google-auth-library');
    const adcRaw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const credentials = adcRaw ? JSON.parse(adcRaw.trim()) : undefined;

    const auth = new GoogleAuth({
      ...(credentials ? { credentials } : {}),
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
    const token = (await client.getAccessToken()).token;

    const projectId = (process.env.GOOGLE_CLOUD_PROJECT || '').trim();
    const location = (process.env.GOOGLE_CLOUD_LOCATION || 'global').trim();
    const host = location === 'global' ? 'aiplatform.googleapis.com' : `${location}-aiplatform.googleapis.com`;
    const url = `https://${host}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelName}:generateContent`;

    const vertexRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: audioMimeType, data: cleanAudio } },
            { text: 'Accurately transcribe this audio recording into text. Capture educational terms, whiteboard instructions, formulas, or questions clearly and accurately. Return ONLY the raw transcription text without opening/closing quotation marks or additional notes.' }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    });

    const data = await vertexRes.json().catch(() => ({}));
    if (!vertexRes.ok) {
      const message = data?.error?.message || vertexRes.statusText || '';
      if (isQuota(vertexRes.status, message)) return busy(res, 'rate_limited');
      throw new Error(message || 'Could not transcribe the audio.');
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.replace(/^["']|["']$/g, '').trim();
    return res.status(200).json({ text });
  } catch {
    return res.status(500).json({
      error: 'Could not transcribe the audio.',
      code: 'server_error',
      retryable: false
    });
  }
}
