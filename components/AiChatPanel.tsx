import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Trash2, X, Network, FileText, HelpCircle, Plus, Mic, Send, Maximize2, PanelRightClose } from 'lucide-react';
import { useStore } from '../store';
import { useGeminiBrain } from '../hooks/useGeminiBrain';
import { useTranslation } from '../utils/translations';
import { toast } from '../utils/toast';
import { FileUploadButton } from './FileUploadButton';
import { AttachedDocumentBadge } from './AttachedDocumentBadge';
import { ChatMessageItem } from './ChatMessageItem';
import { ProcessingStatusHud } from './ProcessingStatusHud';

export interface AiChatPanelProps {
  mode: 'sidebar' | 'modal';
  canvasRef: React.MutableRefObject<any>;
  onClose: () => void;
  onToggleMode?: () => void;
  onOpenSettings: () => void;
  statusConfig: { dot: string; text: string; mode: string; detail?: string };
}

export const AiChatPanel: React.FC<AiChatPanelProps> = ({ mode, canvasRef, onClose, onToggleMode, onOpenSettings, statusConfig }) => {
  const { t } = useTranslation();
  const { messages, isThinking, abortTask, chatInputText, setChatInputText,
    attachedDocument, lastUploadedImage, isVoiceListening, interimInputText } = useStore();
  const { processUserPrompt } = useGeminiBrain();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const followMessages = useRef(true);
  useEffect(() => {
    const end = chatEndRef.current;
    const body = end?.parentElement;
    if (!body) return;
    const follow = () => { if (followMessages.current) body.scrollTop = body.scrollHeight; };
    const onScroll = () => { followMessages.current = body.scrollHeight - body.scrollTop - body.clientHeight < 80; };
    const observer = new MutationObserver(follow);
    observer.observe(body, { subtree: true, childList: true, characterData: true });
    body.addEventListener('scroll', onScroll, { passive: true });
    follow();
    return () => { observer.disconnect(); body.removeEventListener('scroll', onScroll); };
  }, []);
  const starters = [
    ['Mind map', 'Create a mind map about the topic on this whiteboard.'],
    ['Math diagram', 'Explain the math on this whiteboard with a diagram.'],
    ['Lesson summary', 'Summarize the lesson on this whiteboard.'],
    ['Quiz', 'Create a five-question quiz about this lesson.'],
  ];
  return <div data-chat-mode={mode} className="flex h-full min-h-0 w-full flex-col">
                  {/* Header */}
                  <div className="h-16 lg:h-18 border-b border-[#E7DDD2] flex items-center justify-between px-5 font-sans bg-[#FBF6F0]/80">
                    <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#F4B183] shrink-0 shadow-xs">
                          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
                            <path
                              d="M7 4.5v15l4.2-4.1 2.9 5.1 2.4-1.3-2.9-5H19L7 4.5Z"
                              fill="#3F2A1D"
                              stroke="#3F2A1D"
                              strokeWidth="1.2"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[#3F2A1D] text-[15px]">{t('assistant', 'Assistant')}</span>
                            <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`} title={statusConfig.text} />
                          </div>
                          <div title={statusConfig.detail || statusConfig.text} className="max-w-[150px] truncate text-[11px] text-[#A08B7A] font-semibold tracking-tight">
                            {statusConfig.detail || statusConfig.text}
                          </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {onToggleMode && <button type="button" onClick={onToggleMode}
                        aria-label={mode === 'sidebar' ? 'Pop out to modal' : 'Dock to side'}
                        title={mode === 'sidebar' ? 'Pop out to modal' : 'Dock to side'}
                        className="rounded-2xl bg-[#F6F0E8] p-2.5 text-[#6B4423] hover:bg-[#F4B183]/30">
                        {mode === 'sidebar' ? <Maximize2 size={16} /> : <PanelRightClose size={16} />}
                      </button>}
                      <button
                        type="button"
                        onClick={() => {
                          useStore.getState().clearMessages();
                          toast.info(t('clearChatToast', 'Conversation history cleared.'));
                        }}
                        aria-label={t('clearChatHistory', 'Clear conversation')}
                        title={t('clearChatHistory', 'Clear conversation')}
                        className="text-[#A08B7A] hover:text-rose-600 bg-[#F6F0E8] hover:bg-rose-50 p-2.5 rounded-2xl transition-colors active:scale-95 cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button aria-label="Close AI chat" onClick={onClose} className="text-[#A08B7A] hover:text-[#3F2A1D] bg-[#F6F0E8] hover:bg-[#F4B183]/30 p-2.5 rounded-2xl transition-colors active:scale-95 cursor-pointer">
                        <X size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  {/* Chat Content */}
                  <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 custom-scrollbar scroll-smooth">
                    {/* Reminder Pill for Demo Cloud / Chalk Local Models & Personal API Key */}
                    <div className="p-3 rounded-2xl bg-[#F6F0E8] border border-[#E7DDD2] text-[11.5px] leading-relaxed text-[#3F2A1D] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-[#3F2A1D] flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-[#FFE08A] text-[#3F2A1D] text-[9.5px] font-black uppercase">AI</span>
                          Local model or your own API key
                        </span>
                        <button
                          type="button"
                          onClick={onOpenSettings}
                          className="text-[10.5px] font-extrabold text-[#6B4423] underline cursor-pointer"
                        >
                          {t('settings', 'Settings')} →
                        </button>
                      </div>
                      <p className="text-[#6B4423] font-medium">
                        Use a local model in Ollama, or add your own Google AI Studio key in Settings.
                      </p>
                    </div>
                    {messages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-50 px-4">
                        <div className="w-16 h-16 rounded-3xl bg-[#F4B183]/40 flex items-center justify-center mb-4">
                           <Sparkles size={28} className="text-[#6B4423]" />
                        </div>
                        <p className="text-[15px] font-medium text-[#A08B7A]">{t('emptyChatPrompt', 'Ask anything or upload a file/document/image to start a conversation with AI.')}</p>
                      </div>
                    )}
                    {!messages.some(message => message.role === 'user') && (
                      <div className="grid grid-cols-2 gap-2" aria-label="Starter prompts">
                        {starters.map(([label, prompt]) => <button key={label} type="button"
                          onClick={() => setChatInputText(prompt)}
                          className="rounded-2xl border border-[#E7DDD2] bg-[#FFF6EE] px-3 py-2 text-left text-xs font-bold text-[#6B4423] hover:bg-[#F4B183]/25 focus-visible:ring-2 focus-visible:ring-[#6B4423]">
                          {label}
                        </button>)}
                      </div>
                    )}
                    {messages.map((msg, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={i}
                        className="w-full"
                      >
                        <ChatMessageItem
                          message={msg}
                          isLatest={i === messages.length - 1}
                          isThinking={isThinking}
                        />
                      </motion.div>
                    ))}
                    {isThinking && (
                      <div className="flex flex-col items-start w-full my-1">
                        <ProcessingStatusHud onCancel={abortTask} />
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input Bar */}
                  <div className="p-4 lg:p-5 border-t border-[#E7DDD2] bg-[#FBF6F0]/90 backdrop-blur-xl shadow-[0_-10px_40px_rgba(63,42,29,0.04)] z-10 font-sans relative shrink-0">
                    <AttachedDocumentBadge className="mb-2" />

                    {/* Live Voice Mode Synchronization Banner inside Studio Drawer */}
                    {isVoiceListening && (
                      <div className="flex items-center justify-between gap-2 px-3.5 py-2 mb-2.5 rounded-full bg-[#6B4423] text-[#FFF6EE] text-xs font-bold shadow-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2 h-2 rounded-full bg-[#ffcc00] animate-ping shrink-0" />
                          <span className="truncate">
                            {interimInputText
                              ? `${t('listeningTo', 'Listening')}: "${interimInputText}"`
                              : t('voiceListeningActive', 'Voice mode is on. Please speak...')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => window.dispatchEvent(new Event('toggle-mic'))}
                          className="px-2.5 py-0.5 rounded-full bg-[#FFE08A] text-[#3F2A1D] text-[10px] font-black shrink-0 cursor-pointer"
                        >
                          {t('doneBtn', 'Done')}
                        </button>
                      </div>
                    )}

                    {/* Quick Document Action Pills (Only when document is attached) */}
                    {attachedDocument && !isThinking && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        <button
                          type="button"
                          onClick={async () => {
                            const prompt = `Please create a structured and comprehensive mind map from the document "${attachedDocument.name}" on the whiteboard.`;
                            useStore.getState().addMessage({ role: 'user', text: prompt });
                            await processUserPrompt(prompt, canvasRef);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4B183]/35 hover:bg-[#F4B183]/55 text-[#3F2A1D] border border-[#E7DDD2] text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <Network size={12} />
                          <span>{t('createMindmapBtn', '🌳 Create Mind Map')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const prompt = `Please create a comprehensive academic summary of the document "${attachedDocument.name}" and display it as a note on the whiteboard.`;
                            useStore.getState().addMessage({ role: 'user', text: prompt });
                            await processUserPrompt(prompt, canvasRef);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFE08A]/50 hover:bg-[#FFE08A]/80 text-[#3F2A1D] border border-[#E7DDD2] text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <FileText size={12} />
                          <span>{t('summarizeDocBtn', '📝 Summarize Material')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const prompt = `Please create a 5-question student comprehension quiz based on the document "${attachedDocument.name}".`;
                            useStore.getState().addMessage({ role: 'user', text: prompt });
                            await processUserPrompt(prompt, canvasRef);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <HelpCircle size={12} />
                          <span>{t('createQuizBtn', '❓ Create Interactive Quiz')}</span>
                        </button>
                      </div>
                    )}

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (isThinking) return;
                        if (!chatInputText.trim() && !attachedDocument && !lastUploadedImage) return;
                        const defaultText = attachedDocument
                          ? (attachedDocument.category === 'image'
                              ? t('pleaseAnalyzeImage', 'Please analyze this image.')
                              : t('pleaseAnalyzeDocument', 'Please analyze this document and summarize key points on the whiteboard.'))
                          : (lastUploadedImage ? t('pleaseAnalyzeImage', 'Please analyze this image.') : '');
                        const text = chatInputText.trim() || defaultText;
                        followMessages.current = true;
                        setChatInputText('');
                        useStore.getState().addMessage({ role: 'user', text });
                        await processUserPrompt(text, canvasRef);
                      }}
                      className="flex items-end gap-2 w-full border-[1.5px] border-[#E7DDD2] rounded-3xl p-1.5 bg-[#FFF6EE] focus-within:bg-[#FFF6EE] focus-within:ring-4 focus-within:ring-[#F4B183]/35 focus-within:border-[#F4B183] transition-all shadow-inner"
                    >
                        <div className="flex items-center pb-0.5">
                          <FileUploadButton
                            className="text-[#A08B7A] hover:text-[#3F2A1D] transition-colors p-2.5 rounded-[1.1rem] hover:bg-[#F4B183]/30 ml-0.5 active:scale-95"
                            icon={<Plus size={20} />}
                            title={t('uploadFileOrImage', 'Upload file / document / image')}
                            disabled={isThinking}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              window.dispatchEvent(new Event('toggle-mic'));
                            }}
                            disabled={isThinking}
                            className={`transition-all p-2.5 rounded-full active:scale-95 cursor-pointer ${
                              useStore.getState().isVoiceListening
                                ? 'bg-red-500 text-white animate-pulse shadow-sm'
                                : 'text-[#A08B7A] hover:text-[#3F2A1D] hover:bg-[#F4B183]/30'
                            } ${isThinking ? 'opacity-40 pointer-events-none' : ''}`}
                            title={useStore.getState().isVoiceListening ? 'Stop & Send Voice' : t('switchToVoice', 'Switch to voice mode')}
                          >
                            <Mic size={20} />
                          </button>
                        </div>
                        <textarea
                          aria-label="Message AI assistant"
                          value={chatInputText}
                          onChange={(e) => {
                            setChatInputText(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                              e.preventDefault();
                              e.currentTarget.form?.requestSubmit();
                            }
                          }}
                          rows={1}
                          disabled={isThinking}
                          placeholder={isThinking
                            ? t('chalkIsThinking', 'Inclu is thinking...')
                            : (attachedDocument
                                ? (attachedDocument.category === 'pdf'
                                    ? 'Ask about this PDF...'
                                    : 'Ask about this document...')
                                : t('askSomething', 'Ask something or enter instructions...'))}
                          className="flex-1 w-full bg-transparent border-none outline-none text-[14.5px] font-semibold text-[#3F2A1D] placeholder-[#A08B7A] px-2 py-2 resize-none max-h-40 min-h-[38px] leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed overflow-y-auto"
                        />
                         <div className="pb-0.5">
                           <button
                             type="submit"
                             aria-label="Send message"
                             disabled={isThinking || (!chatInputText.trim() && !attachedDocument && !lastUploadedImage)}
                             className={`p-3 rounded-[1.2rem] transition-all duration-200 mr-0.5 ${isThinking ? 'bg-[#F6F0E8] text-[#A08B7A] scale-95 pointer-events-none opacity-50' : (chatInputText.trim() || attachedDocument || lastUploadedImage ? 'bg-[#6B4423] text-[#FFF6EE] shadow-lg shadow-[#6B4423]/25 active:scale-90 scale-100' : 'bg-[#F6F0E8] text-[#A08B7A] scale-95 pointer-events-none')}`}
                           >
                             <Send size={18} />
                           </button>
                         </div>
                    </form>
                  </div>
  </div>;
};
