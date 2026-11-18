/* eslint-disable import/no-anonymous-default-export */
// لوحة «حرف كبير + اسم»: حرف أول كبير واقف، وفوقه الاسم بخط متصل (مثل لوحات MakerWorld الشهيرة).
// المحاور: الشكل يُرسم في المستوى XZ (العرض × الارتفاع) ويُبثق للخلف على Y، والواجهة نحو -Y (جهة الكاميرا).
import { shapeText, bounds } from '../lib/fonts.js';
import { union, difference, offset, roundRect, bounds2, extrude } from '../lib/geo.js';

const RTL = /[֐-ࣿ]/;

/** أول حرف من الاسم (منطقياً) — للعربي هو الحرف الأيمن */
const firstLetter = (s) => Array.from((s || '').replace(/\s+/g, ''))[0] || '';

/** نص بحجم معيّن: إمّا بارتفاع h أو بعرض w، ومتمركز أفقياً حول cx */
function place(f, text, { h, w, maxH = Infinity, cx = 0, bottom, cy, spacing = 0 }) {
  const raw = shapeText(f, text, 100, { spacing });
  const b = bounds(raw.contours);
  if (!b.w || !b.h) return { contours: [], b: bounds2([]) };
  const s = w ? Math.min(w / b.w, maxH / b.h) : h / b.h;
  const dy = bottom !== undefined ? bottom - b.minY * s : cy - b.cy * s;
  const contours = union(raw.contours.map((c) => c.map(([x, y]) => [cx + (x - b.cx) * s, y * s + dy])));
  return { contours, b: bounds2(contours) };
}

const signedArea = (c) => {
  let a = 0;
  for (let i = 0, j = c.length - 1; i < c.length; j = i++) a += (c[j][0] + c[i][0]) * (c[j][1] - c[i][1]);
  return a / 2;
};

/**
 * اللوحة تُطبع واقفة، فأي قطعة منفصلة (نقاط الحروف العربية، الهمزة، نقطة i...) ستكون معلّقة في الهواء.
 * نصل كل قطعة منفصلة بأقرب نقطة من الشكل بجسر صغير بعرض bw.
 */
function bridges(shape, bw) {
  const outers = shape.map((c) => ({ c, a: signedArea(c) }));
  if (outers.length < 2) return [];
  const main = outers.reduce((m, o) => (Math.abs(o.a) > Math.abs(m.a) ? o : m));
  const sign = Math.sign(main.a);
  const sample = (c) => (c.length > 300 ? c.filter((_, i) => i % Math.ceil(c.length / 300) === 0) : c);
  let islands = outers.filter((o) => o !== main && Math.sign(o.a) === sign && Math.abs(o.a) > 0.5).map((o) => sample(o.c));
  const pts = sample(main.c).slice();
  const out = [];
  while (islands.length) {
    let best = null;
    islands.forEach((isl, k) => {
      for (const q of isl)
        for (const p of pts) {
          const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
          if (!best || d < best.d) best = { d, k, p, q };
        }
    });
    const { p: a, q: b, k } = best;
    const len = Math.sqrt(best.d) || 1;
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    const nx = -uy * (bw / 2), ny = ux * (bw / 2);
    const e = bw * 0.6; // يدخل قليلاً في الطرفين ليلتحم بهما
    const a2 = [a[0] - ux * e, a[1] - uy * e], b2 = [b[0] + ux * e, b[1] + uy * e];
    out.push([[a2[0] + nx, a2[1] + ny], [b2[0] + nx, b2[1] + ny], [b2[0] - nx, b2[1] - ny], [a2[0] - nx, a2[1] - ny]]);
    pts.push(...islands[k]);
    islands = islands.filter((_, i) => i !== k);
  }
  return out;
}

/** بثق شكل (x,z) للخلف: الواجهة الأمامية عند y = front، بعمق depth باتجاه +Y */
function slab(contours, front, depth) {
  const g = extrude(contours, depth, 0); // Z ∈ [0, depth]
  if (!g) return null;
  g.rotateX(Math.PI / 2); // (x, y, z) → (x, -z, y)
  g.translate(0, front + depth, 0); // y ∈ [front, front + depth]
  return g;
}

