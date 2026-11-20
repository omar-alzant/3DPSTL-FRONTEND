/* eslint-disable import/no-anonymous-default-export */
// لعبة «فليكسي» متحرّكة من صورة، تُطبع مسطّحة قطعة واحدة بمفاصلها (Print-in-place) بلا دعامات.
//
// المفصل: قرص على عنق في القطعة (A) يدخل تجويفاً في القطعة (B). للتجويف أرضية وسقف فلا يخرج القرص
// لأعلى أو لأسفل، وفتحة العنق أضيق من القرص فلا يخرج جانبياً. القطع بين القطعتين على شكل فراشة
// يتّسع بعيداً عن المفصل حتى تدور القطعة بالزاوية المطلوبة.
//
// توزيع المفاصل:
//  - ذكي: يبحث عن الأجزاء النحيلة (رقبة، أرجل، ذيل) بأي زاوية، ويلتزم بالقواعد:
//    القطع يعبر الشكل كاملاً، المفصل داخل الشكل، القطوع لا تتقاطع داخل الشكل، والقطع لا يعبر الشكل أكثر من مرتين.
//  - شرائح: قطوع متوازية على طول الشكل (للأسماك والثعابين والأعلام).
//
// الألوان: ألوان الصورة (مقلّلة إلى N لون) كطبقات رقيقة على الوجه العلوي (والسفلي إن اخترت وجهين)،
// وبينها «الطبقة الوسطى» بلون واحد. مع إطار ملوّن اختياري وحواف مشطوفة وحلقة أو ثقب تعليق.
import { imageShape } from '../lib/colors.js';
import { union, difference, intersection, offset, circle, bounds2, extrude, subtract, merge, components, inside } from '../lib/geo.js';
import { stockColor } from '../lib/palette.js';

const HINGE = { thin: 2.2, medium: 3.2, thick: 4.6 }; // نصف قطر القرص المطلوب (يُصغَّر إن لم يتّسع المكان)

const area = (cs) =>
  cs.reduce((s, c) => {
    let a = 0;
    for (let i = 0, j = c.length - 1; i < c.length; j = i++) a += (c[j][0] + c[i][0]) * (c[j][1] - c[i][1]);
    return s + a / 2;
  }, 0);
const absArea = (cs) => Math.abs(area(cs));
const rect = (x0, y0, x1, y1) => [[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]];
const clean = (cs, d = 0.25) => offset(offset(cs, -d), d);

/** سمكة افتراضية (عند عدم رفع صورة) */
function fish() {
  const body = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    body.push([Math.cos(a) * 42, Math.sin(a) * 24]);
  }
  const tail = [[-30, 0], [-64, 24], [-56, 0], [-64, -24]];
  const fin = [[-4, 20], [14, 32], [20, 20]];
  // كل المضلّعات بنفس الاتجاه حتى لا يلغي بعضها بعضاً في الدمج
  const ccw = (c) => (area([c]) < 0 ? [...c].reverse() : c);
  return difference(union([ccw(body)], [ccw(tail)], [ccw(fin)]), circle(24, 7, 4, 32));
}

/** أكبر قطعة متصلة فقط (القطع الطائرة لا تُطبع لعبةً واحدة) مع إزالة الخيوط الرفيعة */
function cleanSilhouette(cs, fillHoles) {
  const s = offset(offset(union(cs), -0.7), 0.7);
  if (!s.length) return [];
  const outer = s.reduce((m, c) => (absArea([c]) > absArea([m]) ? c : m));
  return fillHoles ? [outer] : intersection(s, [outer]);
}

