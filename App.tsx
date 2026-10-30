import React, { useRef, useState, useEffect } from 'react';
import { AiChatPanel } from './components/AiChatPanel';
import { AiChatModal } from './components/AiChatModal';
import { CanvasManager } from './components/CanvasManager';
import { ChatInterface } from './components/ChatInterface';
import { useGeminiBrain } from './hooks/useGeminiBrain';
import { FileUploadButton } from './components/FileUploadButton';
import { AttachedDocumentBadge } from './components/AttachedDocumentBadge';
import { ShareDialog } from './components/ShareDialog';
import { ExportDialog } from './components/ExportDialog';
import { ToolOverlay } from './components/ToolOverlay';
import { AssistiveDock } from './components/AssistiveDock';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { QuickGuideModal } from './components/QuickGuideModal';
import { GsapInteractionEffects } from './components/GsapInteractionEffects';
import { SaveMenu } from './components/SaveMenu';
import { useSocketSync } from './hooks/useSocketSync';
import { useAiStatus } from './hooks/useAiStatus';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, LayoutDashboard, Home, Square, Layers, FileText,
  Image as ImageIcon, File, History, Settings, Mic, Monitor, Share, Download, Sparkles,
  CheckCircle2, ChevronDown, ChevronRight, Keyboard, Menu,
  Clock, CheckSquare, PencilRuler, ShieldCheck, HelpCircle, User,
  MoreHorizontal, Plus, X, Check, Pencil, Send, Trash2, Archive, Database, Network, Maximize2,
  Undo2, Redo2
} from 'lucide-react';
import { ChatMessageItem } from './components/ChatMessageItem';
import { Logo } from './components/landing/shared';
import { useStore } from './store';
import { joinedCount as countJoinedStudents } from './utils/classRoom';
import { toast } from './utils/toast';
import { ToastContainer } from './components/Toast';
import { useTranslation } from './utils/translations';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProcessingStatusHud } from './components/ProcessingStatusHud';
import { LocalModelSetup } from './components/LocalModelSetup';
import { QuestPanel } from './components/QuestPanel';

