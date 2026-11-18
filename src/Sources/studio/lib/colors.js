// تقليل ألوان الصورة إلى N لون (k-means) وتحويل كل لون إلى مناطق ثنائية الأبعاد
// بنفس إحداثيات traceImage (بكسل، y للأعلى) حتى تنطبق الألوان على الشكل تماماً.
import { contours as d3contours } from 'd3-contour';
import ClipperLib from 'clipper-lib';

const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/**
 * k-means على البكسلات غير الشفافة. يعيد لكل بكسل رقم لونه (-1 للشفاف) ولوحة الألوان مرتّبة حسب المساحة.
 * data: RGBA (Uint8ClampedArray) بعرض w وارتفاع h.
 */
export function quantizePixels(data, w, h, k) {
  const N = w * h;
  const opaque = [];
  for (let i = 0; i < N; i++) if (data[i * 4 + 3] >= 128) opaque.push(i);
  const labels = new Int16Array(N).fill(-1);
  if (!opaque.length) return { labels, palette: [] };
  const step = Math.max(1, Math.floor(opaque.length / 20000));
  const sample = [];
  for (let j = 0; j < opaque.length; j += step) {
    const q = opaque[j] * 4;
    sample.push([data[q], data[q + 1], data[q + 2]]);
  }
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  // بداية حتمية: متوسط الألوان ثم الأبعد فالأبعد (نفس الصورة تعطي نفس النتيجة دائماً)
  const mean = [0, 1, 2].map((c) => sample.reduce((s, p) => s + p[c], 0) / sample.length);
  const centers = [];
  let far = sample.reduce((m, p) => (d2(p, mean) > d2(m, mean) ? p : m), sample[0]);
  centers.push([...far]);
  const best = sample.map((p) => d2(p, centers[0]));
  while (centers.length < k) {
    let bi = 0;
    for (let i = 1; i < sample.length; i++) if (best[i] > best[bi]) bi = i;
    if (best[bi] < 64) break; // لا توجد ألوان مختلفة كفاية
    centers.push([...sample[bi]]);
    for (let i = 0; i < sample.length; i++) best[i] = Math.min(best[i], d2(sample[i], centers[centers.length - 1]));
  }
  const nearest = (p) => {
    let bi = 0, bd = Infinity;
    for (let c = 0; c < centers.length; c++) {
      const v = d2(p, centers[c]);
      if (v < bd) { bd = v; bi = c; }
    }
    return bi;
  };
  for (let it = 0; it < 14; it++) {
    const acc = centers.map(() => [0, 0, 0, 0]);
    for (const p of sample) {
      const a = acc[nearest(p)];
      a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++;
    }
    acc.forEach((a, c) => a[3] && (centers[c] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]));
  }
  for (const i of opaque) labels[i] = nearest([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
  // تنعيم: فلتر الأغلبية 3×3 مرتين لإزالة النقاط المتفرّقة
  for (let pass = 0; pass < 2; pass++) {
    const src = labels.slice();
    const cnt = new Int16Array(centers.length);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (src[i] < 0) continue;
        cnt.fill(0);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = src[i + dy * w + dx]; if (v >= 0) cnt[v]++; }
        let m = src[i];
        for (let c = 0; c < cnt.length; c++) if (cnt[c] > cnt[m]) m = c;
        labels[i] = m;
      }
  }
  // ترتيب اللوحة حسب المساحة (الأكبر أولاً) وحذف الألوان الفارغة
  const area = new Array(centers.length).fill(0);
  for (const i of opaque) area[labels[i]]++;
  const order = centers.map((_, c) => c).filter((c) => area[c] > 0).sort((a, b) => area[b] - area[a]);
  const remap = new Int16Array(centers.length).fill(-1);
  order.forEach((c, j) => (remap[c] = j));
  for (const i of opaque) labels[i] = remap[labels[i]];
  return { labels, palette: order.map((c) => hex(centers[c])) };
}

