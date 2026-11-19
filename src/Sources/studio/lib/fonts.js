// تحميل الخطوط وتشكيل النص العربي (HarfBuzz) وتحويله إلى مضلّعات بالمليمتر
// HarfBuzz (WASM) يُحمَّل من public/studio-lib كوحدة ES مستقلة، لأن react-scripts لا يستطيع تجميعه.
// المصدر: حزمة harfbuzzjs 1.6.4 (MIT). hb-legacy.mjs = نفس المكتبة محوَّلة لتعمل على Safari/iOS القديم
// (بلا await على المستوى الأعلى وبلا صياغة حديثة)؛ تنتظر جاهزية الـ WASM عبر m.ready.
let hb = null;
let hbLoading = null;
export function loadHarfBuzz() {
  if (!hbLoading) {
    const url = `${window.location.origin}${process.env.PUBLIC_URL || ''}/studio-lib/harfbuzzjs/hb-legacy.mjs`;
    hbLoading = import(/* webpackIgnore: true */ url)
      .then(async (m) => {
        await m.ready;
        hb = m;
        return m;
      })
      .catch((e) => {
        hbLoading = null; // نسمح بمحاولة ثانية
        console.error('HarfBuzz load failed:', e);
        const old = typeof WebAssembly === 'undefined' || /CompileError|WebAssembly|wasm/i.test(String(e));
        throw new Error(old
          ? 'متصفحك قديم ولا يدعم معاينة الـ Studio — حدّث الجهاز إلى iOS 15 أو أحدث، أو جرّب Chrome'
          : 'تعذّر تحميل محرّك الخطوط — حدّث الصفحة وحاول مجدداً');
      });
  }
  return hbLoading;
}

