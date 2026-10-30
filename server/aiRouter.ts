import { Router } from "express";
import express from "express";
import type { Response } from "express";
import fs from "fs";
import path from "path";
import {
  generateAgentActionsGemini,
  generateToolContentGemini,
  transcribeAudioGemini
} from "./geminiAdapter";
import {
  generateAgentActionsOllama,
  generateToolContentOllama,
  transcribeAudioOllama
} from "./ollamaAdapter";
import {
  generateAgentActionsVertex,
  generateToolContentVertex,
  transcribeAudioVertex
} from "./vertexAdapter";
import {
  transcribeAudioWhisper,
  isWhisperAvailable
} from "./whisperAdapter";
import { CONFIG, CHALK_LOCAL_BASE_MODEL, CHALK_LOCAL_DOWNLOAD_MODEL, OLLAMA_MODEL, STRONG_GEMMA_MODEL } from "../constants";
import { QuestWriteError, questResponseIsSafe, writeQuestOnLaptop } from "./questWriter";
import { speechProviders } from "../utils/speechRoute";
import { boardProviders, isGeminiBlocked, localModelName, noteGeminiFailure } from "../utils/aiRoute";
import { AiPreference } from "../types";
import { createLogger } from "../utils/logger";
import { telemetryService } from "./telemetryService";

export const aiRouter = Router();
const logger = createLogger('ai-router');

aiRouter.use(express.json({ limit: CONFIG.ai.request.bodyLimit }));

type AiMode = 'gemini' | 'ollama' | 'vertex';
type AiErrorCode = 'invalid_key' | 'no_internet' | 'rate_limited' | 'model_not_found' | 'local_unavailable' | 'server_error';

const isAiPreference = (value: unknown): value is AiPreference => (
  value === 'auto' || value === 'gemini' || value === 'ollama' || value === 'vertex'
);

const getConfiguredMode = (): AiPreference => {
  const AI_MODE = isAiPreference(process.env.AI_MODE) ? process.env.AI_MODE : 'auto';
  const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const VERTEX_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.VERTEX_PROJECT_ID || CONFIG.ai.vertex.projectId;

  if (AI_MODE === 'gemini' && !GEMINI_KEY) return 'auto';
  if (AI_MODE === 'vertex' && !VERTEX_PROJECT) return 'auto';
  return AI_MODE;
};

const getRuntimePreference = (preference?: unknown): AiPreference => (
  isAiPreference(preference) ? preference : getConfiguredMode()
);

const getPreferredAutoMode = (): AiMode => {
  if (process.env.GOOGLE_CLOUD_PROJECT || process.env.VERTEX_PROJECT_ID || CONFIG.ai.vertex.projectId) return 'vertex';
  return process.env.GEMINI_API_KEY || process.env.API_KEY ? 'gemini' : 'ollama';
};

const getOllamaUrl = () => process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || CONFIG.ai.ollama.defaultBaseUrl;
const getOllamaModel = () => process.env.OLLAMA_MODEL || CONFIG.ai.ollama.model;
const getGeminiModel = () => process.env.GEMINI_MODEL || CONFIG.ai.gemini.model;

const sanitizeOllamaUrl = (customUrl?: unknown): string => {
  const fallback = getOllamaUrl().replace(/\/$/, "");
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

// ── Status probe cache (TTL: 15s) ────────────────────────────────────────────
// Prevents triple-probe (Gemini + Ollama + Vertex) on every /generate request.
const STATUS_CACHE_TTL_MS = 15_000;
type CachedStatus = Awaited<ReturnType<typeof _getAvailableMode>>;
const statusCache = new Map<string, { ts: number; value: CachedStatus }>();

const probeGemini = async (customKey?: string) => {
  const key = customKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!key) {
    return { online: false, reason: 'missing_key' };
  }
  return { online: true, reason: 'ok' };
};

const probeVertex = async () => {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.VERTEX_PROJECT_ID || CONFIG.ai.vertex.projectId;
  if (!project) {
    return { online: false, reason: 'missing_project' };
  }
  return { online: true, reason: 'configured' };
};

