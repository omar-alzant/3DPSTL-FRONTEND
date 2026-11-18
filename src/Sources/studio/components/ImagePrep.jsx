// نافذة تجهيز الصورة بعد رفعها: إبقاء/إزالة الخلفية، قصّ بنسب جاهزة، وتكبير.
// إزالة الخلفية تتم بالكامل في المتصفح: تعبئة من حواف الصورة للألوان القريبة من لون الخلفية
// (مناسبة للرسومات والصور ذات الخلفية السادة). الناتج PNG بخلفية شفافة.
import { useEffect, useRef, useState } from 'react';

const WORK = 900; // أقصى دقة للعمل داخل النافذة
const BOX = 420; // حجم مساحة العرض

const RATIOS = [
  { id: 'free', label: 'حر', r: null },
  { id: '1:1', label: '1:1', r: 1 },
  { id: '4:3', label: '4:3', r: 4 / 3 },
  { id: '3:2', label: '3:2', r: 3 / 2 },
  { id: '16:9', label: '16:9', r: 16 / 9 },
];

const loadImg = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('تعذّر قراءة الصورة'));
    img.src = src;
  });

/** إزالة الخلفية: تعبئة من كل بكسل على الحافة، وكل بكسل يُقارن بلون البكسل الذي بدأت منه التعبئة */
function removeBackground(src, tol) {
  const { width: w, height: h } = src;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  const ref = new Int32Array(w * h); // لون البداية لكل بكسل في الطابور
  let head = 0, tail = 0;
  const t2 = tol * tol * 3;
  const push = (i, rgb) => {
    if (seen[i]) return;
    const k = i * 4;
    if (d[k + 3] >= 128) {
      const dr = d[k] - ((rgb >> 16) & 255), dg = d[k + 1] - ((rgb >> 8) & 255), db = d[k + 2] - (rgb & 255);
      if (dr * dr + dg * dg + db * db > t2) return;
    }
    seen[i] = 1;
    queue[tail] = i;
    ref[tail++] = rgb;
  };
  const colorAt = (i) => (d[i * 4] << 16) | (d[i * 4 + 1] << 8) | d[i * 4 + 2];
  for (let x = 0; x < w; x++) {
    push(x, colorAt(x));
    push((h - 1) * w + x, colorAt((h - 1) * w + x));
  }
  for (let y = 0; y < h; y++) {
    push(y * w, colorAt(y * w));
    push(y * w + w - 1, colorAt(y * w + w - 1));
  }
  while (head < tail) {
    const i = queue[head], rgb = ref[head++];
    const x = i % w, y = (i - x) / w;
    if (x > 0) push(i - 1, rgb);
    if (x < w - 1) push(i + 1, rgb);
    if (y > 0) push(i - w, rgb);
    if (y < h - 1) push(i + w, rgb);
  }
  for (let i = 0; i < w * h; i++) if (seen[i]) d[i * 4 + 3] = 0;
  ctx.putImageData(img, 0, 0);
  return out;
}

