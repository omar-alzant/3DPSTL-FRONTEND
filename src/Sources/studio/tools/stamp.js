/* eslint-disable import/no-anonymous-default-export */
// Rubber-style stamp: up to 3 lines (Arabic or English) and an optional logo, mirrored so the print reads right,
// on a rectangle / circle / oval pad with an optional border, plus a handle that plugs into the back.
import { textBox } from '../lib/fonts.js';
import { traceImage } from '../lib/trace.js';
import { union, difference, intersection, offset, circle, roundRect, bounds2, extrude } from '../lib/geo.js';

const mirror = (cs) => cs.map((c) => c.map(([x, y]) => [-x, y]).reverse());
const move = (cs, dx, dy) => cs.map((c) => c.map(([x, y]) => [x + dx, y + dy]));

function ellipse(w, h, seg = 128) {
  const pts = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push([(Math.cos(a) * w) / 2, (Math.sin(a) * h) / 2]);
  }
  return [pts];
}

export default {
  id: 'stamp',
  name: 'ختم بالاسم',
  description: 'ختم بالعربي أو الإنكليزي لحد 3 أسطر مع شعار اختياري وإطار، مطبوع معكوس فيطلع الختم مقروء، مع مسكة تتركّب على ظهره. للمحلات والمدارس والشركات.',
  category: 'أعمال',
  params: [
    { key: 'line1', label: 'السطر الأول', type: 'text', default: '3DSTL', maxLength: 30, group: 'النص' },
    { key: 'line2', label: 'السطر الثاني', type: 'text', default: 'طرابلس - لبنان', maxLength: 36, group: 'النص' },
    { key: 'line3', label: 'السطر الثالث', type: 'text', default: '', maxLength: 36, group: 'النص' },
    { key: 'font', label: 'الخط', type: 'font', sample: ['line1', 'line2'], default: 'cairo-black', group: 'النص' },
    { key: 'logo', label: 'شعار (اختياري)', type: 'image', samplePic: false, default: '', group: 'الشعار', maxSize: 400 },
    { key: 'logoDark', label: 'قتامة الشعار', type: 'number', min: 10, max: 90, step: 1, unit: '%', default: 50, group: 'الشعار', show: (p) => !!p.logo },
    { key: 'logoPos', label: 'مكان الشعار', type: 'select', default: 'top', group: 'الشعار', show: (p) => !!p.logo,
      options: [{ value: 'top', label: 'فوق النص' }, { value: 'side', label: 'جنب النص' }, { value: 'only', label: 'الشعار وحده' }] },

    { key: 'shape', label: 'الشكل', type: 'select', default: 'rect', group: 'الشكل',
      options: [{ value: 'rect', label: 'مستطيل' }, { value: 'circle', label: 'دائرة' }, { value: 'oval', label: 'بيضاوي' }] },
    { key: 'width', label: 'العرض', type: 'number', min: 20, max: 120, step: 1, unit: 'مم', default: 60, group: 'الشكل' },
    { key: 'height', label: 'الارتفاع', type: 'number', min: 12, max: 120, step: 1, unit: 'مم', default: 30, group: 'الشكل', show: (p) => p.shape !== 'circle' },
    { key: 'border', label: 'إطار', type: 'checkbox', default: true, group: 'الشكل' },
    { key: 'borderW', label: 'عرض الإطار', type: 'number', min: 0.8, max: 4, step: 0.1, unit: 'مم', default: 1.4, group: 'الشكل', show: (p) => p.border },

    { key: 'relief', label: 'بروز الكتابة', type: 'number', min: 1, max: 4, step: 0.1, unit: 'مم', default: 2, group: 'الطباعة' },
    { key: 'plateT', label: 'سماكة القاعدة', type: 'number', min: 3, max: 8, step: 0.1, unit: 'مم', default: 4, group: 'الطباعة' },
    { key: 'handle', label: 'مسكة تتركّب على الظهر', type: 'checkbox', default: true, group: 'الطباعة' },

    { key: 'plateColor', label: 'لون القاعدة', type: 'color', default: '#1e5bd8', group: 'الألوان' },
    { key: 'textColor', label: 'لون الكتابة', type: 'color', default: '#f5f5f5', group: 'الألوان' },
    { key: 'handleColor', label: 'لون المسكة', type: 'color', default: '#111111', group: 'الألوان', show: (p) => p.handle },
  ],
  fonts: (p) => ([p.line1, p.line2, p.line3].some((t) => t?.trim()) && !(p.logo && p.logoPos === 'only') ? [p.font] : []),
  async build(p, fonts) {
    const W = p.width;
    const H = p.shape === 'circle' ? W : p.height;
    const outline = p.shape === 'rect' ? roundRect(0, 0, W, H, 2) : p.shape === 'circle' ? circle(0, 0, W / 2, 128) : ellipse(W, H);
    const bw = p.border ? p.borderW : 0;
    const gap = p.border ? 1.6 : 0.5;
    const inner = offset(outline, -(bw + gap));
    // usable box: for round shapes, the rectangle that fits inside
    const ib = bounds2(inner);
    const k = p.shape === 'rect' ? 1 : 0.72;
    const box = { w: ib.w * k, h: ib.h * k };

    const lines = [p.line1, p.line2, p.line3].map((t) => (t || '').trim()).filter(Boolean);
    const useLogo = !!p.logo;
    const logoOnly = useLogo && p.logoPos === 'only';
    if (!lines.length && !useLogo) throw new Error('اكتب نص الختم أو ارفع شعار');

    let logo = [];
    let textArea = { cx: 0, cy: 0, w: box.w, h: box.h };
    if (useLogo) {
      const t = await traceImage(p.logo, { threshold: p.logoDark });
      if (!t.contours.length) throw new Error('ما لقينا شي بالشعار — جرّب تغيّر «قتامة الشعار»');
      const lb = bounds2(t.contours);
      let area;
      if (logoOnly || !lines.length) area = { cx: 0, cy: 0, w: box.w, h: box.h };
      else if (p.logoPos === 'side') {
        area = { cx: box.w / 2 - box.h / 2, cy: 0, w: box.h, h: box.h };
        textArea = { cx: -box.h / 2 - 1, cy: 0, w: box.w - box.h - 2, h: box.h };
      } else {
        area = { cx: 0, cy: box.h / 2 - box.h * 0.22, w: box.w, h: box.h * 0.44 };
        textArea = { cx: 0, cy: -box.h * 0.25, w: box.w, h: box.h * 0.5 };
      }
      const s = Math.min(area.w / lb.w, area.h / lb.h);
      logo = union(t.contours.map((c) => c.map(([x, y]) => [area.cx + (x - lb.cx) * s, area.cy + (y - lb.cy) * s])));
    }

    // text lines: the first a bit bigger
    let text = [];
    if (lines.length && !logoOnly) {
      const weights = lines.map((_, i) => (i === 0 ? 1.35 : 1));
      const total = weights.reduce((a, b) => a + b, 0);
      const lead = 0.22; // gap between lines, as a share of a line
      const unit = textArea.h / (total + lead * (lines.length - 1));
      let y = textArea.cy + textArea.h / 2;
      lines.forEach((line, i) => {
        const h = unit * weights[i];
        const tb = textBox(fonts[p.font], line, { height: h * 0.78, maxWidth: textArea.w, cx: textArea.cx, cy: y - h / 2 });
        text = union(text, tb.contours);
        y -= h + unit * lead;
      });
    }

    let relief = intersection(union(text, logo), inner);
    if (p.border) relief = union(relief, difference(offset(outline, -0.3), offset(outline, -0.3 - bw)));
    if (!relief.length) throw new Error('الكتابة صغيرة كتير على هالحجم — كبّر الختم');

    const T = p.plateT;
    const parts = [];
    const socket = roundRect(0, 0, 8.4, 8.4, 0.6);
    if (p.handle) {
      // blind square socket in the back (printed from the bed up), the handle's peg fits into it
      parts.push({ name: 'القاعدة', color: p.plateColor, geometry: extrude(difference(outline, socket), 2.6, 0) });
      parts.push({ name: 'القاعدة', color: p.plateColor, geometry: extrude(outline, T - 2.6, 2.6) });
    } else {
      parts.push({ name: 'القاعدة', color: p.plateColor, geometry: extrude(outline, T, 0) });
    }
    parts.push({ name: 'الكتابة (معكوسة)', color: p.textColor, geometry: extrude(mirror(relief), p.relief, T) });

    if (p.handle) {
      const ob = bounds2(outline);
      const hx = ob.maxX + 18;
      const knob = circle(hx, 0, 13, 64);
      parts.push({ name: 'المسكة', color: p.handleColor, geometry: extrude(knob, 4, 0) });
      parts.push({ name: 'المسكة', color: p.handleColor, geometry: extrude(circle(hx, 0, 8, 48), 18, 4) });
      parts.push({ name: 'المسكة', color: p.handleColor, geometry: extrude(circle(hx, 0, 11, 64), 6, 22) });
      parts.push({ name: 'المسكة (الوتد)', color: p.handleColor, geometry: extrude(move(roundRect(0, 0, 8, 8, 0.5), hx, 0), 2.4, 28) });
    }
    return parts.filter((x) => x.geometry);
  },
};
