/* eslint-disable import/no-anonymous-default-export */
// لوحة مولود: الاسم بخط متصل، والتاريخ والساعة والوزن والطول مع أيقونات، وزخارف (نجوم، أغصان، ورود، شمس)،
// وإطار ملوّن، وسطر رسالة، وحامل منفصل أو ثقوب تعليق. تُطبع مسطّحة بعدة ألوان (كل عنصر بارز بلونه).
// كل الأيقونات والزخارف مرسومة هنا بالكود (تصميم خاص بنا).
import { textBox, hasArabic, shapeText, bounds } from '../lib/fonts.js';
import { union, difference, offset, circle, roundRect, frame, extrude, subtract } from '../lib/geo.js';

/** سطر نص بحجم خط ثابت: ارتفاع الحرف الكبير/الرقم = capH، متمركز أفقياً حول cx، وخط الأساس محسوب
 * حتى تتساوى أحجام كل السطور مهما كانت حروفها (بعكس textBox الذي يملأ ارتفاع كل نص على حدة) */
function lineText(f, text, capH, cx, cy) {
  const ref = bounds(shapeText(f, 'H0', 100).contours);
  const k = capH / (ref.h || 70);
  const { contours } = shapeText(f, text, 100);
  const b = bounds(contours);
  const out = contours.map((c) => c.map(([x, y]) => [cx + (x - b.cx) * k, cy - capH / 2 + (y - ref.minY) * k]));
  return { contours: out, w: b.w * k };
}

// ——— أدوات رسم ———
const sgn = (c) => {
  let a = 0;
  for (let i = 0, j = c.length - 1; i < c.length; j = i++) a += (c[j][0] + c[i][0]) * (c[j][1] - c[i][1]);
  return a;
};
const norm = (c) => (sgn(c) > 0 ? [...c].reverse() : c); // نفس اتجاه circle() حتى لا تتلاغى المضلّعات عند الدمج
const P = (pts) => [norm(pts)];
const rot = (pts, a, cx = 0, cy = 0) =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const move = (cs, dx, dy) => cs.map((c) => c.map(([x, y]) => [x + dx, y + dy]));
function ellipse(cx, cy, rx, ry, a = 0, n = 32) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push([rx * Math.cos(t), ry * Math.sin(t)]);
  }
  return P(rot(pts, a).map(([x, y]) => [x + cx, y + cy]));
}
/** خط سميك بين نقطتين (طرفاه دائريان) */
function bar(x1, y1, x2, y2, w) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = (-(y2 - y1) / len) * (w / 2), ny = ((x2 - x1) / len) * (w / 2);
  return union(P([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]]), circle(x1, y1, w / 2, 16), circle(x2, y2, w / 2, 16));
}
const ring = (cx, cy, r, w) => difference(circle(cx, cy, r, 48), circle(cx, cy, r - w, 48));

