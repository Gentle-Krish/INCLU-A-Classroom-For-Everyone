import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { ChevronDown, Timer, X } from 'lucide-react';
import { useTranslation } from '../utils/translations';
import gsap from 'gsap';

export const AgentCursor: React.FC = () => {
  const { t } = useTranslation();
  const { cursorPosition, isThinking, isActing, isClicking, currentAction, viewportTransform, agentMessage } = useStore();
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);
  const [speechBubbleVisible, setSpeechBubbleVisible] = useState(false);
  const [thinkTime, setThinkTime] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  const zoom = viewportTransform[0];
  const panX = viewportTransform[4];
  const panY = viewportTransform[5];

  const screenX = cursorPosition.x * zoom + panX;
  const screenY = cursorPosition.y * zoom + panY;

  // GSAP Smooth Coordinate Tracking
  useEffect(() => {
    if (!containerRef.current) return;
    gsap.to(containerRef.current, {
      x: screenX,
      y: screenY,
      duration: 0.35,
      ease: 'power2.out',
    });
  }, [screenX, screenY]);

  // GSAP Pulse on Agent Badge during processing
  useEffect(() => {
    if (isThinking && badgeRef.current) {
      const pulse = gsap.to(badgeRef.current, {
        scale: 1.05,
        duration: 0.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
      return () => {
        pulse.kill();
      };
    }
  }, [isThinking]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isThinking) {
      setThinkTime(0);
      interval = setInterval(() => {
        setThinkTime((t) => t + 1);
      }, 1000);
    } else {
      setThinkTime(0);
    }
    return () => clearInterval(interval);
  }, [isThinking]);

  // Speech bubble display timer
  useEffect(() => {
    if (agentMessage) {
      setDisplayMessage(agentMessage);
      setSpeechBubbleVisible(true);
      const isCancellation = agentMessage.toLowerCase().includes('cancel');
      // For cancellations, auto-dismiss after 4 seconds; other messages 8-12 seconds
      const duration = isCancellation ? 4000 : Math.min(12000, 6000 + agentMessage.length * 40);
      const timer = setTimeout(() => {
        setSpeechBubbleVisible(false);
        setTimeout(() => {
          setDisplayMessage(null);
          useStore.getState().setAgentMessage(null);
        }, 300);
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setSpeechBubbleVisible(false);
      setDisplayMessage(null);
    }
  }, [agentMessage]);

  // When a new command starts (isThinking transitions false -> true), dismiss any stale message from the previous turn
  const prevThinkingRef = useRef(false);
  useEffect(() => {
    if (!prevThinkingRef.current && isThinking) {
      setSpeechBubbleVisible(false);
      setDisplayMessage(null);
      useStore.getState().setAgentMessage(null);
    }
    prevThinkingRef.current = isThinking;
  }, [isThinking]);

  let timeStatus = 'Processing...';
  let timeColor = 'text-emerald-300';
  if (thinkTime > 15) {
    timeStatus = 'A bit slow...';
    timeColor = 'text-rose-300';
  } else if (thinkTime > 7) {
    timeStatus = 'Normal...';
    timeColor = 'text-amber-300';
  }

  const isVisible = isThinking || isActing || (!!displayMessage && speechBubbleVisible);
  
  return (
    <div
      ref={containerRef}
      className={`pointer-events-none fixed top-0 left-0 z-[100] flex flex-col items-start transition-opacity duration-300 will-change-transform ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
      }}
    >
      {/* SPEECH BUBBLE */}
      {displayMessage && (
        <div className={`absolute bottom-8 left-4 z-50 pointer-events-auto transition-all duration-300 ${
          speechBubbleVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}>
          <details open className="relative rounded-2xl rounded-bl-none bg-white shadow-2xl border border-slate-200 overflow-hidden group min-w-[200px] max-w-[320px]">
            <summary className="p-3 text-sm font-semibold text-blue-600 cursor-pointer hover:bg-slate-50 list-none flex items-center gap-2 select-none [&::-webkit-details-marker]:hidden relative">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-600 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              <span>Inclu is responding</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSpeechBubbleVisible(false);
                  setDisplayMessage(null);
                  useStore.getState().setAgentMessage(null);
                }}
                className="ml-auto p-0.5 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Dismiss message"
                aria-label="Dismiss message"
              >
                <X size={14} />
              </button>
            </summary>
            <div className="px-3 pb-3 pt-1 text-xs font-medium text-slate-800 border-t border-slate-100 max-h-[300px] overflow-y-auto whitespace-pre-wrap">
              {displayMessage}
            </div>
            {/* Tail */}
            <div className="absolute -bottom-2 left-0 h-4 w-4 bg-white" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}></div>
          </details>
        </div>
      )}

      {/* The Cursor Tip (Figma style) */}
      <div className={`relative transition-transform duration-100 ${isClicking ? 'scale-75' : 'scale-100'}`}>
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          className="drop-shadow-md"
        >
          <path 
            d="M3 3L10.5 20.5L13.5 13.5L20.5 10.5L3 3Z" 
            fill={isClicking ? "#ef4444" : "#2563eb"} 
            stroke="white" 
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        
        {/* Click Ripple Effect */}
        {isClicking && (
          <div className="absolute -left-2 -top-2 h-10 w-10 animate-ping rounded-full border-2 border-blue-600 opacity-75"></div>
        )}
      </div>

      {/* Label / Status Bubble */}
      <div 
        ref={badgeRef}
        className={`
          absolute left-5 top-5 flex items-center gap-2 whitespace-nowrap rounded-br-xl rounded-bl-xl rounded-tr-xl 
          bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xl
          transition-all duration-300 origin-top-left
          ${(isThinking || currentAction) ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
        `}
      >
        {isThinking && (
          <div className="flex flex-col items-start gap-0.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-white" />
              <span>{currentAction || t('thinking', 'Thinking...')}</span>
            </div>
            <div className={`flex items-center gap-1.5 ${timeColor} text-[10px] w-full font-mono bg-black/20 px-1.5 py-0.5 rounded`}>
              <Timer size={10} />
              <span>{thinkTime}s</span>
              <span className="ml-1 opacity-80">{timeStatus}</span>
            </div>
          </div>
        )}
        {!isThinking && currentAction && (
          <span>{currentAction}</span>
        )}
      </div>
    </div>
  );
};
