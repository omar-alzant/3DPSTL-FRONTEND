// A design waiting for the customer to log in: saved before going to /login,
// restored when they come back to the Studio (including an uploaded logo).
const KEY = 'studioPendingOrder';
export const AFTER_LOGIN = 'afterLogin';

export function savePending(toolId, params) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ toolId, params, at: Date.now() }));
    sessionStorage.setItem(AFTER_LOGIN, `/studio/${toolId}`);
  } catch {
    // storage full (very large logo): still go to login, the design link keeps the rest
    try { sessionStorage.setItem(AFTER_LOGIN, `/studio/${toolId}`); } catch {}
  }
}

// Returns the saved params for this tool, or null. Does not remove them:
// React may render the editor and throw that render away before showing it,
// so the caller clears them with clearPending() once the editor is on screen.
export function peekPending(toolId) {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p.toolId !== toolId || Date.now() - p.at > 24 * 3600e3) return null;
    return p.params;
  } catch {
    return null;
  }
}

export function clearPending() {
  try { sessionStorage.removeItem(KEY); } catch {}
}
