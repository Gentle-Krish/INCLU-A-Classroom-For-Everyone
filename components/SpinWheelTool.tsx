import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Volume2, Sparkles, Trophy, Plus, Trash2 } from 'lucide-react';
import { toast } from '../utils/toast';

interface SpinWheelProps {
  config?: {
    title?: string;
    items?: string[];
  };
}

const DEFAULT_ITEMS = [
  'Alex Johnson',
  'Emma Davis',
  'Liam Smith',
  'Sophia Wilson',
  'Noah Brown',
  'Olivia Taylor',
  'Lucas Miller',
  'Mia Anderson'
];

const COLORS = [
  '#F4B183', '#7DCEA0', '#FFE08A', '#E7DDD2',
  '#6B4423', '#1F7A45', '#A08B7A', '#F6D7A8'
];

export const SpinWheelTool: React.FC<SpinWheelProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [items, setItems] = useState<string[]>(config?.items || DEFAULT_ITEMS);
  const [newItemName, setNewItemName] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const angleRef = useRef(0);
  const velocityRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const title = config?.title || 'Random student wheel';

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Play subtle ticking sound using a single shared Web Audio API context
  const playTick = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800 + Math.random() * 200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  };

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    ctx.clearRect(0, 0, width, height);

    if (items.length === 0) return;

    const sliceAngle = (2 * Math.PI) / items.length;

    // Outer Glow Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#F6F0E8';
    ctx.fill();

    // Wheel Segments
    items.forEach((item, i) => {
      const startAngle = angleRef.current + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Text Labels
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 4;
      ctx.fillText(item.slice(0, 16), radius - 24, 4);
      ctx.restore();
    });

    // Center Hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.strokeStyle = '#E7DDD2';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pointer Indicator at Right
    ctx.beginPath();
    ctx.moveTo(centerX + radius + 15, centerY);
    ctx.lineTo(centerX + radius - 10, centerY - 12);
    ctx.lineTo(centerX + radius - 10, centerY + 12);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
    ctx.shadowBlur = 8;
    ctx.fill();
  };

  useEffect(() => {
    drawWheel();
  }, [items]);

  const spin = () => {
    if (isSpinning || items.length === 0) return;

    setIsSpinning(true);
    setWinner(null);
    velocityRef.current = 0.35 + Math.random() * 0.25;

    let lastTickAngle = angleRef.current;
    const sliceAngle = (2 * Math.PI) / items.length;

    const animate = () => {
      velocityRef.current *= 0.985; // Deceleration factor
      angleRef.current = (angleRef.current + velocityRef.current) % (2 * Math.PI);

      // Play tick on segment passing pointer
      if (Math.abs(angleRef.current - lastTickAngle) >= sliceAngle) {
        playTick();
        lastTickAngle = angleRef.current;
      }

      drawWheel();

      if (velocityRef.current > 0.002) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        // Calculate winner under pointer (pointer is at angle 0 / right side)
        const normalizedAngle = (2 * Math.PI - (angleRef.current % (2 * Math.PI))) % (2 * Math.PI);
        const winningIndex = Math.floor(normalizedAngle / sliceAngle) % items.length;
        const chosen = items[winningIndex];
        setWinner(chosen);

        // Celebration Confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  const addItem = () => {
    if (!newItemName.trim()) return;
    setItems(prev => [...prev, newItemName.trim()]);
    setNewItemName('');
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col h-full bg-[#F6F0E8] font-sans select-none text-[#3F2A1D] overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#FFF6EE] border-b border-[#E7DDD2] text-xs shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-extrabold text-[#3F2A1D] text-sm tracking-tight">{title}</span>
          <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full">
            {items.length} options
          </span>
        </div>

        <button
          onClick={spin}
          disabled={isSpinning || items.length === 0}
          className="px-4 py-1.5 bg-[#6B4423] hover:bg-[#3F2A1D] active:scale-95 text-[#FFF6EE] font-extrabold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Play size={13} fill="currentColor" /> {isSpinning ? 'Spinning...' : 'Spin'}
        </button>
      </div>

      {/* Main Wheel Canvas Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-3 bg-[#F6F0E8]">
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="max-w-full max-h-full drop-shadow-md"
        />

        {/* Winner Spotlight Banner */}
        {winner && (
          <div className="absolute inset-x-4 top-4 p-3 bg-[#FFF6EE]/95 backdrop-blur border-2 border-amber-400 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Trophy size={18} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-600">Selected student</div>
                <div className="text-base font-black text-[#3F2A1D]">{winner}</div>
              </div>
            </div>
            <button
              onClick={() => setWinner(null)}
              className="text-xs font-bold text-[#A08B7A] hover:text-[#3F2A1D] p-1 rounded-lg"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Item Quick Add & Chip List Bar */}
      <div className="p-2.5 bg-[#FFF6EE] border-t border-[#E7DDD2] flex flex-col gap-2 shrink-0">
        {items.length > 0 && (
          <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto custom-scrollbar">
            {items.map((item, idx) => (
              <span key={`${item}-${idx}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F6F0E8] text-[10px] font-bold text-[#6B4423]">
                <span className="truncate max-w-[90px]">{item}</span>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-[#A08B7A] hover:text-rose-500 cursor-pointer"
                  title="Remove"
                >
                  <Trash2 size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add a name..."
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            className="flex-1 text-xs bg-[#F6F0E8] border border-[#E7DDD2] rounded-xl px-3 py-1.5 outline-none focus:border-amber-500"
          />
          <button
            onClick={addItem}
            className="px-3 py-1.5 bg-[#6B4423] text-[#FFF6EE] rounded-xl text-xs font-bold hover:bg-[#3F2A1D] cursor-pointer"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
