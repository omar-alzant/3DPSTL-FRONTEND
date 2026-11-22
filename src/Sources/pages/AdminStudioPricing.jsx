import React, { useEffect, useMemo, useState } from 'react';
import { getSettings, saveSettings } from '../studio/lib/api.js';
import { priceFor, TIME_DEFAULTS, formatMinutes } from '../studio/lib/pricing.js';
import { TOOLS as TEMPLATE_TOOLS } from '../studio/tools/index.js';
import { SPLIT_TOOL } from '../studio/split/meta.js';
import '../Style/Studio.css';
import { PageLoader } from '../components/BrandSpinner';
import { useLang } from '../i18n/LanguageContext';

// templates + the split tool (it has a price and an on/off switch too)
const TOOLS = [...TEMPLATE_TOOLS, { id: SPLIT_TOOL.id, name: SPLIT_TOOL.nameAr, params: [] }];

// Admin → Studio Pricing: global prices + per-tool overrides, saved in Supabase (studio_settings)

const toForm = (s) => ({
  currency: s.currency || 'USD',
  pricePerGram: s.pricePerGram ?? '',
  minPrice: s.minPrice ?? '',
  colorFee: s.colorFee ?? 0,
  pricePerHour: s.pricePerHour ?? 0,
  printFlow: s.printFlow ?? TIME_DEFAULTS.printFlow,
  swapSeconds: s.swapSeconds ?? TIME_DEFAULTS.swapSeconds,
  startupMinutes: s.startupMinutes ?? TIME_DEFAULTS.startupMinutes,
  whatsapp: s.whatsapp || '',
  creditsPerDownload: s.creditsPerDownload ?? 0,
  payment: s.payment || {}, // edited in Admin → Credits; kept as-is here
  tools: Object.fromEntries(
    TOOLS.map((t) => {
      const v = s.tools?.[t.id] || {};
      return [t.id, {
        enabled: v.enabled !== false,
        pricePerGram: v.pricePerGram ?? '',
        minPrice: v.minPrice ?? '',
        setupFee: v.setupFee ?? 0,
        credits: v.credits ?? '',
      }];
    })
  ),
});

