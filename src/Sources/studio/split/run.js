// Run a cut in a Web Worker (falls back to the main thread if workers are not available).
import { THREE } from '../lib/geo.js';
import { splitGeometry } from './engine.js';
import { dropDegenerate } from './load.js';

let worker = null;
let seq = 0;
const waiting = new Map();

function getWorker() {
  if (worker !== null) return worker;
  try {
    worker = new Worker(new URL('./split.worker.js', import.meta.url));
    worker.onmessage = (e) => {
      const w = waiting.get(e.data.id);
      if (w) { waiting.delete(e.data.id); w(e.data); }
    };
    worker.onerror = (ev) => {
      console.warn('[split] worker error', ev?.message || ev);
      for (const w of waiting.values()) w({ error: 'failed' });
      waiting.clear();
      worker.terminate();
      worker = false;
    };
  } catch {
    worker = false;
  }
  return worker;
}

const toGeometry = (arr) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  g.computeVertexNormals();
  return dropDegenerate(g);
};

/** → { piece: BufferGeometry, rest: BufferGeometry } or { error } */
export async function runSplit(geometry, opts) {
  const w = getWorker();
  if (!w) {
    await new Promise((r) => setTimeout(r, 30)); // let the "working…" badge paint first
    const r = splitGeometry(geometry, opts);
    return r.error ? r : { piece: dropDegenerate(r.piece), rest: dropDegenerate(r.rest) };
  }
  const id = ++seq;
  const positions = geometry.attributes.position.array.slice(); // the original stays for undo
  const res = await new Promise((resolve) => {
    waiting.set(id, resolve);
    w.postMessage({ id, positions, opts }, [positions.buffer]);
  });
  if (res.error) {
    if (res.message) console.warn('[split]', res.message);
    return res;
  }
  return { piece: toGeometry(res.piece), rest: toGeometry(res.rest) };
}
