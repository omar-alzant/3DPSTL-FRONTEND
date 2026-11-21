// صور مصغّرة حقيقية لكل أداة تُرسم مرة واحدة بمُعالج WebGL مشترك
import * as THREE from 'three';
import { loadFonts } from './fonts.js';
import { defaults } from '../tools/index.js';

let renderer;
const cache = new Map();
let sample;

/** a small made-up picture (sun over hills) so photo tools can show a preview */
function sampleImage() {
  if (sample) return sample;
  const c = document.createElement('canvas');
  c.width = 600; c.height = 400;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 400);
  sky.addColorStop(0, '#f4f1ff'); sky.addColorStop(1, '#b9a9ff');
  g.fillStyle = sky; g.fillRect(0, 0, 600, 400);
  g.fillStyle = '#ffb02e'; g.beginPath(); g.arc(420, 140, 62, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#6a4dff';
  g.beginPath(); g.moveTo(0, 400); g.lineTo(0, 260); g.quadraticCurveTo(150, 150, 300, 270); g.quadraticCurveTo(450, 380, 600, 230); g.lineTo(600, 400); g.fill();
  g.fillStyle = '#1b1846';
  g.beginPath(); g.moveTo(0, 400); g.lineTo(0, 330); g.quadraticCurveTo(200, 250, 360, 340); g.quadraticCurveTo(480, 400, 600, 320); g.lineTo(600, 400); g.fill();
  sample = c.toDataURL('image/png');
  return sample;
}

export async function thumbnail(tool, w = 480, h = 360) {
  if (cache.has(tool.id)) return cache.get(tool.id);
  let p = defaults(tool);
  let fonts = await loadFonts(tool.fonts(p));
  let parts;
  try {
    parts = await tool.build(p, fonts);
  } catch (err) {
    // photo tools need a picture: use a sample one for the preview
    const img = tool.params.find((q) => q.type === 'image' && !p[q.key]);
    if (!img) throw err;
    p = { ...p, [img.key]: sampleImage() };
    fonts = await loadFonts(tool.fonts(p));
    parts = await tool.build(p, fonts);
  }
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