/** حدود كل لون بنفس نظام traceImage: x - pad ، h - (y - pad) */
export function labelContours(labels, w, h, n) {
  const pad = 2;
  const W = w + 2 * pad, H = h + 2 * pad;
  const C = ClipperLib;
  const S = 100;
  const out = [];
  for (let j = 0; j < n; j++) {
    const values = new Float64Array(W * H);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (labels[y * w + x] === j) values[(y + pad) * W + x + pad] = 1;
    const mp = d3contours().size([W, H]).thresholds([0.5])(values)[0];
    const rings = [];
    for (const poly of mp.coordinates) for (const ring of poly) rings.push(ring.map(([x, y]) => [x - pad, h - (y - pad)]));
    const paths = rings.map((r) => r.map(([x, y]) => ({ X: Math.round(x * S), Y: Math.round(y * S) })));
    const cl = new C.Clipper();
    cl.AddPaths(C.Clipper.CleanPolygons(paths, 0.3 * S), C.PolyType.ptSubject, true);
    const res = new C.Paths();
    cl.Execute(C.ClipType.ctUnion, res, C.PolyFillType.pftEvenOdd, C.PolyFillType.pftEvenOdd);
    out.push(res.filter((p) => Math.abs(C.Clipper.Area(p)) > 3 * S * S).map((p) => p.map((pt) => [pt.X / S, pt.Y / S])));
  }
  return out;
}

/**
 * قناع الشكل: إن كانت للصورة خلفية شفافة نعتمد الشفافية، وإلا نزيل الخلفية بالتعبئة من الحواف
 * (كل بكسل متصل بالحافة ولونه قريب من لون الحافة التي بدأ منها = خلفية). 1 = شكل.
 */
export function shapeMask(data, w, h, tol = 40) {
  const N = w * h;
  const mask = new Uint8Array(N);
  let transparent = 0;
  for (let i = 0; i < N; i++) if (data[i * 4 + 3] < 128) transparent++;
  if (transparent > N * 0.05) {
    for (let i = 0; i < N; i++) mask[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
    return mask;
  }
  const seen = new Uint8Array(N);
  const queue = new Int32Array(N);
  const ref = new Int32Array(N);
  let head = 0, tail = 0;
  const t2 = tol * tol * 3;
  const col = (i) => (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2];
  const push = (i, rgb) => {
    if (seen[i]) return;
    const k = i * 4;
    if (data[k + 3] >= 128) {
      const dr = data[k] - ((rgb >> 16) & 255), dg = data[k + 1] - ((rgb >> 8) & 255), db = data[k + 2] - (rgb & 255);
      if (dr * dr + dg * dg + db * db > t2) return;
    }
    seen[i] = 1;
    queue[tail] = i;
    ref[tail++] = rgb;
  };
  for (let x = 0; x < w; x++) { push(x, col(x)); push((h - 1) * w + x, col((h - 1) * w + x)); }
  for (let y = 0; y < h; y++) { push(y * w, col(y * w)); push(y * w + w - 1, col(y * w + w - 1)); }
  while (head < tail) {
    const i = queue[head], rgb = ref[head++];
    const x = i % w, y = (i - x) / w;
    if (x > 0) push(i - 1, rgb);
    if (x < w - 1) push(i + 1, rgb);
    if (y > 0) push(i - w, rgb);
    if (y < h - 1) push(i + w, rgb);
  }
  for (let i = 0; i < N; i++) mask[i] = seen[i] ? 0 : 1;
  return mask;
}

const cache = new Map();

/**
 * في المتصفح: من صورة (dataURL) إلى { contours: الشكل، palette، regions: مناطق كل لون }.
 * الخلفية لا تُحسب لوناً.
 */
export async function imageShape(src, { tol = 40, colors = 0 } = {}) {
  const key = `${tol}|${colors}|${src}`;
  if (cache.has(key)) return cache.get(key);
  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('تعذّر قراءة الصورة'));
    im.src = src;
  });
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = new Uint8ClampedArray(ctx.getImageData(0, 0, w, h).data);
  const mask = shapeMask(data, w, h, tol);
  const lab = new Int16Array(w * h).map((_, i) => (mask[i] ? 0 : -1));
  const contours = labelContours(lab, w, h, 1)[0];
  let palette = [], regions = [];
  if (colors > 0) {
    for (let i = 0; i < w * h; i++) data[i * 4 + 3] = mask[i] ? 255 : 0;
    const q = quantizePixels(data, w, h, colors);
    palette = q.palette;
    regions = labelContours(q.labels, w, h, palette.length);
  }
  const result = { contours, palette, regions };
  cache.set(key, result);
  return result;
}
