import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Download, Copy, RefreshCw, ZoomIn, ZoomOut, Check, AlertCircle, Edit3, Eye, Sparkles, Brain, GitBranch } from 'lucide-react';
import { toast } from '../utils/toast';
import { downloadFile, slugify } from '../utils/smartExport';
import { useStore } from '../store';
import {
  markdownToMermaidMindmap,
  sanitizeMermaidCode,
  buildSafeMindmapFromRawText
} from '../utils/mermaidSanitizer';

export { markdownToMermaidMindmap, sanitizeMermaidCode, buildSafeMindmapFromRawText };

interface MermaidToolProps {
  id?: string;
  config: {
    code?: string;
    markdown?: string;
    title?: string;
  };
}

export const DEFAULT_MINDMAP = `mindmap
  root((Circulatory System))
    Heart
      Left & Right Atria
      Left & Right Ventricles
      Heart Valves
    Blood Vessels
      Arteries
      Veins
      Capillaries
    Blood
      Red Blood Cells - Erythrocytes
      White Blood Cells - Leukocytes
      Platelets - Thrombocytes
      Blood Plasma`;

export const DEFAULT_FLOWCHART = `flowchart TD
  A(["Sun"]) -->|Photosynthesis| B["Green Plants / Producers"]
  B -->|Eaten by| C["Primary Consumers / Herbivores"]
  C -->|Eaten by| D["Secondary Consumers / Carnivores"]
  D -->|Dies| E["Decomposers"]
  E -->|Nutrients| B
  style A fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
  style B fill:#dcfce7,stroke:#10b981,stroke-width:2px
  style C fill:#e0e7ff,stroke:#6366f1,stroke-width:2px
  style D fill:#fee2e2,stroke:#ef4444,stroke-width:2px
  style E fill:#f3f4f6,stroke:#6b7280,stroke-width:2px`;

// Standalone Mermaid Loader
let mermaidPromise: Promise<any> | null = null;

function getMermaidInstance(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).mermaid) {
    return Promise.resolve((window as any).mermaid);
  }

  if (!mermaidPromise) {
    mermaidPromise = new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).mermaid) {
        resolve((window as any).mermaid);
        return;
      }

      const script = document.createElement('script');
      script.src = '/vendor/mermaid.min.js';
      script.async = true;
      script.onload = () => {
        if ((window as any).mermaid) {
          resolve((window as any).mermaid);
        } else {
          loadCdnFallback(resolve, reject);
        }
      };
      script.onerror = () => {
        loadCdnFallback(resolve, reject);
      };
      document.head.appendChild(script);
    });
  }

  return mermaidPromise;
}

function loadCdnFallback(resolve: (val: any) => void, reject: (err: any) => void) {
  const cdn = document.createElement('script');
  cdn.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
  cdn.async = true;
  cdn.onload = () => {
    if ((window as any).mermaid) resolve((window as any).mermaid);
    else reject(new Error('Mermaid CDN failed to initialize'));
  };
  cdn.onerror = (e) => reject(e);
  document.head.appendChild(cdn);
}

