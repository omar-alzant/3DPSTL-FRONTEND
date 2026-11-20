// One loader for the whole site (mounted in App.js):
//  • thin violet bar at the top while anything loads from the server for more than 0.3 s
//  • "Saving… / Deleting… / Downloading…" card while a change is being sent (blocks double clicks)
import React, { useEffect, useState } from 'react';
import BrandSpinner from './BrandSpinner';
import { installNetActivity, subscribe } from '../lib/netActivity';
import '../Style/GlobalLoader.css';

installNetActivity();

const DELAY = 300; // fast requests show nothing

function label(list) {
  if (list.some((p) => p.method === 'DELETE')) return 'Deleting…';
  if (list.some((p) => p.method === 'POST' || p.method === 'PUT' || p.method === 'PATCH')) return 'Saving…';
  return 'Loading…';
}

export default function GlobalLoader() {
  const [pending, setPending] = useState([]);
  const [, tick] = useState(0);

  useEffect(() => subscribe(setPending), []);

  // re-render after DELAY so slow requests appear
  useEffect(() => {
    if (!pending.length) return undefined;
    const t = setTimeout(() => tick((n) => n + 1), DELAY + 20);
    return () => clearTimeout(t);
  }, [pending]);

  const now = Date.now();
  const slow = pending.filter((p) => now - p.at >= DELAY);
  const changes = slow.filter((p) => p.method !== 'GET' && p.method !== 'HEAD');

  return (
    <>
      <div className={`gl-bar ${slow.length ? 'on' : ''}`} aria-hidden="true"><span /></div>
      {changes.length > 0 && (
        <div className="gl-overlay" role="status" aria-live="polite">
          <div className="gl-card">
            <BrandSpinner size={54} />
            <div className="gl-text">{label(changes)}</div>
          </div>
        </div>
      )}
    </>
  );
}
