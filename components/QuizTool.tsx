import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, Sparkles, Plus, ChevronRight, 
  CheckSquare, ListTodo, FileQuestion, Users, 
  BrainCircuit, LayoutGrid
} from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../utils/translations';

export const QuizTool: React.FC = () => {
  const { t } = useTranslation();
  const [view, setView] = useState<'hub' | 'create'>('hub');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [topicInput, setTopicInput] = useState<string>('');
  
  const quizTypes = [
    {
      componentType: 'QUIZ_MULTIPLE_CHOICE',
      icon: CheckSquare,
      title: t('quiz_type_mc', 'Multiple Choice'),
      desc: t('quiz_type_mc_desc', 'One correct answer'),
      color: 'bg-[#F4B183]/35 text-[#6B4423]',
      defaultConfig: {
        title: 'Multiple choice quiz',
        question: 'Which of the following is the primary function of chlorophyll in photosynthesis?',
        options: [
          'Absorbing sunlight energy',
          'Transporting water from roots to leaves',
          'Storing food reserves as starch',
          'Binding oxygen gas from the air'
        ],
        correctIndex: 0,
        explanation: 'Chlorophyll captures sunlight photons to initiate light-dependent reactions in the thylakoid membrane.'
      }
    },
    {
      componentType: 'QUIZ_TRUE_FALSE',
      icon: BrainCircuit,
      title: t('quiz_type_tf', 'True / False'),
      desc: t('quiz_type_tf_desc', 'Quick concept evaluation'),
      color: 'bg-emerald-100 text-emerald-600',
      defaultConfig: {
        title: 'True or false quiz',
        statement: 'The Calvin cycle (light-independent reaction) of photosynthesis takes place in the chloroplast stroma.',
        isTrue: true,
        explanation: 'Correct, the Calvin cycle occurs in the stroma, while the light reactions occur in the thylakoid membrane.'
      }
    },
    {
      componentType: 'QUIZ_ESSAY',
      icon: ListTodo,
      title: t('quiz_type_essay', 'Short Essay'),
      desc: t('quiz_type_essay_desc', 'In-depth understanding test'),
      color: 'bg-amber-100 text-amber-600',
      defaultConfig: {
        title: 'Short answer',
        question: 'Explain the key differences between the light reactions and the Calvin cycle in photosynthesis!',
        placeholder: 'Write your answer here...'
      }
    },
    {
      componentType: 'QUIZ_DRAG_MATCH',
      icon: LayoutGrid,
      title: t('quiz_type_drag', 'Drag & Match'),
      desc: t('quiz_type_drag_desc', 'Interactive and visual'),
      color: 'bg-purple-100 text-purple-600',
      defaultConfig: {
        title: 'Match Concept Pairs',
        pairs: [
          { left: 'Chloroplast', right: 'Site of photosynthesis' },
          { left: 'Mitochondria', right: 'Center of cellular respiration (ATP)' },
          { left: 'Ribosome', right: 'Site of protein synthesis' }
        ]
      }
    },
  ];

  const handleSpawnTemplate = (qt: typeof quizTypes[number]) => {
    const id = `quiz_${Date.now()}`;
    const store = useStore.getState();
    store.updateDomElement(id, {
      id,
      html: '<div>Quiz</div>',
      componentType: qt.componentType,
      config: qt.defaultConfig,
      x: 960,
      y: 540,
      width: 480,
      height: 440,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      zIndex: 15
    });
    window.dispatchEvent(new CustomEvent('addCanvasPlaceholder', {
      detail: { id, x: 960, y: 540, width: 480, height: 440 }
    }));
    if (store.isQuizOpen) store.toggleQuiz();
  };

  const handleStartGenerate = () => {
    const store = useStore.getState();
    const topic = topicInput.trim() || store.lessonPlan?.topic || 'current whiteboard material';
    store.setChatInputText(`Create an interactive quiz with ${questionCount} questions about ${topic}`);
    if (!store.isAiDrawerOpen) store.toggleAiDrawer();
    if (store.isQuizOpen) store.toggleQuiz();
  };

  return (
    <div className="flex flex-col h-full bg-[#F6F0E8] font-sans">
      <AnimatePresence mode="wait">
        {view === 'hub' ? (
          <motion.div 
            key="hub"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 p-6 overflow-y-auto custom-scrollbar"
          >
            <div className="mb-6">
               <h4 className="text-[14px] font-black text-[#A08B7A] uppercase tracking-widest mb-4">{t('quiz_createNew', 'Create new')}</h4>
               <button 
                 onClick={() => setView('create')}
                 className="w-full h-32 rounded-[1.5rem] bg-[#6B4423] flex flex-col items-center justify-center text-white shadow-xl shadow-[#6B4423]/20 hover:scale-[1.02] active:scale-98 transition-all group"
               >
                  <Sparkles size={32} className="mb-2 group-hover:rotate-12 transition-transform" />
                  <span className="font-bold text-[16px]">{t('quiz_generateViaAi', 'Generate a quiz with AI')}</span>
                  <span className="text-[12px] opacity-70">{t('quiz_autoFromBoard', 'Automatically from whiteboard content')}</span>
               </button>
            </div>

            <div>
               <h4 className="text-[14px] font-black text-[#A08B7A] uppercase tracking-widest mb-4">{t('quiz_templates', 'Quiz templates')}</h4>
               <div className="grid grid-cols-1 gap-3">
                  {quizTypes.map((type, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSpawnTemplate(type)}
                      className="flex items-center gap-4 p-4 bg-[#FFF6EE] rounded-2xl border border-[#E7DDD2] hover:border-[#F4B183] hover:bg-[#F4B183]/25 transition-all group text-left cursor-pointer"
                    >
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${type.color} group-hover:scale-110 transition-transform shadow-sm`}>
                          <type.icon size={24} />
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="font-bold text-[#3F2A1D] text-[15px]">{type.title}</div>
                          <div className="text-[12px] text-[#A08B7A] font-medium truncate">{type.desc}</div>
                       </div>
                       <ChevronRight size={18} className="text-[#A08B7A] group-hover:text-[#6B4423]" />
                    </button>
                  ))}
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 p-6 flex flex-col"
          >
             <button onClick={() => setView('hub')} className="text-[12px] font-bold text-[#A08B7A] mb-4 flex items-center gap-1 hover:text-[#3F2A1D] cursor-pointer">
               <ChevronRight size={14} className="rotate-180" /> {t('quiz_back', 'Back')}
             </button>
             <h3 className="text-xl font-extrabold text-[#3F2A1D] mb-2">{t('quiz_automation', 'Quiz from the board')}</h3>
             <p className="text-[14px] text-[#A08B7A] mb-4 font-medium">{t('quiz_automationDesc', 'Chalk reads the whiteboard and writes questions from it.')}</p>
             
             <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#A08B7A] uppercase tracking-wider">Quiz topic (optional)</label>
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="Leave blank to use the whiteboard..."
                    className="w-full px-3.5 py-2.5 bg-[#FFF6EE] border border-[#E7DDD2] rounded-xl text-sm font-medium text-[#3F2A1D] outline-none focus:border-[#F4B183]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#A08B7A] uppercase tracking-wider">{t('quiz_questionCount', 'Number of Questions')}</label>
                  <div className="flex gap-2">
                     {[3, 5, 10].map(n => (
                       <button
                         key={n}
                         type="button"
                         onClick={() => setQuestionCount(n)}
                         className={`flex-1 py-3 border rounded-xl font-bold transition-colors cursor-pointer ${
                           questionCount === n
                             ? 'bg-[#6B4423] text-white border-[#6B4423] shadow-sm'
                             : 'bg-[#FFF6EE] border-[#E7DDD2] text-[#6B4423] hover:bg-[#F4B183]/30 hover:border-[#E7DDD2]'
                         }`}
                       >
                         {n}
                       </button>
                     ))}
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleStartGenerate}
                  className="w-full py-4 mt-4 bg-[#6B4423] hover:bg-[#3F2A1D] text-white rounded-2xl font-bold shadow-lg shadow-[#6B4423]/20 active:scale-95 transition-all cursor-pointer"
                >
                   {t('quiz_startGenerate', 'START GENERATING')}
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
