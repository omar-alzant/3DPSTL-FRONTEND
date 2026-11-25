// Uploaded 3D files (STL / OBJ / 3MF) for tools like the mold maker.
// The file itself stays in this browser (memory + IndexedDB, so it survives a login redirect);
// the design settings only keep a short reference: "idb:<hash>:<file name>".

const DB = 'studio-models';
const STORE = 'files';
const mem = new Map(); // hash -> { buffer, name }

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req?.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function hashOf(buffer) {
  try {
    const d = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // no crypto.subtle (plain http): a simple fingerprint
    const a = new Uint8Array(buffer);
    let h = 2166136261;
    const step = Math.max(1, Math.floor(a.length / 200000));
    for (let i = 0; i < a.length; i += step) h = Math.imul(h ^ a[i], 16777619);
    return `${(h >>> 0).toString(16)}${a.length.toString(16)}`;
  }
}

export const parseRef = (ref) => {
  const m = /^idb:([0-9a-f]+):(.*)$/.exec(ref || '');
  return m ? { hash: m[1], name: m[2] } : null;
};

/** keeps the file and returns its reference for the design settings */
export async function putModel(buffer, name) {
  const hash = await hashOf(buffer);
  const clean = String(name || 'model').replace(/[:\n\r]/g, ' ').slice(0, 80);
  mem.set(hash, { buffer, name: clean });
  try {
    await idb('readwrite', (s) => {
      s.clear(); // keep only the latest upload, files can be large
      return s.put({ buffer, name: clean, at: Date.now() }, hash);
    });
  } catch { /* private mode: memory only */ }
  return `idb:${hash}:${clean}`;
}

/** the file for a reference, or null when this browser doesn't have it (e.g. a shared design link) */
export async function getModel(ref) {
  const r = parseRef(ref);
  if (!r) return null;
  if (mem.has(r.hash)) return mem.get(r.hash);
  try {
    const v = await idb('readonly', (s) => s.get(r.hash));
    if (v?.buffer) {
      mem.set(r.hash, { buffer: v.buffer, name: v.name });
      return mem.get(r.hash);
    }
  } catch { /* ignore */ }
  return null;
}
