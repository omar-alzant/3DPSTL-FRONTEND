/* eslint-disable import/no-anonymous-default-export */
// Cookie cutter + matching stamp.
// The outline (a drawing's silhouette, a word, or a ready shape) becomes the cutter: a sharp thin edge on top of a
// thicker wall, with a flange for the hand. Inner lines / a name become the stamp, which presses inside the cut cookie.
// The stamp is mirrored, so the print in the dough reads the right way.
import { textBox } from '../lib/fonts.js';
import { imageShape } from '../lib/colors.js';
import { traceImage } from '../lib/trace.js';
import { union, difference, intersection, offset, circle, bounds2, extrude } from '../lib/geo.js';

const area = (cs) => {
  let a = 0;
  for (const c of cs) for (let i = 0, j = c.length - 1; i < c.length; j = i++) a += (c[j][0] + c[i][0]) * (c[j][1] - c[i][1]);
  return Math.abs(a / 2);
};
const move = (cs, dx, dy, sx = 1) => cs.map((c) => c.map(([x, y]) => [x * sx + dx, y + dy]));

// ready-made outlines (unit size, centred)
function preset(name) {
  const pts = [];
  const N = 160;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    let x, y;
    if (name === 'heart') {
      x = 16 * Math.sin(t) ** 3;
      y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    } else if (name === 'star') {
      const k = Math.floor((i / N) * 10);
      const r = k % 2 ? 0.45 : 1;
      if (i % (N / 10)) continue;
      const a = Math.PI / 2 + (k * Math.PI) / 5;
      x = Math.cos(a) * r; y = Math.sin(a) * r;
    } else if (name === 'flower') {
      const r = 0.72 + 0.28 * Math.cos(6 * t);
      x = Math.cos(t) * r; y = Math.sin(t) * r;
    } else if (name === 'cloud') {
      const r = 0.8 + 0.2 * Math.abs(Math.cos(2.5 * t));
      x = Math.cos(t) * r * 1.3; y = Math.sin(t) * r * 0.85;
    } else { // circle
      x = Math.cos(t); y = Math.sin(t);
    }
    pts.push([x, y]);
  }
  let shape = [pts];
  if (name === 'star') shape = offset(offset(shape, -0.06), 0.06); // soften the tips a little
  return shape;
}

function fit(cs, size) {
  const b = bounds2(cs);
  const s = size / Math.max(b.w, b.h);
  return cs.map((c) => c.map(([x, y]) => [(x - b.cx) * s, (y - b.cy) * s]));
}

