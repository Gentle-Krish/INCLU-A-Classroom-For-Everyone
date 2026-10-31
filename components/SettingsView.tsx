import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Key, Cpu, Globe, Moon, Sun, User, Save, CheckCircle2,
  Eye, EyeOff, ExternalLink, Wifi, WifiOff, Zap, Shield, HardDrive,
  ChevronRight, RotateCcw, Trash2, Volume2, VolumeX, Info,
  Mic, Radio, Upload, Sparkles, Database, FileSpreadsheet, Download,
  Shapes, Users, Flame, Workflow, HeartHandshake, AlertCircle
} from 'lucide-react';
import { useStore } from '../store';
import { toast } from '../utils/toast';
import { useTranslation, SUPPORTED_LANGUAGES } from '../utils/translations';
import { SupportedLanguage } from '../types';
import { getTelemetryDownloadUrl } from '../services/aiService';
import { useAiStatus } from '../hooks/useAiStatus';
import { CHALK_LOCAL_BASE_MODEL, CHALK_LOCAL_DOWNLOAD_MODEL, GEMINI_MODEL, STRONG_GEMMA_MODEL } from '../constants';
import {
  OllamaNotInstalledError,
  probeLocalModel,
  pullLocalModel
} from '../utils/localModelDownload';

function hideGemmaWords(text: string): string {
  return text.replace(/\b[\w.-]*gemma[\w.:-]*/gi, 'local model');
}

function visibleOllamaName(id: string): string {
  if (!id) return 'Local model';
  if (/gemma/i.test(id)) return 'Inclu local model';
  return id;
}

interface SettingsViewProps {
  isOpen?: boolean;
  onClose: () => void;
}

type SettingsTab = 'ai' | 'features' | 'audio' | 'language' | 'data';

const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="bg-[#FFF6EE] rounded-3xl border border-[#E7DDD2] shadow-xs overflow-hidden">
    <div className="px-6 py-4 border-b border-[#E7DDD2] bg-[#F6F0E8]">
      <h3 className="font-extrabold text-[#3F2A1D] text-sm tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-[#A08B7A] font-medium mt-0.5">{subtitle}</p>}
    </div>
    <div className="p-6 space-y-4">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-extrabold text-[#A08B7A] uppercase tracking-widest">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-[#A08B7A] font-medium leading-relaxed">{hint}</p>}
  </div>
);

const inputCls = "w-full bg-[#F6F0E8] border border-[#E7DDD2] rounded-xl py-2.5 px-3.5 text-sm font-semibold text-[#3F2A1D] placeholder:text-[#A08B7A] focus:outline-none focus:border-[#F4B183] focus:ring-4 focus:ring-[#F4B183]/40 transition-all";

