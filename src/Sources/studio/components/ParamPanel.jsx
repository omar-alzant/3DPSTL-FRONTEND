import { useState, useEffect, useRef } from 'react';
import FontPicker from './FontPicker.jsx';
import ImagePrep from './ImagePrep.jsx';
import { colorsFor } from '../lib/palette.js';
import { sampleImage } from '../lib/samples.js';
import { lim, visibleOptions } from '../lib/limits.js';
import { useT } from '../i18n/index.js';
import { useLang } from '../../i18n/LanguageContext';
import { putModel, getModel, parseRef } from '../lib/modelStore.js';
import { loadPrepared, MODEL_EXT } from '../lib/loadModel.js';

function ImageField({ value, set, maxSize, sample }) {
  const { tx } = useLang();
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null); // مصدر الصورة داخل نافذة التجهيز
  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) return setErr(tx('Choose an image file', 'اختر ملف صورة'));
    setErr(null);
    setEditing(URL.createObjectURL(file));
  };
  const close = () => {
    if (editing?.startsWith('blob:')) URL.revokeObjectURL(editing);
    setEditing(null);
  };
  return (
    <div className="sd-image-field">
      {value ? <img src={value} alt="" /> : sample ? (
        <div className="sd-img-sample">
          <img src={sampleImage(sample)} alt="" />
          <span>{tx('Sample picture: upload yours', 'صورة تجريبية: ارفع صورتك')}</span>
        </div>
      ) : <div className="sd-img-empty">{tx('No picture', 'لا توجد صورة')}</div>}
      <div className="sd-img-actions">
        <label className="sd-btn">
          {value ? tx('Change', 'تغيير') : tx('Upload picture', 'رفع صورة')}
          <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={pick} hidden />
        </label>
        {value && <button type="button" className="sd-btn" onClick={() => setEditing(value)}>{tx('Edit', 'تعديل')}</button>}
        {value && <button type="button" className="sd-btn sd-link" onClick={() => set('')}>{tx('Remove', 'حذف')}</button>}
      </div>
      {err && <small className="sd-error">{err}</small>}
      {editing && (
        <ImagePrep
          src={editing}
          maxSize={maxSize}
          onCancel={close}
          onConfirm={(url) => {
            set(url);
            close();
          }}
        />
      )}
    </div>
  );
}

const MAX_MODEL_MB = 80;

