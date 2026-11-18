import { useState } from 'react';
import FontPicker from './FontPicker.jsx';
import ImagePrep from './ImagePrep.jsx';

function ImageField({ value, set, maxSize }) {
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null); // مصدر الصورة داخل نافذة التجهيز
  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) return setErr('اختر ملف صورة');
    setErr(null);
    setEditing(URL.createObjectURL(file));
  };
  const close = () => {
    if (editing?.startsWith('blob:')) URL.revokeObjectURL(editing);
    setEditing(null);
  };
  return (
    <div className="sd-image-field">
      {value ? <img src={value} alt="" /> : <div className="sd-img-empty">لا توجد صورة</div>}
      <div className="sd-img-actions">
        <label className="sd-btn">
          {value ? 'تغيير' : 'رفع صورة'}
          <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={pick} hidden />
        </label>
        {value && <button type="button" className="sd-btn" onClick={() => setEditing(value)}>تعديل</button>}
        {value && <button type="button" className="sd-btn sd-link" onClick={() => set('')}>حذف</button>}
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

function Field({ def, value, onChange, params, tool }) {
  const set = (v) => onChange(def.key, v);
  switch (def.type) {
    case 'image':
      return <ImageField value={value} set={set} maxSize={def.maxSize || 256} />;
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
      return (
        <div className="sd-seg">
          {def.options.map((o) => (
            <button key={o.value} type="button" className={o.value === value ? 'on' : ''} onClick={() => set(o.value)}>
              {o.label}
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
    case 'color':
      return (
        <div className="sd-color">
          <input type="color" value={value} onChange={(e) => set(e.target.value)} />
          <code>{value}</code>
        </div>
      );
    case 'number':
    default:
      return (
        <div className="sd-range">
          <input
            type="range"
            min={def.min}
            max={def.max}
            step={def.step}
            value={value}
            onChange={(e) => set(parseFloat(e.target.value))}
          />
          <input
            type="number"
            min={def.min}
            max={def.max}
            step={def.step}
            value={value}
            onChange={(e) => e.target.value !== '' && set(parseFloat(e.target.value))}
          />
          {def.unit && <span className="sd-unit">{def.unit}</span>}
        </div>
      );
  }
}

export default function ParamPanel({ tool, params, onChange }) {
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
          <legend>{g.name}</legend>
          {g.defs.map((def) => (
            <div className={`sd-field sd-field-${def.type}`} key={def.key}>
              <label>{def.label}</label>
              <Field def={def} value={params[def.key]} onChange={onChange} params={params} tool={tool} />
              {def.help && <small>{def.help}</small>}
            </div>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
