import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Search, Clock, Calendar, Trash2, Edit2, Share2, 
  FileText, Download, ImageDown, Copy, Check, Plus, 
  Layers, HardDrive, Sparkles, FolderUp, ArrowRight, CornerDownLeft
} from 'lucide-react';
import { useStore } from '../store';
import { ConfirmDialog } from './ConfirmDialog';
import { toast } from '../utils/toast';
import { BoardSession } from '../types';
import { downloadFile } from '../utils/smartExport';

const formatSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
};

interface HistoryViewProps {
  onClose: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onClose }) => {
  const { 
    sessions, currentSessionId, loadSessions, 
    loadSessionData, deleteSession, saveCurrentSession,
    createNewSession 
  } = useStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<BoardSession | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [newTitleValue, setNewTitleValue] = useState('');
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const filtered = sessions.filter(i => 
    i.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Direct download of project file (.inclu) from history
  const handleExportProjectFile = (item: BoardSession) => {
    const exportData = {
      app: 'Inclu',
      version: '1.0.0',
      exportedAt: Date.now(),
      title: item.title,
      pages: item.pages,
      currentPageIndex: 0,
      messages: item.messages || [],
      lessonPlan: item.lessonPlan || null
    };

    const safeName = (item.title || 'board').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    downloadFile(JSON.stringify(exportData, null, 2), `${safeName}_${Date.now()}.inclu.json`, 'application/json');
    toast.success(`Backup of "${item.title}" downloaded.`);
  };

  // Duplicate an existing session
  const handleDuplicateSession = async (item: BoardSession) => {
    const newId = Date.now().toString();
    const duplicated: BoardSession = {
      ...item,
      id: newId,
      title: `${item.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const { saveSessionToDb } = await import('../services/db');
    await saveSessionToDb(duplicated);
    await loadSessions();
    toast.success(`Session "${item.title}" duplicated.`);
  };

  // Inline Rename
  const handleSaveRename = async (item: BoardSession) => {
    if (!newTitleValue.trim() || newTitleValue === item.title) {
      setEditingTitleId(null);
      return;
    }

    const updated: BoardSession = {
      ...item,
      title: newTitleValue.trim(),
      updatedAt: Date.now()
    };

    const { saveSessionToDb } = await import('../services/db');
    await saveSessionToDb(updated);
    await loadSessions();
    setEditingTitleId(null);
    toast.success('Board name updated.');
  };

  // Download preview as PNG image
  const handleDownloadPreview = (item: BoardSession) => {
    const previewUrl = item.pages[0]?.previewDataUrl;

    if (!previewUrl || previewUrl.startsWith('http')) {
      toast.info('No preview yet. Open this session and save it to create one.');
      return;
    }

    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `${item.title.replace(/[^a-zA-Z0-9\s]/g, '') || 'board'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Preview of "${item.title}" downloaded.`);
  };

  // Confirm then delete
  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    deleteSession(confirmDelete.id);
    toast.success(`Session "${confirmDelete.title}" deleted.`);
    setConfirmDelete(null);
  };

  // Quick Snapshot Active Board Now
  const handleSaveActiveNow = async () => {
    await saveCurrentSession();
    await loadSessions();
    toast.success('The current board was saved to history.');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 z-40 bg-[#F6F0E8] overflow-hidden flex flex-col font-sans"
      >
        {/* Header */}
        <div className="h-20 px-6 lg:px-12 flex justify-between items-center bg-[#FFF6EE] border-b border-[#E7DDD2] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#6B4423] flex items-center justify-center text-white shadow-2xs">
              <Clock size={20} strokeWidth={2.4} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[#3F2A1D] tracking-tight">
                  Local board history
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#F6F0E8] text-[#6B4423] border border-[#E7DDD2]">
                  {sessions.length} sessions
                </span>
              </div>
              <p className="text-xs text-[#A08B7A] font-medium">
                Saved on this laptop (IndexedDB) • No internet quota
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative hidden sm:block w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A08B7A]" size={15} />
              <input
                type="text"
                placeholder="Search board history..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#F6F0E8] border border-[#E7DDD2] rounded-full py-1.5 pl-9 pr-3 text-xs font-semibold text-[#3F2A1D] outline-hidden focus:bg-[#FFF6EE] focus:border-[#6B4423] transition-all placeholder:text-[#A08B7A]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A08B7A] hover:text-[#3F2A1D] cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick Action: Save Current Board */}
            <button
              type="button"
              onClick={handleSaveActiveNow}
              className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-[#6B4423] hover:bg-[#3F2A1D] text-white text-xs font-bold rounded-full transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Save current board</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#F6F0E8] hover:bg-[#E7DDD2] text-[#6B4423] transition-colors cursor-pointer"
              title="Close history"
            >
              <X size={18} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 w-full max-w-7xl mx-auto custom-scrollbar space-y-4">
          
          {/* Mobile Search */}
          <div className="relative sm:hidden">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A08B7A]" size={15} />
            <input
              type="text"
              placeholder="Search board history..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#FFF6EE] border border-[#E7DDD2] rounded-full py-2 pl-9 pr-4 text-xs font-semibold text-[#3F2A1D] outline-hidden"
            />
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((item, idx) => {
                const isActiveSession = currentSessionId === item.id;
                const hasValidPreview = item.pages[0]?.previewDataUrl && item.pages[0]?.previewDataUrl.startsWith('data:image');

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                    className={`group flex flex-col bg-[#FFF6EE] border rounded-2xl overflow-hidden transition-all shadow-2xs hover:shadow-md ${
                      isActiveSession 
                        ? 'border-[#6B4423] ring-2 ring-[#6B4423]/15' 
                        : 'border-[#E7DDD2] hover:border-[#E7DDD2]'
                    }`}
                  >
                    {/* Visual Thumbnail */}
                    <div className="h-36 bg-[#F6F0E8] relative overflow-hidden flex items-center justify-center p-2 border-b border-[#E7DDD2]">
                      {hasValidPreview ? (
                        <img
                          src={item.pages[0].previewDataUrl}
                          alt={item.title}
                          className="max-w-full max-h-full object-contain rounded transition-transform group-hover:scale-102 duration-300"
                        />
                      ) : (
                        <div className="text-center space-y-1 text-[#A08B7A] select-none">
                          <Layers size={28} className="mx-auto opacity-40 text-[#6B4423]" />
                          <span className="text-[10px] font-bold block uppercase tracking-wider text-[#A08B7A]">
                            Lesson board
                          </span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="bg-[#FFF6EE]/95 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-bold text-[#6B4423] border border-[#E7DDD2] shadow-2xs">
                          {item.pages.length} pages
                        </span>
                        {isActiveSession && (
                          <span className="bg-[#6B4423] text-white px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide uppercase shadow-2xs">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Quick Card Top Actions */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          title="Duplicate this board"
                          onClick={() => handleDuplicateSession(item)}
                          className="w-7 h-7 rounded-lg bg-[#FFF6EE]/90 hover:bg-[#FFF6EE] text-[#6B4423] hover:text-[#6B4423] flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          type="button"
                          title="Download backup file (.inclu)"
                          onClick={() => handleExportProjectFile(item)}
                          className="w-7 h-7 rounded-lg bg-[#FFF6EE]/90 hover:bg-[#FFF6EE] text-[#6B4423] hover:text-[#6B4423] flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          type="button"
                          title="Delete session"
                          onClick={() => setConfirmDelete(item)}
                          className="w-7 h-7 rounded-lg bg-[#FFF6EE]/90 hover:bg-[#FFF6EE] text-[#6B4423] hover:text-rose-600 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Card Info & Inline Edit */}
                    <div className="p-4 flex flex-col flex-1 justify-between space-y-3">
                      <div>
                        {editingTitleId === item.id ? (
                          <div className="flex items-center gap-1.5 mb-1">
                            <input
                              type="text"
                              autoFocus
                              value={newTitleValue}
                              onChange={e => setNewTitleValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveRename(item);
                                if (e.key === 'Escape') setEditingTitleId(null);
                              }}
                              className="flex-1 text-xs font-bold border border-[#6B4423] rounded px-2 py-1 outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(item)}
                              className="px-2 py-1 bg-[#6B4423] text-white text-[10px] font-bold rounded cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 
                              onDoubleClick={() => {
                                setEditingTitleId(item.id);
                                setNewTitleValue(item.title);
                              }}
                              className="font-extrabold text-sm text-[#3F2A1D] leading-tight line-clamp-1 cursor-pointer hover:text-[#6B4423] transition-colors"
                              title="Double-click to rename"
                            >
                              {item.title}
                            </h3>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTitleId(item.id);
                                setNewTitleValue(item.title);
                              }}
                              className="text-[#A08B7A] hover:text-[#3F2A1D] p-0.5 cursor-pointer"
                              title="Rename board"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-[11px] text-[#A08B7A] font-medium">
                          <span>{formatDate(item.updatedAt)}</span>
                          <span className="w-1 h-1 rounded-full bg-[#E7DDD2]" />
                          <span className="font-mono">{formatSize(item.sizeBytes || 0)}</span>
                        </div>
                      </div>

                      {/* Primary Action Button: Open on the Whiteboard */}
                      <button
                        type="button"
                        onClick={() => {
                          loadSessionData(item.id);
                          toast.success(`Opening "${item.title}"`);
                          onClose();
                        }}
                        className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isActiveSession 
                            ? 'bg-[#E5F6EA] text-[#6B4423] border border-[#7DCEA0]' 
                            : 'bg-[#6B4423] hover:bg-[#3F2A1D] text-white shadow-2xs'
                        }`}
                      >
                        <CornerDownLeft size={13} />
                        <span>{isActiveSession ? 'Back to the open board' : 'Open on the whiteboard'}</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-80 text-center space-y-3">
              <div className="w-16 h-16 bg-[#F6F0E8] rounded-3xl flex items-center justify-center text-[#A08B7A] mx-auto">
                <Search size={28} />
              </div>
              <h3 className="text-base font-extrabold text-[#3F2A1D]">
                {searchQuery ? 'No matching sessions' : 'No saved sessions yet'}
              </h3>
              <p className="text-xs text-[#A08B7A] max-w-sm mx-auto">
                {searchQuery 
                  ? 'Try a different search.' 
                  : 'Use Save in the top-right corner, or press Ctrl+S, to keep this lesson.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#FFF6EE] border-t border-[#E7DDD2] flex items-center justify-between shrink-0 text-xs text-[#A08B7A]">
          <span className="font-medium">
            Local database: <strong>Browser IndexedDB</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#F6F0E8] hover:bg-[#E7DDD2] text-[#3F2A1D] font-bold rounded-full transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Delete this board session?"
        message={`"${confirmDelete?.title}" will be removed from this laptop and cannot be restored.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
        confirmLabel="Yes, delete session"
        cancelLabel="Cancel"
        confirmVariant="danger"
      />
    </>
  );
};

export default HistoryView;