// ——— تقاطع خط مع حدود الشكل ———
function edgesOf(cs, maxPts = 1600) {
  const total = cs.reduce((s, c) => s + c.length, 0);
  const k = Math.max(1, Math.ceil(total / maxPts));
  const E = [];
  for (const c0 of cs) {
    const c = k > 1 ? c0.filter((_, i) => i % k === 0) : c0;
    if (c.length < 3) continue;
    for (let i = 0; i < c.length; i++) {
      const a = c[i], b = c[(i + 1) % c.length];
      E.push([a[0], a[1], b[0], b[1]]);
    }
  }
  return E;
}
function hits(E, Q, u) {
  const ts = [];
  for (const [x1, y1, x2, y2] of E) {
    const ex = x2 - x1, ey = y2 - y1;
    const den = u[0] * ey - u[1] * ex;
    if (Math.abs(den) < 1e-12) continue;
    const qx = x1 - Q[0], qy = y1 - Q[1];
    const t = (qx * ey - qy * ex) / den;
    const s = (qx * u[1] - qy * u[0]) / den;
    if (s >= 0 && s < 1) ts.push(t);
  }
  return ts.sort((a, b) => a - b);
}
/** الوتر (المقطع داخل الشكل) الذي يمرّ بالنقطة Q باتجاه u */
function chordAt(E, Q, u, ext) {
  const ts = hits(E, Q, u);
  let k = -1;
  for (let i = 0; i + 1 < ts.length; i += 2) if (ts[i] <= 0 && ts[i + 1] >= 0) k = i;
  if (k < 0) return null;
  const t0 = ts[k], t1 = ts[k + 1];
  // القاعدة ٤: لا يعبر القطع الشكل أكثر من مرتين (لا شيء من الشكل قرب طرفيه)
  const clear = (k === 0 || ts[k - 1] < t0 - ext) && (k + 2 >= ts.length || ts[k + 2] > t1 + ext);
  const tm = (t0 + t1) / 2;
  return { M: [Q[0] + u[0] * tm, Q[1] + u[1] * tm], u, L: t1 - t0, clear };
}

// ——— هندسة المفصل في إحداثيات محلية: a عبر القطع (نحو B موجب)، b على طول القطع ———
function makeJoint(ch, side, r, p, tanE) {
  const { M, u } = ch;
  const n = [u[1] * side, -u[0] * side];
  const at = (a, b) => [M[0] + n[0] * a + u[0] * b, M[1] + n[1] * a + u[1] * b];
  // كل مضلّع بنفس الاتجاه (عكس عقارب الساعة)؛ في الجهة side = -1 ينعكس الاتجاه فيلغي الدمجُ
  // التداخل ويترك ثقباً داخل القرص أو التجويف — فيلتحم المفصل بالطباعة
  const poly = (pts) => {
    const r = pts.map(([a, b]) => at(a, b));
    return [area([r]) > 0 ? r.reverse() : r]; // نفس اتجاه circle()
  };
  const c = p.clearance, g = p.gap;
  const w = Math.max(1.2, r * 0.35);
  const Ro = r + c + w;
  const Pa = g / 2 + Ro + 0.3;
  const P = at(Pa, 0);
  const Lh = ch.L / 2 + 1;
  const gw = (b) => g / 2 + Math.abs(b) * tanE;
  const gapPoly = poly([[-gw(Lh), Lh], [-g / 2, 0], [-gw(Lh), -Lh], [gw(Lh), -Lh], [g / 2, 0], [gw(Lh), Lh]]);
  const nw = r * 0.7;
  const half = (a) => nw / 2 + c + Math.max(0, Pa - a) * Math.tan((p.swing * Math.PI) / 180);
  const slot = poly([[-g, -half(-g)], [Pa, -half(Pa)], [Pa, half(Pa)], [-g, half(-g)]]);
  return {
    ch, r, Ro, P, n,
    gap: gapPoly,
    cavity: union(circle(P[0], P[1], r + c, 48), slot),
    disk: union(circle(P[0], P[1], r, 48), poly([[-(g / 2 + 1.2), -nw / 2], [Pa, -nw / 2], [Pa, nw / 2], [-(g / 2 + 1.2), nw / 2]])),
    keepB: circle(P[0], P[1], Ro + 0.6, 40), // يجب أن يقع بالكامل داخل القطعة B
    keepA: poly([[-(g / 2 + 2), -nw / 2], [-g / 2, -nw / 2], [-g / 2, nw / 2], [-(g / 2 + 2), nw / 2]]), // جذر العنق داخل A
    aPoint: at(-(g / 2 + 1), 0),
  };
}

