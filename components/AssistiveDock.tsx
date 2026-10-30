import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic, Clock, Users, Dices, RotateCcw, Compass, Sparkles,
  ChevronUp, ChevronDown, Check, Volume2, ShieldCheck, HeartHandshake, Radio
} from 'lucide-react';
import { useStore } from '../store';
import { toast } from '../utils/toast';
import { useAmbientListener } from '../hooks/useAmbientListener';

export const AssistiveDock: React.FC = () => {
  const {
    isAssistiveMode,
    toggleAssistiveMode,
    toggleAttendance,
    setViewport,
    updateDomElement
  } = useStore();

  const { isAmbientActive, interimCaption, toggleAmbient } = useAmbientListener();

  const [isExpanded, setIsExpanded] = useState(true);

  if (!isAssistiveMode) return null;

  const handleLaunchQuickTimer = () => {
    const id = `timer_${Date.now()}`;
    updateDomElement(id, {
      id,
      html: '<div>Timer</div>',
      componentType: 'TIMER',
      config: { seconds: 300, mode: 'TIMER' },
      x: 960,
      y: 540,
      width: 320,
      height: 380,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      zIndex: 10
    });
    window.dispatchEvent(new CustomEvent('addCanvasPlaceholder', {
      detail: { id, x: 960, y: 540, width: 320, height: 380 }
    }));
    toast.success('5-minute timer is on the board.');
  };

  const handleLaunchRandomWheel = () => {
    const id = `wheel_${Date.now()}`;
    updateDomElement(id, {
      id,
      html: '<div>Wheel</div>',
      componentType: 'SPIN_WHEEL',
      config: { title: 'Student Answer Turn' },
      x: 960,
      y: 540,
      width: 440,
      height: 480,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      zIndex: 10
    });
    window.dispatchEvent(new CustomEvent('addCanvasPlaceholder', {
      detail: { id, x: 960, y: 540, width: 440, height: 480 }
    }));
    toast.success('Random student wheel is on the board.');
  };

  const handleResetCamera = () => {
    setViewport(1, [1, 0, 0, 1, 0, 0]);
    toast.success('🧭 Canvas view centered');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 font-sans select-none pointer-events-auto">
      {/* Assistive Mode Indicator Badge */}
      <div className="flex items-center gap-2 px-3 py-1 bg-[#FFE08A] text-[#3F2A1D] rounded-full font-black text-[11px] shadow-lg shadow-[#3F2A1D]/10">
        <HeartHandshake size={14} />
        <span>ASSISTIVE MODE (INCLUSIVE)</span>
        <button
          onClick={() => toggleAssistiveMode(false)}
          className="ml-1 text-[10px] bg-[#3F2A1D]/10 hover:bg-[#3F2A1D]/20 text-[#3F2A1D] px-1.5 py-0.5 rounded-full cursor-pointer"
          title="Close Assistive Mode"
        >
          ✕
        </button>
      </div>

      {/* Live Voice Caption Bubble */}
      <AnimatePresence>
        {isAmbientActive && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#FFF6EE]/95 text-[#3F2A1D] border border-[#E7DDD2] shadow-xl backdrop-blur-md text-xs font-semibold max-w-xs truncate"
          >
            <span className="flex items-center gap-1 shrink-0">
              {[0, 1, 2, 3].map((b) => (
                <span
                  key={b}
                  className="w-1 bg-[#F4B183] rounded-full animate-pulse"
                  style={{ height: `${8 + ((b * 6) % 12)}px`, animationDelay: `${b * 0.15}s` }}
                />
              ))}
            </span>
            <span className="truncate">{interimCaption ? `“${interimCaption}”` : 'Hands-free: "Chalk, ..."'}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Large-Target Assistive Dock (56px touch buttons) */}
      <div className="bg-[#FFF6EE]/95 backdrop-blur-xl border-2 border-[#E7DDD2] p-2.5 rounded-3xl shadow-2xl flex items-center gap-2.5">
        {/* 0. Hands-Free Ambient Voice Assistant (Pak Damar Special) */}
        <button
          onClick={toggleAmbient}
          className={`relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-md transition cursor-pointer active:scale-90 select-none ${
            isAmbientActive 
              ? 'bg-[#FFE08A] text-[#3F2A1D] ring-4 ring-[#FFE08A]/40 font-black' 
              : 'bg-[#F6F0E8] hover:bg-[#F4B183]/40 text-[#6B4423]'
          }`}
          title={isAmbientActive ? 'Hands-free mode is on (click to turn off)' : 'Turn on hands-free mode'}
        >
          {isAmbientActive && (
            <motion.span
              animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="absolute -inset-1 rounded-2xl border-2 border-[#FFE08A] pointer-events-none"
            />
          )}
          <Mic size={22} className={isAmbientActive ? 'text-[#3F2A1D]' : 'text-[#6B4423]'} />
          <span className="text-[9px] font-black uppercase tracking-tight">{isAmbientActive ? 'Listen' : 'Voice'}</span>
        </button>

        {/* 1. Quick Attendance */}
        <button
          onClick={() => {
            toggleAttendance();
            toast.info('Attendance list opened');
          }}
          className="w-14 h-14 rounded-2xl bg-[#6B4423] hover:bg-[#3F2A1D] active:scale-90 text-[#FFF6EE] flex flex-col items-center justify-center gap-0.5 shadow-md transition cursor-pointer"
          title="Quick attendance"
        >
          <Users size={22} />
          <span className="text-[9px] font-black uppercase">Roll</span>
        </button>

        {/* 2. Quick Timer 5m */}
        <button
          onClick={handleLaunchQuickTimer}
          className="w-14 h-14 rounded-2xl bg-[#7DCEA0] hover:bg-[#1F7A45] active:scale-90 text-[#3F2A1D] hover:text-[#FFF6EE] flex flex-col items-center justify-center gap-0.5 shadow-md transition cursor-pointer"
          title="Start a 5-minute timer"
        >
          <Clock size={22} />
          <span className="text-[9px] font-black uppercase">5 Min</span>
        </button>

        {/* 3. Random Student Wheel */}
        <button
          onClick={handleLaunchRandomWheel}
          className="w-14 h-14 rounded-2xl bg-[#FFE08A] hover:bg-[#F4B183] active:scale-90 text-[#3F2A1D] flex flex-col items-center justify-center gap-0.5 shadow-md transition cursor-pointer"
          title="Random student wheel"
        >
          <Dices size={22} />
          <span className="text-[9px] font-black uppercase">Wheel</span>
        </button>

        {/* 4. Reset Viewport Camera */}
        <button
          onClick={handleResetCamera}
          className="w-14 h-14 rounded-2xl bg-[#F6F0E8] hover:bg-[#F4B183]/40 active:scale-90 text-[#6B4423] flex flex-col items-center justify-center gap-0.5 shadow-md transition cursor-pointer"
          title="Center Canvas"
        >
          <Compass size={22} />
          <span className="text-[9px] font-black uppercase">Center</span>
        </button>
      </div>
    </div>
  );
};