const probeOllama = async (customUrl?: string, customModel?: string) => {
  const url = sanitizeOllamaUrl(customUrl);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.ai.ollama.probeTimeoutMs);
    const response = await fetch(`${url}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return { online: false, reason: `http_${response.status}`, models: [] };

    const data = await response.json();
    const models = (data.models || []).map((m: any) => m.name);
    const configuredModel = customModel || getOllamaModel();
    
    // Check configured model, then the Chalk local models, then base models
    const candidateModels = [configuredModel, OLLAMA_MODEL, CHALK_LOCAL_DOWNLOAD_MODEL, 'ornith-1.5:9b', 'qwen3.5-aggressive:9b', 'gemma4:e2b', 'gemma4:latest', 'gemma2:2b'];
    let activeModel = candidateModels.find(candidate => 
      models.includes(candidate) || models.some((m: string) => m.startsWith(candidate + ':'))
    );
    if (!activeModel && models.length > 0) {
      activeModel = models[0];
    }
    const hasRequiredModel = !!activeModel;

    return {
      online: true,
      reason: hasRequiredModel ? 'ok' : 'model_missing',
      models,
      hasRequiredModel,
      activeModel: activeModel || configuredModel
    };
  } catch (e: any) {
    return { online: false, reason: e?.name === 'AbortError' ? 'timeout' : 'local_unavailable', models: [] };
  }
};

// Internal uncached implementation
const _getAvailableMode = async (
  customGeminiKey?: string,
  customOllamaUrl?: string,
  customOllamaModel?: string
): Promise<{
  mode: AiMode | 'unavailable';
  model: string;
  online: boolean;
  reason: string;
  ollamaStatus?: { online: boolean; hasModel: boolean; models: string[]; activeModel?: string };
  geminiStatus?: { online: boolean; reason: string };
  vertexStatus?: { online: boolean; reason: string };
  envGeminiModel?: string | null;
}> => {
  const configuredMode = getConfiguredMode();
  const gemini = await probeGemini(customGeminiKey);
  const ollama = await probeOllama(customOllamaUrl, customOllamaModel);
  const vertex = await probeVertex();

  const geminiInfo = { online: gemini.online, reason: gemini.reason };
  const ollamaInfo = { online: ollama.online, hasModel: !!ollama.hasRequiredModel, models: ollama.models, activeModel: ollama.activeModel };
  const vertexInfo = { online: vertex.online, reason: vertex.reason };

  const preferredMode = configuredMode === 'auto' ? getPreferredAutoMode() : configuredMode;

  if (preferredMode === 'vertex' && vertex.online) {
    return { mode: 'vertex', model: CONFIG.ai.vertex.model, online: true, reason: 'ok', geminiStatus: geminiInfo, ollamaStatus: ollamaInfo, vertexStatus: vertexInfo, envGeminiModel: process.env.GEMINI_MODEL || null };
  }

  if (vertex.online) {
    return { mode: 'vertex', model: CONFIG.ai.vertex.model, online: true, reason: 'ok', geminiStatus: geminiInfo, ollamaStatus: ollamaInfo, vertexStatus: vertexInfo, envGeminiModel: process.env.GEMINI_MODEL || null };
  }

  if (preferredMode === 'gemini') {
    const key = customGeminiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (gemini.online || key) {
      return { mode: 'gemini', model: getGeminiModel(), online: gemini.online, reason: gemini.reason, geminiStatus: geminiInfo, ollamaStatus: ollamaInfo, vertexStatus: vertexInfo, envGeminiModel: process.env.GEMINI_MODEL || null };
    }
    if (ollama.online && ollama.hasRequiredModel) {
      return { mode: 'ollama', model: ollama.activeModel || getOllamaModel(), online: true, reason: 'cloud_key_missing_using_local', geminiStatus: geminiInfo, ollamaStatus: ollamaInfo, vertexStatus: vertexInfo, envGeminiModel: process.env.GEMINI_MODEL || null };
    }
    return { mode: 'unavailable', model: getGeminiModel(), online: false, reason: gemini.reason, geminiStatus: geminiInfo, ollamaStatus: ollamaInfo, vertexStatus: vertexInfo, envGeminiModel: process.env.GEMINI_MODEL || null };
  }

  if (ollama.online && ollama.hasRequiredModel) {
    return { mode: 'ollama', model: ollama.activeModel || getOllamaModel(), online: true, reason: 'ok', geminiStatus: geminiInfo, ollamaStatus: ollamaInfo, vertexStatus: vertexInfo, envGeminiModel: process.env.GEMINI_MODEL || null };
  }
  return {
    mode: 'unavailable',
    model: ollama.activeModel || getOllamaModel(),
    online: false,
    reason: ollama.online ? 'model_missing' : ollama.reason,
    geminiStatus: geminiInfo,
    ollamaStatus: ollamaInfo,
    vertexStatus: vertexInfo,
    envGeminiModel: process.env.GEMINI_MODEL || null
  };
};

// Cached wrapper
const getAvailableMode = async (
  customGeminiKey?: string,
  customOllamaUrl?: string,
  customOllamaModel?: string
): Promise<CachedStatus> => {
  const cacheKey = `${customGeminiKey || ''}|${customOllamaUrl || ''}|${customOllamaModel || ''}`;
  const cached = statusCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < STATUS_CACHE_TTL_MS) {
    return cached.value;
  }
  const value = await _getAvailableMode(customGeminiKey, customOllamaUrl, customOllamaModel);
  statusCache.set(cacheKey, { ts: Date.now(), value });
  return value;
};

const localOllamaOrigin = (customUrl?: unknown): string | null => {
  const candidate = sanitizeOllamaUrl(customUrl);
  try {
    const parsed = new URL(candidate);
    const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') return null;
    return parsed.origin;
  } catch {
    return null;
  }
};

const ollamaNotInstalled = (res: Response) => {
  res.status(503).json({
    success: false,
    code: 'ollama_not_installed',
    error: 'Ollama is not installed or is not running on this laptop. The download did not start.'
  });
};

const isAllowedDownloadModel = (model: string): boolean => {
  const lower = model.toLowerCase().trim();
  return (
    !lower ||
    lower === CHALK_LOCAL_DOWNLOAD_MODEL.toLowerCase() ||
    lower === CHALK_LOCAL_BASE_MODEL.toLowerCase() ||
    lower === 'chalk-gemma' ||
    lower === 'chalk-model' ||
    lower === 'chalk-model:latest' ||
    lower === 'Chalk-gemma:2b' ||
    lower === 'Chalk-gemma' ||
    lower === 'Chalk-model:latest'
  );
};

const requestedDownloadModel = (body: any): string => {
  const raw = body?.model ?? body?.name ?? CHALK_LOCAL_DOWNLOAD_MODEL;
  const str = typeof raw === 'string' ? raw.trim() : '';
  if (isAllowedDownloadModel(str)) {
    return CHALK_LOCAL_DOWNLOAD_MODEL;
  }
  return str;
};

aiRouter.post("/pull-model", async (req, res) => {
  const targetModel = requestedDownloadModel(req.body);
  if (targetModel !== CHALK_LOCAL_DOWNLOAD_MODEL) {
    return res.status(400).json({
      success: false,
      error: 'Only the Chalk local model can be downloaded on this laptop.'
    });
  }

  const origin = localOllamaOrigin(req.body?.ollamaUrl || req.body?.ollamaBaseUrl);
  if (!origin) return ollamaNotInstalled(res);

  let modelReady = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.ai.ollama.probeTimeoutMs);
    const tagsResponse = await fetch(`${origin}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!tagsResponse.ok) return ollamaNotInstalled(res);
    const data = await tagsResponse.json();
    const names: string[] = (data.models || []).map((m: any) => String(m?.name || m?.model || ''));
    modelReady = offlineModelAlreadyPresent(names);
  } catch {
    return ollamaNotInstalled(res);
  }

  if (req.body?.probe === true) {
    return res.json({
      success: true,
      ollamaRunning: true,
      modelReady,
      model: CHALK_LOCAL_DOWNLOAD_MODEL
    });
  }

  const wantsStream = req.body?.stream !== false;

  if (modelReady) {
    logger.info('Skipping Ollama pull; chalk-gemma:2b or gemma4:e2b is already present');
    if (!wantsStream) {
      return res.json({
        success: true,
        skipped: true,
        modelReady: true,
        model: CHALK_LOCAL_DOWNLOAD_MODEL,
        message: 'The local model is ready.'
      });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`data: ${JSON.stringify({ status: 'success', completed: true, phase: 'done', skipped: true, model: CHALK_LOCAL_DOWNLOAD_MODEL })}\n\n`);
    return res.end();
  }

  let modelfile = '';
  try {
    modelfile = fs.readFileSync(path.join(process.cwd(), 'scripts', 'Modelfile.chalk-gemma'), 'utf8');
  } catch {
    return res.status(500).json({
      success: false,
      error: 'The local model download failed. The model definition file is missing.'
    });
  }

  if (wantsStream) {
    try {
      logger.info('Creating chalk-gemma:2b from the E2B Modelfile');
      const response = await fetch(`${origin}/api/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createBodyFromModelfile(modelfile, true))
      });

      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => '');
        logger.warn('Ollama create failed to start', { status: response.status, detail: detail.slice(0, 300) });
        return res.status(502).json({
          success: false,
          error: `The local model download failed. Ollama could not start the pull (${response.status}).`
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
      res.write(`data: ${JSON.stringify({ status: 'started', phase: 'started', model: CHALK_LOCAL_DOWNLOAD_MODEL })}\n\n`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let failed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.error) {
              failed = true;
              res.write(`data: ${JSON.stringify({
                status: 'failed',
                error: `The local model download failed. ${String(parsed.error)}`,
                model: CHALK_LOCAL_DOWNLOAD_MODEL
              })}\n\n`);
              continue;
            }
            const percent = parsed.total && parsed.completed ? Math.round((parsed.completed / parsed.total) * 100) : null;
            res.write(`data: ${JSON.stringify({ ...parsed, percent, phase: 'pulling', model: CHALK_LOCAL_DOWNLOAD_MODEL })}\n\n`);
          } catch {}
        }
      }

      if (!failed) {
        res.write(`data: ${JSON.stringify({ status: 'success', completed: true, phase: 'done', model: CHALK_LOCAL_DOWNLOAD_MODEL })}\n\n`);
      }
      res.end();
    } catch (e: any) {
      const message = 'The local model download failed. Ollama could not finish the pull.';
      if (!res.headersSent) {
        return res.status(502).json({ success: false, error: message });
      }
      res.write(`data: ${JSON.stringify({ status: 'failed', error: message })}\n\n`);
      res.end();
    }
  } else {
    try {
      const response = await fetch(`${origin}/api/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createBodyFromModelfile(modelfile, false))
      });

      if (response.ok) {
        res.json({ success: true, message: 'The local model is downloading or already on this laptop.' });
      } else {
        res.status(response.status).json({
          success: false,
          error: `The local model download failed. Ollama could not start the pull (${response.status}).`
        });
      }
    } catch {
      res.status(502).json({
        success: false,
        error: 'The local model download failed. Ollama could not finish the pull.'
      });
    }
  }
});

