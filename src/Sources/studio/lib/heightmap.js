// Image → brightness grid, and closed meshes built on a grid (lithophanes, lampshades, vases).
import * as THREE from 'three';

const grayCache = new Map();

/** browser: a picture resized to cols × rows, as brightness 0 (black) … 1 (white), row 0 = top of the picture */
export async function loadGray(src, cols, maxRows = 4000) {
  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('تعذّر قراءة الصورة'));
    im.src = src;
  });
  const aspect = img.naturalHeight / img.naturalWidth;
  const rows = Math.max(2, Math.min(maxRows, Math.round(cols * aspect)));
  const key = `${cols}x${rows}|${src}`;
  if (grayCache.has(key)) return grayCache.get(key);
  const c = document.createElement('canvas');
  c.width = cols;
  c.height = rows;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff'; // transparent parts count as white (thin)
  ctx.fillRect(0, 0, cols, rows);
  ctx.drawImage(img, 0, 0, cols, rows);
  const d = ctx.getImageData(0, 0, cols, rows).data;
  const lum = new Float32Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) lum[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
  const out = { cols, rows, lum, aspect };
  grayCache.set(key, out);
  return out;
}

/** brightness → thickness: dark parts thick (block light), bright parts thin */
export function thicknessGrid(gray, minT, maxT, contrast = 1) {
  const { lum } = gray;
  const t = new Float32Array(lum.length);
  for (let i = 0; i < lum.length; i++) {
    const l = Math.min(1, Math.max(0, (lum[i] - 0.5) * contrast + 0.5));
    t[i] = maxT - l * (maxT - minT);
  }
  return t;
}

/**
 * A closed solid on an (nx × ny) grid. For every grid point P(i, j, side) gives the inner (side 0) and
 * outer (side 1) point. wrap = the grid closes around in i (tubes); otherwise the left/right edges get walls.
 * Faces point outwards when the outer surface is on the viewer's side and i runs left→right, j bottom→top.
 */
export function gridSolid(nx, ny, wrap, P) {
  const pos = [];
  const v = (p) => pos.push(p[0], p[1], p[2]);
  const tri = (a, b, c) => { v(a); v(b); v(c); };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const cols = wrap ? nx : nx - 1;
  const I = (i) => (wrap ? i % nx : i);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < ny - 1; j++) {
      const a = I(i), b = I(i + 1);
      quad(P(a, j, 1), P(b, j, 1), P(b, j + 1, 1), P(a, j + 1, 1)); // outer
      quad(P(a, j, 0), P(a, j + 1, 0), P(b, j + 1, 0), P(b, j, 0)); // inner
    }
    const a = I(i), b = I(i + 1);
    quad(P(a, 0, 0), P(b, 0, 0), P(b, 0, 1), P(a, 0, 1)); // bottom edge
    quad(P(a, ny - 1, 0), P(a, ny - 1, 1), P(b, ny - 1, 1), P(b, ny - 1, 0)); // top edge
  }
  if (!wrap) {
    for (let j = 0; j < ny - 1; j++) {
      quad(P(0, j, 0), P(0, j, 1), P(0, j + 1, 1), P(0, j + 1, 0)); // left edge
      quad(P(nx - 1, j, 0), P(nx - 1, j + 1, 0), P(nx - 1, j + 1, 1), P(nx - 1, j, 1)); // right edge
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** a closed solid of revolution-like shape: rings of points (bottom → top), each ring counter-clockwise; capped */
export function ringsSolid(rings) {
  const pos = [];
  const v = (p) => pos.push(p[0], p[1], p[2]);
  const tri = (a, b, c) => { v(a); v(b); v(c); };
  const n = rings[0].length;
  for (let j = 0; j < rings.length - 1; j++) {
    for (let i = 0; i < n; i++) {
      const a = rings[j][i], b = rings[j][(i + 1) % n], c = rings[j + 1][(i + 1) % n], d = rings[j + 1][i];
      tri(a, b, c);
      tri(a, c, d);
    }
  }
  const cap = (ring, up) => {
    const cx = ring.reduce((s, p) => s + p[0], 0) / n, cy = ring.reduce((s, p) => s + p[1], 0) / n;
    const c = [cx, cy, ring[0][2]];
    for (let i = 0; i < n; i++) (up ? tri(c, ring[i], ring[(i + 1) % n]) : tri(c, ring[(i + 1) % n], ring[i]));
  };
  cap(rings[0], false);
  cap(rings[rings.length - 1], true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
