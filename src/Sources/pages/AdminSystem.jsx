// Admin → System: website errors (from customers' browsers and the server) + daily database backups.
import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Spinner, Table } from 'react-bootstrap';
import { refreshAdminSummary } from '../hooks/useAdminSummary';
import { useLang } from '../i18n/LanguageContext';

const API = process.env.REACT_APP_API_URL || '';

async function api(path, opts = {}) {
  const r = await fetch(`${API}/api/system${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts.headers || {}) },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
  return data;
}

const when = (d) => (d ? new Date(d).toLocaleString(document.documentElement.lang === 'ar' ? 'ar-LB' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const kb = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const device = (ua = '') =>
  /iPad/.test(ua) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : ua ? (document.documentElement.lang === 'ar' ? 'غير ذلك' : 'Other') : '';

function Errors() {
  const { tx } = useLang();
  const [showResolved, setShowResolved] = useState(false);
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setErr('');
    api(`/errors?resolved=${showResolved}`).then(setRows).catch((e) => setErr(e.message));
  }, [showResolved]);
  useEffect(load, [load]);

  const resolve = async (id) => {
    try {
      await api(id ? `/errors/${id}/resolve` : '/errors/resolve-all', { method: 'POST' });
      load();
      refreshAdminSummary();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <section className="mb-5">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h5 className="m-0 me-auto">{tx('Website errors', 'أخطاء الموقع')}</h5>
        <Button size="sm" variant={showResolved ? 'outline-secondary' : 'secondary'} onClick={() => setShowResolved(false)}>{tx('Open', 'مفتوحة')}</Button>
        <Button size="sm" variant={showResolved ? 'secondary' : 'outline-secondary'} onClick={() => setShowResolved(true)}>{tx('Resolved', 'محلولة')}</Button>
        {!showResolved && rows?.length > 0 && (
          <Button size="sm" variant="outline-success" onClick={() => window.confirm(tx('Mark all errors as resolved?', 'اعتبار كل الأخطاء محلولة؟')) && resolve(null)}>
            {tx('Resolve all', 'حلّ الكل')}
          </Button>
        )}
      </div>
      <p className="small text-muted">
        Crashes from customers' browsers and from the server. The same error is grouped (see "Times") and emailed at most every 6 hours.
        {tx('Mark it resolved after you fix it — if it happens again it re-opens and you get an email.', 'علّمه محلولاً بعد إصلاحه — إذا تكرر يُفتح من جديد وتصلك رسالة.')}
      </p>
      {err && <div className="alert alert-danger py-2">{err}</div>}
      {!rows ? <Spinner size="sm" /> : rows.length === 0 ? (
        <div className="text-success">✓ No {showResolved ? 'resolved' : 'open'} errors.</div>
      ) : (
        <Table size="sm" responsive hover className="align-middle">
          <thead>
            <tr><th>{tx('Last seen', 'آخر ظهور')}</th><th>{tx('Where', 'المكان')}</th><th>{tx('Error', 'الخطأ')}</th><th>{tx('Times', 'المرات')}</th><th>{tx('Device', 'الجهاز')}</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <React.Fragment key={r.id}>
                <tr onClick={() => setOpen(open === r.id ? null : r.id)} style={{ cursor: 'pointer' }}>
                  <td className="text-nowrap small">{when(r.last_at)}</td>
                  <td><Badge bg={r.source === 'client' ? 'info' : 'warning'} text="dark">{r.source === 'client' ? 'browser' : 'server'}</Badge></td>
                  <td className="small" style={{ maxWidth: 420, wordBreak: 'break-word' }}>{r.message}</td>
                  <td>{r.count}</td>
                  <td className="small">{device(r.user_agent)}</td>
                  <td className="text-end">
                    {!r.resolved && (
                      <Button size="sm" variant="outline-success" onClick={(e) => { e.stopPropagation(); resolve(r.id); }}>{tx('Resolve', 'حلّ')}</Button>
                    )}
                  </td>
                </tr>
                {open === r.id && (
                  <tr>
                    <td colSpan={6}>
                      <div className="small mb-1">{tx('Page:', 'الصفحة:')} <span dir="ltr">{r.url || '—'}</span></div>
                      <div className="small mb-1">First seen: {when(r.first_at)}</div>
                      <div className="small mb-1 text-muted" dir="ltr">{r.user_agent}</div>
                      {r.stack && <pre className="small p-2 rounded" style={{ background: 'rgba(0,0,0,.3)', whiteSpace: 'pre-wrap', maxHeight: 260, overflow: 'auto' }} dir="ltr">{r.stack}</pre>}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  );
}

function Backups() {
  const { tx } = useLang();
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api('/backups').then(setInfo).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  const runNow = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await api('/backups/run', { method: 'POST' });
      setMsg(`✓ ${tx('Saved', 'تم الحفظ')} ${r.name} (${kb(r.size)})`);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const download = async (name) => {
    try {
      const { url } = await api(`/backups/${encodeURIComponent(name)}`);
      window.location.href = url;
    } catch (e) {
      setErr(e.message);
    }
  };

  const latest = info?.files?.[0];
  const stale = latest && Date.now() - new Date(latest.created_at).getTime() > 36 * 3600e3;

  return (
    <section>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h5 className="m-0 me-auto">{tx('Database backups', 'النسخ الاحتياطية لقاعدة البيانات')}</h5>
        <Button size="sm" onClick={runNow} disabled={busy}>{busy ? <><Spinner size="sm" /> {tx('Backing up…', 'جارٍ النسخ…')}</> : tx('Backup now', 'انسخ الآن')}</Button>
      </div>
      <p className="small text-muted">
        A backup is made automatically every day after 3:00 (Beirut) and kept in Supabase Storage (bucket "backups").
        {tx('The newest 14 are kept. If a backup fails you get an email.', 'نحتفظ بآخر 14 نسخة. إذا فشلت نسخة تصلك رسالة.')}
      </p>
      {info && !info.daily && <div className="alert alert-warning py-2">{tx('Daily backup is off (SUPABASE_DB_URL missing or BACKUP_DAILY=off on Railway).', 'النسخ اليومي متوقف (SUPABASE_DB_URL غير موجود أو BACKUP_DAILY=off على Railway).')}</div>}
      {stale && <div className="alert alert-warning py-2">{tx('The last backup is older than a day — check the server logs.', 'آخر نسخة أقدم من يوم — راجع سجلات الخادم.')}</div>}
      {err && <div className="alert alert-danger py-2">{err}</div>}
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {!info ? <Spinner size="sm" /> : info.files.length === 0 ? (
        <div className="text-muted">{tx('No backups yet.', 'لا توجد نسخ بعد.')}</div>
      ) : (
        <Table size="sm" responsive className="align-middle">
          <thead><tr><th>{tx('File', 'الملف')}</th><th>{tx('Made', 'التاريخ')}</th><th>{tx('Size', 'المقاس')}</th><th /></tr></thead>
          <tbody>
            {info.files.map((f) => (
              <tr key={f.name}>
                <td dir="ltr">{f.name}</td>
                <td className="small">{when(f.created_at)}</td>
                <td className="small">{kb(f.size)}</td>
                <td className="text-end"><Button size="sm" variant="outline-light" onClick={() => download(f.name)}>{tx('Download', 'تحميل')}</Button></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="small text-muted mt-2">
        {tx('To restore: unzip the .gz file, then run it in Supabase → SQL Editor (or with psql). Ask before restoring — it overwrites data.', 'للاسترجاع: فكّ ضغط ملف ‎.gz ثم شغّله في Supabase ← SQL Editor (أو بـpsql). انتبه قبل الاسترجاع — يستبدل البيانات.')}
      </p>
    </section>
  );
}

export default function AdminSystem() {
  return (
    <div>
      <Errors />
      <Backups />
    </div>
  );
}
