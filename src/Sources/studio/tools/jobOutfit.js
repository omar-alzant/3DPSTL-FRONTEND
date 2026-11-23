/* eslint-disable import/no-anonymous-default-export */
// Job gift: a work outfit (sculpted 3DSTL models, hollow like a pen cup) on a stand with the
// person's name, and work tools on both sides. The outfits live in public/media/outfits/<id>.glb.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { textBox } from '../lib/fonts.js';
import { union, difference, offset, roundRect, circle, extrude, subtract, merge, intersect, add as add3, THREE } from '../lib/geo.js';

// size of each model as saved (mm): width (x), depth (y), height (z)
const OUTFITS = [
  { value: 'labcoat', label: 'روب طبيبة / صيدلانية', w: 75.6, d: 62.9, h: 99.7 },
  { value: 'scrubs', label: 'سكراب (تمريض وطب)', w: 88.0, d: 62.7, h: 89.8 },
  { value: 'suit', label: 'بدلة رسمية', w: 87.7, d: 75.7, h: 100 },
  { value: 'shirt-tie', label: 'قميص رسمي (محامي وموظّف)', w: 96.7, d: 78.5, h: 100 },
  { value: 'pilot', label: 'طيّار', w: 80.8, d: 63.5, h: 99.9 },
  { value: 'chef', label: 'جاكيت شيف', w: 76.7, d: 66.1, h: 98.9 },
  { value: 'work-vest', label: 'جيليه شغل (مهندس)', w: 100, d: 68.7, h: 88.2 },
  { value: 'overalls', label: 'أفرول شغل', w: 80.5, d: 61.7, h: 100 },
  { value: 'jersey', label: 'قميص رياضي', w: 79.9, d: 61.7, h: 99.9 },
  { value: 'graduate', label: 'روب تخرّج', w: 99, d: 72.8, h: 99.4 },
];
const media = (f) => `${process.env.PUBLIC_URL || ''}/media/outfits/${f}`;
OUTFITS.forEach((o) => { o.image = media(`${o.value}.png`); });

const cache = new Map();
function loadOutfit(id) {
  if (!cache.has(id)) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const p = loader.loadAsync(media(`${id}.glb`)).then((gltf) => {
      const geos = [];
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => {
        if (o.isMesh) {
          const g = o.geometry.clone();
          g.applyMatrix4(o.matrixWorld);
          geos.push(g.index ? g.toNonIndexed() : g);
        }
      });
      const g = merge(geos);
      g.computeBoundingBox();
      const b = g.boundingBox;
      g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -b.min.z);
      return g;
    });
    p.catch(() => cache.delete(id)); // try again next time if the download failed
    cache.set(id, p);
  }
  return cache.get(id);
}

// ---------- small 2D helpers ----------
const poly = (pts) => [pts];
const mirror = (cs) => cs.map((c) => c.map(([x, y]) => [-x, y]).reverse());
const ellipse = (cx, cy, rx, ry, seg = 40) =>
  [Array.from({ length: seg }, (_, i) => [cx + rx * Math.cos((i / seg) * 2 * Math.PI), cy + ry * Math.sin((i / seg) * 2 * Math.PI)])];
const ring2 = (cs, w) => difference(cs, offset(cs, -w));

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

