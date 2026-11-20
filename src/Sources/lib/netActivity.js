// Tracks requests to our API so one global loader can show "Saving…" / a progress bar
// without adding a spinner to every page. Background polling and error reports are ignored.
const API = process.env.REACT_APP_API_URL || '';

const IGNORE = [
  /\/api\/log\/error/,
  /\/api\/credits\/admin\/summary/, // admin badges, every minute
  /\/api\/credits\/me\b/,           // balance refresh, every minute
  /\/api\/human\//,
];

let pending = []; // [{ id, method, at }]
let seq = 0;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(pending));

export function subscribe(fn) {
  listeners.add(fn);
  fn(pending);
  return () => listeners.delete(fn);
}

let installed = false;
export function installNetActivity() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const toApi = (API && url.startsWith(API)) || url.startsWith('/api/');
    if (!toApi || init.keepalive || init.silent || IGNORE.some((r) => r.test(url))) return orig(input, init);

    const method = String(init.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();
    const id = ++seq;
    pending = [...pending, { id, method, at: Date.now() }];
    emit();
    const done = () => {
      pending = pending.filter((p) => p.id !== id);
      emit();
    };
    return orig(input, init).then(
      (res) => {
        // downloads (files / big data): keep the loader until the body is read
        const type = res.headers.get('content-type') || '';
        if (/json|text\/plain/.test(type) || !res.body || !res.clone) {
          done();
          return res;
        }
        res.clone().arrayBuffer().then(done, done);
        return res;
      },
      (err) => {
        done();
        throw err;
      }
    );
  };
}