const classifyAiError = (error: any): { code: AiErrorCode; status: number; message: string; retryable: boolean } => {
  const raw = String(error?.message || error || '').toLowerCase();
  const status = Number(error?.status || error?.cause?.status || 500);

  if (status === 401 || status === 403 || raw.includes('api key') || raw.includes('permission denied')) {
    return { code: 'invalid_key', status: 401, retryable: false, message: 'The Gemini API key is invalid or does not have permission.' };
  }
  if (status === 404 || raw.includes('not found') || raw.includes('model')) {
    return { code: 'model_not_found', status: 404, retryable: false, message: 'The configured AI model was not found.' };
  }
  if (raw.includes('spending cap') || raw.includes('spend cap') || raw.includes('resource_exhausted')) {
    return { 
      code: 'rate_limited', 
      status: 429, 
      retryable: false, 
      message: 'The monthly spending cap for your Gemini API key in Google AI Studio has been reached. Use another provider (Vertex AI or local Ollama) in Settings, or update the API key.' 
    };
  }
  if (status === 429 || raw.includes('quota') || raw.includes('rate')) {
    return { code: 'rate_limited', status: 429, retryable: true, message: 'The AI request limit has been reached. Try again in a moment.' };
  }
  if (raw.includes('fetch failed') || raw.includes('network') || raw.includes('timeout') || raw.includes('econnrefused')) {
    return { code: raw.includes('localhost') || raw.includes('11434') ? 'local_unavailable' : 'no_internet', status: 503, retryable: true, message: raw.includes('localhost') || raw.includes('11434') ? 'Local Ollama could not be reached.' : 'The internet connection to the AI service is having trouble.' };
  }

  return { code: 'server_error', status, retryable: false, message: 'The AI service ran into an unexpected error.' };
};

