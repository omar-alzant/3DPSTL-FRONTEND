/* eslint-disable import/no-anonymous-default-export, no-unused-vars */
import { textBox } from '../lib/fonts.js';
import { union, difference, roundRect, frame, circle, extrude, bounds2 } from '../lib/geo.js';
import { cedar } from '../lib/cedar.js';
import { traceImage } from '../lib/trace.js';

const isBrand = (p) => p.variant === 'brand';

export default {
  id: 'lebanese-plate',
  name: 'لوحة سيارة لبنانية',
  description: 'لوحة لبنانية بالأرزة والحرف والرقم، مع اسم اختياري — أو اسم شركة مع شعارها بجانبه.',
  category: 'سيارات',
  params: [
    { key: 'variant', label: 'الشكل', type: 'select', default: 'name', group: 'اللوحة',
      options: [{ value: 'name', label: 'اسم (اختياري)' }, { value: 'brand', label: 'اسم + شعار' }] },
    { key: 'letter', label: 'الحرف', type: 'text', default: 'B', group: 'اللوحة', dir: 'ltr', maxLength: 2 },
    { key: 'digits', label: 'الرقم', type: 'text', default: '193180', group: 'اللوحة', dir: 'ltr', maxLength: 7 },
    { key: 'name', label: 'الاسم فوق الرقم', type: 'text', default: '3DSTL', group: 'اللوحة', maxLength: 30,
      help: 'اتركه فارغاً ليكبر الرقم ويتوسّط اللوحة' },
    { key: 'logo', label: 'الشعار', type: 'image', samplePic: 'drawing', default: '', group: 'الشعار', show: isBrand,
      help: 'PNG أو SVG بخلفية شفافة أو بيضاء. استخدم شعاراً تملك حق طباعته' },
    { key: 'logoSize', label: 'حجم الشعار', type: 'number', min: 4, max: 14, step: 0.5, unit: 'مم', default: 8, group: 'الشعار', show: isBrand },
    { key: 'threshold', label: 'حساسية التحويل', type: 'number', min: 10, max: 90, step: 1, unit: '%', default: 50, group: 'الشعار', show: isBrand },
    { key: 'invert', label: 'عكس (للشعار الفاتح على خلفية داكنة)', type: 'checkbox', default: false, group: 'الشعار', show: isBrand },
    { key: 'panelTop', label: 'أعلى المربع', type: 'text', default: 'لبنان', group: 'المربع الأزرق', maxLength: 12 },
    { key: 'panelBottom', label: 'أسفل المربع', type: 'text', default: 'خصوصي', group: 'المربع الأزرق', maxLength: 12 },
    { key: 'showCedar', label: 'الأرزة', type: 'checkbox', default: true, group: 'المربع الأزرق' },
    { key: 'font', label: 'خط الرقم', type: 'font', sample: ['letter', 'digits'], default: 'cairo', group: 'الخطوط' },
    { key: 'nameFont', label: 'خط الاسم والمربع', type: 'font', sample: ['name', 'panelTop', 'panelBottom'], default: 'cairo', group: 'الخطوط' },
    { key: 'width', label: 'طول اللوحة', type: 'number', min: 50, max: 200, step: 0.5, unit: 'مم', default: 91.6, group: 'الأبعاد' },
    { key: 'thickness', label: 'السماكة', type: 'number', min: 1.5, max: 6, step: 0.1, unit: 'مم', default: 3, group: 'الأبعاد' },
    { key: 'textHeight', label: 'بروز الكتابة', type: 'number', min: 0.4, max: 2, step: 0.1, unit: 'مم', default: 1, group: 'الأبعاد' },
    { key: 'border', label: 'إطار', type: 'checkbox', default: true, group: 'الأبعاد' },
    { key: 'ring', label: 'حلقة تعليق (ميدالية)', type: 'checkbox', default: false, group: 'الأبعاد' },
    { key: 'baseColor', label: 'لون اللوحة', type: 'color', default: '#f4f4f2', group: 'الألوان' },
    { key: 'textColor', label: 'لون الكتابة', type: 'color', default: '#141414', group: 'الألوان' },
    { key: 'panelColor', label: 'لون المربع', type: 'color', default: '#1d4fb8', group: 'الألوان' },
    { key: 'panelTextColor', label: 'لون الأرزة وكتابة المربع', type: 'color', default: '#ffffff', group: 'الألوان' },
    { key: 'logoColor', label: 'لون الشعار', type: 'color', default: '#141414', group: 'الألوان', show: isBrand },
  ],
  fonts: (p) => [p.font, p.nameFont],
  async build(p, fonts) {
    const f = fonts[p.font], nf = fonts[p.nameFont];
    const W = p.width, H = W * 0.295;
    const T = p.thickness, R = p.textHeight;
    const fw = p.border ? Math.max(0.6, W * 0.009) : 0;
    const inlay = Math.min(0.6, T - 0.8);

    let base = roundRect(0, 0, W, H, H * 0.06);
    let hole = null;
    if (p.ring) {
      const r = H * 0.2, cx = W / 2 + r * 0.5;
      hole = circle(cx, 0, r * 0.45);
      base = difference(union(base, circle(cx, 0, r)), hole);
    }

    // المربع الأزرق
    const panelW = W * 0.215;
    const sepW = W * 0.015;
    const px0 = -W / 2 + fw, px1 = -W / 2 + panelW;
    const pcx = (px0 + px1) / 2, pw = px1 - px0, ph = H - 2 * fw;
    const panel = roundRect(pcx, 0, pw, ph, fw ? 0 : H * 0.06);
    const white = [];
    if (p.panelTop?.trim()) white.push(textBox(nf, p.panelTop, { height: H * 0.13, maxWidth: pw * 0.8, cx: pcx, cy: H / 2 - fw - H * 0.14 }).contours);
    if (p.panelBottom?.trim()) white.push(textBox(nf, p.panelBottom, { height: H * 0.13, maxWidth: pw * 0.8, cx: pcx, cy: -H / 2 + fw + H * 0.14 }).contours);
    if (p.showCedar) white.push(cedar(pcx, -H * 0.225, H * 0.45));
    const whiteShape = union(...white);

    // الكتابة السوداء: الإطار والفاصل والرقم والاسم
    const black = [];
    if (fw) black.push(frame(0, 0, W, H, H * 0.06, fw));
    black.push(roundRect(px1 + sepW / 2, 0, sepW, H - 2 * fw, 0));
    const mx0 = px1 + sepW, mx1 = W / 2 - fw;
    const mcx = (mx0 + mx1) / 2, mw = mx1 - mx0;
    const number = `${(p.letter || '').toUpperCase().trim()} ${(p.digits || '').trim()}`.trim();
    const name = (p.name || '').trim();

    let logo = [];
    if (isBrand(p) && p.logo) {
      const tr = await traceImage(p.logo, { threshold: p.threshold, invert: p.invert });
      const b = bounds2(tr.contours);
      if (b.h) {
        const s = p.logoSize / Math.max(b.h, b.w * 0.6);
        logo = tr.contours.map((c) => c.map(([x, y]) => [(x - b.cx) * s, (y - b.cy) * s]));
      }
    }
    const hasTop = name || logo.length;

    if (number) {
      black.push(
        textBox(f, number, hasTop
          ? { height: H * 0.4, maxWidth: mw * 0.9, cx: mcx, cy: -H * 0.16, dir: 'ltr' }
          : { height: H * 0.52, maxWidth: mw * 0.9, cx: mcx, cy: 0, dir: 'ltr' }).contours
      );
    }
    let logoShape = [];
    if (hasTop) {
      const lineY = H * 0.25;
      const t = name ? textBox(nf, name, { height: H * 0.17, maxWidth: mw * (logo.length ? 0.68 : 0.88), cx: 0, cy: 0 }) : { contours: [], w: 0 };
      const lb = bounds2(logo);
      const gap = logo.length && name ? 2 : 0;
      const total = t.w + gap + lb.w;
      // الشعار على يمين الاسم (بداية السطر العربي)
      const nameCx = mcx - total / 2 + t.w / 2;
      const logoCx = mcx + total / 2 - lb.w / 2;
      black.push(t.contours.map((c) => c.map(([x, y]) => [x + nameCx, y + lineY])));
      if (logo.length) logoShape = logo.map((c) => c.map(([x, y]) => [x - lb.cx + logoCx, y - lb.cy + lineY]));
    }
    const blackShape = union(...black);

    const parts = [
      { name: 'اللوحة', color: p.baseColor, geometry: extrude(base, T - inlay, 0) },
      { name: 'اللوحة (الطبقة العليا)', color: p.baseColor, geometry: extrude(difference(base, panel), inlay, T - inlay) },
      { name: 'المربع', color: p.panelColor, geometry: extrude(difference(panel, whiteShape), inlay, T - inlay) },
      { name: 'الأرزة وكتابة المربع', color: p.panelTextColor, geometry: extrude(whiteShape, inlay + R, T - inlay) },
      { name: 'الكتابة', color: p.textColor, geometry: extrude(difference(blackShape, panel), R, T) },
      { name: 'الشعار', color: p.logoColor, geometry: extrude(difference(logoShape, blackShape), R, T) },
    ];
    return parts.filter((x) => x.geometry);
  },
};
