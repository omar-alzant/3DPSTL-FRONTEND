/* eslint-disable import/no-anonymous-default-export */
// اسمان في مجسّم واحد: من الأمام يُقرأ الاسم الأول، ومن الجانب يُقرأ الاسم الثاني.
// الفكرة: كل حرف من الاسم الأول يُبثق باتجاه العمق (Y)، والحرف المقابل له من الاسم الثاني يُبثق
// باتجاه العرض (X)، والمجسّم النهائي لكل حرف هو تقاطع الاثنين. الحروف كلها بنفس الارتفاع
// حتى يبقى كل صف من الحرف الأول مغطّى بالحرف الثاني (ولهذا يجب أن يتساوى عدد الحروف).
import { shapeText, bounds } from '../lib/fonts.js';
import { union, offset, roundRect, extrude, intersect, merge, THREE } from '../lib/geo.js';

const MARKS = /[ً-ٰٟـ]/g; // التشكيل والتطويل لا تُحسب حروفاً
const RTL = /[֐-ࣿ]/;

/** حروف النص بالترتيب المرئي (من اليسار لليمين كما يراها الناظر) */
export function letters(text, upper) {
  let t = (text || '').replace(/\s+/g, '').replace(MARKS, '');
  if (upper) t = t.toLocaleUpperCase('en');
  const list = Array.from(t);
  return RTL.test(t) ? list.reverse() : list;
}

/** حرف واحد بارتفاع H بالضبط، يبدأ من (0,0)، مع ضغط أفقي للحروف العريضة جداً */
function glyph(f, ch, H, maxW) {
  const { contours, missing } = shapeText(f, ch, 100);
  if (missing) throw new Error(`الحرف «${ch}» غير موجود في هذا الخط — جرّب خطاً آخر`);
  const b = bounds(contours);
  if (!b.h || !b.w) throw new Error(`تعذّر رسم الحرف «${ch}»`);
  const sy = H / b.h;
  const sx = Math.min(sy, maxW / b.w);
  return {
    contours: union(contours.map((c) => c.map(([x, y]) => [(x - b.minX) * sx, (y - b.minY) * sy]))),
    w: b.w * sx,
  };
}

/** مواقع الحروف على المحور، مع توزيع أي فرق في الطول على الفراغات حتى يتساوى طول الاسمين */
function layout(gs, gap, total) {
  const n = gs.length;
  const used = gs.reduce((s, g) => s + g.w, 0);
  const g = n > 1 ? (total - used) / (n - 1) : 0;
  let pos = n > 1 ? 0 : (total - used) / 2;
  return gs.map((x) => {
    const p = pos;
    pos += x.w + g;
    return p;
  });
}

// تحويل محاور البثق: الشكل مرسوم في XY ومبثوق على Z
// للاسم الأمامي: X→X ، Y→Z (ارتفاع) ، Z→عمق Y   (دوران حول X بـ 90°)
// للاسم الجانبي: X→Y ، Y→Z (ارتفاع) ، Z→X        (تبديل دوري للمحاور، دوران صحيح بدون انعكاس)
const SIDE = new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);