// script: 'ar' = عربي + إنكليزي ، 'en' = إنكليزي وأرقام فقط. الخطوط كلها مجانية (OFL / Apache) من Google Fonts
export const FONTS = [
  // ——— عربي + إنكليزي ———
  { id: 'lalezar', name: 'لاله زار (عريض)', file: 'Lalezar-Regular.ttf', script: 'ar' },
  { id: 'cairo', name: 'القاهرة (حديث)', file: 'Cairo-VF.ttf', vars: { wght: 700 }, script: 'ar' },
  { id: 'cairo-black', name: 'القاهرة (أسود)', file: 'Cairo-VF.ttf', vars: { wght: 900 }, script: 'ar' },
  { id: 'tajawal', name: 'تجوّل (أسود)', file: 'Tajawal-Black.ttf', script: 'ar' },
  { id: 'changa', name: 'شنقا (عريض)', file: 'Changa-VF.ttf', vars: { wght: 800 }, script: 'ar' },
  { id: 'kufam', name: 'كوفام (أسود)', file: 'Kufam-VF.ttf', vars: { wght: 900 }, script: 'ar' },
  { id: 'noto-kufi', name: 'نوتو كوفي (أسود)', file: 'NotoKufiArabic-VF.ttf', vars: { wght: 900 }, script: 'ar' },
  { id: 'reem-kufi', name: 'ريم كوفي', file: 'ReemKufi-VF.ttf', vars: { wght: 700 }, script: 'ar' },
  { id: 'mada', name: 'مدى (أسود)', file: 'Mada-VF.ttf', vars: { wght: 900 }, script: 'ar' },
  { id: 'rubik', name: 'روبيك (أسود)', file: 'Rubik-VF.ttf', vars: { wght: 900 }, script: 'ar' },
  { id: 'baloo', name: 'بالو (طفولي)', file: 'BalooBhaijaan2-VF.ttf', vars: { wght: 800 }, script: 'ar' },
  { id: 'lemonada', name: 'ليمونادة (دائري)', file: 'Lemonada-VF.ttf', vars: { wght: 700 }, script: 'ar' },
  { id: 'marhey', name: 'مرحي (مرح)', file: 'Marhey-VF.ttf', vars: { wght: 700 }, script: 'ar' },
  { id: 'elmessiri', name: 'المسيري', file: 'ElMessiri-VF.ttf', vars: { wght: 700 }, script: 'ar' },
  { id: 'rakkas', name: 'رقّاص', file: 'Rakkas-Regular.ttf', script: 'ar' },
  { id: 'jomhuria', name: 'جمهورية (طويل)', file: 'Jomhuria-Regular.ttf', script: 'ar' },
  { id: 'katibeh', name: 'كاتبة (يدوي)', file: 'Katibeh-Regular.ttf', script: 'ar' },
  { id: 'ruqaa', name: 'رقعة', file: 'ArefRuqaa-Bold.ttf', script: 'ar' },
  { id: 'amiri', name: 'أميري (نسخ)', file: 'Amiri-Bold.ttf', script: 'ar' },
  { id: 'mirza', name: 'ميرزا (نسخ)', file: 'Mirza-Bold.ttf', script: 'ar' },
  { id: 'blaka', name: 'بلاكا (قوطي)', file: 'Blaka-Regular.ttf', script: 'ar' },
  // ——— إنكليزي فقط ———
  { id: 'anton', name: 'Anton', file: 'Anton-Regular.ttf', script: 'en' },
  { id: 'bebas', name: 'Bebas Neue', file: 'BebasNeue-Regular.ttf', script: 'en' },
  { id: 'oswald', name: 'Oswald', file: 'Oswald-VF.ttf', vars: { wght: 700 }, script: 'en' },
  { id: 'archivo-black', name: 'Archivo Black', file: 'ArchivoBlack-Regular.ttf', script: 'en' },
  { id: 'bowlby', name: 'Bowlby One', file: 'BowlbyOne-Regular.ttf', script: 'en' },
  { id: 'russo', name: 'Russo One', file: 'RussoOne-Regular.ttf', script: 'en' },
  { id: 'bungee', name: 'Bungee', file: 'Bungee-Regular.ttf', script: 'en' },
  { id: 'lilita', name: 'Lilita One', file: 'LilitaOne-Regular.ttf', script: 'en' },
  { id: 'fredoka', name: 'Fredoka', file: 'Fredoka-VF.ttf', vars: { wght: 700 }, script: 'en' },
  { id: 'righteous', name: 'Righteous', file: 'Righteous-Regular.ttf', script: 'en' },
  { id: 'audiowide', name: 'Audiowide', file: 'Audiowide-Regular.ttf', script: 'en' },
  { id: 'orbitron', name: 'Orbitron', file: 'Orbitron-VF.ttf', vars: { wght: 900 }, script: 'en' },
  { id: 'black-ops', name: 'Black Ops One', file: 'BlackOpsOne-Regular.ttf', script: 'en' },
  { id: 'marker', name: 'Permanent Marker', file: 'PermanentMarker-Regular.ttf', script: 'en' },
  { id: 'pacifico', name: 'Pacifico', file: 'Pacifico-Regular.ttf', script: 'en' },
  { id: 'lobster', name: 'Lobster', file: 'Lobster-Regular.ttf', script: 'en' },
  { id: 'dancing', name: 'Dancing Script', file: 'DancingScript-VF.ttf', vars: { wght: 700 }, script: 'en' },
];

export const hasArabic = (s) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(s || '');
/** هل يدعم الخط النص المكتوب؟ (الخطوط الإنكليزية لا تحتوي حروفاً عربية) */
export const fontSupports = (def, text) => def.script !== 'en' || !hasArabic(text);

// تسجيل الخط في المتصفح لعرض المعاينة في قائمة الخطوط (مرة واحدة لكل خط، عند الحاجة فقط)
const cssFaces = new Map();
export function fontStyle(def) {
  if (typeof document !== 'undefined' && window.FontFace && !cssFaces.has(def.id)) {
    const url = `${process.env.PUBLIC_URL || ''}/studio-fonts/${def.file}`;
    const face = new FontFace(`sd-font-${def.id}`, `url("${url}")`, def.vars?.wght ? { weight: '100 900' } : {});
    cssFaces.set(def.id, face.load().then((f) => document.fonts.add(f)).catch(() => null));
  }
  return {
    fontFamily: `'sd-font-${def.id}', system-ui, sans-serif`,
    fontWeight: def.vars?.wght || 'normal',
    fontVariationSettings: def.vars ? Object.entries(def.vars).map(([k, v]) => `"${k}" ${v}`).join(', ') : undefined,
  };
}

