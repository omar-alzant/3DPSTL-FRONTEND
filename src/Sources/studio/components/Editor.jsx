import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { defaults } from '../tools/index.js';
import { useBuild } from '../lib/useBuild.js';
import { exportSTL, exportSTLByColor, exportBambu3MF } from '../lib/export.js';
import { designLink } from '../lib/api.js';
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

export default function Editor({ tool, initial, config, orderId, downloadId }) {
  const { token, isAdmin } = useAuth();
  const { tx } = useLang();
  const t = useT();
  // a design saved before the customer went to log in comes back here (with its logo)
  const [pending] = useState(() => peekPending(tool.id));
  useEffect(() => {
    if (pending) clearPending();
    try { sessionStorage.removeItem('studioIntent'); } catch {}
  }, [pending]);
  const [params, setParams] = useState(() => ({ ...defaults(tool), ...(initial || {}), ...(pending || {}) }));
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
  // colours: only the filament colours in stock (admins can still pick any colour)
  const [palette, setPalette] = useState([]);
  useEffect(() => { loadPalette().then(setPalette); }, []);
  useEffect(() => {
    if (!palette.length || isAdmin) return;
    setParams((p) => snapColors(tool, p, palette));
  }, [palette, tool, isAdmin]);

  // photo colours snap to the stock list too, so rebuild once it arrives
  useEffect(() => { setStockPalette(palette); }, [palette]);
  const buildParams = useMemo(() => (palette.length ? { ...params, _stock: palette.length } : params), [params, palette.length]);
  const { parts, stats, error, busy } = useBuild(tool, buildParams);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setParams({ ...defaults(tool), ...(initial || {}), ...(pending || {}) }), [tool]);

  const onChange = (k, v) => setParams((p) => ({ ...p, [k]: v }));
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
    try {
      await navigator.clipboard.writeText(designLink(tool.id, params));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
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
        <div className="sd-canvas-wrap">
          <Viewer parts={parts} fitKey={tool.id} />
          {busy && <div className="sd-badge">{tx('Updating…', 'جارٍ التحديث…')}</div>}
          {error && <div className="sd-badge sd-err">{tx('Error:', 'خطأ:')} {t(error)}</div>}
          {stats && (
            <div className="sd-mini">
              <span>
                {showPrice && <b>{price.toFixed(2)} {config.currency}</b>}{isAdmin && <> · {formatMinutes(minutes)}</>}
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
              {isAdmin && <div><dt>{tx('Approx. print time', 'وقت الطباعة التقريبي')} <span className="sd-muted">(admin)</span></dt><dd>{formatMinutes(minutes)}</dd></div>}
              <div><dt>{tx('Colours', 'الألوان')}</dt><dd>{colors}</dd></div>
              {showPrice && <div><dt>{tx('Approx. price', 'السعر التقريبي')}{adminOnly}</dt><dd><b>{price.toFixed(2)} {config.currency}</b></dd></div>}
            </dl>
          )}
          <div className="sd-actions">
            <button className="sd-btn sd-primary" disabled={!parts?.length} onClick={() => setOrder(true)}>{tx('Order the print', 'اطلب الطباعة')}</button>
            <button className="sd-btn" disabled={!parts?.length} onClick={() => download(() => exportSTL(parts, name))}>{tx('Download STL', 'تحميل STL')}{tag}</button>
            <button className="sd-btn" disabled={!parts?.length} onClick={() => download(() => exportBambu3MF(parts, name))} title={tx('Bambu Studio project (A1 printer) that opens with the colours you chose', 'مشروع Bambu Studio (طابعة A1) يفتح بنفس الألوان التي اخترتها')}>{tx('3MF file', '3MF ملف')}{tag}</button>
            <button className="sd-btn" disabled={!parts?.length} onClick={() => download(() => exportSTLByColor(parts, name))}>{tx('STL per colour', 'STL لكل لون')}{tag}</button>
            <button className="sd-btn sd-link" onClick={copyLink}>{copied ? tx('Copied ✓', 'تم النسخ ✓') : tx('Copy design link', 'نسخ رابط التصميم')}</button>
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
        <OrderDialog tool={tool} params={params} stats={stats} price={price} minutes={minutes} config={config} onClose={() => setOrder(false)} />
      )}
    </div>
  );
}
