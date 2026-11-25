// Admin → "صورة شغلنا": puts up to 3 photos of a piece on a 3DSTL card (logo, frame, name),
// ready to download, share from the phone, or add straight to an item's photos.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import "../Style/WorkCard.css";

const LOGO_SRC = "/logoIco.svg";
const THEMES = {
  navy:   { bg: "#0d0d33", bg2: "#16164a", ink: "#f2f0ff", soft: "#b3a8ff", mark: "#6a4dff", frame: "#6a4dff", inner: "#1e1e5c", layer: "rgba(179,168,255,.07)", sticker: "#6a4dff" },
  light:  { bg: "#f4f2ff", bg2: "#dcd6fb", ink: "#16164a", soft: "#5143dd", mark: "#6a4dff", frame: "#6a4dff", inner: "#e6e2fb", layer: "rgba(81,67,221,.08)", sticker: "#6a4dff" },
  violet: { bg: "#5143dd", bg2: "#6a4dff", ink: "#ffffff", soft: "#e6e1ff", mark: "#ffffff", frame: "#f2f0ff", inner: "#3d33b0", layer: "rgba(255,255,255,.08)", sticker: "#0d0d33" },
};
const SIZES = { square: [1080, 1080], post: [1080, 1350], story: [1080, 1920] };
const LAYOUT = {
  square: { headY: 46, headS: 58, card: [64, 140, 952, 690], t1Y: 912, t1S: 62, t2Y: 972, t2S: 36, footY: 1040 },
  post:   { headY: 56, headS: 64, card: [64, 160, 952, 900], t1Y: 1150, t1S: 68, t2Y: 1218, t2S: 40, footY: 1305 },
  story:  { headY: 150, headS: 80, card: [64, 330, 952, 1140], t1Y: 1600, t1S: 80, t2Y: 1680, t2S: 46, footY: 1840 },
};
const MAX = 3;
const isAr = (s) => /[؀-ۿ]/.test(s);
const fontOf = (w, px, s) => `${w} ${px}px ${isAr(s) ? "'IBM Plex Sans Arabic'" : "'Fredoka'"}, 'IBM Plex Sans Arabic', sans-serif`;

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // photos from the site's storage: needed to save the canvas
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// the frames inside the card for 1, 2 or 3 photos
function slotsFor(n, x, y, w, h) {
  const gap = 14;
  if (n <= 1) return [[x, y, w, h]];
  const tall = h > w * 1.15;
  if (n === 2) {
    if (tall) { const hh = (h - gap) / 2; return [[x, y, w, hh], [x, y + hh + gap, w, hh]]; }
    const ww = (w - gap) / 2; return [[x + ww + gap, y, ww, h], [x, y, ww, h]];
  }
  if (tall) { const big = (h - gap) * 0.6, sm = h - gap - big, ww = (w - gap) / 2; return [[x, y, w, big], [x + ww + gap, y + big + gap, ww, sm], [x, y + big + gap, ww, sm]]; }
  const big = (w - gap) * 0.62, sm = w - gap - big, hh = (h - gap) / 2;
  return [[x + sm + gap, y, big, h], [x, y, sm, hh], [x, y + hh + gap, sm, hh]];
}

