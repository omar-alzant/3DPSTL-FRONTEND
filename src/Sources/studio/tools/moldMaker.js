/* eslint-disable import/no-anonymous-default-export */
// Mold maker: the customer uploads a 3D file (STL / OBJ / 3MF) and gets a printable mold around it.
//   casting (صب): a pour funnel + an air vent, for plaster, wax, soap, concrete, resin…
//   pressing (كبس): no funnel, for clay, dough, polymer clay…
//   2 parts (two halves) · 4 parts (two halves + lid + base) · 8 parts (round: 6 side pieces + lid + base)
// The parts line up with loose printed pins, and come laid out flat for printing.
import { THREE, clean, subtract, intersect, extrude, union } from '../lib/geo.js';
import { getModel } from '../lib/modelStore.js';
import { loadPrepared } from '../lib/loadModel.js';

const PIN_D = 5; // pin diameter
const HOLE_D = 5.4; // hole diameter (0.2 mm play all round)
const PIN_IN = 6; // how deep a pin goes into each side

// ── simple solids ──
const cylZ = (r, z0, z1, x = 0, y = 0, seg = 40) => {
  const g = new THREE.CylinderGeometry(r, r, z1 - z0, seg);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, (z0 + z1) / 2);
  return clean(g);
};
const coneZ = (rBottom, rTop, z0, z1, x = 0, y = 0, seg = 40) => {
  const g = new THREE.CylinderGeometry(rTop, rBottom, z1 - z0, seg);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, (z0 + z1) / 2);
  return clean(g);
};
const cylX = (r, len, y, z, seg = 32) => {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.rotateZ(Math.PI / 2);
  g.translate(0, y, z);
  return clean(g);
};
const box = (x0, x1, y0, y1, z0, z1) => {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return clean(g);
};

// ── sample model (until the customer uploads theirs): a twisted rounded square, like a small vase ──
let sampleGeo = null;
function sampleModel() {
  if (sampleGeo) return sampleGeo;
  const rows = 48;
  const seg = 48;
  const ring = (t) => {
    const twist = t * Math.PI * 0.6;
    const s = 22 - 7 * Math.sin(t * Math.PI); // waist in the middle
    const pts = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      // rounded square: superellipse
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const r = s / Math.pow(Math.pow(Math.abs(c), 4) + Math.pow(Math.abs(sn), 4), 0.25);
      pts.push([r * Math.cos(a + twist), r * Math.sin(a + twist), t * 80]);
    }
    return pts;
  };
  const v = [];
  const idx = [];
  for (let j = 0; j <= rows; j++) ring(j / rows).forEach((p) => v.push(...p));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * seg + i;
      const b = j * seg + ((i + 1) % seg);
      const c = a + seg;
      const d = b + seg;
      idx.push(a, b, d, a, d, c);
    }
  }
  const bottom = v.length / 3;
  v.push(0, 0, 0);
  const top = v.length / 3;
  v.push(0, 0, 80);
  for (let i = 0; i < seg; i++) {
    idx.push(bottom, (i + 1) % seg, i);
    idx.push(top, rows * seg + i, rows * seg + ((i + 1) % seg));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  sampleGeo = clean(g);
  return sampleGeo;
}

async function modelGeometry(ref) {
  if (!ref) return sampleModel();
  const prepared = await loadPrepared(ref, getModel);
  return prepared.geometry;
}

// lays the parts flat and side by side, in rows that fit the bed
function layout(parts, gap = 10, rowMax = 250) {
  let x = 0;
  let y = 0;
  let rowDepth = 0;
  const out = [];
  for (const p of parts) {
    const g = p.geometry;
    g.computeBoundingBox();
    const b = g.boundingBox;
    const w = b.max.x - b.min.x;
    const d = b.max.y - b.min.y;
    if (x > 0 && x + w > rowMax) { x = 0; y += rowDepth + gap; rowDepth = 0; }
    g.translate(x - b.min.x, y - b.min.y, -b.min.z);
    x += w + gap;
    rowDepth = Math.max(rowDepth, d);
    out.push(p);
  }
  // centre the whole bed
  const all = new THREE.Box3();
  out.forEach((p) => { p.geometry.computeBoundingBox(); all.union(p.geometry.boundingBox); });
  const cx = (all.min.x + all.max.x) / 2;
  const cy = (all.min.y + all.max.y) / 2;
  out.forEach((p) => p.geometry.translate(-cx, -cy, 0));
  return { parts: out, size: all.getSize(new THREE.Vector3()) };
}

