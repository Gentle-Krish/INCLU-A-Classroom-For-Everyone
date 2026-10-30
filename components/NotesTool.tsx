import React, { useState, useEffect } from 'react';
import { Save, Trash2, List, Bold, Italic } from 'lucide-react';
import { useTranslation } from '../utils/translations';
import { useStore } from '../store';
import { toast } from '../utils/toast';

const NOTES_STORAGE_KEY = 'chalk_quick_notes';

export const NotesTool: React.FC = () => {
  const { t } = useTranslation();
  const [note, setNote] = useState<string>(() => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return '';
    return localStorage.getItem(NOTES_STORAGE_KEY) || '';
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(NOTES_STORAGE_KEY, note);
    }
  }, [note]);

  const appendFormat = (snippet: string) => {
    setNote(prev => (prev ? `${prev}${snippet}` : snippet.trimStart()));
  };

  const handlePinToBoard = () => {
    if (!note.trim()) return;
    const id = `note_${Date.now()}`;
    useStore.getState().updateDomElement(id, {
      id,
      html: '<div>Notes</div>',
      componentType: 'MARKDOWN_NOTE',
      config: { title: 'Teacher notes', markdown: note },
      x: 960,
      y: 540,
      width: 440,
      height: 360,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      zIndex: 12
    });
    window.dispatchEvent(new CustomEvent('addCanvasPlaceholder', {
      detail: { id, x: 960, y: 540, width: 440, height: 360 }
    }));
    toast.success('Note pinned to the whiteboard.');
  };
  
  return (
    <div className="flex flex-col h-full bg-[#FFF6EE] font-sans">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-[#F6F0E8] border-b border-[#E7DDD2] flex-wrap">
        <button type="button" onClick={() => appendFormat(' **bold text**')} title="Bold" className="p-2 text-[#A08B7A] hover:text-[#3F2A1D] hover:bg-[#FFF6EE] rounded-lg transition-colors cursor-pointer"><Bold size={16} /></button>
        <button type="button" onClick={() => appendFormat(' *italic text*')} title="Italic" className="p-2 text-[#A08B7A] hover:text-[#3F2A1D] hover:bg-[#FFF6EE] rounded-lg transition-colors cursor-pointer"><Italic size={16} /></button>
        <button type="button" onClick={() => appendFormat('\n- Note item')} title="List" className="p-2 text-[#A08B7A] hover:text-[#3F2A1D] hover:bg-[#FFF6EE] rounded-lg transition-colors cursor-pointer"><List size={16} /></button>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <button type="button" onClick={handlePinToBoard} title="Pin to the whiteboard" className="p-2 text-[#A08B7A] hover:text-[#3F2A1D] hover:bg-[#FFF6EE] rounded-lg transition-colors ml-auto cursor-pointer"><Save size={16} /></button>
        <button type="button" onClick={() => setNote('')} title="Clear notes" className="p-2 text-[#A08B7A] hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"><Trash2 size={16} /></button>
      </div>

      {/* Editor */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('notesPlaceholder', 'Write lesson notes here...')}
        className="flex-1 p-6 text-[15px] leading-relaxed text-[#6B4423] bg-transparent outline-none resize-none font-medium placeholder:text-[#A08B7A]"
      />

      <div className="p-4 bg-[#F6F0E8] border-t border-[#E7DDD2] flex justify-between items-center shrink-0">
         <span className="text-[11px] font-bold text-[#A08B7A] tracking-wider uppercase">{t('autoSaveActive', 'Auto-save active')}</span>
         <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-emerald-400" />
            <div className="w-1 h-1 rounded-full bg-emerald-400" />
         </div>
      </div>
    </div>
  );
};
