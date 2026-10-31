import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { tools, buildSystemInstruction, validateFunctionCalls, extractThinking, getCapability } from "../../server/aiTools";
import { CONFIG, GEMINI_MODEL } from "../../constants";

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

    const {
      prompt,
      canvasImageBase64,
      canvasObjects = [],
      viewport = { width: 1920, height: 1080 },
      highResInputImage,
      history = [],
      pageContext,
      domElements = {},
      selectedVertexModel,
      selectedGeminiModel,
      geminiApiKey,
      intent,
      forceTools,
      lessonContext
    } = body;

    // Resolve API key: prefer client-provided, then env vars
    const apiKey = (geminiApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
    if (!apiKey || apiKey.length < 10) {
      return res.status(401).json({
        error: 'A Gemini API key is required. Set it in Settings or in the GEMINI_API_KEY environment variable.',
        code: 'invalid_key',
        retryable: false
      });
    }

    const rawModel = selectedGeminiModel || selectedVertexModel || process.env.GEMINI_MODEL || GEMINI_MODEL;
    const modelName = (rawModel === 'gemini-3.7-flash' ? 'gemini-3.8-flash' : rawModel).trim();
    // Filter out offline/local model names
    const selectedModel = /e2b|inclu-gemma/i.test(modelName) ? GEMINI_MODEL : modelName;

    const extractImagePayload = (rawUri?: string | null) => {
      if (!rawUri || typeof rawUri !== 'string') return null;
      const trimmed = rawUri.trim();
      if (!trimmed || trimmed.length < 50) return null;
      const match = trimmed.match(/^data:([a-zA-Z0-9+.-]+\/[a-zA-Z0-9+.-]+);base64,(.+)$/s);
      if (match && match[2] && match[2].trim().length > 50) {
        return { mimeType: match[1], data: match[2].trim() };
      }
      if (!trimmed.startsWith('data:') && trimmed.length > 50) {
        return { mimeType: 'image/png', data: trimmed };
      }
      return null;
    };

    const canvasPayload = extractImagePayload(canvasImageBase64);
    const inputImagePayload = extractImagePayload(highResInputImage);

    const capability = getCapability(selectedModel);
    let systemInstruction = buildSystemInstruction(canvasObjects, viewport, pageContext, domElements, lessonContext, capability);

    const intentInstruction = intent === 'question'
      ? '\n\nNOTE: User is asking a QUESTION. Prioritize a helpful text answer. Only use tools if visualization would genuinely help.'
      : intent === 'creation'
      ? '\n\nNOTE: User wants to CREATE something. Use tools immediately. Explain briefly what you made in your text response.'
      : '';

    systemInstruction += intentInstruction;

    // Build strictly alternating history
    const cleanHistory = (Array.isArray(history) ? history : [])
      .filter((h: any) => h && typeof h.text === 'string' && h.text.trim().length > 0);

    if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user') {
      cleanHistory.pop();
    }

    let startIdx = 0;
    while (startIdx < cleanHistory.length && cleanHistory[startIdx].role === 'model') {
      startIdx++;
    }

    const alternatingHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    for (let i = startIdx; i < cleanHistory.length; i++) {
      const item = cleanHistory[i];
      const prev = alternatingHistory[alternatingHistory.length - 1];
      if (prev && prev.role === item.role) {
        prev.parts[0].text += '\n' + item.text.trim();
      } else {
        alternatingHistory.push({
          role: item.role === 'model' ? 'model' : 'user',
          parts: [{ text: item.text.trim() }]
        });
      }
    }

    const currentParts: any[] = [];
    if (canvasPayload?.data) {
      currentParts.push({ inlineData: { mimeType: canvasPayload.mimeType, data: canvasPayload.data } });
    }
    if (inputImagePayload?.data) {
      currentParts.push({ inlineData: { mimeType: inputImagePayload.mimeType, data: inputImagePayload.data } });
    }
    currentParts.push({
      text: `User request: ${prompt}\n\nRemember: Use function calls for all visual artifacts, batching actions together, and explain in clear text.`
    });

    const contents = [
      ...alternatingHistory,
      {
        role: "user" as const,
        parts: currentParts
      }
    ];

    // Use Google GenAI SDK with API key (no GCP project needed)
    const ai = new GoogleGenAI({ apiKey });

    /** Gemma on the Gemini API rejects thinkingConfig. */
    const thinkingConfig = selectedModel.startsWith('gemma-')
      ? undefined
      : { thinkingBudget: (prompt.length > 300) ? 1024 : 0 };

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        tools: [{ functionDeclarations: tools }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.AUTO
          }
        },
        systemInstruction,
        temperature: CONFIG.ai.gemini.generation.temperature,
        maxOutputTokens: CONFIG.ai.gemini.generation.maxOutputTokens,
        ...(thinkingConfig ? { thinkingConfig } : {})
      }
    });

    // Extract text AND function calls from raw parts
    const _candidate = (response as any).candidates?.[0];
    const _parts: any[] = _candidate?.content?.parts || [];
    const textResponse = _parts
      .filter((p: any) => p.text && !p.thought)
      .map((p: any) => p.text)
      .join('') || '';
    let functionCalls: any[] = _parts
      .filter((p: any) => p.functionCall)
      .map((p: any) => ({ name: p.functionCall.name, args: p.functionCall.args || {} }));
    const thought = extractThinking(response);

    const validation = validateFunctionCalls(functionCalls, canvasObjects, domElements);
    if (!validation.isValid) {
      functionCalls = validation.fixedCalls;
    }

    return res.status(200).json({
      functionCalls,
      textResponse,
      thought,
      validationErrors: validation.errors,
      usageMetadata: (response as any).usageMetadata
    });
  } catch (err: any) {
    const status = err.status || 500;
    const raw = String(err?.message || '').toLowerCase();
    let code = 'server_error';
    let message = 'The AI service ran into a problem.';

    if (status === 401 || status === 403 || raw.includes('api key')) {
      code = 'invalid_key';
      message = 'The Gemini API key is invalid or does not have permission.';
    } else if (status === 404 || raw.includes('not found')) {
      code = 'model_not_found';
      message = 'The configured AI model was not found.';
    } else if (status === 429 || raw.includes('quota') || raw.includes('rate') || raw.includes('spending cap')) {
      code = 'rate_limited';
      message = 'API rate limit reached. Try again in a moment.';
    }

    return res.status(status).json({
      error: message,
      code,
      retryable: status >= 500 || status === 429,
      detail: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
  }
}