const sendAiError = (res: Response, error: unknown) => {
  const classified = classifyAiError(error);
  res.status(classified.status).json({
    error: classified.message,
    code: classified.code,
    retryable: classified.retryable,
    detail: process.env.NODE_ENV === 'production' ? undefined : error instanceof Error ? error.message : String(error)
  });
};

const geminiKeyPresent = (customGeminiKey?: string) =>
  !!(customGeminiKey || process.env.GEMINI_API_KEY || process.env.API_KEY);

/** API-key calls use the strong Gemma model. E2B stays on the offline Ollama path. */
const modelForGeminiKey = (selected?: unknown): string => {
  if (typeof selected === 'string') {
    const name = selected.trim();
    if (name.startsWith('gemma-') && !/e2b/i.test(name)) return name;
  }
  return STRONG_GEMMA_MODEL;
};

const offlineModelAlreadyPresent = (names: string[]) => names.some(name => {
  const normalized = name.toLowerCase();
  return normalized === CHALK_LOCAL_DOWNLOAD_MODEL.toLowerCase()
    || normalized === CHALK_LOCAL_BASE_MODEL.toLowerCase();
});

/** This Ollama build ignores a raw Modelfile string and requires `from`. */
const createBodyFromModelfile = (raw: string, stream: boolean) => {
  const from = raw.match(/^FROM\s+(\S+)/m)?.[1];
  if (from !== CHALK_LOCAL_BASE_MODEL) {
    throw new Error('The model definition must use the E2B base.');
  }
  const parameters: Record<string, number | string | string[]> = {};
  const stops: string[] = [];
  for (const line of raw.split('\n')) {
    const match = line.match(/^PARAMETER\s+(\S+)\s+(.+)$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2].trim().replace(/^"|"$/g, '');
    if (key === 'stop') {
      stops.push(value);
      continue;
    }
    const numeric = Number(value);
    parameters[key] = Number.isFinite(numeric) ? numeric : value;
  }
  if (stops.length > 0) parameters.stop = stops;
  const block = (name: string) => {
    const marker = `${name} """`;
    const start = raw.indexOf(marker);
    if (start === -1) return undefined;
    const body = raw.slice(start + marker.length);
    const end = body.indexOf('\n"""');
    return (end === -1 ? body : body.slice(0, end)).replace(/^\r?\n/, '');
  };
  return {
    model: CHALK_LOCAL_DOWNLOAD_MODEL,
    from,
    system: block('SYSTEM'),
    template: block('TEMPLATE'),
    parameters,
    stream
  };
};

const getCandidateModes = (
  configuredMode: AiPreference,
  status: CachedStatus,
  customGeminiKey?: string
): AiMode[] => boardProviders({
  preference: configuredMode,
  hasKey: geminiKeyPresent(customGeminiKey),
  ollamaReady: !!(status.ollamaStatus?.online && status.ollamaStatus?.hasModel),
  cloudBlocked: isGeminiBlocked(),
});

