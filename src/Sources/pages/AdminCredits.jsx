import React, { useEffect, useState } from 'react';
import { refreshAdminSummary } from '../hooks/useAdminSummary';
import {
  adminRequests, approveRequest, rejectRequest, adminPackages, createPackage, updatePackage, deletePackage,
  adminUsers, adminUserLedger, adjustCredits, KIND_LABEL, METHOD_LABEL, STATUS_LABEL,
} from '../studio/lib/credits.js';
import { getSettings, saveSettings } from '../studio/lib/api.js';
import '../Style/Studio.css';
import { useLang } from '../i18n/LanguageContext';

// Admin → Credits: top-up requests (Whish / Neo), packages, user balances, payment details

const fmt = (d) => (d ? new Date(d).toLocaleString(document.documentElement.lang === 'ar' ? 'ar-LB' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '');
const KIND_EN = { topup: 'Top-up', download: 'File download', admin: 'Admin adjustment', refund: 'Refund' };
const STATUS_EN = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

function Requests() {
  const { tx } = useLang();
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => {
    setErr(null);
    adminRequests(status).then(setRows).catch((e) => setErr(e.message));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [status]);

  const act = async (r, approve) => {
    const note = window.prompt(approve ? tx(`Approve ${r.credits} credits for ${r.email}? Optional note:`, `الموافقة على ${r.credits} كريدت لـ ${r.email}؟ ملاحظة (اختياري):`) : tx('Reason for rejecting (shown to the customer):', 'سبب الرفض (يظهر للزبون):'), '');
    if (note === null) return;
    setBusy(r.id);
    try {
      await (approve ? approveRequest(r.id, note) : rejectRequest(r.id, note));
      load();
      refreshAdminSummary();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="sd-box">
      <div className="sd-admin-head">
        <h6 className="m-0">{tx('Top-up requests', 'طلبات الشحن')}</h6>
        <div className="sd-seg">
          {['pending', 'approved', 'rejected', 'all'].map((s) => (
            <button key={s} type="button" className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{tx(STATUS_EN[s] || s, STATUS_LABEL[s] || s)}</button>
          ))}
        </div>
      </div>
      {err && <p className="sd-error">{err}</p>}
      <small className="sd-muted d-block mb-2">{tx('Check the transaction number in your Whish / Neo app before approving. Credits are added instantly.', 'تأكد من رقم العملية في تطبيق Whish / Neo قبل الموافقة. يُضاف الكريدت فوراً.')}</small>
      <div className="sd-table-wrap">
        <table className="sd-table">
          <thead>
            <tr><th>{tx('Date', 'التاريخ')}</th><th>{tx('Customer', 'الزبون')}</th><th>{tx('Credits', 'الكريدت')}</th><th>{tx('Amount', 'المبلغ')}</th><th>{tx('Method', 'الطريقة')}</th><th>{tx('Transaction #', 'رقم العملية')}</th><th>{tx('Sender', 'المرسل')}</th><th>{tx('Status', 'الحالة')}</th><th /></tr>
          </thead>
          <tbody>
            {rows?.map((r) => (
              <tr key={r.id}>
                <td>{fmt(r.created_at)}<div className="sd-muted small" dir="ltr">{r.id}</div></td>
                <td>{r.email || r.user_id}<div className="sd-muted small">{r.full_name}</div></td>
                <td><b>{r.credits.toLocaleString()}</b></td>
                <td>{Number(r.price).toFixed(2)} {r.currency}</td>
                <td>{METHOD_LABEL[r.method]}</td>
                <td dir="ltr"><code>{r.reference}</code></td>
                <td>{r.sender}</td>
                <td>{tx(STATUS_EN[r.status] || r.status, STATUS_LABEL[r.status] || r.status)}{r.admin_note && <div className="sd-muted small">{r.admin_note}</div>}</td>
                <td className="text-nowrap">
                  {r.status === 'pending' && (
                    <>
                      <button className="sd-btn sd-primary" disabled={busy === r.id} onClick={() => act(r, true)}>{tx('Approve', 'موافقة')}</button>{' '}
                      <button className="sd-btn" disabled={busy === r.id} onClick={() => act(r, false)}>{tx('Reject', 'رفض')}</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {rows && !rows.length && <tr><td colSpan={9} className="sd-muted">{tx('Nothing here.', 'لا شيء هنا.')}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const EMPTY = { name: '', credits: '', price: '', currency: 'USD', active: true, sort: 0 };

function Packages() {
  const { tx } = useLang();
  const [rows, setRows] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [err, setErr] = useState(null);
  const load = () => adminPackages().then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const edit = (id, k, v) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v, _dirty: true } : r)));
  const run = async (fn) => {
    setErr(null);
    try { await fn(); await load(); } catch (e) { setErr(e.message); }
  };

  const row = (r, onField) => (
    <>
      <td><input type="text" value={r.name || ''} placeholder={tx('Starter', 'باقة البداية')} onChange={(e) => onField('name', e.target.value)} /></td>
      <td><input type="number" min="1" value={r.credits} onChange={(e) => onField('credits', e.target.value)} /></td>
      <td><input type="number" min="0" step="0.01" value={r.price} onChange={(e) => onField('price', e.target.value)} /></td>
      <td><input type="text" value={r.currency} maxLength={8} onChange={(e) => onField('currency', e.target.value.toUpperCase())} style={{ width: 70 }} /></td>
      <td><input type="number" value={r.sort} onChange={(e) => onField('sort', e.target.value)} style={{ width: 60 }} /></td>
      <td>
        <label className="sd-switch"><input type="checkbox" checked={r.active} onChange={(e) => onField('active', e.target.checked)} /><span /></label>
      </td>
    </>
  );

  return (
    <section className="sd-box mt-3">
      <h6>{tx('Packages', 'الباقات')}</h6>
      <small className="sd-muted d-block mb-2">{tx('What customers can buy. Example: 1000 credits = 5 USD. Hidden packages stay on old requests.', 'ما يمكن للزبائن شراؤه. مثال: 1000 كريدت = 5 USD. الباقات المخفية تبقى على الطلبات القديمة.')}</small>
      {err && <p className="sd-error">{err}</p>}
      <div className="sd-table-wrap">
        <table className="sd-table">
          <thead><tr><th>{tx('Name', 'الاسم')}</th><th>{tx('Credits', 'الكريدت')}</th><th>{tx('Price', 'السعر')}</th><th>{tx('Currency', 'العملة')}</th><th>{tx('Order', 'الترتيب')}</th><th>{tx('Shown', 'ظاهر')}</th><th /></tr></thead>
          <tbody>
            {rows?.map((r) => (
              <tr key={r.id} className={r.active ? '' : 'sd-off'}>
                {row(r, (k, v) => edit(r.id, k, v))}
                <td className="text-nowrap">
                  <button className="sd-btn sd-primary" disabled={!r._dirty} onClick={() => run(() => updatePackage(r.id, r))}>{tx('Save', 'حفظ')}</button>{' '}
                  <button className="sd-btn" onClick={() => window.confirm(tx('Delete this package?', 'حذف هذه الباقة؟')) && run(() => deletePackage(r.id))}>{tx('Delete', 'حذف')}</button>
                </td>
              </tr>
            ))}
            <tr>
              {row(draft, (k, v) => setDraft({ ...draft, [k]: v }))}
              <td><button className="sd-btn sd-primary" disabled={!draft.credits || draft.price === ''} onClick={() => run(async () => { await createPackage(draft); setDraft(EMPTY); })}>{tx('Add', 'إضافة')}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Users() {
  const { tx } = useLang();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [open, setOpen] = useState(null); // { id, ledger }
  const [adj, setAdj] = useState({});

  const search = (e) => {
    e?.preventDefault();
    setErr(null);
    adminUsers(q).then(setRows).catch((x) => setErr(x.message));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { search(); }, []);

  const adjust = async (u) => {
    const a = adj[u.id] || {};
    const delta = parseInt(a.delta, 10);
    if (!delta) return;
    if (!window.confirm(delta > 0 ? tx(`Add ${delta} credits to ${u.email}?`, `إضافة ${delta} كريدت إلى ${u.email}؟`) : tx(`Remove ${-delta} credits from ${u.email}?`, `خصم ${-delta} كريدت من ${u.email}؟`))) return;
    try {
      await adjustCredits(u.id, delta, a.note || '');
      setAdj({ ...adj, [u.id]: {} });
      search();
      if (open?.id === u.id) setOpen({ id: u.id, ledger: await adminUserLedger(u.id) });
    } catch (x) {
      setErr(x.message);
    }
  };

  return (
    <section className="sd-box mt-3">
      <div className="sd-admin-head">
        <h6 className="m-0">{tx('Customers & balances', 'الزبائن والأرصدة')}</h6>
        <form onSubmit={search} className="d-flex gap-2">
          <input type="text" placeholder={tx('Search email or name', 'ابحث بالإيميل أو الاسم')} value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="sd-btn">{tx('Search', 'بحث')}</button>
        </form>
      </div>
      <small className="sd-muted d-block mb-2">{tx('Manual adjust: for cash payments, gifts or refunds. Use a negative number to remove credits.', 'تعديل يدوي: للدفع نقداً أو الهدايا أو الاسترجاع. استعمل رقماً سالباً لخصم كريدت.')}</small>
      {err && <p className="sd-error">{err}</p>}
      <div className="sd-table-wrap">
        <table className="sd-table">
          <thead><tr><th>{tx('Customer', 'الزبون')}</th><th>{tx('Balance', 'الرصيد')}</th><th>{tx('Adjust (+/−)', 'تعديل (+/−)')}</th><th>{tx('Note', 'ملاحظة')}</th><th /></tr></thead>
          <tbody>
            {rows?.map((u) => (
              <React.Fragment key={u.id}>
                <tr>
                  <td>{u.email}{u.is_admin && <span className="sd-chip ms-1">admin</span>}<div className="sd-muted small">{u.full_name}</div></td>
                  <td><b>{u.balance.toLocaleString()}</b></td>
                  <td><input type="number" style={{ width: 110 }} value={adj[u.id]?.delta || ''} onChange={(e) => setAdj({ ...adj, [u.id]: { ...adj[u.id], delta: e.target.value } })} /></td>
                  <td><input type="text" value={adj[u.id]?.note || ''} placeholder={tx('cash / gift…', 'نقداً / هدية…')} onChange={(e) => setAdj({ ...adj, [u.id]: { ...adj[u.id], note: e.target.value } })} /></td>
                  <td className="text-nowrap">
                    <button className="sd-btn sd-primary" disabled={!parseInt(adj[u.id]?.delta, 10)} onClick={() => adjust(u)}>{tx('Apply', 'تطبيق')}</button>{' '}
                    <button className="sd-btn" onClick={async () => setOpen(open?.id === u.id ? null : { id: u.id, ledger: await adminUserLedger(u.id) })}>{tx('History', 'السجل')}</button>
                  </td>
                </tr>
                {open?.id === u.id && (
                  <tr>
                    <td colSpan={5}>
                      <ul className="sd-list">
                        {open.ledger.map((l) => (
                          <li key={l.id}>
                            <span>{tx(KIND_EN[l.kind] || l.kind, KIND_LABEL[l.kind] || l.kind)}{l.tool_id && ` · ${l.tool_id}`}{l.ref && ` · ${l.ref}`}{l.note && ` — ${l.note}`}</span>
                            <b className={l.delta > 0 ? 'sd-plus' : 'sd-minus'} dir="ltr">{l.delta > 0 ? '+' : ''}{l.delta} → {l.balance_after}</b>
                            <small className="sd-muted">{fmt(l.created_at)}</small>
                          </li>
                        ))}
                        {!open.ledger.length && <li className="sd-muted">{tx('No movements.', 'لا توجد حركات.')}</li>}
                      </ul>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {rows && !rows.length && <tr><td colSpan={5} className="sd-muted">{tx('No customers found.', 'لم يُعثر على زبائن.')}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Payment() {
  const { tx } = useLang();
  const [s, setS] = useState(null);
  const [state, setState] = useState({ saving: false, ok: false, error: null });
  useEffect(() => { getSettings().then(setS).catch((e) => setState({ error: e.message })); }, []);
  if (!s) return state.error ? <p className="sd-error">{state.error}</p> : null;

  const pay = s.payment || {};
  const setAcct = (m, k) => (e) => setS({ ...s, payment: { ...pay, [m]: { ...(pay[m] || {}), [k]: e.target.value } } });
  const save = async () => {
    setState({ saving: true, ok: false, error: null });
    try {
      setS(await saveSettings(s));
      setState({ saving: false, ok: true, error: null });
    } catch (e) {
      setState({ saving: false, ok: false, error: e.message });
    }
  };

  return (
    <section className="sd-box mt-3">
      <div className="sd-admin-head">
        <h6 className="m-0">{tx('Payment details (shown to customers)', 'معلومات الدفع (تظهر للزبائن)')}</h6>
        <div className="d-flex gap-2 align-items-center">
          {state.ok && <span className="sd-ok">{tx('Saved ✓', 'تم الحفظ ✓')}</span>}
          <button className="sd-btn sd-primary" onClick={save} disabled={state.saving}>{state.saving ? tx('Saving…', 'جارٍ الحفظ…') : tx('Save', 'حفظ')}</button>
        </div>
      </div>
      {state.error && <p className="sd-error">{state.error}</p>}
      <div className="sd-form-grid">
        <label>{tx('Whish Money number', 'رقم Whish Money')}<input type="text" dir="ltr" value={pay.whish?.number || ''} placeholder="+961 …" onChange={setAcct('whish', 'number')} /></label>
        <label>{tx('Whish account name', 'اسم حساب Whish')}<input type="text" value={pay.whish?.name || ''} onChange={setAcct('whish', 'name')} /></label>
        <label>{tx('Neo number / account', 'رقم / حساب Neo')}<input type="text" dir="ltr" value={pay.neo?.number || ''} onChange={setAcct('neo', 'number')} /></label>
        <label>{tx('Neo account name', 'اسم حساب Neo')}<input type="text" value={pay.neo?.name || ''} onChange={setAcct('neo', 'name')} /></label>
        <label className="sd-span-2">Note for customers (optional)
          <input type="text" value={pay.note || ''} placeholder={tx('Credits are added within a few hours…', 'يُضاف الكريدت خلال ساعات قليلة…')} onChange={(e) => setS({ ...s, payment: { ...pay, note: e.target.value } })} />
        </label>
      </div>
      <small className="sd-muted">{tx('A method with an empty number is hidden. Credits per download are set per tool in Studio Pricing.', 'الطريقة بدون رقم تُخفى. كريدت كل تنزيل يُحدَّد لكل أداة في تسعير الاستوديو.')}</small>
    </section>
  );
}

export default function AdminCredits() {
  return (
    <div className="sd-admin">
      <Requests />
      <Packages />
      <Users />
      <Payment />
    </div>
  );
}
