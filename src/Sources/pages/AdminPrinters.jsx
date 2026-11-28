// Admin → Printers: what every printer in the shop is doing, with pause / resume / stop.
// The data comes from the bridge program running in the shop (3DPSTL-BRIDGE); this page only reads it.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useLang } from '../i18n/LanguageContext';
import '../Style/Printers.css';

const API = process.env.REACT_APP_API_URL || '';
const auth = () => {
  try { const t = localStorage.getItem('token'); return t ? { Authorization: `Bearer ${t}` } : {}; } catch { return {}; }
};
const STATE = {
  printing: ['Printing', 'عم تطبع', 'run'],
  paused: ['Paused', 'موقّفة مؤقتاً', 'pause'],
  processing: ['Getting ready', 'عم تتحضّر', 'run'],
  completed: ['Done', 'خلصت', 'done'],
  stopped: ['Stopped', 'موقوفة', 'idle'],
  idle: ['Ready', 'فاضية', 'idle'],
  error: ['Error', 'في خطأ', 'err'],
  offline: ['Offline', 'مش متّصلة', 'off'],
};
const hm = (s) => {
  if (s == null || s < 0) return '';
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, '0')}` : `${m}′`;
};
const deg = (v) => (v == null ? '–' : `${Math.round(v)}°`);

function Snapshot({ id, at }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!at) return undefined;
    let alive = true;
    let made = null;
    fetch(`${API}/api/printers/${encodeURIComponent(id)}/snapshot`, { headers: auth() })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => { if (alive && b) { made = URL.createObjectURL(b); setUrl((old) => { if (old) URL.revokeObjectURL(old); return made; }); } })
      .catch(() => {});
    return () => { alive = false; };
  }, [id, at]);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  if (!url) return <div className="pr-cam pr-cam-empty" />;
  return <img className="pr-cam" src={url} alt="" />;
}

export default function AdminPrinters() {
  const { tx } = useLang();
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState({}); // printer id → command being sent
  const [confirmStop, setConfirmStop] = useState(null);
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/printers`, { headers: auth() });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Failed to load the printers');
      setList(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(() => { if (!document.hidden) load(); }, 4000);
    return () => clearInterval(timer.current);
  }, [load]);

  const send = async (p, command) => {
    setBusy((b) => ({ ...b, [p.id]: command }));
    try {
      const r = await fetch(`${API}/api/printers/${encodeURIComponent(p.id)}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify({ command }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Failed');
      setTimeout(load, 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setTimeout(() => setBusy((b) => ({ ...b, [p.id]: null })), 3000);
    }
  };

  const bridgeDown = list && list.length > 0 && list.every((p) => p.stale);

  return (
    <div className="pr-page">
      <div className="pr-head">
        <h2>{tx('Printers', 'المكنات')}</h2>
        {list && <small>{tx('Updates every few seconds', 'بتتحدّث كل كم ثانية')}</small>}
      </div>
      {error && <p className="pr-error">{error}</p>}
      {bridgeDown && (
        <p className="pr-note">{tx('No news from the shop: is the bridge running on the shop computer?', 'ما في أخبار من المحل: الجسر شغّال على كمبيوتر المحل؟')}</p>
      )}
      {list && list.length === 0 && (
        <div className="pr-note">
          <b>{tx('No printers yet.', 'ما في مكنات بعد.')}</b>{' '}
          {tx('Run the bridge program (folder 3DPSTL-BRIDGE) on a computer in the shop: its README says how.',
            'شغّل برنامج الجسر (مجلّد 3DPSTL-BRIDGE) على كمبيوتر بالمحل: الطريقة مكتوبة بملف README تبعه.')}
        </div>
      )}
      {!list && !error && <p className="pr-note">{tx('Loading…', 'عم يحمّل…')}</p>}

      <div className="pr-grid">
        {(list || []).map((p) => {
          const s = p.stale ? { state: 'offline' } : (p.status || {});
          const [en, ar, tone] = STATE[s.state] || STATE.idle;
          const active = ['printing', 'paused', 'processing'].includes(s.state);
          const b = busy[p.id];
          const last = p.lastCommand;
          return (
            <article key={p.id} className={`pr-card pr-${tone}`}>
              <Snapshot id={p.id} at={p.stale ? null : p.snapshotAt} />
              <div className="pr-body">
                <div className="pr-title">
                  <h3>{p.name}</h3>
                  <span className="pr-state">{tx(en, ar)}</span>
                </div>
                {s.file && <p className="pr-file" dir="auto" title={s.file}>{s.file}</p>}
                {active && s.progress != null && (
                  <div className="pr-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.progress)}>
                    <span style={{ width: `${Math.max(0, Math.min(100, s.progress))}%` }} />
                  </div>
                )}
                <div className="pr-facts">
                  {active && s.progress != null && <span><b>{Math.round(s.progress)}%</b></span>}
                  {active && s.leftSec > 0 && <span>{tx('Left', 'باقي')} <b dir="ltr">{hm(s.leftSec)}</b></span>}
                  {!p.stale && <span>{tx('Nozzle', 'الفوهة')} <b dir="ltr">{deg(s.nozzle)}{s.nozzleTarget ? ` / ${deg(s.nozzleTarget)}` : ''}</b></span>}
                  {!p.stale && <span>{tx('Bed', 'السرير')} <b dir="ltr">{deg(s.bed)}{s.bedTarget ? ` / ${deg(s.bedTarget)}` : ''}</b></span>}
                  {p.stale && <span>{tx('Last seen', 'آخر مرّة')} <b>{hm(p.seenSecondsAgo)}</b> {tx('ago', 'من')}</span>}
                </div>
                {s.error && <p className="pr-error">{s.error}</p>}
                {active && !p.stale && (
                  <div className="pr-actions">
                    {s.state === 'paused' ? (
                      <button type="button" className="btn btn-success btn-sm" disabled={!!b} onClick={() => send(p, 'resume')}>{b === 'resume' ? '…' : tx('Resume', 'كمّل')}</button>
                    ) : (
                      <button type="button" className="btn btn-warning btn-sm" disabled={!!b} onClick={() => send(p, 'pause')}>{b === 'pause' ? '…' : tx('Pause', 'إيقاف مؤقّت')}</button>
                    )}
                    <button type="button" className="btn btn-outline-danger btn-sm" disabled={!!b} onClick={() => setConfirmStop(p)}>{tx('Stop', 'وقّف')}</button>
                  </div>
                )}
                {last && !last.done_at && <small className="pr-muted">{tx('Sending…', 'عم يبعت…')} ({last.command})</small>}
                {last && last.done_at && last.ok === false && Date.now() - new Date(last.done_at).getTime() < 60000 && (
                  <small className="pr-error">{tx('The last command didn’t go through', 'آخر أمر ما وصل')}: {last.message}</small>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {confirmStop && (
        <Modal show onHide={() => setConfirmStop(null)} centered>
          <Modal.Header closeButton><Modal.Title className="text-danger">{tx('Stop the print?', 'توقيف الطباعة؟')}</Modal.Title></Modal.Header>
          <Modal.Body>
            {tx('The print on', 'الطباعة على')} <b>{confirmStop.name}</b> {tx('is cancelled for good. You can’t resume it.', 'بتتلغى نهائياً، وما فيك تكمّلها بعدين.')}
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setConfirmStop(null)}>{tx('Cancel', 'إلغاء')}</button>
            <button type="button" className="btn btn-danger" onClick={() => { const p = confirmStop; setConfirmStop(null); send(p, 'stop'); }}>{tx('Yes, stop it', 'إيه، وقّفها')}</button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