export default {
  id: 'dual-name',
  name: 'اسمان من جهتين',
  description: 'مجسّم واحد تقرأ فيه اسماً من الأمام واسماً آخر من الجانب. يجب أن يتساوى عدد حروف الاسمين، وأفضل نتيجة مع الحروف الإنكليزية الكبيرة والأرقام.',
  category: 'هدايا',
  params: [
    { key: 'text', label: 'الاسم من الأمام', type: 'text', default: 'OMAR', group: 'الاسمان', maxLength: 12 },
    { key: 'text2', label: 'الاسم من الجانب', type: 'text', default: '2026', group: 'الاسمان', maxLength: 12,
      help: 'يجب أن يكون عدد حروفه مساوياً لعدد حروف الاسم الأول' },
    { key: 'upper', label: 'أحرف إنكليزية كبيرة (CAPS)', type: 'checkbox', default: true, group: 'الاسمان' },
    { key: 'font', label: 'الخط', type: 'font', sample: ['text', 'text2'], default: 'cairo-black', group: 'الاسمان' },
    { key: 'height', label: 'ارتفاع الحروف', type: 'number', min: 15, max: 120, step: 1, unit: 'مم', default: 40, group: 'الأبعاد' },
    { key: 'gap', label: 'المسافة بين الحروف', type: 'number', min: 0, max: 15, step: 0.5, unit: 'مم', default: 3, group: 'الأبعاد' },
    { key: 'baseT', label: 'سماكة القاعدة', type: 'number', min: 1.5, max: 10, step: 0.1, unit: 'مم', default: 4, group: 'القاعدة' },
    { key: 'margin', label: 'هامش القاعدة', type: 'number', min: 1, max: 15, step: 0.5, unit: 'مم', default: 4, group: 'القاعدة' },
    { key: 'baseColor', label: 'لون القاعدة', type: 'color', default: '#141414', group: 'الألوان' },
    { key: 'textColor', label: 'لون الحروف', type: 'color', default: '#f4f4f2', group: 'الألوان' },
  ],
  fonts: (p) => [p.font],
  build(p, fonts) {
    const f = fonts[p.font];
    const a = letters(p.text, p.upper);
    const b = letters(p.text2, p.upper);
    if (!a.length || !b.length) throw new Error('اكتب الاسمين');
    if (a.length !== b.length)
      throw new Error(`عدد الحروف يجب أن يتساوى: الأمام ${a.length} — الجانب ${b.length}`);

    const H = p.height;
    const maxW = H * 0.95;
    const A = a.map((ch) => glyph(f, ch, H, maxW));
    const B = b.map((ch) => glyph(f, ch, H, maxW));
    const len = (gs) => gs.reduce((s, g) => s + g.w, 0) + p.gap * (gs.length - 1);
    const L = Math.max(len(A), len(B));
    const xs = layout(A, p.gap, L); // مواقع حروف الاسم الأمامي على X
    const ys = layout(B, p.gap, L); // مواقع حروف الاسم الجانبي على Y
    const e = 0.5;

    const solids = [];
    const rects = [];
    A.forEach((ga, i) => {
      const gb = B[i];
      const x0 = xs[i], y0 = ys[i];
      // الحرف الأمامي مبثوق على عمق الحرف الجانبي
      const fa = extrude(ga.contours, gb.w + 2 * e, 0);
      fa.rotateX(Math.PI / 2); // y = -z
      fa.translate(x0, y0 + gb.w + e, p.baseT);
      // الحرف الجانبي مبثوق على عرض الحرف الأمامي
      const fb = extrude(gb.contours, ga.w + 2 * e, 0);
      fb.applyMatrix4(SIDE);
      fb.translate(x0 - e, y0, p.baseT);
      const s = intersect(fa, fb);
      if (s) solids.push(s);
      rects.push(roundRect(x0 + ga.w / 2, y0 + gb.w / 2, ga.w, gb.w)[0]);
    });

    // القاعدة: شريط مائل بأطراف دائرية يمرّ تحت كل الحروف
    const corners = rects.flat();
    const c0 = [xs[0] + A[0].w / 2, ys[0] + B[0].w / 2];
    const n = A.length - 1;
    const c1 = [xs[n] + A[n].w / 2, ys[n] + B[n].w / 2];
    let ux = c1[0] - c0[0], uy = c1[1] - c0[1];
    const ul = Math.hypot(ux, uy) || 1;
    if (n === 0) { ux = Math.SQRT1_2; uy = Math.SQRT1_2; } else { ux /= ul; uy /= ul; }
    let tMin = Infinity, tMax = -Infinity, d = 0;
    for (const [x, y] of corners) {
      const t = (x - c0[0]) * ux + (y - c0[1]) * uy;
      tMin = Math.min(tMin, t); tMax = Math.max(tMax, t);
      d = Math.max(d, Math.abs(-(x - c0[0]) * uy + (y - c0[1]) * ux));
    }
    const hw = d + p.margin;
    const w = tMax - tMin + 2 * p.margin;
    const mid = (tMin + tMax) / 2;
    const [cx, cy] = [c0[0] + ux * mid, c0[1] + uy * mid];
    const ang = Math.atan2(uy, ux);
    const pill = roundRect(0, 0, Math.max(w, 2 * hw), 2 * hw, hw, 16)[0].map(([x, y]) => [
      cx + x * Math.cos(ang) - y * Math.sin(ang),
      cy + x * Math.sin(ang) + y * Math.cos(ang),
    ]);
    const base = union([pill], offset(rects, p.margin));

    return [
      { name: 'القاعدة', color: p.baseColor, geometry: extrude(base, p.baseT, 0) },
      { name: 'الحروف', color: p.textColor, geometry: merge(solids) },
    ].filter((x) => x.geometry);
  },
};
