/* eslint-disable import/no-anonymous-default-export */
// حقيبة TPU تُطبع قطعة واحدة وهي واقفة (بلا دعامات):
// قاع مصمت + أربعة جدران مثقّبة بنمط + زوايا دائرية + مقبضان على شكل قوس بأعلى مدبّب.
// كل الفتحات أعلاها مدبّب (سداسي بالرأس للأعلى / معيّن) حتى لا يحتاج الطابع إلى دعامات.
import { union, difference, intersection, offset, roundRect, extrude, THREE } from '../lib/geo.js';

const BED = 250; // أقصى مقاس آمن لسطح 256 مم

// ——— أنماط الثقوب ضمن مستطيل (x0..x1, y0..y1) ———
function hexHoles(x0, y0, x1, y1, c, web) {
  // سداسي رأسه للأعلى: المسافة الأفقية بين المراكز = c
  const inR = (c - web) / 2; // نصف القطر الداخلي للثقب
  const R = (inR * 2) / Math.sqrt(3);
  if (inR <= 0.4) return [];
  const py = (c * Math.sqrt(3)) / 2;
  return grid(x0, y0, x1, y1, c, py, inR, R, (cx, cy) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 3;
      pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
    }
    return pts;
  });
}

function diamondHoles(x0, y0, x1, y1, c, web) {
  const h = (c - web * Math.SQRT2) / 2; // نصف القطر
  if (h <= 0.5) return [];
  return grid(x0, y0, x1, y1, c, c / 2, h, h, (cx, cy) => [[cx, cy - h], [cx + h, cy], [cx, cy + h], [cx - h, cy]]);
}

function circleHoles(x0, y0, x1, y1, c, web) {
  const r = (c - web) / 2;
  if (r <= 0.5) return [];
  const py = (c * Math.sqrt(3)) / 2;
  return grid(x0, y0, x1, y1, c, py, r, r, (cx, cy) => {
    const pts = [];
    const n = Math.max(12, Math.min(32, Math.round(r * 3)));
    // رأس مدبّب صغير بالأعلى (شكل قطرة) حتى يُطبع السقف بلا تدلٍّ
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    const top = pts.findIndex((p) => p[1] === Math.max(...pts.map((q) => q[1])));
    pts[top] = [cx, cy + r * 1.35];
    return pts;
  });
}

/** شبكة متداخلة الصفوف تبدأ من مركز اللوح، ولا يدخل إلا الثقب الواقع بالكامل داخل المستطيل */
function grid(x0, y0, x1, y1, px, py, halfW, halfH, make) {
  const out = [];
  const xc = (x0 + x1) / 2, yc = (y0 + y1) / 2;
  const R = Math.ceil((y1 - y0) / py / 2) + 1;
  const K = Math.ceil((x1 - x0) / px / 2) + 1;
  for (let r = -R; r <= R; r++) {
    const cy = yc + r * py;
    const shift = Math.abs(r) % 2 ? px / 2 : 0;
    for (let k = -K; k <= K; k++) {
      const cx = xc + shift + k * px;
      if (cx - halfW < x0 || cx + halfW > x1 || cy - halfH < y0 || cy + halfH * 1.35 > y1) continue;
      out.push(make(cx, cy));
    }
  }
  return out;
}

function holes(p, x0, y0, x1, y1) {
  if (p.pattern === 'none') return [];
  const f = p.pattern === 'diamond' ? diamondHoles : p.pattern === 'circle' ? circleHoles : hexHoles;
  return f(x0, y0, x1, y1, p.cell, p.web);
}

/** فتحة المقبض: جانبان عموديان وسقف بزاوية 45° (يُطبع بلا دعامات) مع تدوير خفيف */
function handleOpening(cx, zBase, w, h) {
  const a = w / 2;
  const side = Math.max(0, h - a); // ارتفاع الجزء العمودي قبل السقف المائل
  const poly = [[cx - a, zBase - 1], [cx + a, zBase - 1], [cx + a, zBase + side], [cx, zBase + side + a], [cx - a, zBase + side]];
  const r = Math.min(4, a / 4);
  return offset(offset([poly], -r), r);
}

/** لوح جدار بعرض L (من -L/2 إلى L/2) وارتفاع من z0 إلى z1، مع مقبض اختياري */
function panel(p, L, z0, z1, withHandle) {
  const edge = Math.max(p.web * 1.5, 3);
  let shape = difference(roundRect(0, (z0 + z1) / 2, L, z1 - z0), holes(p, -L / 2 + edge, z0 + p.bottomBand, L / 2 - edge, z1 - p.rim));
  if (withHandle) {
    const open = handleOpening(0, z1, p.handleWidth, p.handleHeight);
    const outer = offset(open, p.strap);
    // المقبض يبدأ من داخل الحافة العلوية (مصمتة) فيلتحم بها
    const arch = intersection(difference(outer, open), roundRect(0, z1 - p.rim + 1 + 200, L, 400));
    shape = union(shape, arch);
  }
  return shape;
}

const SIDE = new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);

/** ربع حلقة (زاوية الحقيبة) حول (cx, cy) في الربع (sx, sy) */
function cornerRing(cx, cy, sx, sy, R, t, seg = 24) {
  const pts = [];
  const start = sx > 0 ? (sy > 0 ? 0 : -Math.PI / 2) : sy > 0 ? Math.PI / 2 : Math.PI;
  for (let i = 0; i <= seg; i++) {
    const a = start + (i / seg) * (Math.PI / 2);
    pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
  }
  for (let i = seg; i >= 0; i--) {
    const a = start + (i / seg) * (Math.PI / 2);
    pts.push([cx + (R - t) * Math.cos(a), cy + (R - t) * Math.sin(a)]);
  }
  return [pts];
}

