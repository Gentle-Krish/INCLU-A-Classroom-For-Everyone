import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Plus, Minus, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from '../utils/toast';

interface TeamRecord {
  id: string | number;
  name: string;
  score: number;
  color: string;
}

interface ScoreboardProps {
  config?: {
    title?: string;
    teams?: { name: string; score?: number }[];
  };
}

const DEFAULT_TEAMS: TeamRecord[] = [
  { id: 1, name: 'Group 1', score: 0, color: '#F4B183' },
  { id: 2, name: 'Group 2', score: 0, color: '#7DCEA0' },
  { id: 3, name: 'Group 3', score: 0, color: '#FFE08A' },
  { id: 4, name: 'Group 4', score: 0, color: '#6B4423' }
];

export const ScoreboardTool: React.FC<ScoreboardProps> = ({ config }) => {
  const [teams, setTeams] = useState<TeamRecord[]>(() => {
    if (config?.teams && Array.isArray(config.teams) && config.teams.length > 0) {
      const colors = ['#F4B183', '#7DCEA0', '#FFE08A', '#6B4423', '#1F7A45', '#A08B7A'];
      return config.teams.map((t, idx) => ({
        id: idx + 1,
        name: t.name,
        score: t.score || 0,
        color: colors[idx % colors.length]
      }));
    }
    return DEFAULT_TEAMS;
  });

  const title = config?.title || 'Group scoreboard';

  const playScoreSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  const updateScore = (id: string | number, delta: number) => {
    setTeams(prev => prev.map(t => {
      if (t.id === id) {
        const newScore = Math.max(0, t.score + delta);
        if (newScore >= 50 && t.score < 50) {
          confetti({ particleCount: 50, spread: 60 });
          toast.success(`🎉 ${t.name} reached 50 points.`);
        }
        return { ...t, score: newScore };
      }
      return t;
    }));
    playScoreSound();
  };

  const resetAll = () => {
    setTeams(prev => prev.map(t => ({ ...t, score: 0 })));
    toast.success('Scoreboard reset to 0');
  };

  return (
    <div className="flex flex-col h-full bg-[#F6F0E8] font-sans select-none text-[#3F2A1D] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#FFF6EE] border-b border-[#E7DDD2] text-xs shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Trophy size={16} />
          </div>
          <div>
            <h4 className="font-extrabold text-[#3F2A1D] text-sm tracking-tight">{title}</h4>
            <span className="text-[10px] text-[#A08B7A] font-bold">{teams.length} groups</span>
          </div>
        </div>

        <button
          onClick={resetAll}
          className="p-1.5 rounded-lg text-[#A08B7A] hover:text-[#3F2A1D] hover:bg-[#F4B183]/25 transition cursor-pointer"
          title="Reset all scores"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Teams Grid */}
      <div className="flex-1 overflow-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 custom-scrollbar">
        {teams.map(team => (
          <div
            key={team.id}
            className="bg-[#FFF6EE] rounded-2xl border border-[#E7DDD2] p-4 shadow-xs flex flex-col justify-between gap-3 relative overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{ backgroundColor: team.color }}
            />

            <div className="flex items-start justify-between gap-2 pt-1">
              <span className="font-extrabold text-sm text-[#3F2A1D] line-clamp-1">
                {team.name}
              </span>
              <span
                className="font-black text-2xl font-mono tracking-tight"
                style={{ color: team.color }}
              >
                {team.score}
              </span>
            </div>

            {/* Score Increment Buttons */}
            <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#E7DDD2]">
              <button
                onClick={() => updateScore(team.id, -5)}
                className="py-1 rounded-lg bg-[#F6F0E8] hover:bg-rose-50 text-[#6B4423] hover:text-rose-600 text-xs font-bold transition cursor-pointer"
                title="-5 points"
              >
                -5
              </button>
              <button
                onClick={() => updateScore(team.id, 1)}
                className="py-1 rounded-lg bg-[#F6F0E8] hover:bg-[#F4B183]/30 text-[#6B4423] hover:text-[#6B4423] text-xs font-bold transition cursor-pointer"
                title="+1 point"
              >
                +1
              </button>
              <button
                onClick={() => updateScore(team.id, 5)}
                className="py-1 rounded-lg bg-[#F6F0E8] hover:bg-emerald-50 text-[#6B4423] hover:text-emerald-600 text-xs font-bold transition cursor-pointer"
                title="+5 points"
              >
                +5
              </button>
              <button
                onClick={() => updateScore(team.id, 10)}
                className="py-1 rounded-lg bg-[#6B4423] hover:bg-[#3F2A1D] text-[#FFF6EE] text-xs font-bold transition cursor-pointer shadow-2xs"
                title="+10 points"
              >
                +10
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