const App: React.FC = () => {
  const { t } = useTranslation();
  const canvasRef = useRef<any>(null);
  const [, setReady] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isQuestOpen, setIsQuestOpen] = useState(false);
  const [questKick, setQuestKick] = useState(0);
  const pendingQuestWrite = useRef(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  const { roomId, isViewer, startClass, openQuest, closeQuest } = useSocketSync(canvasRef);
  const { loadSessions } = useStore();

  const {
    logs, inputMode, setInputMode, messages, isAiDrawerOpen, toggleAiDrawer, isAiModalOpen, setAiModalOpen,
    chatInputText, setChatInputText, lastUploadedImage, setLastUploadedImage,
    attachedDocument, setAttachedDocument,
    isExportOpen, setIsExportOpen, isSettingsOpen, setIsSettingsOpen, isGuideOpen, setIsGuideOpen,
    userName, setUserName,
    pages, currentPageIndex, switchPage, addPage, isThinking, isActing,
    abortTask, isVoiceListening, interimInputText,
    classRoster,
    undoCanvas, redoCanvas
  } = useStore();
  const joinedCount = countJoinedStudents(classRoster);

  const handleDeleteSelection = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const activeObjects = canvas.getActiveObjects ? canvas.getActiveObjects() : (canvas.getActiveObject ? [canvas.getActiveObject()].filter(Boolean) : []);
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj: any) => {
        canvas.remove(obj);
        if (obj.isDomPlaceholder) {
          useStore.getState().removeDomElement(obj.id);
        }
      });
      if (typeof canvas.discardActiveObject === 'function') {
        canvas.discardActiveObject();
      }
      canvas.requestRenderAll();
    }
  };

  useEffect(() => {
    loadSessions();
  }, []); // Only run once on mount

  useEffect(() => {
    const openFromCommand = () => {
      pendingQuestWrite.current = true;
      setIsQuestOpen(true);
      setQuestKick((kick) => kick + 1);
    };
    window.addEventListener('chalk-open-quest', openFromCommand);
    return () => window.removeEventListener('chalk-open-quest', openFromCommand);
  }, []);

  useEffect(() => {
    if (!isViewer) document.title = 'Inclu: A Classroom for Everyone';
  }, [isViewer]);

  useEffect(() => {
    if ((import.meta as any).env?.DEV || (typeof process !== 'undefined' && process.env.NODE_ENV === 'development')) {
      import('./utils/debugHelpers').then(({ attachDebugTools }) => attachDebugTools());
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobileLayout(mobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { processUserPrompt } = useGeminiBrain();
  const aiStatus = useAiStatus();
  const [isBrowserOnline, setIsBrowserOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isWeb = typeof window !== 'undefined' &&
    !((window as any).electronAPI || (window as any).process?.type === 'renderer' || navigator.userAgent.toLowerCase().includes('electron')) &&
    !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) &&
    !window.location.hostname.endsWith('.local') &&
    !['3000', '3030', '5173'].includes(window.location.port);

  const navigateToLanding = () => {
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({ chalkView: 'landing' }, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch {
        window.location.href = '/';
      }
    }
  };

  const getStatusConfig = () => {
    const storeState = useStore.getState();
    const isUsingOllama = aiStatus.mode === 'ollama' || storeState.aiPreference === 'ollama';

    // 1. Explicit Ollama mode OR browser is offline but local Ollama is ready
    if (isUsingOllama || (!isBrowserOnline && aiStatus.ollamaStatus?.online && aiStatus.ollamaStatus?.hasModel)) {
      const activeModel = storeState.selectedOllamaModel || aiStatus.ollamaStatus?.activeModel || aiStatus.model || 'inclu-gemma:2b';
      const shownModel = /Chalk|Inclu|gemma|chalk-model/i.test(activeModel) ? 'Inclu local model' : activeModel;
      return {
        mode: 'ollama' as const,
        text: !isBrowserOnline ? 'Offline mode (Ollama active)' : t('modeLuring', 'Offline mode (Ollama)'),
        detail: `Ollama: ${shownModel} • No internet, fully private`,
        color: 'text-emerald-800 bg-emerald-100/90 border-emerald-300',
        dot: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
        statusColor: 'text-emerald-600',
        action: null
      };
    }

    // 2. Browser is offline and local Ollama is NOT running / ready
    if (!isBrowserOnline) {
      return {
        mode: 'unavailable' as const,
        text: t('modeOfflineWarning', 'Offline (use Ollama)'),
        detail: 'The internet is disconnected. Open Settings to use a local Ollama model on this laptop.',
        color: 'text-amber-800 bg-amber-100/90 border-amber-300',
        dot: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse',
        statusColor: 'text-amber-600',
        action: 'OPEN_SETTINGS'
      };
    }

    if (aiStatus.mode === 'gemini') {
      const activeModel = storeState.selectedGeminiModel || aiStatus.model || 'gemma-4-31b-it';
      return {
        mode: 'gemini' as const,
        text: t('modeCloud', 'Cloud Mode'),
        detail: `Gemini: ${activeModel}`,
        color: 'text-[#1F7A45] bg-[#E5F6EA] border-[#7DCEA0]/50',
        dot: 'bg-[#7DCEA0] shadow-[0_0_10px_rgba(125,206,160,0.55)]',
        statusColor: 'text-[#1F7A45]',
        action: null
      };
    }
    if (aiStatus.mode === 'vertex') {
      const activeModel = storeState.selectedVertexModel || (aiStatus.model === 'gemini-3.7-flash' ? 'gemini-3.8-flash' : aiStatus.model) || 'gemini-3.8-flash';
      return {
        mode: 'vertex' as const,
        text: t('modeCloudVertex', 'Cloud Mode (Vertex AI)'),
        detail: `Vertex: ${activeModel}`,
        color: 'text-[#1F7A45] bg-[#E5F6EA] border-[#7DCEA0]/50',
        dot: 'bg-[#7DCEA0] shadow-[0_0_10px_rgba(125,206,160,0.55)]',
        statusColor: 'text-[#1F7A45]',
        action: null
      };
    }

    // Unavailable cases
    if (aiStatus.ollamaStatus?.online && !aiStatus.ollamaStatus?.hasModel) {
      return {
        mode: 'unavailable' as const,
        text: t('localModelMissing', 'Local model missing'),
        detail: t('localModelMissingDetail', 'Ollama is running, but the local model is not downloaded yet'),
        color: 'text-amber-700 bg-amber-100/80 border-amber-200/50',
        dot: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse',
        statusColor: 'text-amber-600',
        action: 'PULL_MODEL'
      };
    }

    return {
      mode: 'unavailable' as const,
      text: t('aiUnavailable', 'AI unavailable'),
      detail: aiStatus.reason === 'invalid_key' ? t('invalidApiKey', 'The API key needs a check') : aiStatus.reason === 'missing_project' ? t('missingProject', 'The Vertex project id is not set') : t('notConnected', 'Cloud and local models are not connected'),
      color: 'text-amber-700 bg-amber-100/80 border-amber-200/50',
      dot: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
      statusColor: 'text-amber-600',
      action: 'OPEN_SETTINGS'
    };
  };

  const statusConfig = getStatusConfig();

  const openAiChat = (mode: 'sidebar' | 'modal') => {
    if (isHistoryOpen) toggleHistory();
    setIsSettingsOpen(false);
    setIsExportOpen(false);
    setIsGuideOpen(false);
    if (mode === 'modal') setAiModalOpen(true);
    else if (!isAiDrawerOpen) toggleAiDrawer();
  };

  const handleCanvasReady = (ref: any) => {
    canvasRef.current = ref.current;
    setReady(true);
  };

  const {
    isTimerOpen, toggleTimer,
    isCalculatorOpen, toggleCalculator,
    isNotesOpen, toggleNotes,
    isQuizOpen, toggleQuiz,
    isHistoryOpen, toggleHistory
  } = useStore();

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#F6F0E8] font-sans text-[#3F2A1D] selection:bg-[#F6D7A8] selection:text-[#3F2A1D]">

      {/* VIEWER MODE (CINEMA MODE) */}
      {isViewer ? (
        <div className="flex-1 flex flex-col min-h-0 bg-[#F6F0E8] relative overflow-hidden">
          {/* Minimal Viewer Header */}
          <div className="absolute top-6 left-6 z-50 flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#FFF6EE]/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl shadow-[#3F2A1D]/10 border border-[#E7DDD2]">
                <div className="w-2 h-2 rounded-full bg-[#7DCEA0] animate-pulse shadow-[0_0_8px_rgba(125,206,160,0.5)]" />
                <span className="text-[12px] font-black text-[#3F2A1D] tracking-tight">{t('liveSession', 'Live Session')} {userName}</span>
              </div>
             <div className="flex items-center gap-1 bg-[#6B4423] px-3 py-2 rounded-2xl shadow-lg shadow-[#6B4423]/20 text-[#FFF6EE] border border-[#6B4423]">
                <Users size={14} />
                <span className="text-[11px] font-bold tracking-tight">{t('checkSession', 'Check Session')}: {roomId}</span>
             </div>
          </div>

          {/* Clean Whiteboard Stage */}
          <main className="flex-1 flex flex-col m-2 lg:m-4 rounded-[2.5rem] bg-[#FBF6F0] shadow-2xl border border-[#E7DDD2] relative overflow-hidden group">
             <div className="absolute inset-0 z-10">
                <CanvasManager onCanvasReady={handleCanvasReady} />
             </div>
          </main>

          {/* Minimal Branding: EXACT LANDING PAGE LOGO */}
          <div className="absolute bottom-10 right-10 opacity-30 flex items-center gap-2 pointer-events-none select-none z-50">
             <Logo clay />
          </div>


          <AnimatePresence>
            {!canvasRef.current && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#F6F0E8] z-60 p-6"
              >
                <div className="bg-[#FFF6EE] border-2 border-[#E7DDD2] rounded-[2rem] px-8 py-7 shadow-xl flex flex-col items-center gap-4 max-w-md w-full text-center">
                  <div className="px-4 py-2 rounded-full border border-[#E7DDD2] bg-[#FBF6F0] flex items-center gap-2">
                    <Logo clay />
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FFE08A] text-[#3F2A1D] text-[10px] font-black uppercase tracking-wider">Live</span>
                  </div>
                  <div className="text-xs font-extrabold tracking-widest text-[#3F2A1D] uppercase">
                    {t('connectingToBoard', 'Connecting to Board')} {userName}...
                  </div>
                  <div className="w-full h-2 bg-[#E7DDD2] rounded-full overflow-hidden relative">
                    <motion.div
                      initial={{ left: '-40%', width: '40%' }}
                      animate={{ left: '100%', width: '45%' }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-y-0 bg-[#6B4423] rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* TEACHER MODE (FULL SUITE) */
        <>
          <LocalModelSetup />
          {/* 1. TOP BAR (HEADER) */}
          <motion.header
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="h-[72px] bg-transparent flex items-center justify-between px-4 lg:px-6 shrink-0 z-20 relative gap-3 select-none"
          >
            <div className="flex items-center gap-3 shrink-0 z-10">
              <div
                onClick={isWeb ? navigateToLanding : undefined}
                className={`flex items-center gap-2.5 ${isWeb ? 'cursor-pointer' : ''}`}
                title={isWeb ? 'Back to home' : 'Inclu: A Classroom for Everyone'}
              >
                <img
                  src="/icon.png"
                  alt="Inclu"
                  className="h-10 w-10 rounded-xl border border-[#E7DDD2] shadow-xs object-contain bg-[#FFF6EE] p-0.5"
                />
                <span className="leading-none">
                  <span className="block text-[22px] font-black tracking-tight text-[#3F2A1D]">Inclu</span>
                  <span className="mt-1 block text-[10px] font-bold tracking-[0.16em] text-[#A08B7A]">CLASSROOM FOR EVERYONE</span>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0 z-10">
              <div className="flex items-center gap-1 rounded-full border border-[#E7DDD2] bg-[#FBF6F0] p-0.5">
                <button type="button" aria-label="AI Assistant sidebar" aria-expanded={isAiDrawerOpen}
                  onClick={toggleAiDrawer}
                  className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold transition-colors ${isAiDrawerOpen ? 'bg-[#6B4423] text-[#FBF6F0]' : 'text-[#6B4423] hover:bg-white'}`}>
                  <Sparkles size={16} /><span className="hidden sm:inline">Assistant</span>
                </button>
                <button type="button" aria-label="Open AI chat popup" title="Open AI chat popup" aria-haspopup="dialog"
                  onClick={() => setAiModalOpen(true)}
                  className={`rounded-full p-2.5 transition-colors ${isAiModalOpen ? 'bg-[#6B4423] text-[#FBF6F0]' : 'text-[#6B4423] hover:bg-white'}`}>
                  <Maximize2 size={16} />
                </button>
              </div>
              <SaveMenu onExportClick={() => setIsExportOpen(true)} />

              {!isViewer && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setIsQuestOpen(true)}
                  title="Open a class quest"
                  className="flex items-center gap-2 rounded-full border border-[#F4B183] bg-[#F6F0E8] px-3.5 py-2 text-sm font-bold text-[#3F2A1D] cursor-pointer"
                >
                  Quest
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsShareOpen(true)}
                title="Open the Inclu class room"
                className="flex items-center gap-2 rounded-full border border-[#CDEBD6] bg-[#E5F6EA] px-3.5 py-2 text-sm font-bold text-[#1F7A45] cursor-pointer"
              >
                <span className="h-2 w-2 rounded-full bg-[#22A06B]" />
                <span>{joinedCount} joined</span>
                {classRoster.filter((student) => student.connected).slice(0, 2).map((student) => (
                  <span
                    key={student.studentId}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F3D7B5] text-[11px] font-black text-[#6B4423]"
                  >
                    {(student.displayName.trim().charAt(0) || '?').toUpperCase()}
                  </span>
                ))}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSettingsOpen(true)}
                className="w-11 h-11 rounded-full bg-[#FBF6F0] hover:bg-white border border-[#E7DDD2] flex items-center justify-center text-[#6B4423] cursor-pointer"
                title="Settings"
              >
                <Settings size={18} />
              </motion.button>
            </div>
          </motion.header>

          {/* LOWER SECTION */}
          <div className="flex-1 flex min-h-0 relative bg-transparent p-2 lg:p-4 pt-0 gap-4 overflow-hidden">

            {/* Modals & Overlays */}
            <GsapInteractionEffects />
            <ShareDialog
              isOpen={isShareOpen}
              onClose={() => setIsShareOpen(false)}
              roomId={roomId}
              onStartClass={startClass}
            />
            <QuestPanel
              isOpen={isQuestOpen}
              roomId={roomId}
              pendingWrite={pendingQuestWrite}
              kick={questKick}
              onClose={() => setIsQuestOpen(false)}
              onOpenQuest={openQuest}
              onCloseQuest={closeQuest}
            />
            <ExportDialog isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} canvasRef={canvasRef} />
            <AiChatModal isOpen={isAiModalOpen} onClose={() => setAiModalOpen(false)}>
              <AiChatPanel mode="modal" canvasRef={canvasRef} onClose={() => setAiModalOpen(false)}
                onToggleMode={() => { setAiModalOpen(false); if (!isAiDrawerOpen && !isAiModalOpen) toggleAiDrawer(); }}
                onOpenSettings={() => { setAiModalOpen(false); setIsSettingsOpen(true); }} statusConfig={statusConfig} />
            </AiChatModal>
            <QuickGuideModal 
              isOpen={isGuideOpen} 
              onClose={() => setIsGuideOpen(false)} 
              onSamplePromptClick={(prompt) => {
                setChatInputText(prompt);
                if (!isAiDrawerOpen && !isAiModalOpen) toggleAiDrawer();
              }}
            />
            <ToolOverlay />
            <AssistiveDock />

            {/* 3 & 4. CANVAS AREA & VERTICAL TOOLBAR */}
            <main className="flex-1 min-w-0 relative h-full bg-[#FBF7F2] rounded-[28px] border border-[#E7DDD2] shadow-[0_16px_40px_rgba(63,42,29,0.06)] overflow-hidden flex flex-col">

               {/* Dot Grid Background */}
               <div
                 className="absolute inset-0 pointer-events-none opacity-50 z-0"
                 style={{
                   backgroundImage: 'radial-gradient(#E4D3C4 1.4px, transparent 1.4px)',
                   backgroundSize: '24px 24px'
                 }}
               />

               {/* Canvas Container */}
               <div className="absolute inset-0 z-0 flex rounded-4xl overflow-hidden">
                   <CanvasManager onCanvasReady={handleCanvasReady} />
               </div>

               {/* Top Center Workspace Control Cluster: Undo/Redo | Sheet Pages | Delete */}
               <div className="absolute top-4 lg:top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pointer-events-auto select-none">
                 {/* Undo & Redo (Separate pill on the left) */}
                 <div className="flex items-center gap-0.5 p-1 bg-[#FBF6F0]/95 backdrop-blur-xl rounded-full shadow-lg border border-[#E7DDD2]">
                   <button
                     onClick={() => undoCanvas()}
                     title="Undo (Ctrl+Z)"
                     className="w-8 h-8 flex items-center justify-center text-[#A08B7A] hover:text-[#6B4423] hover:bg-[#F3EBE3] rounded-full transition-all active:scale-90 cursor-pointer"
                   >
                     <Undo2 size={16} />
                   </button>
                   <button
                     onClick={() => redoCanvas()}
                     title="Redo (Ctrl+Y)"
                     className="w-8 h-8 flex items-center justify-center text-[#A08B7A] hover:text-[#6B4423] hover:bg-[#F3EBE3] rounded-full transition-all active:scale-90 cursor-pointer"
                   >
                     <Redo2 size={16} />
                   </button>
                 </div>

                 {/* Sheet / Page Navigation Bar (Center) */}
                 <div className="flex items-center gap-1.5 p-1.5 bg-[#FBF6F0]/95 backdrop-blur-xl rounded-full shadow-lg border border-[#E7DDD2]">
                   {pages.map((_, idx) => (
                     <button
                       key={idx}
                       disabled={isThinking || isActing}
                       onClick={() => switchPage(idx)}
                       className={`min-w-[34px] h-8 px-2.5 rounded-full text-[13px] font-black transition-all cursor-pointer ${
                         isThinking || isActing ? 'opacity-50 cursor-not-allowed' : ''
                       } ${
                         currentPageIndex === idx 
                           ? 'bg-[#6B4423] text-[#FBF6F0] shadow-sm' 
                           : 'text-[#8A7568] hover:bg-[#F3EBE3] hover:text-[#3F2A1D]'
                       }`}
                     >
                       {idx + 1}
                     </button>
                   ))}
                   <div className="w-px h-4 bg-[#E7DDD2] mx-1" />
                   <button 
                     disabled={isThinking || isActing}
                     onClick={() => addPage()}
                     className={`w-8 h-8 flex items-center justify-center rounded-full text-[#A08B7A] transition-all cursor-pointer ${
                       isThinking || isActing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#F3EBE3] hover:text-[#3F2A1D]'
                     }`}
                     title="Add a page"
                   >
                     <Plus size={16} strokeWidth={2.5} />
                   </button>
                 </div>

                 {/* Delete Button (Separate pill on the right) */}
                 <div className="flex items-center p-1 bg-[#FBF6F0]/95 backdrop-blur-xl rounded-full shadow-lg border border-[#E7DDD2]">
                   <button
                     onClick={handleDeleteSelection}
                     title="Delete selected (Del)"
                     className="w-8 h-8 flex items-center justify-center text-[#A08B7A] hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all active:scale-90 cursor-pointer"
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
               </div>

               {/* UI Overlay for Toolbar/Controls (mapped in ChatInterface) */}
               {canvasRef.current && (
                 <ChatInterface canvasRef={canvasRef} />
               )}

               <AnimatePresence>
                 {isHistoryOpen && (
                   <HistoryView onClose={toggleHistory} />
                 )}
               </AnimatePresence>

               <AnimatePresence>
                 {isSettingsOpen && (
                   <SettingsView onClose={() => setIsSettingsOpen(false)} />
                 )}
               </AnimatePresence>

               {/* Loading State */}
               <AnimatePresence>
                 {!canvasRef.current && (
                   <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#F6F0E8]/80 backdrop-blur-sm z-10"
                   >
                     <div className="relative w-16 h-16">
                       <div className="absolute inset-0 border-4 border-[#E7DDD2] rounded-full"></div>
                       <div className="absolute inset-0 border-4 border-[#6B4423] rounded-full border-t-transparent animate-spin"></div>
                     </div>
                     <div className="text-[13px] font-bold tracking-[0.2em] text-[#8A7568] uppercase">Loading the board...</div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </main>

            {/* AI Assistant Sidebar (Right) */}
            <AnimatePresence>
              {isAiDrawerOpen && (
                <motion.aside
                  initial={{ width: 0, opacity: 0, x: 20 }}
                  animate={{ width: isMobileLayout ? 'calc(100% - 1rem)' : 380, opacity: 1, x: 0 }}
                  exit={{ width: 0, opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className={`absolute lg:relative right-2 top-0 bottom-2 lg:right-0 lg:bottom-0 max-h-full bg-[#FBF6F0] backdrop-blur-xl rounded-[28px] flex flex-col z-40 lg:z-10 shrink-0 border border-[#E7DDD2] shadow-[0_8px_30px_rgb(63,42,29,0.06)] overflow-hidden`}
                >
                  <AiChatPanel mode="sidebar" canvasRef={canvasRef} onClose={toggleAiDrawer}
                    onToggleMode={() => { toggleAiDrawer(); setAiModalOpen(true); }}
                    onOpenSettings={() => setIsSettingsOpen(true)} statusConfig={statusConfig} />
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
};

const Layout: React.FC = () => {
  return (
    <ErrorBoundary>
      <App />
      <ToastContainer />
    </ErrorBoundary>
  );
};

export default Layout;
