// Sample pictures, used until the customer uploads their own, so photo tools never open on an error.
// Also: Arabic typed with an English-only font is drawn with an Arabic font instead of failing.
//   'photo'   → a little landscape (lithophane, lampshade, puzzle…)
//   'drawing' → a bold heart on white (cookie cutter, flexi toy, clicker, logos…)
import { FONTS } from './fonts.js';

const cache = {};
const AR = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
export const AR_FALLBACK = 'cairo-black';

function draw(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'));
  return c.toDataURL('image/png');
}

export function sampleImage(kind = 'photo') {
  if (cache[kind]) return cache[kind];
  cache[kind] = kind === 'drawing'
    ? draw(500, 500, (g) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 500, 500);
      g.fillStyle = '#111111';
      g.beginPath();
      g.moveTo(250, 430);
      g.bezierCurveTo(60, 300, 40, 160, 140, 110);
      g.bezierCurveTo(200, 80, 240, 120, 250, 160);
      g.bezierCurveTo(260, 120, 300, 80, 360, 110);
      g.bezierCurveTo(460, 160, 440, 300, 250, 430);
      g.fill();
    })
    : draw(600, 400, (g) => {
      const sky = g.createLinearGradient(0, 0, 0, 400);
      sky.addColorStop(0, '#f4f1ff'); sky.addColorStop(1, '#b9a9ff');
      g.fillStyle = sky; g.fillRect(0, 0, 600, 400);
      g.fillStyle = '#ffb02e'; g.beginPath(); g.arc(420, 140, 62, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#6a4dff';
      g.beginPath(); g.moveTo(0, 400); g.lineTo(0, 260); g.quadraticCurveTo(150, 150, 300, 270); g.quadraticCurveTo(450, 380, 600, 230); g.lineTo(600, 400); g.fill();
      g.fillStyle = '#1b1846';
      g.beginPath(); g.moveTo(0, 400); g.lineTo(0, 330); g.quadraticCurveTo(200, 250, 360, 340); g.quadraticCurveTo(480, 400, 600, 320); g.lineTo(600, 400); g.fill();
    });
  return cache[kind];
}

/** the settings to build with: every visible, empty picture gets its sample */
export function withSamples(tool, params) {
  let out = params;
  for (const def of tool.params) {
    if (def.type !== 'image' || def.samplePic === false || params[def.key]) continue;
    if (def.show && !def.show(params)) continue;
    if (out === params) out = { ...params };
    out[def.key] = sampleImage(def.samplePic || 'photo');
  }
  return out;
}

/** fonts that can't write the Arabic typed in their text fields → an Arabic font (returns the keys changed) */
export function arabicFallback(tool, params) {
  let out = params;
  const swapped = [];
  const firstText = tool.params.find((d) => d.type === 'text')?.key;
  for (const def of tool.params) {
    if (def.type !== 'font') continue;
    const font = FONTS.find((f) => f.id === params[def.key]);
    if (!font || font.script !== 'en') continue;
    const keys = Array.isArray(def.sample) ? def.sample : [firstText].filter(Boolean);
    if (!keys.some((k) => AR.test(String(params[k] || '')))) continue;
    if (out === params) out = { ...params };
    out[def.key] = AR_FALLBACK;
    swapped.push(def.key);
  }
  return { params: out, swapped };
}

/** everything the build needs: sample pictures + Arabic font fallback */
export function forBuild(tool, params) {
  return arabicFallback(tool, withSamples(tool, params));
}