aiRouter.get("/status", async (req, res) => {
  res.json(await getAvailableMode());
});

aiRouter.post("/status", async (req, res) => {
  const { aiPreference, geminiApiKey, ollamaBaseUrl, selectedOllamaModel, selectedVertexModel, selectedGeminiModel } = req.body;
  const status = await getAvailableMode(geminiApiKey, ollamaBaseUrl, selectedOllamaModel);

  // Strictly honor explicit user preference if the preferred backend is available
  if (aiPreference === 'ollama' || (aiPreference !== 'gemini' && aiPreference !== 'vertex' && status.ollamaStatus?.online && status.ollamaStatus?.hasModel)) {
    status.mode = 'ollama';
    status.model = localModelName(selectedOllamaModel, status.ollamaStatus?.models || [], CHALK_LOCAL_DOWNLOAD_MODEL);
    status.online = !!status.ollamaStatus?.online;
    status.reason = status.ollamaStatus?.online ? 'ok' : 'local_unavailable';
  } else if (aiPreference === 'vertex' && status.vertexStatus?.online) {
    status.mode = 'vertex';
    status.model = selectedVertexModel || status.model;
  } else if (aiPreference === 'gemini' && !isGeminiBlocked() && geminiKeyPresent(geminiApiKey)) {
    status.mode = 'gemini';
    status.model = modelForGeminiKey(selectedGeminiModel);
    status.online = true;
    status.reason = 'ok';
  } else if (status.ollamaStatus?.online && status.ollamaStatus?.hasModel) {
    status.mode = 'ollama';
    status.model = localModelName(selectedOllamaModel, status.ollamaStatus.models || [], CHALK_LOCAL_DOWNLOAD_MODEL);
    status.online = true;
    status.reason = 'ok';
  } else if (aiPreference === 'gemini' && (status.geminiStatus?.online || geminiApiKey)) {
    status.mode = 'gemini';
    status.model = modelForGeminiKey(selectedGeminiModel);
  } else if (selectedVertexModel && status.mode === 'vertex') {
    status.model = selectedVertexModel;
  } else if (selectedGeminiModel && status.mode === 'gemini') {
    status.model = selectedGeminiModel;
  }
  res.json(status);
});

aiRouter.get("/whisper-status", async (_req, res) => {
  const available = await isWhisperAvailable();
  res.json({
    available,
    engine: "faster-whisper",
    model: "base",
    device: "cpu",
    supportedLanguages: ["id", "en", "ar", "zh", "fr", "ru", "es", "ja", "ko", "de", "pt"]
  });
});

aiRouter.post("/quest", async (req, res) => {
  const notes = typeof req.body?.notes === 'string' ? req.body.notes : '';
  const secret = typeof req.body?.geminiApiKey === 'string' ? req.body.geminiApiKey : '';
  try {
    const draft = await writeQuestOnLaptop({
      notes,
      geminiApiKey: secret,
      ollamaBaseUrl: typeof req.body?.ollamaBaseUrl === 'string' ? req.body.ollamaBaseUrl : undefined,
      preferLocal: req.body?.aiPreference !== 'gemini' || isGeminiBlocked(),
    });
    if (!questResponseIsSafe(draft, secret.trim())) {
      return res.status(500).json({ error: 'The quest could not be written on this laptop.' });
    }
    res.json({ quest: draft });
  } catch (err) {
    const message = err instanceof QuestWriteError
      ? err.message
      : 'The quest could not be written on this laptop.';
    logger.warn('Quest route failed');
    res.status(503).json({ error: message });
  }
});