/** هل المقبس وجذر العنق سليمان: داخل الشكل وبعيدان عن قطوع المفاصل الأخرى؟ */
function jointOK(j, sil, otherGaps) {
  const others = otherGaps.length ? union(...otherGaps) : [];
  const clearOf = (shape) => !others.length || absArea(intersection(shape, others)) < 0.05;
  return absArea(difference(j.keepB, sil)) < 0.5 && absArea(difference(j.keepA, sil)) < 0.2 && clearOf(j.keepB) && clearOf(j.keepA);
}

/** يحاول تركيب مفصل على وتر: يجرّب الجهتين ويصغّر القرص حتى يتّسع */
function fitJoint(ch, sil, prev, p, rMax, tanE, sides) {
  for (const side of sides) {
    let r = Math.min(rMax, (ch.L - 1.6) / 2 - p.clearance - 1.2);
    while (r >= 1.8) {
      const j = makeJoint(ch, side, r, p, tanE);
      // المفصل الجديد سليم، ولا يُفسد المفاصل السابقة ولا يتقاطع معها
      if (
        ch.L >= 2 * j.Ro + 1.6 &&
        jointOK(j, sil, prev.map((q) => q.gap)) &&
        prev.every((q) => jointOK(q, sil, [...prev.filter((o) => o !== q).map((o) => o.gap), j.gap])) &&
        prev.every((q) => Math.hypot(q.P[0] - j.P[0], q.P[1] - j.P[1]) >= q.Ro + j.Ro + 1.5)
      )
        return j;
      r *= 0.85;
    }
  }
  return null;
}

/** المفاصل الذكية: أنحف الأماكن التي تقسم الشكل إلى قطعتين معقولتين */
function smartJoints(sil, p, count, rMax) {
  const E = edgesOf(sil);
  const total = absArea(sil);
  const b = bounds2(sil);
  const step = Math.min(6, Math.max(1.5, Math.sqrt(total / 700)));
  const cands = [];
  const ANG = 12;
  for (let y = b.minY + step / 2; y < b.maxY; y += step)
    for (let x = b.minX + step / 2; x < b.maxX; x += step) {
      if (!inside(sil, [x, y])) continue;
      for (let k = 0; k < ANG; k++) {
        const a = (k / ANG) * Math.PI;
        const ch = chordAt(E, [x, y], [Math.cos(a), Math.sin(a)], 2 + p.gap);
        if (ch && ch.clear && ch.L >= 2 * (1.8 + p.clearance + 1.2) + 1.6) cands.push({ ...ch, k });
      }
    }
  cands.sort((a, b2) => a.L - b2.L);
  // إزالة التكرار: أوتار متقاربة بنفس الاتجاه تقريباً
  const uniq = [];
  for (const c of cands) {
    if (uniq.length >= 160) break;
    if (uniq.some((q) => Math.hypot(q.M[0] - c.M[0], q.M[1] - c.M[1]) < 3 && Math.min(Math.abs(q.k - c.k), ANG - Math.abs(q.k - c.k)) <= 1)) continue;
    uniq.push(c);
  }
  const minPiece = Math.max(total * 0.03, 60);
  const chosen = [];
  const segOf = (ch) => [[ch.M[0] - ch.u[0] * (ch.L / 2 + 1), ch.M[1] - ch.u[1] * (ch.L / 2 + 1)], [ch.M[0] + ch.u[0] * (ch.L / 2 + 1), ch.M[1] + ch.u[1] * (ch.L / 2 + 1)]];
  const cross = (s1, s2) => {
    const o = (a, b2, c) => Math.sign((b2[0] - a[0]) * (c[1] - a[1]) - (b2[1] - a[1]) * (c[0] - a[0]));
    return o(s1[0], s1[1], s2[0]) !== o(s1[0], s1[1], s2[1]) && o(s2[0], s2[1], s1[0]) !== o(s2[0], s2[1], s1[1]);
  };
  for (const ch of uniq) {
    if (chosen.length >= count) break;
    // القاعدة ٣: لا تتقاطع القطوع داخل الشكل، ومسافة كافية بين المفاصل
    if (chosen.some((q) => cross(segOf(q.ch), segOf(ch)))) continue;
    // التقسيم: يجب أن يفصل القطع الشكل إلى قطعة إضافية، وكل القطع بحجم معقول
    const tanE = Math.min(Math.tan((p.swing * Math.PI) / 180) / 2, 2 / (ch.L / 2 + 1));
    const probe = makeJoint(ch, 1, 1.8, p, tanE);
    const pieces = components(difference(sil, ...chosen.map((q) => q.gap), probe.gap)).filter((c) => absArea(c) > 1);
    if (pieces.length !== chosen.length + 2 || pieces.some((c) => absArea(c) < minPiece)) continue;
    // التجويف في القطعة الأكبر (جسم الحيوان عادةً) والقرص في الأصغر (الرجل/الذيل)
    const big = (pt) => absArea(pieces.find((c) => inside(c, pt)) || []);
    const plus = [ch.M[0] + ch.u[1] * 2, ch.M[1] - ch.u[0] * 2], minus = [ch.M[0] - ch.u[1] * 2, ch.M[1] + ch.u[0] * 2];
    const sides = big(plus) >= big(minus) ? [1, -1] : [-1, 1];
    const j = fitJoint(ch, sil, chosen, p, rMax, tanE, sides);
    if (j) chosen.push(j);
  }
  return chosen;
}

