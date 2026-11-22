/* eslint-disable no-restricted-globals */
// Runs the cut off the main thread so the page stays smooth on big models.
import { THREE } from '../lib/geo.js';
import { splitGeometry } from './engine.js';

self.onmessage = (e) => {
  const { id, positions, opts } = e.data;
  try {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const r = splitGeometry(g, opts);
    if (r.error) {
      self.postMessage({ id, error: r.error });
      return;
    }
    const piece = r.piece.attributes.position.array;
    const rest = r.rest.attributes.position.array;
    self.postMessage({ id, piece, rest }, [piece.buffer, rest.buffer]);
  } catch (err) {
    self.postMessage({ id, error: 'failed', message: String(err?.message || err) });
  }
};
