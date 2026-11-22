/* eslint-disable import/no-anonymous-default-export */
// Job gift: a little outfit (shirt, suit, lab coat…) on a stand with the person's name,
// and work tools on both sides. Clothes only: no body, no figures.
import { textBox } from '../lib/fonts.js';
import { union, difference, intersection, offset, roundRect, circle, extrude, subtract, merge, intersect, add as add3, THREE } from '../lib/geo.js';

// ---------- small 2D helpers ----------
const poly = (pts) => [pts];
const mirror = (cs) => cs.map((c) => c.map(([x, y]) => [-x, y]).reverse());
const both = (cs) => union(cs, mirror(cs));
const ellipse = (cx, cy, rx, ry, seg = 40) =>
  [Array.from({ length: seg }, (_, i) => [cx + rx * Math.cos((i / seg) * 2 * Math.PI), cy + ry * Math.sin((i / seg) * 2 * Math.PI)])];
const ring2 = (cs, w) => difference(cs, offset(cs, -w));

// ---------- the body of the outfit (a closed loft of rounded sections) ----------
// t = height / bust height; a = half width; b = half depth; n = squareness
const KEYS = {
  long: [
    [0.0, 26, 15.5, 2.25], [0.3, 25.5, 15.5, 2.25], [0.58, 28, 17, 2.3], [0.74, 31, 17.5, 2.45],
    [0.85, 32, 16, 2.6], [0.91, 26.5, 14, 2.4], [0.96, 17, 12, 2.15], [1.0, 11.5, 10.5, 2.0],
  ],
};

function catmull(keys, t, k) {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1][0] < t) i++;
  const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(keys.length - 1, i + 2)];
  const u = Math.min(1, Math.max(0, (t - p1[0]) / (p2[0] - p1[0] || 1)));
  const a = p0[k], b = p1[k], c = p2[k], d = p3[k];
  return 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
}

function makeBody(H, W) {
  const keys = KEYS.long;
  const sec = (t, grow = 0) => ({
    z: t * H,
    a: catmull(keys, t, 1) * W + grow,
    b: catmull(keys, t, 2) * W + grow,
    n: catmull(keys, t, 3),
  });
  const front = (x, z) => {
    const s = sec(Math.min(1, Math.max(0, z / H)));
    const r = Math.min(0.999, Math.abs(x) / s.a);
    return -s.b * Math.pow(1 - Math.pow(r, s.n), 1 / s.n);
  };
  const loft = (grow = 0, rows = 44, seg = 72) => {
    const rings = [];
    for (let j = 0; j <= rows; j++) {
      const s = sec(j / rows, grow);
      const z = j === 0 ? -grow : j === rows ? H + grow : s.z;
      const ring = [];
      for (let i = 0; i < seg; i++) {
        const th = (i / seg) * 2 * Math.PI;
        const c = Math.cos(th), sn = Math.sin(th);
        ring.push([s.a * Math.sign(c) * Math.pow(Math.abs(c), 2 / s.n), s.b * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / s.n), z]);
      }
      rings.push(ring);
    }
    return closedLoft(rings);
  };
  return { sec, front, loft };
}

/** triangles of a closed tube made of rings (+ flat caps) */
function closedLoft(rings) {
  const pos = [];
  const tri = (a, b, c) => pos.push(...a, ...b, ...c);
  const n = rings[0].length;
  for (let j = 0; j < rings.length - 1; j++) {
    const r0 = rings[j], r1 = rings[j + 1];
    for (let i = 0; i < n; i++) {
      const k = (i + 1) % n;
      tri(r0[i], r0[k], r1[k]);
      tri(r0[i], r1[k], r1[i]);
    }
  }
  const cap = (r, up) => {
    const c = r.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n, s[2] + p[2] / n], [0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const k = (i + 1) % n;
      if (up) tri(c, r[i], r[k]); else tri(c, r[k], r[i]);
    }
  };
  cap(rings[0], false);
  cap(rings[rings.length - 1], true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** a closed tube along points with a radius per point */
function sweep(points, radii, seg = 20) {
  const P = points.map((p) => new THREE.Vector3(...p));
  const rings = [];
  let prevN = null;
  for (let i = 0; i < P.length; i++) {
    const tng = new THREE.Vector3().subVectors(P[Math.min(P.length - 1, i + 1)], P[Math.max(0, i - 1)]).normalize();
    let nrm;
    if (!prevN) {
      const ref = Math.abs(tng.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
      nrm = new THREE.Vector3().crossVectors(tng, ref).normalize();
    } else {
      nrm = prevN.clone().sub(tng.clone().multiplyScalar(prevN.dot(tng))).normalize();
    }
    prevN = nrm;
    const bin = new THREE.Vector3().crossVectors(tng, nrm);
    const r = radii[i];
    const ring = [];
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * 2 * Math.PI;
      const v = P[i].clone().addScaledVector(nrm, Math.cos(a) * r).addScaledVector(bin, Math.sin(a) * r);
      ring.push([v.x, v.y, v.z]);
    }
    rings.push(ring);
  }
  const g = closedLoft(rings);
  return fixWinding(g);
}

function signedVolume(g) {
  const p = g.attributes.position.array;
  let v = 0;
  for (let i = 0; i < p.length; i += 9) {
    v += (p[i] * (p[i + 4] * p[i + 8] - p[i + 5] * p[i + 7])
      - p[i + 1] * (p[i + 3] * p[i + 8] - p[i + 5] * p[i + 6])
      + p[i + 2] * (p[i + 3] * p[i + 7] - p[i + 4] * p[i + 6])) / 6;
  }
  return v;
}

function fixWinding(g) {
  if (signedVolume(g) < 0) {
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) {
      const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t;
    }
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
  }
  return g;
}

/** 2D shape drawn on the front (x, z) → a prism going through the body along y */
function prism(cs, y0 = 0, y1 = -80) {
  const g = extrude(cs, Math.abs(y1 - y0), 0);
  if (!g) return null;
  g.rotateX(Math.PI / 2); // (x, y, z) → (x, -z, y): the drawing stands up, depth goes towards -y
  g.translate(0, y0, 0);
  return g;
}

