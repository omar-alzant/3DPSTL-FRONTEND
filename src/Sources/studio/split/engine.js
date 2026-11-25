// Split a model along a closed loop drawn on its surface.
// The loop is turned into a prism along the viewing direction:
//   - "through": the prism goes right through the model  → the piece is everything inside the loop
//   - "depth":   the prism stops `depth` mm behind the deepest loop point → an inlay (eyes, face, logo…)
// piece = part ∩ prism (shrunk by `tolerance` so it fits back in), rest = part − prism.
import { THREE, offset, extrude, subtract, intersect, add, volume } from '../lib/geo.js';

/** u, v, n: n = viewing direction, (u, v) = the drawing plane (right-handed: u × v = n) */
export function frameFor(dir) {
  const n = new THREE.Vector3(dir.x, dir.y, dir.z).normalize();
  const up = Math.abs(n.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(up, n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  return { u, v, n };
}

const signedArea = (c) => {
  let a = 0;
  for (let i = 0; i < c.length; i++) {
    const [x1, y1] = c[i], [x2, y2] = c[(i + 1) % c.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
};

/** the smooth closed curve through the points (also used to draw the loop on screen) */
export function loopCurve(points, samples) {
  const v = points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  if (v.length < 3) return v;
  const curve = new THREE.CatmullRomCurve3(v, true, 'centripetal', 0.5);
  const pts = curve.getPoints(samples || Math.max(48, v.length * 18));
  return pts;
}

/** the loop as a smooth closed outline in the drawing plane: [[x, y], …], counter-clockwise */
export function outline(points, frame) {
  const pts = loopCurve(points);
  if (pts.length > 3) pts.pop(); // a closed curve repeats its first point
  let c = pts.map((p) => [p.dot(frame.u), p.dot(frame.v)]);
  if (signedArea(c) < 0) c = c.reverse();
  return c;
}

/** a prism over `contours` (drawing plane), from distance `near` to `far` along n */
export function prism(contours, frame, near, far) {
  const g = extrude(contours, Math.max(0.01, far - near), near);
  if (!g) return null;
  g.applyMatrix4(new THREE.Matrix4().makeBasis(frame.u, frame.v, frame.n));
  g.computeVertexNormals();
  return g;
}

function along(geometry, n) {
  const a = geometry.attributes.position.array;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < a.length; i += 3) {
    const d = a[i] * n.x + a[i + 1] * n.y + a[i + 2] * n.z;
    if (d < lo) lo = d;
    if (d > hi) hi = d;
  }
  return [lo, hi];
}

/**
 * @param geometry non-indexed BufferGeometry (mm)
 * @param opts { points: [{x,y,z}], dir: {x,y,z}, mode: 'through'|'depth', depth, tolerance }
 * @returns { piece, rest } or { error: 'need3' | 'tooSmall' | 'missed' | 'everything' }
 */
export function splitGeometry(geometry, opts) {
  // the boolean maths can trip over an unlucky alignment with the model's triangles:
  // if it does, try again with the direction nudged by a hair (≈0.2°)
  let last = { error: 'failed' };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const d = attempt === 0 ? opts.dir : nudge(opts.dir, attempt);
      const r = splitOnce(geometry, { ...opts, dir: d });
      if (!r.error || r.error !== 'failed') return r;
      last = r;
    } catch (err) {
      last = { error: 'failed', message: String(err?.message || err) };
    }
  }
  return last;
}

function nudge(dir, k) {
  const n = new THREE.Vector3(dir.x, dir.y, dir.z).normalize();
  const f = frameFor(n);
  const a = 0.0035 * k;
  n.addScaledVector(k % 2 ? f.u : f.v, a).normalize();
  return { x: n.x, y: n.y, z: n.z };
}

function splitOnce(geometry, opts) {
  const { points, dir, mode = 'through', depth = 3, tolerance = 0.15 } = opts;
  if (!points || points.length < 3) return { error: 'need3' };
  if (!geometry.attributes.normal) geometry.computeVertexNormals(); // the cutter (CSG) needs normals
  const frame = frameFor(dir);
  const [lo, hi] = along(geometry, frame.n);
  const contour = outline(points, frame);
  if (Math.abs(signedArea(contour)) < 0.5) return { error: 'tooSmall' };
  // clean the outline (a loop that crosses itself is merged) and a copy shrunk by the fit gap
  const full = offset([contour], 0);
  const inner = tolerance > 0 ? offset([contour], -tolerance) : full;
  if (!full.length || !inner.length) return { error: 'tooSmall' };

  const near = lo - 5;
  let far;
  if (mode === 'depth') {
    const rim = Math.max(...points.map((p) => p.x * frame.n.x + p.y * frame.n.y + p.z * frame.n.z));
    far = Math.min(hi + 5, rim + Math.max(0.4, depth));
  } else far = hi + 5;

  const cutAll = prism(full, frame, near, far);
  const cutPiece = prism(inner, frame, near - 1, mode === 'depth' ? far - tolerance : far + 1);
  if (!cutAll || !cutPiece) return { error: 'tooSmall' };

  const piece = intersect(geometry, cutPiece);
  if (!piece || volume(piece) < 1) return { error: 'missed' };
  const rest = subtract(geometry, cutAll);
  if (!rest.attributes.position.count || volume(rest) < 1) return { error: 'everything' };
  // a broken result (NaN corners) counts as a failure, so it is retried
  if (!Number.isFinite(volume(piece)) || !Number.isFinite(volume(rest))) return { error: 'failed' };
  return { piece, rest };
}

// ───────────── straight cut (a knife line) + connectors ─────────────
// Two points and the viewing direction make a flat cutting plane: the part is cut in two along it.
// Optionally the two faces get connectors so the printed pieces line up and glue straight:
//   'pins': a hole in both faces + a loose pin (printed separately)
//   'peg' : a peg standing on one face + a matching hole in the other

const cylAlong = (r, from, to, center, n, seg = 32) => {
  const g = new THREE.CylinderGeometry(r, r, to - from, seg);
  g.rotateX(Math.PI / 2); // along z
  g.translate(0, 0, (from + to) / 2);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  g.applyQuaternion(q);
  g.translate(center.x, center.y, center.z);
  const out = g.toNonIndexed();
  out.deleteAttribute('uv');
  out.computeVertexNormals();
  return out;
};

/** the flat face the cut left on `g` (triangles lying in the plane): centre candidates and the pin size */
function capInfo(g, origin, n, e2, e3) {
  const a = g.attributes.position.array;
  const tris = [];
  const box = new THREE.Box3().setFromBufferAttribute(g.attributes.position);
  const eps = Math.max(1e-3, box.getSize(new THREE.Vector3()).length() * 2e-5);
  const P = new THREE.Vector3();
  const to2 = (i) => { P.set(a[i] - origin.x, a[i + 1] - origin.y, a[i + 2] - origin.z); return [P.dot(e2), P.dot(e3), P.dot(n)]; };
  for (let i = 0; i < a.length; i += 9) {
    const p0 = to2(i), p1 = to2(i + 3), p2 = to2(i + 6);
    if (Math.abs(p0[2]) < eps && Math.abs(p1[2]) < eps && Math.abs(p2[2]) < eps) tris.push([p0, p1, p2]);
  }
  if (!tris.length) return null;
  // edges used by one cap triangle only = the outline of the face
  const key = (p) => `${Math.round(p[0] * 1e3)},${Math.round(p[1] * 1e3)}`;
  const edges = new Map();
  let area = 0;
  for (const t of tris) {
    const ar = Math.abs((t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (t[1][1] - t[0][1])) / 2;
    t.area = ar;
    area += ar;
    for (let k = 0; k < 3; k++) {
      const p = t[k], q = t[(k + 1) % 3];
      const kp = key(p), kq = key(q);
      const ek = kp < kq ? `${kp}|${kq}` : `${kq}|${kp}`;
      const e = edges.get(ek);
      if (e) e.n++; else edges.set(ek, { n: 1, p, q });
    }
  }
  const border = [...edges.values()].filter((e) => e.n === 1);
  const distToBorder = (x, y) => {
    let d = Infinity;
    for (const { p, q } of border) {
      const dx = q[0] - p[0], dy = q[1] - p[1];
      const L = dx * dx + dy * dy;
      let t = L ? ((x - p[0]) * dx + (y - p[1]) * dy) / L : 0;
      t = Math.max(0, Math.min(1, t));
      d = Math.min(d, Math.hypot(x - p[0] - t * dx, y - p[1] - t * dy));
    }
    return d;
  };
  // candidate spots: the middles of the cap triangles (the biggest ones first), plus the area centre
  let cx = 0, cy = 0;
  for (const t of tris) { cx += ((t[0][0] + t[1][0] + t[2][0]) / 3) * t.area; cy += ((t[0][1] + t[1][1] + t[2][1]) / 3) * t.area; }
  const cands = [[cx / area, cy / area]];
  const sorted = [...tris].sort((x, y) => y.area - x.area).slice(0, 500);
  for (const t of sorted) cands.push([(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3]);
  const inside = (x, y) => tris.some((t) => {
    const [A, B, C] = t;
    const d1 = (x - B[0]) * (A[1] - B[1]) - (A[0] - B[0]) * (y - B[1]);
    const d2 = (x - C[0]) * (B[1] - C[1]) - (B[0] - C[0]) * (y - C[1]);
    const d3 = (x - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (y - A[1]);
    const neg = d1 < 0 || d2 < 0 || d3 < 0;
    const pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
  });
  const scored = cands.filter(([x, y]) => inside(x, y)).map(([x, y]) => ({ x, y, d: distToBorder(x, y) }));
  scored.sort((p, q) => q.d - p.d);
  return { area, spots: scored };
}

/** where the connectors go on the cut face, and how big */
function connectorSpots(info, pinD) {
  if (!info?.spots.length) return null;
  const best = info.spots[0];
  const r = pinD ? pinD / 2 : Math.max(1.5, Math.min(4, best.d * 0.4));
  if (best.d < r + 1.2) return null; // the face is too thin for a connector
  const spots = [best];
  // a long face gets a second connector, far from the first
  let second = null;
  for (const s of info.spots) {
    if (s.d < r + 1.2) continue;
    const far = Math.hypot(s.x - best.x, s.y - best.y);
    if (far < 4 * r + 4) continue;
    const score = Math.min(s.d, far / 2);
    if (!second || score > second.score) second = { ...s, score };
  }
  if (second && Math.hypot(second.x - best.x, second.y - best.y) > 8 * r) spots.push(second);
  return { r, spots };
}

/**
 * @param opts { a, b, dir, connector: 'none'|'pins'|'peg', tolerance, pinD (0 = automatic) }
 * @returns { piece, rest, pins: [geometry] } or { error }
 */
export function planeSplit(geometry, opts) {
  let last = { error: 'failed' };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const d = attempt === 0 ? opts.dir : nudge(opts.dir, attempt);
      const r = planeOnce(geometry, { ...opts, dir: d });
      if (!r.error || r.error !== 'failed') return r;
      last = r;
    } catch (err) {
      last = { error: 'failed', message: String(err?.message || err) };
    }
  }
  return last;
}

function planeOnce(geometry, opts) {
  const { a, b, dir, connector = 'pins', tolerance = 0.15, pinD = 0 } = opts;
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const A = new THREE.Vector3(a.x, a.y, a.z);
  const line = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  const view = new THREE.Vector3(dir.x, dir.y, dir.z).normalize();
  // the line as seen on screen: drop its part along the view
  line.addScaledVector(view, -line.dot(view));
  if (line.length() < 0.5) return { error: 'tooShort' };
  const e2 = line.normalize();
  const n = new THREE.Vector3().crossVectors(e2, view).normalize();
  const e3 = new THREE.Vector3().crossVectors(n, e2).normalize();

  geometry.computeBoundingBox();
  const L = geometry.boundingBox.getSize(new THREE.Vector3()).length() * 2 + 20;
  const half = new THREE.BoxGeometry(L, 2 * L, 2 * L);
  half.translate(L / 2, 0, 0);
  half.applyMatrix4(new THREE.Matrix4().makeBasis(n, e2, e3));
  half.translate(A.x, A.y, A.z);
  const H = half.toNonIndexed();
  H.deleteAttribute('uv');
  H.computeVertexNormals();

  let piece = intersect(geometry, H);
  if (!piece || volume(piece) < 1) return { error: 'missed' };
  let rest = subtract(geometry, H);
  if (!rest.attributes.position.count || volume(rest) < 1) return { error: 'missed' };
  if (!Number.isFinite(volume(piece)) || !Number.isFinite(volume(rest))) return { error: 'failed' };

  const pins = [];
  let note = null;
  if (connector !== 'none') {
    const spots = connectorSpots(capInfo(piece, A, n, e2, e3), pinD);
    if (!spots) note = 'thin';
    else {
      const { r } = spots;
      const gap = Math.max(0.1, Number(tolerance) || 0);
      const depth = Math.max(4, Math.min(12, r * 2.5));
      for (const s of spots.spots) {
        const c = A.clone().addScaledVector(e2, s.x).addScaledVector(e3, s.y);
        if (connector === 'peg') {
          // the peg grows out of `rest` into `piece`; `piece` gets the hole
          piece = subtract(piece, cylAlong(r + gap, -0.5, depth + 0.4, c, n));
          rest = add(rest, cylAlong(r, -depth * 0.6, depth - 0.2, c, n));
        } else {
          const hole = cylAlong(r + gap, -depth - 0.3, depth + 0.3, c, n);
          piece = subtract(piece, hole);
          rest = subtract(rest, hole);
          pins.push(cylAlong(r, -depth + 0.2, depth - 0.2, c, n, 24));
        }
      }
    }
  }
  return { piece, rest, pins, note };
}
