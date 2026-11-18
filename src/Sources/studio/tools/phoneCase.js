/* eslint-disable import/no-anonymous-default-export */
// كفر هاتف هجين: إطار TPU مرن (يحمي الأطراف + شفة أمامية للشاشة) + ظهر PLA قاسٍ يُركّب داخل الإطار
// ويحمل التصميم (اسم/صورة/نقش). القطعتان تُطبعان منفصلتين:
//  • الإطار يُطبع ووجه الشاشة على السطح؛ الشفة الخلفية مشطوفة 45° فلا تحتاج دعامات.
//  • الظهر يُطبع ووجهه الخارجي للأعلى؛ التصميم مدمج بآخر الطبقات (مسطّح) أو بارز.
// الإحداثيات: منظر من الخلف — x لليمين، y للأعلى (أعلى الهاتف).
import { textBox } from '../lib/fonts.js';
import { imageShape } from '../lib/colors.js';
import { union, difference, intersection, offset, roundRect, circle, bounds2, extrude, merge } from '../lib/geo.js';
import { PHONES, BRANDS, manualPhone, resolveKeys } from '../lib/phones.js';

const BED = 250;
const absArea = (cs) => cs.reduce((s, c) => {
  let a = 0;
  for (let i = 0, j = c.length - 1; i < c.length; j = i++) a += (c[j][0] + c[i][0]) * (c[j][1] - c[i][1]);
  return s + a / 2;
}, 0);
const rect = (x0, y0, x1, y1, r = 0) => roundRect((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), r);
const rot90 = (cs, cx, cy) => cs.map((c) => c.map(([x, y]) => [cx - (y - cy), cy + (x - cx)]));

const phoneOptions = [
  ...BRANDS.flatMap((b) => PHONES.filter((ph) => ph.brand === b).map((ph) => ({ value: ph.id, label: ph.name, group: b }))),
  { value: 'manual', label: 'مقاس يدوي…', group: 'أخرى' },
];

// ——— النقوش ———
function pattern(kind, region, cell, line) {
  const b = bounds2(region);
  const out = [];
  const R = Math.ceil(Math.max(b.w, b.h) / cell) + 2;
  if (kind === 'stripes') {
    // خطوط مائلة 45°
    const L = Math.max(b.w, b.h) * 2;
    for (let k = -R; k <= R; k++) {
      const c = k * cell * Math.SQRT2;
      out.push([[[b.cx + c - L, b.cy - L], [b.cx + c - L + line * Math.SQRT2, b.cy - L], [b.cx + c + L + line * Math.SQRT2, b.cy + L], [b.cx + c + L, b.cy + L]]]);
    }
  } else if (kind === 'dots') {
    const py = (cell * Math.sqrt(3)) / 2;
    for (let r = -R; r <= R; r++)
      for (let k = -R; k <= R; k++) out.push(circle(b.cx + k * cell + (Math.abs(r) % 2 ? cell / 2 : 0), b.cy + r * py, cell * 0.3, 24));
  } else if (kind === 'checker') {
    for (let r = -R; r <= R; r++)
      for (let k = -R; k <= R; k++) if ((r + k) % 2 === 0) out.push(rect(b.cx + k * cell, b.cy + r * cell, b.cx + (k + 1) * cell, b.cy + (r + 1) * cell));
  } else if (kind === 'diamond') {
    // شبكة معيّنات (خطوط)
    const h = cell / 2;
    for (let r = -2 * R; r <= 2 * R; r++)
      for (let k = -R; k <= R; k++) {
        const cx = b.cx + k * cell + (Math.abs(r) % 2 ? cell / 2 : 0), cy = b.cy + (r * cell) / 2;
        const o = [[cx, cy - h], [cx + h, cy], [cx, cy + h], [cx - h, cy]];
        const i = line * Math.SQRT2 / 2;
        const inn = [[cx, cy - h + i], [cx - h + i, cy], [cx, cy + h - i], [cx + h - i, cy]];
        out.push([o, inn]);
      }
  } else {
    // خلايا نحل (خطوط سداسية)
    const py = (cell * Math.sqrt(3)) / 2;
    const Ro = cell / Math.sqrt(3);
    const Ri = Ro - line / Math.sqrt(3);
    for (let r = -R; r <= R; r++)
      for (let k = -R; k <= R; k++) {
        const cx = b.cx + k * cell + (Math.abs(r) % 2 ? cell / 2 : 0), cy = b.cy + r * py;
        const hex = (rr, rev) => {
          const pts = [];
          for (let i = 0; i < 6; i++) {
            const a = Math.PI / 2 + ((rev ? -i : i) * Math.PI) / 3;
            pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
          }
          return pts;
        };
        out.push([hex(Ro + 0.01, false), hex(Math.max(0.1, Ri), true)]);
      }
  }
  return intersection(union(...out), region);
}

