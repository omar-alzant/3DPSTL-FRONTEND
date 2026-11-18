// عمليات المضلّعات (Clipper) وبناء المجسّمات (Extrude + CSG)
import ClipperLib from 'clipper-lib';
import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION, ADDITION, INTERSECTION } from 'three-bvh-csg';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const S = 1000; // دقة Clipper (ميكرون)
const C = ClipperLib;

const toPaths = (contours) => contours.map((c) => c.map(([x, y]) => ({ X: Math.round(x * S), Y: Math.round(y * S) })));
const fromPaths = (paths) => paths.map((p) => p.map((pt) => [pt.X / S, pt.Y / S]));

/** شكل ثنائي الأبعاد = قائمة كونتورات (خارجية وثقوب) بقاعدة non-zero */
export function union(...sets) {
  const c = new C.Clipper();
  for (const s of sets) if (s?.length) c.AddPaths(toPaths(s), C.PolyType.ptSubject, true);
  const out = new C.Paths();
  c.Execute(C.ClipType.ctUnion, out, C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
  return fromPaths(out);
}

export function difference(a, ...bs) {
  const c = new C.Clipper();
  c.AddPaths(toPaths(a), C.PolyType.ptSubject, true);
  for (const b of bs) if (b?.length) c.AddPaths(toPaths(b), C.PolyType.ptClip, true);
  const out = new C.Paths();
  c.Execute(C.ClipType.ctDifference, out, C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
  return fromPaths(out);
}

export function intersection(a, b) {
  const c = new C.Clipper();
  c.AddPaths(toPaths(a), C.PolyType.ptSubject, true);
  c.AddPaths(toPaths(b), C.PolyType.ptClip, true);
  const out = new C.Paths();
  c.Execute(C.ClipType.ctIntersection, out, C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
  return fromPaths(out);
}

/** إزاحة (تكبير/تصغير) الحدود بزوايا دائرية */
export function offset(contours, delta) {
  if (!contours.length) return [];
  const co = new C.ClipperOffset(2, 0.02 * S);
  co.AddPaths(toPaths(union(contours)), C.JoinType.jtRound, C.EndType.etClosedPolygon);
  const out = new C.Paths();
  co.Execute(out, delta * S);
  return fromPaths(C.Clipper.CleanPolygons(out, 0.01 * S));
}

export function circle(cx, cy, r, seg = 48) {
  const pts = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return [pts];
}

export function roundRect(cx, cy, w, h, r = 0, seg = 8) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  const x0 = cx - w / 2, y0 = cy - h / 2, x1 = cx + w / 2, y1 = cy + h / 2;
  if (r === 0) return [[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]];
  const pts = [];
  const corner = (ccx, ccy, a0) => {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push([ccx + Math.cos(a) * r, ccy + Math.sin(a) * r]);
    }
  };
  corner(x1 - r, y0 + r, -Math.PI / 2);
  corner(x1 - r, y1 - r, 0);
  corner(x0 + r, y1 - r, Math.PI / 2);
  corner(x0 + r, y0 + r, Math.PI);
  return [pts];
}

/** إطار مستطيل (حلقة) بعرض w */
export function frame(cx, cy, w, h, r, width) {
  return difference(roundRect(cx, cy, w, h, r), roundRect(cx, cy, w - 2 * width, h - 2 * width, Math.max(0, r - width)));
}

export function bounds2(contours) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of contours) for (const [x, y] of c) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0, cx: 0, cy: 0 };
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

const area = (c) => {
  let a = 0;
  for (let i = 0, j = c.length - 1; i < c.length; j = i++) a += (c[j][0] + c[i][0]) * (c[j][1] - c[i][1]);
  return a / 2;
};

