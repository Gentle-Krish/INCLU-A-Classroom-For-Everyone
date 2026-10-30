import React, { useState } from 'react';
import { toast } from '../../utils/toast';

interface QuizMultipleChoiceProps {
  config: {
    question?: string;
    statement?: string;
    title?: string;
    options?: string[];
    correctIndex?: number;
    correct?: number;
    rightAnswerIndex?: number;
    explanation?: string;
    questions?: Array<{
      question?: string;
      options?: string[];
      correctIndex?: number;
      correct?: number;
      rightAnswerIndex?: number;
      explanation?: string;
    }>;
  };
}

export const QuizMultipleChoice: React.FC<QuizMultipleChoiceProps> = ({ config }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Extract question from direct or nested structure
  const questionText = config?.question || 
    config?.statement || 
    config?.questions?.[0]?.question || 
    config?.title || 
    'Quiz Question';

  // Extract options
  const rawOptions = config?.options || config?.questions?.[0]?.options;
  const options = Array.isArray(rawOptions) && rawOptions.length > 0 
    ? rawOptions 
    : ['Option A', 'Option B', 'Option C', 'Option D'];

  // Extract correct index
  const correctIdx = config?.correctIndex ?? 
    config?.correct ?? 
    config?.rightAnswerIndex ?? 
    config?.questions?.[0]?.correctIndex ?? 
    config?.questions?.[0]?.correct ?? 
    config?.questions?.[0]?.rightAnswerIndex ?? 
    0;

  const explanation = config?.explanation || config?.questions?.[0]?.explanation;
  const isCorrect = selected === correctIdx;

  return (
    <div className="flex w-full h-full flex-col bg-[#FFF6EE] p-6 font-sans relative select-none">
      <button 
        onClick={() => {
          const text = `${questionText}\n\n${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}`;
          navigator.clipboard.writeText(text);
          toast.success('Question copied.');
        }}
        className="absolute top-4 right-4 p-2 text-[#A08B7A] hover:text-[#6B4423] hover:bg-[#F4B183]/30 rounded-lg transition-colors no-print"
        title="Copy question"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
      </button>

      <span className="text-[11px] font-black tracking-widest text-[#6B4423] uppercase mb-2">Multiple choice</span>

      <h3 className="mb-5 text-lg font-bold text-[#3F2A1D] leading-snug pr-8">
        {questionText}
      </h3>

      <div className="flex-1 space-y-2.5 overflow-y-auto pr-2 custom-scrollbar">
        {options.map((opt, i) => {
          let optClass = "border-[#E7DDD2] text-[#6B4423] hover:border-[#F4B183] hover:bg-[#F4B183]/25";
          if (submitted) {
            if (i === correctIdx) {
              optClass = "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold ring-2 ring-emerald-500/20";
            } else if (selected === i && i !== correctIdx) {
              optClass = "border-rose-400 bg-rose-50 text-rose-800 ring-2 ring-rose-400/20";
            } else {
              optClass = "border-[#E7DDD2] text-[#A08B7A] opacity-60";
            }
          } else if (selected === i) {
            optClass = "border-[#6B4423] bg-[#F4B183]/25 text-[#3F2A1D] font-semibold ring-2 ring-[#F4B183]/50";
          }

          return (
            <button
              key={i}
              onClick={() => !submitted && setSelected(i)}
              className={`w-full rounded-2xl border-2 p-3.5 text-left transition-all duration-200 ${optClass} group flex items-center gap-3`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors font-bold text-xs
                ${submitted && i === correctIdx ? 'border-emerald-500 bg-emerald-500 text-white' : 
                  (submitted && selected === i ? 'border-rose-400 bg-rose-400 text-white' : 
                  (selected === i ? 'border-[#6B4423] bg-[#6B4423] text-white' : 'border-[#E7DDD2] text-[#A08B7A]'))
                }
              `}>
                {submitted && i === correctIdx ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : submitted && selected === i ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </div>
              <span className="text-[14px] leading-relaxed">{opt}</span>
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 border-t border-[#E7DDD2] pt-3 flex flex-col gap-2">
        {!submitted ? (
           <button 
             disabled={selected === null}
             onClick={() => setSubmitted(true)}
             className="w-full bg-[#6B4423] font-bold text-white py-3 rounded-xl shadow-md shadow-[#6B4423]/15 hover:bg-[#3F2A1D] transition disabled:opacity-40 disabled:shadow-none uppercase tracking-wider text-xs no-print"
           >
             Check answer
           </button>
        ) : (
           <div className="flex flex-col gap-2">
             <div className={`p-3 rounded-xl flex flex-col gap-1 ${isCorrect ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
               <div className="flex items-center gap-2">
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                   {isCorrect ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4"><polyline points="20 6 9 17 4 12"></polyline></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>}
                 </div>
                 <span className="font-bold text-sm">{isCorrect ? 'Correct' : 'Not quite'}</span>
               </div>
               {explanation && (
                 <p className="text-xs text-[#6B4423] mt-1 pl-8 leading-relaxed">
                   <strong>Explanation:</strong> {explanation}
                 </p>
               )}
             </div>
             
             <div className="flex gap-2">
               <button 
                 onClick={() => { setSelected(null); setSubmitted(false); }}
                 className="flex-1 bg-[#F6F0E8] font-bold text-[#6B4423] py-2.5 rounded-xl hover:bg-[#E7DDD2] transition text-xs uppercase tracking-wider no-print"
               >
                 Try again
               </button>
             </div>
           </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
    </div>
  );
};
