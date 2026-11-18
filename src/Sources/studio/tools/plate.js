/* eslint-disable import/no-anonymous-default-export, no-unused-vars */
import { textBox } from '../lib/fonts.js';
import { union, difference, roundRect, frame, circle, extrude } from '../lib/geo.js';

// حروف اللوحات السعودية: لاتيني ← عربي
const KSA = { A: 'ا', B: 'ب', J: 'ح', D: 'د', R: 'ر', S: 'س', X: 'ص', T: 'ط', E: 'ع', G: 'ق', K: 'ك', L: 'ل', Z: 'م', N: 'ن', H: 'هـ', U: 'و', V: 'ى' };
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = (s) => s.replace(/[0-9]/g, (d) => AR_DIGITS[+d]);

export default {
  id: 'plate-keychain',
  name: 'ميدالية لوحة سعودية',
  description: 'لوحة سعودية مصغّرة بأرقامك وحروفك — الحروف والأرقام العربية تُكتب تلقائياً.',
  category: 'سيارات',
  params: [
    { key: 'digits', label: 'الأرقام', type: 'text', default: '3754', group: 'اللوحة', dir: 'ltr', maxLength: 7 },
    { key: 'letters', label: 'الحروف (إنجليزي)', type: 'text', default: 'JLV', group: 'اللوحة', dir: 'ltr', maxLength: 3,
      help: 'تُحوَّل تلقائياً للحروف العربية' },
    { key: 'font', label: 'الخط', type: 'font', default: 'lalezar', group: 'اللوحة' },
    { key: 'width', label: 'عرض اللوحة', type: 'number', min: 35, max: 90, step: 1, unit: 'مم', default: 52, group: 'الأبعاد' },
    { key: 'thickness', label: 'السماكة', type: 'number', min: 1.5, max: 5, step: 0.1, unit: 'مم', default: 2.4, group: 'الأبعاد' },
    { key: 'textHeight', label: 'ارتفاع البروز', type: 'number', min: 0.4, max: 2, step: 0.1, unit: 'مم', default: 0.8, group: 'الأبعاد' },
    { key: 'ring', label: 'حلقة التعليق', type: 'checkbox', default: true, group: 'الأبعاد' },
    { key: 'baseColor', label: 'لون اللوحة', type: 'color', default: '#c9ccd1', group: 'الألوان' },
    { key: 'textColor', label: 'لون الكتابة', type: 'color', default: '#1d1f24', group: 'الألوان' },
  ],
  fonts: (p) => [p.font],
  build(p, fonts) {
    const f = fonts[p.font];
    const W = p.width;
    const digits = (p.digits || '').replace(/[^0-9]/g, '');
    const letters = (p.letters || '').toUpperCase().replace(/[^A-Z]/g, '');
    const raised = [];
    let H, base;

    {
      H = W * 0.5;
      base = roundRect(0, 0, W, H, 2.2);
      const fw = Math.max(0.8, W * 0.022);
      const line = fw * 0.8;
      raised.push(frame(0, 0, W, H, 2.2, fw));
      const stripW = W * 0.14;
      const sx = W / 2 - fw - stripW; // بداية شريط KSA
      const innerL = -W / 2 + fw;
      const midX = (innerL + sx) / 2;
      raised.push(roundRect(sx, 0, line, H - 2 * fw, 0)); // فاصل الشريط
      raised.push(roundRect(midX, 0, line, H - 2 * fw, 0)); // فاصل الأرقام/الحروف
      raised.push(roundRect((innerL + sx) / 2, 0, sx - innerL, line, 0)); // الخط الأفقي
      const cellW = (sx - innerL) / 2 - 2 * line;
      const rowH = (H - 2 * fw) / 2;
      const th = rowH * 0.62;
      const lx = (innerL + midX) / 2, rx = (midX + sx) / 2;
      const ty = rowH / 2, by = -rowH / 2;
      const arLetters = [...letters].map((c) => KSA[c] || '').filter(Boolean).join(' ');
      raised.push(textBox(f, toArabicDigits(digits), { height: th, cx: lx, cy: ty, maxWidth: cellW }).contours);
      raised.push(textBox(f, digits, { height: th, cx: lx, cy: by, maxWidth: cellW }).contours);
      raised.push(textBox(f, arLetters, { height: th, cx: rx, cy: ty, maxWidth: cellW }).contours);
      raised.push(textBox(f, [...letters].join(' '), { height: th, cx: rx, cy: by, maxWidth: cellW }).contours);
      const scx = sx + stripW / 2 + line / 2;
      const ksaH = (H - 2 * fw) / 3;
      ['K', 'S', 'A'].forEach((ch, i) =>
        raised.push(textBox(f, ch, { height: ksaH * 0.5, cx: scx, cy: ksaH - i * ksaH - ksaH * 0.05 }).contours)
      );
    }

    let plate = base;
    if (p.ring) {
      const R = H * 0.17;
      const cx = W / 2 + R * 0.55;
      plate = difference(union(base, circle(cx, 0, R)), circle(cx, 0, R * 0.48));
    }
    const text = union(...raised);
    return [
      { name: 'اللوحة', color: p.baseColor, geometry: extrude(plate, p.thickness, 0) },
      { name: 'الكتابة', color: p.textColor, geometry: extrude(text, p.textHeight, p.thickness) },
    ].filter((x) => x.geometry);
  },
};
