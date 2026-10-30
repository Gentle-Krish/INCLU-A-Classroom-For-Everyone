import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { 
  Save, HardDrive, FilePlus, ChevronDown, Check,
  History, Settings, Sparkles, Clock, ArrowRight, CornerDownLeft, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../utils/translations';
import { toast } from '../utils/toast';
import { collectLessonNotes } from '../utils/lessonNotes';

interface SaveMenuProps {
  onExportClick: () => void;
}

export const SaveMenu: React.FC<SaveMenuProps> = ({ onExportClick }) => {
  const { t } = useTranslation();
  const { 
    currentSessionId, sessions, saveCurrentSession, 
    createNewSession, toggleHistory 
  } = useStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isSavedDone, setIsSavedDone] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentSessionId) {
      const session = sessions.find(s => s.id === currentSessionId);
      if (session) {
        setTitle(session.title || 'Untitled Board');
        setLastSavedTime(new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } else {
      setTitle('Lesson Board');
    }
  }, [currentSessionId, sessions, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick save to browser local database (IndexedDB)
  const handleSaveToDb = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsSaving(true);
    try {
      await saveCurrentSession(title);
      setIsSaving(false);
      setIsSavedDone(true);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSavedTime(timeStr);
      toast.success(`Board "${title}" saved on this laptop.`);
      const state = useStore.getState();
      const page = state.pages[state.currentPageIndex];
      const quick = typeof localStorage !== 'undefined' ? (localStorage.getItem('chalk_quick_notes') || '') : '';
      const notes = [collectLessonNotes({
        canvas: page?.canvas,
        mindmapNodes: page?.mindmapNodes,
        messages: state.messages,
      }), quick.trim()].filter(Boolean).join('\n');
      window.dispatchEvent(new CustomEvent('chalk-class-notes', { detail: notes }));
      setTimeout(() => setIsSavedDone(false), 2500);
    } catch (err: any) {
      setIsSaving(false);
      toast.error('Could not save to the local database: ' + (err.message || ''));
    }
  };

  const handleNewSession = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (title || currentSessionId) {
      saveCurrentSession(title).then(() => {
        createNewSession();
        setIsOpen(false);
        toast.info('A new whiteboard is ready.');
      });
    } else {
      createNewSession();
      setIsOpen(false);
      toast.info('A new whiteboard is ready.');
    }
  };

  return (
    <div className="relative font-sans" ref={menuRef}>
      {/* Top Bar Trigger Button */}
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)} 
        className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#6B4423] hover:text-[#3F2A1D] border border-[#E7DDD2] bg-[#FBF6F0] hover:bg-white rounded-full transition-all shadow-xs active:scale-95 cursor-pointer"
        title="Save this board on the laptop (Ctrl+S)"
      >
        <Save size={16} className={isSaving ? "animate-pulse text-[#6B4423]" : isSavedDone ? "text-emerald-600" : "text-[#6B4423]"} /> 
        <span className="hidden md:inline">{isSavedDone ? 'Saved' : 'Save'}</span>
        <ChevronDown size={14} className={`text-[#A08B7A] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Mobile view simple trigger button */}
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)} 
        className="flex sm:hidden p-2.5 text-[#6B4423] hover:text-[#3F2A1D] border border-[#E7DDD2] bg-[#FBF6F0] hover:bg-[#FFF6EE] rounded-full transition-all shadow-xs active:scale-95 cursor-pointer"
        title="Save"
      >
        <Save size={18} className="text-[#6B4423]" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-[#FFF6EE] rounded-3xl shadow-2xl border border-[#E7DDD2] z-50 overflow-hidden"
          >
            {/* Header: Title Editor */}
            <div className="p-4 border-b border-[#E7DDD2] bg-[#F6F0E8] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#A08B7A]">
                  Learning board name
                </label>
                {lastSavedTime && (
                  <span className="text-[10px] text-[#A08B7A] font-mono flex items-center gap-1">
                    <Clock size={10} /> {lastSavedTime}
                  </span>
                )}
              </div>

              <div className="flex items-center bg-[#FBF6F0] border border-[#E7DDD2] rounded-xl px-3 py-1.5 focus-within:border-[#F4B183] focus-within:ring-2 focus-within:ring-[#F4B183]/40 transition-all">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Type a board title..."
                  className="w-full text-xs font-bold text-[#3F2A1D] outline-hidden bg-transparent placeholder:text-[#A08B7A]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveToDb();
                  }}
                />
              </div>
            </div>

            {/* Save Options */}
            <div className="p-2.5 space-y-1.5 text-xs">
              {/* Option 1: Save to Browser DB */}
              <button 
                type="button"
                onClick={handleSaveToDb}
                disabled={isSaving}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#F6F0E8] border border-transparent hover:border-[#E7DDD2] transition-all cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#F4B183]/45 text-[#3F2A1D] flex items-center justify-center shrink-0">
                    <HardDrive size={16} />
                  </div>
                  <div>
                    <div className="font-extrabold text-[#3F2A1D] flex items-center gap-1.5">
                      <span>Save to laptop database</span>
                      {isSavedDone && <Check size={13} className="text-[#1F7A45]" />}
                    </div>
                    <div className="text-[10px] text-[#A08B7A] font-medium">
                      Automatic IndexedDB • Reopens quickly
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#A08B7A] bg-[#F6F0E8] px-1.5 py-0.5 rounded border border-[#E7DDD2]">
                  Ctrl+S
                </span>
              </button>

              {/* Image and PDF export */}
              <button 
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onExportClick();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#F6F0E8] border border-transparent hover:border-[#E7DDD2] transition-all cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#FFE08A]/70 text-[#3F2A1D] flex items-center justify-center shrink-0">
                    <Download size={16} />
                  </div>
                  <div>
                    <div className="font-extrabold text-[#3F2A1D]">
                      Image and PDF export
                    </div>
                    <div className="text-[10px] text-[#A08B7A] font-medium">
                      PNG (1x/2x/4K), A4 PDF, SVG, and preview
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-[#A08B7A]" />
              </button>

              <div className="h-px w-full bg-[#E7DDD2] my-1" />

              {/* Option 3: View History */}
              <button 
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  toggleHistory();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#F6F0E8] border border-transparent hover:border-[#E7DDD2] transition-all cursor-pointer text-left text-[#3F2A1D]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#F4B183]/35 text-[#3F2A1D] flex items-center justify-center shrink-0">
                    <History size={16} />
                  </div>
                  <div>
                    <div className="font-extrabold text-[#3F2A1D]">
                      Open board history
                    </div>
                    <div className="text-[10px] text-[#A08B7A] font-medium">
                      {sessions.length} saved teaching sessions
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-[#A08B7A]" />
              </button>

              {/* Option 4: New Whiteboard */}
              <button 
                type="button"
                onClick={handleNewSession}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-[#F6F0E8] border border-transparent hover:border-[#E7DDD2] transition-all cursor-pointer text-left text-[#3F2A1D] font-bold"
              >
                <div className="w-8 h-8 rounded-xl bg-[#7DCEA0]/35 text-[#3F2A1D] flex items-center justify-center shrink-0">
                  <FilePlus size={16} />
                </div>
                <span>Create a new whiteboard</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SaveMenu;