const cache = new Map();

export function loadFont(id) {
  const def = FONTS.find((f) => f.id === id) || FONTS[0];
  if (!cache.has(def.id)) {
    const p = loadHarfBuzz()
      .then(() => fetch(`${process.env.PUBLIC_URL || ''}/studio-fonts/${def.file}`))
      .then((r) => {
        if (!r.ok) throw new Error('تعذّر تحميل الخط ' + def.file);
        return r.arrayBuffer();
      })
      .then((ab) => {
        const face = new hb.Face(new hb.Blob(ab));
        const font = new hb.Font(face);
        // للخطوط المتغيّرة (Variable) نحدّد الوزن
        if (def.vars) font.setVariations(Object.entries(def.vars).map(([t, v]) => new hb.Variation(t, v)));
        return { id: def.id, face, font, upem: face.upem, glyphPaths: new Map() };
      });
    cache.set(def.id, p);
  }
  return cache.get(def.id);
}

export async function loadFonts(ids) {
  const out = {};
  await Promise.all([...new Set(ids)].map(async (id) => (out[id] = await loadFont(id))));
  return out;
}

// تحويل مسار SVG (M L Q C Z) إلى كونتورات من النقاط
function pathToContours(d, steps = 6) {
  const tokens = d.match(/[MLQCZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  const contours = [];
  let cur = null;
  let x = 0, y = 0;
  let i = 0;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M') {
      x = num(); y = num();
      cur = [[x, y]];
      contours.push(cur);
    } else if (cmd === 'L') {
      x = num(); y = num();
      cur.push([x, y]);
    } else if (cmd === 'Q') {
      const cx = num(), cy = num(), ex = num(), ey = num();
      for (let s = 1; s <= steps; s++) {
        const t = s / steps, u = 1 - t;
        cur.push([u * u * x + 2 * u * t * cx + t * t * ex, u * u * y + 2 * u * t * cy + t * t * ey]);
      }
      x = ex; y = ey;
    } else if (cmd === 'C') {
      const c1x = num(), c1y = num(), c2x = num(), c2y = num(), ex = num(), ey = num();
      for (let s = 1; s <= steps; s++) {
        const t = s / steps, u = 1 - t;
        cur.push([
          u * u * u * x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex,
          u * u * u * y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey,
        ]);
      }
      x = ex; y = ey;
    } else if (cmd === 'Z' || cmd === 'z') {
      // إغلاق الكونتور
    }
  }
  return contours.filter((c) => c.length > 2);
}

/**
 * يشكّل النص ويعيد كونتوراته بوحدة المليمتر.
 * size = حجم الخط (em) بالمليمتر. خط الأساس على y=0 ويبدأ النص من x=0.
 */
