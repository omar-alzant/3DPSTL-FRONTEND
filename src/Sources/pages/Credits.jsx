import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCredits } from '../context/CreditsContext';
import { useAuth } from '../context/AuthContext';
import { getPackages, getMyCredits, requestTopUp, getDownloads, getDownload, KIND_LABEL, STATUS_LABEL, METHOD_LABEL } from '../studio/lib/credits.js';
import { AFTER_LOGIN } from '../studio/lib/pending.js';
import '../Style/Studio.css';
import { useLang } from '../i18n/LanguageContext';

const fmtDate = (d, lang) => new Date(d).toLocaleString(lang === 'ar' ? 'ar-LB' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const KIND_EN = { topup: 'Top-up', download: 'File download', admin: 'Admin adjustment', refund: 'Refund' };
const STATUS_EN = { pending: 'Waiting for review', approved: 'Approved', rejected: 'Rejected' };
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
  const { tx, lang, dir } = useLang();
  const { balance, isAdmin, refresh } = useCredits();
  const kindLabel = (k) => tx(KIND_EN[k] || k, KIND_LABEL[k] || k);
  const statusLabel = (k) => tx(STATUS_EN[k] || k, STATUS_LABEL[k] || k);
  const date = (d) => fmtDate(d, lang);
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
      if (!d.params) throw new Error(tx('This design’s settings weren’t saved', 'إعدادات هذا التصميم غير محفوظة'));
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
    <div className="studio sd-credits" dir={dir} lang={lang}>
      <section className="sd-hero">
        <span className="sd-kicker" dir="ltr">3DSTL Credits</span>
        <h1>{tx('Credit balance', 'رصيد الكريدت')}</h1>
        <p>{tx('Designing and previewing anything in the Studio is free. Downloading files (STL / 3MF) uses credits, depending on the template.', 'تصميم ومعاينة أي شيء في الـ Studio مجاني. تنزيل الملفات (STL / 3MF) يُخصم من رصيدك حسب الأداة.')}</p>
        {token && (balance !== null || isAdmin) && (
          <div className="sd-balance">
            {tx('Your balance', 'رصيدك الحالي')} <b>{isAdmin ? '∞' : balance.toLocaleString()}</b> {tx('credits', 'كريدت')}
          </div>
        )}
        {back && <Link className="sd-btn sd-ghost mt-2" to={back}>{tx('← Back to your design', '→ رجوع إلى تصميمك')}</Link>}
      </section>

      {err && <p className="sd-error">{err}</p>}

      {!token ? (
        <div className="sd-box sd-center">
          <h3>{tx('Log in to top up your balance', 'سجّل الدخول لشحن رصيدك')}</h3>
          <div className="sd-row">
            <Link className="sd-btn sd-primary" to="/login" onClick={() => sessionStorage.setItem(AFTER_LOGIN, '/credits')}>{tx('Log in', 'تسجيل الدخول')}</Link>
            <Link className="sd-btn" to="/register">{tx('Create account', 'إنشاء حساب')}</Link>
          </div>
        </div>
      ) : (
        <>
          <h2 className="sd-section-title">{tx('Packages', 'الباقات')}</h2>
          <div className="sd-packs">
            {shop?.packages?.map((p) => (
              <button key={p.id} type="button" className={`sd-pack ${pick?.id === p.id ? 'on' : ''}`} onClick={() => { setPick(p); setState({ sending: false, done: null, error: null }); }}>
                {p.name && <span className="sd-chip">{p.name}</span>}
                <b>{p.credits.toLocaleString()}</b>
                <span>{tx('credits', 'كريدت')}</span>
                <em>{money(p.price, p.currency)}</em>
              </button>
            ))}
            {shop && !shop.packages?.length && <p className="sd-muted">{tx('No packages right now.', 'لا توجد باقات حالياً.')}</p>}
          </div>

          {pick && (
            <form className="sd-box sd-pay" onSubmit={submit}>
              {state.done ? (
                <div className="sd-done">
                  <h3>{tx('Request sent ✓', 'تم إرسال طلبك ✓')}</h3>
                  <p>{tx('Request', 'رقم الطلب')} <b dir="ltr">{state.done.id}</b>. {tx('We’ll check the transfer and add', 'نراجع التحويل ونضيف')} <b>{pick.credits.toLocaleString()} {tx('credits', 'كريدت')}</b> {tx('to your balance soon.', 'إلى رصيدك بأقرب وقت.')}</p>
                  {back && <Link className="sd-btn sd-primary" to={back}>{tx('Back to your design', 'رجوع إلى تصميمك')}</Link>}
                </div>
              ) : !methods.length ? (
                <p className="sd-muted">{tx('Payment methods aren’t available right now — message us on WhatsApp.', 'طرق الدفع غير متوفرة حالياً — راسلنا على واتساب.')}</p>
              ) : (
                <>
                  <h3>{tx('Pay', 'ادفع')} {money(pick.price, pick.currency)}</h3>
                  <div className="sd-seg">
                    {methods.map((m) => (
                      <button key={m} type="button" className={form.method === m ? 'on' : ''} onClick={() => setForm({ ...form, method: m })}>
                        {METHOD_LABEL[m]}
                      </button>
                    ))}
                  </div>
                  <ol className="sd-steps">
                    <li>
                      {tx('Send', 'حوّل')} <b>{money(pick.price, pick.currency)}</b> {tx('with', 'عبر')} <b>{METHOD_LABEL[form.method]}</b> {tx('to', 'إلى الرقم')}{' '}
                      <b dir="ltr" className="sd-copy" onClick={() => navigator.clipboard?.writeText(pay[form.method]?.number)}>{pay[form.method]?.number}</b>
                      {pay[form.method]?.name && <> ({pay[form.method].name})</>}.
                    </li>
                    <li>{tx('Copy the', 'انسخ')} <b>{tx('transaction ID', 'رقم العملية')}</b> {tx('from the app and enter it here.', 'من التطبيق واكتبه هنا.')}</li>
                    <li>{tx('We check the transfer and add the credits to your account.', 'نراجع التحويل ونضيف الكريدت إلى حسابك.')}</li>
                  </ol>
                  {pay.note && <p className="sd-muted small">{pay.note}</p>}
                  <label>{tx('Transaction ID', 'رقم العملية (Transaction ID)')}
                    <input required dir="ltr" value={form.reference} maxLength={80} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                  </label>
                  <label>{tx('Sender’s name or number (optional)', 'اسم أو رقم المحوِّل (اختياري)')}
                    <input value={form.sender} maxLength={80} onChange={(e) => setForm({ ...form, sender: e.target.value })} />
                  </label>
                  {state.error && <p className="sd-error">{state.error}</p>}
                  <button className="sd-btn sd-primary" disabled={state.sending}>{state.sending ? tx('Sending…', 'جارٍ الإرسال…') : tx('I’ve sent it — confirm', 'أرسلت المبلغ — أكّد الطلب')}</button>
                </>
              )}
            </form>
          )}

          <h2 className="sd-section-title">{tx('My files', 'ملفاتي')}</h2>
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
                        {opening === f.id ? tx('Opening…', 'جارٍ الفتح…') : tx('Open & download', 'افتح ونزّل')}
                      </button>
                      <small className="sd-muted">
                        {date(f.last_at)} · {f.charged ? tx(`Paid ${f.charged} credits`, `دُفع ${f.charged} كريدت`) : tx('Free', 'مجاني')} · {tx('downloading again is free', 'التنزيل مجدداً بلا خصم')}
                      </small>
                    </li>
                  ))}
                </ul>
                {files.pages > 1 && (
                  <div className="sd-row sd-pager">
                    <button className="sd-btn" disabled={filesPage <= 1} onClick={() => setFilesPage((p) => p - 1)}>{tx('← Newer', '→ الأحدث')}</button>
                    <span className="sd-muted">{filesPage} / {files.pages}</span>
                    <button className="sd-btn" disabled={filesPage >= files.pages} onClick={() => setFilesPage((p) => p + 1)}>{tx('Older →', 'الأقدم ←')}</button>
                  </div>
                )}
              </>
            ) : (
              <p className="sd-muted m-0">{tx('You haven’t downloaded any file yet.', 'لم تنزّل أي ملف بعد.')} <Link to="/studio">{tx('Start designing in the Studio', 'ابدأ التصميم في الـ Studio')}</Link></p>
            )}
          </section>

          {me && (
            <div className="sd-credit-cols">
              <section className="sd-box">
                <h6>{tx('Top-up requests', 'طلبات الشحن')}</h6>
                {me.requests.length ? (
                  <ul className="sd-list">
                    {me.requests.map((r) => (
                      <li key={r.id}>
                        <span><b>{r.credits.toLocaleString()}</b> {tx('credits', 'كريدت')} · {money(r.price, r.currency)} · {METHOD_LABEL[r.method]}</span>
                        <span className={`sd-status sd-${r.status}`}>{statusLabel(r.status)}</span>
                        <small className="sd-muted">{date(r.created_at)}{r.admin_note && ` — ${r.admin_note}`}</small>
                      </li>
                    ))}
                  </ul>
                ) : <p className="sd-muted">{tx('No requests yet.', 'لا توجد طلبات بعد.')}</p>}
              </section>
              <section className="sd-box">
                <h6>{tx('Recent activity', 'آخر الحركات')}</h6>
                {me.ledger.length ? (
                  <ul className="sd-list">
                    {me.ledger.map((l) => (
                      <li key={l.id}>
                        <span>{kindLabel(l.kind)}{l.tool_id && <small className="sd-muted"> · {l.tool_id}</small>}</span>
                        <b className={l.delta > 0 ? 'sd-plus' : 'sd-minus'} dir="ltr">{l.delta > 0 ? '+' : ''}{l.delta}</b>
                        <small className="sd-muted">{date(l.created_at)}</small>
                      </li>
                    ))}
                  </ul>
                ) : <p className="sd-muted">{tx('No activity yet.', 'لا توجد حركات بعد.')}</p>}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
