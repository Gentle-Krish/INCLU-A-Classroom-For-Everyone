import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, FileText, Cpu, Clock } from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../utils/translations';

interface ProcessingStatusHudProps {
  onCancel: () => void;
  className?: string;
}

export const ProcessingStatusHud: React.FC<ProcessingStatusHudProps> = ({ onCancel, className = '' }) => {
  const { t, language } = useTranslation();
  const { 
    isThinking, 
    attachedDocument, 
    selectedGeminiModel, 
    selectedOllamaModel, 
    selectedVertexModel, 
    aiPreference 
  } = useStore();

  const [elapsedSecs, setElapsedSecs] = useState<number>(0);

  useEffect(() => {
    if (!isThinking) {
      setElapsedSecs(0);
      return;
    }
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedSecs(Number(((Date.now() - startTime) / 1000).toFixed(1)));
    }, 100);
    return () => clearInterval(interval);
  }, [isThinking]);

  if (!isThinking) return null;

  const activeModel = 
    aiPreference === 'ollama' 
      ? (selectedOllamaModel || 'Ollama (local)') 
      : (aiPreference === 'vertex' ? (selectedVertexModel || 'Vertex AI') : (selectedGeminiModel || 'gemini-3.8-flash'));

  // Contextual phase & step index (0, 1, 2) based on elapsed time and attached document
  const currentStepIndex = elapsedSecs < 2.0 ? 0 : elapsedSecs < 4.5 ? 1 : 2;

  const pedagogicalInsights = language === 'en'
    ? [
        'Tip: Say "Expand the branch on..." to update existing mindmaps in-place without recreating.',
        'Tip: Combine multiple tasks in one sentence — e.g. "Create a mindmap and start a 10m timer".',
        'Tip: Double-click any widget header to enter distraction-free Fullscreen Focus Mode.'
      ]
    : [
        'Tip: Say "Expand the branch on..." to update existing mindmaps in-place without recreating.',
        'Tip: Combine multiple tasks in one sentence — e.g. "Create a mindmap and start a 10m timer".',
        'Tip: Double-click any widget header to enter distraction-free Fullscreen Focus Mode.'
      ];
  const activeInsight = pedagogicalInsights[Math.floor(elapsedSecs / 3.2) % pedagogicalInsights.length];

  const getPhaseText = () => {
    if (attachedDocument) {
      if (elapsedSecs < 2.5) {
        return `Analyzing ${attachedDocument.name} (${(attachedDocument.size / 1024).toFixed(0)} KB)...`;
      }
      if (elapsedSecs < 5.0) {
        return 'Synthesizing key topics & classroom structure...';
      }
      return 'Generating whiteboard diagrams & responses...';
    }

    if (elapsedSecs < 2.0) {
      return 'Analyzing pedagogical prompt & instructions...';
    }
    if (elapsedSecs < 4.5) {
      return 'Structuring whiteboard tools & mindmap branches...';
    }
    return 'Finalizing response & drawing to board...';
  };

  const steps = ['1. Understand', '2. Plan Board', '3. Render'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full max-w-md bg-[#FFF6EE] rounded-3xl border-2 border-[#E7DDD2] shadow-md p-4 flex flex-col gap-3 font-sans select-none pointer-events-auto ${className}`}
    >
      {/* Top Header: Model, Status & Cancel Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#F4B183] text-[#3F2A1D] shrink-0 shadow-xs">
            <Sparkles size={16} className="animate-pulse" />
            <span className="absolute -inset-1 rounded-full border border-[#ffcc00]/50 animate-ping opacity-40 pointer-events-none" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[13px] text-[#3F2A1D] tracking-tight truncate">
                {language === 'en' ? 'Chalk is working' : 'Chalk is working'}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#F4B183]/35 text-[#3F2A1D] border border-[#E7DDD2] truncate">
                {activeModel}
              </span>
            </div>
          </div>
        </div>

        {/* Live Elapsed Timer & Cancel Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 font-semibold bg-slate-50 px-2 py-1 rounded-full border border-slate-200/70">
            <Clock size={12} className="text-[#6B4423]" />
            <span>{elapsedSecs.toFixed(1)}s</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-all cursor-pointer active:scale-95"
            title="Cancel"
          >
            <X size={13} strokeWidth={2.5} />
            <span className="hidden sm:inline">Cancel</span>
          </button>
        </div>
      </div>

      {/* Middle: Active Phase & Document Indicator */}
      <div className="space-y-1.5">
        {attachedDocument && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-[#F6F0E8] rounded-xl border border-[#E7DDD2] text-xs text-[#3F2A1D] font-semibold truncate">
            <FileText size={13} className="shrink-0" />
            <span className="truncate">{attachedDocument.name}</span>
          </div>
        )}
        <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7DCEA0] animate-ping" />
          <span>{getPhaseText()}</span>
        </div>
      </div>

      {/* Horizontal Step Progress Trace (IKEA Manual Style) */}
      <div className="grid grid-cols-3 gap-1.5 pt-0.5">
        {steps.map((label, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          return (
            <div
              key={label}
              className={`px-2 py-1 rounded-full text-[10px] font-bold text-center transition-colors border ${
                isCurrent
                  ? 'bg-[#6B4423] text-[#FFF6EE] border-[#6B4423]'
                  : isDone
                  ? 'bg-[#FFE08A] text-[#3F2A1D] border-[#FFE08A]'
                  : 'bg-slate-50 text-slate-400 border-slate-200/70'
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Rotating Pedagogical Insight */}
      <div className="text-[11px] text-slate-500 font-medium bg-[#e4e3e0]/40 px-3 py-1.5 rounded-2xl border border-[#0a1a3a]/5 leading-snug">
        {activeInsight}
      </div>

      {/* Bottom: Solid Indeterminate Progress Line (Strictly Zero Gradient) */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
        <motion.div
          initial={{ left: "-35%", width: "35%" }}
          animate={{ left: "100%", width: "45%" }}
          transition={{ duration: 1.1, repeat: Infinity, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-y-0 bg-[#ffcc00] rounded-full"
        />
      </div>
    </motion.div>
  );
};

export default ProcessingStatusHud;
