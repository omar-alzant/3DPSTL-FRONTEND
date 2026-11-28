import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { defaults } from '../tools/index.js';
import { useBuild } from '../lib/useBuild.js';
import { exportSTL, exportSTLByColor, exportBambu3MF } from '../lib/export.js';
import { designLink, hasPictures, withSharedPictures } from '../lib/api.js';
import { priceFor, printMinutes, formatMinutes, toolCredits } from '../lib/pricing.js';
import { spendCredits, designHash } from '../lib/credits.js';
import { useCredits } from '../../context/CreditsContext';
import { peekPending, clearPending, savePending } from '../lib/pending.js';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../i18n/LanguageContext';
import { useT } from '../i18n/index.js';
import ParamPanel from './ParamPanel.jsx';
import Viewer from './Viewer.jsx';
import OrderDialog from './OrderDialog.jsx';
import { loadPalette, snapColors, setStockPalette } from '../lib/palette.js';
import { forBuild } from '../lib/samples.js';
import { fitParams } from '../lib/limits.js';

export default function Editor({ tool, initial, config, orderId, downloadId }) {
  const { token, isAdmin } = useAuth();
  const { tx, lang } = useLang();
  const t = useT();
  // a design saved before the customer went to log in comes back here (with its logo)
  const [pending] = useState(() => peekPending(tool.id));
  useEffect(() => {
    if (pending) clearPending();
    try { sessionStorage.removeItem('studioIntent'); } catch {}
  }, [pending]);
  const [params, setParams] = useState(() => fitParams(tool, { ...defaults(tool), ...(initial || {}), ...(pending || {}) }));
  // رجع من تسجيل الدخول: افتح نافذة الطلب، إلا إذا ذهب ليُنزّل ملفاً أو ليشحن رصيده
  const [order, setOrder] = useState(() => {
    try { if (sessionStorage.getItem('studioIntent') === 'download') return false; } catch {}
    return !!(pending && token);
  });
  const keepForDownload = () => {
    savePending(tool.id, params);
    try { sessionStorage.setItem('studioIntent', 'download'); } catch {}
  };
  const [copied, setCopied] = useState(false);
  // size reference next to the design (a phone or a bank card), remembered between tools
  const [compare, setCompare] = useState(() => { try { return localStorage.getItem('sdCompare') || 'none'; } catch { return 'none'; } });
  const pickCompare = (v) => { setCompare(v); try { localStorage.setItem('sdCompare', v); } catch {} };
  // inside view: cut the preview open to check the inside (on screen only, the files stay whole)
  const [section, setSection] = useState(null); // null | { axis: 'x' | 'y' | 'z', at: 0..1 }
  // the 3D preview can open over the whole screen and back (Esc closes it)
  const [big, setBig] = useState(false);
  useEffect(() => {
    if (!big) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setBig(false); };
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = before; window.removeEventListener('keydown', onKey); };
  }, [big]);
  // colours: only the filament colours in stock (admins can still pick any colour)
  const [palette, setPalette] = useState([]);
  useEffect(() => { loadPalette().then(setPalette); }, []);
  useEffect(() => {
    if (!palette.length || isAdmin) return;
    setParams((p) => snapColors(tool, p, palette));
  }, [palette, tool, isAdmin]);

  // photo colours snap to the stock list too, so rebuild once it arrives
  useEffect(() => { setStockPalette(palette); }, [palette]);
  // pictures not uploaded yet → a sample picture, so the customer sees a design straight away
  // + Arabic typed with an English-only font is drawn with an Arabic font
  const { params: prepared, swapped } = useMemo(() => forBuild(tool, params), [tool, params]);
  const buildParams = useMemo(() => (palette.length ? { ...prepared, _stock: palette.length } : prepared), [prepared, palette.length]);
  const { parts, stats, error, busy } = useBuild(tool, buildParams);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setParams(fitParams(tool, { ...defaults(tool), ...(initial || {}), ...(pending || {}) })), [tool]);

  // every change stays inside what the tool can build (limits can depend on other settings)
  // a build that didn't work: a short hint (never the word "error"); the last good design stays on screen
  const friendly = (msg) => (msg === 'empty'
    ? tx('Type something to start your design', 'اكتب شي لنبلّش التصميم')
    : /[\u0600-\u06FF]/.test(msg) ? t(msg) : tx('That change didn’t work here — try another value', 'هالتعديل ما زبط هون، جرّب قيمة تانية'));
  const onChange = (k, v) => setParams((p) => fitParams(tool, { ...p, [k]: v }));
  // التصميم المفتوح من طلب: كل الملفات المنزّلة تبدأ برقم الطلب (مثل ST-261118-A3F9-birth-sign.3mf)
  const name = orderId ? `${orderId}-${tool.id}` : `${tool.id}-${params.text || params.name || params.digits || ''}`;
  const colors = parts ? new Set(parts.map((p) => p.color)).size : 0;
  const minutes = stats ? printMinutes(stats, config) : 0;
  const price = stats ? priceFor(config, tool.id, stats.grams, colors, minutes) : 0;
  // prices are shown to customers only if the admin turned them on; the admin always sees them
  const showPrice = config.showPrices === true || isAdmin;
  const adminOnly = !config.showPrices && isAdmin ? <span className="sd-muted"> (admin)</span> : null;

  // ——— الكريدت: كل تنزيل ملف يخصم قيمة الأداة (الأدمن مجاني، ونفس التصميم لا يُخصم مرتين) ———
  const cost = isAdmin ? 0 : toolCredits(config, tool.id);
  const { balance, setBalance } = useCredits();
  const [paid, setPaid] = useState(() => new Set());
  const [gate, setGate] = useState(null); // { step: 'login' | 'confirm' | 'busy' | 'low', run, hash, error }
  const label = String(params.text || params.name || params.digits || params.title || '').slice(0, 80);
  const download = async (run) => {
    if (isAdmin) return run();
    const hash = await designHash(tool.id, params);
    if (paid.has(hash)) return run();
    if (!token) {
      if (cost === 0) return run();
      return setGate({ step: 'login', run, hash });
    }
    const body = { toolId: tool.id, hash, params, toolName: tool.name, label, downloadId };
    if (cost > 0) {
      // فحص بلا خصم: هل دفع ثمن هذا التصميم سابقاً؟
      try {
        const chk = await spendCredits({ ...body, dry: true });
        if (!chk.already) {
          if (typeof chk.balance === 'number') setBalance(chk.balance);
          return setGate({ step: chk.balance < cost ? 'low' : 'confirm', run, hash });
        }
      } catch (e) {
        return setGate({ step: 'confirm', run, hash, error: e.message });
      }
    }
    // مجاني أو مدفوع سابقاً: يُسجَّل في «ملفاتي» ويُنزَّل مباشرة
    try {
      const r = await spendCredits(body);
      if (typeof r.balance === 'number') setBalance(r.balance);
      setPaid((s) => new Set(s).add(hash));
      run();
    } catch (e) {
      if (cost === 0) return run();
      setGate({ step: e.status === 402 ? 'low' : 'confirm', run, hash, error: e.status === 402 ? null : e.message });
    }
  };
  const confirmDownload = async () => {
    const g = gate;
    setGate({ ...g, step: 'busy', error: null });
    try {
      const r = await spendCredits({ toolId: tool.id, hash: g.hash, params, toolName: tool.name, label, downloadId });
      if (typeof r.balance === 'number') setBalance(r.balance);
      setPaid((s) => new Set(s).add(g.hash));
      setGate(null);
      g.run();
    } catch (e) {
      if (e.status === 402) {
        if (typeof e.data?.balance === 'number') setBalance(e.data.balance);
        setGate({ ...g, step: 'low' });
      } else setGate({ ...g, step: 'confirm', error: e.message });
    }
  };
  const tag = cost > 0 ? <small className="sd-cost"> · {cost} {tx('credits', 'كريدت')}</small> : null;

  const copyLink = async () => {
    if (copied === 'busy') return;
    let link = designLink(tool.id, params);
    if (hasPictures(params)) {
      // pictures are stored first, so whoever opens the link sees the whole design
      setCopied('busy');
      try {
        link = designLink(tool.id, await withSharedPictures(params));
      } catch {
        setCopied('pics'); // couldn't store them: copy the link without pictures and say so
      }
    }
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt(tx('Copy the link:', 'انسخ الرابط:'), link); // some browsers refuse after a wait
    }
    setCopied((c) => (c === 'pics' ? 'pics' : true));
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="sd-editor">
      <aside className="sd-panel">
        <Link className="sd-back" to="/studio">{tx('← All templates', '→ كل الأدوات')}</Link>
        {orderId && <div className="sd-order-tag">{tx('Order', 'طلب رقم')} <b dir="ltr">{orderId}</b> — {tx('every downloaded file carries this number', 'كل الملفات المنزّلة تحمل هذا الرقم')}</div>}
        <h1>{t(tool.name)}</h1>
        <p className="sd-muted">{t(tool.description)}</p>
        <ParamPanel tool={tool} params={params} onChange={onChange} palette={palette} isAdmin={isAdmin} />
        <button className="sd-btn sd-link" onClick={() => setParams(defaults(tool))}>{tx('Reset', 'إعادة الضبط')}</button>
      </aside>

      <section className="sd-stage">
        <div className={`sd-canvas-wrap${big ? ' is-big' : ''}`}>
          <Viewer parts={parts} fitKey={big ? `${tool.id}-big` : tool.id} compare={compare} section={section} />
          <button
            type="button"
            className={`sd-zoom-btn sd-section-btn${section ? ' on' : ''}`}
            onClick={() => setSection((x) => (x ? null : { axis: 'y', at: 0.5 }))}
            aria-pressed={!!section}
            aria-label={section ? tx('Close the inside view', 'سكّر الشوف من جوّا') : tx('See inside', 'شوف من جوّا')}
            title={section ? tx('Close the inside view', 'سكّر الشوف من جوّا') : tx('See inside', 'شوف من جوّا')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 5h7v14H4zM14 5h6M14 19h6M14 12h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {section && (
            <div className="sd-section" role="group" aria-label={tx('Inside view', 'الشوف من جوّا')}>
              <div className="sd-section-axes">
                {[['x', tx('Across', 'بالعرض')], ['y', tx('Front to back', 'من قدّام لورا')], ['z', tx('Height', 'بالارتفاع')]].map(([k, label]) => (
                  <button key={k} type="button" className={section.axis === k ? 'on' : ''} aria-pressed={section.axis === k} onClick={() => setSection((x) => ({ ...x, axis: k }))}>{label}</button>
                ))}
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.005"
                value={section.at}
                onChange={(e) => setSection((x) => ({ ...x, at: Number(e.target.value) }))}
                aria-label={tx('Where to cut the view', 'وين تقص الشوف')}
              />
              <small>{tx('Only the view is cut, your files stay whole.', 'القص عالشاشة بس، ملفاتك بتضل كاملة.')}</small>
            </div>
          )}
          <button
            type="button"
            className="sd-zoom-btn"
            onClick={() => setBig((b) => !b)}
            aria-pressed={big}
            aria-label={big ? tx('Make the preview smaller', 'صغّر المعاينة') : tx('Make the preview full screen', 'كبّر المعاينة')}
            title={big ? tx('Smaller (Esc)', 'صغّر (Esc)') : tx('Full screen', 'كبّر')}
          >
            {big ? (
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
          </button>
          {parts?.length > 0 && (
            <div className="sd-compare" role="group" aria-label={tx('Compare the size', 'قارن الحجم')}>
              <span>{tx('Compare size:', 'قارن الحجم:')}</span>
              {[['phone', tx('Phone', 'تلفون')], ['card', tx('Bank card', 'بطاقة بنك')]].map(([k, label]) => (
                <button key={k} type="button" aria-pressed={compare === k} className={compare === k ? 'on' : ''} onClick={() => pickCompare(compare === k ? 'none' : k)}>
                  {label}
                </button>
              ))}
              {compare === 'phone' && <small>{tx('a phone is about 14.7 × 7.2 cm', 'التلفون تقريباً 14.7 × 7.2 سم')}</small>}
              {compare === 'card' && <small>{tx('a bank card is 8.6 × 5.4 cm', 'البطاقة 8.6 × 5.4 سم')}</small>}
            </div>
          )}
          {busy && <div className="sd-badge">{tx('Updating…', 'جارٍ التحديث…')}</div>}
          {error ? (
            <div className="sd-badge sd-hint" role="status">{friendly(error)}</div>
          ) : swapped.length > 0 && (
            <div className="sd-badge sd-hint" role="status">{tx('This font is English-only, so the Arabic is written in Cairo', 'هالخط للإنكليزي بس، فكتبنا العربي بخط القاهرة')}</div>
          )}
          {stats && (
            <div className="sd-mini">
              <span>
                {showPrice && <b>{price.toFixed(2)} {config.currency}</b>}{isAdmin && <> · {formatMinutes(minutes, lang)}</>}
              </span>
              <button
                type="button"
                className="sd-btn sd-primary"
                onClick={() => document.querySelector('.sd-bar')?.scrollIntoView({ behavior: 'smooth', block: 'end' })}
              >
                {tx('Order ↓', 'اطلب ↓')}
              </button>
            </div>
          )}
        </div>
        <div className="sd-bar">
          {stats && (
            <dl className="sd-stats">
              <div><dt>{tx('Size', 'المقاس')}</dt><dd dir="ltr">{stats.size.x.toFixed(1)} × {stats.size.y.toFixed(1)} × {stats.size.z.toFixed(1)} mm</dd></div>
              <div><dt>{tx('Approx. weight', 'الوزن التقريبي')}</dt><dd>{stats.grams.toFixed(1)} {tx('g', 'غ')}</dd></div>
              {isAdmin && <div><dt>{tx('Approx. print time', 'وقت الطباعة التقريبي')} <span className="sd-muted">(admin)</span></dt><dd>{formatMinutes(minutes, lang)}</dd></div>}
              <div><dt>{tx('Colours', 'الألوان')}</dt><dd>{colors}</dd></div>
              {showPrice && <div><dt>{tx('Approx. price', 'السعر التقريبي')}{adminOnly}</dt><dd><b>{price.toFixed(2)} {config.currency}</b></dd></div>}
            </dl>
          )}
          <div className="sd-actions">
            <button className="sd-btn sd-primary" disabled={!parts?.length || !!error} onClick={() => setOrder(true)}>{tx('Order the print', 'اطلب الطباعة')}</button>
            <button className="sd-btn" disabled={!parts?.length || !!error} onClick={() => download(() => exportSTL(parts, name))}>{tx('Download STL', 'تحميل STL')}{tag}</button>
            <button className="sd-btn" disabled={!parts?.length || !!error} onClick={() => download(() => exportBambu3MF(parts, name))} title={tx('Bambu Studio project (A1 printer) that opens with the colours you chose', 'مشروع Bambu Studio (طابعة A1) يفتح بنفس الألوان التي اخترتها')}>{tx('3MF file', '3MF ملف')}{tag}</button>
            <button className="sd-btn" disabled={!parts?.length || !!error} onClick={() => download(() => exportSTLByColor(parts, name))}>{tx('STL per colour', 'STL لكل لون')}{tag}</button>
            <button className="sd-btn sd-link" onClick={copyLink}>{copied === 'busy' ? tx('Preparing the link…', 'عم نجهّز الرابط…') : copied === 'pics' ? tx('Copied ✓ (without the pictures)', 'تم النسخ ✓ (بلا الصور)') : copied ? tx('Copied ✓', 'تم النسخ ✓') : tx('Copy design link', 'نسخ رابط التصميم')}</button>
          </div>
          {cost > 0 && (
            <p className="sd-credit-line">
              {tx('Downloading this design costs', 'تنزيل ملفات هذا التصميم يكلّف')} <b>{cost} {tx('credits', 'كريدت')}</b> {tx('(once, for every format).', '(مرة واحدة لكل الصيغ).')}
              {token && balance !== null && <> {tx('Your balance:', 'رصيدك:')} <b>{balance}</b>.</>} <Link to="/credits">{tx('Top up', 'اشحن رصيدك')}</Link>
            </p>
          )}
        </div>
      </section>

      {gate && (
        <div className="sd-modal-bg" onClick={() => gate.step !== 'busy' && setGate(null)}>
          <div className="sd-modal sd-gate" onClick={(e) => e.stopPropagation()}>
            <button className="sd-x" onClick={() => setGate(null)} aria-label={tx('Close', 'إغلاق')}>×</button>
            {gate.step === 'login' ? (
              <>
                <h3>{tx('Log in to download the file', 'سجّل الدخول لتنزيل الملف')}</h3>
                <p className="sd-muted">{tx('Downloading costs', 'تنزيل الملفات يكلّف')} <b>{cost} {tx('credits', 'كريدت')}</b> {tx('from your balance. Your design is saved and we’ll bring you back to it after you log in.', 'من رصيد حسابك. تصميمك محفوظ وسنعيدك إليه بعد تسجيل الدخول.')}</p>
                <div className="sd-row">
                  <Link className="sd-btn sd-primary" to="/login" onClick={keepForDownload}>{tx('Log in', 'تسجيل الدخول')}</Link>
                  <Link className="sd-btn" to="/register" onClick={keepForDownload}>{tx('Create account', 'إنشاء حساب')}</Link>
                </div>
              </>
            ) : gate.step === 'low' ? (
              <>
                <h3>{tx('Not enough credits', 'رصيدك لا يكفي')}</h3>
                <p className="sd-muted">{tx('This design needs', 'تنزيل هذا التصميم يحتاج')} <b>{cost} {tx('credits', 'كريدت')}</b>{tx(', and you have', '، ورصيدك')} <b>{balance ?? 0}</b>.</p>
                <div className="sd-row">
                  <Link className="sd-btn sd-primary" to="/credits" onClick={keepForDownload}>{tx('Top up', 'اشحن رصيدك')}</Link>
                  <button className="sd-btn" onClick={() => setGate(null)}>{tx('Later', 'لاحقاً')}</button>
                </div>
              </>
            ) : (
              <>
                <h3>{tx('Download the file', 'تنزيل الملف')}</h3>
                <p>{tx('This uses', 'سيُخصم')} <b>{cost} {tx('credits', 'كريدت')}</b> {tx('from your balance', 'من رصيدك')}{balance !== null && <> (<span dir="ltr">{balance} → {Math.max(0, balance - cost)}</span>)</>}.</p>
                <p className="sd-muted small">{tx('After that you can download this same design in every format (STL and 3MF) again for free, from “My files” too. Any change to the design = a new design.', 'بعدها تقدر تنزّل نفس التصميم بكل الصيغ (STL و3MF) مرة تانية ببلاش، كمان من «ملفاتي». أي تعديل على التصميم = تصميم جديد.')}</p>
                {gate.error && <p className="sd-error">{t(gate.error)}</p>}
                <div className="sd-row">
                  <button className="sd-btn sd-primary" disabled={gate.step === 'busy'} onClick={confirmDownload}>
                    {gate.step === 'busy' ? tx('Working…', 'جارٍ…') : tx('Confirm & download', 'تأكيد وتنزيل')}
                  </button>
                  <button className="sd-btn" disabled={gate.step === 'busy'} onClick={() => setGate(null)}>{tx('Cancel', 'إلغاء')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {order && stats && (
        <OrderDialog tool={tool} params={params} parts={parts} stats={stats} price={price} minutes={minutes} config={config} onClose={() => setOrder(false)} />
      )}
    </div>
  );
}
