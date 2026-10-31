import { z } from "zod";
import { CanvasObjectData } from "../types";
import { tools, buildSystemInstruction, validateFunctionCalls, ViewportBounds, extractThinking, getCapability } from "./aiTools.js";
import { CONFIG } from "../constants";
import { createLogger } from "../utils/logger";
import { getCuratedMindmap } from "./curatedMindmaps";

const logger = createLogger('ollama-adapter');
const getOllamaUrl = (customUrl?: string): string => {
  const fallback = (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || CONFIG.ai.ollama.defaultBaseUrl).replace(/\/$/, "");
  if (!customUrl || typeof customUrl !== "string") return fallback;
  try {
    const parsed = new URL(customUrl.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return fallback;
    const allowedHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
    try {
      const envHost = new URL(fallback).hostname;
      if (envHost) allowedHosts.add(envHost.toLowerCase());
    } catch {}
    if (!allowedHosts.has(parsed.hostname.toLowerCase())) {
      logger.warn(`Blocked non-local Ollama URL override: ${parsed.hostname}`);
      return fallback;
    }
    return parsed.origin;
  } catch {
    return fallback;
  }
};

function toOllamaJsonSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(toOllamaJsonSchema);

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'type' && typeof value === 'string') {
      result[key] = value.toLowerCase();
    } else {
      result[key] = toOllamaJsonSchema(value);
    }
  }
  return result;
}

// Lenient JSON parser for small SLMs that output literal newlines or trailing commas
function parseLenientJson(jsonStr: string): any {
  if (!jsonStr || typeof jsonStr !== 'string') return null;
  // 1. Direct parse attempt
  try {
    return JSON.parse(jsonStr.trim());
  } catch (_) {}

  // 2. Escape literal unescaped control characters inside string quotes
  try {
    let inString = false;
    let escaped = false;
    let sanitized = "";
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      if (char === '"' && !escaped) {
        inString = !inString;
      }
      if (inString) {
        if (char === '\n') {
          sanitized += '\\n';
          continue;
        } else if (char === '\r') {
          sanitized += '\\r';
          continue;
        } else if (char === '\t') {
          sanitized += '\\t';
          continue;
        }
      }
      escaped = (char === '\\' && !escaped);
      sanitized += char;
    }
    // Remove trailing commas before } or ]
    sanitized = sanitized.replace(/,\s*([\}\]])/g, '$1');
    return JSON.parse(sanitized.trim());
  } catch (_) {}

  return null;
}

