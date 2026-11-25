/* eslint-disable import/no-anonymous-default-export */
// Clicker fidget: a mechanical keyboard switch (MX-style, sold separately) clicks inside a small body;
// the cap on top carries your picture (up to 3 colours) or a name / initial.
// Body prints the right way up (the switch snaps into a 14 mm square hole in a 1.5 mm plate).
// Cap prints face-down: the picture is on the bed (smooth and glossy) and the stem points up.
import { textBox } from '../lib/fonts.js';
import { imageShape } from '../lib/colors.js';
import { stockColor } from '../lib/palette.js';
import { union, difference, intersection, offset, circle, roundRect, bounds2, extrude } from '../lib/geo.js';

const area = (cs) => {
  let a = 0;
  for (const c of cs) for (let i = 0, j = c.length - 1; i < c.length; j = i++) a += (c[j][0] + c[i][0]) * (c[j][1] - c[i][1]);
  return Math.abs(a / 2);
};
const mirror = (cs) => cs.map((c) => c.map(([x, y]) => [-x, y]).reverse());
const moveX = (cs, dx) => cs.map((c) => c.map(([x, y]) => [x + dx, y]));

const SWITCH_HOLE = 14.0; // MX plate cut-out
const PLATE_T = 1.5; // MX plate thickness (the clips need it)
const BELOW = 9; // room under the plate for the switch body and pins

