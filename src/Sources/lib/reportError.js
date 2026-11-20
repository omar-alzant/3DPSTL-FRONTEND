// Sends website crashes to the backend (POST /api/log/error) so the shop gets an email.
// Same error is sent once per page load; at most 10 per page. Never throws.
const API = process.env.REACT_APP_API_URL || '';
const sent = new Set();
let count = 0;

const NOISE = /ResizeObserver loop|^Script error\.?$|chrome-extension:|moz-extension:|safari-extension:|AbortError|Load failed$|Failed to fetch$|NetworkError when attempting/i;

export function reportError(err, extra = {}) {
  try {
    if (process.env.NODE_ENV !== 'production') return;
    const message = String(err?.message || err || 'Unknown error').slice(0, 1000);
    if (!message || NOISE.test(message)) return;
    const key = message + (err?.stack || '').slice(0, 200);
    if (sent.has(key) || count >= 10) return;
    sent.add(key);
    count++;
    const token = localStorage.getItem('token');
    fetch(`${API}/api/log/error`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        message: extra.prefix ? `${extra.prefix}: ${message}` : message,
        stack: String(err?.stack || extra.componentStack || '').slice(0, 4000),
        url: window.location.href,
      }),
    }).catch(() => {});
  } catch {
    /* never break the page because of reporting */
  }
}

/** call once at startup */
export function installErrorReporting() {
  window.addEventListener('error', (e) => {
    // a <script>/<img> that failed to load has no e.error
    if (e?.error || e?.message) reportError(e.error || e.message);
  });
  window.addEventListener('unhandledrejection', (e) => reportError(e?.reason, { prefix: 'Unhandled promise' }));
}
