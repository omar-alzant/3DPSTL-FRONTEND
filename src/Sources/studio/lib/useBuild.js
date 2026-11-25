import { useEffect, useRef, useState } from 'react';
import { loadFonts } from './fonts.js';
import { stats } from './export.js';

// How long to wait after the last change before rebuilding the model.
// Building blocks the page for a moment, so while the customer is typing we wait until they pause.
const WAIT = {
  text: 700,    // typing a name: build when they stop typing
  image: 300,
  number: 250,  // sliders: feel live but don't build on every pixel
  default: 120, // colours, checkboxes, lists, fonts: almost instant
};

/** Builds the model whenever the settings change (after a pause — see WAIT) */
export function useBuild(tool, params, delay) {
  const [state, setState] = useState({ parts: null, stats: null, error: null, busy: true });
  const seq = useRef(0);
  const prev = useRef(null);

  useEffect(() => {
    const id = ++seq.current;

    // which kind of setting changed? (first build = default)
    let wait = WAIT.default;
    if (prev.current && prev.current.tool === tool) {
      for (const def of tool.params) {
        if (prev.current.params[def.key] !== params[def.key]) wait = Math.max(wait, WAIT[def.type] ?? WAIT.default);
      }
    }
    prev.current = { tool, params };
    if (delay != null) wait = delay;

    setState((s) => (s.busy ? s : { ...s, busy: true }));
    const timer = setTimeout(async () => {
      try {
        const fonts = await loadFonts(tool.fonts(params));
        if (id !== seq.current) return;
        const parts = await tool.build(params, fonts);
        if (id !== seq.current) return;
        if (!parts?.length) throw new Error('empty'); // nothing to show yet (e.g. no text typed)
        setState({ parts, stats: parts.length ? stats(parts) : null, error: null, busy: false });
      } catch (e) {
        console.error(e);
        if (id === seq.current) setState((s) => ({ ...s, error: e.message || String(e), busy: false }));
      }
    }, wait);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, JSON.stringify(params)]);
  return state;
}
