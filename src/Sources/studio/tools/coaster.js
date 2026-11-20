/* eslint-disable import/no-anonymous-default-export */
// Coaster: a photo (up to 4 colours) or a name, flat-inlaid into a round / square / hexagon coaster,
// with an optional raised rim. The top stays flat so cups sit level.
import { textBox } from '../lib/fonts.js';
import { imageShape } from '../lib/colors.js';
import { stockColor } from '../lib/palette.js';
import { union, difference, intersection, offset, circle, roundRect, bounds2, extrude } from '../lib/geo.js';

const area = (cs) => {
  let a = 0;
  for (const c of cs) for (let i = 0, j = c.length - 1; i < c.length; j = i++) a += (c[j][0] + c[i][0]) * (c[j][1] - c[i][1]);
  return Math.abs(a / 2);
};

function outline(shape, D, corner) {
  if (shape === 'square') return roundRect(0, 0, D, D, corner);
  if (shape === 'hexagon') {
    const R = D / 2 / Math.cos(Math.PI / 6); // D = flat-to-flat
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      pts.push([Math.cos(a) * R, Math.sin(a) * R]);
    }
    return corner > 0 ? offset(offset([pts], -corner), corner) : [pts];
  }
  return circle(0, 0, D / 2, 128);
}

export default {
  id: 'coaster',
  name: 'كوستر (قاعدة كاسة)',
  description: 'قاعدة كاسة من صورتك أو باسمك، بلونين لأربعة ألوان مدموجة بالسطح فيبقى مستوياً، مع حافة بارزة اختيارية. هدية حلوة للبيت والمكتب.',
  category: 'هدايا',
  params: [
    { key: 'design', label: 'التصميم', type: 'select', default: 'text', group: 'التصميم',
      options: [{ value: 'image', label: 'صورة أو شعار' }, { value: 'text', label: 'اسم أو كلمة' }] },
    { key: 'image', label: 'الصورة', type: 'image', default: '', group: 'التصميم', maxSize: 600, show: (p) => p.design === 'image' },
    { key: 'bgTol', label: 'حساسية إزالة الخلفية', type: 'number', min: 5, max: 120, step: 1, default: 40, group: 'التصميم', show: (p) => p.design === 'image' },
    { key: 'imageColors', label: 'ألوان الصورة', type: 'number', min: 1, max: 4, step: 1, default: 1, group: 'التصميم', show: (p) => p.design === 'image' },
    { key: 'text', label: 'الاسم', type: 'text', default: 'Home', maxLength: 24, group: 'التصميم', show: (p) => p.design === 'text' },
    { key: 'font', label: 'الخط', type: 'font', sample: ['text'], default: 'pacifico', group: 'التصميم', show: (p) => p.design === 'text' },
    { key: 'designSize', label: 'حجم التصميم', type: 'number', min: 30, max: 100, step: 1, unit: '%', default: 80, group: 'التصميم' },

    { key: 'shape', label: 'الشكل', type: 'select', default: 'round', group: 'الشكل',
      options: [{ value: 'round', label: 'دائري' }, { value: 'square', label: 'مربع' }, { value: 'hexagon', label: 'سداسي' }] },
    { key: 'diameter', label: 'القطر / العرض', type: 'number', min: 70, max: 130, step: 1, unit: 'مم', default: 95, group: 'الشكل' },
    { key: 'corner', label: 'استدارة الزوايا', type: 'number', min: 0, max: 20, step: 0.5, unit: 'مم', default: 8, group: 'الشكل', show: (p) => p.shape !== 'round' },
    { key: 'thickness', label: 'السماكة', type: 'number', min: 2.5, max: 8, step: 0.1, unit: 'مم', default: 4, group: 'الشكل' },
    { key: 'rim', label: 'حافة بارزة', type: 'checkbox', default: true, group: 'الحافة' },
    { key: 'rimWidth', label: 'عرض الحافة', type: 'number', min: 1.5, max: 8, step: 0.1, unit: 'مم', default: 3, group: 'الحافة', show: (p) => p.rim },
    { key: 'rimHeight', label: 'ارتفاع الحافة', type: 'number', min: 0.4, max: 3, step: 0.1, unit: 'مم', default: 1.2, group: 'الحافة', show: (p) => p.rim },

    { key: 'baseColor', label: 'لون القاعدة', type: 'color', default: '#f5f5f5', group: 'الألوان' },
    { key: 'designColor', label: 'لون التصميم', type: 'color', default: '#1e5bd8', group: 'الألوان', show: (p) => p.design === 'text' || p.imageColors <= 1 },
    { key: 'rimColor', label: 'لون الحافة', type: 'color', default: '#1e5bd8', group: 'الألوان', show: (p) => p.rim },
  ],
  fonts: (p) => (p.design === 'text' ? [p.font] : []),
  async build(p, fonts) {
    const D = p.diameter;
    const plate = outline(p.shape, D, p.corner);
    const rimW = p.rim ? p.rimWidth : 0;
    const inner = rimW ? offset(plate, -rimW) : plate;
    const field = offset(inner, -2); // design stays clear of the edge
    const fb = bounds2(field);
    const scale = p.designSize / 100;

    const layers = []; // [{ name, color, shape }] — never overlapping
    if (p.design === 'text') {
      if (!p.text?.trim()) throw new Error('اكتب الاسم');
      const tb = textBox(fonts[p.font], p.text.trim(), { height: fb.h * 0.32 * scale, maxWidth: fb.w * 0.92 * scale });
      layers.push({ name: 'الاسم', color: p.designColor, shape: intersection(union(tb.contours), field) });
    } else if (p.image) {
      const n = Math.round(p.imageColors);
      const im = await imageShape(p.image, { tol: p.bgTol, colors: n > 1 ? n : 0 });
      if (!im.contours.length) throw new Error('ما لقينا شكل بالصورة — جرّب تغيّر حساسية إزالة الخلفية');
      const b0 = bounds2(im.contours);
      const s = Math.min((fb.w * scale) / b0.w, (fb.h * scale) / b0.h);
      const tf = (cs) => cs.map((c) => c.map(([x, y]) => [(x - b0.cx) * s, (y - b0.cy) * s]));
      const shape = intersection(union(tf(im.contours)), field);
      if (n > 1) {
        // smallest regions first, so details win over big areas; each pixel belongs to one colour
        const order = im.regions
          .map((rg, i) => ({ i, sh: intersection(union(tf(rg)), shape) }))
          .sort((a, b) => area(a.sh) - area(b.sh));
        let taken = [];
        const out = [];
        for (const { i, sh } of order) {
          const own = difference(sh, taken);
          if (!own.length) continue;
          taken = union(taken, own);
          out.push({ name: `لون ${i + 1}`, color: stockColor(im.palette[i]), shape: own });
        }
        const rest = difference(shape, taken);
        if (rest.length && out.length) out[out.length - 1].shape = union(out[out.length - 1].shape, rest);
        layers.push(...out.reverse());
      } else {
        layers.push({ name: 'الصورة', color: p.designColor, shape });
      }
    } else {
      throw new Error('ارفع صورة أو شعار');
    }

    const T = p.thickness;
    const inlay = Math.min(0.8, T - 1.2);
    const design = union(...layers.map((L) => L.shape));
    const parts = [{ name: 'القاعدة', color: p.baseColor, geometry: extrude(plate, T - inlay, 0) }];
    const top = difference(inner, design);
    if (top.length) parts.push({ name: 'القاعدة (السطح)', color: p.baseColor, geometry: extrude(top, inlay, T - inlay) });
    for (const L of layers) if (L.shape.length) parts.push({ name: L.name, color: L.color, geometry: extrude(L.shape, inlay, T - inlay) });
    if (rimW) {
      const ring = difference(plate, inner);
      parts.push({ name: 'الحافة', color: p.rimColor, geometry: extrude(ring, inlay + p.rimHeight, T - inlay) });
    }
    return parts.filter((x) => x.geometry);
  },
};
