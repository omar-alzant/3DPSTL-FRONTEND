// Split a model along a closed loop drawn on its surface.
// The loop is turned into a prism along the viewing direction:
//   - "through": the prism goes right through the model  → the piece is everything inside the loop
//   - "depth":   the prism stops `depth` mm behind the deepest loop point → an inlay (eyes, face, logo…)
// piece = part ∩ prism (shrunk by `tolerance` so it fits back in), rest = part − prism.
import { THREE, offset, extrude, subtract, intersect, volume } from '../lib/geo.js';

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
