// Read an STL or 3MF the customer uploads → parts [{ name, color, geometry }] sitting on the bed.
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { THREE, clean } from '../lib/geo.js';

export const MAX_BYTES = 120 * 1024 * 1024;

export async function fileHash(buffer) {
  try {
    const h = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `${buffer.byteLength}`;
  }
}

const hex = (c) => '#' + c.getHexString();

/** drop zero-area triangles (common in STL exports and after cuts): they have no normal and render as dark specks */
export function dropDegenerate(g) {
  const a = g.attributes.position.array;
  const keep = new Float32Array(a.length);
  let n = 0;
  for (let i = 0; i < a.length; i += 9) {
    const ux = a[i + 3] - a[i], uy = a[i + 4] - a[i + 1], uz = a[i + 5] - a[i + 2];
    const vx = a[i + 6] - a[i], vy = a[i + 7] - a[i + 1], vz = a[i + 8] - a[i + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * cx + cy * cy + cz * cz < 1e-12) continue;
    for (let k = 0; k < 9; k++) keep[n + k] = a[i + k];
    n += 9;
  }
  if (n === a.length) return g;
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(keep.slice(0, n), 3));
  out.computeVertexNormals();
  return out;
}

export async function loadModelFile(file) {
  const buffer = await file.arrayBuffer();
  const name = file.name.replace(/\.(stl|3mf)$/i, '');
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  let parts = [];
  if (ext === 'stl') {
    const g = new STLLoader().parse(buffer);
    parts = [{ name, color: null, geometry: dropDegenerate(clean(g)) }];
  } else if (ext === '3mf') {
    const group = new ThreeMFLoader().parse(buffer);
    group.updateMatrixWorld(true);
    group.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      const g = o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      parts.push({ name: o.name || name, color: m?.color ? hex(m.color) : null, geometry: dropDegenerate(clean(g)) });
    });
  } else {
    throw new Error('type');
  }
  parts = parts.filter((p) => p.geometry.attributes.position.count >= 12);
  if (!parts.length) throw new Error('empty');

  // sit it on the bed, centred
  const box = new THREE.Box3();
  for (const p of parts) { p.geometry.computeBoundingBox(); box.union(p.geometry.boundingBox); }
  const c = box.getCenter(new THREE.Vector3());
  for (const p of parts) {
    p.geometry.translate(-c.x, -c.y, -box.min.z);
    p.geometry.computeVertexNormals();
  }
  const triangles = parts.reduce((s, p) => s + p.geometry.attributes.position.count / 3, 0);
  return { name, parts, triangles, hash: await fileHash(buffer), size: box.getSize(new THREE.Vector3()) };
}
