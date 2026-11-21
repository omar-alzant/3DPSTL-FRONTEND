// Light / dark mode for the whole site.
//   const { theme, toggle } = useTheme();   theme: 'dark' | 'light'
// The first visit follows the phone/computer setting; the choice is remembered (localStorage 'theme').
// The colours themselves live in Style/theme.css (html[data-theme='light'] block).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLang } from '../i18n/LanguageContext';

const ThemeContext = createContext({ theme: 'dark', setTheme: () => {}, toggle: () => {} });

function initialTheme() {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  const html = document.documentElement;
  // no colour animations while everything swaps at once
  html.classList.add('theme-switching');
  html.dataset.theme = theme;
  html.setAttribute('data-bs-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f6f5ff' : '#0d0d33');
  requestAnimationFrame(() => requestAnimationFrame(() => html.classList.remove('theme-switching')));
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initialTheme);

  useEffect(() => applyTheme(theme), [theme]);

  // follow the device while the visitor hasn't picked one; other tabs follow a pick
  useEffect(() => {
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
    const onChange = (e) => {
      let saved = null;
      try { saved = localStorage.getItem('theme'); } catch {}
      if (!saved) setThemeState(e.matches ? 'light' : 'dark');
    };
    const onStorage = (e) => { if (e.key === 'theme' && (e.newValue === 'light' || e.newValue === 'dark')) setThemeState(e.newValue); };
    mq?.addEventListener?.('change', onChange);
    window.addEventListener('storage', onStorage);
    return () => { mq?.removeEventListener?.('change', onChange); window.removeEventListener('storage', onStorage); };
  }, []);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    try { localStorage.setItem('theme', t); } catch {}
  }, []);
  const toggle = useCallback(() => setTheme(theme === 'light' ? 'dark' : 'light'), [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/** the ☀ / ☾ switch */
export function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme();
  const { tx } = useLang();
  const toLight = theme !== 'light';
  const label = toLight ? tx('Switch to light mode', 'الوضع الفاتح') : tx('Switch to dark mode', 'الوضع الداكن');
  return (
    <button type="button" className={`theme-toggle ${className}`} onClick={toggle} aria-label={label} title={label}>
      {toLight ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
        </svg>
      )}
    </button>
  );
}