/** مفاصل الشرائح المتوازية */
function stripJoints(sil, p, count, rMax) {
  const b = bounds2(sil);
  const alongX = p.axis === 'x' || (p.axis === 'auto' && b.w >= b.h);
  const len = alongX ? b.w : b.h;
  const N = count + 1;
  const pitch = len / N;
  const u = alongX ? [0, 1] : [1, 0];
  const E = edgesOf(sil);
  const joints = [];
  for (let k = 1; k < N; k++) {
    const pos = (alongX ? b.minX : b.minY) + k * pitch;
    // أطول مقطع على هذا الخط
    const Q0 = alongX ? [pos, b.minY - 5] : [b.minX - 5, pos];
    const ts = hits(E, Q0, u);
    let best = null;
    for (let i = 0; i + 1 < ts.length; i += 2) if (!best || ts[i + 1] - ts[i] > best[1] - best[0]) best = [ts[i], ts[i + 1]];
    if (!best) continue;
    const tm = (best[0] + best[1]) / 2;
    const ch = { M: [Q0[0] + u[0] * tm, Q0[1] + u[1] * tm], u, L: best[1] - best[0] };
    const tanE = Math.min(Math.tan((p.swing * Math.PI) / 180) / 2, (pitch * 0.12) / (ch.L / 2 + 1));
    const j = fitJoint(ch, sil, joints, p, Math.min(rMax, pitch * 0.3), tanE, [1, -1]);
    if (j) joints.push(j);
  }
  return joints;
}

/** حلقة أو ثقب تعليق عند أعلى الشكل في الموضع الأفقي المختار */
function addHook(sil, p) {
  if (p.hook === 'none') return sil;
  const b = bounds2(sil);
  const x = b.minX + (b.w * p.hookPos) / 100;
  const E = edgesOf(sil);
  const ts = hits(E, [x, b.minY - 5], [0, 1]);
  if (ts.length < 2) return sil;
  const top = b.minY - 5 + ts[ts.length - 1];
  const hr = p.hookHole / 2;
  if (p.hook === 'hole') {
    const cy = top - hr - 2.2;
    if (absArea(difference(circle(x, cy, hr + 1.8, 40), sil)) < 0.3) return difference(sil, circle(x, cy, hr, 40));
  }
  // حلقة (أو بديل الثقب حين لا يتّسع المكان)
  const R = hr + 2.6;
  const cy = top + R - 2;
  return difference(union(sil, circle(x, cy, R, 48)), circle(x, cy, hr, 40));
}