export const MermaidTool: React.FC<MermaidToolProps> = ({ id, config }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  
  // Resolve code: prioritize config.code, then convert config.markdown, then fallback to DEFAULT_MINDMAP
  const resolvedInitialCode = useMemo(() => {
    if (config.code && config.code.trim()) {
      return sanitizeMermaidCode(config.code, config.title || 'Concept Map');
    }
    if (config.markdown && config.markdown.trim()) {
      return markdownToMermaidMindmap(config.markdown, config.title || 'Concept Map');
    }
    return DEFAULT_MINDMAP;
  }, [config.code, config.markdown, config.title]);

  const [activeCode, setActiveCode] = useState(resolvedInitialCode);

  useEffect(() => {
    setActiveCode(resolvedInitialCode);
  }, [resolvedInitialCode]);

  const title = config.title || 'Mermaid Diagram';

  const isMindmap = useMemo(() => {
    return activeCode.trim().startsWith('mindmap');
  }, [activeCode]);

  const isFlowchart = useMemo(() => {
    const c = activeCode.trim();
    return c.startsWith('flowchart') || c.startsWith('graph');
  }, [activeCode]);

  // Render diagram on change with 2-stage self-healing fallback
  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      try {
        setError(null);
        const mm = await getMermaidInstance();
        if (!mm) throw new Error('Mermaid engine is not ready to load');

        const safeCode = sanitizeMermaidCode(activeCode, title);
        const renderAsMindmap = safeCode.trim().startsWith('mindmap');

        mm.initialize({
          startOnLoad: false,
          theme: renderAsMindmap ? 'base' : 'neutral',
          themeVariables: renderAsMindmap ? {
            primaryColor: '#F4B183',
            primaryTextColor: '#3F2A1D',
            primaryBorderColor: '#6B4423',
            lineColor: '#6B4423',
            secondaryColor: '#FFE08A',
            tertiaryColor: '#7DCEA0',
            fontFamily: 'Inter, system-ui, sans-serif'
          } : {
            fontFamily: 'Inter, system-ui, sans-serif'
          },
          securityLevel: 'antiscript',
          fontFamily: 'Inter, system-ui, sans-serif'
        });

        const uniqueId = `mermaid_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        try {
          const { svg } = await mm.render(uniqueId, safeCode);
          if (isMounted) {
            setSvgHtml(svg);
          }
        } catch (_firstErr) {
          // Stage 2 Self-Healing Fallback: rebuild a guaranteed-valid mindmap from raw text lines
          const healedCode = buildSafeMindmapFromRawText(activeCode, title);
          const healedId = `${uniqueId}_healed`;
          const { svg } = await mm.render(healedId, healedCode);
          if (isMounted) {
            setSvgHtml(svg);
            setActiveCode(healedCode);
          }
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setError(err?.message || 'The Mermaid syntax is not valid');
        }
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [activeCode, retryKey, isMindmap]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    toast.success('Mermaid code copied.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportSvg = () => {
    if (!svgHtml) return;
    downloadFile(svgHtml, `${slugify(title)}_mermaid.svg`, 'image/svg+xml;charset=utf-8');
    toast.success('Diagram SVG downloaded.');
  };

  const handleSaveCodeEdit = () => {
    setIsEditing(false);
    if (id) {
      useStore.getState().updateDomElement(id, {
        config: { ...config, code: activeCode }
      });
      toast.success('Mermaid diagram updated.');
    }
  };

  const handleSwitchToMindmapTemplate = () => {
    setActiveCode(DEFAULT_MINDMAP);
    setIsEditing(false);
  };

  const handleSwitchToFlowchartTemplate = () => {
    setActiveCode(DEFAULT_FLOWCHART);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#fafafa] text-slate-800 overflow-hidden font-sans select-none relative">
      {/* Code Editor Drawer */}
      {isEditing && (
        <div className="bg-slate-900 text-slate-100 p-3 border-b border-slate-800 text-xs flex flex-col gap-2 shrink-0 z-30">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1.5">
              <Sparkles size={12} className="text-[#FFE08A]" /> Mermaid Code Editor:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSwitchToMindmapTemplate}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-[#FFE08A] transition cursor-pointer"
              >
                Mindmap Template
              </button>
              <button
                onClick={handleSwitchToFlowchartTemplate}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-emerald-300 transition cursor-pointer"
              >
                Flowchart Template
              </button>
              <button
                onClick={handleSaveCodeEdit}
                className="px-2.5 py-1 rounded bg-[#6B4423] hover:bg-[#3F2A1D] text-[#FFF6EE] font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
              >
                <Check size={11} /> Apply
              </button>
            </div>
          </div>
          <textarea
            value={activeCode}
            onChange={(e) => setActiveCode(e.target.value)}
            rows={5}
            className="w-full bg-slate-950 font-mono text-[11px] p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-[#F4B183] text-slate-200 resize-y"
            placeholder="mindmap&#10;  root((Title))&#10;    Branch 1&#10;      Detail A"
          />
        </div>
      )}

      {/* Main Diagram Canvas Area */}
      <div ref={containerRef} className="flex-1 w-full h-full relative overflow-auto p-6 flex items-center justify-center bg-white/70">
        {error ? (
          <div className="max-w-md p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex flex-col gap-2.5">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold mb-0.5">Could not render this Mermaid diagram:</div>
                <div className="font-mono text-[11px] opacity-90 break-all">{error}</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 bg-[#FFF6EE] hover:bg-[#F4B183]/30 border border-[#E7DDD2] text-[#3F2A1D] rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Edit3 size={12} /> Open Editor
              </button>
              <button
                onClick={() => setRetryKey(k => k + 1)}
                className="px-3 py-1 bg-white hover:bg-rose-100 border border-rose-300 text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} /> Try again
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.15s ease' }}
            dangerouslySetInnerHTML={{ __html: svgHtml }}
            className="max-w-full flex items-center justify-center"
          />
        )}
      </div>

      {/* Floating Canvas Controls (Figma/Canva style) */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200/90 shadow-md select-none">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
            isEditing ? 'bg-[#F4B183]/40 text-[#3F2A1D]' : 'text-[#6B4423] hover:bg-[#F6F0E8]'
          }`}
          title="Edit Mermaid code"
        >
          {isEditing ? <Eye size={13} /> : <Edit3 size={13} />}
          <span className="text-[11px]">{isEditing ? 'View' : 'Edit'}</span>
        </button>
        <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />
        <button
          onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
          className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
          title="Zoom out"
        >
          <ZoomOut size={13} />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="px-1.5 py-0.5 text-[10px] font-bold font-mono text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
          title="Reset zoom (100%)"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => setZoom(z => Math.min(2.5, z + 0.15))}
          className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
          title="Zoom in"
        >
          <ZoomIn size={13} />
        </button>
        <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />
        <button
          onClick={handleCopyCode}
          className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
          title="Copy Mermaid code"
        >
          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
        </button>
        <button
          onClick={handleExportSvg}
          className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
          title="Download SVG"
        >
          <Download size={13} />
        </button>
      </div>
    </div>
  );
};
