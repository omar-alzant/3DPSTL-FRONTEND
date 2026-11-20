// Admin → System: website errors (from customers' browsers and the server) + daily database backups.
import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Spinner, Table } from 'react-bootstrap';
import { refreshAdminSummary } from '../hooks/useAdminSummary';

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

const when = (d) => (d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const kb = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const device = (ua = '') =>
  /iPad/.test(ua) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : ua ? 'Other' : '';

function Errors() {
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
        <h5 className="m-0 me-auto">Website errors</h5>
        <Button size="sm" variant={showResolved ? 'outline-secondary' : 'secondary'} onClick={() => setShowResolved(false)}>Open</Button>
        <Button size="sm" variant={showResolved ? 'secondary' : 'outline-secondary'} onClick={() => setShowResolved(true)}>Resolved</Button>
        {!showResolved && rows?.length > 0 && (
          <Button size="sm" variant="outline-success" onClick={() => window.confirm('Mark all errors as resolved?') && resolve(null)}>
            Resolve all
          </Button>
        )}
      </div>
      <p className="small text-muted">
        Crashes from customers' browsers and from the server. The same error is grouped (see "Times") and emailed at most every 6 hours.
        Mark it resolved after you fix it — if it happens again it re-opens and you get an email.
      </p>
      {err && <div className="alert alert-danger py-2">{err}</div>}
      {!rows ? <Spinner size="sm" /> : rows.length === 0 ? (
        <div className="text-success">✓ No {showResolved ? 'resolved' : 'open'} errors.</div>
      ) : (
        <Table size="sm" responsive hover variant="dark" className="align-middle">
          <thead>
            <tr><th>Last seen</th><th>Where</th><th>Error</th><th>Times</th><th>Device</th><th /></tr>
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
                      <Button size="sm" variant="outline-success" onClick={(e) => { e.stopPropagation(); resolve(r.id); }}>Resolve</Button>
                    )}
                  </td>
                </tr>
                {open === r.id && (
                  <tr>
                    <td colSpan={6}>
                      <div className="small mb-1">Page: <span dir="ltr">{r.url || '—'}</span></div>
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
      setMsg(`✓ Saved ${r.name} (${kb(r.size)})`);
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
        <h5 className="m-0 me-auto">Database backups</h5>
        <Button size="sm" onClick={runNow} disabled={busy}>{busy ? <><Spinner size="sm" /> Backing up…</> : 'Backup now'}</Button>
      </div>
      <p className="small text-muted">
        A backup is made automatically every day after 3:00 (Beirut) and kept in Supabase Storage (bucket "backups").
        The newest 14 are kept. If a backup fails you get an email.
      </p>
      {info && !info.daily && <div className="alert alert-warning py-2">Daily backup is off (SUPABASE_DB_URL missing or BACKUP_DAILY=off on Railway).</div>}
      {stale && <div className="alert alert-warning py-2">The last backup is older than a day — check the server logs.</div>}
      {err && <div className="alert alert-danger py-2">{err}</div>}
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {!info ? <Spinner size="sm" /> : info.files.length === 0 ? (
        <div className="text-muted">No backups yet.</div>
      ) : (
        <Table size="sm" responsive variant="dark" className="align-middle">
          <thead><tr><th>File</th><th>Made</th><th>Size</th><th /></tr></thead>
          <tbody>
            {info.files.map((f) => (
              <tr key={f.name}>
                <td dir="ltr">{f.name}</td>
                <td className="small">{when(f.created_at)}</td>
                <td className="small">{kb(f.size)}</td>
                <td className="text-end"><Button size="sm" variant="outline-light" onClick={() => download(f.name)}>Download</Button></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="small text-muted mt-2">
        To restore: unzip the .gz file, then run it in Supabase → SQL Editor (or with psql). Ask before restoring — it overwrites data.
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
