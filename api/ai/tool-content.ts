import { GoogleGenAI } from "@google/genai";
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

    const { toolId, prompt, selectedVertexModel, selectedGeminiModel, geminiApiKey } = body;

    // Resolve API key: prefer client-provided, then env vars
    const apiKey = (geminiApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
    if (!apiKey || apiKey.length < 10) {
      return res.status(401).json({
        error: 'A Gemini API key is required.',
        code: 'invalid_key',
        retryable: false
      });
    }

    const rawModel = selectedGeminiModel || selectedVertexModel || process.env.GEMINI_MODEL || GEMINI_MODEL;
    const modelName = (rawModel === 'gemini-3.7-flash' ? 'gemini-3.8-flash' : rawModel).trim();
    const model = /e2b|inclu-gemma/i.test(modelName) ? GEMINI_MODEL : modelName;

    let promptText = "";
    if (toolId === 'mindmap') {
      promptText = `Generate a JSON object for a mind map about: "${prompt}".
Return EXACTLY this format:
{
  "nodes": [
    {"text": "string", "style": "MAIN_TOPIC|SUBTOPIC|DETAIL", "parentNodeText": null_or_string}
  ]
}
Rules:
- Maximum 8 nodes: exactly 1 MAIN_TOPIC (root, parentNodeText=null), 4-5 SUBTOPIC, 0-2 DETAIL
- parentNodeText MUST be the EXACT text of an existing node in this list
- RETURN ONLY RAW VALID JSON, no markdown, no explanation.`;
    } else if (toolId === 'quiz') {
      promptText = `Generate a JSON object for a comprehensive quiz about: "${prompt}".
Format EXACTLY: {
  "title": "string",
  "questions": [
    { "type": "multiple_choice", "question": "string", "options": ["string", "string", "string", "string"], "correctIndex": number },
    { "type": "essay", "question": "string", "expectedAnswer": "string" }
  ]
}
Include at least 2 multiple choice questions and 1 essay question.
RETURN ONLY RAW VALID JSON without markdown formatting.`;
    } else if (toolId === 'website') {
      promptText = `Generate a JSON object for a single-page interactive web app about: "${prompt}".
Format: { "html": "<div ...>...</div>", "title": "string" }
Use Tailwind CSS classes. Make it beautiful and functional. Include inline script if needed.
RETURN ONLY RAW VALID JSON without markdown formatting.`;
    } else if (toolId === 'summary') {
      promptText = `Summarize the following text clearly and concisely, suitable for presentation notes.
Format your response in Markdown. Text: "${prompt}"`;
    }

    // Use Google GenAI SDK with API key (no GCP project needed)
    const ai = new GoogleGenAI({ apiKey });

    const thinkingConfig = model.startsWith('gemma-')
      ? undefined
      : { thinkingBudget: 0 };

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      config: {
        temperature: CONFIG.ai.gemini.generation.temperature,
        ...(thinkingConfig ? { thinkingConfig } : {})
      }
    });

    const text = response.text || "";
    if (toolId === 'summary') return res.status(200).json({ result: text });

    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsedResult;
    try {
      parsedResult = JSON.parse(jsonStr);
    } catch {
      parsedResult = null;
    }

    return res.status(200).json({ result: parsedResult });
  } catch (err: any) {
    const status = err.status || 500;
    return res.status(status).json({
      error: 'Could not generate the tool content.',
      code: 'server_error',
      retryable: true,
      detail: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
  }
}
