import React, { useEffect, useState } from 'react';
import { useStore } from '../store';

export const AutofocusReticle: React.FC = () => {
  const target = useStore(state => state.autofocusTarget);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!target) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1100);
    return () => clearTimeout(timer);
  }, [target?.timestamp]);

  if (!target || !visible) return null;

  return (
    <div
      className="pointer-events-none absolute transition-all duration-300 ease-out animate-in zoom-in-95 fade-in z-30"
      style={{
        left: `${target.left - 16}px`,
        top: `${target.top - 16}px`,
        width: `${target.width + 32}px`,
        height: `${target.height + 32}px`,
      }}
    >
      {/* Camera Autofocus Corner Brackets */}
      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-amber-500/90 rounded-tl shadow-[0_0_10px_rgba(245,158,11,0.4)]" />
      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-amber-500/90 rounded-tr shadow-[0_0_10px_rgba(245,158,11,0.4)]" />
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-amber-500/90 rounded-bl shadow-[0_0_10px_rgba(245,158,11,0.4)]" />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-amber-500/90 rounded-br shadow-[0_0_10px_rgba(245,158,11,0.4)]" />

      {/* Subtle Camera Focus Indicator Badge */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-900/85 backdrop-blur border border-amber-500/30 text-[10px] font-mono tracking-wider text-amber-300 shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>FOCUS LOCK</span>
      </div>
    </div>
  );
};
