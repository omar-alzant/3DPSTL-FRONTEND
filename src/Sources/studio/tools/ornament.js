/* eslint-disable import/no-anonymous-default-export */
// Christmas ornaments: a snowflake that is different for every "design number", or a star / tree / bauble,
// each with an optional name and a loop to hang it.
import { textBox } from '../lib/fonts.js';
import { union, difference, intersection, offset, circle, bounds2, extrude } from '../lib/geo.js';

// small seeded random, so the same design number always gives the same snowflake
function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** a straight stroke with round ends (a hair-thin bar grown by w/2 with round joins: one clean outline) */
function stroke([x0, y0], [x1, y1], w) {
  const dx = x1 - x0, dy = y1 - y0;
  const L = Math.hypot(dx, dy) || 1;
  const e = 0.02;
  const nx = (-dy / L) * e, ny = (dx / L) * e;
  return offset([[[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]], w / 2 - e);
}

const rotate = (cs, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return cs.map((k) => k.map(([x, y]) => [x * c - y * s, x * s + y * c]));
};

function snowflake(R, seed, w) {
  const r = rng(seed);
  // one arm pointing up, mirrored side branches
  let arm = stroke([0, 0], [0, R], w);
  const branches = 2 + Math.floor(r() * 3); // 2–4
  for (let i = 0; i < branches; i++) {
    const at = R * (0.3 + (0.6 * (i + r() * 0.5)) / branches);
    const len = (R - at) * (0.35 + r() * 0.5);
    const ang = (Math.PI / 180) * (35 + r() * 25);
    const tip = [Math.sin(ang) * len, at + Math.cos(ang) * len];
    arm = union(arm, stroke([0, at], tip, w * 0.85), stroke([0, at], [-tip[0], tip[1]], w * 0.85));
  }
  if (r() > 0.4) {
    const d = R * (0.12 + r() * 0.1); // small diamond near the tip
    arm = union(arm, [[[0, R - 2.2 * d], [d, R - d], [0, R], [-d, R - d]]]);
  }
  let flake = [];
  for (let k = 0; k < 6; k++) flake = union(flake, rotate(arm, (k * Math.PI) / 3));
  // a ring in the middle, from the same seed
  const ringR = R * (0.18 + r() * 0.12);
  flake = union(flake, difference(circle(0, 0, ringR + w / 2, 64), circle(0, 0, ringR - w / 2, 64)));
  return flake;
}

function star(R) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? R * 0.45 : R;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return offset(offset([pts], -1.2), 1.2);
}

function tree(R) {
  const tiers = [];
  const H = R * 2;
  for (let i = 0; i < 3; i++) {
    const top = R - i * H * 0.24;
    const half = R * (0.45 + i * 0.22);
    tiers.push([[0, top], [half, top - H * 0.38], [-half, top - H * 0.38]]);
  }
  const trunk = [[[-R * 0.12, -R * 0.62], [R * 0.12, -R * 0.62], [R * 0.12, -R], [-R * 0.12, -R]]];
  return offset(offset(union(tiers.map((t) => [t]).flat(), trunk), -1), 1);
}

export default {
  id: 'christmas-ornament',
  name: 'زينة الميلاد',
  description: 'ندفة ثلج مختلفة لكل رقم تصميم، أو نجمة أو شجرة أو كرة، مع اسم اختياري وحلقة للتعليق على الشجرة. هدية حلوة لموسم الأعياد.',
  category: 'مناسبات',
  params: [
    { key: 'kind', label: 'الشكل', type: 'select', default: 'snowflake', group: 'الشكل',
      options: [{ value: 'snowflake', label: 'ندفة ثلج' }, { value: 'star', label: 'نجمة' }, { value: 'tree', label: 'شجرة' }, { value: 'bauble', label: 'كرة' }] },
    { key: 'seed', label: 'رقم التصميم', type: 'number', min: 1, max: 999, step: 1, default: 7, group: 'الشكل', show: (p) => p.kind === 'snowflake' },
    { key: 'arm', label: 'سماكة الأطراف', type: 'number', min: 2, max: 6, step: 0.1, unit: 'مم', default: 3.2, group: 'الشكل', show: (p) => p.kind === 'snowflake' },
    { key: 'size', label: 'الحجم', type: 'number', min: 40, max: 140, step: 1, unit: 'مم', default: 80, group: 'الشكل' },
    { key: 'thickness', label: 'السماكة', type: 'number', min: 1.6, max: 6, step: 0.1, unit: 'مم', default: 3, group: 'الشكل' },

    { key: 'name', label: 'الاسم (اختياري)', type: 'text', default: '', maxLength: 14, group: 'الاسم' },
    { key: 'font', label: 'الخط', type: 'font', sample: ['name'], default: 'pacifico', group: 'الاسم', show: (p) => !!p.name?.trim() },
    { key: 'textHeight', label: 'بروز الاسم', type: 'number', min: 0.4, max: 3, step: 0.1, unit: 'مم', default: 1, group: 'الاسم', show: (p) => !!p.name?.trim() },

    { key: 'loop', label: 'حلقة للتعليق', type: 'checkbox', default: true, group: 'التعليق' },

    { key: 'color', label: 'اللون', type: 'color', default: '#f5f5f5', group: 'الألوان' },
    { key: 'nameColor', label: 'لون الاسم', type: 'color', default: '#d02020', group: 'الألوان', show: (p) => !!p.name?.trim() },
  ],
  fonts: (p) => (p.name?.trim() ? [p.font] : []),
  build(p, fonts) {
    const R = p.size / 2;
    let body;
    let nameArea; // where the name may go
    if (p.kind === 'snowflake') {
      body = snowflake(R, Math.round(p.seed), p.arm);
      nameArea = null;
    } else if (p.kind === 'star') {
      body = star(R);
      nameArea = circle(0, -R * 0.05, R * 0.42, 48);
    } else if (p.kind === 'tree') {
      body = tree(R);
      nameArea = [[[-R * 0.62, -R * 0.2], [R * 0.62, -R * 0.2], [R * 0.62, -R * 0.55], [-R * 0.62, -R * 0.55]]];
    } else {
      const cap = [[[-R * 0.18, R * 0.9], [R * 0.18, R * 0.9], [R * 0.18, R * 1.08], [-R * 0.18, R * 1.08]]];
      body = union(circle(0, 0, R * 0.95, 128), cap);
      nameArea = circle(0, 0, R * 0.78, 64);
    }

    // name: on the shape, or on a disc in the middle of a snowflake
    let name = [];
    if (p.name?.trim()) {
      if (p.kind === 'snowflake') {
        const discR = R * 0.42;
        body = union(body, circle(0, 0, discR, 96));
        nameArea = circle(0, 0, discR - 2.5, 96);
      }
      const nb = bounds2(nameArea);
      const tb = textBox(fonts[p.font], p.name.trim(), { height: nb.h * 0.42, maxWidth: nb.w * 0.9, cx: nb.cx, cy: nb.cy });
      name = intersection(union(tb.contours), nameArea);
    }

    // hanging loop at the top
    if (p.loop) {
      const top = bounds2(body).maxY;
      const lr = 4.5;
      const cy = top + lr * 0.5;
      body = difference(union(body, circle(0, cy, lr, 40), stroke([0, top - 3], [0, cy], 4)), circle(0, cy, 2.2, 32));
    }

    const T = p.thickness;
    const parts = [{ name: 'الزينة', color: p.color, geometry: extrude(body, T, 0) }];
    if (name.length) parts.push({ name: 'الاسم', color: p.nameColor, geometry: extrude(name, p.textHeight, T) });
    return parts.filter((x) => x.geometry);
  },
};
