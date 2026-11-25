/* eslint-disable import/no-anonymous-default-export */
// Photo lampshade: the photo wrapped around a cylinder as a lithophane (dark = thick), with solid bands at the
// top and bottom, plus a base with a pocket for a round LED puck light and a slot for its cable.
import { loadGray, thicknessGrid, gridSolid } from '../lib/heightmap.js';
import { union, difference, circle, roundRect, extrude } from '../lib/geo.js';

const MAX_CELLS = 200000;

export function buildFromGray(p, gray) {
  const R = p.diameter / 2;
  const reps = Math.round(p.repeat);
  const C = 2 * Math.PI * R;
  const imgW = C / reps;
  const px = imgW / gray.cols;
  const t = thicknessGrid(gray, p.minT, p.maxT, p.contrast);
  const band = Math.max(0, Math.round(p.rim / px));
  const nx = gray.cols * reps;
  const ny = gray.rows + 2 * band;
  const thick = (i, j) => {
    if (j < band || j >= band + gray.rows) return p.maxT; // solid rims
    const col = gray.cols - 1 - (i % gray.cols); // seen from outside, not mirrored
    const row = gray.rows - 1 - (j - band); // j = 0 is the bottom
    return t[row * gray.cols + col];
  };
  const P = (i, j, side) => {
    const a = (2 * Math.PI * i) / nx;
    const r = R + (side ? thick(i, j) : 0);
    return [r * Math.cos(a), r * Math.sin(a), j * px];
  };
  const shade = gridSolid(nx, ny, true, P);
  const parts = [{ name: 'الأباجورة', color: p.color, geometry: shade, slicer: { sparse_infill_density: '100%' } }];

  if (p.base) {
    const outerR = R + p.maxT + 3;
    const bx = R + p.maxT + outerR + 10; // beside the shade on the bed
    const floorT = 2;
    const pocketR = p.puckD / 2 + 0.6;
    if (pocketR > R - 3) throw new Error('الضو أعرض من الأباجورة — كبّر القطر أو صغّر قطر الضو');
    const disc = circle(bx, 0, outerR, 128);
    const pocket = circle(bx, 0, pocketR, 96);
    const cable = roundRect(bx + outerR / 2, 0, outerR + 2, 7, 1); // slot from the pocket to the edge
    parts.push({ name: 'القاعدة', color: p.baseColor, geometry: extrude(disc, floorT, 0) });
    parts.push({ name: 'القاعدة', color: p.baseColor, geometry: extrude(difference(disc, union(pocket, cable)), p.puckH, floorT) });
    // a low ring the shade sits around, so it stays centred
    const lip = difference(circle(bx, 0, R - 0.4, 128), circle(bx, 0, Math.max(pocketR + 1, R - 2.6), 128));
    parts.push({ name: 'القاعدة', color: p.baseColor, geometry: extrude(difference(lip, cable), 4, floorT + p.puckH) });
  }
  return { parts, height: ny * px };
}

export default {
  id: 'photo-lampshade',
  name: 'أباجورة من صورة',
  description: 'صورتك ملفوفة على أسطوانة مضيئة: بتبيّن الصورة لما يضوي جوّاتها ضو LED. مع قاعدة فيها محل للضو وللشريط. اطبعها بالأبيض.',
  category: 'هدايا',
  params: [
    { key: 'image', label: 'الصورة', type: 'image', default: '', group: 'الصورة', maxSize: 1200 },
    { key: 'repeat', label: 'كم مرة تتكرّر الصورة حوالين', type: 'number', min: 1, max: 4, step: 1, default: 1, group: 'الصورة' },
    { key: 'contrast', label: 'التباين', type: 'number', min: 0.6, max: 2, step: 0.05, default: 1, group: 'الصورة' },
    { key: 'diameter', label: 'القطر من جوّا', type: 'number', min: (p) => (p.base ? Math.max(60, p.puckD + 8) : 60), max: 160, step: 1, unit: 'مم', default: 80, group: 'المقاس' },
    { key: 'rim', label: 'عرض الحافة فوق وتحت', type: 'number', min: 0, max: 10, step: 0.5, unit: 'مم', default: 3, group: 'المقاس' },
    { key: 'minT', label: 'أرفع سماكة (الأبيض)', type: 'number', min: 0.4, max: 1.6, step: 0.1, unit: 'مم', default: 0.8, group: 'السماكة' },
    { key: 'maxT', label: 'أعرض سماكة (الأسود)', type: 'number', min: 2, max: 5, step: 0.1, unit: 'مم', default: 3, group: 'السماكة' },
    { key: 'detail', label: 'الدقّة', type: 'select', default: '0.45', group: 'السماكة',
      options: [{ value: '0.6', label: 'عادية (أسرع)' }, { value: '0.45', label: 'عالية' }, { value: '0.35', label: 'عالية جداً (أبطأ)' }] },
    { key: 'base', label: 'قاعدة للضو', type: 'checkbox', default: true, group: 'القاعدة' },
    { key: 'puckD', label: 'قطر ضو الـ LED', type: 'number', min: 30, max: (p) => Math.min(120, p.diameter - 8), step: 1, unit: 'مم', default: 60, group: 'القاعدة', show: (p) => p.base },
    { key: 'puckH', label: 'سماكة ضو الـ LED', type: 'number', min: 5, max: 30, step: 0.5, unit: 'مم', default: 12, group: 'القاعدة', show: (p) => p.base },
    { key: 'color', label: 'لون الأباجورة (الأبيض أفضل)', type: 'color', default: '#f5f5f5', group: 'الألوان' },
    { key: 'baseColor', label: 'لون القاعدة', type: 'color', default: '#111111', group: 'الألوان', show: (p) => p.base },
  ],
  fonts: () => [],
  async build(p) {
    if (!p.image) throw new Error('ارفع صورة — الصور العريضة (بانوراما) بتطلع أحلى حوالين الأباجورة');
    if (p.maxT <= p.minT + 0.4) throw new Error('«أعرض سماكة» لازم تكون أكبر من «أرفع سماكة» بـ 0.5 مم على الأقل');
    const C = Math.PI * p.diameter;
    let cols = Math.round(C / Math.round(p.repeat) / Number(p.detail));
    const probe = await loadGray(p.image, 16);
    const rowsFor = (c) => Math.round(c * probe.aspect);
    while (cols * Math.round(p.repeat) * rowsFor(cols) > MAX_CELLS) cols = Math.floor(cols * 0.9);
    const H = (C / Math.round(p.repeat)) * probe.aspect + 2 * p.rim;
    if (H > 240) throw new Error(`الأباجورة رح تطلع ${Math.round(H)} مم طول — صغّر القطر أو كرّر الصورة أكتر`);
    if (H < 30) throw new Error('الصورة عريضة كتير — الأباجورة رح تطلع قصيرة؛ خفّف التكرار أو استعمل صورة أطول');
    const gray = await loadGray(p.image, cols);
    return buildFromGray(p, gray).parts;
  },
};
