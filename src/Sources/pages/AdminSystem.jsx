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
        {tx('Crashes from customers’ browsers and from the server. The same error is grouped (see “Times”) and emailed at most every 6 hours.', 'الأعطال من متصفحات الزبائن ومن السيرفر. نفس الخطأ بينجمع (شوف «المرات») وبيوصلك إيميل مرة كل 6 ساعات أقصى شي.')}{' '}
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
        {tx('Supabase Pro already keeps a backup of the database every day for 7 days (Supabase → Database → Backups) — restore from there first.', 'Supabase Pro أصلاً بتحفظ نسخة من قاعدة البيانات كل يوم لمدّة 7 أيام (Supabase ← Database ← Backups) — الاسترجاع بيكون من هونيك أول شي.')}{' '}
        {info?.daily
          ? tx('An extra copy is also made here every day after 3:00 (Beirut); the newest 14 are kept and you get an email if one fails.', 'وكمان في نسخة إضافية هون كل يوم بعد الساعة 3 (بيروت)؛ منحتفظ بآخر 14 وبتوصلك رسالة إذا فشلت.')
          : tx('Use “Backup now” for an extra copy before big changes.', 'استعمل «انسخ الآن» لتعمل نسخة إضافية قبل أي تغيير كبير.')}
      </p>
      <div className="alert alert-info py-2 small">
        {tx('Pictures and files (Supabase Storage) are not in any database backup. To copy them to your computer, run in the 3DPSTL-BACKEND folder:', 'الصور والملفات (Supabase Storage) مش موجودة بأي نسخة لقاعدة البيانات. لتنسخهم على كمبيوترك، شغّل بمجلد 3DPSTL-BACKEND:')}{' '}
        <code dir="ltr">npm run backup:storage</code>
        {' '}{tx('(only new files are downloaded each time).', '(كل مرّة بينزّل بس الملفات الجديدة).')}
      </div>
      {stale && info?.daily && <div className="alert alert-warning py-2">{tx('The last backup is older than a day — check the server logs.', 'آخر نسخة أقدم من يوم — راجع سجلات الخادم.')}</div>}
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

// Photo search on "Our works": how many item photos have their AI fingerprint
function PhotoSearch() {
  const { tx } = useLang();
  const [st, setSt] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/search/status`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
      setSt(data); setErr('');
    } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const reindex = async () => {
    try {
      await fetch(`${API}/api/search/reindex`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setTimeout(load, 3000);
    } catch (e) { setErr(e.message); }
  };
  const li = st?.lastIndex;
  return (
    <section className="mb-5">
      <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
        <h5 className="mb-0 me-auto">{tx('Photo search', 'البحث بالصور')}</h5>
        <Button size="sm" variant="outline-secondary" onClick={load}>{tx('Refresh', 'تحديث')}</Button>
        <Button size="sm" onClick={reindex} disabled={!st?.enabled || st?.indexing}>{tx('Index new photos now', 'فهرس الصور الجديدة هلق')}</Button>
      </div>
      <p className="small text-muted mb-2">
        {tx('Customers can upload a photo next to the search bar and see the works that look most like it. Each item’s first 3 photos are indexed automatically a minute after the server starts, every 6 hours, and 30 seconds after you save an item.', 'الزبون فيه يرفع صورة جنب خانة البحث ويشوف أقرب الشغل إلها. أول 3 صور من كل قطعة بيتفهرسوا لحالهم بعد دقيقة من تشغيل السيرفر، كل 6 ساعات، و30 ثانية بعد ما تحفظ قطعة.')}
      </p>
      {err && <p className="small text-danger mb-0">{err}</p>}
      {st && (
        <ul className="small mb-0">
          <li>{st.enabled ? tx('On', 'شغّال') : tx('Off (IMAGE_SEARCH=off on Railway)', 'متوقف (IMAGE_SEARCH=off على Railway)')}</li>
          <li>{tx('Indexed', 'مفهرس')}: <b>{st.items}</b> {tx('items', 'قطعة')} (<b>{st.photos}</b> {tx('photos', 'صورة')})</li>
          {st.indexing && <li><Spinner size="sm" /> {tx('Indexing now…', 'عم يفهرس هلق…')}</li>}
          {li && !li.error && <li>{tx('Last run', 'آخر مرة')}: {when(li.at)} — +{li.added} / −{li.removed}{li.failed ? ` / ${tx('failed', 'فشل')} ${li.failed}` : ''}</li>}
          {li?.error && <li className="text-danger">{tx('Last run failed', 'آخر مرة فشلت')}: {li.error}</li>}
        </ul>
      )}
    </section>
  );
}

export default function AdminSystem() {
  return (
    <div>
      <Errors />
      <Backups />
      <PhotoSearch />
    </div>
  );
}
