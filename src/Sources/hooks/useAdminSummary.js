// Counts of items waiting for the admin: new shop orders, new Studio orders, pending credit requests.
// Polls every 60 s and when the tab becomes visible again. Does nothing for non-admins.
import { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || '';
const EMPTY = { orders: 0, studio: 0, credits: 0, errors: 0, total: 0 };

export default function useAdminSummary(enabled = true) {
  const [summary, setSummary] = useState(EMPTY);

  useEffect(() => {
    if (!enabled) { setSummary(EMPTY); return undefined; }
    let alive = true;
    const load = async () => {
      const token = localStorage.getItem('token');
      if (!token || document.hidden) return;
      try {
        const r = await fetch(`${API}/api/credits/admin/summary`, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) return;
        const d = await r.json();
        if (alive) setSummary({ ...EMPTY, ...d });
      } catch { /* offline — keep last value */ }
    };
    load();
    const t = setInterval(load, 60_000);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('admin-summary-refresh', load);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('admin-summary-refresh', load);
    };
  }, [enabled]);

  return summary;
}

/** call after the admin handles something, so the badges update right away */
export const refreshAdminSummary = () => window.dispatchEvent(new Event('admin-summary-refresh'));