// ——— اتجاه النص المختلط (عربي + إنكليزي) ———
// نقسم النص إلى مقاطع بنفس الاتجاه ونشكّل كل مقطع وحده، ثم نرتّبها بصرياً.
// بدون هذا تنقلب الكلمات الإنكليزية داخل نص عربي (Omar ← ramO).
const charClass = (ch) => {
  if (/[\u0660-\u0669\u06F0-\u06F9]/.test(ch)) return 'L'; // الأرقام العربية-الهندية تُقرأ من اليسار
  if (/[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/.test(ch)) return 'R';
  if (/[\p{L}\p{N}]/u.test(ch)) return 'L';
  return 'N';
};

export function bidiRuns(text, dir) {
  const chars = Array.from(text || ' ');
  if (dir === 'ltr') return [{ rtl: false, text: chars.join('') }];
  const cls = chars.map(charClass);
  if (!cls.includes('R')) return [{ rtl: false, text: chars.join('') }];
  if (!cls.includes('L')) return [{ rtl: true, text: chars.join('') }];
  // الاتجاه الأساسي من أول حرف (لا رقم) — مثل خانة الإدخال في المتصفح (dir=auto)
  const firstLetter = chars.find((ch) => /\p{L}/u.test(ch));
  const base = dir === 'rtl' || !firstLetter || charClass(firstLetter) === 'R' ? 'R' : 'L';
  // الرموز المحايدة (مسافات، نقاط...) تأخذ اتجاه ما حولها إن تطابق، وإلا الاتجاه الأساسي
  const res = cls.map((c, i) => {
    if (c !== 'N') return c;
    let a = null, b = null;
    for (let j = i - 1; j >= 0 && !a; j--) if (cls[j] !== 'N') a = cls[j];
    for (let j = i + 1; j < cls.length && !b; j++) if (cls[j] !== 'N') b = cls[j];
    return a && a === b ? a : base;
  });
  const runs = [];
  res.forEach((d, i) => {
    const last = runs[runs.length - 1];
    if (last && last.d === d) last.text += chars[i];
    else runs.push({ d, text: chars[i] });
  });
  const out = runs.map((r) => ({ rtl: r.d === 'R', text: r.text }));
  return base === 'R' ? out.reverse() : out;
}

function shapeRun(f, text, rtl) {
  const buf = new hb.Buffer();
  buf.addText(text);
  buf.guessSegmentProperties();
  buf.setDirection(rtl ? hb.Direction.RTL : hb.Direction.LTR);
  hb.shape(f.font, buf);
  const infos = buf.getGlyphInfos();
  const pos = buf.getGlyphPositions();
  if (buf.destroy) buf.destroy();
  return infos.map((g, i) => ({ codepoint: g.codepoint, pos: pos[i] }));
}

/**
 * يشكّل النص ويعيد كونتوراته بوحدة المليمتر.
 * size = حجم الخط (em) بالمليمتر. خط الأساس على y=0 ويبدأ النص من x=0.
 */
export function shapeText(f, text, size, { spacing = 0, dir } = {}) {
  // الأرقام وحدها تُقرأ دائماً من اليسار لليمين حتى لو كانت عربية-هندية
  if (!dir && /^[\s\d٠-٩.,:-]+$/.test(text || '')) dir = 'ltr';
  const glyphs = bidiRuns(text || ' ', dir).flatMap((r) => shapeRun(f, r.text, r.rtl));
  const infos = glyphs;
  const pos = glyphs.map((g) => g.pos);
  const k = size / f.upem;
  const contours = [];
  let pen = 0;
  let missing = false;
  infos.forEach((g, idx) => {
    const gid = g.codepoint;
    if (gid === 0 && text.trim()) missing = true;
    let base = f.glyphPaths.get(gid);
    if (!base) {
      base = pathToContours(f.font.glyphToPath(gid));
      f.glyphPaths.set(gid, base);
    }
    const p = pos[idx];
    const ox = pen + p.xOffset, oy = p.yOffset;
    for (const c of base) contours.push(c.map(([px, py]) => [(px + ox) * k, (py + oy) * k]));
    pen += p.xAdvance + (spacing / k);
  });
  if (missing) throw new Error('الخط المختار لا يدعم بعض الحروف المكتوبة — اختر خطاً آخر');
  const width = Math.max(0, pen * k - spacing);
  return { contours, width, missing };
}

export function bounds(contours) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of contours)
    for (const [x, y] of c) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0, cx: 0, cy: 0 };
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

export function transform(contours, { scale = 1, dx = 0, dy = 0 } = {}) {
  return contours.map((c) => c.map(([x, y]) => [x * scale + dx, y * scale + dy]));
}

/** نص متمركز حول (cx, cy) بارتفاع حروف فعلي = height مم، مع حدّ أقصى للعرض */
export function textBox(f, text, { height, maxWidth = Infinity, cx = 0, cy = 0, spacing = 0, dir }) {
  const { contours, missing } = shapeText(f, text, 100, { spacing: spacing * 100 / Math.max(height, 0.1), dir });
  const b = bounds(contours);
  if (!b.h) return { contours: [], missing, w: 0, h: 0 };
  let s = height / b.h;
  if (b.w * s > maxWidth) s = maxWidth / b.w;
  return {
    contours: transform(contours, { scale: s, dx: cx - b.cx * s, dy: cy - b.cy * s }),
    missing,
    w: b.w * s,
    h: b.h * s,
  };
}
