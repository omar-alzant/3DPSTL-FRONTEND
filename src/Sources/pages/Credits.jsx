import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCredits } from '../context/CreditsContext';
import { useAuth } from '../context/AuthContext';
import { getPackages, getMyCredits, requestTopUp, getDownloads, getDownload, KIND_LABEL, STATUS_LABEL, METHOD_LABEL } from '../studio/lib/credits.js';
import { AFTER_LOGIN } from '../studio/lib/pending.js';
import '../Style/Studio.css';

const fmtDate = (d) => new Date(d).toLocaleString('ar-LB', { dateStyle: 'medium', timeStyle: 'short' });
const money = (v, c) => `${Number(v).toFixed(2)} ${c || 'USD'}`;

// التصميم الذي كان الزبون يعمل عليه قبل أن يأتي ليشحن
function pendingDesign() {
  try {
    const p = JSON.parse(sessionStorage.getItem('studioPendingOrder') || 'null');
    return p?.toolId ? `/studio/${p.toolId}` : null;
  } catch {
    return null;
  }
}

export default function Credits() {
  const { token } = useAuth();
  const { balance, isAdmin, refresh } = useCredits();
  const navigate = useNavigate();
  const [files, setFiles] = useState(null);
  const [filesPage, setFilesPage] = useState(1);
  const [opening, setOpening] = useState(null);
  const [shop, setShop] = useState(null);
  const [me, setMe] = useState(null);
  const [err, setErr] = useState(null);
  const [pick, setPick] = useState(null);
  const [form, setForm] = useState({ method: '', reference: '', sender: '' });
  const [state, setState] = useState({ sending: false, done: null, error: null });
  const back = pendingDesign();

  const loadMe = () => token && getMyCredits().then(setMe).catch((e) => setErr(e.message));
  useEffect(() => {
    getPackages().then(setShop).catch((e) => setErr(e.message));
    loadMe();
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  useEffect(() => {
    if (token) getDownloads(filesPage).then(setFiles).catch((e) => setErr(e.message));
  }, [token, filesPage]);

  // يعيد فتح تصميم نزّله سابقاً: التنزيل مجدداً لا يخصم شيئاً
  const openFile = async (f) => {
    setOpening(f.id);
    try {
      const d = await getDownload(f.id);
      if (!d.params) throw new Error('إعدادات هذا التصميم غير محفوظة');
      navigate(`/studio/${d.tool_id}`, { state: { params: d.params, downloadId: d.id } });
    } catch (e) {
      setErr(e.message);
      setOpening(null);
    }
  };

  const pay = shop?.payment || {};
  const methods = ['whish', 'neo'].filter((m) => pay[m]?.number);
  useEffect(() => {
    if (methods.length && !methods.includes(form.method)) setForm((f) => ({ ...f, method: methods[0] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  const submit = async (e) => {
    e.preventDefault();
    setState({ sending: true, done: null, error: null });
    try {
      const res = await requestTopUp({ packageId: pick.id, ...form });
      setState({ sending: false, done: res, error: null });
      setForm((f) => ({ ...f, reference: '' }));
      loadMe();
      refresh();
    } catch (e2) {
      setState({ sending: false, done: null, error: e2.message });
    }
  };

  return (
    <div className="studio sd-credits" dir="rtl" lang="ar">
      <section className="sd-hero">
        <span className="sd-kicker" dir="ltr">3DSTL Credits</span>
        <h1>رصيد الكريدت</h1>
        <p>تصميم ومعاينة أي شيء في الـ Studio مجاني. تنزيل الملفات (STL / 3MF) يُخصم من رصيدك حسب الأداة.</p>
        {token && (balance !== null || isAdmin) && (
          <div className="sd-balance">
            رصيدك الحالي <b>{isAdmin ? '∞' : balance.toLocaleString()}</b> كريدت
          </div>
        )}
        {back && <Link className="sd-btn sd-ghost mt-2" to={back}>→ رجوع إلى تصميمك</Link>}
      </section>

      {err && <p className="sd-error">{err}</p>}

      {!token ? (
        <div className="sd-box sd-center">
          <h3>سجّل الدخول لشحن رصيدك</h3>
          <div className="sd-row">
            <Link className="sd-btn sd-primary" to="/login" onClick={() => sessionStorage.setItem(AFTER_LOGIN, '/credits')}>تسجيل الدخول</Link>
            <Link className="sd-btn" to="/register">إنشاء حساب</Link>
          </div>
        </div>
      ) : (
        <>
          <h2 className="sd-section-title">الباقات</h2>
          <div className="sd-packs">
            {shop?.packages?.map((p) => (
              <button key={p.id} type="button" className={`sd-pack ${pick?.id === p.id ? 'on' : ''}`} onClick={() => { setPick(p); setState({ sending: false, done: null, error: null }); }}>
                {p.name && <span className="sd-chip">{p.name}</span>}
                <b>{p.credits.toLocaleString()}</b>
                <span>كريدت</span>
                <em>{money(p.price, p.currency)}</em>
              </button>
            ))}
            {shop && !shop.packages?.length && <p className="sd-muted">لا توجد باقات حالياً.</p>}
          </div>

          {pick && (
            <form className="sd-box sd-pay" onSubmit={submit}>
              {state.done ? (
                <div className="sd-done">
                  <h3>تم إرسال طلبك ✓</h3>
                  <p>رقم الطلب <b dir="ltr">{state.done.id}</b>. نراجع التحويل ونضيف <b>{pick.credits.toLocaleString()} كريدت</b> إلى رصيدك بأقرب وقت.</p>
                  {back && <Link className="sd-btn sd-primary" to={back}>رجوع إلى تصميمك</Link>}
                </div>
              ) : !methods.length ? (
                <p className="sd-muted">طرق الدفع غير متوفرة حالياً — راسلنا على واتساب.</p>
              ) : (
                <>
                  <h3>ادفع {money(pick.price, pick.currency)}</h3>
                  <div className="sd-seg">
                    {methods.map((m) => (
                      <button key={m} type="button" className={form.method === m ? 'on' : ''} onClick={() => setForm({ ...form, method: m })}>
                        {METHOD_LABEL[m]}
                      </button>
                    ))}
                  </div>
                  <ol className="sd-steps">
                    <li>
                      حوّل <b>{money(pick.price, pick.currency)}</b> عبر <b>{METHOD_LABEL[form.method]}</b> إلى الرقم{' '}
                      <b dir="ltr" className="sd-copy" onClick={() => navigator.clipboard?.writeText(pay[form.method]?.number)}>{pay[form.method]?.number}</b>
                      {pay[form.method]?.name && <> ({pay[form.method].name})</>}.
                    </li>
                    <li>انسخ <b>رقم العملية</b> من التطبيق واكتبه هنا.</li>
                    <li>نراجع التحويل ونضيف الكريدت إلى حسابك.</li>
                  </ol>
                  {pay.note && <p className="sd-muted small">{pay.note}</p>}
                  <label>رقم العملية (Transaction ID)
                    <input required dir="ltr" value={form.reference} maxLength={80} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                  </label>
                  <label>اسم أو رقم المحوِّل (اختياري)
                    <input value={form.sender} maxLength={80} onChange={(e) => setForm({ ...form, sender: e.target.value })} />
                  </label>
                  {state.error && <p className="sd-error">{state.error}</p>}
                  <button className="sd-btn sd-primary" disabled={state.sending}>{state.sending ? 'جارٍ الإرسال…' : 'أرسلت المبلغ — أكّد الطلب'}</button>
                </>
              )}
            </form>
          )}

          <h2 className="sd-section-title">ملفاتي</h2>
          <section className="sd-box sd-files">
            {files?.items?.length ? (
              <>
                <ul className="sd-list">
                  {files.items.map((f) => (
                    <li key={f.id}>
                      <span>
                        <b>{f.tool_name || f.tool_id}</b>
                        {f.label && <> — <span dir="auto">«{f.label}»</span></>}
                      </span>
                      <button className="sd-btn sd-primary" disabled={opening === f.id} onClick={() => openFile(f)}>
                        {opening === f.id ? 'جارٍ الفتح…' : 'افتح ونزّل'}
                      </button>
                      <small className="sd-muted">
                        {fmtDate(f.last_at)} · {f.charged ? `دُفع ${f.charged} كريدت` : 'مجاني'} · التنزيل مجدداً بلا خصم
                      </small>
                    </li>
                  ))}
                </ul>
                {files.pages > 1 && (
                  <div className="sd-row sd-pager">
                    <button className="sd-btn" disabled={filesPage <= 1} onClick={() => setFilesPage((p) => p - 1)}>→ الأحدث</button>
                    <span className="sd-muted">{filesPage} / {files.pages}</span>
                    <button className="sd-btn" disabled={filesPage >= files.pages} onClick={() => setFilesPage((p) => p + 1)}>الأقدم ←</button>
                  </div>
                )}
              </>
            ) : (
              <p className="sd-muted m-0">لم تنزّل أي ملف بعد. <Link to="/studio">ابدأ التصميم في الـ Studio</Link></p>
            )}
          </section>

          {me && (
            <div className="sd-credit-cols">
              <section className="sd-box">
                <h6>طلبات الشحن</h6>
                {me.requests.length ? (
                  <ul className="sd-list">
                    {me.requests.map((r) => (
                      <li key={r.id}>
                        <span><b>{r.credits.toLocaleString()}</b> كريدت · {money(r.price, r.currency)} · {METHOD_LABEL[r.method]}</span>
                        <span className={`sd-status sd-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                        <small className="sd-muted">{fmtDate(r.created_at)}{r.admin_note && ` — ${r.admin_note}`}</small>
                      </li>
                    ))}
                  </ul>
                ) : <p className="sd-muted">لا توجد طلبات بعد.</p>}
              </section>
              <section className="sd-box">
                <h6>آخر الحركات</h6>
                {me.ledger.length ? (
                  <ul className="sd-list">
                    {me.ledger.map((l) => (
                      <li key={l.id}>
                        <span>{KIND_LABEL[l.kind] || l.kind}{l.tool_id && <small className="sd-muted"> · {l.tool_id}</small>}</span>
                        <b className={l.delta > 0 ? 'sd-plus' : 'sd-minus'} dir="ltr">{l.delta > 0 ? '+' : ''}{l.delta}</b>
                        <small className="sd-muted">{fmtDate(l.created_at)}</small>
                      </li>
                    ))}
                  </ul>
                ) : <p className="sd-muted">لا توجد حركات بعد.</p>}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