export default {
  id: 'phone-case',
  name: 'كفر هاتف',
  description: 'اختر موديل هاتفك فيُبنى كفر على مقاسه: إطار TPU مرن يحمي الأطراف والشاشة، وظهر قاسٍ يحمل اسمك أو صورتك أو نقشاً.',
  category: 'إكسسوارات',
  params: [
    { key: 'phone', label: 'الهاتف', type: 'select', dropdown: true, default: 'ip16', group: 'الهاتف', options: phoneOptions },

    { key: 'mH', label: 'الطول', type: 'number', min: 100, max: 190, step: 0.1, unit: 'مم', default: 150, group: 'الهاتف', show: (p) => p.phone === 'manual' },
    { key: 'mW', label: 'العرض', type: 'number', min: 55, max: 95, step: 0.1, unit: 'مم', default: 72, group: 'الهاتف', show: (p) => p.phone === 'manual' },
    { key: 'mD', label: 'السماكة', type: 'number', min: 5, max: 13, step: 0.05, unit: 'مم', default: 8, group: 'الهاتف', show: (p) => p.phone === 'manual' },
    { key: 'mR', label: 'تدوير الزوايا', type: 'number', min: 2, max: 16, step: 0.5, unit: 'مم', default: 9, group: 'الهاتف', show: (p) => p.phone === 'manual' },
    { key: 'mCamFull', label: 'كاميرا بعرض الهاتف', type: 'checkbox', default: false, group: 'الهاتف', show: (p) => p.phone === 'manual' },
    { key: 'mCamX', label: 'الكاميرا: بُعدها عن الحافة اليسرى (من الخلف)', type: 'number', min: 0, max: 40, step: 0.5, unit: 'مم', default: 8, group: 'الهاتف', show: (p) => p.phone === 'manual' && !p.mCamFull },
    { key: 'mCamY', label: 'الكاميرا: بُعدها عن الأعلى', type: 'number', min: 0, max: 40, step: 0.5, unit: 'مم', default: 8, group: 'الهاتف', show: (p) => p.phone === 'manual' && !p.mCamFull },
    { key: 'mCamW', label: 'عرض الكاميرا', type: 'number', min: 8, max: 80, step: 0.5, unit: 'مم', default: 30, group: 'الهاتف', show: (p) => p.phone === 'manual' && !p.mCamFull },
    { key: 'mCamH', label: 'طول الكاميرا', type: 'number', min: 8, max: 70, step: 0.5, unit: 'مم', default: 30, group: 'الهاتف', show: (p) => p.phone === 'manual' },
    { key: 'mKeyLy', label: 'أزرار الجهة اليسرى (من الأمام): تبدأ من الأعلى', type: 'number', min: 0, max: 150, step: 1, unit: 'مم', default: 20, group: 'الهاتف', show: (p) => p.phone === 'manual' },
    { key: 'mKeyL', label: 'طول فتحة اليسار (0 = بلا)', type: 'number', min: 0, max: 100, step: 1, unit: 'مم', default: 0, group: 'الهاتف', show: (p) => p.phone === 'manual' },
    { key: 'mKeyRy', label: 'أزرار الجهة اليمنى (من الأمام): تبدأ من الأعلى', type: 'number', min: 0, max: 150, step: 1, unit: 'مم', default: 40, group: 'الهاتف', show: (p) => p.phone === 'manual' },
    { key: 'mKeyR', label: 'طول فتحة اليمين (0 = بلا)', type: 'number', min: 0, max: 100, step: 1, unit: 'مم', default: 50, group: 'الهاتف', show: (p) => p.phone === 'manual' },

    { key: 'design', label: 'التصميم على الظهر', type: 'select', default: 'text', group: 'التصميم',
      options: [{ value: 'text', label: 'اسم / نص' }, { value: 'image', label: 'صورة / لوغو' }, { value: 'pattern', label: 'نقش' }, { value: 'plain', label: 'سادة' }] },
    { key: 'text', label: 'النص', type: 'text', default: 'Nour', group: 'التصميم', show: (p) => p.design === 'text' || (p.design === 'pattern' && p.patternText) },
    { key: 'font', label: 'الخط', type: 'font', sample: ['text'], default: 'pacifico', group: 'التصميم', show: (p) => p.design === 'text' || (p.design === 'pattern' && p.patternText) },
    { key: 'vertical', label: 'نص بالطول', type: 'checkbox', default: false, group: 'التصميم', show: (p) => p.design === 'text' || (p.design === 'pattern' && p.patternText) },
    { key: 'image', label: 'الصورة', type: 'image', default: '', group: 'التصميم', maxSize: 600, show: (p) => p.design === 'image' },
    { key: 'bgTol', label: 'حساسية إزالة الخلفية', type: 'number', min: 5, max: 120, step: 1, default: 40, group: 'التصميم', show: (p) => p.design === 'image' },
    { key: 'imageColors', label: 'ألوان الصورة', type: 'number', min: 1, max: 6, step: 1, default: 1, group: 'التصميم', show: (p) => p.design === 'image',
      help: '1 = لون واحد. أكثر = ألوان الصورة نفسها (يحتاج AMS)' },
    { key: 'pattern', label: 'النقش', type: 'select', default: 'hex', group: 'التصميم', show: (p) => p.design === 'pattern',
      options: [{ value: 'hex', label: 'خلايا نحل' }, { value: 'diamond', label: 'معيّنات' }, { value: 'dots', label: 'نقاط' }, { value: 'stripes', label: 'خطوط' }, { value: 'checker', label: 'مربعات' }] },
    { key: 'cell', label: 'حجم النقش', type: 'number', min: 4, max: 30, step: 0.5, unit: 'مم', default: 10, group: 'التصميم', show: (p) => p.design === 'pattern' },
    { key: 'patternText', label: 'اسم فوق النقش', type: 'checkbox', default: false, group: 'التصميم', show: (p) => p.design === 'pattern' },
    { key: 'size', label: 'حجم التصميم', type: 'number', min: 20, max: 100, step: 1, unit: '%', default: 70, group: 'التصميم', show: (p) => p.design !== 'plain' && !(p.design === 'pattern' && !p.patternText) },
    { key: 'shiftY', label: 'تحريك التصميم للأعلى/للأسفل', type: 'number', min: -60, max: 60, step: 1, unit: 'مم', default: 0, group: 'التصميم', show: (p) => p.design !== 'plain' && !(p.design === 'pattern' && !p.patternText) },
    { key: 'finish', label: 'شكل التصميم', type: 'select', default: 'flush', group: 'التصميم', show: (p) => p.design !== 'plain',
      options: [{ value: 'flush', label: 'مسطّح (ألوان مدمجة)' }, { value: 'raised', label: 'بارز' }] },

    { key: 'frameColor', label: 'لون الإطار (TPU)', type: 'color', default: '#1f1f24', group: 'الألوان' },
    { key: 'backColor', label: 'لون الظهر', type: 'color', default: '#f4f1ea', group: 'الألوان' },
    { key: 'designColor', label: 'لون التصميم', type: 'color', default: '#d6336c', group: 'الألوان', show: (p) => p.design !== 'plain' && !(p.design === 'image' && p.imageColors > 1) },
    { key: 'patternColor', label: 'لون النقش', type: 'color', default: '#9ec5e8', group: 'الألوان', show: (p) => p.design === 'pattern' && p.patternText },

    { key: 'parts', label: 'القطع', type: 'select', default: 'both', group: 'الطباعة',
      options: [{ value: 'both', label: 'الاثنتان' }, { value: 'frame', label: 'الإطار فقط' }, { value: 'back', label: 'الظهر فقط' }],
      help: 'الإطار TPU والظهر PLA — اطبع كل واحدة بمهمة منفصلة' },
    { key: 'tol', label: 'خلوص الإطار', type: 'number', min: -0.4, max: 0.8, step: 0.05, unit: 'مم', default: 0.1, group: 'تعديل دقيق',
      help: 'زِد إذا كان الكفر ضيقاً، وأنقص إذا كان رخواً' },
    { key: 'camDX', label: 'تحريك فتحة الكاميرا أفقياً', type: 'number', min: -15, max: 15, step: 0.5, unit: 'مم', default: 0, group: 'تعديل دقيق' },
    { key: 'camDY', label: 'تحريك فتحة الكاميرا عمودياً', type: 'number', min: -15, max: 15, step: 0.5, unit: 'مم', default: 0, group: 'تعديل دقيق' },
    { key: 'camGrow', label: 'توسيع فتحة الكاميرا', type: 'number', min: 0, max: 6, step: 0.25, unit: 'مم', default: 1, group: 'تعديل دقيق' },
    { key: 'keyShift', label: 'تحريك فتحات الأزرار', type: 'number', min: -20, max: 20, step: 0.5, unit: 'مم', default: 0, group: 'تعديل دقيق', help: 'موجب = للأسفل' },
    { key: 'keyGrow', label: 'إطالة فتحات الأزرار', type: 'number', min: 0, max: 15, step: 0.5, unit: 'مم', default: 2, group: 'تعديل دقيق' },
    { key: 'portW', label: 'عرض فتحة الشاحن والسماعة', type: 'number', min: 0, max: 60, step: 1, unit: 'مم', default: 24, group: 'تعديل دقيق', help: '0 = بلا فتحة' },
    { key: 'wall', label: 'سماكة الإطار', type: 'number', min: 1.2, max: 3, step: 0.1, unit: 'مم', default: 1.6, group: 'تعديل دقيق' },
    { key: 'lip', label: 'شفة الشاشة', type: 'number', min: 0.4, max: 2.5, step: 0.1, unit: 'مم', default: 1.0, group: 'تعديل دقيق', help: 'كم تغطي الحافة الأمامية من أطراف الشاشة' },
    { key: 'backT', label: 'سماكة الظهر', type: 'number', min: 1.2, max: 3, step: 0.2, unit: 'مم', default: 1.6, group: 'تعديل دقيق' },
  ],
  fonts: (p) => ((p.design === 'text' || (p.design === 'pattern' && p.patternText)) && p.text ? [p.font] : []),

  async build(p, fonts) {
    const ph = p.phone === 'manual' ? manualPhone(p) : PHONES.find((x) => x.id === p.phone) || PHONES[0];
    const { w, h, d } = ph;
    const wall = p.wall, lipT = 1.0, rimT = 1.2, backLip = 1.2, plateClr = 0.25, inlay = 0.6;
    const backT = p.backT;

    // ١) المخطّطات
    const cavity = roundRect(0, 0, w + 2 * p.tol, h + 2 * p.tol, ph.r + p.tol, 12);
    const outer = offset(cavity, wall);
    const lipOpen = offset(cavity, -p.lip);
    const backOpen = offset(cavity, -backLip);

    // الكاميرا
    const [cx0, cy0, cw, ch, cr] = ph.cam;
    let cam;
    if (cw === 'full') cam = rect(-w / 2 - 10, h / 2 - ch - p.camDY, w / 2 + 10, h / 2 + 10, 0);
    else {
      const cx = -w / 2 + cx0 + cw / 2 + p.camDX, cy = h / 2 - cy0 - ch / 2 - p.camDY;
      cam = roundRect(cx, cy, cw, ch, Math.min(cr, cw / 2, ch / 2), 10);
    }
    const camHole = offset(cam, p.camGrow);
    const camB = bounds2(camHole);

    // فتحات الأزرار (الجهة كما تُرى من الأمام؛ من الخلف تنعكس)
    const slots = resolveKeys(ph).map(([side, y0, len]) => {
      const x = side === 'R' ? -w / 2 : w / 2;
      const top = h / 2 - y0 - p.keyShift + p.keyGrow / 2, bot = top - len - p.keyGrow;
      return rect(x - wall - 4, bot, x + wall + 4, top, 0);
    });
    const port = p.portW > 0 ? rect(-p.portW / 2, -h / 2 - wall - 5, p.portW / 2, -h / 2 + 3, 0) : [];

    // ٢) الإطار (طبقات على ارتفاعات)
    const z1 = lipT, sb = 0.9, z2 = z1 + sb, z4 = z1 + d, z3 = z4 - sb, z5 = z4 + backT;
    const ring = difference(outer, cavity);
    const frameGs = [
      extrude(difference(outer, lipOpen, port), z1, 0),
      extrude(difference(ring, port), z2 - z1, z1),
      extrude(difference(ring, port, ...slots), z3 - z2, z2),
      extrude(ring, z4 - z3, z3),
      extrude(ring, backT, z4),
    ];
    // شفة خلفية مشطوفة 45° تثبّت الظهر (تُطبع بلا دعامات)
    const N = 4;
    for (let k = 1; k <= N; k++) {
      const op = offset(cavity, -(backLip * k) / N);
      frameGs.push(extrude(difference(outer, op, camHole), rimT / N, z5 + ((k - 1) * rimT) / N));
    }
    const frame = merge(frameGs);
    const ob = bounds2(outer);

    // ٣) الظهر القاسي
    const plate = difference(offset(cavity, -plateClr), camHole);
    if (!plate.length) throw new Error('فتحة الكاميرا أكبر من الظهر — صغّر التوسيع');
    const region = difference(offset(backOpen, -1.5), offset(camHole, 2));
    // مساحة التصميم المفيدة: تحت الكاميرا
    const rb = bounds2(region);
    const boxTop = Math.min(rb.maxY, camB.minY - 3), boxBot = rb.minY;
    const box = { cx: 0, cy: (boxTop + boxBot) / 2 + p.shiftY, w: rb.w, h: boxTop - boxBot };

    const layers = []; // [{name, color, shape}] من الأسفل للأعلى، لا تتداخل
    const addText = (color, halo) => {
      if (!p.text?.trim()) return;
      const f = fonts[p.font];
      const s = p.size / 100;
      const tb = p.vertical
        ? textBox(f, p.text, { height: box.w * 0.55 * s, maxWidth: box.h * s, cx: box.cx, cy: box.cy })
        : textBox(f, p.text, { height: box.h * 0.35 * s, maxWidth: box.w * s, cx: box.cx, cy: box.cy });
      let sh = union(tb.contours);
      if (p.vertical) sh = rot90(sh, box.cx, box.cy);
      sh = intersection(sh, region);
      if (halo) for (const L of layers) L.shape = difference(L.shape, offset(sh, 1.2));
      layers.push({ name: 'النص', color, shape: sh });
    };

    if (p.design === 'text') addText(p.designColor);
    else if (p.design === 'pattern') {
      const line = Math.max(1.0, p.cell * 0.14);
      layers.push({ name: 'النقش', color: p.patternText ? p.patternColor : p.designColor, shape: pattern(p.pattern, region, p.cell, line) });
      if (p.patternText) addText(p.designColor, true);
    } else if (p.design === 'image' && p.image) {
      const n = Math.round(p.imageColors);
      const im = await imageShape(p.image, { tol: p.bgTol, colors: n > 1 ? n : 0 });
      if (!im.contours.length) throw new Error('لم يُعثر على شكل في الصورة — جرّب إزالة الخلفية أو تغيير الحساسية');
      const b0 = bounds2(im.contours);
      const s = Math.min((box.w * p.size) / 100 / b0.w, (box.h * p.size) / 100 / b0.h);
      const tf = (cs) => cs.map((c) => c.map(([x, y]) => [box.cx + (x - b0.cx) * s, box.cy + (y - b0.cy) * s]));
      const shape = intersection(union(tf(im.contours)), region);
      if (n > 1) {
        const order = im.regions.map((rg, i) => ({ i, sh: intersection(union(tf(rg)), shape) })).sort((a, b) => Math.abs(absArea(a.sh)) - Math.abs(absArea(b.sh)));
        let taken = [];
        const out = [];
        for (const { i, sh } of order) {
          const own = difference(sh, taken);
          if (!own.length) continue;
          taken = union(taken, own);
          out.push({ name: `لون ${i + 1}`, color: im.palette[i], shape: own });
        }
        const rest = difference(shape, taken);
        if (rest.length && out.length) out[out.length - 1].shape = union(out[out.length - 1].shape, rest);
        layers.push(...out.reverse());
      } else layers.push({ name: 'الصورة', color: p.designColor, shape });
    }

    const raised = p.finish === 'raised';
    const design = union(...layers.map((L) => L.shape));
    const plateGs = [];
    if (raised || !design.length) plateGs.push(extrude(plate, backT, 0));
    else {
      plateGs.push(extrude(plate, backT - inlay, 0));
      const top = difference(plate, design);
      if (top.length) plateGs.push(extrude(top, inlay, backT - inlay));
    }
    const designParts = layers
      .filter((L) => L.shape.length)
      .map((L) => ({ name: L.name, color: L.color, geometry: raised ? extrude(L.shape, 0.8, backT) : extrude(L.shape, inlay, backT - inlay) }));

    // ٤) ترتيب القطع على السطح
    const gap = 8;
    const both = p.parts === 'both';
    const fx = both ? -(ob.w / 2 + gap / 2) : 0;
    const bx = both ? ob.w / 2 + gap / 2 : 0;
    const totalW = both ? ob.w * 2 + gap : ob.w;
    if (totalW > BED || ob.h > BED) throw new Error(`القطع أكبر من سطح الطباعة (${BED} مم) — اختر «الإطار فقط» أو «الظهر فقط»`);

    const parts = [];
    if (p.parts !== 'back') {
      frame.translate(fx, 0, 0);
      parts.push({ name: 'الإطار (TPU)', color: p.frameColor, geometry: frame });
    }
    if (p.parts !== 'frame') {
      const base = merge(plateGs);
      base.translate(bx, 0, 0);
      parts.push({ name: 'الظهر', color: p.backColor, geometry: base });
      for (const dp of designParts) {
        dp.geometry.translate(bx, 0, 0);
        parts.push(dp);
      }
    }
    return parts;
  },
};
