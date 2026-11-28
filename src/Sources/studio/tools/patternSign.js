/* eslint-disable import/no-anonymous-default-export */
// Patterned letters (like a café's name on the wall): each letter is a raised rim with a pattern
// inside it (rattan grid, dots, honeycomb, diamonds or lines). The customer writes a name or uploads
// a logo, picks the pattern, and hangs the letters as they are, joined by a bar, or on a board that
// can also stand on a table.
import { textBox } from '../lib/fonts.js';
import { traceImage } from '../lib/trace.js';
import { THREE, union, difference, intersection, offset, circle, roundRect, bounds2, extrude, subtract } from '../lib/geo.js';

const BED = 290; // the biggest printer bed, with a little room

/** the holes of the pattern over a box, as polygons */
function holes(kind, b, cell, bar) {
  const out = [];
  const x0 = b.minX - cell, x1 = b.maxX + cell, y0 = b.minY - cell, y1 = b.maxY + cell;
  const s = cell - bar; // hole size
  if (s <= 0.4) return out;
  if (kind === 'grid' || kind === 'dots') {
    for (let x = x0; x < x1; x += cell) {
      for (let y = y0; y < y1; y += cell) {
        if (kind === 'grid') out.push([[x, y], [x + s, y], [x + s, y + s], [x, y + s]]);
        else out.push(circle(x + s / 2, y + s / 2, s / 2, 14)[0]);
      }
    }
  } else if (kind === 'hex') {
    const r = cell / Math.sqrt(3); // centre to corner of the cell
    const rh = Math.max(0.2, r - bar / Math.sqrt(3));
    const dx = cell, dy = cell * Math.sqrt(3) / 2;
    let row = 0;
    for (let y = y0; y < y1; y += dy, row++) {
      for (let x = x0 + (row % 2 ? cell / 2 : 0); x < x1; x += dx) {
        const pts = [];
        for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; pts.push([x + rh * Math.cos(a), y + rh * Math.sin(a)]); }
        out.push(pts);
      }
    }
  } else if (kind === 'diamond') {
    const hs = s / Math.SQRT2;
    let row = 0;
    for (let y = y0; y < y1; y += cell / 2, row++) {
      for (let x = x0 + (row % 2 ? cell / 2 : 0); x < x1; x += cell) out.push([[x, y - hs], [x + hs, y], [x, y + hs], [x - hs, y]]);
    }
  } else if (kind === 'lines') {
    for (let y = y0; y < y1; y += cell) out.push([[x0, y], [x1, y], [x1, y + s], [x0, y + s]]);
  }
  return out;
}

// a stand for the board: a low wedge with a slot that holds the board leaning back a little
function stand(width, thick, slot, at) {
  const W = Math.max(50, width * 0.7);
  const D = Math.max(40, thick * 8);
  const H = slot + 6;
  const prof = [[0, 0], [D, 0], [D, 5], [D * 0.66, H], [D * 0.2, H], [0, 5]];
  const g = extrude([prof], W, -W / 2);
  if (!g) return null;
  g.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
  const cut = new THREE.BoxGeometry(W + 2, thick + 0.5, slot * 2 + 2);
  cut.rotateX(-0.21);
  cut.translate(0, D * 0.43, H);
  const body = subtract(g, cut.toNonIndexed());
  body.translate(0, at - 12 - D, 0);
  return body;
}