aiRouter.post("/generate", async (req, res) => {
  const startTime = Date.now();
  const { prompt, canvasImageBase64, canvasObjects, viewport, highResInputImage, history, pageContext, domElements, aiPreference, geminiApiKey, ollamaBaseUrl, selectedGeminiModel, selectedOllamaModel, selectedVertexModel, intent, forceTools, lessonContext, sessionId } = req.body;
  const activeSessionId = sessionId || (req.headers['x-session-id'] as string) || 'session_default';
  let activeMode: 'vertex' | 'gemini' | 'ollama' | 'unknown' = 'unknown';
  let activeModel = 'unknown';

  try {
    const configuredMode = getRuntimePreference(aiPreference);
    const status = await getAvailableMode(geminiApiKey, ollamaBaseUrl, selectedOllamaModel);

    const candidateModes = getCandidateModes(configuredMode, status, geminiApiKey);

    if (candidateModes.length === 0 || status.mode === 'unavailable') {
      let reason = 'no_internet';
      let serviceName = 'AI';

      if (configuredMode === 'gemini') {
        reason = status.geminiStatus?.reason || 'no_internet';
        serviceName = 'Gemini';
      } else if (configuredMode === 'vertex') {
        reason = status.vertexStatus?.reason || 'no_internet';
        serviceName = 'Vertex AI';
      } else {
        reason = status.ollamaStatus?.online ? 'model_missing' : 'local_unavailable';
        serviceName = 'Ollama';
      }

      telemetryService.recordEvent({
        sessionId: activeSessionId,
        endpoint: '/api/ai/generate',
        provider: 'unknown',
        model: 'unavailable',
        prompt: prompt || '',
        latencyMs: Date.now() - startTime,
        status: 'error',
        errorCode: reason,
        errorMessage: `${serviceName} is not available.`
      });

      return res.status(503).json({
        error: `${serviceName} is not available.`,
        code: reason === 'invalid_key' || reason === 'missing_project' ? 'invalid_key' : 'no_internet',
        retryable: true
      });
    }

    let result: any;
    let lastError: any = null;
    let success = false;

    for (const mode of candidateModes) {
      let modeSuccess = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          logger.info(`Attempting /generate with mode: ${mode}${attempt > 0 ? ' (retry)' : ''}`);
          activeMode = mode;
          if (mode === 'vertex') {
            activeModel = selectedVertexModel || CONFIG.ai.vertex.model;
            result = await generateAgentActionsVertex(
              prompt, canvasImageBase64, canvasObjects, viewport, highResInputImage, history, pageContext, domElements, intent, forceTools, lessonContext, selectedVertexModel
            );
          } else if (mode === 'gemini') {
            activeModel = modelForGeminiKey(selectedGeminiModel);
            result = await generateAgentActionsGemini(
              prompt, canvasImageBase64, canvasObjects, viewport, highResInputImage, history, pageContext, domElements, geminiApiKey, intent, forceTools, lessonContext, activeModel
            );
          } else if (mode === 'ollama') {
            activeModel = localModelName(selectedOllamaModel, status.ollamaStatus?.models || [], CHALK_LOCAL_DOWNLOAD_MODEL);
            result = await generateAgentActionsOllama(
              prompt, canvasImageBase64, canvasObjects, viewport, highResInputImage, history, pageContext, domElements, ollamaBaseUrl, intent, forceTools, lessonContext, activeModel
            );
          }
          modeSuccess = true;
          break;
        } catch (err: any) {
          const is500 = err?.status === 500 || err?.message?.includes('"code":500');
          if (attempt === 0 && is500) {
            logger.warn(`[Retry] 500 from ${mode}, retrying in 1.2s...`);
            await new Promise(r => setTimeout(r, 1200));
            continue;
          }
          if (mode === 'gemini') noteGeminiFailure(String(err?.message || ''), Number(err?.status));
          logger.warn('Generate failed', { mode });
          lastError = err;
          break;
        }
      }
      if (modeSuccess) { success = true; break; }
    }

    if (!success) {
      const errDetail = lastError?.message ? ` (${lastError.message})` : '';
      throw lastError || new Error(`Every configured AI provider failed to process the request.${errDetail}`);
    }

    const duration = Date.now() - startTime;
    const usage = result?.usageMetadata || {};
    const promptTokens = usage.promptTokenCount || Math.round((prompt?.length || 0) / 4);
    const outputTokens = usage.candidatesTokenCount || Math.round((result?.textResponse?.length || 0) / 4);

    const teleRecord = telemetryService.recordEvent({
      sessionId: activeSessionId,
      endpoint: '/api/ai/generate',
      provider: activeMode,
      model: activeModel,
      prompt: prompt || '',
      promptTokens,
      outputTokens,
      thinkingTokens: result?.thought ? Math.round(result.thought.length / 4) : 0,
      latencyMs: duration,
      status: 'success',
      functionCalls: result?.functionCalls || [],
      responseText: result?.textResponse || '',
      canvasObjectsCount: Array.isArray(canvasObjects) ? canvasObjects.length : 0,
      domElementsCount: domElements ? Object.keys(domElements).length : 0
    });

    res.json({
      ...result,
      telemetry: {
        id: teleRecord.id,
        promptTokens: teleRecord.promptTokens,
        outputTokens: teleRecord.outputTokens,
        totalTokens: teleRecord.totalTokens,
        costUsd: teleRecord.costUsd,
        costIdr: teleRecord.costIdr,
        latencyMs: teleRecord.latencyMs,
        provider: teleRecord.provider,
        model: teleRecord.model,
        sheetSyncStatus: teleRecord.sheetSyncStatus
      }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    telemetryService.recordEvent({
      sessionId: activeSessionId,
      endpoint: '/api/ai/generate',
      provider: activeMode,
      model: activeModel,
      prompt: prompt || '',
      latencyMs: duration,
      status: 'error',
      errorCode: error?.code || 'server_error',
      errorMessage: error?.message || String(error)
    });
    logger.error("Generate error", error);
    sendAiError(res, error);
  }
});

