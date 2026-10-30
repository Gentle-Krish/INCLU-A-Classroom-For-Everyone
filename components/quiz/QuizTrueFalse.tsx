import React, { useState } from 'react';

interface QuizTrueFalseProps {
  config: {
    statement?: string;
    question?: string;
    title?: string;
    isTrue?: boolean;
    correct?: boolean;
    explanation?: string;
  };
}

export const QuizTrueFalse: React.FC<QuizTrueFalseProps> = ({ config }) => {
  const [selected, setSelected] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const statementText = config?.statement || config?.question || config?.title || 'True or false';
  const expectedBool = config?.isTrue !== undefined ? config.isTrue : (config?.correct !== undefined ? Boolean(config.correct) : true);

  const getBtnClass = (val: boolean) => {
    if (submitted) {
      if (val === expectedBool) {
        return "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500";
      } else if (selected === val && val !== expectedBool) {
        return "border-rose-400 bg-rose-50 text-rose-800 ring-2 ring-rose-400";
      } else {
        return "border-[#E7DDD2] bg-[#F6F0E8] text-[#A08B7A] opacity-60";
      }
    } else if (selected === val) {
      return "border-[#6B4423] bg-[#F4B183]/25 text-[#3F2A1D] ring-2 ring-[#F4B183]";
    }
    return "border-[#E7DDD2] text-[#6B4423] hover:border-[#E7DDD2] hover:bg-[#F6F0E8]";
  };

  const isCorrect = selected === expectedBool;

  return (
    <div className="flex w-full h-full flex-col bg-[#FFF6EE] p-6 font-sans select-none">
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <span className="text-[11px] font-black tracking-widest text-[#6B4423] uppercase mb-3 bg-[#F4B183]/25 px-3 py-1 rounded-full">
          True or false
        </span>
        <h3 className="mb-6 text-lg font-bold text-[#3F2A1D] leading-relaxed max-w-sm">
          {statementText}
        </h3>
        
        <div className="flex gap-4 w-full px-2">
          <button
            onClick={() => !submitted && setSelected(true)}
            className={`flex-1 rounded-2xl border-2 py-5 flex flex-col justify-center items-center gap-2 transition-all duration-200 ${getBtnClass(true)}`}
          >
            <div className="bg-[#FFF6EE] p-2.5 rounded-full shadow-sm">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-emerald-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <span className="font-bold text-sm tracking-wider">TRUE</span>
          </button>
          
          <button
            onClick={() => !submitted && setSelected(false)}
            className={`flex-1 rounded-2xl border-2 py-5 flex flex-col justify-center items-center gap-2 transition-all duration-200 ${getBtnClass(false)}`}
          >
            <div className="bg-[#FFF6EE] p-2.5 rounded-full shadow-sm">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-rose-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
            <span className="font-bold text-sm tracking-wider">FALSE</span>
          </button>
        </div>
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
               {config?.explanation && (
                 <p className="text-xs text-[#6B4423] mt-1 pl-8 leading-relaxed">
                   <strong>Explanation:</strong> {config.explanation}
                 </p>
               )}
             </div>
             
             <button 
               onClick={() => { setSelected(null); setSubmitted(false); }}
               className="w-full bg-[#F6F0E8] font-bold text-[#6B4423] py-2.5 rounded-xl hover:bg-[#E7DDD2] transition text-xs uppercase tracking-wider no-print"
             >
               Try again
             </button>
           </div>
        )}
      </div>
    </div>
  );
};
