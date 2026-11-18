import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createOrder, designLink } from '../lib/api.js';
import { useAuth } from '../../context/AuthContext';
import { savePending } from '../lib/pending.js';
import { formatMinutes } from '../lib/pricing.js';

export default function OrderDialog({ tool, params, stats, price, minutes = 0, config, onClose }) {
  const { profile, token } = useAuth();
  const loggedIn = !!token;
  const [form, setForm] = useState(() => ({
    name: profile?.full_name || '',
    phone: profile?.phone || '',
    // آخر عنوان استُخدم على هذا الجهاز
    address: (() => { try { return localStorage.getItem('studio_address') || ''; } catch { return ''; } })(),
    qty: 1,
    notes: '',
  }));
  const [state, setState] = useState({ sending: false, done: null, error: null });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const link = designLink(tool.id, params);

  const waText = encodeURIComponent(
    `مرحباً، أريد طلب طباعة:\n${tool.name}${params.text || params.name ? ` — «${params.text || params.name}»` : ''}${params.digits ? ` ${params.letter || params.letters || ''} ${params.digits}` : ''}\nالعنوان: ${form.address}\nالكمية: ${form.qty}\nالمقاس: ${stats.size.x.toFixed(0)}×${stats.size.y.toFixed(0)}×${stats.size.z.toFixed(0)} مم\nوقت الطباعة التقريبي: ${formatMinutes(minutes * (Number(form.qty) || 1))}\nالتصميم: ${link}${params.logo ? '\n(مع شعار مرفوع)' : ''}`
  );
  const waUrl = config.whatsapp ? `https://wa.me/${config.whatsapp.replace(/\D/g, '')}?text=${waText}` : null;

  async function submit(e) {
    e.preventDefault();
    setState({ sending: true, done: null, error: null });
    try {
      const res = await createOrder({
        toolId: tool.id,
        toolName: tool.name,
        params,
        customer: { name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() },
        qty: Number(form.qty) || 1,
        notes: form.notes.trim(),
        estimate: { grams: +stats.grams.toFixed(1), minutes: Math.round(minutes), price: +(price * (Number(form.qty) || 1)).toFixed(2), currency: config.currency },
        size: stats.size.toArray().map((v) => +v.toFixed(1)),
      });
      try { localStorage.setItem('studio_address', form.address.trim()); } catch {}
      setState({ sending: false, done: res, error: null });
    } catch (err) {
      setState({ sending: false, done: null, error: err.message });
    }
  }

  return (
    <div className="sd-modal-bg" onClick={onClose}>
      <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
        <button className="sd-x" onClick={onClose} aria-label="إغلاق">×</button>
        {!loggedIn && !state.done ? (
          <div className="sd-done">
            <h3>سجّل الدخول لإرسال الطلب</h3>
            <p className="sd-muted">
              لتتمكّن من متابعة حالة طلبك من صفحة My Orders، نحتاج أن تكون مسجّلاً. تصميمك محفوظ، وسنعيدك إليه مباشرة بعد تسجيل الدخول.
            </p>
            <div className="sd-row">
              <Link className="sd-btn sd-primary" to="/login" onClick={() => savePending(tool.id, params)}>تسجيل الدخول</Link>
              <Link className="sd-btn" to="/register" onClick={() => savePending(tool.id, params)}>إنشاء حساب</Link>
            </div>
          </div>
        ) : state.done ? (
          <div className="sd-done">
            <h3>تم استلام طلبك ✓</h3>
            <p>رقم الطلب: <b dir="ltr">{state.done.id}</b>. سنتواصل معك على رقمك قريباً.</p>
            {loggedIn ? (
              <p className="sd-muted">يمكنك متابعة حالة طلبك من صفحة <Link to="/profile?tab=orders" onClick={onClose}>My Orders</Link>.</p>
            ) : (
              <p className="sd-muted">احتفظ برقم الطلب. سجّل الدخول قبل طلبك القادم لتتابع حالته من صفحة My Orders.</p>
            )}
            <div className="sd-row">
              {loggedIn && <Link className="sd-btn sd-primary" to="/profile?tab=orders" onClick={onClose}>تابع حالة الطلب</Link>}
              {waUrl && <a className="sd-btn sd-ghost" href={waUrl} target="_blank" rel="noreferrer">تابع عبر واتساب</a>}
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h3>اطلب طباعة التصميم</h3>
            <p className="sd-muted">
              {tool.name} · {stats.size.x.toFixed(0)}×{stats.size.y.toFixed(0)}×{stats.size.z.toFixed(0)} مم · السعر التقريبي{' '}
              <b>{(price * (Number(form.qty) || 1)).toFixed(2)} {config.currency}</b>
            </p>
            <label>الاسم<input required value={form.name} onChange={set('name')} /></label>
            <label>رقم الهاتف / واتساب<input required dir="ltr" value={form.phone} onChange={set('phone')} placeholder="+961 …" /></label>
            <label>عنوان السكن<textarea required minLength={5} maxLength={300} rows="2" value={form.address} onChange={set('address')} placeholder="المدينة، المنطقة، الشارع، البناية، الطابق" /></label>
            <label>الكمية<input type="number" min="1" max="500" value={form.qty} onChange={set('qty')} /></label>
            <label>ملاحظات<textarea rows="2" value={form.notes} onChange={set('notes')} /></label>
            {state.error && (
              <p className="sd-error">
                {config.online ? state.error : 'الخادم غير متصل في هذه المعاينة.'}
                {waUrl ? ' يمكنك إرسال الطلب عبر واتساب.' : ''}
              </p>
            )}
            <div className="sd-row">
              <button className="sd-btn sd-primary" disabled={state.sending}>{state.sending ? 'جارٍ الإرسال…' : 'إرسال الطلب'}</button>
              {waUrl && <a className="sd-btn sd-ghost" href={waUrl} target="_blank" rel="noreferrer">إرسال عبر واتساب</a>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
