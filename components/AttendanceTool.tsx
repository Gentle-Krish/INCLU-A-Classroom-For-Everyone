import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import {
  UserCheck, UserX, UserMinus, Users, Plus, CheckCheck, RotateCcw,
  Copy, Check, QrCode, Dices, Download, Upload, Trophy, X
} from 'lucide-react';
import { useTranslation } from '../utils/translations';
import { toast } from '../utils/toast';
import { downloadFile, slugify } from '../utils/smartExport';

export interface StudentRecord {
  id: string | number;
  nis?: string;
  name: string;
  status?: 'H' | 'I' | 'S' | 'A';
  note?: string;
}

export interface AttendanceConfig {
  title?: string;
  className?: string;
  date?: string;
  students?: StudentRecord[];
}

const DEFAULT_STUDENTS: StudentRecord[] = [
  { id: 1, nis: '1001', name: 'Budi Santoso', status: 'H' },
  { id: 2, nis: '1002', name: 'Siti Aminah', status: 'H' },
  { id: 3, nis: '1003', name: 'Andi Pratama', status: 'H' },
  { id: 4, nis: '1004', name: 'Dewi Lestari', status: 'I' },
  { id: 5, nis: '1005', name: 'Yoga Permana', status: 'H' },
  { id: 6, nis: '1006', name: 'Rina Kusuma', status: 'H' },
  { id: 7, nis: '1007', name: 'Fajar Nugraha', status: 'S' },
  { id: 8, nis: '1008', name: 'Nadia Putri', status: 'H' }
];

interface AttendanceToolProps {
  config?: any;
}

