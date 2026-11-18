import { useEffect, useRef, useState } from 'react';
import { loadFonts } from './fonts.js';
import { stats } from './export.js';

/** يبني المجسّم كلما تغيّرت الإعدادات (مع تأخير بسيط لتجنّب البناء عند كل ضغطة) */
export function useBuild(tool, params, delay = 120) {
  const [state, setState] = useState({ parts: null, stats: null, error: null, busy: true });
  const seq = useRef(0);
  useEffect(() => {
    const id = ++seq.current;
    setState((s) => ({ ...s, busy: true }));
    const timer = setTimeout(async () => {
      try {
        const fonts = await loadFonts(tool.fonts(params));
        if (id !== seq.current) return;
        const parts = await tool.build(params, fonts);
        if (id !== seq.current) return;
        setState({ parts, stats: parts.length ? stats(parts) : null, error: null, busy: false });
      } catch (e) {
        console.error(e);
        if (id === seq.current) setState((s) => ({ ...s, error: e.message || String(e), busy: false }));
      }
    }, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, JSON.stringify(params)]);
  return state;
}
