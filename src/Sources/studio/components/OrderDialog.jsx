import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createOrder, designLink } from '../lib/api.js';
import { useAuth } from '../../context/AuthContext';
import { savePending } from '../lib/pending.js';
import { normalizeMapLink } from '../lib/mapLink.js';

export default function OrderDialog({ tool, params, stats, price, minutes = 0, config, onClose }) {
  const { profile, token } = useAuth();
  const loggedIn = !!token;
  const [form, setForm] = useState(() => ({
    name: profile?.full_name || '',
    phone: profile?.phone || '',
    // آخر عنوان استُخدم على هذا الجهاز
    address: (() => { try { return localStorage.getItem('studio_address') || ''; } catch { return ''; } })(),
    location: (() => { try { return localStorage.getItem('studio_location') || ''; } catch { return ''; } })(),
    qty: 1,
    notes: '',
  }));
  const [state, setState] = useState({ sending: false, done: null, error: null });
  const [geo, setGeo] = useState({ busy: false, error: '' });
  const mapLink = normalizeMapLink(form.location);
  const locationBad = !!form.location.trim() && !mapLink;

  // "Use my current location" → a Google Maps link with the exact coordinates
  const useMyLocation = () => {
    if (!navigator.geolocation) return setGeo({ busy: false, error: 'متصفحك ما بيدعم تحديد الموقع — الصق رابطاً من الخريطة' });
    setGeo({ busy: true, error: '' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((f) => ({ ...f, location: `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}` }));
        setGeo({ busy: false, error: '' });
      },
      (err) => setGeo({
        busy: false,
        error: err.code === 1 ? 'رفضت إذن الموقع — اسمح للموقع من إعدادات المتصفح، أو الصق رابطاً من الخريطة' : 'تعذّر تحديد موقعك — الصق رابطاً من الخريطة',
      }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const link = designLink(tool.id, params);

  const waText = encodeURIComponent(
    `مرحباً، أريد طلب طباعة:\n${tool.name}${params.text || params.name ? ` — «${params.text || params.name}»` : ''}${params.digits ? ` ${params.letter || params.letters || ''} ${params.digits}` : ''}\nالعنوان: ${form.address}${mapLink ? `\nالموقع: ${mapLink}` : ''}\nالكمية: ${form.qty}\nالمقاس: ${stats.size.x.toFixed(0)}×${stats.size.y.toFixed(0)}×${stats.size.z.toFixed(0)} مم\nالتصميم: ${link}${params.logo ? '\n(مع شعار مرفوع)' : ''}`
  );
  const waUrl = config.whatsapp ? `https://wa.me/${config.whatsapp.replace(/\D/g, '')}?text=${waText}` : null;

  async function submit(e) {
    e.preventDefault();
    if (locationBad) return setState({ sending: false, done: null, error: 'رابط الموقع غير صالح — الصق رابطاً من Google Maps أو Apple Maps' });
    if (form.address.trim().length < 5 && !mapLink) return setState({ sending: false, done: null, error: 'اكتب عنوان السكن أو أضف موقعك على الخريطة' });
    setState({ sending: true, done: null, error: null });
    try {
      const res = await createOrder({
        toolId: tool.id,
        toolName: tool.name,
        params,
        customer: { name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim(), location: mapLink },
        qty: Number(form.qty) || 1,
        notes: form.notes.trim(),
        estimate: { grams: +stats.grams.toFixed(1), minutes: Math.round(minutes), price: +(price * (Number(form.qty) || 1)).toFixed(2), currency: config.currency },
        size: stats.size.toArray().map((v) => +v.toFixed(1)),
      });
      try { localStorage.setItem('studio_address', form.address.trim()); localStorage.setItem('studio_location', mapLink); } catch {}
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
            <label>عنوان السكن{mapLink && <span className="sd-muted"> (اختياري مع الموقع)</span>}
              <textarea maxLength={300} rows="2" value={form.address} onChange={set('address')} placeholder="المدينة، المنطقة، الشارع، البناية، الطابق" />
            </label>
            <label>الموقع على الخريطة <span className="sd-muted">(اختياري)</span>
              <div className="sd-loc">
                <input dir="ltr" value={form.location} onChange={set('location')} placeholder="الصق رابط Google Maps أو Apple Maps" />
                <button type="button" className="sd-btn sd-ghost" onClick={useMyLocation} disabled={geo.busy}>
                  {geo.busy ? 'جارٍ التحديد…' : '📍 موقعي الحالي'}
                </button>
              </div>
            </label>
            {mapLink && <a className="sd-loc-ok" href={mapLink} target="_blank" rel="noreferrer">✓ تأكّد من الموقع على الخريطة ↗</a>}
            {locationBad && <p className="sd-error">هيدا مش رابط خريطة — من Google Maps: Share ← Copy link، ومن Apple Maps: Share ← Copy</p>}
            {geo.error && <p className="sd-error">{geo.error}</p>}
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
