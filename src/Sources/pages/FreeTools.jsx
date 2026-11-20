// Free tools (no login, nothing is uploaded — everything runs in the visitor's browser):
//  • Fix a 3MF file that WhatsApp turned into .zip
//  • Arabic text for slicers that don't join Arabic letters
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { unzipSync } from 'fflate';
import { arabicForSlicer } from '../lib/arabicSlicer';
import '../Style/Home.css';
import '../Style/FreeTools.css';

function Fix3mf() {
  const [state, setState] = useState({ msg: '', ok: null });
  const [drag, setDrag] = useState(false);

  const fix = async (file) => {
    if (!file) return;
    setState({ msg: 'جارٍ الفحص…', ok: null });
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b) throw new Error('هالملف مش ملف 3MF ولا ZIP — تأكّد إنك اخترت الملف يلي وصلك على واتساب');
      let names = [];
      unzipSync(buf, { filter: (f) => { names.push(f.name); return false; } }); // list only, nothing extracted
      names = names.map((n) => n.toLowerCase());
      const is3mf = names.some((n) => n.endsWith('3dmodel.model')) || names.includes('[content_types].xml');
      if (!is3mf) throw new Error('هالـ ZIP ما فيه ملف 3MF — ممكن يكون ملف مضغوط عادي فيه ملفات تانية');
      const base = file.name.replace(/(\.3mf)?(\.zip)?$/i, '') || 'model';
      const blob = new Blob([buf], { type: 'model/3mf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${base}.3mf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setState({ msg: `✓ تم — نزل «${base}.3mf». افتحه بالـ slicer متل العادة.`, ok: true });
    } catch (e) {
      setState({ msg: e.message || 'تعذّر فتح الملف', ok: false });
    }
  };

  return (
    <section className="hm-section ft-tool" id="fix-3mf">
      <h2 className="hm-h2">تصليح ملف 3MF بعتوه على واتساب</h2>
      <p className="hm-sub">
        واتساب أحياناً بيحوّل ملفات .3mf لـ .zip، فما بيفتحوا بالـ slicer. اختار الملف هون وبيرجع .3mf متل ما كان.
        الملف ما بينرفع لأي مكان — كل شي بيصير على جهازك.
      </p>
      <label
        className={`ft-drop ${drag ? 'on' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); fix(e.dataTransfer.files?.[0]); }}
      >
        <input type="file" accept=".zip,.3mf,application/zip" onChange={(e) => { fix(e.target.files?.[0]); e.target.value = ''; }} hidden />
        <span className="ft-drop-title">اختار الملف أو اسحبه لهون</span>
        <span className="ft-drop-sub">ملف .zip وصلك على واتساب</span>
      </label>
      {state.msg && <p className={`ft-msg ${state.ok === true ? 'ok' : state.ok === false ? 'err' : ''}`}>{state.msg}</p>}
    </section>
  );
}

function ArabicText() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const out = arabicForSlicer(text);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(out);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="hm-section ft-tool" id="arabic-text">
      <h2 className="hm-h2">نص عربي للـ slicer</h2>
      <p className="hm-sub">
        برامج متل Bambu Studio وCura وPrusaSlicer بتكتب العربي حروف مقطّعة ومقلوبة. اكتب النص هون، انسخ النتيجة
        والصقها بأداة النص بالـ slicer — بتطلع الحروف موصولة وبالترتيب الصح.
      </p>
      <div className="ft-ar">
        <label className="ft-field">
          <span>اكتب النص</span>
          <textarea dir="rtl" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="مثلاً: عيد ميلاد سعيد يا لارا" />
        </label>
        <div className="ft-field">
          <span>النتيجة — هيدي يلي بتنسخها</span>
          <textarea dir="ltr" rows={3} value={out} readOnly className="ft-out" />
          <div className="ft-row">
            <button type="button" className="hm-btn hm-btn-primary hm-btn-sm" onClick={copy} disabled={!out}>
              {copied ? '✓ نسخت' : 'انسخ النتيجة'}
            </button>
            <small className="hm-sub">هيك رح تطلع بالـ slicer.</small>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────── calculators (inputs remembered on this device) ─────────────
function useSaved(key, initial) {
  const [v, setV] = useState(() => {
    try { return { ...initial, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return initial; }
  });
  const set = (k) => (e) => {
    const next = { ...v, [k]: e.target.value };
    setV(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  };
  return [v, set, setV];
}
const n = (x) => (Number.isFinite(parseFloat(x)) ? parseFloat(x) : 0);
const money = (x) => `$${(Math.round(x * 100) / 100).toFixed(2)}`;

function Field({ label, unit, value, onChange, step = 'any' }) {
  return (
    <label className="ft-num">
      <span>{label}</span>
      <span className="ft-num-in">
        <input type="number" inputMode="decimal" min="0" step={step} value={value} onChange={onChange} dir="ltr" />
        {unit && <em>{unit}</em>}
      </span>
    </label>
  );
}

const COST_DEFAULTS = { grams: 50, kgPrice: 20, hours: 3, watts: 100, kwh: 0.35, labourMin: 15, hourly: 5, wear: 0.15, fail: 10, markup: 100 };

function CostCalculator({ onCost }) {
  const [v, set] = useSaved('ft_cost', COST_DEFAULTS);
  const material = (n(v.grams) / 1000) * n(v.kgPrice);
  const power = (n(v.watts) / 1000) * n(v.hours) * n(v.kwh);
  const labour = (n(v.labourMin) / 60) * n(v.hourly);
  const wear = n(v.hours) * n(v.wear);
  const base = material + power + labour + wear;
  const failure = base * (n(v.fail) / 100);
  const cost = base + failure;
  const price = cost * (1 + n(v.markup) / 100);
  return (
    <section className="hm-section ft-tool" id="cost">
      <h2 className="hm-h2">حاسبة كلفة الطباعة</h2>
      <p className="hm-sub">كل شي بيدخل بكلفة القطعة: الخيط، الكهربا، وقتك، تعب الطابعة، والقطع يلي بتفشل — وبعدين سعر البيع بالربح يلي بتحدّده.</p>
      <div className="ft-calc">
        <div className="ft-grid">
          <Field label="وزن القطعة" unit="غ" value={v.grams} onChange={set('grams')} />
          <Field label="سعر الكيلو خيط" unit="$" value={v.kgPrice} onChange={set('kgPrice')} />
          <Field label="وقت الطباعة" unit="ساعة" value={v.hours} onChange={set('hours')} />
          <Field label="استهلاك الطابعة" unit="واط" value={v.watts} onChange={set('watts')} />
          <Field label="سعر الكيلوواط" unit="$" value={v.kwh} onChange={set('kwh')} />
          <Field label="وقت شغلك (تجهيز وتنضيف)" unit="دقيقة" value={v.labourMin} onChange={set('labourMin')} />
          <Field label="أجرك بالساعة" unit="$" value={v.hourly} onChange={set('hourly')} />
          <Field label="تعب الطابعة بالساعة" unit="$" value={v.wear} onChange={set('wear')} />
          <Field label="نسبة الفشل" unit="%" value={v.fail} onChange={set('fail')} />
          <Field label="نسبة الربح" unit="%" value={v.markup} onChange={set('markup')} />
        </div>
        <dl className="ft-result">
          <div><dt>الخيط</dt><dd>{money(material)}</dd></div>
          <div><dt>الكهربا</dt><dd>{money(power)}</dd></div>
          <div><dt>شغلك</dt><dd>{money(labour)}</dd></div>
          <div><dt>تعب الطابعة</dt><dd>{money(wear)}</dd></div>
          <div><dt>احتياط الفشل</dt><dd>{money(failure)}</dd></div>
          <div className="ft-total"><dt>الكلفة</dt><dd>{money(cost)}</dd></div>
          <div className="ft-total ft-main"><dt>سعر البيع المقترح</dt><dd>{money(price)}</dd></div>
          <button type="button" className="hm-btn hm-btn-ghost hm-btn-sm" onClick={() => onCost(Math.round(cost * 100) / 100, Math.round(price * 100) / 100)}>
            استعمل هالأرقام بحاسبة الربح
          </button>
        </dl>
      </div>
    </section>
  );
}

const PROFIT_DEFAULTS = { price: 15, cost: 5, feePct: 0, feeFixed: 0, vat: 0, shipping: 3, ads: 1, packaging: 0.5 };

function ProfitCalculator({ v, set }) {
  const price = n(v.price);
  const vat = price - price / (1 + n(v.vat) / 100);
  const fees = price * (n(v.feePct) / 100) + n(v.feeFixed);
  const costs = n(v.cost) + n(v.shipping) + n(v.ads) + n(v.packaging);
  const profit = price - vat - fees - costs;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  return (
    <section className="hm-section ft-tool" id="profit">
      <h2 className="hm-h2">حاسبة الربح من كل بيعة</h2>
      <p className="hm-sub">شو بيبقالك فعلياً من سعر البيع بعد العمولات والضريبة والتوصيل والإعلانات والتغليف.</p>
      <div className="ft-calc">
        <div className="ft-grid">
          <Field label="سعر البيع" unit="$" value={v.price} onChange={set('price')} />
          <Field label="كلفة القطعة" unit="$" value={v.cost} onChange={set('cost')} />
          <Field label="عمولة المنصّة / الدفع" unit="%" value={v.feePct} onChange={set('feePct')} />
          <Field label="رسوم ثابتة لكل بيعة" unit="$" value={v.feeFixed} onChange={set('feeFixed')} />
          <Field label="الضريبة (من ضمن السعر)" unit="%" value={v.vat} onChange={set('vat')} />
          <Field label="التوصيل" unit="$" value={v.shipping} onChange={set('shipping')} />
          <Field label="إعلانات لكل بيعة" unit="$" value={v.ads} onChange={set('ads')} />
          <Field label="تغليف" unit="$" value={v.packaging} onChange={set('packaging')} />
        </div>
        <dl className="ft-result">
          <div><dt>الضريبة</dt><dd>{money(vat)}</dd></div>
          <div><dt>العمولات</dt><dd>{money(fees)}</dd></div>
          <div><dt>الكلفة والمصاريف</dt><dd>{money(costs)}</dd></div>
          <div className={`ft-total ft-main ${profit < 0 ? 'ft-neg' : ''}`}><dt>الربح الصافي</dt><dd>{money(profit)}</dd></div>
          <div className="ft-total"><dt>هامش الربح</dt><dd dir="ltr">{margin.toFixed(1)}%</dd></div>
          {profit < 0 && <p className="ft-msg err">عم تخسر بهالبيعة — ارفع السعر أو خفّف المصاريف.</p>}
        </dl>
      </div>
    </section>
  );
}

function Calculators() {
  const [pv, pset, setPv] = useSaved('ft_profit', PROFIT_DEFAULTS);
  const useCost = (cost, price) => {
    const next = { ...pv, cost, price };
    setPv(next);
    try { localStorage.setItem('ft_profit', JSON.stringify(next)); } catch {}
    document.getElementById('profit')?.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <>
      <CostCalculator onCost={useCost} />
      <ProfitCalculator v={pv} set={pset} />
    </>
  );
}

export default function FreeTools() {
  return (
    <div className="hm ft" dir="rtl">
      <section className="ft-intro">
        <h1 className="ab-title">أدوات مجانية للطباعة ثلاثية الأبعاد</h1>
        <p className="hm-lead">بلا تسجيل وبلا رفع ملفات — كلها بتشتغل على جهازك.</p>
        <nav className="ft-jump">
          <a href="#fix-3mf">تصليح ملف 3MF</a>
          <a href="#arabic-text">نص عربي للـ slicer</a>
          <a href="#cost">حاسبة الكلفة</a>
          <a href="#profit">حاسبة الربح</a>
          <Link to="/studio">صمّم بالـ Studio</Link>
        </nav>
      </section>
      <Fix3mf />
      <ArabicText />
      <Calculators />
    </div>
  );
}
