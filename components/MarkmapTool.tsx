import React, { useEffect, useRef, useState } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import { Maximize2, Copy, Download, RefreshCw, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { toast } from '../utils/toast';
import { downloadFile, slugify } from '../utils/smartExport';

interface MarkmapToolProps {
  config: {
    markdown?: string;
    title?: string;
    content?: string;
  };
}

const DEFAULT_MARKDOWN = `# Solar System
## The Sun (Central Star)
- Primary Energy Source
- Gravitational Anchor
## Inner Planets (Terrestrial)
- Mercury
  - Closest Planet
  - Extreme Temperatures
- Venus
  - Thick CO2 Atmosphere
  - Hottest Planet
- Earth
  - Liquid Water & Life
  - Natural Satellite: Moon
- Mars
  - Red Planet
  - Olympus Mons
## Outer Planets (Gas & Ice Giants)
- Jupiter (Largest)
- Saturn (Ice Rings)
- Uranus (Tilted Rotation)
- Neptune (Farthest)`;

const transformer = new Transformer();

export const MarkmapTool: React.FC<MarkmapToolProps> = ({ config }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const markmapRef = useRef<Markmap | null>(null);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const rawMarkdown = config.markdown || config.content || DEFAULT_MARKDOWN;
  const title = config.title || 'Markmap Concept Map';

  useEffect(() => {
    if (!svgRef.current) return;

    try {
      const { root } = transformer.transform(rawMarkdown);

      if (!markmapRef.current) {
        // Initial creation
        const mm = Markmap.create(svgRef.current, {
          autoFit: true,
          duration: 350,
          color: (node: any) => {
            const colors = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777'];
            const depth = node.depth || 0;
            return colors[depth % colors.length];
          }
        }, root);
        markmapRef.current = mm;
      } else {
        // Update data
        markmapRef.current.setData(root);
        markmapRef.current.fit();
      }
    } catch (err) {
      console.error('Failed to render markmap:', err);
    }
  }, [rawMarkdown]);

  // Handle auto-fit on container resize
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      markmapRef.current?.fit();
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleFit = () => {
    markmapRef.current?.fit();
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(rawMarkdown);
    setCopied(true);
    toast.success('Markdown copied to the clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    downloadFile(svgData, `${slugify(title)}_markmap.svg`, 'image/svg+xml;charset=utf-8');
    toast.success('Markmap SVG downloaded.');
  };

  return (
    <div ref={containerRef} className="flex flex-col w-full h-full bg-[#f8fafc] text-slate-800 overflow-hidden font-sans select-none">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200/90 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#7DCEA0] animate-pulse" />
          <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider line-clamp-1">
            {title}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F4B183]/35 text-[#3F2A1D] font-bold hidden sm:inline">
            D3 Mindmap
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleFit}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
            title="Fit to screen"
          >
            <Maximize2 size={13} />
          </button>
          <button
            onClick={handleCopyMarkdown}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
            title="Copy markdown"
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          </button>
          <button
            onClick={handleExportSvg}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
            title="Download SVG"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* SVG Canvas Body */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-radial from-white via-slate-50/50 to-slate-100/30">
        <svg
          ref={svgRef}
          className="w-full h-full block cursor-grab active:cursor-grabbing"
          style={{ width: '100%', height: '100%' }}
        />
        <div className="absolute bottom-2 right-2 text-[9px] text-slate-400 font-medium pointer-events-none bg-white/70 px-2 py-0.5 rounded backdrop-blur">
          Click circle nodes to fold/unfold branches
        </div>
      </div>
    </div>
  );
};
