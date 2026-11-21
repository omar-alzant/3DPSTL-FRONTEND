/* eslint-disable import/no-anonymous-default-export */
// Vase generator: a shape (classic, cylinder, cone, hourglass, bowl) with ribs that can twist as they rise.
// It comes out as a solid body: print it with "Spiral vase" (vase mode) in the slicer for a one-wall vase,
// or as a lampshade with 0 bottom layers.
import { ringsSolid } from '../lib/heightmap.js';

// control points [height share, radius share of the widest] for each shape
const PROFILES = {
  classic: (b, m, t) => [[0, b], [0.38, m], [0.82, t * 0.92], [1, t]],
  cylinder: (b) => [[0, b], [1, b]],
  cone: (b, m, t) => [[0, b], [1, t]],
  hourglass: (b, m, t) => [[0, b], [0.5, Math.min(b, t) * 0.62], [1, t]],
  bowl: (b, m, t) => [[0, b], [0.35, (b + t) * 0.55], [1, t]],
};

/** smooth curve through the control points (Catmull-Rom) */
function profileAt(pts, u) {
  if (pts.length === 2) return pts[0][1] + (pts[1][1] - pts[0][1]) * u;
  let k = 0;
  while (k < pts.length - 2 && u > pts[k + 1][0]) k++;
  const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)];
  const s = (u - p1[0]) / (p2[0] - p1[0] || 1);
  const s2 = s * s, s3 = s2 * s;
  return 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * s + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3);
}

const WAVES = {
  round: (x) => Math.cos(x),
  sharp: (x) => 1 - (2 * Math.abs(((x / Math.PI) % 2 + 2) % 2 - 1)), // triangle
  petals: (x) => Math.abs(Math.cos(x / 2)) * 2 - 1,
};

export function vaseRadius(p) {
  const pts = PROFILES[p.profile](p.baseD / 2, p.bellyD / 2, p.topD / 2);
  const wave = WAVES[p.wave] || WAVES.round;
  const ribs = Math.round(p.ribs);
  const twist = (p.twist * Math.PI) / 180;
  return (theta, u) => {
    const r = profileAt(pts, u);
    if (!ribs || !p.ribDepth) return r;
    return r + (p.ribDepth / 2) * wave(ribs * (theta + twist * u));
  };
}

export default {
  id: 'vase',
  name: 'مولّد فازات',
  description: 'صمّم فازة أو أباجورة: اختار الشكل، عدد الخطوط وعمقها، ولفّة الخطوط وهي طالعة. بتنطبع بوضع Spiral vase بجدار واحد ناعم — وبتطلع كتير حلوة بالخيوط الحريرية.',
  category: 'ديكور',
  params: [
    { key: 'profile', label: 'الشكل', type: 'select', default: 'classic', group: 'الشكل',
      options: [{ value: 'classic', label: 'كلاسيكي (بطن ورقبة)' }, { value: 'cylinder', label: 'أسطوانة' }, { value: 'cone', label: 'مخروط' }, { value: 'hourglass', label: 'ساعة رملية' }, { value: 'bowl', label: 'وعاء' }] },
    { key: 'height', label: 'الطول', type: 'number', min: 40, max: 250, step: 1, unit: 'مم', default: 160, group: 'الشكل' },
    { key: 'baseD', label: 'قطر القاعدة', type: 'number', min: 30, max: 200, step: 1, unit: 'مم', default: 70, group: 'الشكل' },
    { key: 'bellyD', label: 'قطر البطن', type: 'number', min: 30, max: 240, step: 1, unit: 'مم', default: 110, group: 'الشكل', show: (p) => p.profile === 'classic' },
    { key: 'topD', label: 'قطر الفتحة', type: 'number', min: 20, max: 240, step: 1, unit: 'مم', default: 60, group: 'الشكل', show: (p) => p.profile !== 'cylinder' },
    { key: 'ribs', label: 'عدد الخطوط', type: 'number', min: 0, max: 48, step: 1, default: 12, group: 'النقشة' },
    { key: 'ribDepth', label: 'عمق الخطوط', type: 'number', min: 0, max: 12, step: 0.5, unit: 'مم', default: 5, group: 'النقشة', show: (p) => p.ribs > 0 },
    { key: 'wave', label: 'شكل الخطوط', type: 'select', default: 'round', group: 'النقشة', show: (p) => p.ribs > 0,
      options: [{ value: 'round', label: 'موج ناعم' }, { value: 'sharp', label: 'حادّ' }, { value: 'petals', label: 'بتلات' }] },
    { key: 'twist', label: 'اللفّة', type: 'number', min: -360, max: 360, step: 5, unit: '°', default: 90, group: 'النقشة', show: (p) => p.ribs > 0 },
    { key: 'color', label: 'اللون', type: 'color', default: '#c9a227', group: 'الألوان' },
  ],
  fonts: () => [],
  build(p) {
    const H = p.height;
    const R = vaseRadius(p);
    const seg = Math.max(96, Math.min(360, Math.round(p.ribs) * 12 || 128));
    const steps = Math.max(40, Math.min(250, Math.round(H)));
    const rings = [];
    let maxR = 0, minR = Infinity, steep = 0, prev = null;
    for (let j = 0; j <= steps; j++) {
      const u = j / steps, z = u * H;
      const ring = [];
      let ringMax = 0;
      for (let i = 0; i < seg; i++) {
        const th = (2 * Math.PI * i) / seg;
        const r = R(th, u);
        ringMax = Math.max(ringMax, r);
        minR = Math.min(minR, r);
        ring.push([r * Math.cos(th), r * Math.sin(th), z]);
      }
      if (prev !== null) steep = Math.max(steep, Math.abs(ringMax - prev) / (H / steps));
      prev = ringMax;
      maxR = Math.max(maxR, ringMax);
      rings.push(ring);
    }
    if (minR < 8) throw new Error('الفازة رفيعة كتير بمحل — كبّر الأقطار أو خفّف عمق الخطوط');
    if (maxR * 2 > 250) throw new Error(`الفازة عرضها ${Math.round(maxR * 2)} مم — أكبر من سطح الطابعة؛ صغّر الأقطار`);
    if (steep > 1.6) throw new Error('الشكل بيعرض بسرعة كتير بمحل وما رح ينطبع منيح — قرّب الأقطار من بعض أو طوّل الفازة');
    // vaseWall: printed as one wall (vase mode) — the weight is counted from the surface, not the solid inside
    return [{ name: 'الفازة', color: p.color, geometry: ringsSolid(rings), vaseWall: 0.8, slicer: { spiral_mode: '1' } }];
  },
};