export default {
  id: 'clicker',
  name: 'كليكر (فيدجيت) من صورة',
  description: 'لعبة كليكر بتطقطق بزر كيبورد ميكانيكي (MX، بينباع لحاله) جوّاتها، وفوقها صورتك بألوانها أو اسمك أو حرفك. هدية حلوة للولاد والكبار.',
  category: 'ألعاب',
  params: [
    { key: 'design', label: 'على الغطا', type: 'select', default: 'text', group: 'التصميم',
      options: [{ value: 'image', label: 'صورة أو رسمة' }, { value: 'text', label: 'اسم أو حرف' }] },
    { key: 'image', label: 'الصورة', type: 'image', samplePic: 'drawing', default: '', group: 'التصميم', maxSize: 500, show: (p) => p.design === 'image' || p.shapeFrom === 'image' },
    { key: 'bgTol', label: 'حساسية إزالة الخلفية', type: 'number', min: 5, max: 120, step: 1, default: 40, group: 'التصميم', show: (p) => p.design === 'image' },
    { key: 'imageColors', label: 'ألوان الصورة', type: 'number', min: 1, max: 3, step: 1, default: 2, group: 'التصميم', show: (p) => p.design === 'image' },
    { key: 'shapeFrom', label: 'شكل الكليكر', type: 'select', default: 'round', group: 'التصميم',
      options: [{ value: 'round', label: 'دائري' }, { value: 'square', label: 'مربّع' }, { value: 'image', label: 'بشكل الصورة' }] },
    { key: 'text', label: 'الاسم أو الحرف', type: 'text', default: 'A', maxLength: 6, group: 'التصميم', show: (p) => p.design === 'text' },
    { key: 'font', label: 'الخط', type: 'font', sample: ['text'], default: 'lilita', group: 'التصميم', show: (p) => p.design === 'text' },
    { key: 'size', label: 'الحجم', type: 'number', min: 26, max: 60, step: 1, unit: 'مم', default: 34, group: 'المقاس' },
    { key: 'tolerance', label: 'سماحية الساق', type: 'number', min: 0, max: 0.4, step: 0.05, unit: 'مم', default: 0.15, group: 'المقاس' },
    { key: 'bodyColor', label: 'لون الجسم', type: 'color', default: '#111111', group: 'الألوان' },
    { key: 'capColor', label: 'لون الغطا', type: 'color', default: '#f5f5f5', group: 'الألوان' },
    { key: 'designColor', label: 'لون التصميم', type: 'color', default: '#d02020', group: 'الألوان', show: (p) => p.design === 'text' || p.imageColors <= 1 },
  ],
  fonts: (p) => (p.design === 'text' && p.text?.trim() ? [p.font] : []),
  async build(p, fonts) {
    const S = p.size;
    let im = null;
    if (p.design === 'image' || p.shapeFrom === 'image') {
      if (!p.image) throw new Error('ارفع صورة أو رسمة');
      const n = p.design === 'image' ? Math.round(p.imageColors) : 1;
      im = await imageShape(p.image, { tol: p.bgTol, colors: n > 1 ? n : 0 });
      if (!im.contours.length) throw new Error('ما لقينا شكل بالصورة — جرّب تغيّر حساسية إزالة الخلفية');
    }
    const b0 = im ? bounds2(im.contours) : null;
    const k = im ? (S - 4) / Math.max(b0.w, b0.h) : 1;
    const tf = (cs) => cs.map((c) => c.map(([x, y]) => [(x - b0.cx) * k, (y - b0.cy) * k]));

    // cap outline; the body is the same shape 1 mm bigger
    let cap;
    if (p.shapeFrom === 'image') {
      cap = offset(offset(union(tf(im.contours)), 2.5), -0.5); // a little border, holes closed
      cap = [cap.filter((c) => area([c]) > 1).reduce((m, c) => (area([c]) > area([m]) ? c : m))];
    } else cap = p.shapeFrom === 'square' ? roundRect(0, 0, S - 2, S - 2, 5) : circle(0, 0, (S - 2) / 2, 96);
    const capB = bounds2(cap);
    if (Math.min(capB.w, capB.h) < 20) throw new Error('الشكل ضيّق كتير على زر الكيبورد — كبّر الحجم');
    const body = offset(cap, 1);

    // ── body: floor, walls around the switch, plate with the 14 mm hole ──
    const cavity = roundRect(0, 0, 15.6, 15.6, 1);
    const hole = roundRect(0, 0, SWITCH_HOLE + 0.05, SWITCH_HOLE + 0.05, 0.3);
    const parts = [
      { name: 'الجسم', color: p.bodyColor, geometry: extrude(body, 2, 0) },
      { name: 'الجسم', color: p.bodyColor, geometry: extrude(difference(body, cavity), BELOW, 2) },
      { name: 'الجسم', color: p.bodyColor, geometry: extrude(difference(body, hole), PLATE_T, 2 + BELOW) },
    ];

    // ── cap (beside the body, face down) ──
    const bb = bounds2(body);
    const dx = bb.maxX + 8 + capB.w / 2 - capB.cx;
    const capT = 3;
    const face = 0.6;
    const field = offset(cap, -1.5);
    const fb = bounds2(field);
    const layers = [];
    if (p.design === 'text') {
      if (!p.text?.trim()) throw new Error('اكتب الاسم أو الحرف');
      const tb = textBox(fonts[p.font], p.text.trim(), { height: fb.h * 0.62, maxWidth: fb.w * 0.86, cx: fb.cx, cy: fb.cy });
      layers.push({ name: 'التصميم', color: p.designColor, shape: intersection(union(tb.contours), field) });
    } else {
      const n = Math.round(p.imageColors);
      const shape = intersection(union(tf(im.contours)), field);
      if (n > 1) {
        const order = im.regions.map((rg, i) => ({ i, sh: intersection(union(tf(rg)), shape) })).sort((a, b) => area(a.sh) - area(b.sh));
        let taken = [];
        for (const { i, sh } of order) {
          const own = difference(sh, taken);
          if (!own.length) continue;
          taken = union(taken, own);
          layers.push({ name: `لون ${i + 1}`, color: stockColor(im.palette[i]), shape: own });
        }
      } else layers.push({ name: 'التصميم', color: p.designColor, shape });
    }
    const design = union(...layers.map((L) => L.shape));
    const place = (cs) => moveX(mirror(cs), dx); // face down → mirrored
    parts.push({ name: 'الغطا', color: p.capColor, geometry: extrude(place(difference(cap, design)), face, 0) });
    for (const L of layers) if (L.shape.length) parts.push({ name: L.name, color: L.color, geometry: extrude(place(L.shape), face, 0) });
    parts.push({ name: 'الغطا', color: p.capColor, geometry: extrude(place(cap), capT - face, face) });

    // MX stem: a round post with a cross-shaped hole that pushes onto the switch
    const t = p.tolerance;
    const cross = union(roundRect(dx, 0, 4.1 + t, 1.25 + t, 0), roundRect(dx, 0, 1.25 + t, 4.1 + t, 0));
    parts.push({ name: 'ساق الزر', color: p.capColor, geometry: extrude(difference(circle(dx, 0, 2.75, 40), cross), 4, capT) });
    return parts.filter((x) => x.geometry);
  },
};