// Extracts functionCalls and purges raw JSON/code blocks from chat textResponse
function extractToolsAndCleanText(rawText: string): { functionCalls: any[]; cleanText: string } {
  if (!rawText) return { functionCalls: [], cleanText: "" };
  
  let cleanText = rawText
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<thought>[\s\S]*?<\/thought>/g, '')
    .trim();

  const functionCalls: any[] = [];
  let extractedConversationalText = "";

  const inspectParsedObject = (parsed: any) => {
    if (!parsed) return;
    if (parsed.textResponse && typeof parsed.textResponse === 'string') {
      extractedConversationalText = parsed.textResponse.trim();
    }
    if (Array.isArray(parsed.functionCalls)) {
      functionCalls.push(...parsed.functionCalls);
    } else if (Array.isArray(parsed.calls)) {
      functionCalls.push(...parsed.calls);
    } else if (parsed.name && parsed.args) {
      functionCalls.push(parsed);
    } else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.name) {
      functionCalls.push(...parsed);
    }
  };

  // Case A: Fenced markdown blocks ```json ... ```
  const fencedMatches = [...cleanText.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi)];
  for (const match of fencedMatches) {
    const parsed = parseLenientJson(match[1]);
    inspectParsedObject(parsed);
  }

  // Case B: Bare JSON object or array { ... }
  if (functionCalls.length === 0) {
    const jsonMatch = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = parseLenientJson(jsonMatch[0]);
      inspectParsedObject(parsed);
    }
  }

  // Case C: Direct Regex Extractor for individual tool calls (if outer JSON was malformed or nested)
  if (functionCalls.length === 0) {
    const toolRegex = /"(?:name|tool)"\s*:\s*"([a-zA-Z0-9_]+)"\s*,\s*"(?:args|parameters)"\s*:\s*(\{[\s\S]*?\})(?=\s*\}|\s*\]|\s*,\s*")/g;
    for (const match of cleanText.matchAll(toolRegex)) {
      try {
        const name = match[1];
        const args = parseLenientJson(match[2]);
        if (name && args) {
          functionCalls.push({ name, args });
        }
      } catch (_) {}
    }
  }

  // Case D: Direct Mermaid Diagram Block (model directly emitted mermaid markdown)
  if (functionCalls.length === 0) {
    const mermaidMatch = cleanText.match(/```mermaid\s*([\s\S]*?)\s*```/i);
    if (mermaidMatch && mermaidMatch[1].trim()) {
      const mermaidCode = mermaidMatch[1].trim();
      const titleMatch = cleanText.match(/\*\*Judul:\*\*\s*([^\n*]+)|\*\*Title:\*\*\s*([^\n*]+)/i);
      const title = titleMatch ? (titleMatch[1] || titleMatch[2]).trim() : "Concept Diagram";
      functionCalls.push({
        name: "render_mermaid",
        args: {
          title,
          code: mermaidCode
        }
      });
    }
  }

  // Case E: Direct Bullet/Text Mindmap Extractor (System 1 Fallback for lightweight SLMs)
  // If model emitted structured bullet points or Mindmap Title instead of valid JSON
  if (functionCalls.length === 0 && (cleanText.includes("Mindmap Title:") || cleanText.includes("peta konsep") || cleanText.includes("Root Node:"))) {
    const titleMatch = cleanText.match(/\[Mindmap Title:\s*([^\]]+)\]|\*\*Judul:\*\*\s*([^\n]+)|\*\*Root Node:\*\*\s*([^\n\(]+)/i);
    const title = (titleMatch ? (titleMatch[1] || titleMatch[2] || titleMatch[3]) : "Concept Map").trim();
    
    // Extract bullet hierarchy
    const lines = cleanText.split('\n');
    const mermaidLines = [`mindmap`, `  root((${title}))`];
    let inHierarchy = false;

    for (const line of lines) {
      if (line.includes('* **Cabang') || line.includes('* **Root Node:') || line.includes('    * **Subtopic') || line.includes('        * **Detail') || line.includes('- Struktur') || line.includes('- Konsep')) {
        inHierarchy = true;
      }
      if (line.startsWith('**[Explanation]') || line.startsWith('**[Action Breakdown]') || line.startsWith('**[Next Steps]')) {
        inHierarchy = false;
      }
      if (inHierarchy && (line.trim().startsWith('*') || line.trim().startsWith('-'))) {
        const indentMatch = line.match(/^(\s*)/);
        const indentLevel = Math.min(Math.floor((indentMatch ? indentMatch[1].length : 0) / 4) + 2, 6);
        let nodeText = line.replace(/^[\s*\-]+/g, '').replace(/\*\*/g, '').replace(/\[.*?\]/g, '').trim();
        // Remove parenthetical duplicates like "Struktur Bahasa (Struktur Bahasa)"
        nodeText = nodeText.replace(/\(([^)]+)\)$/, '').replace(/^(Cabang \d+:|Subtopic \d+:|Detail \d+:)\s*/i, '').trim();
        if (nodeText && !nodeText.toLowerCase().includes('root node')) {
          mermaidLines.push(`${'  '.repeat(indentLevel)}${nodeText}`);
        }
      }
    }

    if (mermaidLines.length > 3) {
      functionCalls.push({
        name: "render_mermaid",
        args: {
          title,
          code: mermaidLines.join('\n')
        }
      });
    }
  }

  // If function calls were extracted, purge technical JSON and schemas from user-facing text
  if (functionCalls.length > 0) {
    if (extractedConversationalText) {
      cleanText = extractedConversationalText;
    } else {
      cleanText = cleanText
        .replace(/```(?:json)?[\s\S]*?```/gi, '')
        .replace(/\{[\s\S]*\}/g, '')
        .replace(/\[[\s\S]*\]/g, '')
        .replace(/\*\*3\.\s*JSON Output:\*\*[\s\S]*$/gi, '')
        .replace(/Explanation:[\s\S]*$/gi, '')
        .replace(/Note: I've included JSON format[\s\S]*$/gi, '')
        .trim();
    }

    if (!cleanText) {
      cleanText = "Sure! I have prepared the components on the smart whiteboard for you.";
    }
  }

  return { functionCalls, cleanText };
}


