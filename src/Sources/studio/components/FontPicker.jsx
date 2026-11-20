// قائمة خطوط بمعاينة حيّة: كل خط يعرض نص الزبون نفسه، ويُحمَّل الخط فقط عند ظهوره في القائمة
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { FONTS, fontStyle, fontSupports, hasArabic } from '../lib/fonts.js';

const TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'ar', label: 'عربي' },
  { id: 'en', label: 'English' },
];

function preview(def, sample) {
  const s = (sample || '').trim().slice(0, 18);
  if (s && fontSupports(def, s)) return s;
  return def.script === 'ar' ? 'أهلاً Hello' : 'Hello 2026';
}

function Item({ def, sample, active, onPick, root }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { root: root.current, rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, root]);
  const ok = fontSupports(def, sample);
  return (
    <button
      ref={ref}
      type="button"
      className={`sd-font-item${active ? ' on' : ''}`}
      disabled={!ok}
      onClick={() => onPick(def.id)}
      title={ok ? def.name : 'هذا الخط لا يدعم الحروف العربية'}
    >
      <span className="sd-font-name">
        {def.name}
        {!ok && <em>لا يدعم العربي</em>}
      </span>
      <span className="sd-font-sample" dir="auto" style={seen ? fontStyle(def) : undefined}>
        {preview(def, sample)}
      </span>
    </button>
  );
}

export default function FontPicker({ value, onChange, sample: liveSample }) {
  // the font previews follow the typed text without slowing the typing itself
  const sample = useDeferredValue(liveSample);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(() => (hasArabic(sample) ? 'ar' : 'all'));
  const wrap = useRef(null);
  const list = useRef(null);
  const cur = FONTS.find((f) => f.id === value) || FONTS[0];

  useEffect(() => {
    if (!open) return;
    const close = (e) => !wrap.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    // نُظهر الخط المختار داخل القائمة عند فتحها
    list.current?.querySelector('.sd-font-item.on')?.scrollIntoView({ block: 'nearest' });
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const shown = FONTS.filter((f) => tab === 'all' || f.script === tab);
  const pick = (id) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className="sd-font-picker" ref={wrap}>
      <button type="button" className="sd-font-current" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="sd-font-sample" dir="auto" style={fontStyle(cur)}>{preview(cur, sample)}</span>
        <span className="sd-font-name">{cur.name} ▾</span>
      </button>
      {!fontSupports(cur, sample) && <small className="sd-error">الخط المختار لا يدعم الحروف العربية — اختر خطاً من تبويب «عربي»</small>}
      {open && (
        <div className="sd-font-pop">
          <div className="sd-seg">
            {TABS.map((t) => (
              <button key={t.id} type="button" className={t.id === tab ? 'on' : ''} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="sd-font-list" ref={list}>
            {shown.map((f) => (
              <Item key={f.id} def={f} sample={sample} active={f.id === cur.id} onPick={pick} root={list} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
