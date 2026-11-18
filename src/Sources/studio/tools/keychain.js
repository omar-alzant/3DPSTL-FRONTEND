/* eslint-disable import/no-anonymous-default-export, no-unused-vars */
import { shapeText } from '../lib/fonts.js';
import { union, difference, offset, circle, bounds2, extrude } from '../lib/geo.js';

/** نقطة الحافة الأبعد في اتجاه معيّن (لوضع حلقة الميدالية ملاصقة للشكل) */
function edgePoint(contours, side) {
  let best = null;
  for (const c of contours)
    for (const p of c) {
      const v = side === 'right' ? p[0] : side === 'left' ? -p[0] : p[1];
      if (!best || v > best.v) best = { v, p };
    }
  return best ? best.p : [0, 0];
}

export function nameWithRing(f, p) {
  const glyphs = union(shapeText(f, p.text, p.size, { spacing: p.spacing }).contours);
  const outline = offset(glyphs, p.border);
  let base = outline;
  let hole = null;
  if (p.ring !== 'none' && outline.length) {
    const [ex, ey] = edgePoint(outline, p.ring);
    const R = p.ringOuter;
    const inset = R * 0.55;
    const [cx, cy] =
      p.ring === 'right' ? [ex + R - inset, ey] : p.ring === 'left' ? [ex - R + inset, ey] : [ex, ey + R - inset];
    base = union(outline, circle(cx, cy, R));
    hole = circle(cx, cy, p.ringHole);
    base = difference(base, hole);
  }
  return { glyphs, base, hole };
}

export function buildRaisedOrInlay({ glyphs, base }, p) {
  const parts = [];
  if (p.mode === 'inlay') {
    const inlay = Math.min(p.textHeight, p.thickness - 0.6);
    parts.push({ name: 'القاعدة', color: p.baseColor, geometry: extrude(base, p.thickness - inlay, 0) });
    parts.push({ name: 'القاعدة (الطبقة العليا)', color: p.baseColor, geometry: extrude(difference(base, glyphs), inlay, p.thickness - inlay) });
    parts.push({ name: 'النص', color: p.textColor, geometry: extrude(glyphs, inlay, p.thickness - inlay) });
  } else {
    parts.push({ name: 'القاعدة', color: p.baseColor, geometry: extrude(base, p.thickness, 0) });
    parts.push({ name: 'النص', color: p.textColor, geometry: extrude(glyphs, p.textHeight, p.thickness) });
  }
  return parts.filter((x) => x.geometry);
}

export default {
  id: 'name-keychain',
  name: 'ميدالية باسم',
  description: 'اكتب الاسم واختر الخط والألوان، وتحصل على ميدالية جاهزة للطباعة بلونين.',
  category: 'ميداليات',
  params: [
    { key: 'text', label: 'الاسم', type: 'text', default: 'عبدالله', group: 'النص' },
    { key: 'font', label: 'الخط', type: 'font', default: 'lalezar', group: 'النص' },
    { key: 'size', label: 'حجم الخط', type: 'number', min: 8, max: 40, step: 0.5, unit: 'مم', default: 16, group: 'النص' },
    { key: 'spacing', label: 'تباعد الحروف', type: 'number', min: -2, max: 4, step: 0.1, unit: 'مم', default: 0, group: 'النص' },
    { key: 'mode', label: 'شكل النص', type: 'select', default: 'raised', group: 'النص',
      options: [{ value: 'raised', label: 'بارز' }, { value: 'inlay', label: 'مدمج (مسطّح بلونين)' }] },
    { key: 'border', label: 'سماكة الإطار', type: 'number', min: 1, max: 8, step: 0.1, unit: 'مم', default: 2.6, group: 'القاعدة' },
    { key: 'thickness', label: 'سماكة القاعدة', type: 'number', min: 1.5, max: 8, step: 0.1, unit: 'مم', default: 3, group: 'القاعدة' },
    { key: 'textHeight', label: 'ارتفاع النص', type: 'number', min: 0.4, max: 4, step: 0.1, unit: 'مم', default: 1.4, group: 'القاعدة' },
    { key: 'ring', label: 'مكان الحلقة', type: 'select', default: 'right', group: 'الحلقة',
      options: [{ value: 'right', label: 'يمين' }, { value: 'left', label: 'يسار' }, { value: 'top', label: 'أعلى' }, { value: 'none', label: 'بدون' }] },
    { key: 'ringOuter', label: 'نصف قطر الحلقة', type: 'number', min: 3, max: 8, step: 0.1, unit: 'مم', default: 4.6, group: 'الحلقة' },
    { key: 'ringHole', label: 'نصف قطر الثقب', type: 'number', min: 1, max: 5, step: 0.1, unit: 'مم', default: 2.2, group: 'الحلقة' },
    { key: 'baseColor', label: 'لون القاعدة', type: 'color', default: '#9aa7b8', group: 'الألوان' },
    { key: 'textColor', label: 'لون النص', type: 'color', default: '#6a4cff', group: 'الألوان' },
  ],
  fonts: (p) => [p.font],
  build(p, fonts) {
    const shapes = nameWithRing(fonts[p.font], p);
    return buildRaisedOrInlay(shapes, p);
  },
};
