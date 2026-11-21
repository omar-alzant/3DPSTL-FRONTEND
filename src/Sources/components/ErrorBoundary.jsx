// Catches render errors so a crash shows a message + reload button instead of an empty page.
// A failed lazy chunk (old cached version after a new deploy) reloads the page once by itself.
import React from 'react';
import { reportError } from '../lib/reportError';
// page language, set by index.html before React starts
const pageAr = () => (typeof document !== 'undefined' ? document.documentElement.lang === 'ar' : false);
const L = (en, ar) => (pageAr() ? ar : en);


const RELOAD_KEY = 'chunk-reload-at';
const isChunkError = (e) =>
  /ChunkLoadError|Loading (CSS )?chunk|dynamically imported module|Importing a module script failed|Unexpected token '<'/i
    .test(`${e?.name} ${e?.message}`);

/** React.lazy that reloads the page once if the chunk is missing (new deploy) */
export function lazyWithReload(factory) {
  return React.lazy(() =>
    factory().catch((err) => {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (isChunkError(err) && Date.now() - last > 30_000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
        return new Promise(() => {}); // wait for the reload
      }
      throw err;
    })
  );
}

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI crash:', error, info?.componentStack);
    if (!isChunkError(error)) reportError(error, { prefix: 'Page crash', componentStack: info?.componentStack });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = isChunkError(error);
    return (
      <div dir={pageAr() ? 'rtl' : 'ltr'} style={{ maxWidth: 560, margin: '60px auto', padding: 24, textAlign: 'center', color: '#E0E7FF' }}>
        <h3 style={{ marginBottom: 12 }}>{chunk ? L('A new version of the site is available', 'في نسخة جديدة من الموقع') : L('Something went wrong showing this page', 'صار خطأ بعرض الصفحة')}</h3>
        <p style={{ color: '#A5B4FC' }}>
          {chunk ? L('Press refresh to load the new version.', 'اضغط تحديث لتحميل النسخة الجديدة.') : L('Try refreshing the page. If it happens again, take a screenshot of this message and send it to us.', 'جرّب تحديث الصفحة. إذا تكرّر الخطأ، صوّر هالرسالة وابعتلنا ياها.')}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ background: '#6a4dff', color: '#fff', border: 0, borderRadius: 8, padding: '10px 22px', margin: '8px 0 16px' }}
        >
          {L('Refresh the page', 'تحديث الصفحة')}
        </button>
        {!chunk && (
          <pre dir="ltr" style={{ whiteSpace: 'pre-wrap', textAlign: 'left', fontSize: 12, color: '#fca5a5', background: 'rgba(0,0,0,.25)', padding: 12, borderRadius: 8 }}>
            {String(error?.name || 'Error')}: {String(error?.message || error)}
            {'\n'}{String(error?.stack || '').split('\n').slice(0, 4).join('\n')}
            {'\n'}{navigator.userAgent}
          </pre>
        )}
      </div>
    );
  }
}