export default function WorkCardMaker({ initialPhotos = [], initialTitle = "", initialSub = "", onUse, useLabel }) {
  const { tx } = useLang();
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const slotsRef = useRef([]);
  const dragRef = useRef(null);
  const logoRef = useRef(null);
  const [photos, setPhotos] = useState([]); // { img, url, zoom, px, py }
  const [sel, setSel] = useState(0);
  const [size, setSize] = useState("square");
  const [theme, setTheme] = useState("navy");
  const [title, setTitle] = useState(initialTitle);
  const [sub, setSub] = useState(initialSub);
  const [sticker, setSticker] = useState("من شغلنا");
  const [tick, setTick] = useState(0); // redraw after a photo moves
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // logo + fonts, then the item's own photos
  useEffect(() => {
    let alive = true;
    loadImage(LOGO_SRC).then((img) => { if (alive) { logoRef.current = img; setTick((t) => t + 1); } });
    if (document.fonts) {
      Promise.all(["700 60px 'Fredoka'", "400 60px 'Fredoka'", "600 40px 'IBM Plex Sans Arabic'", "700 40px 'IBM Plex Sans Arabic'"].map((f) => document.fonts.load(f)))
        .catch(() => {}).then(() => alive && setTick((t) => t + 1));
    }
    Promise.all(initialPhotos.slice(0, MAX).map(loadImage)).then((imgs) => {
      if (!alive) return;
      const ok = imgs.filter(Boolean).map((img) => ({ img, url: img.src, zoom: 1, px: 0, py: 0 }));
      if (ok.length) setPhotos(ok);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const g = c.getContext("2d");
    const [W, H] = SIZES[size];
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const T = THEMES[theme], L = LAYOUT[size], logo = logoRef.current;
    const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const fit = (s, w, px, max) => { g.direction = isAr(s) ? "rtl" : "ltr"; g.font = fontOf(w, px, s); let p = px; while (g.measureText(s).width > max && p > 18) { p -= 2; g.font = fontOf(w, p, s); } return p; };

    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, T.bg); grd.addColorStop(1, T.bg2);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = T.layer; for (let y = H * 0.7; y < H; y += 9) g.fillRect(0, y, W, 3); // print layers
    if (logo) { g.globalAlpha = 0.07; g.drawImage(logo, W - 360, H - 430, 460, 499); g.globalAlpha = 1; }

    // header: cube + 3DSTL
    g.direction = "ltr"; g.textBaseline = "alphabetic";
    const hs = L.headS;
    g.font = `700 ${hs}px 'Fredoka', sans-serif`; const wa = g.measureText("3D").width;
    g.font = `400 ${hs}px 'Fredoka', sans-serif`; const wb = g.measureText("STL").width;
    const ic = hs * 1.05, hx = W / 2 - (ic + 14 + wa + wb) / 2, base = L.headY + hs * 0.95;
    if (logo) g.drawImage(logo, hx, L.headY, ic, ic * 1.084);
    g.textAlign = "left"; g.font = `700 ${hs}px 'Fredoka', sans-serif`; g.fillStyle = T.mark; g.fillText("3D", hx + ic + 14, base);
    g.font = `400 ${hs}px 'Fredoka', sans-serif`; g.fillStyle = T.ink; g.fillText("STL", hx + ic + 14 + wa, base);

    // card with the photos
    const [x, y, w, h] = L.card, b = 16, r = 46;
    g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 50; g.shadowOffsetY = 24;
    g.fillStyle = T.frame; rr(x, y, w, h, r); g.fill(); g.restore();
    const slots = slotsFor(photos.length, x + b, y + b, w - 2 * b, h - 2 * b);
    slotsRef.current = slots;
    slots.forEach(([sx, sy, sw, sh], i) => {
      g.save(); rr(sx, sy, sw, sh, slots.length === 1 ? r - b : 22); g.fillStyle = T.inner; g.fill(); g.clip();
      const p = photos[i];
      if (p) {
        const s = Math.max(sw / p.img.width, sh / p.img.height) * p.zoom;
        const dw = p.img.width * s, dh = p.img.height * s;
        g.drawImage(p.img, sx + (sw - dw) / 2 + p.px, sy + (sh - dh) / 2 + p.py, dw, dh);
      } else {
        const t = "حط صورة القطعة هون";
        g.fillStyle = T.soft; g.globalAlpha = 0.7; g.textAlign = "center"; fit(t, 600, 38, sw - 40);
        g.fillText(t, sx + sw / 2, sy + sh / 2); g.globalAlpha = 1;
      }
      g.restore();
    });

    // sticker
    const st = sticker.trim();
    if (st) {
      g.save(); g.translate(x + w - 56, y + 6); g.rotate(-0.09);
      const sp = fit(st, 700, size === "square" ? 36 : 42, 320);
      const tw = g.measureText(st).width + 60, th = sp + 40;
      g.fillStyle = T.sticker; g.shadowColor = "rgba(0,0,0,.3)"; g.shadowBlur = 18; g.shadowOffsetY = 8;
      rr(-tw, -th / 2, tw, th, 16); g.fill(); g.shadowColor = "transparent";
      g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(st, -tw / 2, 2);
      g.restore(); g.textBaseline = "alphabetic";
    }

    // name + the line under it
    g.textAlign = "center";
    const t1 = title.trim(), t2 = sub.trim();
    if (t1) { g.fillStyle = T.ink; fit(t1, 700, L.t1S, W - 140); g.fillText(t1, W / 2, L.t1Y); }
    if (t2) { g.fillStyle = T.soft; fit(t2, 600, L.t2S, W - 160); g.fillText(t2, W / 2, L.t2Y); }
    g.direction = "ltr"; g.font = `400 ${size === "story" ? 34 : 28}px 'Fredoka', sans-serif`; g.fillStyle = T.soft;
    g.fillText("@3dpstl  ·  3dpstl.com", W / 2, L.footY);
  }, [photos, size, theme, title, sub, sticker]);

  useEffect(() => { draw(); }, [draw, tick]);

  const addFiles = (files) => {
    const list = [...(files || [])].filter((f) => f.type?.startsWith("image/")).slice(0, MAX - photos.length);
    list.forEach((f) => {
      const url = URL.createObjectURL(f);
      loadImage(url).then((img) => {
        if (!img) return;
        setPhotos((ps) => (ps.length >= MAX ? ps : [...ps, { img, url, zoom: 1, px: 0, py: 0 }]));
        setSel(Math.min(MAX - 1, photos.length));
      });
    });
  };

  const current = photos[sel];
  const setZoom = (z) => { if (current) { current.zoom = z; setTick((t) => t + 1); } };
  const reset = () => { if (current) { current.zoom = 1; current.px = 0; current.py = 0; setTick((t) => t + 1); } };
  const remove = (i) => { setPhotos((ps) => ps.filter((_, k) => k !== i)); setSel(0); };

  // drag a photo inside its frame (mouse or finger)
  const toCanvas = (e) => { const c = canvasRef.current, r = c.getBoundingClientRect(), k = c.width / r.width; return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; };
  const onDown = (e) => {
    const [cx, cy] = toCanvas(e);
    const i = slotsRef.current.findIndex(([x, y, w, h]) => cx >= x && cx <= x + w && cy >= y && cy <= y + h);
    if (i < 0 || !photos[i]) return;
    setSel(i);
    dragRef.current = { x: e.clientX, y: e.clientY, p: photos[i] };
    canvasRef.current.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const c = canvasRef.current, k = c.width / c.getBoundingClientRect().width;
    d.p.px += (e.clientX - d.x) * k; d.p.py += (e.clientY - d.y) * k; d.x = e.clientX; d.y = e.clientY;
    setTick((t) => t + 1);
  };
  const onUp = () => { dragRef.current = null; };

  const fileName = () => `3dstl-${(title.trim() || "work").replace(/[^\p{L}\p{N}]+/gu, "-")}.jpg`;
  const toBlob = () => new Promise((res) => canvasRef.current.toBlob(res, "image/jpeg", 0.9));

  const download = async () => {
    try {
      const b = await toBlob();
      const a = document.createElement("a");
      a.download = fileName(); a.href = URL.createObjectURL(b); a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch { setMsg(tx("Couldn't save the picture (a photo from another site blocks it).", "ما قدرنا نحفظ الصورة (في صورة من موقع تاني مانعة).")); }
  };
  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  const share = async () => {
    try {
      const b = await toBlob();
      const file = new File([b], fileName(), { type: "image/jpeg" });
      if (navigator.canShare && !navigator.canShare({ files: [file] })) return download();
      await navigator.share({ files: [file], title: title.trim() || "3DSTL" });
    } catch (e) { if (e?.name !== "AbortError") download(); }
  };
  const use = async () => {
    if (!onUse) return;
    setBusy(true);
    try { onUse(canvasRef.current.toDataURL("image/jpeg", 0.9)); }
    catch { setMsg(tx("Couldn't use the picture (a photo from another site blocks it).", "ما قدرنا نستعمل الصورة (في صورة من موقع تاني مانعة).")); }
    finally { setBusy(false); }
  };

  return (
    <div className="wc">
      <div className="wc-stage">
        <canvas
          ref={canvasRef}
          dir="ltr"
          width="1080"
          height="1080"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          aria-label={tx("Preview", "المعاينة")}
        />
        <small>{tx("Drag a photo inside its frame to move it.", "اسحب أي صورة جوّا إطارها لتحرّكها.")}</small>
      </div>

      <div className="wc-panel">
        <section>
          <h3>{tx("Photos (up to 3)", "الصور (لحد 3)")}</h3>
          <div className="wc-thumbs">
            {photos.map((p, i) => (
              <div key={p.url + i} className={`wc-thumb${i === sel ? " on" : ""}`}>
                <button type="button" onClick={() => setSel(i)} style={{ backgroundImage: `url(${p.url})` }} aria-label={`${tx("Photo", "الصورة")} ${i + 1}`} />
                <button type="button" className="wc-x" onClick={() => remove(i)} aria-label={tx("Remove photo", "شيل الصورة")}>×</button>
              </div>
            ))}
            {photos.length < MAX && (
              <button type="button" className="wc-add" onClick={() => fileRef.current?.click()}>+ {tx("Add", "زيد")}</button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          {current && (
            <>
              <label className="wc-label">
                {tx("Zoom the chosen photo", "كبّر الصورة المختارة")}
                <input type="range" min="1" max="3" step="0.01" value={current.zoom} onChange={(e) => setZoom(Number(e.target.value))} />
              </label>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={reset}>{tx("Put it back", "رجّعها لمحلها")}</button>
            </>
          )}
        </section>

        <section>
          <h3>{tx("Text", "الكتابة")}</h3>
          <label className="wc-label">{tx("Piece name", "اسم القطعة")}<input className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="wc-label">{tx("Line under the name (optional)", "سطر تحت الاسم (اختياري)")}<input className="form-control" value={sub} onChange={(e) => setSub(e.target.value)} /></label>
          <label className="wc-label">{tx("Sticker (optional)", "الملصق (اختياري)")}<input className="form-control" value={sticker} onChange={(e) => setSticker(e.target.value)} /></label>
        </section>

        <section>
          <h3>{tx("Look", "الشكل")}</h3>
          <div className="wc-seg">
            {[["square", tx("Square", "مربّع")], ["post", tx("Post 4:5", "بوست 4:5")], ["story", tx("Story", "ستوري")]].map(([v, l]) => (
              <button key={v} type="button" className={size === v ? "on" : ""} aria-pressed={size === v} onClick={() => setSize(v)}>{l}</button>
            ))}
          </div>
          <div className="wc-seg">
            {[["navy", tx("Navy", "كحلي")], ["light", tx("Light", "فاتح")], ["violet", tx("Violet", "بنفسجي")]].map(([v, l]) => (
              <button key={v} type="button" className={theme === v ? "on" : ""} aria-pressed={theme === v} onClick={() => setTheme(v)}>{l}</button>
            ))}
          </div>
        </section>

        <div className="wc-actions">
          {onUse && (
            <button type="button" className="btn btn-primary" disabled={busy || !photos.length} onClick={use}>
              {useLabel || tx("Add to the item's photos", "زيدها لصور القطعة")}
            </button>
          )}
          {canShare && <button type="button" className="btn btn-outline-primary" onClick={share}>{tx("Share", "شارك")}</button>}
          <button type="button" className={`btn ${onUse ? "btn-outline-secondary" : "btn-primary"}`} onClick={download}>{tx("Download", "نزّل")}</button>
        </div>
        {msg && <small className="text-danger">{msg}</small>}
      </div>
    </div>
  );
}
