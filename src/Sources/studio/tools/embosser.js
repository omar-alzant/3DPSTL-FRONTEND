/* eslint-disable import/no-anonymous-default-export */
// Paper embosser: two plates joined by a hinge that prints in place (no assembly).
// One plate has the name standing up, the other the same name sunk in, folded over so they meet:
// put paper or card between them, press, and the name comes out raised on the paper.
//   - laid flat for printing: the hinge runs along x at y = 0, plate A (raised) at y > 0, plate B (sunk) at y < 0
//   - closing turns B over the hinge axis: (x, y, z) → (x, −y, 2r − z), so B's face lands paperGap above A's face
import { textBox } from '../lib/fonts.js';
import { traceImage } from '../lib/trace.js';
import { THREE, union, difference, intersection, offset, circle, roundRect, bounds2, extrude } from '../lib/geo.js';

const flipY = (cs) => cs.map((c) => c.map(([x, y]) => [x, -y]).reverse());
const toAxisX = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));

/** a round piece along x (from x0 to x1), around the hinge axis (y = 0, z = r); `hole` makes a ring */
function knuckle(x0, x1, r, hole = 0) {
  const shape = hole > 0 ? difference(circle(0, 0, r, 48), circle(0, 0, hole, 40)) : circle(0, 0, r, 48);
  const g = extrude(shape, x1 - x0, 0);
  if (!g) return null;
  g.applyMatrix4(toAxisX);
  g.translate(x0, 0, r);
  return g;
}

