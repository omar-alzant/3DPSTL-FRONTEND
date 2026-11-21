import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createOrder, designLink } from '../lib/api.js';
import { useAuth } from '../../context/AuthContext';
import { savePending } from '../lib/pending.js';
import { normalizeMapLink } from '../lib/mapLink.js';
import { useLang } from '../../i18n/LanguageContext';
import { useT } from '../i18n/index.js';

export default function OrderDialog({ tool, params, stats, price, minutes = 0, config, onClose }) {
  const { profile, token } = useAuth();
  const { tx } = useLang();
  const t = useT();
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
    if (!navigator.geolocation) return setGeo({ busy: false, error: tx('Your browser can’t detect location — paste a map link', 'متصفحك ما بيدعم تحديد الموقع — الصق رابطاً من الخريطة') });
    setGeo({ busy: true, error: '' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((f) => ({ ...f, location: `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}` }));
        setGeo({ busy: false, error: '' });
      },
      (err) => setGeo({
        busy: false,
        error: err.code === 1 ? tx('Location permission was denied — allow it in your browser settings, or paste a map link', 'رفضت إذن الموقع — اسمح للموقع من إعدادات المتصفح، أو الصق رابطاً من الخريطة') : tx('Could not find your location — paste a map link', 'تعذّر تحديد موقعك — الصق رابطاً من الخريطة'),
      }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const link = designLink(tool.id, params);

  const waText = encodeURIComponent(
    `${tx('Hello, I’d like to order a print:', 'مرحباً، أريد طلب طباعة:')}\n${t(tool.name)}${params.text || params.name ? ` — «${params.text || params.name}»` : ''}${params.digits ? ` ${params.letter || params.letters || ''} ${params.digits}` : ''}\n${tx('Address', 'العنوان')}: ${form.address}${mapLink ? `\n${tx('Location', 'الموقع')}: ${mapLink}` : ''}\n${tx('Quantity', 'الكمية')}: ${form.qty}\n${tx('Size', 'المقاس')}: ${stats.size.x.toFixed(0)}×${stats.size.y.toFixed(0)}×${stats.size.z.toFixed(0)} ${tx('mm', 'مم')}\n${tx('Design', 'التصميم')}: ${link}${params.logo ? `\n${tx('(with an uploaded logo)', '(مع شعار مرفوع)')}` : ''}`
  );
  const waUrl = config.whatsapp ? `https://wa.me/${config.whatsapp.replace(/\D/g, '')}?text=${waText}` : null;

  async function submit(e) {
    e.preventDefault();
    if (locationBad) return setState({ sending: false, done: null, error: tx('The location link isn’t valid — paste a Google Maps or Apple Maps link', 'رابط الموقع غير صالح — الصق رابطاً من Google Maps أو Apple Maps') });
    if (form.address.trim().length < 5 && !mapLink) return setState({ sending: false, done: null, error: tx('Write your address or add your location on the map', 'اكتب عنوان السكن أو أضف موقعك على الخريطة') });
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
        <button className="sd-x" onClick={onClose} aria-label={tx('Close', 'إغلاق')}>×</button>
        {!loggedIn && !state.done ? (
          <div className="sd-done">
            <h3>{tx('Log in to send the order', 'سجّل الدخول لإرسال الطلب')}</h3>
            <p className="sd-muted">
              {tx('So you can follow your order from the My Orders page, you need to be logged in. Your design is saved and we’ll bring you straight back to it after you log in.', 'لتتمكّن من متابعة حالة طلبك من صفحة My Orders، نحتاج أن تكون مسجّلاً. تصميمك محفوظ، وسنعيدك إليه مباشرة بعد تسجيل الدخول.')}
            </p>
            <div className="sd-row">
              <Link className="sd-btn sd-primary" to="/login" onClick={() => savePending(tool.id, params)}>{tx('Log in', 'تسجيل الدخول')}</Link>
              <Link className="sd-btn" to="/register" onClick={() => savePending(tool.id, params)}>{tx('Create account', 'إنشاء حساب')}</Link>
            </div>
          </div>
        ) : state.done ? (
          <div className="sd-done">
            <h3>{tx('We got your order ✓', 'تم استلام طلبك ✓')}</h3>
            <p>{tx('Order number:', 'رقم الطلب:')} <b dir="ltr">{state.done.id}</b>. {tx('We’ll contact you on your number soon.', 'سنتواصل معك على رقمك قريباً.')}</p>
            {loggedIn ? (
              <p className="sd-muted">{tx('You can follow your order from the', 'يمكنك متابعة حالة طلبك من صفحة')} <Link to="/profile?tab=orders" onClick={onClose}>My Orders</Link>{tx(' page.', '.')}</p>
            ) : (
              <p className="sd-muted">{tx('Keep the order number. Log in before your next order to follow it from My Orders.', 'احتفظ برقم الطلب. سجّل الدخول قبل طلبك القادم لتتابع حالته من صفحة My Orders.')}</p>
            )}
            <div className="sd-row">
              {loggedIn && <Link className="sd-btn sd-primary" to="/profile?tab=orders" onClick={onClose}>{tx('Track the order', 'تابع حالة الطلب')}</Link>}
              {waUrl && <a className="sd-btn sd-ghost" href={waUrl} target="_blank" rel="noreferrer">{tx('Follow up on WhatsApp', 'تابع عبر واتساب')}</a>}
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h3>{tx('Order a print of this design', 'اطلب طباعة التصميم')}</h3>
            <p className="sd-muted">
              {t(tool.name)} · <span dir="ltr">{stats.size.x.toFixed(0)}×{stats.size.y.toFixed(0)}×{stats.size.z.toFixed(0)}</span> {tx('mm', 'مم')} · {tx('approx. price', 'السعر التقريبي')}{' '}
              <b>{(price * (Number(form.qty) || 1)).toFixed(2)} {config.currency}</b>
            </p>
            <label>{tx('Name', 'الاسم')}<input required value={form.name} onChange={set('name')} /></label>
            <label>{tx('Phone / WhatsApp', 'رقم الهاتف / واتساب')}<input required dir="ltr" value={form.phone} onChange={set('phone')} placeholder="+961 …" /></label>
            <label>{tx('Address', 'عنوان السكن')}{mapLink && <span className="sd-muted"> {tx('(optional with a location)', '(اختياري مع الموقع)')}</span>}
              <textarea maxLength={300} rows="2" value={form.address} onChange={set('address')} placeholder={tx('City, area, street, building, floor', 'المدينة، المنطقة، الشارع، البناية، الطابق')} />
            </label>
            <label>{tx('Location on the map', 'الموقع على الخريطة')} <span className="sd-muted">{tx('(optional)', '(اختياري)')}</span>
              <div className="sd-loc">
                <input dir="ltr" value={form.location} onChange={set('location')} placeholder={tx('Paste a Google Maps or Apple Maps link', 'الصق رابط Google Maps أو Apple Maps')} />
                <button type="button" className="sd-btn sd-ghost" onClick={useMyLocation} disabled={geo.busy}>
                  {geo.busy ? tx('Locating…', 'جارٍ التحديد…') : tx('📍 My current location', '📍 موقعي الحالي')}
                </button>
              </div>
            </label>
            {mapLink && <a className="sd-loc-ok" href={mapLink} target="_blank" rel="noreferrer">{tx('✓ Check the location on the map ↗', '✓ تأكّد من الموقع على الخريطة ↗')}</a>}
            {locationBad && <p className="sd-error">{tx('That’s not a map link — in Google Maps: Share → Copy link; in Apple Maps: Share → Copy', 'هيدا مش رابط خريطة — من Google Maps: Share ← Copy link، ومن Apple Maps: Share ← Copy')}</p>}
            {geo.error && <p className="sd-error">{geo.error}</p>}
            <label>{tx('Quantity', 'الكمية')}<input type="number" min="1" max="500" value={form.qty} onChange={set('qty')} /></label>
            <label>{tx('Notes', 'ملاحظات')}<textarea rows="2" value={form.notes} onChange={set('notes')} /></label>
            {state.error && (
              <p className="sd-error">
                {config.online ? t(state.error) : tx('The server isn’t connected in this preview.', 'الخادم غير متصل في هذه المعاينة.')}
                {waUrl ? tx(' You can send the order on WhatsApp.', ' يمكنك إرسال الطلب عبر واتساب.') : ''}
              </p>
            )}
            <div className="sd-row">
              <button className="sd-btn sd-primary" disabled={state.sending}>{state.sending ? tx('Sending…', 'جارٍ الإرسال…') : tx('Send the order', 'إرسال الطلب')}</button>
              {waUrl && <a className="sd-btn sd-ghost" href={waUrl} target="_blank" rel="noreferrer">{tx('Send on WhatsApp', 'إرسال عبر واتساب')}</a>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