export const AttendanceTool: React.FC<AttendanceToolProps> = ({ config }) => {
  const { t } = useTranslation();

  const parseConfig = (cfg: any): AttendanceConfig => {
    if (!cfg) return {};
    if (typeof cfg === 'string') {
      try {
        return JSON.parse(cfg);
      } catch {
        return {};
      }
    }
    return cfg;
  };

  const initialCfg = parseConfig(config);

  const [title, setTitle] = useState(initialCfg.title || 'Class attendance');
  const [className, setClassName] = useState(initialCfg.className || 'Class');
  const [students, setStudents] = useState<StudentRecord[]>(() => {
    if (initialCfg.students && Array.isArray(initialCfg.students) && initialCfg.students.length > 0) {
      return initialCfg.students;
    }
    return DEFAULT_STUDENTS;
  });
  const [newStudentName, setNewStudentName] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [selectedRandomStudent, setSelectedRandomStudent] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync when AI updates component config
  useEffect(() => {
    if (!config) return;
    const updated = parseConfig(config);
    if (updated.title) setTitle(updated.title);
    if (updated.className) setClassName(updated.className);
    if (updated.students && Array.isArray(updated.students)) {
      setStudents(updated.students);
    }
  }, [config]);

  const updateStatus = (id: string | number, status: 'H' | 'I' | 'S' | 'A') => {
    setStudents(prev => prev.map(s => (s.id === id ? { ...s, status } : s)));
  };

  const markAll = (status: 'H' | 'I' | 'S' | 'A') => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
    toast.success(status === 'H' ? 'Everyone marked present.' : 'Attendance updated.');
  };

  const handleAddStudent = () => {
    if (!newStudentName.trim()) return;
    const newStudent: StudentRecord = {
      id: `std_${Date.now()}`,
      nis: `${1000 + students.length + 1}`,
      name: newStudentName.trim(),
      status: 'H'
    };
    setStudents(prev => [...prev, newStudent]);
    setNewStudentName('');
    toast.success(`Added "${newStudent.name}"`);
  };

  // 🎲 Random Student Fair Picker with Sound & Confetti
  const pickRandomStudent = () => {
    const presentStudents = students.filter(s => s.status === 'H');
    const pool = presentStudents.length > 0 ? presentStudents : students;
    if (pool.length === 0) return;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 500);
    } catch {}

    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosen = pool[randomIndex].name;
    setSelectedRandomStudent(chosen);

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  // Stats calculation
  const total = students.length;
  const countH = students.filter(s => s.status === 'H').length;
  const countI = students.filter(s => s.status === 'I').length;
  const countS = students.filter(s => s.status === 'S').length;
  const countA = students.filter(s => s.status === 'A').length;
  const presentRate = total > 0 ? Math.round((countH / total) * 100) : 0;

  // CSV Export (Dapodik / Excel Standard)
  const handleExportCSV = () => {
    let csv = 'No,ID,Full name,Status,Note\n';
    students.forEach((s, idx) => {
      const statusLabel = s.status === 'H' ? 'Present' : (s.status === 'I' ? 'Excused' : (s.status === 'S' ? 'Sick' : 'Absent'));
      csv += `${idx + 1},"${s.nis || ''}","${s.name.replace(/"/g, '""')}","${statusLabel}","${(s.note || '').replace(/"/g, '""')}"\n`;
    });
    downloadFile(csv, `attendance_${slugify(className)}_${Date.now()}.csv`, 'text/csv;charset=utf-8');
    toast.success('Attendance CSV downloaded.');
  };

  // CSV Import
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const parsed: StudentRecord[] = [];

      // Skip header if line 0 contains "Nama" or "NIS"
      const startIndex = /nama|name/i.test(lines[0]) ? 1 : 0;
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.replace(/"/g, '').trim());
        if (parts.length >= 2) {
          const name = parts[1] || parts[0];
          if (name) {
            parsed.push({
              id: `csv_${Date.now()}_${i}`,
              nis: parts[0] || `${1000 + i}`,
              name,
              status: 'H'
            });
          }
        }
      }

      if (parsed.length > 0) {
        setStudents(parsed);
        toast.success(`Imported ${parsed.length} students from CSV.`);
      } else {
        toast.error('Could not read that CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopyReport = () => {
    const lines = [
      `📋 ATTENDANCE - ${title.toUpperCase()}`,
      `Class: ${className}`,
      `Students: ${total}`,
      `----------------------------------------`,
      `✅ Present (H): ${countH} (${presentRate}%)`,
      `⚠️ Excused (I): ${countI}`,
      `🏥 Sick (S): ${countS}`,
      `❌ Absent (A): ${countA}`,
      `----------------------------------------`,
      `STUDENTS:`,
      ...students.map((s, idx) => `${idx + 1}. ${s.name} [${s.status || 'H'}]${s.note ? ` - ${s.note}` : ''}`)
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setIsCopied(true);
    toast.success('Attendance report copied.');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const checkinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?attend=true&class=${encodeURIComponent(className)}`
    : 'http://localhost:3000';

  return (
    <div className="flex flex-col h-full bg-[#F6F0E8] font-sans select-none text-[#3F2A1D] overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-[#FFF6EE] border-b border-[#E7DDD2] flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#F4B183]/25 text-[#6B4423] flex items-center justify-center shrink-0">
            <Users size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="font-extrabold text-[#3F2A1D] text-xs sm:text-sm truncate leading-tight">
              {title}
            </h4>
            <span className="text-[10px] font-bold text-[#A08B7A] block truncate">
              {className} • {total} {t('studentsCount', 'Students')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${
            presentRate >= 85 ? 'bg-emerald-100 text-emerald-700' :
            presentRate >= 70 ? 'bg-amber-100 text-amber-700' :
            'bg-rose-100 text-rose-700'
          }`}>
            {presentRate}% present
          </span>
          <button
            onClick={() => setShowQr(!showQr)}
            className={`p-1.5 rounded-lg transition cursor-pointer ${showQr ? 'bg-[#6B4423] text-white' : 'text-[#A08B7A] hover:text-[#6B4423] hover:bg-[#F4B183]/30'}`}
            title="Show student check-in QR"
          >
            <QrCode size={14} />
          </button>
          <button
            onClick={pickRandomStudent}
            className="p-1.5 text-[#A08B7A] hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
            title="Pick a random student"
          >
            <Dices size={14} />
          </button>
          <button
            onClick={handleCopyReport}
            className="p-1.5 text-[#A08B7A] hover:text-[#6B4423] hover:bg-[#F4B183]/30 rounded-lg transition cursor-pointer"
            title="Copy the attendance summary"
          >
            {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* QR Self-Check-in Slide-Down Banner */}
      {showQr && (
        <div className="p-4 bg-[#FFF6EE] border-b border-[#E7DDD2] flex flex-col items-center justify-center gap-2 animate-in slide-in-from-top-2 duration-200">
          <div className="text-[11px] font-black uppercase tracking-wider text-[#6B4423]">
            Scan the QR to check in
          </div>
          <div className="p-2.5 bg-[#FFF6EE] border border-[#E7DDD2] rounded-2xl shadow-xs">
            <QRCodeSVG value={checkinUrl} size={130} />
          </div>
          <span className="text-[10px] text-[#A08B7A] font-mono text-center">
            {checkinUrl.slice(0, 36)}...
          </span>
        </div>
      )}

      {/* Random Winner Spotlight */}
      {selectedRandomStudent && (
        <div className="mx-3 mt-3 p-3 bg-amber-500 text-white rounded-2xl shadow-md flex items-center justify-between gap-3 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF6EE]/20 flex items-center justify-center">
              <Trophy size={16} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-100">Selected Student</div>
              <div className="text-sm font-black">{selectedRandomStudent}</div>
            </div>
          </div>
          <button
            onClick={() => setSelectedRandomStudent(null)}
            className="p-1 rounded-lg hover:bg-[#FFF6EE]/20 text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Progress & Stat Bar */}
      <div className="bg-[#F6F0E8]/70 p-2.5 border-b border-[#E7DDD2]/60 shrink-0">
        <div className="flex items-center justify-between text-[10px] font-bold text-[#A08B7A] mb-1.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> H: {countH}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> I: {countI}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#7DCEA0] inline-block" /> S: {countS}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> A: {countA}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
          <div style={{ width: `${total ? (countH / total) * 100 : 0}%` }} className="bg-emerald-500 h-full transition-all" />
          <div style={{ width: `${total ? (countI / total) * 100 : 0}%` }} className="bg-amber-500 h-full transition-all" />
          <div style={{ width: `${total ? (countS / total) * 100 : 0}%` }} className="bg-[#7DCEA0] h-full transition-all" />
          <div style={{ width: `${total ? (countA / total) * 100 : 0}%` }} className="bg-rose-500 h-full transition-all" />
        </div>
      </div>

      {/* Quick Action Toolbar */}
      <div className="px-3 py-1.5 bg-[#FFF6EE] border-b border-[#E7DDD2] flex items-center justify-between text-[11px] font-bold text-[#A08B7A] shrink-0">
        <div className="flex gap-1">
          <button
            onClick={() => markAll('H')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
          >
            <CheckCheck size={12} /> Mark all present
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F6F0E8] hover:bg-[#E7DDD2] text-[#6B4423] transition cursor-pointer"
            title="Export roster CSV"
          >
            <Download size={12} /> CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F6F0E8] hover:bg-[#E7DDD2] text-[#6B4423] transition cursor-pointer"
            title="Import roster CSV"
          >
            <Upload size={12} /> Import
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleImportCSV}
        />

        <div className="flex gap-1 items-center">
          <input
            type="text"
            placeholder="Add a name..."
            value={newStudentName}
            onChange={e => setNewStudentName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
            className="w-24 sm:w-28 text-[11px] bg-[#F6F0E8] border border-[#E7DDD2] rounded-lg px-2 py-1 outline-none focus:border-[#F4B183]"
          />
          <button
            onClick={handleAddStudent}
            className="p-1 bg-[#6B4423] text-white rounded-lg hover:bg-[#3F2A1D] cursor-pointer"
            title="Add a student"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Student List */}
      <div className="flex-1 overflow-auto p-3 custom-scrollbar space-y-1.5">
        {students.map((s, idx) => (
          <div
            key={s.id}
            className="bg-[#FFF6EE] p-2 rounded-xl border border-[#E7DDD2] shadow-2xs flex items-center justify-between gap-2 hover:border-[#E7DDD2] transition"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-bold text-[#A08B7A] w-4 text-center shrink-0">
                {idx + 1}
              </span>
              <span className="font-bold text-xs text-[#6B4423] truncate" title={s.name}>
                {s.name}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => updateStatus(s.id, 'H')}
                className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center text-[11px] font-black transition-all cursor-pointer ${
                  s.status === 'H' || !s.status
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-[#A08B7A] hover:bg-[#F4B183]/25'
                }`}
                title="Present"
              >
                H
              </button>
              <button
                onClick={() => updateStatus(s.id, 'I')}
                className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center text-[11px] font-black transition-all cursor-pointer ${
                  s.status === 'I'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-[#A08B7A] hover:bg-[#F4B183]/25'
                }`}
                title="Excused"
              >
                I
              </button>
              <button
                onClick={() => updateStatus(s.id, 'S')}
                className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center text-[11px] font-black transition-all cursor-pointer ${
                  s.status === 'S'
                    ? 'bg-[#7DCEA0] text-white shadow-xs'
                    : 'text-[#A08B7A] hover:bg-[#F4B183]/25'
                }`}
                title="Sick"
              >
                S
              </button>
              <button
                onClick={() => updateStatus(s.id, 'A')}
                className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center text-[11px] font-black transition-all cursor-pointer ${
                  s.status === 'A'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-[#A08B7A] hover:bg-[#F4B183]/25'
                }`}
                title="Absent"
              >
                A
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