export default {
  id: 'cookie-cutter',
  name: 'قالب كوكيز مع ختم',
  description: 'قالب لقصّ عجينة الكوكيز بشكل رسمتك أو اسمك أو شكل جاهز، مع ختم يطبع التفاصيل أو الاسم داخل الكوكيز. للحلويات والمناسبات وأعياد الميلاد.',
  category: 'مطبخ',
  params: [
    { key: 'source', label: 'شكل القالب', type: 'select', default: 'shape', group: 'الشكل',
      options: [{ value: 'shape', label: 'شكل جاهز' }, { value: 'image', label: 'من رسمة أو صورة' }, { value: 'text', label: 'كلمة أو اسم' }] },
    { key: 'preset', label: 'الشكل', type: 'select', default: 'heart', group: 'الشكل', show: (p) => p.source === 'shape',
      options: [{ value: 'heart', label: 'قلب' }, { value: 'circle', label: 'دائرة' }, { value: 'star', label: 'نجمة' }, { value: 'flower', label: 'وردة' }, { value: 'cloud', label: 'غيمة' }] },
    { key: 'image', label: 'الرسمة', type: 'image', default: '', group: 'الشكل', maxSize: 600, show: (p) => p.source === 'image' },
    { key: 'bgTol', label: 'حساسية إزالة الخلفية', type: 'number', min: 5, max: 120, step: 1, default: 40, group: 'الشكل', show: (p) => p.source === 'image' },
    { key: 'word', label: 'الكلمة', type: 'text', default: 'Eid', maxLength: 12, group: 'الشكل', show: (p) => p.source === 'text' },
    { key: 'wordFont', label: 'خط الكلمة', type: 'font', sample: ['word'], default: 'baloo', group: 'الشكل', show: (p) => p.source === 'text' },
    { key: 'size', label: 'الحجم (أطول جهة)', type: 'number', min: 35, max: 160, step: 1, unit: 'مم', default: 75, group: 'الشكل' },

    { key: 'stampDetail', label: 'نقش الختم', type: 'select', default: 'text', group: 'الختم',
      options: [{ value: 'none', label: 'بدون ختم' }, { value: 'text', label: 'اسم أو كلمة' }, { value: 'lines', label: 'خطوط الرسمة' }] },
    { key: 'stampText', label: 'النص على الكوكيز', type: 'text', default: 'Love', maxLength: 16, group: 'الختم', show: (p) => p.stampDetail === 'text' },
    { key: 'stampFont', label: 'خط النص', type: 'font', sample: ['stampText'], default: 'pacifico', group: 'الختم', show: (p) => p.stampDetail === 'text' },
    { key: 'lineDark', label: 'قتامة الخطوط', type: 'number', min: 10, max: 90, step: 1, unit: '%', default: 45, group: 'الختم', show: (p) => p.stampDetail === 'lines' },
    { key: 'reliefH', label: 'عمق النقش', type: 'number', min: 1, max: 4, step: 0.1, unit: 'مم', default: 2, group: 'الختم', show: (p) => p.stampDetail !== 'none' },

    { key: 'height', label: 'ارتفاع القالب', type: 'number', min: 8, max: 25, step: 0.5, unit: 'مم', default: 14, group: 'القالب' },
    { key: 'edge', label: 'سماكة حافة القص', type: 'number', min: 0.6, max: 1.6, step: 0.05, unit: 'مم', default: 0.8, group: 'القالب' },
    { key: 'wall', label: 'سماكة الجدار', type: 'number', min: 1.2, max: 3, step: 0.1, unit: 'مم', default: 1.6, group: 'القالب' },
    { key: 'flange', label: 'عرض المسكة', type: 'number', min: 0, max: 8, step: 0.5, unit: 'مم', default: 4, group: 'القالب' },

    { key: 'cutterColor', label: 'لون القالب', type: 'color', default: '#d6336c', group: 'الألوان' },
    { key: 'stampColor', label: 'لون الختم', type: 'color', default: '#f5f5f5', group: 'الألوان', show: (p) => p.stampDetail !== 'none' },
  ],
  fonts: (p) => [p.source === 'text' && p.wordFont, p.stampDetail === 'text' && p.stampText?.trim() && p.stampFont].filter(Boolean),
  async build(p, fonts) {
    // 1) outline (and the drawing's inner lines in the same coordinates)
    let shape;
    let lines = [];
    if (p.source === 'image') {
      if (!p.image) throw new Error('ارفع رسمة أو صورة بخلفية فاتحة أو شفافة');
      const im = await imageShape(p.image, { tol: p.bgTol });
      if (!im.contours.length) throw new Error('ما لقينا شكل بالرسمة — جرّب تغيّر حساسية إزالة الخلفية');
      shape = union(im.contours);
      if (p.stampDetail === 'lines') lines = (await traceImage(p.image, { threshold: p.lineDark })).contours;
      // keep only the biggest piece as the cutter outline (a cutter must be one closed loop)
      const b = bounds2(shape);
      const s = p.size / Math.max(b.w, b.h);
      const tf = (cs) => cs.map((c) => c.map(([x, y]) => [(x - b.cx) * s, (y - b.cy) * s]));
      shape = offset(offset(tf(shape), 2), -2); // close tiny gaps
      lines = tf(lines);
    } else if (p.source === 'text') {
      if (!p.word?.trim()) throw new Error('اكتب الكلمة');
      const tb = textBox(fonts[p.wordFont], p.word.trim(), { height: 100 });
      shape = fit(offset(union(tb.contours), 9), p.size); // letters joined into one blob
    } else {
      shape = fit(preset(p.preset), p.size);
    }
    // one outer loop only: fill holes, keep the largest island
    const islands = shape.map((c) => [c]).filter((c) => area(c) > 1).sort((a, b) => area(b) - area(a));
    if (!islands.length) throw new Error('الشكل صغير جداً');
    const outline = union(islands[0]);
    const ob = bounds2(outline);
    if (Math.min(ob.w, ob.h) < 20) throw new Error('الشكل رفيع جداً لقالب — كبّر الحجم');

    // 2) cutter: flange at the bottom, thick wall, thin sharp edge on top (prints edge-up, no supports)
    const H = p.height;
    const edgeH = Math.min(4, H * 0.3);
    const flangeH = 1.6;
    const cutter = [];
    const wallRing = difference(offset(outline, p.wall), outline);
    const edgeRing = difference(offset(outline, p.edge), outline);
    if (p.flange > 0) cutter.push(extrude(difference(offset(outline, p.wall + p.flange), outline), flangeH, 0));
    cutter.push(extrude(wallRing, H - edgeH, 0));
    cutter.push(extrude(edgeRing, edgeH, H - edgeH));

    const parts = cutter.filter(Boolean).map((g, i) => ({ name: i === 0 && p.flange > 0 ? 'القالب (المسكة)' : 'القالب', color: p.cutterColor, geometry: g }));

    // 3) stamp: fits inside the cut cookie, details mirrored
    if (p.stampDetail !== 'none') {
      const plate = offset(outline, -1.2);
      const inner = offset(plate, -2.5);
      let detail = [];
      if (p.stampDetail === 'text') {
        if (!p.stampText?.trim()) throw new Error('اكتب النص للختم');
        const ib = bounds2(inner);
        const tb = textBox(fonts[p.stampFont], p.stampText.trim(), { height: ib.h * 0.34, maxWidth: ib.w * 0.85, cx: ib.cx, cy: ib.cy });
        detail = intersection(union(tb.contours), inner);
      } else if (p.stampDetail === 'lines') {
        if (p.source !== 'image') throw new Error('«خطوط الرسمة» تشتغل مع شكل «من رسمة» — اختر «اسم أو كلمة»');
        // dark lines inside the shape, thick enough to press into dough
        detail = intersection(offset(offset(union(lines), -0.5), 0.9), inner);
        detail = detail.filter((c) => area([c]) > 2);
        if (!detail.length) throw new Error('ما في خطوط داكنة واضحة جوّا الرسمة — خفّف «قتامة الخطوط» أو اختر اسم');
      }
      // place it beside the cutter, mirrored
      const gap = 10;
      const dx = ob.maxX + p.wall + p.flange + gap + (ob.maxX - ob.cx);
      const T = 3;
      parts.push({ name: 'الختم', color: p.stampColor, geometry: extrude(move(plate, dx + ob.cx * 2, 0, -1), T, 0) });
      if (detail.length) parts.push({ name: 'نقش الختم', color: p.stampColor, geometry: extrude(move(detail, dx + ob.cx * 2, 0, -1), p.reliefH, T) });
      // a grip on the back would need supports; a small knob printed separately and glued is easier:
      const knob = circle(dx + ob.cx, ob.minY - 16, 7);
      parts.push({ name: 'مسكة الختم (تُلصق خلفه)', color: p.stampColor, geometry: extrude(knob, 14, 0) });
    }
    return parts.filter((x) => x.geometry);
  },
};