// ——— الأيقونات (حجم s ومركز cx, cy) ———
const ICONS = {
  calendar(cx, cy, s) {
    const w = s * 0.12;
    return union(frame(cx, cy - s * 0.05, s, s * 0.85, s * 0.12, w), roundRect(cx, cy + s * 0.2, s, s * 0.14),
      roundRect(cx - s * 0.25, cy + s * 0.42, w, s * 0.22, w / 2), roundRect(cx + s * 0.25, cy + s * 0.42, w, s * 0.22, w / 2),
      roundRect(cx - s * 0.18, cy - s * 0.18, s * 0.16, s * 0.14), roundRect(cx + s * 0.12, cy - s * 0.18, s * 0.16, s * 0.14));
  },
  clock(cx, cy, s) {
    const w = s * 0.12;
    return union(ring(cx, cy, s / 2, w), bar(cx, cy, cx, cy + s * 0.27, w * 0.9), bar(cx, cy, cx + s * 0.2, cy - s * 0.08, w * 0.9));
  },
  weight(cx, cy, s) {
    const w = s * 0.12;
    const body = P([[cx - s * 0.5, cy - s * 0.45], [cx + s * 0.5, cy - s * 0.45], [cx + s * 0.36, cy + s * 0.2], [cx - s * 0.36, cy + s * 0.2]]);
    const inner = offset(body, -w);
    return union(difference(body, inner), ring(cx, cy + s * 0.33, s * 0.16, w * 0.85), roundRect(cx, cy - s * 0.12, s * 0.42, w * 0.8));
  },
  length(cx, cy, s) {
    const w = s * 0.11, h = s * 0.5;
    const ticks = [];
    for (let i = 1; i < 6; i++) {
      const x = cx - s / 2 + (i * s) / 6;
      ticks.push(roundRect(x, cy - h / 2 + (i % 2 ? h * 0.2 : h * 0.3), w * 0.8, i % 2 ? h * 0.4 : h * 0.6));
    }
    return union(frame(cx, cy, s, h, s * 0.06, w), ...ticks);
  },
  heart(cx, cy, s) {
    const pts = [];
    for (let i = 0; i < 48; i++) {
      const t = (i / 48) * Math.PI * 2;
      pts.push([16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]);
    }
    const k = s / 34;
    return P(pts.map(([x, y]) => [cx + x * k, cy + y * k + s * 0.04]));
  },
  sparkle(cx, cy, s) {
    // نجمة رباعية بحواف منحنية
    const pts = [];
    for (let i = 0; i < 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      const c = Math.cos(t), sn = Math.sin(t);
      pts.push([cx + (s / 2) * Math.sign(c) * Math.abs(c) ** 2.4, cy + (s / 2) * Math.sign(sn) * Math.abs(sn) ** 2.4]);
    }
    return offset(P(pts), 0.15);
  },
  twig(cx, cy, s, flip = 1) {
    const w = Math.max(0.9, s * 0.05);
    const parts = [bar(cx, cy - s / 2, cx + flip * s * 0.05, cy + s / 2, w)];
    for (let i = 0; i < 4; i++) {
      const y = cy - s * 0.3 + i * s * 0.2;
      const x = cx + flip * s * 0.05 * ((y - cy + s / 2) / s);
      parts.push(ellipse(x - s * 0.1, y + s * 0.04, s * 0.11, s * 0.045, Math.PI * 0.25));
      parts.push(ellipse(x + s * 0.1, y + s * 0.04, s * 0.11, s * 0.045, -Math.PI * 0.25));
    }
    parts.push(ellipse(cx + flip * s * 0.05, cy + s * 0.5, s * 0.05, s * 0.09));
    return union(...parts);
  },
  flowerPetals(cx, cy, s) {
    const parts = [];
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + (i * 2 * Math.PI) / 5;
      parts.push(circle(cx + Math.cos(a) * s * 0.26, cy + Math.sin(a) * s * 0.26, s * 0.24, 32));
    }
    return difference(union(...parts), circle(cx, cy, s * 0.16, 32));
  },
  flowerCenter: (cx, cy, s) => circle(cx, cy, s * 0.13, 32),
  sun(cx, cy, s) {
    const r = s * 0.24;
    const parts = [P(Array.from({ length: 25 }, (_, i) => [cx + r * Math.cos((i / 24) * Math.PI), cy - s * 0.15 + r * Math.sin((i / 24) * Math.PI)]))];
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * (i + 0.5)) / 7;
      parts.push(bar(cx + Math.cos(a) * r * 1.35, cy - s * 0.15 + Math.sin(a) * r * 1.35, cx + Math.cos(a) * r * 1.9, cy - s * 0.15 + Math.sin(a) * r * 1.9, s * 0.07));
    }
    parts.push(roundRect(cx, cy - s * 0.2, s, s * 0.07, s * 0.035));
    return union(...parts);
  },
};