export default {
  id: 'embosser',
  name: 'ختم نافر للورق',
  description: 'كبّاسة بمفصلة بتنطبع جاهزة: الاسم أو الشعار بارز بجهة وغاطس بالجهة التانية. بتحط الورقة بالنص وبتكبس، فبيطلع الاسم نافر عالورق. للبطاقات والأكياس وعلب الهدايا.',
  category: 'أعمال',
  params: [
    { key: 'line1', label: 'السطر الأول', type: 'text', default: '3DSTL', maxLength: 24, group: 'النص' },
    { key: 'line2', label: 'السطر الثاني (اختياري)', type: 'text', default: '', maxLength: 30, group: 'النص' },
    { key: 'font', label: 'الخط', type: 'font', sample: ['line1', 'line2'], default: 'cairo-black', group: 'النص' },
    { key: 'logo', label: 'شعار (اختياري)', type: 'image', samplePic: false, default: '', group: 'الشعار', maxSize: 400 },
    { key: 'logoDark', label: 'قتامة الشعار', type: 'number', min: 10, max: 90, step: 1, unit: '%', default: 50, group: 'الشعار', show: (p) => !!p.logo },
    { key: 'logoPos', label: 'مكان الشعار', type: 'select', default: 'side', group: 'الشعار', show: (p) => !!p.logo,
      options: [{ value: 'side', label: 'جنب النص' }, { value: 'top', label: 'فوق النص' }, { value: 'only', label: 'الشعار وحده' }] },

    { key: 'width', label: 'عرض الختم', type: 'number', min: 30, max: 100, step: 1, unit: 'مم', default: 60, group: 'الحجم' },
    { key: 'height', label: 'طول الختم', type: 'number', min: 18, max: 60, step: 1, unit: 'مم', default: 26, group: 'الحجم' },
    { key: 'relief', label: 'عمق النفرة', type: 'number', min: 0.6, max: 2, step: 0.1, unit: 'مم', default: 1, group: 'الحجم' },
    { key: 'paper', label: 'سماكة الورق', type: 'number', min: 0.1, max: 0.8, step: 0.05, unit: 'مم', default: 0.3, group: 'الحجم' },
    { key: 'plateT', label: 'سماكة اللوحتين', type: 'number', min: 3, max: 6, step: 0.1, unit: 'مم', default: 4, group: 'الحجم' },

    { key: 'colorA', label: 'لون اللوحة البارزة', type: 'color', default: '#3c6e5a', group: 'الألوان' },
    { key: 'textColor', label: 'لون الكتابة البارزة', type: 'color', default: '#c9e4b4', group: 'الألوان' },
    { key: 'colorB', label: 'لون اللوحة الغاطسة', type: 'color', default: '#3c6e5a', group: 'الألوان' },
  ],
  fonts: (p) => ([p.line1, p.line2].some((t) => t?.trim()) && !(p.logo && p.logoPos === 'only') ? [p.font] : []),
  async build(p, fonts) {
    const W = p.width;
    const H = p.height;
    const T = p.plateT;
    const h = p.relief;
    const g = p.paper + 0.15; // gap between the faces when closed: the paper and a little play
    const r = T + g / 2; // hinge radius: closing puts B's face at 2r − T = T + g
    const rp = Math.max(1.4, r * 0.38); // the pin (part of plate A's hinge pieces)
    const rh = rp + 0.35; // its hole in plate B's hinge pieces (play so it turns)
    const edge = r + 0.6; // plates start here, clear of the other plate's hinge pieces

    // the pad: content area inside a margin
    const cy = edge + H / 2;
    const plateA = roundRect(0, cy, W, H, 3);
    const inner = offset(plateA, -2.5);
    const ib = bounds2(inner);

    const lines = [p.line1, p.line2].map((t) => (t || '').trim()).filter(Boolean);
    const useLogo = !!p.logo;
    const logoOnly = useLogo && p.logoPos === 'only';
    if (!lines.length && !useLogo) throw new Error('اكتب الاسم أو ارفع شعار');

    let logo = [];
    let area = { cx: 0, cy, w: ib.w, h: ib.h };
    if (useLogo) {
      const t = await traceImage(p.logo, { threshold: p.logoDark });
      if (!t.contours.length) throw new Error('ما لقينا شي بالشعار — جرّب تغيّر «قتامة الشعار»');
      const lb = bounds2(t.contours);
      let la;
      if (logoOnly || !lines.length) la = { cx: 0, cy, w: ib.w, h: ib.h };
      else if (p.logoPos === 'top') {
        la = { cx: 0, cy: cy + ib.h * 0.25, w: ib.w, h: ib.h * 0.46 };
        area = { cx: 0, cy: cy - ib.h * 0.25, w: ib.w, h: ib.h * 0.46 };
      } else {
        la = { cx: ib.w / 2 - ib.h / 2, cy, w: ib.h, h: ib.h };
        area = { cx: -ib.h / 2 - 1, cy, w: ib.w - ib.h - 2, h: ib.h };
      }
      const s = Math.min(la.w / lb.w, la.h / lb.h);
      logo = union(t.contours.map((c) => c.map(([x, y]) => [la.cx + (x - lb.cx) * s, la.cy + (y - lb.cy) * s])));
    }
    let text = [];
    if (lines.length && !logoOnly) {
      const weights = lines.map((_, i) => (i === 0 ? 1.3 : 1));
      const total = weights.reduce((a, b) => a + b, 0);
      const lead = 0.25;
      const unit = area.h / (total + lead * (lines.length - 1));
      let y = area.cy + area.h / 2;
      lines.forEach((line, i) => {
        const lh = unit * weights[i];
        const tb = textBox(fonts[p.font], line, { height: lh * 0.78, maxWidth: area.w, cx: area.cx, cy: y - lh / 2 });
        text = union(text, tb.contours);
        y -= lh + unit * lead;
      });
    }
    // very thin strokes don't emboss: thicken them a touch, then keep inside the pad
    const art = intersection(offset(union(text, logo), 0.15), inner);
    if (!art.length) throw new Error('الكتابة صغيرة كتير على هالحجم — كبّر الختم');

    // plate B: the mirror of A across the hinge, with the art sunk in (a little wider for the paper)
    const plateB = flipY(plateA);
    const recess = offset(flipY(art), p.paper + 0.15);
    const depth = h + 0.3;

    // hinge: 5 pieces along x, alternating A / B, with a small gap between them
    const L = Math.max(20, W - 8);
    const n = 5;
    const xg = 0.45;
    const seg = (L - (n - 1) * xg) / n;
    const hingeA = [];
    const hingeB = [];
    for (let k = 0; k < n; k++) {
      const x0 = -L / 2 + k * (seg + xg);
      const x1 = x0 + seg;
      if (k % 2 === 0) {
        hingeA.push(knuckle(x0, x1, r));
        // arm from the hinge piece into plate A
        hingeA.push(extrude(roundRect((x0 + x1) / 2, (edge + 2) / 2, seg, edge + 2, 0), T, 0));
      } else {
        hingeB.push(knuckle(x0, x1, r, rh));
        // arm into plate B, starting outside the pin hole
        const y0 = -(edge + 2);
        const y1 = -(rh + 0.8);
        hingeB.push(extrude(roundRect((x0 + x1) / 2, (y0 + y1) / 2, seg, y1 - y0, 0), T, 0));
      }
    }
    // the pin runs through every piece; it belongs to A and turns inside B's holes
    hingeA.push(knuckle(-L / 2, L / 2, rp));

    const parts = [
      { name: 'اللوحة البارزة', color: p.colorA, geometry: extrude(plateA, T, 0) },
      { name: 'الكتابة البارزة', color: p.textColor, geometry: extrude(art, h, T) },
      { name: 'اللوحة الغاطسة', color: p.colorB, geometry: extrude(plateB, T - depth, 0) },
      { name: 'اللوحة الغاطسة', color: p.colorB, geometry: extrude(difference(plateB, recess), depth, T - depth) },
      ...hingeA.map((geometry) => ({ name: 'المفصلة', color: p.colorA, geometry })),
      ...hingeB.map((geometry) => ({ name: 'المفصلة', color: p.colorB, geometry })),
    ];
    return parts.filter((x) => x.geometry);
  },
};