/** أكبر مستطيل بنسبة r داخل الصورة، متمركز حول مركز القصّ الحالي */
function fitRatio(c, r, W, H) {
  if (!r) return c;
  let w = Math.min(W, H * r), h = w / r;
  const cx = Math.min(Math.max(c.x + c.w / 2, w / 2), W - w / 2);
  const cy = Math.min(Math.max(c.y + c.h / 2, h / 2), H - h / 2);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export default function ImagePrep({ src, maxSize = 256, onCancel, onConfirm }) {
  const [base, setBase] = useState(null); // canvas بدقة العمل
  const [proc, setProc] = useState(null); // بعد إزالة الخلفية
  const [bg, setBg] = useState('keep');
  const [tol, setTol] = useState(40);
  const [ratio, setRatio] = useState('free');
  const [zoom, setZoom] = useState(1);
  const [crop, setCrop] = useState(null);
  const [err, setErr] = useState(null);
  const cv = useRef(null);
  const drag = useRef(null);

  // تحميل الصورة
  useEffect(() => {
    let alive = true;
    loadImg(src)
      .then((img) => {
        if (!alive) return;
        const s = Math.min(1, WORK / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * s));
        c.height = Math.max(1, Math.round(img.naturalHeight * s));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        setBase(c);
        setCrop({ x: 0, y: 0, w: c.width, h: c.height });
      })
      .catch((e) => setErr(e.message));
    return () => {
      alive = false;
    };
  }, [src]);

  // إزالة الخلفية (مع تأخير بسيط أثناء تحريك الحساسية)
  useEffect(() => {
    if (!base) return;
    if (bg === 'keep') return setProc(base);
    const t = setTimeout(() => setProc(removeBackground(base, tol)), 80);
    return () => clearTimeout(t);
  }, [base, bg, tol]);

  const fit = base ? Math.min(BOX / base.width, BOX / base.height) : 1;
  const scale = fit * zoom;

  // رسم الصورة
  useEffect(() => {
    if (!proc || !cv.current) return;
    const c = cv.current;
    c.width = Math.round(proc.width * scale);
    c.height = Math.round(proc.height * scale);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(proc, 0, 0, c.width, c.height);
  }, [proc, scale]);

  const pickRatio = (id) => {
    setRatio(id);
    const r = RATIOS.find((x) => x.id === id).r;
    if (r && base) setCrop((c) => fitRatio(c, r, base.width, base.height));
  };

  const onDown = (e, mode) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { mode, x: e.clientX, y: e.clientY, c: { ...crop } };
  };
  const onMove = (e) => {
    const st = drag.current;
    if (!st || !base) return;
    const W = base.width, H = base.height;
    const dx = (e.clientX - st.x) / scale, dy = (e.clientY - st.y) / scale;
    const r = RATIOS.find((x) => x.id === ratio).r;
    let { x, y, w, h } = st.c;
    const MIN = 12;
    if (st.mode === 'move') {
      x = Math.min(Math.max(0, x + dx), W - w);
      y = Math.min(Math.max(0, y + dy), H - h);
    } else {
      const m = st.mode;
      let x1 = x + w, y1 = y + h;
      if (m.includes('w')) x = Math.min(Math.max(0, x + dx), x1 - MIN);
      if (m.includes('e')) x1 = Math.max(Math.min(W, x1 + dx), x + MIN);
      if (m.includes('n')) y = Math.min(Math.max(0, y + dy), y1 - MIN);
      if (m.includes('s')) y1 = Math.max(Math.min(H, y1 + dy), y + MIN);
      w = x1 - x;
      h = y1 - y;
      if (r) {
        // الحفاظ على النسبة: الحافة المسحوبة تحدّد البعد الآخر، مع البقاء داخل الصورة
        if (m === 'n' || m === 's') w = h * r;
        else h = w / r;
        if (m.includes('w')) x = x1 - w;
        if (m.includes('n')) y = y1 - h;
        if (m === 'n' || m === 's') x = st.c.x + (st.c.w - w) / 2;
        if (m === 'e' || m === 'w') y = st.c.y + (st.c.h - h) / 2;
        if (x < 0 || y < 0 || x + w > W || y + h > H) return; // تجاوز الحدود: نتجاهل هذه الحركة
      }
    }
    setCrop({ x, y, w, h });
  };
  const onUp = () => (drag.current = null);

  const confirm = () => {
    if (!proc || !crop) return;
    const s = Math.min(1, maxSize / Math.max(crop.w, crop.h));
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(crop.w * s));
    out.height = Math.max(1, Math.round(crop.h * s));
    const ctx = out.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(proc, crop.x, crop.y, crop.w, crop.h, 0, 0, out.width, out.height);
    onConfirm(out.toDataURL('image/png'));
  };

  return (
    <div className="sd-modal-bg" onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
      <div className="sd-modal sd-prep" onClick={(e) => e.stopPropagation()}>
        <button className="sd-x" onClick={onCancel} aria-label="إغلاق">×</button>
        <h3>تجهيز الصورة</h3>
        {err && <p className="sd-error">{err}</p>}
        <div className="sd-prep-body">
          <div className="sd-prep-stage">
            <div className="sd-prep-view" style={{ width: BOX, height: BOX }}>
              <div className="sd-prep-canvas" dir="ltr">
                <canvas ref={cv} />
                {crop && (
                  <>
                    <div
                      className="sd-prep-crop"
                      style={{ left: crop.x * scale, top: crop.y * scale, width: crop.w * scale, height: crop.h * scale }}
                      onPointerDown={(e) => onDown(e, 'move')}
                    >
                      {HANDLES.map((hd) => (
                        <span key={hd} className={`sd-h sd-h-${hd}`} onPointerDown={(e) => onDown(e, hd)} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="sd-prep-zoom" dir="ltr">
              <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}>−</button>
              <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(+e.target.value)} />
              <button type="button" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}>+</button>
            </div>
          </div>

          <div className="sd-prep-side">
            <label>الخلفية</label>
            <div className="sd-seg">
              <button type="button" className={bg === 'keep' ? 'on' : ''} onClick={() => setBg('keep')}>إبقاء الخلفية</button>
              <button type="button" className={bg === 'remove' ? 'on' : ''} onClick={() => setBg('remove')}>إزالة الخلفية</button>
            </div>
            {bg === 'remove' && (
              <div className="sd-prep-tol">
                <small>حساسية الإزالة</small>
                <div className="sd-range">
                  <input type="range" min={5} max={120} step={1} value={tol} onChange={(e) => setTol(+e.target.value)} />
                  <span className="sd-unit">{tol}</span>
                </div>
                <small>تعمل أفضل مع الرسومات والصور ذات الخلفية السادة</small>
              </div>
            )}

            <label>نسبة القصّ</label>
            <div className="sd-ratios">
              {RATIOS.map((r) => (
                <button key={r.id} type="button" className={ratio === r.id ? 'on' : ''} onClick={() => pickRatio(r.id)}>
                  <i style={r.r ? { aspectRatio: String(r.r) } : undefined} />
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="sd-row sd-prep-actions">
          <button type="button" className="sd-btn" onClick={onCancel}>إلغاء</button>
          <button type="button" className="sd-btn sd-primary" disabled={!proc} onClick={confirm}>تأكيد</button>
        </div>
      </div>
    </div>
  );
}
