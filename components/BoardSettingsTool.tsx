import React, { useState } from 'react';
import { useStore } from '../store';
import { Moon, Sun, Monitor, Unlock } from 'lucide-react';
import { useTranslation } from '../utils/translations';

export const BoardSettingsTool: React.FC = () => {
  const { t } = useTranslation();
  const {
    theme,
    toggleTheme,
    aiPreference,
    setAiPreference,
    geminiApiKey,
    setGeminiApiKey,
    ollamaBaseUrl,
    setOllamaBaseUrl,
    createNewSession
  } = useStore();

  const [allowStudentDrawing, setAllowStudentDrawing] = useState<boolean>(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('chalk_allow_student_drawing') === 'true'
  );
  const [unlockStudentCamera, setUnlockStudentCamera] = useState<boolean>(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('chalk_unlock_student_camera') === 'true'
  );

  const handleGeminiKeyChange = (val: string) => {
    setGeminiApiKey(val);
  };

  const handleOllamaUrlChange = (val: string) => {
    setOllamaBaseUrl(val);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans p-4 space-y-4 overflow-auto custom-scrollbar">
      
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('boardAppearance', 'Board appearance')}</h4>
        <div className="flex bg-slate-50 p-1 rounded-xl">
          <button 
            onClick={() => theme === 'dark' && toggleTheme()}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${theme === 'light' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Sun size={16} /> {t('light', 'Light')}
          </button>
          <button 
            onClick={() => theme === 'light' && toggleTheme()}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${theme === 'dark' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Moon size={16} /> {t('dark', 'Dark')}
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('aiProvider', 'AI Provider')}</h4>
          <select 
            value={aiPreference}
            onChange={(e) => setAiPreference(e.target.value as any)}
            className="w-full bg-slate-50 border-none rounded-xl py-2.5 px-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            <option value="auto">{t('aiModeAuto', 'Automatic (Recommended)')}</option>
            <option value="gemini">Google Gemini API</option>
            <option value="vertex">Google Vertex AI</option>
            <option value="ollama">Ollama (on this laptop)</option>
          </select>
          <p className="mt-2 text-[10px] text-slate-400 font-medium leading-relaxed">
            {t('aiProviderDesc', 'Choose Vertex AI for enterprise speed or Ollama for private offline use.')}
          </p>
        </div>

        {/* Gemini API Key Input */}
        {(aiPreference === 'gemini' || aiPreference === 'auto') && (
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('geminiApiKeyOverride', 'Google AI Studio API key')}</label>
            <input 
              type="password"
              value={geminiApiKey}
              onChange={(e) => handleGeminiKeyChange(e.target.value)}
              placeholder={t('geminiApiKeyPlaceholder', 'Paste your Google AI Studio key')}
              className="w-full bg-slate-50 border-none rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <p className="text-[9px] text-slate-400">
              {t('geminiApiKeyLocalDesc', 'API key is stored on this laptop.')}
            </p>
          </div>
        )}

        {/* Ollama Base URL Input */}
        {(aiPreference === 'ollama' || aiPreference === 'auto') && (
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('localOllamaUrlLabel', 'Local Ollama URL')}</label>
            <input 
              type="text"
              value={ollamaBaseUrl}
              onChange={(e) => handleOllamaUrlChange(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full bg-slate-50 border-none rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <p className="text-[9px] text-slate-400">
              {t('localOllamaUrlDesc', 'Default URL: http://localhost:11434. The local model runs on this computer.')}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('studentPermissions', 'Student Permissions (Viewer)')}</h4>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Monitor size={16} />
              </div>
              <span className="text-sm font-bold text-slate-700">{t('allowDrawing', 'Allow Student Drawing')}</span>
            </div>
            <input
              type="checkbox"
              checked={allowStudentDrawing}
              onChange={(e) => {
                setAllowStudentDrawing(e.target.checked);
                localStorage.setItem('chalk_allow_student_drawing', String(e.target.checked));
              }}
              className="w-5 h-5 rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
          </label>
          
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Unlock size={16} />
              </div>
              <span className="text-sm font-bold text-slate-700">{t('unlockCamera', 'Unlock Student Camera')}</span>
            </div>
            <input
              type="checkbox"
              checked={unlockStudentCamera}
              onChange={(e) => {
                setUnlockStudentCamera(e.target.checked);
                localStorage.setItem('chalk_unlock_student_camera', String(e.target.checked));
              }}
              className="w-5 h-5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
            />
          </label>
        </div>
      </div>

      <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 border-dashed">
         <h4 className="text-[11px] font-black text-rose-500 uppercase tracking-widest mb-2">{t('dangerZone', 'Danger Zone')}</h4>
         <button 
           onClick={() => {
             if (window.confirm(t('dangerZoneConfirmClear', 'Clear the entire board? This cannot be undone.'))) {
               createNewSession();
               window.dispatchEvent(new CustomEvent('clearCanvas'));
             }
           }}
           className="w-full py-2 bg-white text-rose-600 font-bold text-sm rounded-xl border border-rose-200 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
         >
           {t('clearEntireBoard', 'Clear entire board')}
         </button>
      </div>

    </div>
  );
};