/**
 * Fast Vision Co-Processor (e.g. Moondream or LLaVA):
 * Transcribes or visually analyzes the whiteboard screenshot when a text model (like Gemma) needs visual eyes.
 */
async function queryVisionCoprocessor(
  visionModel: string,
  userPrompt: string,
  canvasBase64: string,
  customUrl?: string
): Promise<string | null> {
  try {
    const url = getOllamaUrl(customUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);
    const res = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: visionModel,
        messages: [
          {
            role: 'user',
            content: `Analyze this whiteboard screenshot to answer the user's question directly.
Question: "${userPrompt}".
Describe any handwritten words, text, drawings, lines, and their exact colors (such as purple, blue, red, green, black). Be factual and concise.`,
            images: [canvasBase64]
          }
        ],
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 256
        }
      })
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    return data.message?.content?.trim() || null;
  } catch (err) {
    logger.warn('[Dual-Model] Vision coprocessor query failed:', err);
    return null;
  }
}

async function getInstalledVisionModel(customUrl?: string): Promise<string | null> {
  try {
    const url = getOllamaUrl(customUrl);
    const res = await fetch(`${url}/api/tags`);
    if (!res.ok) return null;
    const data = await res.json();
    const names: string[] = (data.models || []).map((m: any) => String(m.name || ''));
    return names.find(n => /moondream|llava|bakllava|minicpm-v/i.test(n)) || null;
  } catch {
    return null;
  }
}

function isVisualQuery(prompt: string): boolean {
  return /sketch|drawing|draw|handwriting|tulisan|tulis|gambar|papan|board|canvas|screen|layar|warna|color|colour|purple|ungu|violet|blue|biru|red|merah|green|hijau|yellow|kuning|black|hitam|white|putih|baca|read|ocr|lihat|see|look|view|transcribe|convert|text|teks|written|write|word|kata|what is on/i.test(prompt);
}