export default {
  id: 'tpu-tote',
  name: 'حقيبة TPU',
  description: 'حقيبة يد مرنة تُطبع قطعة واحدة بخيط TPU، بجدران مثقّبة بنمط تختاره ومقبضين. تُطبع واقفة بلا دعامات.',
  category: 'حقائب',
  params: [
    { key: 'width', label: 'العرض', type: 'number', min: 100, max: 240, step: 1, unit: 'مم', default: 200, group: 'المقاس' },
    { key: 'depth', label: 'العمق', type: 'number', min: 40, max: 160, step: 1, unit: 'مم', default: 70, group: 'المقاس' },
    { key: 'height', label: 'ارتفاع الحقيبة', type: 'number', min: 60, max: 200, step: 1, unit: 'مم', default: 150, group: 'المقاس' },
    { key: 'corner', label: 'تدوير الزوايا', type: 'number', min: 4, max: 40, step: 1, unit: 'مم', default: 18, group: 'المقاس' },

    { key: 'pattern', label: 'النمط', type: 'select', default: 'hex', group: 'النمط',
      options: [{ value: 'hex', label: 'سداسي' }, { value: 'diamond', label: 'معيّن' }, { value: 'circle', label: 'دوائر' }, { value: 'none', label: 'مصمت' }] },
    { key: 'cell', label: 'حجم الخلية', type: 'number', min: 6, max: 40, step: 0.5, unit: 'مم', default: 14, group: 'النمط', show: (p) => p.pattern !== 'none' },
    { key: 'web', label: 'عرض الشبكة', type: 'number', min: 1.2, max: 8, step: 0.1, unit: 'مم', default: 2.4, group: 'النمط', show: (p) => p.pattern !== 'none',
      help: 'أعرض = حقيبة أقوى وأقل مرونة' },
    { key: 'rim', label: 'الحافة العلوية', type: 'number', min: 6, max: 40, step: 1, unit: 'مم', default: 14, group: 'النمط' },
    { key: 'bottomBand', label: 'الحافة السفلية', type: 'number', min: 2, max: 30, step: 1, unit: 'مم', default: 6, group: 'النمط' },

    { key: 'handles', label: 'مقبضان', type: 'checkbox', default: true, group: 'المقابض' },
    { key: 'handleWidth', label: 'عرض فتحة اليد', type: 'number', min: 60, max: 160, step: 1, unit: 'مم', default: 96, group: 'المقابض', show: (p) => p.handles },
    { key: 'handleHeight', label: 'ارتفاع فتحة اليد', type: 'number', min: 40, max: 120, step: 1, unit: 'مم', default: 62, group: 'المقابض', show: (p) => p.handles },
    { key: 'strap', label: 'عرض المقبض', type: 'number', min: 8, max: 40, step: 1, unit: 'مم', default: 18, group: 'المقابض', show: (p) => p.handles },

    { key: 'wall', label: 'سماكة الجدار', type: 'number', min: 0.8, max: 4, step: 0.1, unit: 'مم', default: 1.6, group: 'الطباعة',
      help: 'يُفضّل مضاعفات قطر الفوهة (0.4)' },
    { key: 'floor', label: 'سماكة القاع', type: 'number', min: 0.8, max: 4, step: 0.1, unit: 'مم', default: 1.6, group: 'الطباعة' },
    { key: 'color', label: 'اللون', type: 'color', material: 'TPU', default: '#e8638a', group: 'الألوان' },
  ],
  fonts: () => [],
  build(p) {
    const W = p.width, D = p.depth, H = p.height, t = p.wall;
    const R = Math.max(t + 1, Math.min(p.corner, W / 2 - 10, D / 2 - 5));
    const total = H + (p.handles ? Math.max(p.handleHeight, p.handleWidth / 2) + p.strap : 0);
    if (W > BED || D > BED || total > BED)
      throw new Error(`المقاس أكبر من سطح الطباعة (${BED} مم) — الارتفاع الكلي مع المقابض ${total.toFixed(0)} مم`);
    if (p.handles && p.handleWidth + 2 * p.strap > W - 2 * R)
      throw new Error('المقبض أعرض من واجهة الحقيبة — صغّر عرض فتحة اليد أو المقبض');

    const z0 = p.floor, z1 = H;
    const geos = [];

    // القاع
    geos.push(extrude(roundRect(0, 0, W, D, R, 12), p.floor, 0));

    // الواجهتان الأمامية والخلفية (مع المقابض)
    const LF = W - 2 * R;
    const front = panel(p, LF, z0, z1, p.handles);
    for (const sy of [-1, 1]) {
      const g = extrude(front, t, 0); // Z ∈ [0,t]
      g.rotateX(Math.PI / 2); // y = -Z ∈ [-t, 0]
      g.translate(0, sy < 0 ? -D / 2 + t : D / 2, 0);
      geos.push(g);
    }
    // الجانبان
    const LS = D - 2 * R;
    if (LS > 1) {
      const side = panel(p, LS, z0, z1, false);
      for (const sx of [-1, 1]) {
        const g = extrude(side, t, 0);
        g.applyMatrix4(SIDE); // x = Z ، y = u ، z = z
        g.translate(sx < 0 ? -W / 2 : W / 2 - t, 0, 0);
        geos.push(g);
      }
    }
    // الزوايا الدائرية (مصمتة)
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        geos.push(extrude(cornerRing(sx * (W / 2 - R), sy * (D / 2 - R), sx, sy, R, t), z1 - z0, z0));

    return geos.filter(Boolean).map((g) => ({ name: 'الحقيبة', color: p.color, geometry: g }));
  },
};
