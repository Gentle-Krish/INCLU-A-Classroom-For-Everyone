import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, HelpCircle, Sparkles, PenTool, Mic, 
  Wrench, Atom, Check, ChevronRight, Copy, Search,
  MousePointer, Square, Type, Eraser, Move, Maximize2,
  GitBranch, Play, RefreshCw, Cpu, ShieldCheck, WifiOff,
  Calculator, Timer, Dices, Trophy, ClipboardCheck, LineChart,
  Layers, ExternalLink, ArrowRight, CornerDownLeft
} from 'lucide-react';
import { useStore } from '../store';

interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSamplePromptClick?: (prompt: string) => void;
}

type GuideCategory = 'all' | 'canvas' | 'ai' | 'stem' | 'voice' | 'tools';

interface GuideCardItem {
  id: string;
  category: 'canvas' | 'ai' | 'stem' | 'voice' | 'tools';
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  shortcut?: string;
  badge?: string;
  details: string[];
  actionPrompt?: string;
}

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({ 
  isOpen, 
  onClose,
  onSamplePromptClick 
}) => {
  const [activeCategory, setActiveCategory] = useState<GuideCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const guideItems: GuideCardItem[] = useMemo(() => [
    // 1. CANVAS & DRAWING
    {
      id: 'tool-pointer',
      category: 'canvas',
      title: 'Pointer & Object Selection',
      subtitle: 'Navigate and manipulate canvas elements',
      description: 'Select single or multiple objects to drag, rotate, resize, or rearrange on the whiteboard.',
      icon: MousePointer,
      shortcut: 'V',
      badge: 'Navigation',
      details: [
        'Click and drag to select multiple objects',
        'Shift + Click to add items to active selection',
        'Full touch-screen support with zero input lag'
      ]
    },
    {
      id: 'tool-pen',
      category: 'canvas',
      title: 'Freehand Pen & Brush',
      subtitle: 'Handwriting formulas, notes, and quick sketches',
      description: 'Responsive vector brush with smooth pressure detection, retaining sharpness on high-resolution displays.',
      icon: PenTool,
      shortcut: 'P',
      badge: 'Drawing',
      details: [
        'Customizable stroke weight and classroom contrast palette',
        'Hardware-accelerated Fabric.js vector rendering',
        'Native active stylus pen support with low latency'
      ]
    },
    {
      id: 'tool-shapes',
      category: 'canvas',
      title: 'Geometric Vector Shapes',
      subtitle: 'Rectangles, circles, triangles, and arrows',
      description: 'Clean geometric shapes that preserve stroke thickness without stretching or distortion during resize.',
      icon: Square,
      shortcut: 'R',
      badge: 'Geometry',
      details: [
        'Corner handles preserve proportional aspect ratio',
        'Subtle corner radiuses aligned with Inclu visual standard',
        'Connectable with relational flow arrows'
      ]
    },
    {
      id: 'tool-text',
      category: 'canvas',
      title: 'Typography & Headers',
      subtitle: 'High-legibility sans-serif text blocks',
      description: 'Add lesson headings, definitions, or bullet summaries optimized for legibility from the back of the classroom.',
      icon: Type,
      shortcut: 'T',
      badge: 'Typography',
      details: [
        'Double click any canvas text to inline edit',
        'Native clipboard paste and formatting preservation',
        'Adaptive text scaling relative to whiteboard zoom'
      ]
    },
    {
      id: 'tool-eraser',
      category: 'canvas',
      title: 'Object & Stroke Eraser',
      subtitle: 'Delete specific strokes or clear whiteboard',
      description: 'Erase specific strokes, shapes, or notes precisely without disrupting surrounding content on the board.',
      icon: Eraser,
      shortcut: 'E',
      badge: 'Cleanup',
      details: [
        'Click any object to remove it instantly',
        'Use Clear Whiteboard action for complete reset',
        'Undo (Ctrl+Z) instantly restores erased elements'
      ]
    },
    {
      id: 'tool-canvas-nav',
      category: 'canvas',
      title: 'Canvas Pan, Zoom & Pages',
      subtitle: 'Infinite workspace with multi-page navigation',
      description: 'Pan across an expansive canvas to continue explaining without wiping earlier lecture notes.',
      icon: Layers,
      badge: 'Workspace',
      details: [
        'Press + at bottom-left to create new whiteboard pages',
        'Pinch or mouse scroll to zoom in and out smoothly',
        'Click Reset Zoom (100%) to re-center the canvas'
      ]
    },

    // 2. AI & CONCEPT MAPS
    {
      id: 'ai-mindmap-generator',
      category: 'ai',
      title: 'Mermaid Mindmap Engine',
      subtitle: 'Automated structured concept maps from lesson topics',
      description: 'AI generates hierarchical concept trees rendered via pure Mermaid. Nodes are clean, readable, and draggable.',
      icon: GitBranch,
      badge: 'AI Smartboard',
      details: [
        'Rendered directly into an interactive canvas widget',
        'Powered by industry-standard declarative diagram syntax',
        'Extendable to deep multi-tier concept hierarchies'
      ],
      actionPrompt: 'Generate a concept map of Photosynthesis including light and dark reactions'
    },
    {
      id: 'ai-inplace-mutation',
      category: 'ai',
      title: 'In-Place Mindmap Mutation',
      subtitle: 'Update existing diagrams without recreating them',
      description: 'Inclu maintains state continuity. Requesting new nodes mutates the existing diagram in-place rather than duplicating.',
      icon: RefreshCw,
      badge: 'Continuity',
      details: [
        'Prevents canvas clutter from repeated duplicate widgets',
        'Simply say: "Add subtopic X to branch Y"',
        'New nodes inherit the active layout and styling'
      ],
      actionPrompt: 'Add Diagnostic Assessment and Remedial Follow-up branches to active diagram'
    },
    {
      id: 'ai-curriculum-context',
      category: 'ai',
      title: 'Curriculum & Inquiry Prompts',
      subtitle: 'Aligned with curriculum standards and open inquiry',
      description: 'Trained to generate introductory inquiry hooks that trigger student critical thinking and discussion.',
      icon: Sparkles,
      badge: 'Pedagogy',
      details: [
        'Supports learning phases A through F (Elementary to High School)',
        'Structured around standard learning outcomes and objectives',
        'Recommends Problem Based Learning and Guided Inquiry'
      ],
      actionPrompt: 'Generate 3 inquiry starter questions on Conservation of Energy for high school physics'
    },

    // 3. STEM SIMULATIONS
    {
      id: 'stem-physics-lab',
      category: 'stem',
      title: 'Kinematics & Dynamics Simulations',
      subtitle: 'Interactive projectile motion, gravity, and orbits',
      description: 'Interactive HTML5 Canvas simulations. Students can adjust velocity, launch angle, and mass to observe trajectory curves in real time.',
      icon: Atom,
      badge: 'Physics',
      details: [
        'Real-time accurate numerical trajectory computation',
        'Touch-friendly parameter sliders for classroom manipulation',
        'Includes live velocity vectors and air resistance toggles'
      ],
      actionPrompt: 'Create an interactive projectile motion physics simulation with angle and velocity sliders'
    },
    {
      id: 'stem-chemistry-lab',
      category: 'stem',
      title: 'Chemistry pH & Titration Labs',
      subtitle: 'Acid-base indicators and neutralization curves',
      description: 'Virtual chemistry lab visualizing liquid color shifts based on pH values and molarity calculations.',
      icon: Atom,
      badge: 'Chemistry',
      details: [
        'Universal indicator scale visualization (acidic red to alkaline blue)',
        'Automatic ionic equilibrium calculation for [H+] and [OH-]',
        'Safe sandbox environment without physical chemical hazards'
      ],
      actionPrompt: 'Create an interactive acid-base pH indicator and color shift simulation'
    },
    {
      id: 'stem-thermo-gas',
      category: 'stem',
      title: 'Thermodynamics & Ideal Gas Piston',
      subtitle: 'Boyle-Gay Lussac ideal gas law exploration (PV=nRT)',
      description: 'Particle physics engine inside a pressurized piston cylinder demonstrating temperature, pressure, and volume relations.',
      icon: Atom,
      badge: 'Thermodynamics',
      details: [
        'Particle kinetic velocity scales dynamically with Kelvin temperature',
        'Live P-V diagram plot generated as piston position shifts',
        'Secure sandboxed iframe execution on the whiteboard'
      ],
      actionPrompt: 'Create an ideal gas PV=nRT simulation with movable piston and P-V curve'
    },

    // 4. VOICE & PRIVACY
    {
      id: 'voice-offline-engine',
      category: 'voice',
      title: 'Offline Faster-Whisper STT',
      subtitle: 'On-device local voice transcription without internet',
      description: 'Inclu integrates Faster-Whisper operating locally on-device. Audio streams are never dispatched to external cloud servers.',
      icon: WifiOff,
      badge: '100% Offline',
      details: [
        'Classroom privacy guaranteed: audio processed entirely on-device',
        'Functions seamlessly during school network outages',
        'High transcription accuracy for classroom vocabulary'
      ]
    },
    {
      id: 'voice-continuous-mode',
      category: 'voice',
      title: 'Continuous Manual Recording',
      subtitle: 'Speak naturally without arbitrary timeout cutoffs',
      description: 'Voice input in Inclu never cuts off speech at arbitrary thresholds. Teachers retain full control over start and stop timing.',
      icon: Mic,
      badge: 'No Timeout',
      details: [
        'Click the mic icon once to begin speaking detailed instructions',
        'Click again when finished to dispatch commands to the AI engine',
        'Cancelable at any instant via Escape or cancel actions'
      ]
    },

    // 5. CLASSROOM TOOLS
    {
      id: 'tool-calculator',
      category: 'tools',
      title: 'Floating Scientific Calculator',
      subtitle: 'Quick calculations without leaving the whiteboard',
      description: 'Clean floating calculator supporting arithmetic and trigonometric operations alongside classroom lectures.',
      icon: Calculator,
      badge: 'Class Tool',
      details: [
        'Freely draggable to any corner of the active whiteboard',
        'Supports trigonometry (sin, cos, tan), log, and square root',
        'Pinnable directly alongside the lesson mindmap'
      ]
    },
    {
      id: 'tool-timer',
      category: 'tools',
      title: 'Classroom Timer & Stopwatch',
      subtitle: 'Countdown management for quizzes and group discussions',
      description: 'Display a transparent countdown on the board to keep group activities and timed quizzes strictly on schedule.',
      icon: Timer,
      badge: 'Class Tool',
      details: [
        'Quick presets: 1 min, 3 mins, 5 mins, up to 15 mins',
        'Subtle visual notification when target duration concludes',
        'Minimizable into a discrete pill to preserve canvas focus'
      ]
    },
    {
      id: 'tool-spinner',
      category: 'tools',
      title: 'Random Student Selector',
      subtitle: 'Fair and transparent student question callout',
      description: 'Eliminate callout bias with an interactive random selection wheel that energizes classroom engagement.',
      icon: Dices,
      badge: 'Interactive',
      details: [
        'Import full student rosters with a single paste action',
        'Exclude picked students from subsequent rounds automatically',
        'Smooth physics spin animation creating healthy excitement'
      ]
    },
    {
      id: 'tool-scoreboard',
      category: 'tools',
      title: 'Group Competition Scoreboard',
      subtitle: 'Track team points during classroom trivia contests',
      description: 'Multi-team scoring board with rapid add/subtract point buttons for gamified classroom learning sessions.',
      icon: Trophy,
      badge: 'Gamification',
      details: [
        'Side-by-side tracking for up to 6 student study groups',
        'Custom team labels matched to lesson themes',
        'One-click reset to initiate fresh competitive rounds'
      ]
    },
    {
      id: 'tool-attendance',
      category: 'tools',
      title: 'Quick Attendance Tracker',
      subtitle: 'Mark presence, permits, sick leaves, and dispensations',
      description: 'Log classroom attendance efficiently at the start of the period without flipping through physical logs.',
      icon: ClipboardCheck,
      badge: 'Admin',
      details: [
        'Automatic percentage calculation of attending students',
        'Status preserved locally inside the active canvas session',
        'Exportable alongside classroom performance summaries'
      ]
    },
    {
      id: 'tool-graph-plotter',
      category: 'tools',
      title: 'Function Curve Plotter',
      subtitle: 'Visualize linear, quadratic, and trigonometric graphs',
      description: 'Render mathematical functions f(x) instantly on the board to illustrate axis intercepts and slope gradients.',
      icon: LineChart,
      badge: 'Mathematics',
      details: [
        'Automatic plotting for f(x) = ax² + bx + c and trig waves',
        'Precision Cartesian X-Y grid with adaptive scaling numbers',
        'Direct digital pen annotation over rendered curves'
      ]
    }
  ], []);

  // Filtering Logic
  const filteredItems = useMemo(() => {
    return guideItems.filter(item => {
      const matchCategory = activeCategory === 'all' || item.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchCategory;

      const matchQuery = 
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.shortcut && item.shortcut.toLowerCase().includes(q)) ||
        item.details.some(d => d.toLowerCase().includes(q));

      return matchCategory && matchQuery;
    });
  }, [guideItems, activeCategory, searchQuery]);

  const handleCopyPrompt = (prompt: string, id: string) => {
    navigator.clipboard?.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    if (onSamplePromptClick) {
      onSamplePromptClick(prompt);
      onClose();
    }
  };

  const categoryTabs: { id: GuideCategory; label: string; count: number }[] = [
    { id: 'all', label: 'All Guides', count: guideItems.length },
    { id: 'canvas', label: 'Canvas & Draw', count: guideItems.filter(i => i.category === 'canvas').length },
    { id: 'ai', label: 'AI & Mindmap', count: guideItems.filter(i => i.category === 'ai').length },
    { id: 'stem', label: 'STEM Labs', count: guideItems.filter(i => i.category === 'stem').length },
    { id: 'voice', label: 'Voice & Privacy', count: guideItems.filter(i => i.category === 'voice').length },
    { id: 'tools', label: 'Classroom Tools', count: guideItems.filter(i => i.category === 'tools').length },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#3F2A1D]/35 backdrop-blur-xs font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-5xl bg-[#FFF6EE] rounded-3xl shadow-2xl border border-[#E7DDD2] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header: Pure Minimalist Structure (No Emojis) */}
            <div className="px-6 py-5 bg-[#FFF6EE] border-b border-[#E7DDD2] flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#6B4423] flex items-center justify-center text-white shadow-xs">
                  <HelpCircle size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-[#3F2A1D] tracking-tight">
                      Inclu teacher guide
                    </h2>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#F6F0E8] text-[#6B4423] border border-[#E7DDD2]">
                      v2.0
                    </span>
                  </div>
                  <p className="text-xs text-[#A08B7A] font-medium">
                    Practical documentation for smartboard tools, AI capabilities, and interactive labs
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2.5">
                <div className="relative w-48 sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A08B7A] pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search guides, keys, tools..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F6F0E8] border border-[#E7DDD2] rounded-full text-[#3F2A1D] placeholder:text-[#A08B7A] focus:outline-hidden focus:bg-[#FFF6EE] focus:border-[#6B4423] transition-all font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A08B7A] hover:text-[#6B4423] cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-[#A08B7A] hover:text-[#3F2A1D] hover:bg-[#F6F0E8] rounded-full transition-colors cursor-pointer"
                  title="Close guide"
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              </div>
            </div>

            {/* Category Filter Tabs: Clean Line Pills */}
            <div className="px-6 py-2.5 bg-[#f3f2ef] border-b border-[#E7DDD2] flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 select-none">
              {categoryTabs.map((tab) => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[#6B4423] text-white shadow-xs' 
                        : 'bg-[#FFF6EE] text-[#6B4423] hover:text-[#3F2A1D] border border-[#E7DDD2] hover:bg-[#F6F0E8]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive ? 'bg-[#FFF6EE]/25 text-white' : 'bg-[#F6F0E8] text-[#A08B7A]'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Content Body: Minimal Structured vCards Grid */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
              {filteredItems.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#E7DDD2] flex items-center justify-center text-[#A08B7A] mx-auto">
                    <Search size={20} />
                  </div>
                  <h3 className="font-extrabold text-sm text-[#3F2A1D]">
                    No matching guides found
                  </h3>
                  <p className="text-xs text-[#A08B7A] max-w-sm mx-auto">
                    Try different search keywords like "pen", "mindmap", "timer", or select "All Guides".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="bg-[#FFF6EE] rounded-2xl border border-[#E7DDD2] hover:border-[#E7DDD2] p-5 shadow-xs transition-all flex flex-col justify-between space-y-4 text-left"
                      >
                        {/* Card Top: Icon Badge + Titles + Metadata Badge */}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#F4B183]/45 border border-[#E7DDD2] flex items-center justify-center text-[#3F2A1D] shrink-0">
                                <Icon size={20} strokeWidth={2} />
                              </div>
                              <div>
                                <h3 className="font-black text-sm text-[#3F2A1D] leading-tight">
                                  {item.title}
                                </h3>
                                <p className="text-[11px] text-[#A08B7A] font-medium leading-normal mt-0.5">
                                  {item.subtitle}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.shortcut && (
                                <span className="px-2 py-0.5 rounded-md bg-[#F6F0E8] border border-[#E7DDD2] text-[#6B4423] font-mono font-bold text-[10px]">
                                  {item.shortcut}
                                </span>
                              )}
                              {item.badge && (
                                <span className="px-2 py-0.5 rounded-full bg-[#F4B183]/30 border border-[#E7DDD2] text-[#6B4423] font-bold text-[10px]">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-[#6B4423] leading-relaxed font-normal">
                            {item.description}
                          </p>

                          {/* Detailed Micro-Specs / Instructional Steps */}
                          <div className="bg-[#F6F0E8] rounded-xl border border-[#E7DDD2] p-3 space-y-1.5 text-[11px] text-[#6B4423]">
                            {item.details.map((detail, dIdx) => (
                              <div key={dIdx} className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6B4423] shrink-0 mt-1.5" />
                                <span className="leading-relaxed">{detail}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Prompt Action Bar (if applicable) */}
                        {item.actionPrompt && (
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-[#A08B7A] truncate max-w-[240px]" title={item.actionPrompt}>
                              "{item.actionPrompt}"
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyPrompt(item.actionPrompt!, item.id)}
                              className="flex items-center gap-1 px-3 py-1 bg-[#6B4423] hover:bg-[#3F2A1D] text-white text-[11px] font-bold rounded-full transition-colors cursor-pointer shrink-0 shadow-2xs"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check size={12} strokeWidth={2.5} />
                                  <span>Applied</span>
                                </>
                              ) : (
                                <>
                                  <CornerDownLeft size={12} />
                                  <span>Try in AI</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Minimalist Footer */}
            <div className="px-6 py-4 bg-[#FFF6EE] border-t border-[#E7DDD2] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-[#A08B7A] font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>
                  Inclu whiteboard: ready to teach
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-[#6B4423] hover:bg-[#3F2A1D] text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-xs"
                >
                  Close & Start Teaching
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default QuickGuideModal;
