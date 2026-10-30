import React, { useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { toast } from '../utils/toast';
import { triggerPrintComponent, exportDocumentAsHtml, exportDocumentAsMarkdown, exportComponentAsPNG } from '../utils/smartExport';
import { Copy, Printer, Globe, FileText, Check, Image as ImageIcon } from 'lucide-react';

interface DocumentBlockProps {
  config?: {
    title?: string;
    markdown?: string;
    content?: string;
    handwriting?: boolean;
    fontSize?: number;
  };
}

export const DocumentBlock: React.FC<DocumentBlockProps> = ({ config }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const safeConfig = config || {};

  const processedMarkdown = useMemo(() => {
    const raw = safeConfig.markdown || safeConfig.content || '';
    if (!raw) return '';
    return raw.replace(/\\n/g, '\n');
  }, [safeConfig.markdown, safeConfig.content]);

  const title = safeConfig.title || 'Lesson Summary';

  const handleCopy = () => {
    navigator.clipboard.writeText(processedMarkdown);
    setCopied(true);
    toast.success('Content copied.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (containerRef.current) {
      triggerPrintComponent(containerRef.current);
    } else {
      window.print();
    }
  };

  const handleDownloadHtml = () => {
    exportDocumentAsHtml(title, processedMarkdown);
    toast.success('HTML page downloaded.');
  };

  const handleDownloadMarkdown = () => {
    exportDocumentAsMarkdown(title, processedMarkdown);
    toast.success('Markdown file (.md) downloaded.');
  };

  const handleDownloadPNG = async () => {
    if (containerRef.current) {
      toast.info('Creating a high-resolution PNG of the document...');
      const ok = await exportComponentAsPNG(containerRef.current, title, { pixelRatio: 2 });
      if (ok) toast.success('Document PNG downloaded.');
    }
  };

  const handwriting = Boolean(safeConfig.handwriting);
  const penSize = handwriting ? Math.max(28, Number(safeConfig.fontSize) || 40) : undefined;
  const proseStyle = handwriting
    ? {
        fontFamily: '"Segoe Print", "Comic Sans MS", cursive',
        fontSize: penSize,
        lineHeight: 1.45,
        maxWidth: 'none',
      }
    : undefined;

  return (
    <div
      ref={containerRef}
      className="flex w-full h-full flex-col bg-white text-slate-800 overflow-hidden font-sans select-text"
    >
      {/* Printable Document Header (Appears only on print) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#6B4423]">CHALK ACADEMIC DOCUMENT</div>
        <h1 className="text-2xl font-black text-slate-900 uppercase mt-1">{title}</h1>
        <div className="text-xs text-slate-500 mt-1">Date: {new Date().toLocaleDateString('en-US')}</div>
      </div>

      {/* Content Area */}
      <div data-scroll-body className={`flex-1 overflow-y-auto bg-white print:overflow-visible ${handwriting ? 'px-8 py-6' : 'px-6 md:px-10 py-6'} custom-scrollbar print:px-0 print:py-0`}>
        <div
          className={handwriting
            ? 'w-full max-w-none'
            : 'max-w-3xl mx-auto prose prose-slate prose-base leading-relaxed antialiased print:max-w-none'}
          style={proseStyle}
        >
          <ReactMarkdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
            components={{
              h1: ({node, ...props}) => <h1 className="text-3xl font-black tracking-tight text-[#3F2A1D] mb-6 border-b-2 border-[#E7DDD2] pb-3 font-sans print:border-b print:border-[#E7DDD2]" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-bold tracking-tight text-slate-800 mt-8 mb-3 font-sans flex items-center gap-2" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-bold text-slate-700 mt-6 mb-2 font-sans" {...props} />,
              p: ({node, ...props}) => (
                <p
                  className={handwriting ? 'mb-2 text-[#3F2A1D]' : 'mb-4 text-slate-600 leading-7 font-serif'}
                  style={handwriting ? { fontFamily: '"Segoe Print", "Comic Sans MS", cursive', fontSize: penSize, lineHeight: 1.45 } : undefined}
                  {...props}
                />
              ),
              li: ({node, ...props}) => <li className="mb-1.5 text-slate-600 last:mb-0 font-serif" {...props} />,
              table: ({node, ...props}) => (
                <div className="my-6 overflow-hidden rounded-xl border border-slate-200 shadow-sm print:shadow-none">
                  <table className="w-full text-sm text-left font-sans" {...props} />
                </div>
              ),
              thead: ({node, ...props}) => <thead className="bg-slate-50 text-slate-600 border-b border-slate-200" {...props} />,
              th: ({node, ...props}) => <th className="px-4 py-2.5 font-black uppercase tracking-wider text-[10px]" {...props} />,
              td: ({node, ...props}) => <td className="px-4 py-2.5 border-b border-slate-100 last:border-0" {...props} />,
              code: ({node, inline, className, children, ...props}: any) => {
                return inline ? (
                  <code className="bg-[#F6F0E8] text-[#6B4423] px-1.5 py-0.5 rounded font-mono text-xs font-bold" {...props}>{children}</code>
                ) : (
                  <div className="bg-slate-900 rounded-xl overflow-hidden my-6 shadow-md print:bg-slate-100 print:text-slate-800 print:shadow-none">
                     <div className="flex items-center px-4 py-1.5 bg-slate-800/50 border-b border-slate-700 justify-between print:hidden">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Source Code</span>
                     </div>
                     <pre className="p-4 overflow-x-auto text-xs text-[#FFE08A] font-mono leading-relaxed print:text-[#3F2A1D]"><code {...props}>{children}</code></pre>
                  </div>
                );
              }
            }}
          >
            {processedMarkdown || '*Waiting for content...*'}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
