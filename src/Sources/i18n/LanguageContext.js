// Arabic / English for the whole site.
//   const { lang, tx } = useLang();   tx('Our works', 'شغلنا')  → the text in the current language
// The first visit follows the phone/browser language; the customer's choice is remembered (localStorage 'lang').
// Arabic flips the page right-to-left (admin pages included).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const LangContext = createContext({ lang: 'en', dir: 'ltr', setLang: () => {}, tx: (en) => en });

function initialLang() {
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'ar' || saved === 'en') return saved;
  } catch {}
  const first = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
  return first.startsWith('ar') ? 'ar' : 'en';
}

function applyDirection(lang, rtl) {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = rtl ? 'rtl' : 'ltr';
  const link = document.getElementById('bs-css');
  if (link) {
    const want = `${process.env.PUBLIC_URL || ''}/vendor/bootstrap/bootstrap${rtl ? '.rtl' : ''}.min.css`;
    if (!link.getAttribute('href')?.endsWith(want.split('/').pop())) link.setAttribute('href', want);
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);
  const rtl = lang === 'ar';

  useEffect(() => applyDirection(lang, rtl), [lang, rtl]);

  // other tabs follow
  useEffect(() => {
    const onStorage = (e) => { if (e.key === 'lang' && (e.newValue === 'ar' || e.newValue === 'en')) setLangState(e.newValue); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem('lang', l); } catch {}
  }, []);

  const value = useMemo(() => {
    const ar = lang === 'ar';
    return {
      lang,
      dir: rtl ? 'rtl' : 'ltr',
      setLang,
      /** tx(english, arabic) */
      tx: (en, arText) => (ar && arText != null ? arText : en),
    };
  }, [lang, rtl, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** the ع / EN switch */
export function LangToggle({ className = '' }) {
  const { lang, setLang } = useLang();
  const next = lang === 'ar' ? 'en' : 'ar';
  return (
    <button
      type="button"
      className={`lang-toggle ${className}`}
      onClick={() => setLang(next)}
      aria-label={next === 'ar' ? 'التبديل إلى العربية' : 'Switch to English'}
      title={next === 'ar' ? 'العربية' : 'English'}
      lang={next}
    >
      {next === 'ar' ? 'ع' : 'EN'}
    </button>
  );
}