export default {
  id: 'birth-sign',
  name: 'لوحة مولود',
  description: 'لوحة باسم المولود وتاريخ ووقت ولادته ووزنه وطوله، مع زخارف وإطار ملوّن وحامل. هدية مثالية للمواليد.',
  category: 'هدايا',
  params: [
    { key: 'name', label: 'اسم المولود', type: 'text', default: 'Mila', group: 'المولود', maxLength: 18 },
    { key: 'date', label: 'التاريخ', type: 'text', default: 'May 12, 2026', group: 'المولود', maxLength: 22, help: 'اتركه فارغاً لإخفائه (وكذلك باقي الحقول)' },
    { key: 'time', label: 'الساعة', type: 'text', default: '07:42', group: 'المولود', maxLength: 12, dir: 'ltr' },
    { key: 'weight', label: 'الوزن', type: 'text', default: '3180 g', group: 'المولود', maxLength: 12 },
    { key: 'length', label: 'الطول', type: 'text', default: '51 cm', group: 'المولود', maxLength: 12 },
    { key: 'message', label: 'رسالة', type: 'text', default: 'Hello World', group: 'المولود', maxLength: 30 },

    { key: 'nameFont', label: 'خط الاسم', type: 'font', sample: ['name'], default: 'pacifico', group: 'الخطوط' },
    { key: 'font', label: 'خط التفاصيل', type: 'font', sample: ['date', 'time', 'weight', 'length', 'message'], default: 'fredoka', group: 'الخطوط' },
    { key: 'msgFont', label: 'خط الرسالة', type: 'font', sample: ['message'], default: 'dancing', group: 'الخطوط' },

    { key: 'icons', label: 'أيقونات التفاصيل', type: 'checkbox', default: true, group: 'الزخارف' },
    { key: 'sparkles', label: 'نجوم لامعة', type: 'checkbox', default: true, group: 'الزخارف' },
    { key: 'twigs', label: 'أغصان', type: 'checkbox', default: true, group: 'الزخارف' },
    { key: 'flowers', label: 'ورود', type: 'checkbox', default: true, group: 'الزخارف' },
    { key: 'sun', label: 'شمس', type: 'checkbox', default: true, group: 'الزخارف' },
    { key: 'heart', label: 'قلب قبل الرسالة', type: 'checkbox', default: true, group: 'الزخارف' },

    { key: 'width', label: 'العرض', type: 'number', min: 100, max: 240, step: 1, unit: 'مم', default: 180, group: 'المقاس' },
    { key: 'height', label: 'الارتفاع', type: 'number', min: 70, max: 200, step: 1, unit: 'مم', default: 123, group: 'المقاس' },
    { key: 'corner', label: 'تدوير الزوايا', type: 'number', min: 0, max: 30, step: 1, unit: 'مم', default: 10, group: 'المقاس' },
    { key: 'thickness', label: 'سماكة اللوحة', type: 'number', min: 2, max: 8, step: 0.2, unit: 'مم', default: 3.6, group: 'المقاس' },
    { key: 'relief', label: 'بروز الكتابة والزخارف', type: 'number', min: 0.4, max: 3, step: 0.2, unit: 'مم', default: 1, group: 'المقاس' },
    { key: 'rim', label: 'عرض الإطار', type: 'number', min: 0, max: 12, step: 0.5, unit: 'مم', default: 5, group: 'المقاس' },

    { key: 'mount', label: 'طريقة العرض', type: 'select', default: 'stand', group: 'العرض',
      options: [{ value: 'stand', label: 'حامل' }, { value: 'holes', label: 'ثقوب تعليق' }, { value: 'none', label: 'بدون' }] },
    { key: 'slotTol', label: 'سماحية فتحة الحامل', type: 'number', min: 0.1, max: 0.8, step: 0.05, unit: 'مم', default: 0.3, group: 'العرض', show: (p) => p.mount === 'stand' },

    { key: 'baseColor', label: 'لون اللوحة', type: 'color', default: '#f4ead8', group: 'الألوان' },
    { key: 'frameColor', label: 'لون الإطار', type: 'color', default: '#e5806c', group: 'الألوان' },
    { key: 'nameColor', label: 'لون الاسم', type: 'color', default: '#d4553f', group: 'الألوان' },
    { key: 'textColor', label: 'لون التفاصيل', type: 'color', default: '#5468a6', group: 'الألوان' },
    { key: 'goldColor', label: 'لون النجوم والشمس', type: 'color', default: '#f1bf3f', group: 'الألوان' },
    { key: 'twigColor', label: 'لون الأغصان', type: 'color', default: '#8aa0d8', group: 'الألوان' },
    { key: 'flowerColor', label: 'لون الورود والقلب', type: 'color', default: '#ec7f6b', group: 'الألوان' },
    { key: 'standColor', label: 'لون الحامل', type: 'color', default: '#f4ead8', group: 'الألوان', show: (p) => p.mount === 'stand' },
  ],
  fonts: (p) => [p.nameFont, p.font, p.msgFont],
  build(p, fonts) {
    const W = p.width, H = p.height;
    const T = p.thickness, R = p.relief;
    const plate = roundRect(0, 0, W, H, Math.min(p.corner, H / 2 - 1), 12);
    const layers = { frame: [], name: [], text: [], gold: [], twig: [], flower: [] };

    // الإطار: حافة خارجية + خط داخلي رفيع
    const rimW = p.rim;
    if (rimW > 0) {
      layers.frame.push(difference(plate, offset(plate, -rimW)));
      const inner = offset(plate, -(rimW + 2.4));
      layers.frame.push(difference(inner, offset(inner, -1.2)));
    }
    const m = (rimW > 0 ? rimW + 6 : 6); // الهامش الداخلي
    const iw = W - 2 * m, ih = H - 2 * m;
    const top = H / 2 - m, bottom = -H / 2 + m;

    // التوزيع العمودي: الاسم ٣٨٪، التفاصيل صفّان، والرسالة سطر أخير
    const hasRow1 = !!(p.date || p.time), hasRow2 = !!(p.weight || p.length), hasMsg = !!p.message;
    const rows = [hasRow1, hasRow2].filter(Boolean).length;
    const nameZone = ih * (rows ? 0.42 : 0.65);
    const nameH = nameZone * 0.72;
    const nameCy = top - nameZone / 2;

    // الاسم
    let nameBox = { w: 0, h: 0 };
    if (p.name) {
      const decoRoom = p.twigs ? nameH * 0.9 : 0;
      nameBox = textBox(fonts[p.nameFont], p.name, { height: nameH, maxWidth: iw - 2 * decoRoom, cx: 0, cy: nameCy });
      layers.name.push(nameBox.contours);
      if (p.twigs) {
        const tx = nameBox.w / 2 + nameH * 0.45;
        layers.twig.push(ICONS.twig(-tx, nameCy, nameH * 0.95, 1), ICONS.twig(tx, nameCy, nameH * 0.95, -1));
      }
      if (p.sparkles) {
        const sx = nameBox.w / 2 + nameH * 0.12;
        layers.gold.push(ICONS.sparkle(-sx, nameCy + nameH * 0.32, nameH * 0.26), ICONS.sparkle(sx, nameCy + nameH * 0.32, nameH * 0.22),
          ICONS.sparkle(-sx + nameH * 0.05, nameCy - nameH * 0.25, nameH * 0.16), ICONS.sparkle(sx - nameH * 0.05, nameCy - nameH * 0.28, nameH * 0.18));
      }
    }

    // صفوف التفاصيل: أيقونة + نص في عمودين
    const restTop = top - nameZone, restH = ih - nameZone - (hasMsg ? ih * 0.16 : 0);
    const rowH = Math.min(ih * 0.085, restH / Math.max(1, rows) * 0.55);
    const rowYs = rows === 2 ? [restTop - restH * 0.27, restTop - restH * 0.73] : [restTop - restH / 2];
    // ترتيب الأعمدة حسب اتجاه القراءة: العربي يبدأ من اليمين
    const rtlDetails = hasArabic([p.date, p.time, p.weight, p.length, p.name].join(''));
    const colX = rtlDetails ? [iw * 0.24, -iw * 0.24] : [-iw * 0.24, iw * 0.24];
    // حجم موحّد لكل التفاصيل: الأصغر الذي يتّسع فيه أطول نص
    const icon = p.icons ? 1.25 : 0, gapK = p.icons ? 0.5 : 0;
    let tH = rowH;
    for (const t of [p.date, p.time, p.weight, p.length]) {
      if (!t) continue;
      const probe = lineText(fonts[p.font], t, rowH, 0, 0);
      const room = iw * 0.44 - rowH * (icon + gapK);
      if (probe.w > room) tH = Math.min(tH, (rowH * room) / probe.w);
    }
    const item = (iconName, text, cx, cy) => {
      if (!text) return;
      const tb = lineText(fonts[p.font], text, tH, 0, cy);
      const iconS = icon * tH;
      const gap = gapK * tH;
      const total = tb.w + gap + iconS;
      const rtl = hasArabic(text);
      const textCx = cx + (rtl ? -(total / 2 - tb.w / 2) : total / 2 - tb.w / 2);
      layers.text.push(move(tb.contours, textCx, 0));
      if (iconS) {
        const ix = cx + (rtl ? total / 2 - iconS / 2 : -(total / 2 - iconS / 2));
        layers.text.push(ICONS[iconName](ix, cy, iconS));
      }
    };
    let ri = 0;
    if (hasRow1) {
      item('calendar', p.date, colX[0], rowYs[ri]);
      item('clock', p.time, colX[1], rowYs[ri]);
      ri++;
    }
    if (hasRow2) {
      item('weight', p.weight, colX[0], rowYs[ri]);
      item('length', p.length, colX[1], rowYs[ri]);
      if (p.sun) layers.gold.push(ICONS.sun(0, rowYs[ri], tH * 1.9));
    }

    // الرسالة مع قلب
    if (hasMsg) {
      const my = bottom + ih * 0.08;
      const mh = ih * 0.085;
      const tb = textBox(fonts[p.msgFont], p.message, { height: mh, maxWidth: iw * 0.6, cx: 0, cy: my });
      const hs = p.heart ? mh * 0.8 : 0;
      const gap = hs ? mh * 0.35 : 0;
      const total = hs + gap + tb.w;
      const dir = hasArabic(p.message) ? -1 : 1; // القلب قبل الرسالة حسب اتجاه القراءة
      layers.text.push(move(tb.contours, dir * (total / 2 - tb.w / 2), 0));
      if (hs) layers.flower.push(ICONS.heart(-dir * (total / 2 - hs / 2), my, hs));
    }

    // الورود في الزاويتين السفليتين + شمس صغيرة إن لم يكن هناك صف ثانٍ
    if (p.flowers) {
      const fs = Math.min(ih * 0.17, iw * 0.1);
      for (const sx of [-1, 1]) {
        const fx = sx * (iw / 2 - fs * 0.6), fy = bottom + fs * 0.6;
        layers.flower.push(ICONS.flowerPetals(fx, fy, fs));
        layers.gold.push(ICONS.flowerCenter(fx, fy, fs));
      }
    }

    // ٢) طبقات الألوان بلا تداخل: الأعلى أولوية يُقتطع من الأقل
    const order = [
      ['name', 'الاسم', p.nameColor],
      ['text', 'التفاصيل', p.textColor],
      ['gold', 'النجوم والشمس', p.goldColor],
      ['flower', 'الورود', p.flowerColor],
      ['twig', 'الأغصان', p.twigColor],
      ['frame', 'الإطار', p.frameColor],
    ];
    const inside = offset(plate, -0.6);
    let taken = [];
    const parts = [];
    let base = extrude(plate, T, 0);
    // ثقوب التعليق
    if (p.mount === 'holes') {
      const hy = H / 2 - Math.max(rimW, 4) - 6;
      const holes = union(circle(-W / 2 + m + 4, hy, 2.4, 32), circle(W / 2 - m - 4, hy, 2.4, 32));
      base = extrude(difference(plate, holes), T, 0);
      taken = offset(holes, 1.6);
    }
    parts.push({ name: 'اللوحة', color: p.baseColor, geometry: base });
    for (const [key, label, color] of order) {
      if (!layers[key].length) continue;
      let sh = union(...layers[key]);
      sh = taken.length ? difference(sh, taken) : sh;
      sh = difference(sh, difference(plate, inside)); // لا شيء يخرج عن حافة اللوحة
      sh = offset(offset(sh, -0.2), 0.2);
      if (!sh.length) continue;
      parts.push({ name: label, color, geometry: extrude(sh, R, T) });
      taken = union(taken, sh);
    }

    // ٣) الحامل: قطعة منفصلة أمام اللوحة على السرير، فيها شق مائل قليلاً تنزلق فيه اللوحة
    if (p.mount === 'stand') {
      const L = Math.min(W * 0.55, 120), D = 32, Hs = 14;
      const sy = -H / 2 - 14 - D / 2;
      const slotW = T + p.slotTol * 2;
      let g = extrude(roundRect(0, sy, L, D, 8, 10), Hs, 0);
      const slot = extrude(roundRect(0, sy + 2, L + 2, slotW), Hs, Hs - 9);
      g = subtract(g, slot);
      parts.push({ name: 'الحامل', color: p.standColor, geometry: g });
    }
    return parts.filter((x) => x.geometry);
  },
};