/** 2D shape in x,y extruded upright: drawing in (x, z), thickness along y, centred on y = 0 */
function upright(cs, thick) {
  const g = extrude(cs, thick, 0);
  if (!g) return null;
  g.rotateX(Math.PI / 2);
  g.translate(0, thick / 2, 0);
  return g;
}

const prim = (g) => g.toNonIndexed();
const cyl = (r1, r2, h, seg = 32) => {
  const g = new THREE.CylinderGeometry(r2, r1, h, seg);
  g.rotateX(Math.PI / 2); // axis along z
  g.translate(0, 0, h / 2);
  return g;
};
const box = (w, d, h) => { const g = new THREE.BoxGeometry(w, d, h); g.translate(0, 0, h / 2); return g; };
const sphere = (r, seg = 24) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7));
const at = (g, x, y, z) => { g.translate(x, y, z); return g; };

// ---------- the outfits ----------
// Each returns 2D regions on the front (in x, z with z from 0 to H) and some extras.
// Region colours: 'main' (the outfit), 'inner' (shirt under it), 'accent' (tie, trim…).
function outfitLayers(kind, neck, H, W) {
  const zt = H; // top of body
  const L = []; // { color, lift, cs, full }
  const extras = { sleeves: 'long', collar: 'main', buttons: [] };
  const vNeck = (tipZ, halfW = 11.5 * W) => poly([[-halfW, zt + 2], [halfW, zt + 2], [0, tipZ]]);
  const lapels = (tipZ, width = 8 * W) => {
    const left = poly([
      [-11.5 * W, zt + 1], [-11.5 * W - width * 0.55, zt - 7], [-11.5 * W - width * 0.25, zt - 10],
      [-11.5 * W - width, zt - 13], [-2.5 * W, tipZ - 6], [0, tipZ - 6], [0, tipZ],
    ]);
    return both(difference(left, vNeck(tipZ)));
  };
  const tieShape = (tipZ) => {
    if (neck === 'tie') return union(poly([[-2.6, zt - 1], [2.6, zt - 1], [1.8, zt - 6], [-1.8, zt - 6]]),
      poly([[-1.8, zt - 6], [1.8, zt - 6], [4.2, tipZ - 2], [0, tipZ - 6], [-4.2, tipZ - 2]]));
    if (neck === 'bow') return union(poly([[0, zt - 4], [-8, zt], [-8, zt - 8]]), poly([[0, zt - 4], [8, zt - 8], [8, zt]]), roundRect(0, zt - 4, 4, 4.4, 1));
    if (neck === 'scarf') return union(poly([[-9, zt + 1], [9, zt + 1], [0, zt - 8]]), poly([[-1, zt - 6], [-9, zt - 20], [-2, zt - 19]]),
      poly([[1, zt - 6], [7, zt - 22], [1.5, zt - 18]]), circle(0, zt - 6, 3.2, 20));
    return [];
  };
  const pocket = (cx, cz, w, h, lift = 0.7, color = 'main') => L.push({ color, lift, cs: ring2(roundRect(cx, cz, w, h, 1.2), 1.1) });
  const placket = (fromZ, toZ, w = 5) => L.push({ color: 'main', lift: 0.7, cs: roundRect(0, (fromZ + toZ) / 2, w, fromZ - toZ, 0.8) });
  const pointsCollar = (color, size = 1) =>
    L.push({ color, lift: 1.4, cs: both(poly([[-1, zt - 2], [-11.5 * W, zt + 1], [-13 * W * size, zt - 5 * size], [-4 * size, zt - 13 * size]])) });

  switch (kind) {
    case 'suit': {
      const tip = H * 0.48;
      const tie = intersection(tieShape(tip), vNeck(tip));
      L.push({ color: 'inner', lift: 0.5, cs: difference(vNeck(tip), tie) });
      if (tie.length) L.push({ color: 'accent', lift: 1.4, cs: tie });
      L.push({ color: 'main', lift: 1.8, cs: lapels(tip) });
      L.push({ color: 'inner', lift: 1.9, cs: both(poly([[-1.5, zt - 1], [-11 * W, zt + 1], [-10 * W, zt - 6], [-3.5, zt - 9]])) });
      pocket(-17 * W, H * 0.62, 9 * W, 1.6, 0.8);
      pocket(-16 * W, H * 0.22, 12 * W, 1.6, 0.8);
      pocket(16 * W, H * 0.22, 12 * W, 1.6, 0.8);
      extras.buttons = [[0, H * 0.36], [0, H * 0.24]];
      extras.collar = 'inner';
      break;
    }
    case 'labcoat': {
      const tip = H * 0.56;
      const tie = intersection(tieShape(tip), vNeck(tip));
      L.push({ color: 'inner', lift: 0.5, cs: difference(vNeck(tip), tie) });
      if (tie.length) L.push({ color: 'accent', lift: 1.4, cs: tie });
      L.push({ color: 'main', lift: 1.8, cs: lapels(tip, 9 * W) });
      pocket(16 * W, H * 0.64, 11 * W, 10 * W);
      pocket(-16 * W, H * 0.2, 12 * W, 11 * W);
      pocket(16 * W, H * 0.2, 12 * W, 11 * W);
      L.push({ color: 'main', lift: 0.6, cs: roundRect(0.8, tip / 2, 1.2, tip, 0) });
      extras.buttons = [[3, H * 0.44], [3, H * 0.3], [3, H * 0.16]];
      extras.pen = [12 * W, H * 0.64 + 5 * W];
      extras.collar = 'inner';
      break;
    }
    case 'scrubs': {
      const tip = H * 0.7;
      L.push({ color: 'inner', lift: 0.4, cs: poly([[-8 * W, zt + 2], [8 * W, zt + 2], [0, tip]]) });
      L.push({ color: 'main', lift: 1.2, cs: ring2(poly([[-9.5 * W, zt + 2], [9.5 * W, zt + 2], [0, tip - 2.2]]), 2.2) });
      pocket(-15 * W, H * 0.62, 10 * W, 9 * W);
      extras.pen = [-12 * W, H * 0.62 + 4.5 * W];
      extras.sleeves = 'short';
      extras.collar = 'none';
      break;
    }
    case 'shirt': {
      const tie = tieShape(H * 0.3);
      if (tie.length) L.push({ color: 'accent', lift: 1.6, cs: tie });
      placket(zt - 2, 0, 5);
      pointsCollar('main');
      pocket(-15 * W, H * 0.64, 10 * W, 10 * W);
      if (!tie.length) extras.buttons = [0.86, 0.68, 0.5, 0.32, 0.14].map((t) => [0, H * t]);
      break;
    }
    case 'polo': {
      placket(zt - 2, H * 0.68, 6);
      pointsCollar('main', 0.85);
      extras.buttons = [[0, H * 0.86], [0, H * 0.75]];
      extras.sleeves = 'short';
      extras.collar = 'main';
      extras.logo = [-15 * W, H * 0.66];
      break;
    }
    case 'work': {
      // two-tone work jacket: shoulder yoke in the accent colour, zip down the middle
      L.push({ color: 'accent', lift: 0.5, full: true, cs: roundRect(0, H * 0.865, 120, H * 0.15) });
      L.push({ color: 'accent', lift: 0.6, cs: roundRect(0, H * 0.4, 3, H * 0.84) });
      L.push({ color: 'main', lift: 1.1, cs: union(roundRect(-15 * W, H * 0.6, 12 * W, 10 * W, 1.5), roundRect(15 * W, H * 0.6, 12 * W, 10 * W, 1.5)) });
      L.push({ color: 'accent', lift: 1.4, cs: union(roundRect(-15 * W, H * 0.6 + 4.6 * W, 12.4 * W, 2.4, 0.8), roundRect(15 * W, H * 0.6 + 4.6 * W, 12.4 * W, 2.4, 0.8)) });
      extras.zip = true;
      extras.collar = 'accent';
      break;
    }
    case 'chef': {
      L.push({ color: 'main', lift: 0.9, cs: poly([[-6, zt - 1], [11.5 * W, zt - 2], [20 * W, H * 0.62], [12 * W, 0], [-6, 0]]) });
      extras.buttons = [];
      for (const t of [0.78, 0.6, 0.42, 0.24]) extras.buttons.push([-9 * W, H * t], [9 * W, H * t]);
      extras.btnColor = 'accent';
      extras.collar = 'accent';
      break;
    }
    case 'gown': {
      // graduation gown with a stole on both sides
      const tip = H * 0.62;
      L.push({ color: 'inner', lift: 0.5, cs: vNeck(tip, 10 * W) });
      L.push({ color: 'accent', lift: 1.5, cs: both(poly([[-10.5 * W, zt + 1], [-17.5 * W, zt - 2], [-11 * W, 0], [-4 * W, 0], [-3.5 * W, tip - 4], [-1, tip]])) });
      L.push({ color: 'main', lift: 0.8, cs: both(roundRect(-20 * W, H * 0.35, 1.2, H * 0.5)) });
      extras.collar = 'none';
      break;
    }
    default:
      break;
  }
  return { layers: L, extras };
}