export const SettingsView: React.FC<SettingsViewProps> = ({ isOpen = true, onClose }) => {
  const { t } = useTranslation();
  const {
    aiPreference, setAiPreference,
    geminiApiKey, setGeminiApiKey,
    ollamaBaseUrl, setOllamaBaseUrl,
    selectedGeminiModel, setSelectedGeminiModel,
    selectedOllamaModel, setSelectedOllamaModel,
    selectedVertexModel, setSelectedVertexModel,
    theme, toggleTheme,
    userName, setUserName,
    language, setLanguage,
    transcribeMode, setTranscribeMode,
    voiceConfig, setVoiceConfig,
    experimentalConfig, setExperimentalConfig,
    isAssistiveMode, toggleAssistiveMode,
  } = useStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');

  // Local state — only commit to store/localStorage on Save
  const [localKey, setLocalKey] = useState(geminiApiKey);
  const [localOllamaUrl, setLocalOllamaUrl] = useState(ollamaBaseUrl || 'http://localhost:11434');
  const [localGeminiModel, setLocalGeminiModel] = useState(() => {
    if (!selectedGeminiModel || /e2b|inclu-gemma/i.test(selectedGeminiModel)) {
      return GEMINI_MODEL;
    }
    return selectedGeminiModel;
  });
  const [localOllamaModel, setLocalOllamaModel] = useState(selectedOllamaModel);
  const [localVertexModel, setLocalVertexModel] = useState(() => {
    return (!selectedVertexModel || selectedVertexModel === 'gemini-3.7-flash') ? 'gemini-3.8-flash' : selectedVertexModel;
  });
  const [localTranscribeMode, setLocalTranscribeMode] = useState(transcribeMode);
  const [localVoiceConfig, setLocalVoiceConfig] = useState(voiceConfig);
  const [localExpConfig, setLocalExpConfig] = useState(experimentalConfig);
  const [localName, setLocalName] = useState(userName);
  const [localAiPref, setLocalAiPref] = useState(aiPreference);
  const [localLang, setLocalLang] = useState(language);
  const [showKey, setShowKey] = useState(false);
  const liveAiStatus = useAiStatus();
  const detectedOllamaModels = liveAiStatus.ollamaStatus?.models || [];
  const [saved, setSaved] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('chalk_sound') !== 'off');

  // AI status probe
  const [aiStatus, setAiStatus] = useState<'checking' | 'online' | 'offline' | null>(null);

  // Model Pull Streaming Progress State
  const [isPullingModel, setIsPullingModel] = useState(false);
  const [pullProgress, setPullProgress] = useState<{
    status: string;
    percent?: number | null;
    error?: string;
  } | null>(null);
  const [ollamaGate, setOllamaGate] = useState<'unknown' | 'up' | 'down'>('unknown');

  const isModelInstalled = detectedOllamaModels.some(m => 
    m === localOllamaModel || m.startsWith(localOllamaModel.split(':')[0])
  );
  const localModelReady = detectedOllamaModels.some(m => {
    const name = m.toLowerCase();
    return name === CHALK_LOCAL_DOWNLOAD_MODEL || name === CHALK_LOCAL_BASE_MODEL;
  }) || pullProgress?.status === 'The local model is ready.';

  const handleRecheckOllama = async () => {
    setPullProgress(null);
    setIsPullingModel(false);
    try {
      const probe = await probeLocalModel(localOllamaUrl);
      setOllamaGate(probe.ollamaRunning ? 'up' : 'down');
      if (probe.modelReady) {
        setPullProgress({ status: 'The local model is ready.', percent: 100 });
        handleProbe();
      }
    } catch {
      setOllamaGate('down');
    }
  };

  const handlePullModel = async () => {
    setPullProgress(null);
    try {
      const probe = await probeLocalModel(localOllamaUrl);
      if (!probe.ollamaRunning) {
        setOllamaGate('down');
        setIsPullingModel(false);
        return;
      }
      setOllamaGate('up');
      if (probe.modelReady) {
        setIsPullingModel(false);
        setPullProgress({ status: 'The local model is ready.', percent: 100 });
        handleProbe();
        return;
      }
      await pullLocalModel((update) => {
        if (update.phase === 'not_installed') {
          setOllamaGate('down');
          setIsPullingModel(false);
          setPullProgress(null);
          return;
        }
        setIsPullingModel(update.phase === 'started' || update.phase === 'pulling');
        setPullProgress({
          status: update.status,
          percent: update.percent,
          error: update.error
        });
        if (update.phase === 'failed') {
          toast.error(update.error || 'The local model download failed.');
        }
        if (update.phase === 'done') {
          toast.success('The local model is ready.');
        }
      }, localOllamaUrl);
      setIsPullingModel(false);
      handleProbe();
    } catch (err: unknown) {
      setIsPullingModel(false);
      if (err instanceof OllamaNotInstalledError) {
        setOllamaGate('down');
        setPullProgress(null);
        return;
      }
      const message = hideGemmaWords(err instanceof Error ? err.message : 'The local model download failed.');
      setPullProgress({ status: 'Failed', error: message });
      toast.error(message);
    }
  };

  const handleProbe = async () => {
    setAiStatus('checking');
    try {
      const res = await fetch('/api/ai/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          geminiApiKey: localKey, 
          ollamaBaseUrl: localOllamaUrl,
          selectedOllamaModel: localOllamaModel,
          aiPreference: localAiPref
        })
      });
      const data = await res.json();
      setAiStatus(data.online !== false && data.mode !== 'unavailable' ? 'online' : 'offline');
    } catch {
      setAiStatus('offline');
    }
  };

  useEffect(() => {
    handleProbe();
  }, [localAiPref, localOllamaModel]);

  useEffect(() => {
    if (!liveAiStatus.checkedAt) return;
    setOllamaGate(liveAiStatus.ollamaStatus?.online ? 'up' : 'down');
  }, [liveAiStatus.checkedAt, liveAiStatus.ollamaStatus?.online]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = () => {
    setGeminiApiKey(localKey);
    setOllamaBaseUrl(localOllamaUrl);
    setSelectedGeminiModel(localGeminiModel);
    setSelectedOllamaModel(localOllamaModel);
    setSelectedVertexModel(localVertexModel);
    setTranscribeMode(localTranscribeMode);
    setVoiceConfig(localVoiceConfig);
    setExperimentalConfig(localExpConfig);
    setUserName(localName);
    setAiPreference(localAiPref);
    setLanguage(localLang);
    localStorage.setItem('gemini_api_key', localKey);
    localStorage.setItem('ollama_base_url', localOllamaUrl);
    localStorage.setItem('selected_gemini_model', localGeminiModel);
    localStorage.setItem('selected_ollama_model', localOllamaModel);
    localStorage.setItem('selected_vertex_model', localVertexModel);
    localStorage.setItem('chalk_transcribe_mode', localTranscribeMode);
    localStorage.setItem('chalk_voice_config', JSON.stringify(localVoiceConfig));
    localStorage.setItem('chalk_experimental_config', JSON.stringify(localExpConfig));
    localStorage.setItem('chalk_user_name', localName);
    localStorage.setItem('ai_preference', localAiPref);
    localStorage.setItem('chalk_sound', soundEnabled ? 'on' : 'off');
    setSaved(true);
    toast.success(t('saved', 'Settings saved') + '!');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearAllData = () => {
    if (!window.confirm(t('clearDataConfirm', 'Clear all local data, including saved sessions and API keys? This cannot be undone.'))) return;
    localStorage.clear();
    toast.success(t('clearDataSuccess', 'All local data has been cleared. Reloading...'));
    setTimeout(() => window.location.reload(), 1500);
  };

  const isGeminiMode = localAiPref === 'gemini' || localAiPref === 'auto';
  const isOllamaMode = localAiPref === 'ollama' || localAiPref === 'auto';
  const isVertexMode = localAiPref === 'vertex' || localAiPref === 'auto';

  const TABS: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'ai', label: 'AI', icon: Cpu },
    { id: 'features', label: 'Board features', icon: Sparkles },
    { id: 'audio', label: 'Audio & access', icon: Mic },
    { id: 'language', label: 'Language & theme', icon: Globe },
    { id: 'data', label: 'Data & copyright', icon: Database },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#3f2a1d]/30 backdrop-blur-xs font-sans">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0"
          />
          <motion.div
            role="dialog"
            aria-labelledby="settings-dialog-title"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex w-full max-w-3xl max-h-[88vh] flex-col overflow-hidden rounded-[32px] border border-[#E7DDD2] bg-[#F6F0E8] shadow-2xl z-[101]"
          >
            {/* Header */}
            <div className="px-6 py-4 sm:px-7 sm:py-5 flex justify-between items-center bg-[#FFF6EE] border-b border-[#E7DDD2] shrink-0">
              <div>
                <h2 id="settings-dialog-title" className="text-xl sm:text-2xl font-black text-[#3F2A1D] tracking-tight">{t('settingsTitle', 'Settings')}</h2>
                <p className="text-xs sm:text-sm font-semibold text-[#A08B7A] mt-0.5">{t('settingsSubtitle', 'Configure AI, class tools, and board preferences')}</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#6B4423] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-[#6B4423]/20 hover:bg-[#3F2A1D] transition-colors cursor-pointer"
                >
                  <AnimatePresence mode="wait">
                    {saved ? (
                      <motion.span key="saved" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                        <CheckCircle2 size={16} /> {t('saved', 'Saved')}
                      </motion.span>
                    ) : (
                      <motion.span key="save" className="flex items-center gap-2">
                        <Save size={16} /> {t('save', 'Save')}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#F6F0E8] text-[#6B4423] hover:bg-[#E7DDD2] transition-colors cursor-pointer border border-[#E7DDD2]"
                  title="Close"
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              </div>
            </div>

            {/* Modern Horizontal Navigation Tabs */}
            <div className="bg-[#FFF6EE] border-b border-[#E7DDD2] px-6 sm:px-7 shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto py-2.5 custom-scrollbar">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-[#6B4423] text-white shadow-sm shadow-[#6B4423]/20'
                          : 'text-[#6B4423] hover:bg-[#F6F0E8] hover:text-[#3F2A1D]'
                      }`}
                    >
                      <Icon size={15} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 custom-scrollbar">
              <div className="space-y-6">

          {/* ════════ TAB 1: KECERDASAN AI ════════ */}
          {activeTab === 'ai' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Panduan Cepat Pemula & Pengingat Penting Model Inclu / API Key */}
              <div className="bg-[#FFF6EE] rounded-3xl border-2 border-[#6B4423]/20 p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#FFE08A] text-[#3F2A1D] text-[11px] font-black uppercase tracking-wider">
                      Important
                    </span>
                    <span className="text-xs font-extrabold text-[#3F2A1D]">
                      This class laptop needs the local model
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#6B4423]/10 text-[#6B4423]">
                    Local models
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/90 text-[11.5px] font-semibold text-amber-950 leading-relaxed">
                  ⚠️ <strong>Model note:</strong> Use a local model in Ollama, or add your own Google AI Studio key in Settings.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-[#F6F0E8] border border-[#E7DDD2]">
                    <div className="font-black text-[#3F2A1D] mb-1">1. Download the Inclu local model (stays on this laptop)</div>
                    <p className="text-[#6B4423] font-medium leading-relaxed">
                      Choose <strong>Local Ollama</strong> below, then click <strong>Download the local model</strong>. Inclu only downloads that model through Ollama on this computer.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#6B4423]/5 border border-[#6B4423]/15">
                    <div className="font-black text-[#6B4423] mb-1">2. Use your own Google AI Studio API key</div>
                    <p className="text-[#6B4423] font-medium leading-relaxed">
                      Choose <strong>Gemini Cloud</strong>, create your own free <strong>API key (`GEMINI_API_KEY`)</strong> at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[#6B4423] underline font-bold">aistudio.google.com/apikey</a>, paste it below, then click <strong>Save</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <Section title={t('aiConfig', 'AI model provider')} subtitle={t('aiConfigSubtitle', 'Choose private offline mode (Ollama) or a fast cloud mode')}>
                
                {/* AI Mode Selector */}
                <Field label={t('aiMode', 'AI Mode')}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {([
                      { val: 'ollama', label: 'Local Ollama', desc: 'Fully offline and private' },
                      { val: 'auto', label: 'Automatic', desc: 'Use whatever is available' },
                      { val: 'gemini', label: 'Gemini Cloud', desc: 'Google AI Studio' },
                      { val: 'vertex', label: 'Vertex Cloud', desc: 'Google Enterprise' },
                    ] as const).map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => {
                          setLocalAiPref(opt.val);
                          setAiPreference(opt.val);
                        }}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          localAiPref === opt.val
                            ? 'border-[#6B4423] bg-[#F4B183]/25 shadow-xs'
                            : 'border-[#E7DDD2] bg-[#FFF6EE] hover:border-[#F4B183]'
                        }`}
                      >
                        <div className={`font-bold text-xs ${localAiPref === opt.val ? 'text-[#6B4423]' : 'text-[#3F2A1D]'}`}>
                          {opt.label}
                        </div>
                        <div className="text-[10px] text-[#A08B7A] font-medium mt-0.5 leading-tight">
                          {opt.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Status Indicator */}
                <div className="p-3.5 bg-[#F6F0E8] rounded-2xl border border-[#E7DDD2] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      aiStatus === 'online' ? 'bg-emerald-500' : aiStatus === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                    }`} />
                    <span className="text-xs font-bold text-[#6B4423]">
                      {aiStatus === 'online' ? 'AI service connected and ready' : aiStatus === 'checking' ? 'Checking connection...' : 'AI service not connected'}
                    </span>
                  </div>
                  <button
                    onClick={handleProbe}
                    className="text-[11px] font-bold text-[#6B4423] hover:text-[#3F2A1D] hover:underline cursor-pointer"
                  >
                    Test connection again
                  </button>
                </div>

                {/* Ollama Section */}
                {isOllamaMode && (
                  <div className="p-4 bg-[#F6F0E8] rounded-2xl border border-[#E7DDD2] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold text-xs text-[#3F2A1D] flex items-center gap-2">
                        <HardDrive size={15} className="text-emerald-600" />
                        Local model setup (Ollama)
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        100% Offline
                      </span>
                    </div>

                    <Field label="Ollama server URL" hint="Default Ollama URL on this computer (http://localhost:11434)">
                      <input
                        type="text"
                        value={localOllamaUrl}
                        onChange={e => setLocalOllamaUrl(e.target.value)}
                        placeholder="http://localhost:11434"
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Installed Ollama model" hint="Local model used for board commands and visuals">
                      <select
                        value={localOllamaModel}
                        onChange={e => setLocalOllamaModel(e.target.value)}
                        className={inputCls}
                      >
                        <optgroup label="Fast Text Models (Offline)">
                          <option value={CHALK_LOCAL_DOWNLOAD_MODEL}>Inclu local model (inclu-gemma:2b)</option>
                        </optgroup>
                        <optgroup label="Vision & Whiteboard OCR Models (Offline Eyes)">
                          <option value="moondream">Moondream 2 (~1.8B - Ultra-fast Vision)</option>
                          <option value="llava:7b">LLaVA 7B (~7B - High Accuracy OCR & Vision)</option>
                        </optgroup>
                        {detectedOllamaModels.some(m => !/Chalk/i.test(m) && m !== 'chalk-model:latest' && m !== CHALK_LOCAL_DOWNLOAD_MODEL && m.toLowerCase() !== CHALK_LOCAL_BASE_MODEL && m !== 'moondream' && m !== 'llava:7b' && !m.startsWith('moondream:') && !m.startsWith('llava:')) && (
                          <optgroup label="Other models found on this laptop">
                            {detectedOllamaModels.filter(m => !/Chalk/i.test(m) && m !== 'chalk-model:latest' && m !== CHALK_LOCAL_DOWNLOAD_MODEL && m.toLowerCase() !== CHALK_LOCAL_BASE_MODEL && m !== 'moondream' && m !== 'llava:7b' && !m.startsWith('moondream:') && !m.startsWith('llava:')).map(m => (
                              <option key={m} value={m}>{/gemma/i.test(m) ? 'Inclu local model' : `${m} (installed locally)`}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </Field>

                    {localOllamaModel !== CHALK_LOCAL_DOWNLOAD_MODEL && !isModelInstalled && (
                      <p className="text-[11px] font-semibold text-[#6B4423]">
                        To use {localOllamaModel} offline, run: <code className="bg-[#E7DDD2] px-1.5 py-0.5 rounded text-[10px] font-mono select-all">ollama run {localOllamaModel}</code>
                      </p>
                    )}

                    {localModelReady ? (
                      <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-900">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>The local model is ready.</span>
                        </div>
                        <span className="text-[10px] font-mono font-black bg-[#FFF6EE] px-2.5 py-0.5 rounded-full border border-emerald-300 text-emerald-700 shadow-2xs">
                          Done
                        </span>
                      </div>
                    ) : ollamaGate === 'down' ? (
                      <div className="p-4 bg-[#F6F0E8] rounded-2xl border border-[#E7DDD2] space-y-3">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle size={18} className="text-[#3F2A1D] shrink-0 mt-0.5" />
                          <div>
                            <div className="font-extrabold text-xs text-[#3F2A1D]">
                              Ollama is not installed or is not running on this laptop
                            </div>
                            <p className="text-[11px] text-[#3F2A1D] font-medium leading-relaxed mt-0.5">
                              The download did not start. Install and open Ollama yourself, then check again.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { void handleRecheckOllama(); }}
                          className="w-full py-2.5 px-4 bg-[#F4B183] hover:bg-[#F6D7A8] text-[#3F2A1D] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          Check again
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-[#F6F0E8] rounded-2xl border border-[#E7DDD2] space-y-3">
                        <div>
                          <div className="font-extrabold text-xs text-[#3F2A1D]">
                            This class laptop needs the local model
                          </div>
                          <p className="text-[11px] text-[#3F2A1D] font-medium leading-relaxed mt-0.5">
                            Inclu downloads it through Ollama on this computer.
                          </p>
                        </div>

                        {!isPullingModel && !pullProgress && (
                          <button
                            type="button"
                            onClick={() => { void handlePullModel(); }}
                            className="w-full py-2.5 px-4 bg-[#F4B183] hover:bg-[#F6D7A8] text-[#3F2A1D] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Download size={14} />
                            <span>Download the local model</span>
                          </button>
                        )}

                        {(isPullingModel || pullProgress) && (
                          <div className="p-3.5 bg-[#F6F0E8] rounded-xl border border-[#E7DDD2] space-y-2.5 font-sans">
                            <div className="flex items-center justify-between text-xs font-bold text-[#3F2A1D]">
                              <span>{hideGemmaWords(pullProgress?.status || 'Download started')}</span>
                              <span className="font-mono">
                                {pullProgress?.percent !== null && pullProgress?.percent !== undefined ? `${pullProgress.percent}%` : 'Pulling…'}
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-[#E7DDD2] rounded-full overflow-hidden relative">
                              {pullProgress?.percent == null ? (
                                <div className="h-full w-1/3 bg-[#F4B183] rounded-full animate-pulse" />
                              ) : (
                                <div
                                  className="h-full bg-[#F4B183] rounded-full transition-all duration-300"
                                  style={{ width: `${pullProgress.percent}%` }}
                                />
                              )}
                            </div>
                            {pullProgress?.error && (
                              <>
                                <p className="text-[11px] font-semibold text-[#8C3A2F]">{pullProgress.error}</p>
                                <button
                                  type="button"
                                  onClick={() => { void handlePullModel(); }}
                                  className="w-full py-2.5 px-4 bg-[#F4B183] text-[#3F2A1D] text-xs font-bold rounded-xl cursor-pointer"
                                >
                                  Try the download again
                                </button>
                              </>
                            )}
                            <div className="text-[10px] text-[#3F2A1D]/70 font-semibold">Local model</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Gemini / Vertex Cloud Section */}
                {(isGeminiMode || isVertexMode) && (
                  <div className="p-4 bg-[#F6F0E8] rounded-2xl border border-[#E7DDD2] space-y-4">
                    <div className="font-extrabold text-xs text-[#3F2A1D] flex items-center gap-2">
                      <Sparkles size={15} className="text-[#6B4423]" />
                      Cloud model setup (Google AI)
                    </div>

                    {isGeminiMode && (
                      <Field label="Google AI Studio API key" hint="Gemini API key for public cloud mode (stored only in this browser)">
                        <div className="relative">
                          <input
                            type={showKey ? "text" : "password"}
                            value={localKey}
                            onChange={e => setLocalKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className={`${inputCls} pr-10`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A08B7A] hover:text-[#3F2A1D]"
                          >
                            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </Field>
                    )}

                    <Field label="Active cloud model">
                      <select
                        value={isGeminiMode ? localGeminiModel : localVertexModel}
                        onChange={e => isGeminiMode ? setLocalGeminiModel(e.target.value) : setLocalVertexModel(e.target.value)}
                        className={inputCls}
                      >
                        {isGeminiMode ? (
                          <>
                            <option value="gemini-3.8-flash">gemini-3.8-flash (Frontier Ultra-Fast Multimodal - Recommended)</option>
                            <option value="gemini-2.5-flash">gemini-2.5-flash (Fast & Efficient)</option>
                            <option value="gemini-2.5-pro">gemini-2.5-pro (Deep Reasoning)</option>
                            <option value={STRONG_GEMMA_MODEL}>gemma-4-31b-it (Google Gemma 31B)</option>
                          </>
                        ) : (
                          <>
                            <option value="gemini-3.8-flash">gemini-3.8-flash (Frontier Ultra-Fast Multimodal)</option>
                            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                            <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                          </>
                        )}
                      </select>
                    </Field>
                  </div>
                )}
              </Section>
            </motion.div>
          )}

          {/* ════════ TAB 2: FITUR CERDAS SMARTBOARD (CORE ENGINE) ════════ */}
          {activeTab === 'features' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Section
                title="Board features"
                subtitle="Built-in tools: Mermaid diagrams, in-place edits, smooth ink, visual timer, attendance, and multi-step tasks"
              >
                <div className="p-3.5 bg-[#F4B183]/25 rounded-2xl border border-[#E7DDD2] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#6B4423] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-[#3F2A1D]">
                      All board features are on
                    </h5>
                    <p className="text-[11px] text-[#3F2A1D] font-medium leading-tight mt-0.5">
                      Inclu includes in-place edits, LaTeX formulas, class attendance, and automatic lesson materials.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* 1. Mermaid.js Diagram */}
                  <div className="p-3.5 bg-[#F6F0E8] rounded-2xl border border-[#E7DDD2] flex flex-col justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#3F2A1D] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#6B4423]" />
                        Mermaid Diagram & Mindmap
                      </div>
                      <p className="text-[11px] text-[#A08B7A] leading-relaxed mt-1">
                        Concept maps and flow diagrams render as sharp SVG, with zoom, pan, and instant export.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalExpConfig({ ...localExpConfig, mermaidEnabled: !localExpConfig.mermaidEnabled })}
                      className={`py-1.5 px-3 rounded-xl text-[11px] font-bold border transition flex items-center justify-between cursor-pointer ${
                        localExpConfig.mermaidEnabled
                          ? 'bg-[#F4B183]/20 border-[#F4B183] text-[#6B4423]'
                          : 'bg-[#FFF6EE] border-[#E7DDD2] text-[#A08B7A]'
                      }`}
                    >
                      <span>Engine</span>
                      <span>{localExpConfig.mermaidEnabled ? 'On' : 'Off'}</span>
                    </button>
                  </div>

                  {/* 2. Jev-Mode System 1 Reflex */}
                  <div className="p-3.5 bg-[#F6F0E8] rounded-2xl border border-[#E7DDD2] flex flex-col justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#3F2A1D] flex items-center gap-1.5">
                        <Zap size={14} className="text-amber-500" />
                        Jev-Mode (System 1 Reflex & In-Place Mutation)
                      </div>
                      <p className="text-[11px] text-[#A08B7A] leading-relaxed mt-1">
                        Keeps diagram edits in place so a revision does not duplicate the widget.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalExpConfig({ ...localExpConfig, jevModeEnabled: !localExpConfig.jevModeEnabled })}
                      className={`py-1.5 px-3 rounded-xl text-[11px] font-bold border transition flex items-center justify-between cursor-pointer ${
                        localExpConfig.jevModeEnabled
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'bg-[#FFF6EE] border-[#E7DDD2] text-[#A08B7A]'
                      }`}
                    >
                      <span>Jev-Mode Status</span>
                      <span>{localExpConfig.jevModeEnabled ? 'On' : 'Off'}</span>
                    </button>
                  </div>

                  {/* 3. Smooth Inking */}
                  <div className="p-3.5 bg-[#F6F0E8] rounded-2xl border border-[#E7DDD2] flex flex-col justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#3F2A1D] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#F4B183]" />
                        Smooth ink
                      </div>
                      <p className="text-[11px] text-[#A08B7A] leading-relaxed mt-1">
                        Realistic pen strokes with smooth curves and tapered ends for a touch board.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalExpConfig({ ...localExpConfig, smoothInkingEnabled: !localExpConfig.smoothInkingEnabled })}
                      className={`py-1.5 px-3 rounded-xl text-[11px] font-bold border transition flex items-center justify-between cursor-pointer ${
                        localExpConfig.smoothInkingEnabled
                          ? 'bg-[#FFE08A]/45 border-[#E7DDD2] text-[#3F2A1D]'
                          : 'bg-[#FFF6EE] border-[#E7DDD2] text-[#A08B7A]'
                      }`}
                    >
                      <span>Ink</span>
                      <span>{localExpConfig.smoothInkingEnabled ? 'On' : 'Off'}</span>
                    </button>
                  </div>

                  {/* 4. Visual Pie Timer */}
                  <div className="p-3.5 bg-[#F6F0E8] rounded-2xl border border-[#E7DDD2] flex flex-col justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#3F2A1D] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        Visual Countdown Timer
                      </div>
                      <p className="text-[11px] text-[#A08B7A] leading-relaxed mt-1">
                        A visual countdown for class focus and student work time.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalExpConfig({ ...localExpConfig, visualTimerEnabled: !localExpConfig.visualTimerEnabled })}
                      className={`py-1.5 px-3 rounded-xl text-[11px] font-bold border transition flex items-center justify-between cursor-pointer ${
                        localExpConfig.visualTimerEnabled
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-[#FFF6EE] border-[#E7DDD2] text-[#A08B7A]'
                      }`}
                    >
                      <span>Timer</span>
                      <span>{localExpConfig.visualTimerEnabled ? 'On' : 'Off'}</span>
                    </button>
                  </div>

                  {/* 5. Smart Presensi */}
                  <div className="p-3.5 bg-[#F6F0E8] rounded-2xl border border-[#E7DDD2] flex flex-col justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#3F2A1D] flex items-center gap-1.5">
                        <Users size={14} className="text-[#6B4423]" />
                        Class attendance
                      </div>
                      <p className="text-[11px] text-[#A08B7A] leading-relaxed mt-1">
                        An on-board attendance widget with present, excused, sick, absent, and a percentage.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalExpConfig({ ...localExpConfig, attendanceEnabled: !localExpConfig.attendanceEnabled })}
                      className={`py-1.5 px-3 rounded-xl text-[11px] font-bold border transition flex items-center justify-between cursor-pointer ${
                        localExpConfig.attendanceEnabled
                          ? 'bg-[#F4B183]/20 border-[#F4B183] text-[#6B4423]'
                          : 'bg-[#FFF6EE] border-[#E7DDD2] text-[#A08B7A]'
                      }`}
                    >
                      <span>Attendance</span>
                      <span>{localExpConfig.attendanceEnabled ? 'On' : 'Off'}</span>
                    </button>
                  </div>

                  {/* 6. Multi-Task Orchestration */}
                  <div className="p-3.5 bg-[#F6F0E8] rounded-2xl border border-[#E7DDD2] flex flex-col justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#3F2A1D] flex items-center gap-1.5">
                        <Workflow size={14} className="text-violet-600" />
                        Multi-step tasks
                      </div>
                      <p className="text-[11px] text-[#A08B7A] leading-relaxed mt-1">
                        Lets the assistant run several instructions at once, such as attendance, a timer, a mind map, and a formula.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalExpConfig({ ...localExpConfig, autoTaskAutomation: !localExpConfig.autoTaskAutomation })}
                      className={`py-1.5 px-3 rounded-xl text-[11px] font-bold border transition flex items-center justify-between cursor-pointer ${
                        localExpConfig.autoTaskAutomation
                          ? 'bg-violet-50 border-violet-300 text-violet-700'
                          : 'bg-[#FFF6EE] border-[#E7DDD2] text-[#A08B7A]'
                      }`}
                    >
                      <span>Multi-step</span>
                      <span>{localExpConfig.autoTaskAutomation ? 'On' : 'Off'}</span>
                    </button>
                  </div>
                </div>
              </Section>
            </motion.div>
          )}

          {/* ════════ TAB 3: AUDIO & AKSESIBILITAS INKLUSIF ════════ */}
          {activeTab === 'audio' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Section title="Speech to text" subtitle="Turns the teacher's voice into board commands without typing">
                <Field label="Speech engine">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLocalTranscribeMode('faster_whisper')}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        localTranscribeMode === 'faster_whisper'
                          ? 'border-[#6B4423] bg-[#F4B183]/25'
                          : 'border-[#E7DDD2] bg-[#FFF6EE] hover:border-[#F4B183]'
                      }`}
                    >
                      <div className="font-bold text-xs text-[#3F2A1D] flex items-center gap-1.5">
                        <Mic size={14} className="text-emerald-600" />
                        Faster-Whisper (fully offline)
                      </div>
                      <div className="text-[10px] text-[#A08B7A] font-medium mt-0.5">
                        On-device recognition with noise filtering. Works offline.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLocalTranscribeMode('webspeech')}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        localTranscribeMode === 'webspeech'
                          ? 'border-[#6B4423] bg-[#F4B183]/25'
                          : 'border-[#E7DDD2] bg-[#FFF6EE] hover:border-[#F4B183]'
                      }`}
                    >
                      <div className="font-bold text-xs text-[#3F2A1D] flex items-center gap-1.5">
                        <Sparkles size={14} className="text-[#6B4423]" />
                        Web Speech Standard
                      </div>
                      <div className="text-[10px] text-[#A08B7A] font-medium mt-0.5">
                        The browser's built-in speech engine
                      </div>
                    </button>
                  </div>
                </Field>

                <Field label="Voice recognition language" hint="Select the primary language the teacher speaks into the microphone">
                  <select
                    value={localVoiceConfig.language || 'en-US'}
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setLocalVoiceConfig({ ...localVoiceConfig, language: newLang });
                      try { localStorage.setItem('user_explicit_voice_lang', '1'); } catch {}
                    }}
                    className="w-full bg-[#FFF6EE] border-2 border-[#E7DDD2] rounded-2xl px-4 py-3 text-xs font-bold text-[#3F2A1D] focus:outline-none focus:border-[#6B4423] cursor-pointer"
                  >
                    <option value="en-IN">English (India) - en-IN</option>
                    <option value="en-US">English (US) - en-US</option>
                    <option value="hi-IN">Hindi (हिंदी) - hi-IN</option>
                    <option value="es-ES">Spanish (Español) - es-ES</option>
                    <option value="fr-FR">French (Français) - fr-FR</option>
                    <option value="ar-SA">Arabic (العربية) - ar-SA</option>
                    <option value="ru-RU">Russian (Русский) - ru-RU</option>
                    <option value="zh-CN">Chinese (中文 - 普通话) - zh-CN</option>
                    <option value="ja-JP">Japanese (日本語) - ja-JP</option>
                    <option value="ko-KR">Korean (한국어) - ko-KR</option>
                    <option value="de-DE">German (Deutsch) - de-DE</option>
                    <option value="pt-BR">Portuguese (Português) - pt-BR</option>
                    <option value="id-ID">Indonesian (Bahasa Indonesia) - id-ID</option>
                  </select>
                </Field>
              </Section>

              <Section
                title="Access and large-target controls"
                subtitle="Big touch buttons for teachers and students who need larger targets"
              >
                <div className="p-4 bg-[#F6F0E8] rounded-2xl border border-[#E7DDD2] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HeartHandshake size={20} className={isAssistiveMode ? 'text-amber-600' : 'text-[#A08B7A]'} />
                    <div>
                      <div className="font-bold text-xs text-[#3F2A1D]">
                        Large-Target Assistive Dock (56px)
                      </div>
                      <div className="text-[11px] text-[#A08B7A] font-medium mt-0.5">
                        Shows large buttons in the corner for attendance, a timer, and the random wheel.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAssistiveMode()}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition ${
                      isAssistiveMode
                        ? 'bg-amber-100 border-amber-300 text-amber-800'
                        : 'bg-[#FFF6EE] border-[#E7DDD2] text-[#A08B7A]'
                    }`}
                  >
                    {isAssistiveMode ? 'On' : 'Off'}
                  </button>
                </div>
              </Section>
            </motion.div>
          )}

          {/* ════════ TAB 4: LANGUAGE & THEME ════════ */}
          {activeTab === 'language' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Section title="Language" subtitle="Interface language. English is the default on this laptop.">
                <Field label={t('interfaceLanguage', 'Interface language')}>
                  <select
                    value={localLang}
                    onChange={e => setLocalLang(e.target.value as SupportedLanguage)}
                    className={inputCls}
                  >
                    <optgroup label="United Nations (UN) Official Languages">
                      {SUPPORTED_LANGUAGES.filter(l => l.isUN).map(l => (
                        <option key={l.code} value={l.code}>
                          {l.flag} {l.name} - UN Official
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Global & Regional Languages">
                      {SUPPORTED_LANGUAGES.filter(l => !l.isUN).map(l => (
                        <option key={l.code} value={l.code}>
                          {l.flag} {l.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </Field>
              </Section>

              <Section title={t('appearance', 'Appearance and sound')} subtitle="Canvas theme and interaction sounds">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label={t('theme', 'Canvas theme')}>
                    <div className="flex bg-[#F6F0E8] p-1.5 rounded-2xl gap-1 border border-[#E7DDD2]">
                      <button
                        onClick={() => theme === 'dark' && toggleTheme()}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${theme === 'light' ? 'bg-[#FFF6EE] shadow-xs text-[#6B4423]' : 'text-[#A08B7A] hover:text-[#3F2A1D]'}`}
                      >
                        <Sun size={15} /> {t('light', 'Light')}
                      </button>
                      <button
                        onClick={() => theme === 'light' && toggleTheme()}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${theme === 'dark' ? 'bg-[#FFF6EE] shadow-xs text-[#6B4423]' : 'text-[#A08B7A] hover:text-[#3F2A1D]'}`}
                      >
                        <Moon size={15} /> {t('dark', 'Dark')}
                      </button>
                    </div>
                  </Field>

                  <Field label={t('aiSoundEffects', 'Sound effects')}>
                    <button
                      onClick={() => setSoundEnabled(v => !v)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-xs transition-all w-full cursor-pointer ${soundEnabled ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-[#E7DDD2] text-[#A08B7A] bg-[#FFF6EE]'}`}
                    >
                      {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                      {soundEnabled ? t('soundEnabled', 'Sound on') : t('soundDisabled', 'Sound off')}
                    </button>
                  </Field>
                </div>
              </Section>
            </motion.div>
          )}

          {/* ════════ TAB 5: DATA & HAK CIPTA ════════ */}
          {activeTab === 'data' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Section title="Teacher profile" subtitle="Name shown on whiteboard sessions">
                <Field label={t('yourName', 'Teacher name')}>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A08B7A]" />
                    <input
                      type="text"
                      value={localName}
                      onChange={e => setLocalName(e.target.value)}
                      placeholder="Teacher name"
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </Field>
              </Section>

              <Section
                title="Session logs"
                subtitle="Export action history, token estimates, latency, and class activity"
              >
                <div className="bg-[#F6F0E8] p-4 rounded-2xl border border-[#E7DDD2] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database size={16} className="text-[#6B4423]" />
                      <span className="font-extrabold text-[#3F2A1D] text-xs">Live Analytics & Offline Telemetry</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#F4B183]/35 text-[#6B4423]">
                      School logs
                    </span>
                  </div>
                  <p className="text-xs text-[#6B4423] leading-relaxed">
                    Board activity (quizzes, tools, tokens, cost estimates, and teacher notes) is recorded and can be downloaded for school records.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={getTelemetryDownloadUrl('csv')}
                      download
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-xs"
                    >
                      <Download size={13} /> Download data (CSV / Excel)
                    </a>
                    <a
                      href={getTelemetryDownloadUrl('json')}
                      download
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFF6EE] border border-[#E7DDD2] text-[#6B4423] font-bold text-xs hover:bg-[#F6F0E8] transition-colors"
                    >
                      <Download size={13} /> Download data (JSON)
                    </a>
                  </div>
                </div>
              </Section>

              <Section title="About Inclu">
                <div className="p-4 bg-[#F6F0E8] border border-[#E7DDD2] rounded-2xl text-[11px] leading-relaxed text-[#6B4423] font-medium space-y-1">
                  <div className="font-black text-[#3F2A1D] text-xs">Inclu: A Classroom for Everyone</div>
                  <div className="text-[10px] text-[#A08B7A] font-semibold pt-1">Distributed under the MIT License.</div>
                </div>
              </Section>

              {/* Danger Zone */}
              <div className="bg-rose-50/60 border border-rose-200 border-dashed rounded-3xl p-5 space-y-2">
                <h3 className="text-[11px] font-black text-rose-600 uppercase tracking-widest">{t('dangerZone', 'Danger zone')}</h3>
                <button
                  onClick={handleClearAllData}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#FFF6EE] text-rose-600 font-bold text-xs rounded-xl border border-rose-200 hover:bg-rose-600 hover:text-white transition-all cursor-pointer shadow-2xs"
                >
                  <Trash2 size={14} /> {t('clearAllLocalData', 'Clear all local data and reset')}
                </button>
              </div>
            </motion.div>
          )}

              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
