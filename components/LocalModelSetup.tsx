import React, { useEffect, useState } from 'react';
import {
  OllamaNotInstalledError,
  SETUP_DISMISS_KEY,
  probeLocalModel,
  pullLocalModel,
  type LocalDownloadPhase
} from '../utils/localModelDownload';

type SetupPhase = 'checking' | 'not_installed' | 'needs_download' | LocalDownloadPhase;

const NOT_INSTALLED = 'Ollama is not installed or is not running on this laptop. The download did not start.';

export const LocalModelSetup: React.FC = () => {
  const [phase, setPhase] = useState<SetupPhase>('checking');
  const [status, setStatus] = useState('Checking whether Ollama is running on this laptop…');
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (new URLSearchParams(window.location.search).get('room')) return true;
    return sessionStorage.getItem(SETUP_DISMISS_KEY) === '1';
  });

  const dismiss = () => {
    sessionStorage.setItem(SETUP_DISMISS_KEY, '1');
    setHidden(true);
  };

  const check = async () => {
    setError(null);
    setPercent(null);
    setPhase('checking');
    setStatus('Checking whether Ollama is running on this laptop…');
    try {
      const probe = await probeLocalModel();
      if (!probe.ollamaRunning) {
        setPhase('not_installed');
        setStatus(NOT_INSTALLED);
        return;
      }
      if (probe.modelReady) {
        setHidden(true);
        return;
      }
      setPhase('needs_download');
      setStatus('This class laptop needs the local model.');
    } catch (err) {
      setPhase('failed');
      setError(err instanceof Error ? err.message : 'Could not check whether Ollama is running on this laptop.');
    }
  };

  const startDownload = async () => {
    setError(null);
    setPercent(null);
    try {
      await pullLocalModel((update) => {
        setPhase(update.phase);
        setStatus(update.status);
        setPercent(update.percent);
        setError(update.error || null);
      });
    } catch (err) {
      if (err instanceof OllamaNotInstalledError) {
        setPhase('not_installed');
        setStatus(NOT_INSTALLED);
        setError(null);
        setPercent(null);
        return;
      }
      setPhase('failed');
      setStatus('The local model download failed.');
      setError(err instanceof Error ? err.message : 'The local model download failed.');
    }
  };

  useEffect(() => {
    if (hidden) return;
    void check();
  }, [hidden]);

  if (hidden) return null;

  const showProgress = phase === 'started' || phase === 'pulling' || phase === 'done';
  const percentLabel = percent == null ? 'Pulling…' : `${percent}%`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#3F2A1D]/45 p-6">
      <div
        role="dialog"
        aria-labelledby="chalk-local-setup-title"
        className="w-full max-w-md rounded-3xl border border-[#E7DDD2] bg-[#F6F0E8] p-7 text-[#3F2A1D] shadow-2xl"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E7DDD2] bg-[#F6F0E8] px-3 py-1">
          <span className="text-lg font-black tracking-tight">Inclu</span>
          <span className="rounded-full bg-[#F4B183] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">Setup</span>
        </div>
        <h2 id="chalk-local-setup-title" className="text-xl font-black tracking-tight">
          This class laptop needs the local model
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-[#3F2A1D]/80">
          Inclu keeps class work on this computer. The download uses the local Ollama already on this laptop.
        </p>

        <div className="mt-5 rounded-2xl border border-[#E7DDD2] bg-[#F6F0E8] p-4">
          <p className="text-sm font-bold leading-relaxed">{status}</p>
          {error && phase === 'failed' && (
            <p className="mt-2 text-sm font-semibold text-[#8C3A2F]">{error}</p>
          )}

          {showProgress && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs font-bold">
                <span>{phase === 'done' ? 'Done' : phase === 'started' ? 'Download started' : 'Pulling the local model'}</span>
                <span>{phase === 'done' ? '100%' : percentLabel}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#E7DDD2]">
                {percent == null && phase !== 'done' ? (
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-[#F4B183]" />
                ) : (
                  <div
                    className="h-full rounded-full bg-[#F4B183] transition-all"
                    style={{ width: `${phase === 'done' ? 100 : percent}%` }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {phase === 'needs_download' && (
            <button
              type="button"
              onClick={() => { void startDownload(); }}
              className="w-full cursor-pointer rounded-full bg-[#F4B183] px-4 py-3 text-sm font-black text-[#3F2A1D]"
            >
              Download the local model
            </button>
          )}
          {phase === 'failed' && (
            <button
              type="button"
              onClick={() => { void startDownload(); }}
              className="w-full cursor-pointer rounded-full bg-[#F4B183] px-4 py-3 text-sm font-black text-[#3F2A1D]"
            >
              Try the download again
            </button>
          )}
          {phase === 'not_installed' && (
            <button
              type="button"
              onClick={() => { void check(); }}
              className="w-full cursor-pointer rounded-full bg-[#F4B183] px-4 py-3 text-sm font-black text-[#3F2A1D]"
            >
              Check again
            </button>
          )}
          {phase !== 'checking' && phase !== 'started' && phase !== 'pulling' && (
            <button
              type="button"
              onClick={dismiss}
              className="w-full cursor-pointer rounded-full border border-[#3F2A1D]/20 px-4 py-3 text-sm font-bold text-[#3F2A1D]"
            >
              Continue to the board
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