function sleeve(side, kind, H, W, body) {
  const s = (t) => body.sec(t);
  const sh = s(0.84);
  if (kind === 'short') {
    const pts = [[side * (sh.a - 7), 0, H * 0.86], [side * (sh.a + 1), -1, H * 0.78], [side * (sh.a + 4), -2, H * 0.62]];
    return sweep(pts, [9 * W, 10 * W, 10 * W], 28);
  }
  const pts = [
    [side * (sh.a - 7), 0, H * 0.86], [side * (sh.a + 0.5), -1, H * 0.76], [side * (sh.a + 2.5), -2, H * 0.55],
    [side * (sh.a + 2.2), -3.5, H * 0.32], [side * (sh.a + 0.6), -5, H * 0.1], [side * (sh.a), -5.5, 0],
  ];
  return sweep(pts, [9 * W, 9.5 * W, 8.6 * W, 8 * W, 7.6 * W, 7.6 * W], 28);
}

function stethoscope(H, W, body) {
  // a tube lying on the shoulders around the neck, then down the chest on both sides
  const restZ = (x, y) => {
    for (let t = 0.8; t <= 1.0; t += 0.004) {
      const s = body.sec(t);
      const v = Math.pow(Math.abs(x) / s.a, s.n) + Math.pow(Math.abs(y) / s.b, s.n);
      if (v >= 1) return t * H;
    }
    return H;
  };
  const A = 15.5 * W, B = 13.5 * W, r = 1.7;
  const loop = [];
  for (let i = 0; i <= 20; i++) {
    const phi = -Math.PI / 2 + 0.6 + (i / 20) * (2 * Math.PI - 1.2);
    const x = A * Math.cos(phi), y = B * Math.sin(phi);
    loop.push([x, y, restZ(x, y) + r]);
  }
  const down = (x0, y0, z0, z1) => {
    const out = [];
    for (let i = 1; i <= 7; i++) {
      const z = z0 + ((z1 - z0) * i) / 7;
      const x = x0 * (1 - 0.3 * (i / 7));
      out.push([x, Math.min(y0, body.front(x, z) - r - 0.2), z]);
    }
    return out;
  };
  const start = loop[0], end = loop[loop.length - 1];
  const a = down(start[0], start[1], start[2], H * 0.56).reverse();
  const b = down(end[0], end[1], end[2], H * 0.5);
  const path = [...a, ...loop, ...b];
  const tube = sweep(path, path.map(() => r), 14);
  const last = b[b.length - 1];
  const head = cyl(5.2, 5.2, 3.2, 28);
  head.rotateX(Math.PI / 2);
  head.translate(last[0], body.front(last[0], last[2] - 5) - 0.4, last[2] - 5);
  const first = a[0];
  const ear = sphere(2.6, 16); ear.translate(first[0], first[1], first[2]);
  return merge([tube, prim(head), ear]);
}

function gradCap(zTop) {
  const cap = cyl(12.5, 12.5, 7, 40);
  cap.translate(0, 0, zTop - 1);
  const board = box(32, 32, 2.2);
  board.rotateZ(Math.PI / 4);
  board.translate(0, 0, zTop + 6);
  const button = cyl(2, 2, 1.2, 16); button.translate(0, 0, zTop + 8.2);
  const tassel = sweep([[0, 0, zTop + 8.6], [8, -8, zTop + 8.4], [15, -15, zTop + 7.6], [15.5, -15.5, zTop + 1]], [0.9, 0.9, 0.9, 1.3], 10);
  return { body: merge([prim(cap), prim(board)]), tassel: merge([prim(button), tassel]) };
}

