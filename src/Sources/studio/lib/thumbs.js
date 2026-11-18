// صور مصغّرة حقيقية لكل أداة تُرسم مرة واحدة بمُعالج WebGL مشترك
import * as THREE from 'three';
import { loadFonts } from './fonts.js';
import { defaults } from '../tools/index.js';

let renderer;
const cache = new Map();

export async function thumbnail(tool, w = 480, h = 360) {
  if (cache.has(tool.id)) return cache.get(tool.id);
  const p = defaults(tool);
  const fonts = await loadFonts(tool.fonts(p));
  const parts = await tool.build(p, fonts);
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  }
  renderer.setSize(w, h, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#aab2c0', 1.5));
  const d = new THREE.DirectionalLight('#ffffff', 2.4);
  d.position.set(60, -80, 140);
  scene.add(d);
  const group = new THREE.Group();
  const box = new THREE.Box3();
  for (const part of parts) {
    part.geometry.computeBoundingBox();
    box.union(part.geometry.boundingBox);
    group.add(new THREE.Mesh(part.geometry, new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.5 })));
  }
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  group.position.set(-c.x, -c.y, -box.min.z);
  scene.add(group);
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 5000);
  cam.up.set(0, 0, 1);
  const r = Math.max(size.x / (w / h), size.y, size.z * 2) * 1.35;
  cam.position.set(r * 0.25, -r * 1.55, r * 1.45);
  cam.lookAt(0, 0, size.z / 2);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL('image/png');
  cache.set(tool.id, url);
  return url;
}