export default {
  id: 'initial-sign',
  name: 'حرف كبير مع اسم',
  description: 'لوحة واقفة بحرف أول كبير وفوقه الاسم بخط متصل، بلونين أو ثلاثة. هدية مثالية للمواليد والأعراس وغرف الأطفال.',
  category: 'هدايا',
  params: [
    { key: 'name', label: 'الاسم', type: 'text', default: 'Razan', group: 'النص', maxLength: 20 },
    { key: 'initial', label: 'الحرف الكبير', type: 'text', default: '', group: 'النص', maxLength: 2,
      help: 'اتركه فارغاً ليُؤخذ أول حرف من الاسم تلقائياً' },
    { key: 'initialFont', label: 'خط الحرف الكبير', type: 'font', sample: ['initial', 'name'], default: 'rakkas', group: 'النص' },
    { key: 'nameFont', label: 'خط الاسم', type: 'font', sample: ['name'], default: 'pacifico', group: 'النص' },
    { key: 'spacing', label: 'تباعد حروف الاسم', type: 'number', min: -3, max: 6, step: 0.1, unit: 'مم', default: 0, group: 'النص' },

    { key: 'height', label: 'ارتفاع الحرف الكبير', type: 'number', min: 50, max: 220, step: 1, unit: 'مم', default: 110, group: 'الأبعاد' },
    { key: 'thickness', label: 'سماكة الحرف', type: 'number', min: 4, max: 30, step: 0.5, unit: 'مم', default: 10, group: 'الأبعاد' },
    { key: 'nameWidth', label: 'عرض الاسم', type: 'number', min: 50, max: 180, step: 1, unit: '%', default: 120, group: 'الأبعاد',
      help: 'نسبةً إلى عرض الحرف الكبير' },
    { key: 'namePos', label: 'ارتفاع الاسم على الحرف', type: 'number', min: 0, max: 100, step: 1, unit: '%', default: 38, group: 'الأبعاد' },
    { key: 'nameShift', label: 'إزاحة الاسم أفقياً', type: 'number', min: -40, max: 40, step: 1, unit: '%', default: 0, group: 'الأبعاد' },

    { key: 'mode', label: 'شكل الاسم', type: 'select', default: 'raised', group: 'الاسم',
      options: [{ value: 'raised', label: 'بارز من الأمام' }, { value: 'through', label: 'نافذ (يظهر من الجهتين)' }] },
    { key: 'proud', label: 'بروز الاسم', type: 'number', min: 0, max: 8, step: 0.2, unit: 'مم', default: 2.4, group: 'الاسم' },
    { key: 'halo', label: 'إطار حول الاسم', type: 'number', min: 0, max: 6, step: 0.1, unit: 'مم', default: 2, group: 'الاسم',
      help: 'حافة بلون الحرف حول الاسم، تمسك الاسم حين يخرج عن حدود الحرف' },

    { key: 'base', label: 'قاعدة', type: 'checkbox', default: true, group: 'القاعدة' },
    { key: 'baseH', label: 'ارتفاع القاعدة', type: 'number', min: 2, max: 15, step: 0.5, unit: 'مم', default: 5, group: 'القاعدة', show: (p) => p.base },
    { key: 'baseDepth', label: 'عمق القاعدة', type: 'number', min: 10, max: 80, step: 1, unit: 'مم', default: 35, group: 'القاعدة', show: (p) => p.base },

    { key: 'initialColor', label: 'لون الحرف', type: 'color', default: '#f4f4f2', group: 'الألوان' },
    { key: 'nameColor', label: 'لون الاسم', type: 'color', default: '#e8638a', group: 'الألوان' },
    { key: 'baseColor', label: 'لون القاعدة', type: 'color', default: '#f4f4f2', group: 'الألوان', show: (p) => p.base },
  ],
  fonts: (p) => [p.initialFont, p.nameFont],
  build(p, fonts) {
    const name = (p.name || '').trim();
    const ch = (p.initial || '').trim() || firstLetter(name);
    if (!ch) throw new Error('اكتب الاسم أو الحرف الكبير');
    const H = p.height;
    const init = place(fonts[p.initialFont], ch, { h: H, bottom: 0 });
    if (!init.contours.length) throw new Error('تعذّر رسم الحرف الكبير');
    const ib = init.b;

    let nameShape = [];
    if (name) {
      const cx = ib.cx + (ib.w * p.nameShift) / 100;
      // العرض نسبةً لعرض الحرف (بحد أدنى حتى لا يصغر الاسم مع الحروف النحيلة مثل I و ا)،
      // والارتفاع لا يتجاوز نصف ارتفاع الحرف (مهم للخطوط العربية العالية)
      const refW = Math.max(ib.w, H * 0.75);
      nameShape = place(fonts[p.nameFont], name, {
        w: (refW * p.nameWidth) / 100,
        maxH: H * 0.5,
        cx,
        cy: (H * p.namePos) / 100,
        spacing: p.spacing,
      }).contours;
    }

    const T = p.thickness;
    const halo = nameShape.length && p.halo > 0 ? offset(nameShape, p.halo) : [];
    let body = union(init.contours, halo); // الحرف + الإطار حول الاسم (لون الحرف)
    // وصل القطع المنفصلة (نقاط، همزة...) بالجسم حتى تُطبع اللوحة واقفة بلا قطع معلّقة
    const br = bridges(union(body, nameShape), Math.max(2.5, Math.min(7, H * 0.035)));
    if (br.length) body = union(body, br);
    // عمق دخول الاسم في الحرف: طبقة أمامية فقط، أو نافذ حتى الخلف
    const inset = p.mode === 'through' ? T : Math.min(T, 1.6);

    const bodyFront = nameShape.length ? difference(body, nameShape) : body;
    const parts = [];
    const bodyGeos = [slab(bodyFront, 0, inset), inset < T ? slab(body, inset, T - inset) : null].filter(Boolean);
    // إذا خرج الاسم عن الحرف بلا إطار، نضيف خلفه سماكة حتى لا يبقى معلّقاً
    const nameG = nameShape.length ? slab(nameShape, -p.proud, p.proud + inset) : null;
    const nameBack = nameShape.length && inset < T ? difference(nameShape, body) : [];
    if (nameBack.length) bodyGeos.push(slab(nameBack, inset, T - inset));

    // كل شيء يقف على z = 0
    const all = bounds2(union(body, nameShape));
    const lift = (p.base ? p.baseH : 0) - all.minY;
    for (const g of bodyGeos) g.translate(0, 0, lift);
    if (nameG) nameG.translate(0, 0, lift);

    for (const g of bodyGeos) parts.push({ name: 'الحرف', color: p.initialColor, geometry: g });
    if (nameG) parts.push({ name: 'الاسم', color: p.nameColor, geometry: nameG });

    if (p.base) {
      const front = -p.proud - 2;
      const depth = Math.max(p.baseDepth, T + p.proud + 4);
      const w = all.w + 12;
      const cy = front + depth / 2;
      const plate = roundRect(all.cx, cy, w, depth, Math.min(6, depth / 2));
      parts.push({ name: 'القاعدة', color: p.baseColor, geometry: extrude(plate, p.baseH, 0) });
    }
    return parts.filter((x) => x.geometry);
  },
};

