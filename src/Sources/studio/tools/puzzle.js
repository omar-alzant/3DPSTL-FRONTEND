/* eslint-disable import/no-anonymous-default-export */
// Jigsaw puzzle: a picture (in up to 4 colours, flat-inlaid) or a picture's outline, cut into pieces
// with round knobs. Printed already assembled, with a small gap so the pieces come apart.
import { imageShape } from '../lib/colors.js';
import { stockColor } from '../lib/palette.js';
import { union, difference, intersection, offset, circle, roundRect, bounds2, extrude } from '../lib/geo.js';

const area = (cs) => {
  let a = 0;
  for (const c of cs) for (let i = 0, j = c.length - 1; i < c.length; j = i++) a += (c[j][0] + c[i][0]) * (c[j][1] - c[i][1]);
  return Math.abs(a / 2);
};
function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** knob on the edge from A to B, bulging to side s (±1): a round head of radius r on a short neck */
function knob([ax, ay], [bx, by], s, r) {
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const L = Math.hypot(bx - ax, by - ay);
  const nx = (-(by - ay) / L) * s, ny = ((bx - ax) / L) * s;
  const head = circle(mx + nx * r * 1.05, my + ny * r * 1.05, r, 40);
  const tx = (bx - ax) / L, ty = (by - ay) / L;
  const w = r * 0.62, d = r * 1.1;
  const neck = [[[mx - tx * w - nx * 0.4, my - ty * w - ny * 0.4], [mx + tx * w - nx * 0.4, my + ty * w - ny * 0.4],
    [mx + tx * w + nx * d, my + ty * w + ny * d], [mx - tx * w + nx * d, my - ty * w + ny * d]]];
  // same winding as the circle, or the overlap would cancel out into a hole
  const ring = neck[0];
  let sh = 0;
  for (let i = 0; i < ring.length; i++) { const [x0, y0] = ring[i], [x1, y1] = ring[(i + 1) % ring.length]; sh += x0 * y1 - x1 * y0; }
  if (sh < 0) ring.reverse();
  return union(head, neck);
}

/** cut `outline` into cols × rows jigsaw pieces (list of contour sets) */
export function jigsaw(outline, cols, rows, { seed = 1, knobSize = 0.15, kerf = 0.25 } = {}) {
  const b = bounds2(outline);
  const rnd = rng(seed);
  const X = (i) => b.minX + (b.w * i) / cols, Y = (j) => b.minY + (b.h * j) / rows;
  let cells = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) cells.push(roundRect((X(i) + X(i + 1)) / 2, (Y(j) + Y(j + 1)) / 2, b.w / cols + 0.002, b.h / rows + 0.002, 0));
  const idx = (i, j) => j * cols + i;
  // knob size from the cell's shorter side: a knob coming in from the side never meets one coming from above
  const kr = knobSize * Math.min(b.w / cols, b.h / rows);
  // vertical inner edges (between i and i+1), then horizontal ones
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols - 1; i++) {
      const s = rnd() < 0.5 ? 1 : -1;
      const k = knob([X(i + 1), Y(j + 1)], [X(i + 1), Y(j)], s, kr); // s=1 bulges to +x (into the right cell)
      const [gain, lose] = s > 0 ? [idx(i, j), idx(i + 1, j)] : [idx(i + 1, j), idx(i, j)];
      cells[gain] = union(cells[gain], k);
      cells[lose] = difference(cells[lose], k);
    }
  for (let j = 0; j < rows - 1; j++)
    for (let i = 0; i < cols; i++) {
      const s = rnd() < 0.5 ? 1 : -1;
      const k = knob([X(i), Y(j + 1)], [X(i + 1), Y(j + 1)], s, kr); // s=1 bulges to +y (into the upper cell)
      const [gain, lose] = s > 0 ? [idx(i, j), idx(i, j + 1)] : [idx(i, j + 1), idx(i, j)];
      cells[gain] = union(cells[gain], k);
      cells[lose] = difference(cells[lose], k);
    }
  // clip to the outline; slivers (a shape's edge crossing a cell's corner) join the neighbour they touch most
  cells = cells.map((c) => intersection(c, outline));
  const full = (b.w / cols) * (b.h / rows);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const k = idx(i, j);
      if (!cells[k]?.length || area(cells[k]) > full * 0.3) continue;
      let best = -1, bestA = 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
        const nk = idx(ni, nj);
        if (!cells[nk]?.length) continue;
        const touch = area(intersection(offset(cells[k], 0.6), cells[nk]));
        if (touch > bestA) { bestA = touch; best = nk; }
      }
      if (best >= 0) { cells[best] = union(cells[best], cells[k]); cells[k] = []; }
    }
  return cells
    .filter((c) => c.length && area(c) > 4)
    .map((c) => {
      // one solid piece: keep the biggest island (with its holes)
      const islands = c.filter((ring) => { let a = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]); return a < 0; });
      if (islands.length <= 1) return offset(c, -kerf / 2);
      const big = islands.reduce((m, x) => (area([x]) > area([m]) ? x : m));
      return offset(intersection(c, [big]), -kerf / 2);
    })
    .filter((c) => c.length && area(c) > 4);
}