export default {
  id: 'mold-maker',
  name: 'صانع القوالب',
  description: 'ارفع ملف ثلاثي الأبعاد (STL أو OBJ أو 3MF) وبيطلعلك قالب جاهز للطباعة من 2 أو 4 أو 8 قطع، مع فتحة صب ومسامير تثبيت. للجبس والشمع والصابون والإسمنت والريزن، أو قالب كبس للطين والعجين.',
  category: 'أعمال',
  attachFile: true, // orders carry the finished mold file (the customer's model isn't in the design link)
  params: [
    { key: 'model', label: 'ملفك (STL / OBJ / 3MF)', type: 'model', default: '', group: 'المجسّم' },
    { key: 'size', label: 'طول المجسّم (أطول بُعد)', type: 'number', min: 20, max: 200, step: 1, unit: 'مم', default: 80, group: 'المجسّم' },
    { key: 'orient', label: 'وقفة المجسّم', type: 'select', default: 'up', group: 'المجسّم',
      options: [
        { value: 'up', label: 'متل ما هو' },
        { value: 'flip', label: 'مقلوب' },
        { value: 'front', label: 'مسطوح لقدّام' },
        { value: 'side', label: 'مسطوح عالجنب' },
      ] },
    { key: 'spin', label: 'لفّة المجسّم (مكان خط القسمة)', type: 'number', min: 0, max: 180, step: 15, unit: '°', default: 0, group: 'المجسّم' },

    { key: 'mode', label: 'نوع القالب', type: 'select', default: 'cast', group: 'إعدادات القالب',
      options: [
        { value: 'cast', label: 'صب (جبس، شمع، صابون، إسمنت، ريزن)' },
        { value: 'press', label: 'كبس (طين، عجين، صلصال)' },
      ] },
    { key: 'parts', label: 'عدد القطع', type: 'select', default: '2', group: 'إعدادات القالب',
      options: [
        { value: '2', label: '2 قطع (نصّين)' },
        { value: '4', label: '4 قطع (نصّين + غطا + قاعدة)' },
        { value: '8', label: '8 قطع (دائري: 6 جوانب + غطا + قاعدة)' },
      ] },
    { key: 'shape', label: 'شكل قالب الصب', type: 'select', default: 'box', group: 'إعدادات القالب', show: (p) => p.parts !== '8',
      options: [{ value: 'box', label: 'مربّع' }, { value: 'round', label: 'دائري' }] },
    { key: 'wall', label: 'سماكة حيط القالب', type: 'number', min: 8, max: 25, step: 1, unit: 'مم', default: 10, group: 'إعدادات القالب' },
    { key: 'pourD', label: 'قطر فتحة الصب', type: 'number', min: 6, max: 20, step: 1, unit: 'مم', default: 10, group: 'إعدادات القالب', show: (p) => p.mode === 'cast' },
    { key: 'vent', label: 'فتحة هوا صغيرة', type: 'checkbox', default: true, group: 'إعدادات القالب', show: (p) => p.mode === 'cast' },
    { key: 'pins', label: 'مسامير تثبيت', type: 'checkbox', default: true, group: 'إعدادات القالب' },

    { key: 'moldColor', label: 'لون قطع القالب', type: 'color', default: '#7fd88f', group: 'الألوان' },
    { key: 'pinColor', label: 'لون المسامير', type: 'color', default: '#f5f5f5', group: 'الألوان', show: (p) => p.pins },
  ],
  fonts: () => [],
  async build(p) {
    let g;
    try {
      g = (await modelGeometry(p.model)).clone();
    } catch (e) {
      if (e.message === 'missingModel') throw new Error('ارفع ملفك من جديد (الملف ما بينحفظ بالرابط)');
      if (e.message === 'badType') throw new Error('هالنوع من الملفات ما منقراه، ارفع STL أو OBJ أو 3MF');
      throw new Error('ما قدرنا نقرا الملف، جرّب تصدّره STL من جديد');
    }

    // stand the model the way the customer chose, then size and centre it
    if (p.orient === 'flip') g.rotateX(Math.PI);
    else if (p.orient === 'front') g.rotateX(-Math.PI / 2);
    else if (p.orient === 'side') g.rotateY(Math.PI / 2);
    if (p.spin) g.rotateZ((p.spin * Math.PI) / 180);
    g.computeBoundingBox();
    let bb = g.boundingBox;
    const dims = bb.getSize(new THREE.Vector3());
    const s = p.size / Math.max(dims.x, dims.y, dims.z, 1e-6);
    g.scale(s, s, s);
    g.computeBoundingBox();
    bb = g.boundingBox;
    const c = bb.getCenter(new THREE.Vector3());
    g.translate(-c.x, -c.y, -c.z);
    g.computeVertexNormals();
    const hx = (bb.max.x - bb.min.x) / 2;
    const hy = (bb.max.y - bb.min.y) / 2;
    const hz = (bb.max.z - bb.min.z) / 2;
    const pos = g.attributes.position.array;
    let rMax = 0;
    for (let i = 0; i < pos.length; i += 3) rMax = Math.max(rMax, Math.hypot(pos[i], pos[i + 1]));

    const w = p.wall;
    const n = Number(p.parts) || 2;
    const round = n === 8 || p.shape === 'round';
    const zLo = -hz - w;
    const zHi = hz + w;
    const R = rMax + w;
    const ex = round ? R : hx + w; // outer half sizes
    const ey = round ? R : hy + w;
    if (Math.max(2 * ex, 2 * ey, zHi - zLo) > 300) throw new Error('القالب أكبر من 30 سم، صغّر المجسّم أو خفّف سماكة الحيط');

    const block = round ? cylZ(R, zLo, zHi, 0, 0, 96) : box(-ex, ex, -ey, ey, zLo, zHi);

    // pour funnel + air vent (casting only), at the top of the model
    const cutters = [];
    if (p.mode === 'cast') {
      let top = -Infinity;
      for (let i = 2; i < pos.length; i += 3) top = Math.max(top, pos[i]);
      let sx = 0, sy = 0, cnt = 0;
      for (let i = 0; i < pos.length; i += 3) {
        if (pos[i + 2] > top - 1) { sx += pos[i]; sy += pos[i + 1]; cnt++; }
      }
      let px = sx / cnt;
      let py = sy / cnt;
      // if the average of the top points falls between two peaks, use the highest point itself
      let best = Infinity, hx0 = px, hy0 = py;
      for (let i = 0; i < pos.length; i += 3) {
        if (pos[i + 2] > top - 1) {
          const d = Math.hypot(pos[i] - px, pos[i + 1] - py);
          if (d < best) { best = d; hx0 = pos[i]; hy0 = pos[i + 1]; }
        }
      }
      if (best > p.pourD / 2) { px = hx0; py = hy0; }
      const r = p.pourD / 2;
      cutters.push(cylZ(r, top - 2, zHi + 1, px, py));
      const fd = Math.min(w * 0.7, 8);
      cutters.push(coneZ(r, r * 2.2, zHi - fd, zHi + 0.01, px, py));
      if (p.vent) {
        // highest point away from the funnel
        let vz = -Infinity, vx = 0, vy = 0;
        for (let i = 0; i < pos.length; i += 3) {
          if (Math.hypot(pos[i] - px, pos[i + 1] - py) > r * 2 + 4 && pos[i + 2] > vz) {
            vz = pos[i + 2]; vx = pos[i]; vy = pos[i + 1];
          }
        }
        if (vz > -hz + hz * 0.6) cutters.push(cylZ(1.5, vz - 1.5, zHi + 1, vx, vy, 16));
      }
    }

    // where the pieces meet (a little inside the model, so the faces never sit exactly on its surface)
    const zb = -hz + 0.6;
    const zt = hz - 0.6;

    // pin holes and the pins themselves
    const holes = [];
    let pinCount = 0;
    const holeR = HOLE_D / 2;
    const midY = round ? rMax + w / 2 : hy + w / 2;
    if (p.pins) {
      // across the split between the two halves (x = 0)
      const zs = n === 2 ? [-hz - w / 2, 0, hz + w / 2] : (hz > 15 ? [-hz * 0.55, 0, hz * 0.55] : [0]);
      if (n !== 8) {
        for (const z of zs) for (const y of [-midY, midY]) { holes.push(cylX(holeR, PIN_IN * 2 + 0.4, y, z)); pinCount++; }
      }
      // up and down into the lid and the base
      if (n >= 4) {
        const spots = [];
        if (n === 8) {
          const rr = rMax + w / 2;
          for (let k = 0; k < 6; k++) { const a = ((k + 0.5) * Math.PI) / 3; spots.push([rr * Math.cos(a), rr * Math.sin(a)]); }
        } else if (round) {
          const rr = rMax + w / 2;
          for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k * Math.PI) / 2; spots.push([rr * Math.cos(a), rr * Math.sin(a)]); }
        } else {
          const mx = hx + w / 2;
          for (const sx of [-mx, mx]) for (const sy of [-midY, midY]) spots.push([sx, sy]);
        }
        for (const z of [zb, zt]) for (const [x, y] of spots) { holes.push(cylZ(holeR, z - PIN_IN - 0.2, z + PIN_IN + 0.2, x, y, 32)); pinCount++; }
      }
    }

    let carved;
    try {
      carved = subtract(block, g, ...cutters, ...holes);
    } catch (e) {
      console.error(e);
      throw new Error('ما زبط القصّ، جرّب ملف مسكّر (بلا فتحات) أو غيّر الحجم شوي');
    }

    // the pieces: each one is the carved block inside a region
    const B = Math.max(ex, ey, zHi) * 4;
    const regions = [];
    if (n === 2) {
      regions.push({ name: 'نص القالب ١', side: -1, g: box(-B, 0, -B, B, -B, B) });
      regions.push({ name: 'نص القالب ٢', side: 1, g: box(0, B, -B, B, -B, B) });
    } else if (n === 4) {
      regions.push({ name: 'نص القالب ١', side: -1, g: box(-B, 0, -B, B, zb, zt) });
      regions.push({ name: 'نص القالب ٢', side: 1, g: box(0, B, -B, B, zb, zt) });
      regions.push({ name: 'غطا القالب', g: box(-B, B, -B, B, zt, B) });
      regions.push({ name: 'قاعدة القالب', g: box(-B, B, -B, B, -B, zb) });
    } else {
      for (let k = 0; k < 6; k++) {
        const a0 = (k * Math.PI) / 3;
        const a1 = ((k + 1) * Math.PI) / 3;
        const pts = [[0, 0]];
        for (let j = 0; j <= 6; j++) { const a = a0 + ((a1 - a0) * j) / 6; pts.push([B * Math.cos(a), B * Math.sin(a)]); }
        regions.push({ name: `جنب القالب ${k + 1}`, wedge: (a0 + a1) / 2, g: extrude(union([pts]), zt - zb, zb) });
      }
      regions.push({ name: 'غطا القالب', g: box(-B, B, -B, B, zt, B) });
      regions.push({ name: 'قاعدة القالب', g: box(-B, B, -B, B, -B, zb) });
    }

    const pieces = [];
    for (const r of regions) {
      const piece = intersect(carved, r.g);
      if (!piece) continue;
      // lay each piece flat for printing:
      //   square mold halves: flat back on the bed, the hollow facing up (no supports needed)
      //   round mold halves: the split face on the bed (the round back can't stand)
      //   lid, base and the round side pieces: standing on their flat bottom
      if (r.side) piece.rotateY((round ? 1 : -1) * r.side * -(Math.PI / 2));
      else if (r.wedge != null) piece.rotateZ(-r.wedge);
      pieces.push({ name: r.name, color: p.moldColor, geometry: piece });
    }
    if (pieces.length < 2) throw new Error('ما زبط القصّ، جرّب ملف مسكّر (بلا فتحات) أو غيّر الحجم شوي');

    for (let i = 0; i < pinCount; i++) {
      pieces.push({ name: 'مسمار تثبيت', color: p.pinColor, geometry: cylZ(PIN_D / 2 - 0.1, 0, PIN_IN * 2 - 0.6, 0, 0, 24) });
    }
    const { parts, size } = layout(pieces);
    if (size.x > 320 || size.y > 320) {
      // still fine to print the pieces one by one; only the full set doesn't fit one bed
      parts.note = 'bed';
    }
    return parts;
  },
};
