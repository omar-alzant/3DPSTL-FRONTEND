// Admin → Studio orders: the files attached to one order (download links work for 10 minutes, so they load on demand)
import React, { useRef, useState } from 'react';
import { listAdminOrderFiles, uploadAdminOrderFile } from '../studio/lib/api.js';
import { useLang } from '../i18n/LanguageContext';

const kb = (n) => (n == null ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function OrderFiles({ orderId, initial = null }) {
  const { tx } = useLang();
  const [files, setFiles] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const pickRef = useRef(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try { setFiles(await listAdminOrderFiles(orderId)); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const add = async (list) => {
    const chosen = [...list].filter((x) => x.size <= 60 * 1024 * 1024);
    if (!chosen.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const f of chosen) await uploadAdminOrderFile(orderId, f);
      setFiles(await listAdminOrderFiles(orderId));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="sd-order-files">
      {files === null ? (
        <button type="button" className="sd-link-btn" onClick={load} disabled={busy}>{busy ? tx('Loading…', 'عم يحمّل…') : tx('📎 Files', '📎 الملفات')}</button>
      ) : (
        <>
          {files.length === 0 && <small className="sd-muted">{tx('No files yet.', 'ما في ملفات.')}</small>}
          {files.map((f) => (
            <a key={f.url || f.name} href={f.url} target="_blank" rel="noreferrer" dir="auto">📎 {f.name} <small className="sd-muted">{kb(f.size)}</small></a>
          ))}
        </>
      )}
      <button type="button" className="sd-link-btn" onClick={() => pickRef.current?.click()} disabled={busy}>+ {tx('Attach a file', 'إرفاق ملف')}</button>
      <input ref={pickRef} type="file" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      {error && <small className="sd-error">{error}</small>}
    </div>
  );
}
