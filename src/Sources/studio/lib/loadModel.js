// Reads an uploaded 3D file (STL, OBJ or 3MF) into one triangle mesh,
// lowers very detailed files to a size the browser can cut quickly, and reports holes in the mesh.
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from 'three/examples/jsm/libs/meshopt_simplifier.module.js';

export const MAX_TRIS = 60000; // above this the file is simplified (the mold is still accurate to a fraction of a mm)
export const MODEL_EXT = ['stl', 'obj', '3mf'];

const extOf = (name) => (String(name).split('.').pop() || '').toLowerCase();

function onlyPositions(g) {
  const out = g.index ? g.toNonIndexed() : g.clone();
  for (const k of Object.keys(out.attributes)) if (k !== 'position') out.deleteAttribute(k);
  out.clearGroups();
  return out;
}

function fromObject(obj) {
  obj.updateMatrixWorld(true);
  const list = [];
  obj.traverse((m) => {
    if (m.isMesh && m.geometry?.attributes?.position) {
      const g = onlyPositions(m.geometry);
      g.applyMatrix4(m.matrixWorld);
      list.push(g);
    }
  });
  if (!list.length) return null;
  return list.length === 1 ? list[0] : mergeGeometries(list, false);
}

/** ArrayBuffer + file name → a non-indexed BufferGeometry (positions only) */
export function parseModel(buffer, name) {
  const ext = extOf(name);
  let g = null;
  if (ext === 'stl') g = onlyPositions(new STLLoader().parse(buffer));
  else if (ext === 'obj') g = fromObject(new OBJLoader().parse(new TextDecoder().decode(buffer)));
  else if (ext === '3mf') g = fromObject(new ThreeMFLoader().parse(buffer));
  else throw new Error('badType');
  if (!g || !g.attributes.position.count) throw new Error('emptyModel');
  return g;
}

/** counts edges that belong to one triangle only (holes in the surface) */
function openEdges(indices) {
  const seen = new Map();
  const n = indices.length;
  for (let i = 0; i < n; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = indices[i + k];
      const b = indices[i + ((k + 1) % 3)];
      const key = a < b ? a * 4294967296 + b : b * 4294967296 + a;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
  }
  let open = 0;
  seen.forEach((c) => { if (c === 1) open++; });
  return open;
}

/**
 * Prepares a parsed mesh: welds it, simplifies it when it has more than MAX_TRIS triangles.
 * Returns { geometry (non-indexed), tris, original, open }
 */
export async function prepareModel(g) {
  const welded = mergeVertices(onlyPositions(g), 1e-4);
  const pos = welded.attributes.position.array;
  let idx = welded.index ? Uint32Array.from(welded.index.array) : Uint32Array.from({ length: pos.length / 3 }, (_, i) => i);
  const original = idx.length / 3;
  if (original > MAX_TRIS) {
    await MeshoptSimplifier.ready;
    const [out] = MeshoptSimplifier.simplify(idx, Float32Array.from(pos), 3, MAX_TRIS * 3, 0.01, []);
    if (out?.length) idx = out;
  }
  const open = openEdges(idx);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(pos), 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  const flat = geo.toNonIndexed();
  flat.computeVertexNormals();
  return { geometry: flat, tris: idx.length / 3, original, open };
}

const cache = new Map(); // ref -> Promise<prepared>

/** cached: ref + loader of the raw file → prepared mesh */
export function loadPrepared(ref, getFile) {
  if (!cache.has(ref)) {
    cache.set(ref, (async () => {
      const f = await getFile(ref);
      if (!f) throw new Error('missingModel');
      return prepareModel(parseModel(f.buffer, f.name));
    })());
    cache.get(ref).catch(() => cache.delete(ref));
  }
  return cache.get(ref);
}
