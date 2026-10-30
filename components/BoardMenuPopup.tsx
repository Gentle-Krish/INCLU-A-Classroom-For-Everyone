import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Square,
  Sparkles,
  Maximize2,
  Clock,
  Download,
  Settings,
  HelpCircle,
  Home,
  Pencil,
  Check,
} from 'lucide-react';
import { useStore } from '../store';
import { SidebarItem } from './SidebarItem';

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

interface BoardMenuPopupProps {
  className?: string;
}

export const BoardMenuPopup: React.FC<BoardMenuPopupProps> = ({ className = '' }) => {
  const isMenuOpen = useStore((state) => state.isMenuOpen);
  const setIsMenuOpen = useStore((state) => state.setIsMenuOpen);
  const isHistoryOpen = useStore((state) => state.isHistoryOpen);
  const toggleHistory = useStore((state) => state.toggleHistory);
  const isSettingsOpen = useStore((state) => state.isSettingsOpen);
  const setIsSettingsOpen = useStore((state) => state.setIsSettingsOpen);
  const isExportOpen = useStore((state) => state.isExportOpen);
  const setIsExportOpen = useStore((state) => state.setIsExportOpen);
  const isGuideOpen = useStore((state) => state.isGuideOpen);
  const setIsGuideOpen = useStore((state) => state.setIsGuideOpen);
  const isAiDrawerOpen = useStore((state) => state.isAiDrawerOpen);
  const toggleAiDrawer = useStore((state) => state.toggleAiDrawer);
  const isAiModalOpen = useStore((state) => state.isAiModalOpen);
  const setAiModalOpen = useStore((state) => state.setAiModalOpen);

  const userName = useStore((state) => state.userName);
  const setUserName = useStore((state) => state.setUserName);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(userName);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <AnimatePresence>
      {isMenuOpen && (
        <>
          {/* Click-outside backdrop (fully transparent, zero blur so toolbar remains completely crisp) */}
          <div
            className="fixed inset-0 z-[90] bg-transparent pointer-events-auto"
            onClick={closeMenu}
          />

          {/* Floating Menu Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -8, x: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8, x: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute left-[calc(100%+14px)] top-0 z-[100] w-[264px] max-h-[min(82vh,560px)] bg-[#FBF6F0]/95 backdrop-blur-2xl rounded-[24px] border border-[#E7DDD2] shadow-[0_16px_44px_rgba(63,42,29,0.14)] flex flex-col overflow-hidden pointer-events-auto select-none ${className}`}
          >
            <nav className="flex-1 overflow-y-auto px-3 py-3.5 space-y-1 custom-scrollbar">
              {/* 1. Whiteboard Core */}
              <SidebarItem
                icon={Square}
                label="Whiteboard"
                active={!isHistoryOpen && !isSettingsOpen && !isExportOpen && !isAiDrawerOpen && !isAiModalOpen}
                onClick={() => {
                  if (isHistoryOpen) toggleHistory();
                  setIsSettingsOpen(false);
                  setIsExportOpen(false);
                  setAiModalOpen(false);
                  if (isAiDrawerOpen) toggleAiDrawer();
                  closeMenu();
                }}
              />

              {/* 2. AI Assistant with inline full size popup button */}
              <SidebarItem
                icon={Sparkles}
                label="AI Assistant"
                active={isAiDrawerOpen}
                onClick={() => {
                  if (!isAiDrawerOpen) toggleAiDrawer();
                  setAiModalOpen(false);
                  closeMenu();
                }}
                trailing={
                  <button
                    type="button"
                    title="Open full size AI chat popup"
                    aria-label="Open full size AI chat popup"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAiModalOpen(true);
                      if (isAiDrawerOpen) toggleAiDrawer();
                      closeMenu();
                    }}
                    className={`rounded-full p-1 transition-colors cursor-pointer ml-1 ${
                      isAiModalOpen
                        ? 'bg-[#FBF6F0] text-[#6B4423]'
                        : isAiDrawerOpen
                          ? 'text-[#FBF6F0]/80 hover:text-[#FBF6F0] hover:bg-white/20'
                          : 'text-[#6B4423]/70 hover:text-[#3F2A1D] hover:bg-[#E7DDD2]'
                    }`}
                  >
                    <Maximize2 size={15} />
                  </button>
                }
              />

              {/* 4. History */}
              <SidebarItem
                icon={Clock}
                label="Session history"
                active={isHistoryOpen}
                onClick={() => {
                  toggleHistory();
                  setIsSettingsOpen(false);
                  setIsExportOpen(false);
                  closeMenu();
                }}
              />

              {/* 5. Export & Import */}
              <SidebarItem
                icon={Download}
                label="Export and import"
                active={isExportOpen}
                onClick={() => {
                  setIsExportOpen(true);
                  if (isHistoryOpen) toggleHistory();
                  setIsSettingsOpen(false);
                  closeMenu();
                }}
              />

              {/* 6. Settings */}
              <SidebarItem
                icon={Settings}
                label="Settings"
                active={isSettingsOpen}
                onClick={() => {
                  setIsSettingsOpen((prev) => !prev);
                  if (isHistoryOpen) toggleHistory();
                  setIsExportOpen(false);
                  setIsGuideOpen(false);
                  closeMenu();
                }}
              />

              {/* 7. Teacher Guide */}
              <SidebarItem
                icon={HelpCircle}
                label="Teacher guide"
                active={isGuideOpen}
                onClick={() => {
                  setIsGuideOpen(true);
                  if (isHistoryOpen) toggleHistory();
                  setIsSettingsOpen(false);
                  setIsExportOpen(false);
                  closeMenu();
                }}
              />

              {/* 8. Home (Web Only) */}
              {isWeb && (
                <SidebarItem
                  icon={Home}
                  label="Home"
                  active={false}
                  onClick={() => {
                    navigateToLanding();
                    closeMenu();
                  }}
                />
              )}
            </nav>

            {/* Teacher Profile Footer */}
            <div className="p-3 border-t border-[#E7DDD2]/80 bg-[#F6F0E8]/40 shrink-0">
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-2xl hover:bg-white/80 hover:shadow-xs transition-all cursor-pointer group">
                <div className="w-9 h-9 rounded-xl shadow-xs bg-[#6B4423] flex items-center justify-center text-[#FBF6F0] font-black text-sm shrink-0">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  {isEditingName ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editNameValue.trim()) setUserName(editNameValue);
                        setIsEditingName(false);
                      }}
                      className="flex items-center gap-1"
                    >
                      <input
                        autoFocus
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        className="text-[13px] font-bold text-[#3F2A1D] border-b border-[#6B4423] outline-none bg-transparent w-full"
                        onBlur={() => {
                          if (editNameValue.trim()) setUserName(editNameValue);
                          setIsEditingName(false);
                        }}
                      />
                      <button type="submit" className="text-[#6B4423] cursor-pointer">
                        <Check size={14} />
                      </button>
                    </form>
                  ) : (
                    <div
                      className="flex items-center gap-1.5"
                      onClick={() => {
                        setEditNameValue(userName);
                        setIsEditingName(true);
                      }}
                    >
                      <div className="text-[13px] font-bold text-[#3F2A1D] truncate">{userName}</div>
                      <Pencil size={11} className="text-[#A08B7A] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  <div className="text-[11px] text-[#A08B7A] font-medium leading-none mt-0.5">Class teacher</div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
export default BoardMenuPopup;