export default {
  id: 'jigsaw-puzzle',
  name: 'بازل من صورة',
  description: 'حوّل صورة أو رسمة لبازل بعدد القطع يلي بدّك ياه: الصورة بألوانها على وجه القطع، أو بازل بشكل الرسمة نفسها. بينطبع مركّب وبتنفصل القطع بسهولة.',
  category: 'ألعاب',
  params: [
    { key: 'mode', label: 'نوع البازل', type: 'select', default: 'picture', group: 'الصورة',
      options: [{ value: 'picture', label: 'صورة على مستطيل' }, { value: 'shape', label: 'بشكل الرسمة' }] },
    { key: 'image', label: 'الصورة', type: 'image', default: '', group: 'الصورة', maxSize: 600 },
    { key: 'bgTol', label: 'حساسية إزالة الخلفية', type: 'number', min: 1, max: 120, step: 1, default: 40, group: 'الصورة', show: (p) => p.mode === 'shape' },
    { key: 'imageColors', label: 'ألوان الصورة', type: 'number', min: 1, max: 4, step: 1, default: 3, group: 'الصورة' },
    { key: 'width', label: 'العرض', type: 'number', min: 60, max: 240, step: 1, unit: 'مم', default: 150, group: 'القطع' },
    { key: 'cols', label: 'عدد القطع بالعرض', type: 'number', min: 2, max: 12, step: 1, default: 4, group: 'القطع' },
    { key: 'rows', label: 'عدد القطع بالطول', type: 'number', min: 2, max: 12, step: 1, default: 3, group: 'القطع' },
    { key: 'seed', label: 'شكل القطع (رقم)', type: 'number', min: 1, max: 99, step: 1, default: 1, group: 'القطع' },
    { key: 'kerf', label: 'الفراغ بين القطع', type: 'number', min: 0.15, max: 0.6, step: 0.05, unit: 'مم', default: 0.3, group: 'القطع' },
    { key: 'thickness', label: 'السماكة', type: 'number', min: 2, max: 6, step: 0.1, unit: 'مم', default: 3, group: 'القطع' },
    { key: 'baseColor', label: 'لون القطع', type: 'color', default: '#f5f5f5', group: 'الألوان' },
    { key: 'designColor', label: 'لون الرسمة', type: 'color', default: '#1e5bd8', group: 'الألوان', show: (p) => p.imageColors <= 1 },
  ],
  fonts: () => [],
  async build(p) {
    if (!p.image) throw new Error('ارفع صورة أو رسمة');
    const n = Math.round(p.imageColors);
    const im = await imageShape(p.image, { tol: p.mode === 'shape' ? p.bgTol : 1, colors: n > 1 ? n : 0 });
    if (!im.contours.length) throw new Error('ما لقينا شي بالصورة — جرّب صورة تانية');
    const b0 = bounds2(im.contours);
    const s = p.width / b0.w;
    if (b0.h * s > 240) throw new Error('البازل طويل كتير على هالعرض — صغّر العرض');
    const tf = (cs) => cs.map((c) => c.map(([x, y]) => [(x - b0.cx) * s, (y - b0.cy) * s]));
    const shape = union(tf(im.contours));
    const outline = p.mode === 'shape' ? offset(offset(shape, 1.5), -1.5) : roundRect(0, 0, b0.w * s, b0.h * s, 2);

    const cellMin = Math.min((b0.w * s) / p.cols, (b0.h * s) / p.rows);
    if (cellMin < 12) throw new Error('القطع صغيرة كتير — خفّف عدد القطع أو كبّر البازل');
    const pieces = jigsaw(outline, Math.round(p.cols), Math.round(p.rows), { seed: Math.round(p.seed), kerf: p.kerf });
    const all = union(...pieces);

    // colours on top of the pieces (smallest regions first so details win)
    const layers = [];
    if (n > 1) {
      const order = im.regions.map((rg, i) => ({ i, sh: intersection(union(tf(rg)), all) })).sort((a, b) => area(a.sh) - area(b.sh));
      let taken = [];
      for (const { i, sh } of order) {
        const own = difference(sh, taken);
        if (!own.length) continue;
        taken = union(taken, own);
        layers.push({ name: `لون ${i + 1}`, color: stockColor(im.palette[i]), shape: own });
      }
    } else if (p.mode === 'picture') {
      layers.push({ name: 'الرسمة', color: p.designColor, shape: intersection(shape, all) });
    }

    const T = p.thickness;
    const top = 0.6;
    const design = union(...layers.map((L) => L.shape));
    const parts = [{ name: 'القطع', color: p.baseColor, geometry: extrude(all, layers.length ? T - top : T, 0) }];
    if (layers.length) {
      const rest = difference(all, design);
      if (rest.length) parts.push({ name: 'القطع (الوجه)', color: p.baseColor, geometry: extrude(rest, top, T - top) });
      for (const L of layers) if (L.shape.length) parts.push({ name: L.name, color: L.color, geometry: extrude(L.shape, top, T - top) });
    }
    return parts.filter((x) => x.geometry);
  },
};