/** تحويل الكونتورات إلى THREE.Shape مع ربط كل ثقب بالشكل الخارجي الذي يحتويه */
export function toShapes(contours) {
  const c = new C.Clipper();
  c.AddPaths(toPaths(contours), C.PolyType.ptSubject, true);
  const tree = new C.PolyTree();
  c.Execute(C.ClipType.ctUnion, tree, C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
  const shapes = [];
  const v2 = (p) => p.map((pt) => new THREE.Vector2(pt.X / S, pt.Y / S));
  const walk = (node) => {
    for (const child of node.Childs()) {
      if (!child.IsHole()) {
        const contour = child.Contour();
        if (contour.length < 3 || Math.abs(area(contour.map((p) => [p.X / S, p.Y / S]))) < 0.01) continue;
        const shape = new THREE.Shape(v2(contour));
        for (const hole of child.Childs()) {
          shape.holes.push(new THREE.Path(v2(hole.Contour())));
          walk(hole);
        }
        shapes.push(shape);
      }
    }
  };
  walk(tree);
  return shapes;
}

/** تقسيم شكل إلى قطع متصلة: كل قطعة = حدّها الخارجي + ثقوبها */
export function components(contours) {
  const c = new C.Clipper();
  c.AddPaths(toPaths(contours), C.PolyType.ptSubject, true);
  const tree = new C.PolyTree();
  c.Execute(C.ClipType.ctUnion, tree, C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
  const out = [];
  const walk = (node) => {
    for (const ch of node.Childs()) {
      if (ch.IsHole()) continue;
      const comp = [ch.Contour()];
      for (const h of ch.Childs()) {
        comp.push(h.Contour());
        walk(h);
      }
      out.push(fromPaths(comp));
    }
  };
  walk(tree);
  return out;
}

/** هل النقطة داخل الشكل؟ (قاعدة زوجي/فردي على كل الحدود) */
export function inside(contours, [x, y]) {
  let c = false;
  for (const ring of contours)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
  return c;
}

/** بثق شكل ثنائي الأبعاد من z0 بسماكة depth */
export function extrude(contours, depth, z0 = 0) {
  const shapes = toShapes(contours);
  if (!shapes.length) return null;
  const g = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, z0);
  return clean(g);
}

export function clean(g) {
  let out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) if (k !== 'position') out.deleteAttribute(k);
  out.clearGroups();
  out.computeVertexNormals();
  return out;
}

const evaluator = new Evaluator();
evaluator.attributes = ['position', 'normal'];
evaluator.useGroups = false;

const brush = (g) => {
  const b = new Brush(g);
  b.updateMatrixWorld();
  return b;
};

export function subtract(g, ...cutters) {
  let res = brush(g);
  for (const cut of cutters.filter(Boolean)) res = evaluator.evaluate(res, brush(cut), SUBTRACTION);
  return clean(res.geometry);
}

export function add(...gs) {
  const list = gs.filter(Boolean);
  let res = brush(list[0]);
  for (const g of list.slice(1)) res = evaluator.evaluate(res, brush(g), ADDITION);
  return clean(res.geometry);
}

/** تقاطع مجسّمين (الجزء المشترك فقط) */
export function intersect(a, b) {
  if (!a || !b) return null;
  const res = evaluator.evaluate(brush(a), brush(b), INTERSECTION);
  const g = clean(res.geometry);
  return g.attributes.position.count ? g : null;
}

export function merge(gs) {
  const list = gs.filter(Boolean).map(clean);
  if (!list.length) return null;
  return mergeGeometries(list, false);
}

/** حجم المجسّم بالمم³ */
export function volume(g) {
  const p = g.attributes.position.array;
  let v = 0;
  for (let i = 0; i < p.length; i += 9) {
    v += (p[i] * (p[i + 4] * p[i + 8] - p[i + 5] * p[i + 7])
      - p[i + 1] * (p[i + 3] * p[i + 8] - p[i + 5] * p[i + 6])
      + p[i + 2] * (p[i + 3] * p[i + 7] - p[i + 4] * p[i + 6])) / 6;
  }
  return Math.abs(v);
}

export { THREE, mergeVertices };