/** upload of a 3D file (STL / OBJ / 3MF): kept in this browser, the settings keep a short reference */
function ModelField({ value, set }) {
  const { tx } = useLang();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);
  const ref = parseRef(value);

  useEffect(() => {
    let alive = true;
    setInfo(null);
    setErr(null);
    if (!value) return undefined;
    loadPrepared(value, getModel)
      .then((m) => alive && setInfo(m))
      .catch((e) => alive && setErr(e.message === 'missingModel'
        ? tx('This file isn’t saved on this device, upload it again', 'الملف مش محفوظ على هالجهاز، ارفعه من جديد')
        : tx('We couldn’t read this file', 'ما قدرنا نقرا هالملف')));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!MODEL_EXT.includes(ext)) return setErr(tx('Choose an STL, OBJ or 3MF file', 'اختار ملف STL أو OBJ أو 3MF'));
    if (file.size > MAX_MODEL_MB * 1024 * 1024) return setErr(tx(`The file is bigger than ${MAX_MODEL_MB} MB`, `الملف أكبر من ${MAX_MODEL_MB} ميغا`));
    setErr(null);
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      const r = await putModel(buffer, file.name);
      await loadPrepared(r, getModel); // reads it once now, so a broken file shows here
      set(r);
    } catch (x) {
      setErr(x.message === 'badType'
        ? tx('Choose an STL, OBJ or 3MF file', 'اختار ملف STL أو OBJ أو 3MF')
        : tx('We couldn’t read this file, try exporting it as STL again', 'ما قدرنا نقرا هالملف، جرّب تصدّره STL من جديد'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sd-model-field">
      {ref ? (
        <div className="sd-model-name">
          <strong dir="auto">{ref.name}</strong>
          {info && (
            <small>
              {info.original > info.tris
                ? tx(`${info.original.toLocaleString()} triangles, simplified to ${info.tris.toLocaleString()}`, `${info.original.toLocaleString()} مثلّث، خفّفناه لـ ${info.tris.toLocaleString()}`)
                : tx(`${info.tris.toLocaleString()} triangles`, `${info.tris.toLocaleString()} مثلّث`)}
            </small>
          )}
          {info?.open > 0 && (
            <small className="sd-warn">{tx('The file has gaps in its surface, the mold may come out wrong. Repair it if you can (e.g. in your slicer).', 'الملف فيه فتحات بسطحه، ممكن القالب يطلع غلط. إذا فيك صلّحه (مثلاً بالسلايسر).')}</small>
          )}
        </div>
      ) : (
        <div className="sd-img-sample">
          <span>{tx('Sample shape: upload your file', 'مجسّم تجريبي: ارفع ملفك')}</span>
        </div>
      )}
      <div className="sd-img-actions">
        <label className="sd-btn">
          {busy ? tx('Reading…', 'عم نقرا…') : value ? tx('Change', 'تغيير') : tx('Upload file', 'رفع ملف')}
          <input type="file" accept=".stl,.obj,.3mf" onChange={pick} hidden disabled={busy} />
        </label>
        {value && !busy && <button type="button" className="sd-btn sd-link" onClick={() => { setErr(null); set(''); }}>{tx('Remove', 'حذف')}</button>}
      </div>
      <small className="sd-muted">{tx('The file stays on your device, we only use it to make the mold.', 'الملف بيضل على جهازك، منستعمله بس لنعمل القالب.')}</small>
      {err && <small className="sd-error">{err}</small>}
    </div>
  );
}

/** colour dropdown: the chosen colour + name; opens a list of the colours in stock */
export function ColorSelect({ list, value, onChange, label, isAdmin }) {
  const { tx } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cur = list.find((c) => c.hex === String(value).toLowerCase());
  // materials the admin entered (Admin → Colors), only those with colours in stock for this field
  const materials = [...new Set(list.map((c) => c.material).filter(Boolean))];
  const [mat, setMat] = useState('all');
  useEffect(() => { if (open) setMat(cur?.material && materials.length > 1 ? cur.material : 'all'); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = mat === 'all' ? list : list.filter((c) => c.material === mat);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const pick = (hex) => {
    onChange(hex);
    setOpen(false);
  };

  return (
    <div className="sd-csel" ref={ref}>
      <button type="button" className="sd-csel-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>
        <span className="sd-csel-dot" style={{ background: value }} />
        <span className="sd-csel-name">{cur ? cur.name : <span dir="ltr">{value}</span>}</span>
        {cur?.material && <span className="sd-csel-mat">{cur.material}</span>}
        <span className="sd-csel-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="sd-csel-list" role="listbox" aria-label={label}>
          {materials.length > 1 && (
            <li className="sd-csel-mats" role="presentation">
              {['all', ...materials].map((m) => (
                <button key={m} type="button" className={mat === m ? 'on' : ''} aria-pressed={mat === m} onClick={() => setMat(m)}>
                  {m === 'all' ? tx('All', 'الكل') : m}
                </button>
              ))}
            </li>
          )}
          {shown.map((c) => (
            <li key={c.id}>
              <button type="button" role="option" aria-selected={cur?.id === c.id} className={cur?.id === c.id ? 'on' : ''} onClick={() => pick(c.hex)}>
                <span className="sd-csel-dot" style={{ background: c.hex }} />
                <span className="sd-csel-name">{c.name}</span>
                {c.material && <span className="sd-csel-mat">{c.material}</span>}
              </button>
            </li>
          ))}
          {isAdmin && (
            <li className="sd-csel-admin">
              <label>
                <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
                <span>{tx('Any colour (admin only)', 'لون آخر (للأدمن فقط)')}</span>
              </label>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** typed numbers: applied while inside the allowed range, brought into it when the field is left */
function NumberBox({ value, min, max, step, set }) {
  const [text, setText] = useState(null); // what is being typed (null = show the value)
  const ok = (n) => Number.isFinite(n) && (min === undefined || n >= min) && (max === undefined || n <= max);
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={text ?? value}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseFloat(e.target.value);
        if (ok(n)) set(n);
      }}
      onBlur={() => {
        const n = parseFloat(text);
        if (text !== null && Number.isFinite(n) && !ok(n)) set(Math.min(max ?? n, Math.max(min ?? n, n)));
        setText(null);
      }}
    />
  );
}

function Field({ def, value, onChange, params, tool, palette, isAdmin }) {
  const t = useT();
  const set = (v) => onChange(def.key, v);
  switch (def.type) {
    case 'model':
      return <ModelField value={value} set={set} />;
    case 'image':
      return <ImageField value={value} set={set} maxSize={def.maxSize || 256} sample={def.samplePic === false ? null : def.samplePic || 'photo'} />;
    case 'text':
      return (
        <input
          type="text"
          value={value}
          dir={def.dir || 'auto'}
          maxLength={def.maxLength || 40}
          onChange={(e) => set(e.target.value)}
        />
      );
    case 'font': {
      // النص الذي يُعرض في معاينة الخطوط: الحقول المحدّدة في def.sample أو أول حقل نصي
      const keys = def.sample || [tool.params.find((d) => d.type === 'text')?.key].filter(Boolean);
      const sample = keys.map((k) => params[k] || '').join(' ').trim();
      return <FontPicker value={value} onChange={set} sample={sample} />;
    }
    case 'select':
      if (def.pictures) {
        // a grid of pictures (each option has an image)
        return (
          <div className="sd-pics" role="radiogroup">
            {visibleOptions(def, params).map((o) => (
              <button key={o.value} type="button" role="radio" aria-checked={o.value === value}
                className={o.value === value ? 'on' : ''} onClick={() => set(o.value)} title={t(o.label)}>
                <img src={o.image} alt="" loading="lazy" />
                <span>{t(o.label)}</span>
              </button>
            ))}
          </div>
        );
      }
      if (def.dropdown) {
        // قائمة منسدلة مقسّمة بمجموعات (للقوائم الطويلة مثل موديلات الهواتف)
        const opts0 = visibleOptions(def, params);
        const groups = [...new Set(opts0.map((o) => o.group || ''))];
        return (
          <select className="sd-dropdown" value={value} onChange={(e) => set(e.target.value)}>
            {groups.map((g) => {
              const opts = opts0.filter((o) => (o.group || '') === g).map((o) => (
                <option key={o.value} value={o.value}>{t(o.label)}</option>
              ));
              return g ? <optgroup key={g} label={t(g)}>{opts}</optgroup> : opts;
            })}
          </select>
        );
      }
      return (
        <div className="sd-seg">
          {visibleOptions(def, params).map((o) => (
            <button key={o.value} type="button" className={o.value === value ? 'on' : ''} onClick={() => set(o.value)}>
              {t(o.label)}
            </button>
          ))}
        </div>
      );
    case 'checkbox':
      return (
        <label className="sd-switch">
          <input type="checkbox" checked={!!value} onChange={(e) => set(e.target.checked)} />
          <span />
        </label>
      );
    case 'color': {
      const list = colorsFor(palette, def);
      // no stock list yet (offline / loading): the plain picker
      if (!list.length) {
        return (
          <div className="sd-color">
            <input type="color" value={value} onChange={(e) => set(e.target.value)} />
            <code>{value}</code>
          </div>
        );
      }
      return <ColorSelect list={list} value={value} onChange={set} label={t(def.label)} isAdmin={isAdmin} />;
    }
    case 'number':
    default:
      return (
        <div className="sd-range">
          <input
            type="range"
            min={lim(def, params, 'min')}
            max={lim(def, params, 'max')}
            step={def.step}
            value={value}
            onChange={(e) => set(parseFloat(e.target.value))}
          />
          <NumberBox value={value} min={lim(def, params, 'min')} max={lim(def, params, 'max')} step={def.step} set={set} />
          {def.unit && <span className="sd-unit">{t(def.unit)}</span>}
        </div>
      );
  }
}

export default function ParamPanel({ tool, params, onChange, palette = [], isAdmin = false }) {
  const t = useT();
  const groups = [];
  for (const def of tool.params) {
    if (def.show && !def.show(params)) continue;
    let g = groups.find((x) => x.name === def.group);
    if (!g) groups.push((g = { name: def.group, defs: [] }));
    g.defs.push(def);
  }
  return (
    <div className="sd-params">
      {groups.map((g) => (
        <fieldset key={g.name}>
          <legend>{t(g.name)}</legend>
          {g.defs.map((def) => (
            <div className={`sd-field sd-field-${def.type}`} key={def.key}>
              <label>{t(def.label)}</label>
              <Field def={def} value={params[def.key]} onChange={onChange} params={params} tool={tool} palette={palette} isAdmin={isAdmin} />
              {def.help && <small>{t(def.help)}</small>}
            </div>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