function Num({ value, onChange, placeholder, step = '0.01' }) {
  return (
    <input
      type="number"
      min="0"
      step={step}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function AdminStudioPricing() {
  const { tx } = useLang();
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [state, setState] = useState({ saving: false, error: null, ok: false });
  const [preview, setPreview] = useState({ tool: TOOLS[0].id, grams: 20, colors: 2, minutes: 60 });

  const load = async () => {
    setState({ saving: false, error: null, ok: false });
    try {
      const f = toForm(await getSettings());
      setForm(f);
      setSaved(JSON.stringify(f));
    } catch (e) {
      setState((s) => ({ ...s, error: e.message }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const dirty = form && JSON.stringify(form) !== saved;
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setTool = (id, k) => (v) =>
    setForm((f) => ({ ...f, tools: { ...f.tools, [id]: { ...f.tools[id], [k]: v } } }));

  const previewPrice = useMemo(() => {
    if (!form) return 0;
    return priceFor(form, preview.tool, Number(preview.grams) || 0, Number(preview.colors) || 1, Number(preview.minutes) || 0);
  }, [form, preview]);

  const save = async () => {
    setState({ saving: true, error: null, ok: false });
    try {
      const f = toForm(await saveSettings(form));
      setForm(f);
      setSaved(JSON.stringify(f));
      setState({ saving: false, error: null, ok: true });
      setTimeout(() => setState((s) => ({ ...s, ok: false })), 2500);
    } catch (e) {
      setState({ saving: false, error: e.message, ok: false });
    }
  };

  if (!form)
    return (
      <div className="sd-admin">
        {state.error ? <p className="sd-error">{state.error}</p> : <PageLoader />}
      </div>
    );

  const cur = form.currency || '';

  return (
    <div className="sd-admin sd-pricing">
      <div className="sd-admin-head">
        <div>
          <h5 className="m-0">{tx('Studio pricing', 'تسعير الاستوديو')}</h5>
          <small className="sd-muted">
            Price = max(minimum, grams × price per gram + extra-colour fee × (colours − 1) + setup fee + print hours × price per hour)
          </small>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {state.ok && <span className="sd-ok">{tx('Saved ✓', 'تم الحفظ ✓')}</span>}
          {dirty && !state.saving && <span className="sd-muted">{tx('Unsaved changes', 'تعديلات غير محفوظة')}</span>}
          <button className="sd-btn" onClick={load} disabled={state.saving}>{tx('Reset', 'إعادة الضبط')}</button>
          <button className="sd-btn sd-primary" onClick={save} disabled={!dirty || state.saving}>
            {state.saving ? tx('Saving…', 'جارٍ الحفظ…') : tx('Save', 'حفظ')}
          </button>
        </div>
      </div>
      {state.error && <p className="sd-error">{state.error}</p>}

      <div className="sd-pricing-grid">
        <section className="sd-box">
          <h6>{tx('Default prices', 'الأسعار الافتراضية')}</h6>
          <div className="sd-form-grid">
            <label>{tx('Currency', 'العملة')}<input type="text" value={form.currency} maxLength={8} onChange={(e) => set('currency')(e.target.value.toUpperCase())} /></label>
            <label>Price per gram ({cur})<Num value={form.pricePerGram} onChange={set('pricePerGram')} step="0.001" /></label>
            <label>Minimum price per piece ({cur})<Num value={form.minPrice} onChange={set('minPrice')} /></label>
            <label>Fee per extra colour ({cur})<Num value={form.colorFee} onChange={set('colorFee')} /></label>
            <label>Price per print hour ({cur})<Num value={form.pricePerHour} onChange={set('pricePerHour')} /></label>
            <label>{tx('Credits per file download (default)', 'كريدت لكل تنزيل ملف (افتراضي)')}<Num value={form.creditsPerDownload} onChange={set('creditsPerDownload')} step="1" /></label>
            <label className="sd-span-2">WhatsApp number for orders (international, no +)
              <input type="text" value={form.whatsapp} placeholder="96176118290" onChange={(e) => set('whatsapp')(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="sd-box">
          <h6>{tx('Price preview', 'معاينة السعر')}</h6>
          <div className="sd-form-grid">
            <label className="sd-span-2">{tx('Tool', 'الأداة')}
              <select value={preview.tool} onChange={(e) => setPreview({ ...preview, tool: e.target.value })}>
                {TOOLS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label>{tx('Weight (g)', 'الوزن (غ)')}<Num value={preview.grams} onChange={(v) => setPreview({ ...preview, grams: v })} step="0.5" /></label>
            <label>{tx('Colours', 'الألوان')}<Num value={preview.colors} onChange={(v) => setPreview({ ...preview, colors: v })} step="1" /></label>
            <label>{tx('Print time (min)', 'وقت الطباعة (دقيقة)')}<Num value={preview.minutes} onChange={(v) => setPreview({ ...preview, minutes: v })} step="5" /></label>
          </div>
          <p className="sd-preview">
            {previewPrice.toFixed(2)} <small>{cur}</small>
          </p>
          <small className="sd-muted">{tx('The customer sees this as the estimated price in the Studio.', 'هذا ما يراه الزبون كسعر تقريبي في الاستوديو.')}</small>
        </section>
      </div>

      <section className="sd-box mt-3">
        <h6>{tx('Print time estimate', 'تقدير وقت الطباعة')}</h6>
        <small className="sd-muted d-block mb-2">
          Time = plastic volume ÷ print speed + layers × 2 s + filament swaps × swap time + start-up.
          {tx('Compare with Bambu Studio\'s estimate for one of your prints and adjust the speed until they match.', 'قارن مع تقدير Bambu Studio لإحدى طبعاتك وعدّل السرعة حتى يتطابقا.')}
          Example with these settings: 100 g, 2 colours, 40 swaps ≈ {formatMinutes(((100 / 1.24) * 1000) / (Number(form.printFlow) || 7) / 60 + (40 * (Number(form.swapSeconds) || 0)) / 60 + (Number(form.startupMinutes) || 0))}.
        </small>
        <div className="sd-form-grid">
          <label>{tx('Average print speed (mm³/s)', 'متوسط سرعة الطباعة (مم³/ث)')}<Num value={form.printFlow} onChange={set('printFlow')} step="0.5" /></label>
          <label>{tx('Seconds per filament swap', 'ثوانٍ لكل تبديل خيط')}<Num value={form.swapSeconds} onChange={set('swapSeconds')} step="5" /></label>
          <label>{tx('Start-up (heating + calibration), min', 'التحضير (تسخين + معايرة)، دقيقة')}<Num value={form.startupMinutes} onChange={set('startupMinutes')} step="1" /></label>
        </div>
      </section>

      <section className="sd-box mt-3">
        <h6>{tx('Per-tool prices', 'أسعار كل أداة')}</h6>
        <small className="sd-muted d-block mb-2">{tx('Credits / download: what downloading this tool’s files costs (0 = free, empty = default). Admins never pay. Leave a field empty to use the default price. Hidden tools disappear from the Studio page.', 'كريدت / تنزيل: كلفة تنزيل ملفات هذه الأداة (0 = مجاني، فارغ = الافتراضي). الأدمن لا يدفع أبداً. اترك الخانة فارغة لاستعمال السعر الافتراضي. الأدوات المخفية تختفي من صفحة الاستوديو.')}</small>
        <div className="sd-table-wrap">
          <table className="sd-table">
            <thead>
              <tr>
                <th>{tx('Tool', 'الأداة')}</th>
                <th>{tx('Shown', 'ظاهر')}</th>
                <th>Price / g ({cur})</th>
                <th>Minimum ({cur})</th>
                <th>Setup fee ({cur})</th>
                <th>{tx('Credits / download', 'كريدت / تنزيل')}</th>
              </tr>
            </thead>
            <tbody>
              {TOOLS.map((t) => {
                const v = form.tools[t.id];
                return (
                  <tr key={t.id} className={v.enabled ? '' : 'sd-off'}>
                    <td>
                      <b dir="auto">{t.name}</b>
                      <div className="sd-muted small">{t.id}</div>
                    </td>
                    <td>
                      <label className="sd-switch">
                        <input type="checkbox" checked={v.enabled} onChange={(e) => setTool(t.id, 'enabled')(e.target.checked)} />
                        <span />
                      </label>
                    </td>
                    <td><Num value={v.pricePerGram} onChange={setTool(t.id, 'pricePerGram')} placeholder={String(form.pricePerGram)} step="0.001" /></td>
                    <td><Num value={v.minPrice} onChange={setTool(t.id, 'minPrice')} placeholder={String(form.minPrice)} /></td>
                    <td><Num value={v.setupFee} onChange={setTool(t.id, 'setupFee')} /></td>
                    <td><Num value={v.credits} onChange={setTool(t.id, 'credits')} placeholder={String(form.creditsPerDownload || 0)} step="1" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
