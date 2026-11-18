/* eslint-disable import/no-anonymous-default-export, no-unused-vars */
import { textBox } from '../lib/fonts.js';
import { roundRect, extrude, subtract, add, THREE } from '../lib/geo.js';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';

function frustum(bw, tw, h, r, z0 = 0) {
  const pts = [];
  for (const [w, z] of [[bw, z0], [tw, z0 + h]])
    for (const [x, y] of roundRect(0, 0, w, w, r, 4)[0]) pts.push(new THREE.Vector3(x, y, z));
  return new ConvexGeometry(pts);
}

const capCache = new Map();
function capGeometry(p) {
  const key = [p.capSize, p.capHeight, p.tolerance].join('|');
  if (capCache.has(key)) return capCache.get(key);
  const B = p.capSize, T = p.capSize - 5, H = p.capHeight, wall = 1.2;
  const outer = frustum(B, T, H, 1.6);
  const inner = frustum(B - 2 * wall, T - 2 * wall, H - 1.4, 1, -0.2);
  const shell = subtract(outer, inner);
  // ساق MX مع فتحة الصليب
  const stem = new THREE.CylinderGeometry(2.75, 2.75, H - 1.2, 40);
  stem.rotateX(Math.PI / 2);
  stem.translate(0, 0, (H - 1.2) / 2 + 0.1);
  const t = p.tolerance;
  const a = new THREE.BoxGeometry(4.1 + t, 1.25 + t, 8.2);
  const b = new THREE.BoxGeometry(1.25 + t, 4.1 + t, 8.2);
  a.translate(0, 0, 0); b.translate(0, 0, 0);
  const stemG = subtract(stem, a, b);
  const cap = add(shell, stemG);
  capCache.set(key, cap);
  return cap;
}

export default {
  id: 'keycaps',
  name: 'أزرار كيبورد بالحروف',
  description: 'أزرار ميكانيكية (MX) بحروف اسمك — كل حرف زر مستقل، بلونين.',
  category: 'هدايا',
  params: [
    { key: 'text', label: 'الحروف', type: 'text', default: 'محمد', group: 'الحروف', help: 'كل حرف يصبح زراً مستقلاً' },
    { key: 'font', label: 'الخط', type: 'font', default: 'lalezar', group: 'الحروف' },
    { key: 'letterSize', label: 'حجم الحرف', type: 'number', min: 4, max: 11, step: 0.5, unit: 'مم', default: 8, group: 'الحروف' },
    { key: 'textHeight', label: 'بروز الحرف', type: 'number', min: 0.4, max: 2, step: 0.1, unit: 'مم', default: 0.8, group: 'الحروف' },
    { key: 'capSize', label: 'عرض الزر', type: 'number', min: 16, max: 20, step: 0.1, unit: 'مم', default: 18, group: 'الزر' },
    { key: 'capHeight', label: 'ارتفاع الزر', type: 'number', min: 6, max: 12, step: 0.1, unit: 'مم', default: 8, group: 'الزر' },
    { key: 'tolerance', label: 'سماحية الساق', type: 'number', min: 0, max: 0.4, step: 0.05, unit: 'مم', default: 0.15, group: 'الزر' },
    { key: 'baseColor', label: 'لون الزر', type: 'color', default: '#ffd400', group: 'الألوان' },
    { key: 'textColor', label: 'لون الحرف', type: 'color', default: '#ffffff', group: 'الألوان' },
  ],
  fonts: (p) => [p.font],
  build(p, fonts) {
    const f = fonts[p.font];
    const chars = [...(p.text || '').replace(/\s/g, '')].slice(0, 12);
    const cap = capGeometry(p);
    const top = p.capSize - 5 - 3;
    const pitch = p.capSize + 2;
    const caps = [], letters = [];
    chars.forEach((ch, i) => {
      const x = -i * pitch; // من اليمين لليسار
      const g = cap.clone();
      g.translate(x, 0, 0);
      caps.push({ name: `زر ${ch}`, color: p.baseColor, geometry: g });
      const t = textBox(f, ch, { height: p.letterSize, maxWidth: top, cx: x, cy: 0 });
      const lg = extrude(t.contours, p.textHeight, p.capHeight);
      if (lg) letters.push({ name: `حرف ${ch}`, color: p.textColor, geometry: lg });
    });
    return [...caps, ...letters];
  },
};