export default {
  id: 'pattern-sign',
  name: 'حروف بنقشة للحيط',
  description: 'اسم المحل أو اللوغو بحروف مفرّغة بنقشة (قش، نقاط، خلية، معيّنات أو خطوط) متل لافتات الكافيهات. بتتعلّق عالحيط لحالها، أو مع وصلة تحت الحروف، أو على لوح خلفي فيك توقفه على ستاند.',
  category: 'ديكور',
  params: [
    { key: 'source', label: 'شو بدك', type: 'select', default: 'text', group: 'المحتوى',
      options: [{ value: 'text', label: 'كتابة' }, { value: 'logo', label: 'لوغو' }] },
    { key: 'line1', label: 'السطر الأول', type: 'text', default: '3DSTL', maxLength: 20, group: 'المحتوى', show: (p) => p.source === 'text' },
    { key: 'line2', label: 'السطر الثاني (اختياري)', type: 'text', default: '', maxLength: 24, group: 'المحتوى', show: (p) => p.source === 'text' },
    { key: 'font', label: 'الخط', type: 'font', sample: ['line1', 'line2'], default: 'fredoka', group: 'المحتوى', show: (p) => p.source === 'text' },
    { key: 'logo', label: 'اللوغو', type: 'image', samplePic: 'drawing', default: '', group: 'المحتوى', maxSize: 500, show: (p) => p.source === 'logo' },
    { key: 'logoDark', label: 'قتامة اللوغو', type: 'number', min: 10, max: 90, step: 1, unit: '%', default: 50, group: 'المحتوى', show: (p) => p.source === 'logo' },

    { key: 'pattern', label: 'النقشة', type: 'select', default: 'grid', group: 'النقشة',
      options: [
        { value: 'grid', label: 'قش (مربّعات)' },
        { value: 'dots', label: 'نقاط' },
        { value: 'hex', label: 'خلية نحل' },
        { value: 'diamond', label: 'معيّنات' },
        { value: 'lines', label: 'خطوط' },
        { value: 'solid', label: 'بلا نقشة (مليانة)' },
      ] },
    { key: 'cell', label: 'حجم النقشة', type: 'number', min: 3, max: 12, step: 0.5, unit: 'مم', default: 5, group: 'النقشة', show: (p) => p.pattern !== 'solid' },
    { key: 'bar', label: 'عرض خطوط النقشة', type: 'number', min: 0.8, max: 3, step: 0.1, unit: 'مم', default: 1.4, group: 'النقشة', show: (p) => p.pattern !== 'solid' },
    { key: 'rim', label: 'عرض الإطار حول الحرف', type: 'number', min: 2, max: 8, step: 0.5, unit: 'مم', default: 3.5, group: 'النقشة' },

    { key: 'width', label: 'العرض', type: 'number', min: 80, max: BED, step: 1, unit: 'مم', default: 220, group: 'الحجم' },
    { key: 'depth', label: 'سماكة الحروف', type: 'number', min: 4, max: 15, step: 0.5, unit: 'مم', default: 8, group: 'الحجم' },

    { key: 'backing', label: 'شو وراء الحروف', type: 'select', default: 'none', group: 'التعليق',
      options: [
        { value: 'none', label: 'حروف لحالها (بتنلزق عالحيط)' },
        { value: 'bar', label: 'وصلة تحت الحروف (قطعة وحدة)' },
        { value: 'board', label: 'لوح خلفي' },
      ] },
    { key: 'boardShape', label: 'شكل اللوح', type: 'select', default: 'rect', group: 'التعليق', show: (p) => p.backing === 'board',
      options: [{ value: 'rect', label: 'مستطيل' }, { value: 'outline', label: 'ماشي مع الحروف' }] },
    { key: 'hang', label: 'كيف بتتعلّق', type: 'select', default: 'holes', group: 'التعليق', show: (p) => p.backing !== 'none',
      options: [
        { value: 'holes', label: 'ثقبين لبراغي عالحيط' },
        { value: 'tape', label: 'لزق (بلا ثقوب)' },
        { value: 'stand', label: 'ستاند (عالطاولة)', show: (p) => p.backing === 'board' },
      ] },

    { key: 'color', label: 'لون الحروف', type: 'color', default: '#c8a27a', group: 'الألوان' },
    { key: 'patternColor', label: 'لون النقشة', type: 'color', default: '#c8a27a', group: 'الألوان', show: (p) => p.pattern !== 'solid' },
    { key: 'boardColor', label: 'لون اللوح', type: 'color', default: '#5b3a24', group: 'الألوان', show: (p) => p.backing !== 'none' },
  ],
  fonts: (p) => (p.source === 'text' ? [p.font] : []),
  async build(p, fonts) {
    // 1) the shape, 200 units wide for now (scaled to the chosen width at the end)
    let shape = [];
    if (p.source === 'logo') {
      if (!p.logo) throw new Error('ارفع اللوغو');
      const t = await traceImage(p.logo, { threshold: p.logoDark });
      if (!t.contours.length) throw new Error('ما لقينا شي باللوغو — جرّب تغيّر «قتامة اللوغو»');
      shape = union(t.contours);
    } else {
      const lines = [p.line1, p.line2].map((t) => (t || '').trim()).filter(Boolean);
      if (!lines.length) throw new Error('اكتب الاسم');
      let y = 0;
      lines.forEach((line, i) => {
        const tb = textBox(fonts[p.font], line, { height: i === 0 ? 60 : 40, cx: 0, cy: y });
        shape = union(shape, tb.contours);
        y -= (i === 0 ? 60 : 40) * 1.25;
      });
    }
    let b = bounds2(shape);
    const k = p.width / b.w;
    shape = shape.map((c) => c.map(([x, yy]) => [(x - b.cx) * k, (yy - b.cy) * k]));
    b = bounds2(shape);
    if (b.h > BED) throw new Error('الشكل أطول من الطابعة — صغّر العرض');

    // 2) rim + pattern inside
    const inner = offset(shape, -p.rim);
    const rim = difference(shape, inner);
    let fill = [];
    if (p.pattern === 'solid') fill = inner;
    else if (inner.length) {
      // holes stay a bar's width away from the rim, so the pattern always holds on to it
      const room = offset(inner, -p.bar * 0.5);
      const cut = intersection(union(holes(p.pattern, bounds2(inner), p.cell, p.bar)), room);
      fill = difference(inner, cut);
    }

    const D = p.depth;
    const patD = Math.max(2, D * 0.55); // the pattern sits back from the rim's front, like woven cane in a frame
    const parts = [];

    // 3) what holds the letters
    const BT = 3; // board / bar thickness
    let z0 = 0;
    if (p.backing === 'bar') {
      // a strip along the bottom of the letters joins them into one piece
      const barH = Math.max(6, p.rim * 2.2);
      let strip = roundRect(0, b.minY + barH / 2 + p.rim * 0.3, b.w - 4, barH, barH / 2);
      if (p.hang === 'holes') strip = difference(union(strip, circle(b.minX + 4, b.minY + barH / 2, 6, 40), circle(b.maxX - 4, b.minY + barH / 2, 6, 40)), circle(b.minX + 4, b.minY + barH / 2, 2.2, 24), circle(b.maxX - 4, b.minY + barH / 2, 2.2, 24));
      parts.push({ name: 'الوصلة', color: p.boardColor, geometry: extrude(strip, BT, 0) });
      z0 = BT;
    } else if (p.backing === 'board') {
      const m = 12;
      const slot = p.hang === 'stand' ? 9 : 0;
      let board = p.boardShape === 'outline'
        ? offset(union(offset(shape, m), roundRect(0, b.minY - m / 2 - slot / 2, b.w, m + slot, 0)), 0)
        : roundRect(0, b.cy - slot / 2, b.w + 2 * m, b.h + 2 * m + slot, 8);
      if (p.hang === 'holes') {
        const hy = b.maxY + m * 0.55;
        board = union(board, circle(b.minX + 10, hy, 6, 32), circle(b.maxX - 10, hy, 6, 32));
        board = difference(board, circle(b.minX + 10, hy, 2.2, 24), circle(b.maxX - 10, hy, 2.2, 24));
      }
      parts.push({ name: 'اللوح', color: p.boardColor, geometry: extrude(board, BT, 0) });
      if (p.hang === 'stand') parts.push({ name: 'الستاند', color: p.boardColor, geometry: stand(b.w, BT, slot, bounds2(board).minY) });
      z0 = BT;
    }

    parts.push({ name: 'إطار الحروف', color: p.color, geometry: extrude(rim, D, z0) });
    if (fill.length) parts.push({ name: 'النقشة', color: p.pattern === 'solid' ? p.color : p.patternColor, geometry: extrude(fill, patD, z0) });
    return parts.filter((x) => x.geometry);
  },
};
