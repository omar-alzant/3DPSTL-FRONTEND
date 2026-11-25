/* eslint-disable import/no-anonymous-default-export, no-unused-vars */
import { shapeText } from '../lib/fonts.js';
import { union, offset, roundRect, bounds2, extrude, subtract, THREE } from '../lib/geo.js';

export default {
  id: 'pencil-topper',
  name: 'رأس قلم بالاسم',
  description: 'قطعة باسم الطالب تُركّب على القلم، مع فتحة دائرية أو سداسية بمقاس القلم.',
  category: 'مدرسي',
  params: [
    { key: 'text', label: 'الاسم', type: 'text', default: 'سلطان', group: 'النص' },
    { key: 'font', label: 'الخط', type: 'font', default: 'lalezar', group: 'النص' },
    { key: 'size', label: 'حجم الخط', type: 'number', min: 10, max: 40, step: 0.5, unit: 'مم', default: 20, group: 'النص' },
    { key: 'spacing', label: 'تباعد الحروف', type: 'number', min: -2, max: 4, step: 0.1, unit: 'مم', default: 0, group: 'النص' },
    { key: 'textHeight', label: 'ارتفاع النص', type: 'number', min: 0.4, max: 4, step: 0.1, unit: 'مم', default: 1.2, group: 'النص' },
    { key: 'border', label: 'سماكة الإطار', type: 'number', min: 1, max: 6, step: 0.1, unit: 'مم', default: 2.2, group: 'الجسم' },
    { key: 'pencil', label: 'قطر القلم', type: 'number', min: 5, max: 12, step: 0.1, unit: 'مم', default: 7.4, group: 'فتحة القلم' },
    { key: 'shape', label: 'شكل الفتحة', type: 'select', default: 'hex', group: 'فتحة القلم',
      options: [{ value: 'hex', label: 'سداسي' }, { value: 'round', label: 'دائري' }] },
    { key: 'tolerance', label: 'سماحية', type: 'number', min: 0, max: 1, step: 0.05, unit: 'مم', default: 0.3, group: 'فتحة القلم' },
    { key: 'wall', label: 'سماكة الجدار', type: 'number', min: 1, max: 4, step: 0.1, unit: 'مم', default: 1.8, group: 'فتحة القلم' },
    { key: 'depth', label: 'عمق الفتحة', type: 'number', min: 20, max: 100, step: 5, unit: '%', default: 100, group: 'فتحة القلم' },
    { key: 'baseColor', label: 'لون الجسم', type: 'color', default: '#2f8cff', group: 'الألوان' },
    { key: 'textColor', label: 'لون النص', type: 'color', default: '#e8f1ff', group: 'الألوان' },
  ],
  fonts: (p) => [p.font],
  build(p, fonts) {
    if (!String(p.text || '').trim()) throw new Error('اكتب الاسم');
    const glyphs = union(shapeText(fonts[p.font], p.text, p.size, { spacing: p.spacing }).contours);
    const outline = offset(glyphs, p.border);
    const b = bounds2(outline);
    const hole = p.pencil + p.tolerance;
    const D = hole + 2 * p.wall; // سماكة الجسم وارتفاع الشريط
    // شريط متصل أسفل الاسم يمرّ فيه القلم
    const barY = b.minY + D / 2;
    const bar = roundRect(b.cx, barY, b.w, D, D / 2);
    const body = union(outline, bar);
    let bodyG = extrude(body, D, 0);
    const bb = bounds2(body);

    const len = (bb.w * p.depth) / 100;
    const r = p.shape === 'hex' ? hole / 2 / Math.cos(Math.PI / 6) : hole / 2;
    const cyl = new THREE.CylinderGeometry(r, r, len + 1, p.shape === 'hex' ? 6 : 40);
    cyl.rotateZ(Math.PI / 2);
    if (p.shape === 'hex') cyl.rotateX(Math.PI / 6);
    // الفتحة تبدأ من الطرف الأيسر (نهاية الاسم العربي)
    cyl.translate(bb.minX - 0.5 + (len + 1) / 2, barY, D / 2);
    bodyG = subtract(bodyG, cyl);

    return [
      { name: 'الجسم', color: p.baseColor, geometry: bodyG },
      { name: 'النص', color: p.textColor, geometry: extrude(glyphs, p.textHeight, D) },
    ].filter((x) => x.geometry);
  },
};
