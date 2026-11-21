// صفحة «التحقق البشري» قبل دخول الموقع (Cloudflare Turnstile).
// - الزائر يحلّ التحقق (غالباً بنقرة أو تلقائياً) → الخادم يتحقق ويعطيه تصريحاً لمدة 24 ساعة.
// - التصريح يُرسل تلقائياً مع كل طلب إلى الـ API (الترويسة X-Human-Pass).
// - محركات البحث ومعاينات الروابط (Google، واتساب، فيسبوك...) تدخل بلا تحقق حتى لا يتأثر ترتيب الموقع.
// - بدون REACT_APP_TURNSTILE_SITE_KEY تكون الصفحة متوقفة.
import { useCallback, useEffect, useRef, useState } from 'react';
import '../Style/HumanGate.css';
// page language, set by index.html before React starts
const pageAr = () => (typeof document !== 'undefined' ? document.documentElement.lang === 'ar' : false);
const L = (en, ar) => (pageAr() ? ar : en);


const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;
const API = process.env.REACT_APP_API_URL || '';
const KEY = 'hv_pass';
const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|facebot|whatsapp|telegram|twitter|linkedin|discord|pinterest|preview|lighthouse|pagespeed|embedly|quora|skype|vkshare|w3c_validator/i;

function readPass() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return v && v.pass && v.exp > Date.now() + 60_000 ? v : null;
  } catch {
    return null;
  }
}
function savePass(v) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {}
}
function clearPass() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

// إضافة التصريح لكل طلب إلى الـ API، وإعادة إظهار التحقق إن رفض الخادم تصريحاً منتهياً
let patched = false;
function patchFetch() {
  if (patched || typeof window === 'undefined') return;
  patched = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const toApi = (API && url.startsWith(API)) || url.startsWith('/api/');
    if (!toApi) return orig(input, init);
    const pass = readPass();
    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined) || {});
    if (pass) headers.set('X-Human-Pass', pass.pass);
    const res = await orig(input, { ...init, headers });
    if (res.status === 403 && res.headers.get('X-Human-Required')) {
      clearPass();
      window.dispatchEvent(new Event('hv:required'));
    }
    return res;
  };
}

// يُفعَّل فور تحميل الملف، قبل أن تبدأ صفحات الموقع طلباتها
if (SITE_KEY) patchFetch();

let scriptLoading = null;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptLoading)
    scriptLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => {
        scriptLoading = null;
        reject(new Error('load'));
      };
      document.head.appendChild(s);
    });
  return scriptLoading;
}

function Gate({ onPass }) {
  const box = useRef(null);
  const widget = useRef(null);
  const [state, setState] = useState('loading'); // loading | ready | checking | error
  const [msg, setMsg] = useState('');

  const verify = useCallback(
    async (token) => {
      setState('checking');
      try {
        const r = await fetch(`${API}/api/human/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.pass) throw new Error(data.message || L('Verification failed — please try again', 'فشل التحقق، حاول مجدداً'));
        savePass(data);
        onPass();
      } catch (e) {
        setMsg(e.message || L('Verification failed — please try again', 'فشل التحقق، حاول مجدداً'));
        setState('error');
        if (widget.current !== null) window.turnstile?.reset(widget.current);
      }
    },
    [onPass]
  );

  useEffect(() => {
    let alive = true;
    loadTurnstile()
      .then((ts) => {
        if (!alive || !box.current) return;
        widget.current = ts.render(box.current, {
          sitekey: SITE_KEY,
          language: pageAr() ? 'ar' : 'en',
          theme: 'auto',
          callback: (token) => verify(token),
          'error-callback': () => {
            setMsg(L('Couldn’t verify. Check your connection and try again', 'تعذّر التحقق. تأكد من اتصالك ثم حاول مجدداً'));
            setState('error');
          },
          'expired-callback': () => window.turnstile?.reset(widget.current),
        });
        setState('ready');
      })
      .catch(() => {
        setMsg(L('Couldn’t load the check. Check your connection or turn off your ad blocker, then reload the page', 'تعذّر تحميل التحقق. تأكد من اتصالك أو عطّل مانع الإعلانات ثم أعد تحميل الصفحة'));
        setState('error');
      });
    return () => {
      alive = false;
      if (widget.current !== null) window.turnstile?.remove(widget.current);
    };
  }, [verify]);

  return (
    <div className="hv-page" dir={pageAr() ? 'rtl' : 'ltr'}>
      <div className="hv-card">
        <img className="hv-logo" src={`${process.env.PUBLIC_URL || ''}/logoIco.svg`} alt="3DSTL" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <h1>{L('Quick check', 'التحقق البشري')}</h1>
        <p>{L('Sorry for the extra step — we need to make sure you’re a real person, to protect the site from bots.', 'نعتذر عن الإزعاج، لكن نحتاج التأكد أنك شخص حقيقي لحماية موقعنا من البرامج الضارة.')}</p>
        <p>{L('Complete the check below and you’ll go straight in.', 'أكمل التحقق أدناه، وستتمكن من الدخول مباشرة.')}</p>
        <div className="hv-widget" ref={box} />
        {state === 'checking' && <p className="hv-status">{L('Checking…', 'جارٍ التحقق…')}</p>}
        {state === 'error' && (
          <p className="hv-error">
            {msg} <button type="button" onClick={() => window.location.reload()}>{L('Try again', 'إعادة المحاولة')}</button>
          </p>
        )}
        <hr />
        <p className="hv-foot">{L('The check stays valid for 24 hours on this device.', 'يبقى التحقق صالحاً لمدة 24 ساعة على هذا الجهاز.')}</p>
        <img className="hv-wordmark" src={`${process.env.PUBLIC_URL || ''}/${document.documentElement.dataset.theme === 'light' ? 'logo-light' : 'logo'}.png`} alt="3DSTL" onError={(e) => (e.currentTarget.style.display = 'none')} />
      </div>
    </div>
  );
}

export default function HumanGate({ children }) {
  const enabled = !!SITE_KEY && !BOTS.test(navigator.userAgent || '');
  const [ok, setOk] = useState(() => !enabled || !!readPass());

  useEffect(() => {
    const need = () => setOk(false);
    window.addEventListener('hv:required', need);
    return () => window.removeEventListener('hv:required', need);
  }, []);

  if (!ok) return <Gate onPass={() => setOk(true)} />;
  return children;
}