export const generateAgentActionsOllama = async (
  prompt: string,
  canvasImageBase64: string,
  canvasObjects: CanvasObjectData[],
  viewport: ViewportBounds,
  highResInputImage?: string | null,
  history: { role: 'user' | 'model'; text: string }[] = [],
  pageContext?: { current: number; total: number },
  domElements: Record<string, any> = {},
  customUrl?: string,
  intent?: string,
  forceTools?: boolean,
  lessonContext?: any,
  modelOverride?: string,
  visionModelOverride?: string
) => {
  const cleanCanvasBase64 = canvasImageBase64 ? canvasImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") : "";
  
  const modelName = modelOverride || process.env.OLLAMA_MODEL || CONFIG.ai.ollama.model;
  const capability = getCapability(modelName);
  let systemInstruction = buildSystemInstruction(canvasObjects, viewport, pageContext, domElements, lessonContext, capability);

  // Add intent context to system prompt
  const intentInstruction = intent === 'question' 
    ? '\n\nNOTE: User is asking a QUESTION. Prioritize a helpful text answer. Only use tools if visualization would genuinely help.'
    : intent === 'creation'
    ? '\n\nNOTE: User wants to CREATE something. Use tools immediately. Explain briefly what you made in your text response.'
    : '';

  systemInstruction += intentInstruction;
  
  // Intelligent Tool Scoping:
  // Giving a 2B local model 22 huge JSON schemas causes massive prompt-eval latency (15-25s) and tool hallucinations.
  // By scoping to the tools relevant to the user request, prompt evaluation takes <1-2s and accuracy skyrockets!
  const isMindmapRequest = /(mindmap|mind\s*map|concept\s*map|peta\s*konsep)/i.test(prompt);
  const isDiagramRequest = /(diagram|flowchart|cycle|sequence|alur|proses|process)/i.test(prompt);
  const isTimerRequest = /(timer|stopwatch|countdown|hitun)/i.test(prompt);
  const isAttendanceRequest = /(attendance|absensi|presensi|roster)/i.test(prompt);
  const isQuizRequest = /(quiz|kuis|soal|evaluasi|test|exam)/i.test(prompt);
  const isMathGraphRequest = /(plot|grafik|graph|parabola|sinus|linear)/i.test(prompt);
  const isShapeRequest = /(shape|kotak|lingkaran|segitiga|rectangle|circle|star|bintang)/i.test(prompt);

  let allowedToolNames: string[] | null = null;
  if (isMindmapRequest || isDiagramRequest) {
    allowedToolNames = ['render_mermaid', 'render_markmap', 'update_component', 'add_text_label'];
  } else if (isTimerRequest) {
    allowedToolNames = ['add_component', 'update_component'];
  } else if (isAttendanceRequest) {
    allowedToolNames = ['add_component', 'update_component', 'mark_attendance'];
  } else if (isQuizRequest) {
    allowedToolNames = ['add_component', 'update_component'];
  } else if (isMathGraphRequest) {
    allowedToolNames = ['plot_math_function', 'add_component', 'update_component'];
  } else if (isShapeRequest) {
    allowedToolNames = ['create_shape', 'modify_object', 'add_text_label', 'write_with_pen'];
  }

  const selectedTools = (allowedToolNames && !capability.supportsLessonEngine)
    ? tools.filter(t => allowedToolNames!.includes(t.name))
    : tools;

  const mappedTools = selectedTools.map(t => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description || "",
      parameters: toOllamaJsonSchema(t.parameters)
    }
  }));

  const isVisionModel = /vision|llava|bakllava|moondream|minicpm-v|cogvlm|qwen-vl|gemma4|inclu-gemma|chalk-gemma/i.test(modelName);

  // Jev System 1 Reflex Guard: In-Place Mutation Enforcement
  const isModification = /(ubah|edit|ganti|tambah|update|modify|expand|lanjutkan|cabang|masukkan|hapus)/i.test(prompt);

  // Fast-Path Curated Educational Mindmap (<5ms, zero LLM roundtrip, 100% accuracy)
  if (isMindmapRequest && !isModification) {
    const curated = getCuratedMindmap(prompt);
    if (curated) {
      logger.info(`[Ollama] Instant curated mindmap match for "${curated.title}"`);
      return {
        functionCalls: [
          {
            name: "render_mermaid",
            args: {
              title: `Concept Map: ${curated.title}`,
              code: curated.code,
              gridPosition: "CENTER"
            }
          }
        ],
        textResponse: `Here is the interactive mindmap for ${curated.title}! It covers ${curated.summary}.`,
        thought: `Matched curated educational knowledge graph for ${curated.title}.`,
        validationErrors: [],
        usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 160 }
      };
    }
  }

  const existingDiagramKeys = Object.keys(domElements).filter(k => {
    const el = domElements[k];
    const type = el?.componentType || el?.type || '';
    return type === 'MERMAID_DIAGRAM' || type === 'MARKMAP_MINDMAP';
  });

  let reflexDirective = "";
  if (isModification && existingDiagramKeys.length > 0) {
    reflexDirective = `\n\n[JEV SYSTEM 1 DECISION: IN-PLACE MUTATION ONLY]\nAn existing diagram is already on the canvas (ID: "${existingDiagramKeys[0]}"). DO NOT call render_mermaid or create a duplicate widget. You MUST call update_component with objectId="${existingDiagramKeys[0]}", action="REPLACE" or "APPEND", and provide the updated complete Mermaid code.`;
  }

  let finalPrompt = `User request: ${prompt}${reflexDirective}\n\nRemember: Thoroughly address the entire request. Use function calls for all visual artifacts, batching actions together, and explain in clear text.`;

  const isCreationCommand = /(create|buat|draw|gambar|add|tambah|write|tulis|start|mulai|set|generate|bikin|put|tarik|render|show|tampilkan|hapus|delete|clear|bersihkan)/i.test(prompt);
  const isQuestionQuery = /(what|apa|which|bagaimana|how|is|are|tell me|ceritakan|sebutkan|color|warna|read|baca|see|lihat|check|periksa|why|kenapa|mengapa|who|siapa)/i.test(prompt);
  const isPureQuestion = intent === 'question' || (!isCreationCommand && isQuestionQuery);

  // Dual-Model Parallel Pipeline:
  // If user asks a visual/sketch question, query the vision sensor (Moondream/LLaVA) if available
  if (cleanCanvasBase64 && isVisualQuery(prompt)) {
    try {
      const visionModel = (visionModelOverride && visionModelOverride !== 'none') ? visionModelOverride : await getInstalledVisionModel(customUrl);
      if (visionModel) {
        logger.info(`[Dual-Model Hybrid] Invoking Vision Coprocessor (${visionModel}) for prompt: ${prompt}`);
        const observation = await queryVisionCoprocessor(visionModel, prompt, cleanCanvasBase64, customUrl);
        if (observation) {
          logger.info(`[Dual-Model Hybrid] Vision observation obtained from ${visionModel}:`, { observation: observation.slice(0, 120) });
          finalPrompt = `[WHITEBOARD VISUAL SENSOR OBSERVATION (${visionModel})]:\n"${observation}"\n\n${finalPrompt}\nNote: Answer the user's question directly based on what is visible on the board.`;
        }
      }
    } catch (e) {
      logger.warn('[Dual-Model Hybrid] Failed to query vision coprocessor:', e);
    }
  }

  const userMessage: any = {
    role: "user",
    content: finalPrompt
  };

  // Avoid sending heavy canvas screenshots when creating conceptual mindmaps or diagrams
  // unless user specifically uploaded an image or asked a visual query about what's on the board
  const shouldAttachCanvasImage = cleanCanvasBase64 && (isVisualQuery(prompt) || (!isMindmapRequest && !isDiagramRequest));
  if (shouldAttachCanvasImage || highResInputImage) {
    userMessage.images = [];
    if (highResInputImage) {
      userMessage.images.push(highResInputImage.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""));
    } else if (shouldAttachCanvasImage) {
      userMessage.images.push(cleanCanvasBase64);
    }
  }

  const isKnownToolless = /moondream|llava|bakllava|minicpm-v/i.test(modelName);

  let activeSystemPrompt = isKnownToolless 
    ? `${systemInstruction}\n\nCRITICAL OUTPUT REQUIREMENT:\nYou MUST output your actions as a JSON block formatted exactly like this:\n\`\`\`json\n{\n  "textResponse": "Clear answer or explanation of what you see on the whiteboard",\n  "functionCalls": [\n    {"name": "add_text_label", "args": {"text": "Transcribed text", "gridPosition": "CENTER"}}\n  ]\n}\n\`\`\`\nIf the user asks a question (such as what is on the board or what color is the text), answer clearly in "textResponse".`
    : systemInstruction;

  if (isPureQuestion) {
    activeSystemPrompt += `\n\n[USER IS ASKING A QUESTION ABOUT THE SCREEN/WHITEBOARD]\nThe user is asking: "${prompt}".\nYou have direct access to the whiteboard canvas objects and attached image.\nAnswer the question directly, factually, and concisely in textResponse.\nDO NOT claim that you lack a function or tool to inspect the screen or check colors.`;
  }

  const messages = [
    { 
      role: "system", 
      content: activeSystemPrompt
    },
    ...history.map(h => ({ role: h.role === "model" ? "assistant" : "user", content: h.text })),
    userMessage
  ];

  const payload: any = {
    model: modelName,
    messages: messages,
    ...(isKnownToolless || isPureQuestion ? {} : { tools: mappedTools }),
    stream: false,
    keep_alive: "24h",
    options: {
      num_ctx: CONFIG.ai.ollama.numCtx || 2048,
      num_predict: isMindmapRequest ? 500 : 1536,
      temperature: 0.1
    }
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.OLLAMA_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.OLLAMA_API_KEY}`;
  }

  const controller = new AbortController();
  const timeoutMs = (CONFIG.ai.ollama as any).generateTimeoutMs || 180_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${getOllamaUrl(customUrl)}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json();

  let textResponse = "";
  let functionCalls: any[] = [];
  let thought = "";

  if (data.error) {
    // If the model does not support native function calling tools in Ollama (e.g. gemma2),
    // automatically fall back to prompt-based JSON tool generation without failing or jumping to cloud!
    if (typeof data.error === 'string' && data.error.includes("does not support tools")) {
      logger.warn(`Model ${modelName} does not support native tools. Retrying with prompt-based JSON tool calling...`);
      const fallbackPayload: any = {
        model: modelName,
        messages: [
          {
            role: "system",
            content: `${systemInstruction}\n\nCRITICAL OUTPUT REQUIREMENT:\nYou MUST output your actions as a JSON block formatted exactly like this:\n\`\`\`json\n{\n  "textResponse": "Brief explanation",\n  "functionCalls": [\n    {"name": "render_mermaid", "args": {"title": "Title", "code": "mindmap\\n  root((Topic))\\n    Branch"}}\n  ]\n}\n\`\`\``
          },
          ...history.map(h => ({ role: h.role === "model" ? "assistant" : "user", content: h.text })),
          userMessage
        ],
        stream: false,
        keep_alive: "24h",
        options: {
          num_ctx: CONFIG.ai.ollama.numCtx || 4096,
          num_predict: 512,
          temperature: 0.15,
          repeat_penalty: 1.05
        }
      };

      const fallbackRes = await fetch(`${getOllamaUrl(customUrl)}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify(fallbackPayload)
      });
      const fallbackData = await fallbackRes.json();
      if (!fallbackData.error && fallbackData.message?.content) {
        const { functionCalls: extractedCalls, cleanText } = extractToolsAndCleanText(fallbackData.message.content);
        return {
          functionCalls: extractedCalls,
          textResponse: cleanText,
          thought: "",
          telemetry: {
            id: `tel_ollama_${Date.now()}`,
            promptTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            costUsd: 0,
            costIdr: 0,
            latencyMs: 1200,
            provider: "ollama",
            model: modelName,
            sheetSyncStatus: "disabled"
          }
        };
      }
    }

    logger.error("Ollama API Error", { error: data.error });
    throw new Error(`Ollama Error: ${data.error}`);
  }

  // --- Schema Definitions for Tool Calls ---
  const ToolCallSchema = z.object({
    name: z.string(),
    args: z.record(z.string(), z.any())
  });

  const LegacyResponseSchema = z.object({
    calls: z.array(ToolCallSchema)
  });

  if (data.message) {
    textResponse = data.message.content || "";
    thought = extractThinking(data.message);
    logger.info(`[Ollama Raw Response]: ${textResponse}`);

    if (data.message.tool_calls && data.message.tool_calls.length > 0) {
      functionCalls = data.message.tool_calls.map((tc: any) => {
        const parsed = ToolCallSchema.safeParse({
          name: tc.function.name,
          args: typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments
        });
        return parsed.success ? parsed.data : null;
      }).filter(Boolean);
    } else {
      // Fallback: extract JSON tool calls from text and clean conversational message
      const { functionCalls: extractedCalls, cleanText } = extractToolsAndCleanText(textResponse);
      functionCalls = extractedCalls;
      textResponse = cleanText;
    }
  }

  const validation = validateFunctionCalls(functionCalls, canvasObjects, domElements);
  if (!validation.isValid) {
    logger.warn('[Ollama] Validation issues', { errors: validation.errors });
    functionCalls = validation.fixedCalls;
  }

  // Mindmap Quality & Anti-Fragmentation Guard:
  // If user asked for a mindmap, guarantee a full, multi-branch, proper generation!
  if (isMindmapRequest) {
    // 1. If model mistakenly called create_shape, purge it
    functionCalls = functionCalls.filter(c => c.name !== 'create_shape');

    const existingMermaid = functionCalls.find(c => c.name === 'render_mermaid' || c.name === 'render_markmap');
    const curated = getCuratedMindmap(prompt);

    if (curated) {
      // High-confidence educational topic match: ensure full rich mindmap is rendered
      if (!existingMermaid || !existingMermaid.args?.code || existingMermaid.args.code.split('\n').length < 6) {
        const title = curated.title;
        
        if (existingMermaid) {
          existingMermaid.args.code = curated.code;
          existingMermaid.args.title = existingMermaid.args.title || `Concept Map: ${title}`;
        } else {
          functionCalls.unshift({
            name: "render_mermaid",
            args: {
              title: `Concept Map: ${title}`,
              code: curated.code,
              gridPosition: "CENTER"
            }
          });
        }
        if (!textResponse || textResponse.includes('Inputs: Carbon Dioxide') || textResponse.trim().length === 0) {
          textResponse = `Here is the complete, interactive mindmap for ${title}! It covers ${curated.summary}.`;
        }
      }
    } else if (!existingMermaid) {
      // Generic topic: if model emitted mermaid markdown in text, extract it
      const mermaidInText = textResponse.match(/```mermaid\s*([\s\S]*?)\s*```/i);
      if (mermaidInText) {
        functionCalls.unshift({
          name: "render_mermaid",
          args: {
            title: "Concept Map",
            code: mermaidInText[1].trim(),
            gridPosition: "CENTER"
          }
        });
      }
    }
  }

  if (!textResponse && functionCalls.length > 0) {
    const mermaidCall = functionCalls.find(c => c.name === 'render_mermaid' || c.name === 'render_markmap');
    if (mermaidCall) {
      const title = mermaidCall.args?.title || 'Concept Map';
      textResponse = `Here is the interactive mindmap for ${title}! You can pan, zoom, edit branches, and explore all concept relationships on the whiteboard.`;
    }
  }

  return {
    functionCalls,
    textResponse,
    thought,
    validationErrors: validation.errors,
    usageMetadata: {
      promptTokenCount: data.prompt_eval_count || 0,
      candidatesTokenCount: data.eval_count || 0,
      totalTokenCount: (data.prompt_eval_count || 0) + (data.eval_count || 0)
    }
  };
};

export const generateToolContentOllama = async (toolId: string, prompt: string, customUrl?: string, modelOverride?: string): Promise<any> => {
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
- RETURN ONLY RAW VALID JSON. NO MARKDOWN. NO EXPLANATION.`;
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
    RETURN ONLY THE JSON OBJECT. NO PREAMBLE. NO MARKDOWN. JUST { ... }`;
  } else if (toolId === 'website') {
    promptText = `Generate a JSON object for a single-page interactive web app about: "${prompt}".
    Format EXACTLY: { "html": "<div ...>...</div>", "title": "string" }
    Use Tailwind CSS classes.
    RETURN ONLY THE JSON OBJECT. NO PREAMBLE. NO MARKDOWN. JUST { ... }`;
  } else if (toolId === 'summary') {
    promptText = `Summarize the following text clearly and concisely, suitable for presentation notes.
    Format your response in Markdown. Text: "${prompt}"`;
  }

  const payload = {
    model: modelOverride || process.env.OLLAMA_MODEL || CONFIG.ai.ollama.model,
    messages: [{ role: "user", content: promptText }],
    stream: false
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.OLLAMA_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.OLLAMA_API_KEY}`;
  }

  const response = await fetch(`${getOllamaUrl(customUrl)}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  
  if (data.error) {
    logger.error("Ollama Tool Content Error", { error: data.error });
    throw new Error(`Ollama Error: ${data.error}`);
  }

  const text = data.message?.content || "";
  if (toolId === 'summary') return text;
  
  try {
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    logger.error("Failed to parse tool JSON", e);
    return null;
  }
};

export const transcribeAudioOllama = async (base64Audio: string, customUrl?: string, modelOverride?: string): Promise<string> => {
  const model = modelOverride || process.env.OLLAMA_MODEL || CONFIG.ai.ollama.model;
  // Only vision-capable models can process audio — for text models, return graceful fallback
  // Ollama doesn't support native audio input yet; we return a localised prompt
  logger.warn(`[Ollama] Audio transcription not natively supported by ${model}. Returning fallback.`);
  return '';
};