aiRouter.post("/tool-content", async (req, res) => {
  const startTime = Date.now();
  const { toolId, prompt, aiPreference, geminiApiKey, ollamaBaseUrl, selectedGeminiModel, selectedOllamaModel, selectedVertexModel, sessionId } = req.body;
  const activeSessionId = sessionId || (req.headers['x-session-id'] as string) || 'session_default';
  let activeMode: 'vertex' | 'gemini' | 'ollama' | 'unknown' = 'unknown';
  let activeModel = 'unknown';

  try {
    const configuredMode = getRuntimePreference(aiPreference);
    const status = await getAvailableMode(geminiApiKey, ollamaBaseUrl, selectedOllamaModel);

    const candidateModes = getCandidateModes(configuredMode, status, geminiApiKey);

    if (candidateModes.length === 0 || status.mode === 'unavailable') {
      telemetryService.recordEvent({
        sessionId: activeSessionId,
        endpoint: `/api/ai/tool-content?tool=${toolId || ''}`,
        provider: 'unknown',
        model: 'unavailable',
        prompt: prompt || '',
        latencyMs: Date.now() - startTime,
        status: 'error',
        errorCode: 'no_internet',
        errorMessage: 'The AI service is not available yet.'
      });
      return res.status(503).json({ error: 'The AI service is not available yet.', code: 'no_internet', retryable: true });
    }

    let result;
    let lastError: any = null;
    let success = false;

    for (const mode of candidateModes) {
      try {
        logger.info(`Attempting /tool-content with mode: ${mode}`);
        activeMode = mode;
        if (mode === 'vertex') {
          activeModel = selectedVertexModel || CONFIG.ai.vertex.model;
          result = await generateToolContentVertex(toolId, prompt, selectedVertexModel);
        } else if (mode === 'gemini') {
          activeModel = selectedGeminiModel || getGeminiModel();
          result = await generateToolContentGemini(toolId, prompt, geminiApiKey, modelForGeminiKey(selectedGeminiModel));
        } else if (mode === 'ollama') {
          activeModel = localModelName(selectedOllamaModel, status.ollamaStatus?.models || [], CHALK_LOCAL_DOWNLOAD_MODEL);
          result = await generateToolContentOllama(toolId, prompt, ollamaBaseUrl, activeModel);
        }
        success = true;
        break;
      } catch (err: any) {
        if (mode === 'gemini') noteGeminiFailure(String(err?.message || ''), Number(err?.status));
        logger.warn('Tool content failed', { mode });
        lastError = err;
      }
    }

    if (!success) {
      throw lastError || new Error("Every configured AI provider failed to generate the tool content.");
    }

    const duration = Date.now() - startTime;
    const promptTokens = Math.round((prompt?.length || 0) / 4);
    const outputTokens = Math.round(JSON.stringify(result || '').length / 4);

    const teleRecord = telemetryService.recordEvent({
      sessionId: activeSessionId,
      endpoint: `/api/ai/tool-content?tool=${toolId || ''}`,
      provider: activeMode,
      model: activeModel,
      prompt: `[Tool: ${toolId}] ${prompt}`,
      promptTokens,
      outputTokens,
      latencyMs: duration,
      status: 'success',
      responseText: typeof result === 'string' ? result : JSON.stringify(result)
    });

    res.json({
      result,
      telemetry: {
        id: teleRecord.id,
        totalTokens: teleRecord.totalTokens,
        costUsd: teleRecord.costUsd,
        costIdr: teleRecord.costIdr,
        latencyMs: teleRecord.latencyMs,
        provider: teleRecord.provider,
        model: teleRecord.model
      }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    telemetryService.recordEvent({
      sessionId: activeSessionId,
      endpoint: `/api/ai/tool-content?tool=${toolId || ''}`,
      provider: activeMode,
      model: activeModel,
      prompt: prompt || '',
      latencyMs: duration,
      status: 'error',
      errorCode: error?.code || 'server_error',
      errorMessage: error?.message || String(error)
    });
    logger.error("Tool content error", error);
    sendAiError(res, error);
  }
});

const SPEECH_TYPE_MESSAGE = 'Speech could not be heard. Type the question.';
let blockedSpeechKey = '';

const speechKeyFingerprint = (key: string) => {
  const trimmed = key.trim();
  if (trimmed.length < 8) return '';
  return `${trimmed.length}:${trimmed.slice(-4)}`;
};

const isSpeechQuotaError = (error: any): boolean => {
  const status = Number(error?.status || error?.cause?.status || 0);
  const raw = String(error?.message || error || '').toLowerCase();
  return status === 429 || status === 402
    || raw.includes('resource_exhausted')
    || raw.includes('quota')
    || raw.includes('too many')
    || raw.includes('prepayment')
    || raw.includes('rate limit')
    || raw.includes('rate_limited');
};

aiRouter.post("/transcribe", async (req, res) => {
  const startTime = Date.now();
  const { base64Audio, aiPreference, geminiApiKey, selectedGeminiModel, sessionId } = req.body || {};
  if (!base64Audio || typeof base64Audio !== 'string') {
    return res.status(400).json({ error: 'No audio provided' });
  }
  const cleanAudio = base64Audio.replace(/^data:audio\/[a-zA-Z0-9+.-]+;base64,/, '');
  const speechKey = (typeof geminiApiKey === 'string' && geminiApiKey.trim())
    || process.env.GEMINI_API_KEY
    || process.env.API_KEY
    || '';
  const speechFingerprint = speechKeyFingerprint(speechKey);
  const activeSessionId = sessionId || (req.headers['x-session-id'] as string) || 'session_default';
  let activeMode: 'vertex' | 'gemini' | 'ollama' | 'unknown' = 'unknown';
  let activeModel = 'unknown';

  try {
    const preferWhisper = req.body?.mode === 'faster_whisper'
      || req.body?.transcribeMode === 'faster_whisper'
      || aiPreference !== 'gemini';
    const hasKey = geminiKeyPresent(geminiApiKey);
    const providers = speechProviders({
      preferWhisper,
      cloudBlocked: isGeminiBlocked() || (speechFingerprint !== '' && speechFingerprint === blockedSpeechKey),
      hasKey,
    });

    let text = "";
    let success = false;

    for (const provider of providers) {
      try {
        if (provider === 'gemini') {
          activeMode = 'gemini';
          activeModel = modelForGeminiKey(selectedGeminiModel);
          text = await transcribeAudioGemini(cleanAudio, geminiApiKey, activeModel);
          success = true;
          break;
        }
        activeMode = 'ollama';
        activeModel = 'whisper';
        logger.info(`[Router] Offline speech for language: ${req.body.language || 'auto'}`);
        text = await transcribeAudioWhisper(base64Audio, req.body.language || 'auto');
        if (text.trim()) {
          success = true;
          break;
        }
      } catch (err: any) {
        if (provider === 'gemini' && isSpeechQuotaError(err) && speechFingerprint) {
          blockedSpeechKey = speechFingerprint;
        }
        logger.warn('Speech attempt failed', { provider });
      }
    }

    if (!success) {
      return res.status(503).json({
        error: SPEECH_TYPE_MESSAGE,
        code: 'speech_unavailable',
        retryable: false
      });
    }

    const duration = Date.now() - startTime;
    const approxTokens = Math.round((text.length / 4) + 256);

    const teleRecord = telemetryService.recordEvent({
      sessionId: activeSessionId,
      endpoint: '/api/ai/transcribe',
      provider: activeMode,
      model: activeModel,
      prompt: '[Audio Recording Transcription]',
      promptTokens: 256,
      outputTokens: Math.round(text.length / 4),
      latencyMs: duration,
      status: 'success',
      responseText: text
    });

    res.json({
      text,
      telemetry: {
        id: teleRecord.id,
        totalTokens: approxTokens,
        costUsd: teleRecord.costUsd,
        costIdr: teleRecord.costIdr,
        latencyMs: teleRecord.latencyMs
      }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    telemetryService.recordEvent({
      sessionId: activeSessionId,
      endpoint: '/api/ai/transcribe',
      provider: activeMode,
      model: activeModel,
      prompt: '[Audio Recording Transcription]',
      latencyMs: duration,
      status: 'error',
      errorCode: error?.code || 'server_error',
      errorMessage: error?.message || String(error)
    });
    logger.error('Transcribe error');
    return res.status(503).json({
      error: SPEECH_TYPE_MESSAGE,
      code: 'speech_unavailable',
      retryable: false
    });
  }
});

// ── TELEMETRY & GOOGLE SHEETS API ROUTES ───────────────────────────────────

aiRouter.get("/telemetry", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  res.json({
    summary: telemetryService.getSummary(),
    recentLogs: telemetryService.getRecentRecords(limit),
    config: telemetryService.getConfig()
  });
});

aiRouter.get("/telemetry/download", (req, res) => {
  const format = req.query.format === 'json' ? 'json' : 'csv';
  const dateStr = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="chalk_telemetry_${dateStr}.json"`);
    return res.send(JSON.stringify(telemetryService.getAllRecords(), null, 2));
  } else {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="chalk_telemetry_${dateStr}.csv"`);
    return res.send(telemetryService.generateCsv());
  }
});

aiRouter.post("/telemetry/feedback", (req, res) => {
  const { logId, rating, feedback } = req.body;
  if (!logId || !rating) {
    return res.status(400).json({ error: 'Missing logId or rating' });
  }
  const ok = telemetryService.recordFeedback(logId, rating, feedback);
  res.json({ success: ok });
});

aiRouter.post("/telemetry/sync", async (req, res) => {
  try {
    const result = await telemetryService.syncPending();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

aiRouter.get("/telemetry/config", (req, res) => {
  res.json({
    config: telemetryService.getConfig(),
    appsScriptTemplate: telemetryService.getAppsScriptCode()
  });
});

aiRouter.post("/telemetry/config", (req, res) => {
  const { googleSheetId, googleSheetName, googleSheetWebhookUrl, autoSync } = req.body;
  telemetryService.saveConfig({
    ...(googleSheetId !== undefined ? { googleSheetId } : {}),
    ...(googleSheetName !== undefined ? { googleSheetName } : {}),
    ...(googleSheetWebhookUrl !== undefined ? { googleSheetWebhookUrl } : {}),
    ...(autoSync !== undefined ? { autoSync: Boolean(autoSync) } : {})
  });
  res.json({ success: true, config: telemetryService.getConfig() });
});
