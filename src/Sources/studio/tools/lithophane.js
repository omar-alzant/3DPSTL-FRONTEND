/* eslint-disable import/no-anonymous-default-export */
// Lithophane: a photo becomes a thin panel whose thickness follows the picture — dark = thick, light = thin —
// so it shows the photo when a light shines behind it. Printed standing up (best quality), flat with a frame
// and a foot, or curved (stands on its own).
import { loadGray, thicknessGrid, gridSolid } from '../lib/heightmap.js';
import { difference, roundRect, extrude } from '../lib/geo.js';

const MAX_CELLS = 180000; // keeps the model light enough for phones

function arcBand(Rc, r0, r1, phi0, phi1, seg = 64) {
  const pts = [];
  for (let k = 0; k <= seg; k++) {
    const f = phi0 + ((phi1 - phi0) * k) / seg;
    pts.push([r1 * Math.sin(f), Rc - r1 * Math.cos(f)]);
  }
  for (let k = seg; k >= 0; k--) {
    const f = phi0 + ((phi1 - phi0) * k) / seg;
    pts.push([r0 * Math.sin(f), Rc - r0 * Math.cos(f)]);
  }
  return [pts];
}

/** the model from a brightness grid (exported so it can be tested without a browser) */
export function buildFromGray(p, gray) {
  const W = p.width;
  const H = W * gray.aspect;
  const cols = gray.cols, rows = gray.rows;
  const px = W / (cols - 1);
  const t = thicknessGrid(gray, p.minT, p.maxT, p.contrast);
  const f = p.frame ? p.frameW : 0;
  const curved = p.shape === 'curved';
  const foot = !curved && p.foot ? 3 : 0;
  const z0 = foot + f;
  const at = (i, j) => t[(rows - 1 - j) * cols + i]; // j = 0 is the bottom of the picture

  let P;
  let Rc = 0;
  if (curved) {
    Rc = W / ((p.arc * Math.PI) / 180);
    P = (i, j, side) => {
      const phi = (-W / 2 + i * px) / Rc;
      const r = Rc + (side ? at(i, j) : 0);
      return [r * Math.sin(phi), Rc - r * Math.cos(phi), z0 + j * px];
    };
  } else {
    P = (i, j, side) => [-W / 2 + i * px, side ? -at(i, j) : 0, z0 + j * px];
  }
  const panel = gridSolid(cols, rows, false, P);
  const parts = [{ name: 'الصورة', color: p.color, geometry: panel, slicer: { sparse_infill_density: '100%' } }];

  const D = p.maxT; // frame as deep as the thickest part
  if (f > 0) {
    if (curved) {
      const half = (p.arc * Math.PI) / 360;
      const d = f / Rc;
      const band = arcBand(Rc, Rc, Rc + D, -half - d, half + d);
      parts.push({ name: 'الإطار', color: p.color, geometry: extrude(band, f, 0) });
      parts.push({ name: 'الإطار', color: p.color, geometry: extrude(band, f, z0 + H) });
      parts.push({ name: 'الإطار', color: p.color, geometry: extrude(arcBand(Rc, Rc, Rc + D, -half - d, -half, 8), H, z0) });
      parts.push({ name: 'الإطار', color: p.color, geometry: extrude(arcBand(Rc, Rc, Rc + D, half, half + d, 8), H, z0) });
    } else {
      const ring = difference(roundRect(0, z0 + H / 2, W + 2 * f, H + 2 * f, Math.min(3, f)), roundRect(0, z0 + H / 2, W, H, 0));
      const g = extrude(ring, D, 0);
      g.rotateX(Math.PI / 2); // stands up: (x, y, z) → (x, -z, y)
      parts.push({ name: 'الإطار', color: p.color, geometry: g });
    }
  }
  if (foot) {
    parts.push({ name: 'القاعدة', color: p.color, geometry: extrude(roundRect(0, -D / 2, W + 2 * f, D + 22, 4), foot, 0) });
  }
  return parts.filter((x) => x.geometry);
}

export default {
  id: 'lithophane',
  name: 'لوحة صورة مضيئة (Lithophane)',
  description: 'صورتك على لوحة رفيعة سماكتها تتبع الصورة، فتبيّن الصورة بوضوح لما يضوي وراها ضو. مسطّحة بإطار وقاعدة أو مقوّسة. اطبعها بالأبيض.',
  category: 'هدايا',
  params: [
    { key: 'image', label: 'الصورة', type: 'image', default: '', group: 'الصورة', maxSize: 900 },
    { key: 'contrast', label: 'التباين', type: 'number', min: 0.6, max: 2, step: 0.05, default: 1, group: 'الصورة' },
    { key: 'shape', label: 'الشكل', type: 'select', default: 'flat', group: 'الشكل',
      options: [{ value: 'flat', label: 'مسطّحة' }, { value: 'curved', label: 'مقوّسة' }] },
    { key: 'width', label: 'العرض', type: 'number', min: 50, max: 200, step: 1, unit: 'مم', default: 100, group: 'الشكل' },
    { key: 'arc', label: 'زاوية التقويس', type: 'number', min: 60, max: 180, step: 5, unit: '°', default: 120, group: 'الشكل', show: (p) => p.shape === 'curved' },
    { key: 'frame', label: 'إطار', type: 'checkbox', default: true, group: 'الشكل' },
    { key: 'frameW', label: 'عرض الإطار', type: 'number', min: 2, max: 10, step: 0.5, unit: 'مم', default: 4, group: 'الشكل', show: (p) => p.frame },
    { key: 'foot', label: 'قاعدة ليوقف', type: 'checkbox', default: true, group: 'الشكل', show: (p) => p.shape === 'flat' },
    { key: 'minT', label: 'أرفع سماكة (الأبيض)', type: 'number', min: 0.4, max: 1.6, step: 0.1, unit: 'مم', default: 0.8, group: 'السماكة' },
    { key: 'maxT', label: 'أعرض سماكة (الأسود)', type: 'number', min: 2, max: 5, step: 0.1, unit: 'مم', default: 3, group: 'السماكة' },
    { key: 'detail', label: 'الدقّة', type: 'select', default: '0.4', group: 'السماكة',
      options: [{ value: '0.5', label: 'عادية (أسرع)' }, { value: '0.4', label: 'عالية' }, { value: '0.3', label: 'عالية جداً (أبطأ)' }] },
    { key: 'color', label: 'اللون (الأبيض أفضل)', type: 'color', default: '#f5f5f5', group: 'الألوان' },
  ],
  fonts: () => [],
  async build(p) {
    if (!p.image) throw new Error('ارفع صورة — الصور الواضحة بإضاءة حلوة بتطلع أحلى');
    if (p.maxT <= p.minT + 0.4) throw new Error('«أعرض سماكة» لازم تكون أكبر من «أرفع سماكة» بـ 0.5 مم على الأقل');
    let cols = Math.round(p.width / Number(p.detail)) + 1;
    // first read to know the picture's shape, then limit the grid size
    const probe = await loadGray(p.image, 16);
    const rowsFor = (c) => Math.round(c * probe.aspect);
    while (cols * rowsFor(cols) > MAX_CELLS) cols = Math.floor(cols * 0.9);
    if (p.width * probe.aspect > 250) throw new Error('الصورة طويلة كتير على هالعرض — صغّر العرض');
    const gray = await loadGray(p.image, cols);
    return buildFromGray(p, gray);
  },
};
