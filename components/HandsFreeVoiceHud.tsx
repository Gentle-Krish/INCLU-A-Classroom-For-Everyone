import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Check, X, Sparkles, Volume2, ShieldCheck } from 'lucide-react';
import { useStore } from '../store';
import { useAmbientListener } from '../hooks/useAmbientListener';

export const HandsFreeVoiceHud: React.FC = () => {
  const isHandsFreeListening = useStore((s) => s.isHandsFreeListening);
  const isVoiceCommandActive = useStore((s) => s.isVoiceCommandActive);
  const voiceInterimCaption = useStore((s) => s.voiceInterimCaption);

  const {
    startAmbient,
    stopAmbient,
    toggleAmbient,
    finalizeAndExecuteCommand,
    cancelCommand,
  } = useAmbientListener();

  // Keyboard accessibility shortcut: Alt + V or Ctrl + Shift + V to toggle Hands-Free Listening
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting if user is actively typing in text input/textarea
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if ((e.altKey && e.code === 'KeyV') || (e.ctrlKey && e.shiftKey && e.code === 'KeyV')) {
        e.preventDefault();
        toggleAmbient();
      } else if (isVoiceCommandActive && e.key === 'Escape') {
        e.preventDefault();
        cancelCommand();
      } else if (isVoiceCommandActive && !isInput && e.key === 'Enter') {
        e.preventDefault();
        finalizeAndExecuteCommand();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleAmbient, isVoiceCommandActive, cancelCommand, finalizeAndExecuteCommand]);

  // Auto-start ambient listening on mount if microphone permission is already granted
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as any }).then((perm) => {
        if (perm.state === 'granted') {
          startAmbient();
        }
      }).catch(() => {});
    }
  }, []);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none select-none flex flex-col items-center gap-2 font-sans">
      <AnimatePresence>
        {/* 1. ACTIVE COMMAND RECORDING HUD (Triggered when user says "Hey INCLU" or "Please record these commands") */}
        {isVoiceCommandActive && (
          <motion.div
            key="voice-command-active-hud"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="pointer-events-auto bg-[#3F2A1D]/95 text-[#FFF6EE] border-2 border-[#FFE08A] shadow-2xl backdrop-blur-2xl rounded-3xl p-4 sm:p-5 flex flex-col gap-3 min-w-[320px] max-w-lg w-[92vw] ring-8 ring-[#FFE08A]/20"
            role="dialog"
            aria-label="Hands-free Voice Command Listening"
          >
            {/* Header: Pulsing Mic & Title */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-2xl bg-[#FFE08A] text-[#3F2A1D] flex items-center justify-center shrink-0 shadow-md">
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-2xl bg-[#FFE08A]"
                  />
                  <Mic size={22} className="relative z-10 animate-bounce" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm text-[#FFE08A] tracking-tight">Hey INCLU Activated</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#FFE08A]/20 text-[#FFE08A]">Live</span>
                  </div>
                  <span className="text-xs text-[#E7DDD2] font-medium">Say your command, then say <strong className="text-[#FFE08A] underline">"Done"</strong></span>
                </div>
              </div>

              {/* Animated Audio Equalizer Bars */}
              <div className="flex items-center gap-1 h-6 px-2.5 py-1 bg-[#2C1D14] rounded-full border border-[#6B4423]/50">
                {[1, 2, 3, 4, 5].map((bar) => (
                  <motion.span
                    key={bar}
                    animate={{ height: [6, 18, 8, 22, 6] }}
                    transition={{
                      duration: 0.8 + bar * 0.12,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: bar * 0.08,
                    }}
                    className="w-1 bg-[#FFE08A] rounded-full"
                  />
                ))}
              </div>
            </div>

            {/* Live Dictation Caption Box */}
            <div className="bg-[#2A1C13] border border-[#6B4423]/60 rounded-2xl p-3 min-h-[56px] flex items-center">
              {voiceInterimCaption ? (
                <p className="text-sm font-semibold text-[#FFF6EE] leading-relaxed break-words">
                  “{voiceInterimCaption}”
                  <span className="inline-block w-2 h-4 ml-1 bg-[#FFE08A] animate-pulse align-middle rounded-xs" />
                </p>
              ) : (
                <p className="text-xs text-[#A08B7A] italic">
                  Listening for your request... (e.g. "Draw a diagram of photosynthesis", "Open 5m timer", "Run bubble sort")
                </p>
              )}
            </div>

            {/* Action Bar & Spoken Shortcuts */}
            <div className="flex items-center justify-between pt-1 text-[11px] font-semibold text-[#D4C3B3]">
              <span className="flex items-center gap-1.5">
                <span>Say <strong className="text-[#FFE08A]">"Done"</strong> to execute</span>
                <span className="text-[#7A614F]">•</span>
                <span>Say <strong className="text-[#F4B183]">"Cancel"</strong> to stop</span>
              </span>

              {/* Accessible Manual Buttons for Fallback */}
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelCommand}
                  className="px-2.5 py-1 rounded-xl bg-[#2A1C13] hover:bg-[#4A3222] text-[#D4C3B3] hover:text-white transition flex items-center gap-1 text-xs font-bold cursor-pointer"
                  title="Cancel command (Esc)"
                >
                  <X size={14} />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={finalizeAndExecuteCommand}
                  className="px-3 py-1 rounded-xl bg-[#FFE08A] hover:bg-[#F4B183] text-[#3F2A1D] transition flex items-center gap-1 text-xs font-black shadow-md cursor-pointer"
                  title="Submit command (Enter or say 'Done')"
                >
                  <Check size={14} />
                  <span>Done</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
