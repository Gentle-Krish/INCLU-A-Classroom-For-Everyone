import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dict, type Dict, type Lang } from "./content";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: Dict };

const I18nContext = createContext<Ctx | null>(null);

function initialLang(): Lang {
  try {
    if (!localStorage.getItem("chalk_ui_english_default_v1")) {
      localStorage.setItem("chalk_ui_english_default_v1", "1");
      localStorage.setItem("chalk_language", "en");
      localStorage.setItem("Chalk-lang", "en");
      return "en";
    }
    const saved = localStorage.getItem("Chalk-lang") || localStorage.getItem("chalk_language");
    if (saved === "id") {
      localStorage.setItem("chalk_language", "en");
      localStorage.setItem("Chalk-lang", "en");
    }
  } catch {
    /* ignore */
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((_l: Lang) => {
    setLangState("en");
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t: dict[lang] }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
