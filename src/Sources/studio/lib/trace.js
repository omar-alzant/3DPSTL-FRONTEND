// تحويل صورة شعار (PNG/JPG/SVG) إلى حدود ثنائية الأبعاد قابلة للبثق
import { contours as d3contours } from 'd3-contour';
import ClipperLib from 'clipper-lib';

const MAX = 256; // دقة التتبّع بالبكسل

/** تصغير الصورة المرفوعة وتحويلها إلى PNG خفيف (لتخزينه مع الطلب) */
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, MAX / Math.max(img.naturalWidth || MAX, img.naturalHeight || MAX));
      const w = Math.max(1, Math.round((img.naturalWidth || MAX) * s));
      const h = Math.max(1, Math.round((img.naturalHeight || MAX) * s));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('تعذّر قراءة الصورة'));
    img.src = url;
  });
}

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('تعذّر قراءة الصورة'));
    img.src = src;
  });

const cache = new Map();

/**
 * يعيد كونتورات الشعار بوحدات البكسل (y للأعلى) مع أبعاده.
 * الأجزاء الداكنة (أو غير الشفافة) تصبح صلبة؛ invert يعكس ذلك.
 */
export async function traceImage(src, { threshold = 50, invert = false } = {}) {
  const key = `${threshold}|${invert}|${src}`;
  if (cache.has(key)) return cache.get(key);
  const img = await loadImage(src);
  const w = img.naturalWidth, h = img.naturalHeight;
  const pad = 2;
  const W = w + 2 * pad, H = h + 2 * pad;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  // هل للصورة خلفية شفافة؟ عندها نعتمد الشفافية بدل اللون
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 128) transparent++;
  const useAlpha = transparent > (w * h) * 0.05;
  const t = (threshold / 100) * 255;
  const values = new Float64Array(W * H);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      let solid = useAlpha ? a >= 128 && (invert ? lum >= t : true) : invert ? lum >= t : lum < t;
      if (useAlpha && invert) solid = a >= 128 && lum >= t;
      values[(y + pad) * W + x + pad] = solid ? 1 : 0;
    }
  const mp = d3contours().size([W, H]).thresholds([0.5])(values)[0];
  const rings = [];
  for (const poly of mp.coordinates) for (const ring of poly) rings.push(ring.map(([x, y]) => [x - pad, h - (y - pad)]));
  // تنعيم بسيط لحواف البكسل وحذف الفتات
  const S = 100;
  const paths = rings.map((r) => r.map(([x, y]) => ({ X: Math.round(x * S), Y: Math.round(y * S) })));
  const C = ClipperLib;
  const cl = new C.Clipper();
  cl.AddPaths(C.Clipper.CleanPolygons(paths, 0.3 * S), C.PolyType.ptSubject, true);
  const out = new C.Paths();
  cl.Execute(C.ClipType.ctUnion, out, C.PolyFillType.pftEvenOdd, C.PolyFillType.pftEvenOdd);
  const result = {
    contours: out.filter((p) => Math.abs(C.Clipper.Area(p)) > 4 * S * S).map((p) => p.map((pt) => [pt.X / S, pt.Y / S])),
    width: w,
    height: h,
  };
  cache.set(key, result);
  return result;
}