// ---------- accessories (local: centred at 0,0; standing on z = 0; ≤ 32 mm footprint) ----------
// each returns [{ geometry, color: 'a' | 'b' }]
const foot = (w = 26, d = 12) => ({ geometry: extrude(roundRect(0, 0, w, d, 3), 2, 0), color: 'a' });
const stand = (cs, thick = 4) => {
  const g = upright(cs, thick);
  return g ? { geometry: at(g, 0, 0, 1.5), color: 'a' } : null;
};

const ACCESSORIES = {
  scissors() {
    const blade = poly([[-1.6, 14], [1.6, 14], [0.4, 44], [-0.8, 44]]);
    const left = union(ring2(ellipse(-5.5, 7, 5, 6.5), 2), blade);
    const s1 = left.map((c) => c.map(([x, y]) => {
      const a = -0.18; return [x * Math.cos(a) - (y - 14) * Math.sin(a), x * Math.sin(a) + (y - 14) * Math.cos(a) + 14];
    }));
    const all = union(s1, mirror(s1));
    return [foot(24, 10), stand(all, 3), { geometry: at(prim(cyl(1.6, 1.6, 4.4, 16)).rotateX(Math.PI / 2), 0, 2.2, 15.5), color: 'b' }];
  },
  comb() {
    let c = roundRect(0, 32, 30, 8, 2);
    for (let i = 0; i < 11; i++) c = union(c, roundRect(-13.5 + i * 2.7, 20, 1.4, 18, 0.6));
    return [foot(32, 10), stand(union(c, roundRect(0, 6, 4, 12, 1)), 3)];
  },
  hairDryer() {
    const barrel = cyl(7.5, 7.5, 26, 32); barrel.rotateY(Math.PI / 2); barrel.translate(-10, 0, 30);
    const nozzle = cyl(5.5, 4.5, 8, 28); nozzle.rotateY(Math.PI / 2); nozzle.translate(16, 0, 30);
    const back = cyl(8.2, 8.2, 3, 32); back.rotateY(Math.PI / 2); back.translate(-13, 0, 30);
    const handle = sweep([[-2, 0, 25], [-4, 0, 14], [-5, 0, 3]], [4.2, 4, 4.4], 20);
    return [{ geometry: at(prim(cyl(9, 9, 2, 32)), -5, 0, 0), color: 'a' }, { geometry: merge([prim(barrel), prim(nozzle), handle]), color: 'a' }, { geometry: prim(back), color: 'b' }];
  },
  tools() {
    const wrench = union(roundRect(0, 20, 4.4, 34, 1.5), circle(0, 38, 6, 28), circle(0, 2.5, 4.5, 24));
    const w2 = difference(wrench, union(roundRect(0, 42, 4.6, 8, 0.4), circle(0, 2.5, 2.2, 16)));
    const rot = (cs, a, cy = 20) => cs.map((c) => c.map(([x, y]) => [x * Math.cos(a) - (y - cy) * Math.sin(a), x * Math.sin(a) + (y - cy) * Math.cos(a) + cy]));
    const shaft = union(roundRect(0, 30, 2.4, 22, 0.6), poly([[-1.2, 41], [1.2, 41], [0.5, 44], [-0.5, 44]]));
    const grip = roundRect(0, 11, 7, 18, 3);
    return [foot(30, 12), stand(rot(w2, 0.5), 3.5), { geometry: at(upright(rot(shaft, -0.5), 3.4), 0, -3.6, 1.5), color: 'b' }, { geometry: at(upright(rot(grip, -0.5), 4.4), 0, -3.8, 1.5), color: 'a' }];
  },
  books() {
    const out = [];
    const dims = [[30, 22, 6], [28, 20, 5], [26, 19, 6]];
    let z = 0;
    dims.forEach(([w, d, h], i) => {
      const cover = box(w, d, h); cover.rotateZ((i - 1) * 0.12); cover.translate(0, 0, z);
      const pages = box(w - 2, d - 1.2, h - 1.6); pages.rotateZ((i - 1) * 0.12); pages.translate(1.2, -0.9, z + 0.8);
      out.push({ geometry: subtract(prim(cover), prim(pages)), color: i === 1 ? 'b' : 'a' });
      out.push({ geometry: prim(pages), color: i === 1 ? 'a' : 'b' });
      z += h;
    });
    return out;
  },
  pencilCup() {
    const cup = subtract(prim(cyl(11, 11, 26, 40)), at(prim(cyl(9.2, 9.2, 30, 40)), 0, 0, 2));
    const pens = [];
    const tips = [];
    [[-3.5, -2, 0.12, 34], [3.5, 1, -0.1, 38], [0, 4, 0.05, 31]].forEach(([x, y, tilt, len]) => {
      const p = cyl(1.8, 1.8, len - 5, 6); p.rotateY(tilt); p.translate(x, y, 2);
      const t = cyl(1.8, 0.3, 5, 6); t.translate(0, 0, len - 5); t.rotateY(tilt); t.translate(x, y, 2);
      pens.push(prim(p)); tips.push(prim(t));
    });
    return [{ geometry: cup, color: 'a' }, { geometry: merge(pens), color: 'b' }, { geometry: merge(tips), color: 'a' }];
  },
  laptop() {
    const base = box(30, 21, 2);
    const keys = box(25, 10, 0.6); keys.translate(0, 2, 2);
    const screen = box(30, 1.8, 20); screen.rotateX(-0.25); screen.translate(0, 9.6, 1.2);
    const glass = box(26, 0.6, 15); glass.translate(0, -1, 2.5); glass.rotateX(-0.25); glass.translate(0, 9.6, 1.2);
    return [{ geometry: merge([prim(base), prim(screen)]), color: 'a' }, { geometry: merge([prim(keys), prim(glass)]), color: 'b' }];
  },
  mug() {
    const body = subtract(prim(cyl(9, 9, 22, 40)), at(prim(cyl(7.4, 7.4, 22, 40)), 0, 0, 2));
    const handle = new THREE.TorusGeometry(6, 1.8, 12, 28, Math.PI);
    handle.rotateX(Math.PI / 2); handle.rotateY(Math.PI / 2); handle.translate(8.4, 0, 11);
    const band = subtract(prim(cyl(9.3, 9.3, 4, 40)), prim(cyl(8.5, 8.5, 4, 40)));
    return [{ geometry: merge([body, prim(handle)]), color: 'a' }, { geometry: at(band, 0, 0, 12), color: 'b' }];
  },
  suitcase() {
    const shell = extrude(roundRect(0, 0, 22, 13, 3), 28, 3);
    const ribs = merge([-5, 0, 5].map((x) => at(prim(box(1.4, 14, 26)), x, 0, 4)));
    const handle = merge([at(prim(box(1.6, 1.6, 9)), -4, 0, 30), at(prim(box(1.6, 1.6, 9)), 4, 0, 30), at(prim(box(9.6, 2.4, 1.8)), 0, 0, 38)]);
    const wheels = merge([[-8, -4], [8, -4], [-8, 4], [8, 4]].map(([x, y]) => at(prim(cyl(1.8, 1.8, 3, 16)), x, y, 0)));
    return [{ geometry: shell, color: 'a' }, { geometry: merge([ribs]), color: 'a' }, { geometry: merge([handle, wheels]), color: 'b' }];
  },
  plane() {
    const body = union(roundRect(0, 0, 34, 5, 2.5), poly([[13, 0], [19, 2.2], [19, -0.4]]));
    const wing = poly([[-2, 1], [4, 1], [-6, 12], [-9, 12]]);
    const wing2 = poly([[-2, -1], [4, -1], [-7, -9], [-10, -9]]);
    const tail = poly([[-17, 1], [-13, 1], [-17, 8], [-19, 8]]);
    const plane = union(body, wing, wing2, tail);
    const placed = plane.map((c) => c.map(([x, y]) => [x * 0.9, y * 0.9 + 30]));
    const pole = roundRect(0, 14, 2.4, 26, 0.6);
    return [{ geometry: at(prim(cyl(9, 9, 2, 32)), 0, 0, 0), color: 'a' }, { geometry: at(upright(pole, 2.4), 0, 0, 1.5), color: 'a' }, { geometry: at(upright(placed, 3.2), 0, 0, 1.5), color: 'b' }];
  },
  microscope() {
    const base = extrude(roundRect(0, 1, 20, 22, 4), 3, 0);
    const prof = union(roundRect(7, 16, 5, 28, 1.5), poly([[4.5, 26], [9.5, 28], [3, 38], [-1.5, 35]]));
    const arm = upright(prof, 6); arm.rotateZ(Math.PI / 2);
    const stage = box(16, 13, 2); stage.translate(0, -1, 13);
    const tube = sweep([[0, 1, 34], [0, -4, 20]], [3.4, 3.4], 24);
    const lens = sweep([[0, -4, 20.5], [0, -5, 16.5]], [2.2, 1.6], 18);
    const eye = sweep([[0, 1.6, 33], [0, 3.6, 40]], [2.2, 2.4], 18);
    return [{ geometry: base, color: 'a' }, { geometry: merge([at(arm, 0, 0, 2.5), prim(stage)]), color: 'a' },
      { geometry: merge([tube, eye]), color: 'b' }, { geometry: lens, color: 'a' }];
  },
  tooth() {
    const t = union(ellipse(-4, 24, 7, 7.5), ellipse(4, 24, 7, 7.5), roundRect(0, 21, 18, 8, 3),
      poly([[-10, 21], [-2, 21], [-4, 1], [-7, 0]]), poly([[2, 21], [10, 21], [7, 0], [4, 1]]));
    return [foot(24, 10), { geometry: at(upright(t, 6), 0, 0, 1.5), color: 'b' }];
  },
  heart() {
    const h = union(circle(-5.5, 19, 7, 36), circle(5.5, 19, 7, 36), poly([[-12.3, 17], [12.3, 17], [0, 2]]), roundRect(0, 2, 5, 4, 1));
    return [foot(22, 10), { geometry: at(upright(h, 5), 0, 0, 1.5), color: 'b' }];
  },
  testTubes() {
    const rack = subtract(prim(box(30, 10, 14)), ...[-9, 0, 9].map((x) => at(prim(cyl(3.2, 3.2, 20, 20)), x, 0, 4)), at(prim(box(26, 12, 7)), 0, 0, 3));
    const tubes = [-9, 0, 9].map((x, i) => at(prim(cyl(2.8, 2.8, 22 - i * 3, 20)), x, 0, 3));
    const liquid = [-9, 0, 9].map((x) => at(prim(cyl(2.9, 2.9, 7, 20)), x, 0, 3));
    return [{ geometry: rack, color: 'a' }, { geometry: merge(tubes), color: 'b' }, { geometry: merge(liquid), color: 'a' }];
  },
  rulers() {
    const tri = difference(poly([[-14, 2], [10, 2], [-14, 34]]), poly([[-10, 7], [1, 7], [-10, 21.5]]));
    let ruler = roundRect(9, 20, 5, 36, 0.6);
    for (let i = 0; i < 8; i++) ruler = difference(ruler, roundRect(11.2, 5 + i * 4.2, 2, 0.8, 0));
    return [foot(32, 10), { geometry: at(upright(tri, 3), 0, -1.6, 1.5), color: 'a' }, { geometry: at(upright(ruler, 3), 0, 1.6, 1.5), color: 'b' }];
  },
  ball() {
    const b = sphere(13, 32); b.translate(0, 0, 15);
    const patches = [];
    for (let i = 0; i < 6; i++) {
      const p = new THREE.CylinderGeometry(4.6, 4.6, 3, 5);
      p.translate(0, 12.2, 0);
      p.rotateX(i < 1 ? 0 : 1.1); p.rotateZ((i * 2 * Math.PI) / 5);
      p.translate(0, 0, 15);
      patches.push(prim(p));
    }
    patches.push(at(prim(cyl(4.6, 4.6, 3, 5)), 0, 0, 26.4));
    const ringStand = subtract(prim(cyl(8, 8, 4, 32)), prim(cyl(6, 6, 4, 32)));
    const spots = add3(...patches);
    return [{ geometry: ringStand, color: 'a' }, { geometry: subtract(prim(b), spots), color: 'b' }, { geometry: intersect(spots, prim(b)), color: 'a' }];
  },
  phone() {
    const ph = extrude(roundRect(0, 18, 15, 30, 2.5), 2.4, 0); ph.rotateX(Math.PI / 2 - 0.25); ph.translate(0, 2, 2);
    const scr = extrude(roundRect(0, 18, 13, 27, 1.8), 0.8, 0); scr.rotateX(Math.PI / 2 - 0.25); scr.translate(0, 1.2, 2);
    const st = union(poly([[-3, 0], [9, 0], [9, 2.5], [-1, 3]]));
    const standG = extrude(st, 14, 0); standG.rotateY(-Math.PI / 2); standG.rotateZ(-Math.PI / 2); standG.translate(-7, 0, 0);
    return [{ geometry: at(extrude(roundRect(0, 0, 20, 14, 3), 2, 0), 0, 0, 0), color: 'a' }, { geometry: merge([ph, standG]), color: 'a' }, { geometry: scr, color: 'b' }];
  },
  camera() {
    const body = extrude(roundRect(0, 0, 28, 12, 2.5), 17, 0);
    const lens = cyl(6.5, 6.5, 7, 32); lens.rotateX(Math.PI / 2); lens.translate(0, -5.5, 8.5);
    const glass = cyl(4.6, 4.6, 1, 28); glass.rotateX(Math.PI / 2); glass.translate(0, -12.6, 8.5);
    const top = box(9, 7, 4); top.translate(-6, 0, 17);
    const flash = box(4, 1, 3); flash.translate(8, -6.3, 12);
    return [{ geometry: merge([body, prim(top)]), color: 'a' }, { geometry: prim(lens), color: 'a' }, { geometry: merge([prim(glass), prim(flash)]), color: 'b' }];
  },
  gavel() {
    const block = extrude(circle(0, 0, 11, 40), 4, 0);
    const head = cyl(4.2, 4.2, 18, 28); head.rotateY(Math.PI / 2); head.translate(-9, 0, 9.5);
    const bands = merge([-7, 7].map((x) => { const g = cyl(4.6, 4.6, 1.6, 28); g.rotateY(Math.PI / 2); g.translate(x - 0.8, 0, 9.5); return prim(g); }));
    const handle = sweep([[0, 0, 9.5], [4, -6, 11], [8, -15, 14]], [1.6, 1.6, 1.9], 14);
    return [{ geometry: block, color: 'a' }, { geometry: merge([prim(head), handle]), color: 'a' }, { geometry: bands, color: 'b' }];
  },
  cutlery() {
    let fork = union(roundRect(0, 14, 3, 26, 1.4), roundRect(0, 31, 8, 6, 2));
    for (const x of [-3, -1, 1, 3]) fork = union(fork, roundRect(x, 38, 1, 10, 0.4));
    const spoon = union(roundRect(0, 14, 3, 26, 1.4), ellipse(0, 34, 5.5, 8));
    return [foot(30, 10), { geometry: at(upright(fork.map((c) => c.map(([x, y]) => [x - 6, y])), 3), 0, 0, 1.5), color: 'b' },
      { geometry: at(upright(spoon.map((c) => c.map(([x, y]) => [x + 6, y])), 3), 0, 0, 1.5), color: 'b' }];
  },
  palette() {
    const pal = difference(ellipse(0, 20, 15, 12, 48), circle(-7, 14, 3, 24));
    const blobs = [[0, 27], [7, 23], [9, 15], [-6, 25]].map(([x, y]) => circle(x, y, 2.4, 20));
    const brush = union(roundRect(13, 22, 2, 26, 0.8), ellipse(13, 37, 1.6, 4));
    return [foot(30, 10), stand(union(pal, roundRect(0, 4, 5, 9, 1)), 3), { geometry: at(upright(union(...blobs), 1.2), 0, -2, 1.5), color: 'b' }, { geometry: at(upright(brush, 2), 0, 2.6, 1.5), color: 'b' }];
  },
  apple() {
    const prof = [];
    for (let i = 0; i <= 24; i++) {
      const a = -Math.PI / 2 + (i / 24) * Math.PI;
      const r = 11 * Math.cos(a) * (1 + 0.12 * Math.sin(a * 3 + 1));
      prof.push(new THREE.Vector2(Math.max(0.01, r), 12 + 11 * Math.sin(a)));
    }
    const ap = new THREE.LatheGeometry(prof, 40);
    const stem = cyl(1, 0.8, 6, 10); stem.rotateY(0.25); stem.translate(0.5, 0, 21);
    const leaf = ellipse(0, 0, 4.5, 2, 20);
    const lg = extrude(leaf, 1.2, 0); lg.rotateY(-0.5); lg.translate(5, 0, 25);
    return [{ geometry: at(prim(cyl(7, 7, 2, 32)), 0, 0, 0), color: 'b' }, { geometry: at(prim(ap), 0, 0, 1.2), color: 'a' }, { geometry: merge([prim(stem), lg]), color: 'b' }];
  },
  babyBottle() {
    const b = cyl(7, 7, 24, 36);
    const cap = cyl(7.6, 7.6, 4, 36); cap.translate(0, 0, 24);
    const nip = new THREE.LatheGeometry([[0.01, 0], [5, 0], [4, 2], [2, 4], [2, 6], [2.6, 8], [0.01, 9]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
    nip.rotateX(Math.PI / 2); nip.translate(0, 0, 28);
    const marks = merge([6, 11, 16].map((z) => at(prim(box(5, 1, 0.8)), 0, -7, z)));
    return [{ geometry: prim(b), color: 'a' }, { geometry: merge([prim(cap), marks]), color: 'b' }, { geometry: prim(nip), color: 'b' }];
  },
};

const ACC_OPTIONS = [
  { value: 'none', label: 'بلا شي' },
  { value: 'scissors', label: 'مقص', group: 'تجميل وحلاقة' },
  { value: 'comb', label: 'مشط', group: 'تجميل وحلاقة' },
  { value: 'hairDryer', label: 'سشوار', group: 'تجميل وحلاقة' },
  { value: 'testTubes', label: 'أنابيب مختبر', group: 'طب وعلوم' },
  { value: 'microscope', label: 'مجهر', group: 'طب وعلوم' },
  { value: 'tooth', label: 'سن', group: 'طب وعلوم' },
  { value: 'heart', label: 'قلب', group: 'طب وعلوم' },
  { value: 'babyBottle', label: 'رضّاعة', group: 'طب وعلوم' },
  { value: 'books', label: 'كتب', group: 'مكتب وتعليم' },
  { value: 'pencilCup', label: 'كاسة أقلام', group: 'مكتب وتعليم' },
  { value: 'rulers', label: 'مسطرة ومثلث', group: 'مكتب وتعليم' },
  { value: 'apple', label: 'تفاحة', group: 'مكتب وتعليم' },
  { value: 'laptop', label: 'لابتوب', group: 'مكتب وتعليم' },
  { value: 'phone', label: 'تلفون', group: 'مكتب وتعليم' },
  { value: 'gavel', label: 'مطرقة قاضي', group: 'مكتب وتعليم' },
  { value: 'mug', label: 'فنجان', group: 'مكتب وتعليم' },
  { value: 'tools', label: 'مفتاح ومفك', group: 'شغل وهوايات' },
  { value: 'suitcase', label: 'شنطة سفر', group: 'شغل وهوايات' },
  { value: 'plane', label: 'طيارة', group: 'شغل وهوايات' },
  { value: 'camera', label: 'كاميرا', group: 'شغل وهوايات' },
  { value: 'cutlery', label: 'شوكة ومعلقة', group: 'شغل وهوايات' },
  { value: 'palette', label: 'لوحة ألوان', group: 'شغل وهوايات' },
  { value: 'ball', label: 'طابة', group: 'شغل وهوايات' },
];

const OUTFITS = [
  { value: 'suit', label: 'بدلة رسمية' },
  { value: 'labcoat', label: 'روب طبيب / صيدلي' },
  { value: 'scrubs', label: 'سكراب (تمريض وطب)' },
  { value: 'shirt', label: 'قميص' },
  { value: 'polo', label: 'كنزة بولو' },
  { value: 'work', label: 'جاكيت شغل (ميكانيك وهندسة)' },
  { value: 'chef', label: 'جاكيت شيف' },
  { value: 'gown', label: 'روب تخرّج' },
];

export default {
  id: 'job-outfit',
  name: 'هدية المهنة: اللبس والاسم',
  description: 'لبس المهنة (بدلة، روب طبيب، سكراب، جاكيت شيف…) على قاعدة عليها الاسم، ومع أغراض الشغل عالجنبين. هدية حلوة للتخرّج، للدكتور، للمعلّمة، أو لافتتاح محل.',
  category: 'هدايا',
  params: [
    { key: 'outfit', label: 'اللبس', type: 'select', dropdown: true, default: 'labcoat', group: 'اللبس', options: OUTFITS },
    { key: 'neck', label: 'عالرقبة', type: 'select', default: 'none', group: 'اللبس',
      help: 'للبدلة والروب والقميص',
      options: [{ value: 'none', label: 'بلا' }, { value: 'tie', label: 'كرافات' }, { value: 'bow', label: 'بابيون' }, { value: 'scarf', label: 'إيشارب' }] },
    { key: 'stethoscope', label: 'سمّاعة طبيب', type: 'checkbox', default: true, group: 'اللبس' },
    { key: 'cap', label: 'قبعة تخرّج', type: 'checkbox', default: false, group: 'اللبس' },

    { key: 'name', label: 'الاسم', type: 'text', default: 'Dr. Yara', maxLength: 28, group: 'الاسم' },
    { key: 'title', label: 'السطر التاني (المهنة)', type: 'text', default: 'Pharmacist', maxLength: 34, group: 'الاسم', help: 'اتركه فاضي إذا بدك سطر واحد' },
    { key: 'font', label: 'الخط', type: 'font', sample: ['name'], default: 'lilita', group: 'الاسم' },

    { key: 'left', label: 'عالشمال', type: 'select', dropdown: true, default: 'testTubes', group: 'الأغراض', options: ACC_OPTIONS },
    { key: 'right', label: 'عاليمين', type: 'select', dropdown: true, default: 'microscope', group: 'الأغراض', options: ACC_OPTIONS },

    { key: 'mainColor', label: 'لون اللبس', type: 'color', default: '#f5f5f5', group: 'الألوان' },
    { key: 'innerColor', label: 'لون القميص من جوّا', type: 'color', default: '#4a90d9', group: 'الألوان' },
    { key: 'accentColor', label: 'لون الكرافات والتفاصيل', type: 'color', default: '#1a1a1a', group: 'الألوان' },
    { key: 'accColor', label: 'لون الأغراض', type: 'color', default: '#1e5bd8', group: 'الألوان' },
    { key: 'accColor2', label: 'لون تاني للأغراض', type: 'color', default: '#f5f5f5', group: 'الألوان' },
    { key: 'baseColor', label: 'لون القاعدة', type: 'color', default: '#f5f5f5', group: 'الألوان' },
    { key: 'plateColor', label: 'لون لوحة الاسم', type: 'color', default: '#1a1a1a', group: 'الألوان' },
    { key: 'textColor', label: 'لون الاسم', type: 'color', default: '#f5f5f5', group: 'الألوان' },

    { key: 'size', label: 'طول القاعدة', type: 'number', min: 130, max: 220, step: 1, unit: 'مم', default: 160, group: 'المقاس' },
  ],
  fonts: (p) => ((p.name?.trim() || p.title?.trim()) ? [p.font] : []),
  build(p, fonts) {
    const k = p.size / 160; // everything scales with the base length
    const L = p.size, D = 78 * k, HB = 28 * k;
    const H = 92 * k, W = 0.9 * k; // bust height / width scale
    const by = 5 * k; // bust sits a bit towards the back
    const parts = [];
    const add = (name, color, geometry) => { if (geometry && geometry.attributes.position.count) parts.push({ name, color, geometry }); };

    // ----- base: a wide step + the block, name plate on the front -----
    const step = extrude(roundRect(0, 0, L, D, 6 * k), 5 * k, 0);
    const block = extrude(roundRect(0, 1.5 * k, L - 8 * k, D - 7 * k, 4 * k), HB - 5 * k, 5 * k);
    add('القاعدة', p.baseColor, merge([step, block]));

    const name = p.name?.trim(), title = p.title?.trim();
    const faceY = 1.5 * k - (D - 7 * k) / 2; // front face of the block
    if (name || title) {
      const pw = L - 26 * k, ph = HB - 7.5 * k, pz = 5 * k + (HB - 5 * k) / 2;
      const plate = prism(roundRect(0, pz, pw, ph, 2.2 * k), faceY + 0.01, faceY - 1.2);
      add('لوحة الاسم', p.plateColor, plate);
      const f = fonts[p.font];
      let text = [];
      const two = name && title;
      if (name) {
        const tb = textBox(f, name, { height: ph * (two ? 0.4 : 0.56), maxWidth: pw - 8 * k, cx: 0, cy: two ? pz + ph * 0.2 : pz });
        text = union(text, tb.contours);
      }
      if (title) {
        const tb = textBox(f, title, { height: ph * (two ? 0.22 : 0.5), maxWidth: pw - 12 * k, cx: 0, cy: two ? pz - ph * 0.28 : pz });
        text = union(text, tb.contours);
      }
      if (!text.length) throw new Error('ما قدرنا نرسم الاسم بهالخط');
      add('الاسم', p.textColor, prism(text, faceY - 1.19, faceY - 2.0));
    }

    // ----- the outfit -----
    const body = makeBody(H, W);
    const torso = fixWinding(body.loft(0));
    const { layers, extras } = outfitLayers(p.outfit, p.neck, H, W);
    const colorOf = { main: p.mainColor, inner: p.innerColor, accent: p.accentColor };
    const lift = (g) => at(g, 0, by, HB);

    const pieces = { main: [lift(torso.clone())], inner: [], accent: [] };
    const sleeves = [-1, 1].map((s) => lift(sleeve(s, extras.sleeves, H, W, body)));
    pieces.main.push(...sleeves.map((g) => subtract(g, lift(torso.clone()))));

    // the details: a thin layer that follows the body (prism ∩ grown body) − body
    for (const lay of layers) {
      if (!lay.cs?.length) continue;
      const shell = fixWinding(body.loft(lay.lift));
      const pr = prism(lay.cs, lay.full ? 80 : 0, -80);
      const piece = intersect(pr, shell);
      if (!piece) continue;
      pieces[lay.color].push(lift(subtract(piece, torso)));
    }

    // collar ring around the neck (hollow look)
    const ringCol = extras.collar === 'none' ? 'main' : extras.collar;
    const top = body.sec(1);
    const ringH = extras.collar === 'none' ? 2.5 : 4.5 * k;
    const collar = subtract(prim(cyl(top.a + 1.2, top.a + 0.6, ringH, 48)), at(prim(cyl(top.a - 1.2, top.a - 1.2, ringH + 2, 48)), 0, 0, 1.6));
    pieces[ringCol].push(lift(at(collar, 0, 0, H - 2)));
    const hole = at(prim(cyl(top.a - 1.4, top.a - 1.4, 0.8, 48)), 0, 0, H);
    pieces.accent.push(lift(hole));

    for (const [x, z] of extras.buttons) {
      const b = cyl(1.9 * W, 1.9 * W, 2.2, 20);
      b.rotateX(Math.PI / 2);
      b.translate(x, body.front(x, z) - 0.6, z);
      pieces[extras.btnColor || 'accent'].push(lift(prim(b)));
    }
    if (extras.pen) {
      const [x, z] = extras.pen;
      const pen = cyl(1.3, 1.3, 9 * W, 16); pen.translate(x, body.front(x, z) - 1.8, z - 3 * W);
      pieces.accent.push(lift(prim(pen)));
    }
    if (extras.zip) {
      const z = H * 0.83;
      const pull = box(2.6, 1.6, 6); pull.translate(0, body.front(0, z) - 1.2, z - 6);
      pieces.main.push(lift(prim(pull)));
    }
    if (extras.logo) {
      const [x, z] = extras.logo;
      const lg = cyl(3.2, 3.2, 1.6, 24); lg.rotateX(Math.PI / 2); lg.translate(x, body.front(x, z) - 0.4, z);
      pieces.accent.push(lift(prim(lg)));
    }

    add('اللبس', p.mainColor, merge(pieces.main));
    if (pieces.inner.length) add('القميص', colorOf.inner, merge(pieces.inner));
    if (pieces.accent.length) add('التفاصيل', colorOf.accent, merge(pieces.accent));

    if (p.stethoscope) {
      const st = stethoscope(H, W, body);
      add('السمّاعة', p.accentColor, lift(subtract(st, body.loft(0.2))));
    }
    if (p.cap) {
      const c = gradCap(H + ringH - 3);
      add('قبعة التخرّج', p.accentColor, lift(c.body));
      add('شرّابة القبعة', p.accColor, lift(c.tassel));
    }

    // ----- accessories on both sides -----
    const slotX = L / 2 - 4 * k - Math.max(18, (L / 2 - 4 * k - 44 * k) / 2 + 2);
    for (const [side, key] of [[-1, 'left'], [1, 'right']]) {
      const fn = ACCESSORIES[p[key]];
      if (!fn) continue;
      const list = fn().filter((x) => x && x.geometry);
      for (const it of list) {
        const g = it.geometry.clone();
        g.scale(k, k, k);
        g.translate(side * slotX, 1 * k, HB);
        add(key === 'left' ? 'غرض الشمال' : 'غرض اليمين', it.color === 'b' ? p.accColor2 : p.accColor, g);
      }
    }
    return mergeSameColor(parts);
  },
};

/** one part per colour and name, so the 3MF stays tidy */
function mergeSameColor(parts) {
  const out = new Map();
  for (const x of parts) {
    const key = `${x.name}|${x.color}`;
    if (!out.has(key)) out.set(key, { name: x.name, color: x.color, list: [] });
    out.get(key).list.push(x.geometry);
  }
  return [...out.values()].map((v) => ({ name: v.name, color: v.color, geometry: v.list.length === 1 ? v.list[0] : merge(v.list) }));
}
