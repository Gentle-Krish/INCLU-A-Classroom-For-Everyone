import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useStore } from '../store';
import { collectLessonNotes } from '../utils/lessonNotes';
import { parseQuestPack } from '../utils/questSchema';
import type { QuestDraft } from '../types';

interface QuestPanelProps {
  isOpen: boolean;
  roomId: string;
  pendingWrite: React.MutableRefObject<boolean>;
  kick: number;
  onClose: () => void;
  onOpenQuest: (quest: QuestDraft) => void;
  onCloseQuest: () => void;
}

const SAFE_ERROR = 'The quest could not be written on this laptop.';

function writeError(body: unknown): string {
  if (!body || typeof body !== 'object') return SAFE_ERROR;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== 'string' || error.length > 140) return SAFE_ERROR;
  if (/key|AIza|bearer|token/i.test(error)) return SAFE_ERROR;
  return error;
}

export const QuestPanel: React.FC<QuestPanelProps> = ({
  isOpen,
  roomId,
  pendingWrite,
  kick,
  onClose,
  onOpenQuest,
  onCloseQuest,
}) => {
  const questList = useStore((state) => state.questList);
  const questTally = useStore((state) => state.questTally);
  const questScores = useStore((state) => state.questScores);
  const studentQuestions = useStore((state) => state.studentQuestions);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState('');

  const live = questList?.quests.find((quest) => quest.id === questList.liveQuestId) ?? null;
  const closed = !!questList?.liveClosed && !!live;
  const openQuestion = live && questTally && questTally.questId === live.id
    ? live.questions[questTally.openQuestionIndex]
    : live?.questions[0];
  const counts = questTally && live && questTally.questId === live.id
    ? questTally.counts
    : [0, 0, 0, 0];

  const writeQuest = React.useCallback(async () => {
    if (writing) return;
    if (!roomId) {
      setError('Open the class room first.');
      return;
    }
    setWriting(true);
    setError('');
    try {
      const state = useStore.getState();
      const page = state.pages[state.currentPageIndex];
      const notes = collectLessonNotes({
        canvas: page?.canvas,
        mindmapNodes: page?.mindmapNodes,
        messages: state.messages,
      });
      const response = await fetch('/api/ai/quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes,
          geminiApiKey: state.geminiApiKey || undefined,
          ollamaBaseUrl: state.ollamaBaseUrl,
          aiPreference: state.aiPreference,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(writeError(body));
        return;
      }
      const draft = parseQuestPack((body as { quest?: unknown })?.quest);
      onOpenQuest(draft);
    } catch {
      setError(SAFE_ERROR);
    } finally {
      setWriting(false);
    }
  }, [onOpenQuest, roomId, writing]);

  React.useEffect(() => {
    if (!isOpen || !pendingWrite.current) return;
    pendingWrite.current = false;
    void writeQuest();
  }, [isOpen, kick, pendingWrite, writeQuest]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#3f2a1d]/30 backdrop-blur-xs font-sans">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0"
          />
          <motion.div
            role="dialog"
            aria-labelledby="quest-panel-title"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="relative flex w-full max-w-[640px] max-h-[92vh] flex-col overflow-y-auto rounded-[32px] border border-[#E7DDD2] bg-[#F6F0E8] shadow-2xl z-[101]"
          >
            <div className="flex items-start justify-between gap-4 px-7 pt-6 pb-3">
              <div>
                <p className="text-[11px] font-black tracking-[0.18em] text-[#C4A484]">Chalk</p>
                <h3 id="quest-panel-title" className="text-[28px] font-black leading-none tracking-tight text-[#3F2A1D]">
                  Quest
                </h3>
                <p className="mt-2 text-sm font-medium text-[#8A7568]">
                  Students choose fight or listen on their phones.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E7DDD2] bg-[#F3EBE3] text-[#8A7568] cursor-pointer"
                title="Close"
              >
                <X size={18} strokeWidth={2.4} />
              </button>
            </div>

            <div className="flex flex-col gap-4 px-7 pb-6">
              {!live && (
                <button
                  type="button"
                  onClick={() => void writeQuest()}
                  disabled={writing}
                  className="rounded-full bg-[#F4B183] px-5 py-3 text-sm font-bold text-[#3F2A1D] cursor-pointer disabled:opacity-60"
                >
                  {writing ? 'Writing the quest…' : 'Open a quest from this page'}
                </button>
              )}

              {live && !closed && (
                <section className="rounded-[24px] border border-[#E7DDD2] bg-white p-4" aria-live="polite">
                  <p className="text-xs font-black tracking-[0.14em] text-[#8A7568]">LIVE TALLY</p>
                  <h4 className="mt-1 text-lg font-black text-[#3F2A1D]">{live.questTitle}</h4>
                  <p className="text-sm font-semibold text-[#8A7568]">vs {live.bossName}</p>
                  {openQuestion && (
                    <>
                      <p className="mt-3 text-xs font-bold text-[#C4A484]">
                        {openQuestion.lessonPart} · Question {(questTally?.openQuestionIndex ?? 0) + 1} of {live.questions.length}
                      </p>
                      <p className="mt-1 text-base font-bold text-[#3F2A1D]">{openQuestion.question}</p>
                      <ul className="mt-3 flex flex-col gap-2">
                        {openQuestion.options.map((option, index) => (
                          <li
                            key={`${option}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-2xl bg-[#F6F0E8] px-3 py-2"
                          >
                            <span className="min-w-0 text-sm font-semibold text-[#3F2A1D]">{option}</span>
                            <span className="shrink-0 text-lg font-black tabular-nums text-[#3F2A1D]">{counts[index] ?? 0}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onCloseQuest}
                      className="rounded-full bg-[#3F2A1D] px-4 py-2.5 text-sm font-bold text-[#F6F0E8] cursor-pointer"
                    >
                      End quest
                    </button>
                    <button
                      type="button"
                      onClick={() => void writeQuest()}
                      disabled={writing}
                      className="rounded-full border border-[#E7DDD2] bg-white px-4 py-2.5 text-sm font-bold text-[#3F2A1D] cursor-pointer disabled:opacity-60"
                    >
                      {writing ? 'Writing the quest…' : 'Open another quest'}
                    </button>
                  </div>
                </section>
              )}

              {live && closed && (
                <section className="rounded-[24px] border border-[#E7DDD2] bg-white p-4">
                  <p className="text-xs font-black tracking-[0.14em] text-[#8A7568]">SCORES</p>
                  <h4 className="mt-1 text-lg font-black text-[#3F2A1D]">{live.questTitle}</h4>
                  {questScores && questScores.scores.length > 0 ? (
                    <ul className="mt-3 flex flex-col gap-2">
                      {questScores.scores.map((row) => (
                        <li
                          key={`${row.displayName}-${row.mode}-${row.score}`}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-[#F6F0E8] px-3 py-2"
                        >
                          <span className="font-bold text-[#3F2A1D]">{row.displayName}</span>
                          <span className="text-sm font-semibold text-[#8A7568]">
                            {row.score} · {row.mode === 'listen' ? 'Listen' : 'Fight'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-[#8A7568]">No scores yet.</p>
                  )}
                  <button
                    type="button"
                    onClick={() => void writeQuest()}
                    disabled={writing}
                    className="mt-4 rounded-full bg-[#F4B183] px-4 py-2.5 text-sm font-bold text-[#3F2A1D] cursor-pointer disabled:opacity-60"
                  >
                    {writing ? 'Writing the quest…' : 'Open another quest'}
                  </button>
                </section>
              )}

              {error && <p className="text-sm font-semibold text-[#8A5A12]">{error}</p>}

              <section className="rounded-[24px] border border-[#E7DDD2] bg-white p-4">
                <p className="text-xs font-black tracking-[0.14em] text-[#8A7568]">TYPED QUESTIONS</p>
                {studentQuestions.length === 0 ? (
                  <p className="mt-2 text-sm text-[#8A7568]">A student who is not speaking can send one line.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {studentQuestions.map((ask) => (
                      <li key={ask.id} className="rounded-2xl bg-[#F6F0E8] px-3 py-2">
                        <p className="text-xs font-bold text-[#C4A484]">
                          {ask.displayName} · {ask.lessonPart}
                        </p>
                        <p className="text-sm font-semibold text-[#3F2A1D]">{ask.text}</p>
                        {ask.answer && (
                          <p className="mt-1 text-sm text-[#3F2A1D]">{ask.answer}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