export default {
  id: 'job-outfit',
  name: 'هدية المهنة: اللبس والاسم',
  description: 'لبس المهنة منحوت بالتفاصيل (روب طبيب، سكراب، بدلة، شيف، طيّار…) ومجوّف من فوق متل كاسة أقلام، على قاعدة عليها الاسم ومع أغراض الشغل عالجنبين. هدية حلوة للتخرّج، للدكتور، للمعلّمة، أو لافتتاح محل.',
  category: 'هدايا',
  params: [
    { key: 'outfit', label: 'اللبس', type: 'select', pictures: true, default: 'labcoat', group: 'اللبس', options: OUTFITS.map(({ value, label, image }) => ({ value, label, image })) },
    { key: 'height', label: 'طول اللبس', type: 'number', min: 70, max: 140, step: 1, unit: 'مم', default: 95, group: 'اللبس' },
    { key: 'mainColor', label: 'لون اللبس', type: 'color', default: '#f5f5f5', group: 'اللبس' },

    { key: 'name', label: 'الاسم', type: 'text', default: 'Dr. Yara', maxLength: 28, group: 'الاسم' },
    { key: 'title', label: 'السطر التاني (المهنة)', type: 'text', default: 'Pharmacist', maxLength: 34, group: 'الاسم', help: 'اتركه فاضي إذا بدك سطر واحد' },
    { key: 'font', label: 'الخط', type: 'font', sample: ['name'], default: 'lilita', group: 'الاسم' },

    { key: 'left', label: 'عالشمال', type: 'select', dropdown: true, default: 'testTubes', group: 'الأغراض', options: ACC_OPTIONS },
    { key: 'right', label: 'عاليمين', type: 'select', dropdown: true, default: 'microscope', group: 'الأغراض', options: ACC_OPTIONS },
    { key: 'accColor', label: 'لون الأغراض', type: 'color', default: '#1e5bd8', group: 'الألوان' },
    { key: 'accColor2', label: 'لون تاني للأغراض', type: 'color', default: '#f5f5f5', group: 'الألوان' },
    { key: 'baseColor', label: 'لون القاعدة', type: 'color', default: '#f5f5f5', group: 'الألوان' },
    { key: 'plateColor', label: 'لون لوحة الاسم', type: 'color', default: '#1a1a1a', group: 'الألوان' },
    { key: 'textColor', label: 'لون الاسم', type: 'color', default: '#f5f5f5', group: 'الألوان' },
  ],
  fonts: (p) => ((p.name?.trim() || p.title?.trim()) ? [p.font] : []),
  async build(p, fonts) {
    const o = OUTFITS.find((x) => x.value === p.outfit) || OUTFITS[0];
    const src = await loadOutfit(o.value);
    const s = p.height / o.h;
    const W = o.w * s, Dm = o.d * s;
    const parts = [];
    const add = (name, color, geometry) => { if (geometry && geometry.attributes.position.count) parts.push({ name, color, geometry }); };

    // ----- base: sized to the outfit and the tools on its sides -----
    const hasL = ACCESSORIES[p.left], hasR = ACCESSORIES[p.right];
    const zone = 40; // room for one tool
    const L = Math.max(120, W + (hasL ? zone : 8) + (hasR ? zone : 8) + 12);
    const D = Math.max(66, Dm + 18);
    const HB = 26;
    const k = Math.min(1.25, Math.max(0.8, L / 160)); // name plate scale
    const step = extrude(roundRect(0, 0, L, D, 6), 5, 0);
    const block = extrude(roundRect(0, 1.5, L - 8, D - 7, 4), HB - 5, 5);
    add('القاعدة', p.baseColor, merge([step, block]));

    const name = p.name?.trim(), title = p.title?.trim();
    const faceY = 1.5 - (D - 7) / 2; // front face of the block
    if (name || title) {
      const pw = L - 22, ph = HB - 8, pz = 5 + (HB - 5) / 2;
      add('لوحة الاسم', p.plateColor, prism(roundRect(0, pz, pw, ph, 2.2), faceY + 0.01, faceY - 1.2));
      const f = fonts[p.font];
      let text = [];
      const two = name && title;
      if (name) text = union(text, textBox(f, name, { height: ph * (two ? 0.4 : 0.56), maxWidth: pw - 8 * k, cx: 0, cy: two ? pz + ph * 0.2 : pz }).contours);
      if (title) text = union(text, textBox(f, title, { height: ph * (two ? 0.22 : 0.5), maxWidth: pw - 12 * k, cx: 0, cy: two ? pz - ph * 0.28 : pz }).contours);
      if (!text.length) throw new Error('ما قدرنا نرسم الاسم بهالخط');
      add('الاسم', p.textColor, prism(text, faceY - 1.19, faceY - 2.0));
    }

    // ----- the outfit: centred between the tools, a little towards the back -----
    const ox = ((hasL ? zone : 8) - (hasR ? zone : 8)) / 2;
    const oy = 1.5 + Math.max(0, (D - 7 - Dm) / 2 - 3);
    const g = src.clone();
    g.scale(s, s, s);
    g.translate(ox, oy, HB);
    add('اللبس', p.mainColor, g);

    // ----- tools on both sides -----
    for (const [side, key] of [[-1, 'left'], [1, 'right']]) {
      const fn = ACCESSORIES[p[key]];
      if (!fn) continue;
      const x = ox + side * (W / 2 + zone / 2 + 2);
      for (const it of fn().filter((t) => t && t.geometry)) {
        const tg = it.geometry.clone();
        tg.translate(x, 1, HB);
        add(key === 'left' ? 'غرض الشمال' : 'غرض اليمين', it.color === 'b' ? p.accColor2 : p.accColor, tg);
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