export default {
  id: 'flexi-toy',
  name: 'لعبة فليكسي من صورة',
  description: 'ارفع صورة فتتحوّل إلى لعبة مفصّلية ملوّنة تتحرّك، تُطبع قطعة واحدة بمفاصلها بلا تركيب. المفاصل توضع تلقائياً عند الأجزاء النحيلة.',
  category: 'ألعاب',
  params: [
    { key: 'image', label: 'الصورة', type: 'image', default: '', group: 'الصورة', maxSize: 400,
      help: 'بعد الرفع يمكنك إزالة الخلفية والقصّ. اتركها فارغة لتجربة السمكة' },
    { key: 'bgTol', label: 'حساسية فصل الخلفية', type: 'number', min: 5, max: 120, step: 1, default: 40, group: 'الصورة', show: (p) => !!p.image,
      help: 'للصور بخلفية سادة غير مُزالة. زِدها إن بقيت أجزاء من الخلفية' },
    { key: 'fillHoles', label: 'ملء الفتحات الداخلية', type: 'checkbox', default: false, group: 'الصورة' },

    { key: 'size', label: 'الطول', type: 'number', min: 50, max: 230, step: 1, unit: 'مم', default: 130, group: 'المقاس' },
    { key: 'thickness', label: 'السماكة', type: 'number', min: 5, max: 16, step: 0.5, unit: 'مم', default: 8, group: 'المقاس' },

    { key: 'layout', label: 'توزيع المفاصل', type: 'select', default: 'auto', group: 'المفاصل',
      options: [{ value: 'auto', label: 'تلقائي' }, { value: 'smart', label: 'ذكي' }, { value: 'strips', label: 'شرائح' }],
      help: 'ذكي: عند الرقبة والأرجل والذيل. شرائح: قطوع متوازية (للأسماك والثعابين)' },
    { key: 'hinges', label: 'عدد المفاصل', type: 'number', min: 1, max: 15, step: 1, default: 6, group: 'المفاصل' },
    { key: 'hingeSize', label: 'حجم المفصل', type: 'select', default: 'medium', group: 'المفاصل',
      options: [{ value: 'thin', label: 'رفيع' }, { value: 'medium', label: 'متوسط' }, { value: 'thick', label: 'سميك' }],
      help: 'الرفيع يناسب الأجزاء النحيلة، والسميك أقوى' },
    { key: 'axis', label: 'اتجاه الشرائح', type: 'select', default: 'auto', group: 'المفاصل', show: (p) => p.layout === 'strips',
      options: [{ value: 'auto', label: 'تلقائي' }, { value: 'x', label: 'أفقي' }, { value: 'y', label: 'عمودي' }] },
    { key: 'swing', label: 'زاوية كل مفصل', type: 'number', min: 3, max: 20, step: 1, unit: '°', default: 6, group: 'المفاصل' },

    { key: 'colorMode', label: 'التلوين', type: 'select', default: 'image', group: 'الألوان',
      options: [{ value: 'image', label: 'ألوان الصورة' }, { value: 'solid', label: 'لون واحد' }, { value: 'alternate', label: 'لونان متناوبان' }] },
    { key: 'colorCount', label: 'عدد الألوان', type: 'number', min: 2, max: 12, step: 1, default: 6, group: 'الألوان', show: (p) => p.colorMode === 'image' && !!p.image,
      help: 'قلّله ليناسب عدد الخيوط عندك' },
    { key: 'surface', label: 'الوجه الملوّن', type: 'select', default: 'double', group: 'الألوان',
      options: [{ value: 'double', label: 'وجهين' }, { value: 'single', label: 'وجه واحد' }] },
    { key: 'layer', label: 'سماكة طبقة الألوان', type: 'number', min: 0.4, max: 1.2, step: 0.2, unit: 'مم', default: 0.6, group: 'الألوان' },
    { key: 'color', label: 'لون الجسم (الطبقة الوسطى)', type: 'color', default: '#2f8cff', group: 'الألوان' },
    { key: 'color2', label: 'اللون الثاني', type: 'color', default: '#ffd400', group: 'الألوان', show: (p) => p.colorMode === 'alternate' },

    { key: 'stroke', label: 'إطار حول الشكل', type: 'number', min: 0, max: 6, step: 0.2, unit: 'مم', default: 0, group: 'الإطار والحواف' },
    { key: 'strokeColor', label: 'لون الإطار', type: 'color', default: '#141414', group: 'الإطار والحواف', show: (p) => p.stroke > 0 },
    { key: 'bevel', label: 'شطف الحواف', type: 'number', min: 0, max: 1.2, step: 0.2, unit: 'مم', default: 0.6, group: 'الإطار والحواف' },

    { key: 'hook', label: 'تعليق', type: 'select', default: 'none', group: 'التعليق',
      options: [{ value: 'none', label: 'بدون' }, { value: 'loop', label: 'حلقة' }, { value: 'hole', label: 'ثقب' }] },
    { key: 'hookPos', label: 'موضع التعليق', type: 'number', min: 0, max: 100, step: 1, unit: '%', default: 50, group: 'التعليق', show: (p) => p.hook !== 'none',
      help: 'من اليسار إلى اليمين، ويوضع عند أعلى الشكل' },
    { key: 'hookHole', label: 'قطر الثقب', type: 'number', min: 3, max: 10, step: 0.5, unit: 'مم', default: 4.5, group: 'التعليق', show: (p) => p.hook !== 'none' },

    { key: 'clearance', label: 'سماحية المفاصل', type: 'number', min: 0.25, max: 0.7, step: 0.05, unit: 'مم', default: 0.4, group: 'الطباعة',
      help: 'زِدها إذا التصقت المفاصل، وأنقصها إذا كانت رخوة' },
    { key: 'gap', label: 'الفراغ بين القطع', type: 'number', min: 0.4, max: 2, step: 0.1, unit: 'مم', default: 0.8, group: 'الطباعة' },
  ],
  fonts: () => [],
  async build(p) {
    // ١) الشكل والألوان
    let raw;
    let regions = null, palette = null;
    if (p.image) {
      const im = await imageShape(p.image, { tol: p.bgTol, colors: p.colorMode === 'image' ? Math.round(p.colorCount) : 0 });
      if (!im.contours.length) throw new Error('لم يُعثر على شكل في الصورة — جرّب إزالة الخلفية أو تغيير الحساسية');
      raw = im.contours;
      if (p.colorMode === 'image') ({ regions, palette } = im);
    } else raw = fish();
    const b0 = bounds2(raw);
    const s = p.size / Math.max(b0.w, b0.h);
    const tf = (cs) => cs.map((c) => c.map(([x, y]) => [(x - b0.cx) * s, (y - b0.cy) * s]));
    let inner = cleanSilhouette(tf(raw), p.fillHoles);
    if (!inner.length) throw new Error('الشكل رفيع جداً — كبّر الطول أو اختر صورة أوضح');
    inner = addHook(inner, p);
    const sil = p.stroke > 0 ? offset(inner, p.stroke) : inner;

    // طبقات الوجه الملوّن: الإطار + ألوان الصورة
    const layers = [];
    if (p.stroke > 0) layers.push({ name: 'الإطار', color: p.strokeColor, shape: difference(sil, inner) });
    if (regions)
      regions.forEach((rg, i) => {
        const sh = clean(intersection(tf(rg), inner));
        if (sh.length) layers.push({ name: `لون ${i + 1}`, color: stockColor(palette[i]), shape: sh });
      });
    const allLayers = layers.length ? union(...layers.map((l) => l.shape)) : [];

    // ٢) المفاصل
    const T = p.thickness, c = p.clearance;
    const f = Math.min(2.4, Math.max(1.2, T * 0.2)); // أرضية/سقف التجويف
    const zd0 = f + c, zd1 = T - f - c;
    if (zd1 - zd0 < 1.2) throw new Error('السماكة صغيرة على المفاصل — كبّرها إلى 6 مم على الأقل');
    const rMax = HINGE[p.hingeSize] || HINGE.medium;
    const count = Math.round(p.hinges);
    let joints = p.layout === 'strips' ? [] : smartJoints(sil, p, count, rMax);
    if (p.layout === 'strips' || (p.layout === 'auto' && joints.length < Math.min(2, count))) joints = stripJoints(sil, p, count, rMax);
    if (!joints.length) throw new Error('لم يتّسع المكان لأي مفصل — جرّب مفصلاً أرفع أو كبّر الطول');

    // ٣) القطع المتصلة بعد القطوع. القطع الذي لا يفصل الشكل (يبقى متصلاً من مكان آخر) يُلغى
    const split = (js) => components(difference(sil, ...js.map((j) => j.gap))).filter((pc) => absArea(pc) > 2);
    let pieces = split(joints);
    const works = (j) => {
      const a = pieces.findIndex((pc) => inside(pc, j.aPoint)), b = pieces.findIndex((pc) => inside(pc, j.P));
      return a >= 0 && b >= 0 && a !== b;
    };
    if (!joints.every(works)) {
      joints = joints.filter(works);
      pieces = split(joints);
    }
    if (!joints.length) throw new Error('لم يتّسع المكان لأي مفصل — جرّب مفصلاً أرفع أو كبّر الطول');
    pieces.sort((a, b) => bounds2(a).cx - bounds2(b).cx);

    // ٤) طبقات السماكة: وجه ملوّن سفلي/علوي + شطف بخطوات 0.2 مم + الجسم
    const colored = layers.length > 0;
    const hTop = colored ? p.layer : 0;
    const hBot = colored && p.surface === 'double' ? p.layer : 0;
    const bev = Math.max(0, Math.min(p.bevel, f - 0.4, T * 0.15));
    const zs = new Set([0, T, hBot, T - hTop]);
    const nb = bev > 0 ? Math.max(1, Math.round(bev / 0.2)) : 0;
    for (let i = 1; i <= nb; i++) {
      zs.add(+((i * bev) / nb).toFixed(3));
      zs.add(+(T - (i * bev) / nb).toFixed(3));
    }
    const levels = [...zs].filter((z) => z >= 0 && z <= T).sort((a, b) => a - b);

    const byColor = new Map();
    const add = (color, name, g) => {
      if (!g) return;
      if (!byColor.has(color)) byColor.set(color, { name, list: [] });
      byColor.get(color).list.push(g);
    };
    pieces.forEach((pc, i) => {
      const core = p.colorMode === 'alternate' && i % 2 ? p.color2 : p.color;
      const coreName = p.colorMode === 'alternate' && i % 2 ? 'اللون الثاني' : 'الجسم';
      const sockets = joints.filter((j) => inside(pc, j.P));
      const cav = sockets.length ? extrude(union(...sockets.map((j) => j.cavity)), T - 2 * f, f) : null;
      const pcLayers = colored ? layers.map((l) => ({ ...l, shape: intersection(l.shape, pc) })).filter((l) => l.shape.length) : [];
      const pcRest = colored ? difference(pc, allLayers) : pc;
      for (let k = 0; k + 1 < levels.length; k++) {
        const z0 = levels[k], z1 = levels[k + 1];
        if (z1 - z0 < 0.05) continue;
        const mid = (z0 + z1) / 2;
        const inset = Math.max(0, bev - Math.min(mid, T - mid));
        const foot = inset > 0.01 ? offset(pc, -inset) : pc;
        if (!foot.length) continue;
        const surf = z0 >= T - hTop - 1e-6 || z1 <= hBot + 1e-6;
        if (surf) {
          for (const l of pcLayers) {
            const sh = inset > 0.01 ? intersection(l.shape, foot) : l.shape;
            if (sh.length) add(l.color, l.name, extrude(sh, z1 - z0, z0));
          }
          const rest = inset > 0.01 ? intersection(pcRest, foot) : pcRest;
          if (rest.length) add(core, coreName, extrude(rest, z1 - z0, z0));
        } else {
          let g = extrude(foot, z1 - z0, z0);
          if (cav && z0 <= f + 1e-6 && z1 >= T - f - 1e-6) g = subtract(g, cav);
          add(core, coreName, g);
        }
      }
      // أقراص وأعناق المفاصل التي تخرج من هذه القطعة
      for (const j of joints) if (inside(pc, j.aPoint)) add(core, coreName, extrude(j.disk, zd1 - zd0, zd0));
    });

    return [...byColor.entries()].map(([color, { name, list }]) => ({ name, color, geometry: merge(list) })).filter((x) => x.geometry);
  },
};
