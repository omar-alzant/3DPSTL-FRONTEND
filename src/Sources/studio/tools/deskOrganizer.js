/* eslint-disable import/no-anonymous-default-export */
// Desk organizer: a box with compartments and a name on the front (and optionally the back).
import { textBox } from '../lib/fonts.js';
import { union, difference, intersection, offset, roundRect, bounds2, extrude } from '../lib/geo.js';

export default {
  id: 'desk-organizer',
  name: 'منظّم مكتب بالاسم',
  description: 'منظّم أقلام وأغراض للمكتب بعدّة أقسام، والاسم بارز على الواجهة (ومن الخلف إذا بدك). هدية حلوة للمعلّم والموظّف والطالب.',
  category: 'مدرسي',
  params: [
    { key: 'name', label: 'الاسم', type: 'text', default: 'Omar', maxLength: 20, group: 'الاسم' },
    { key: 'font', label: 'الخط', type: 'font', sample: ['name'], default: 'lilita', group: 'الاسم' },
    { key: 'back', label: 'الاسم من الخلف كمان', type: 'checkbox', default: false, group: 'الاسم' },
    { key: 'textDepth', label: 'بروز الاسم', type: 'number', min: 0.6, max: 3, step: 0.1, unit: 'مم', default: 1.2, group: 'الاسم' },

    { key: 'length', label: 'الطول', type: 'number', min: 80, max: 230, step: 1, unit: 'مم', default: 150, group: 'المقاس' },
    { key: 'depth', label: 'العمق', type: 'number', min: 40, max: 140, step: 1, unit: 'مم', default: 70, group: 'المقاس' },
    { key: 'height', label: 'الارتفاع', type: 'number', min: 30, max: 140, step: 1, unit: 'مم', default: 70, group: 'المقاس' },
    { key: 'cells', label: 'عدد الأقسام', type: 'number', min: 1, max: 6, step: 1, default: 3, group: 'المقاس' },
    { key: 'wall', label: 'سماكة الجدار', type: 'number', min: 1.6, max: 4, step: 0.1, unit: 'مم', default: 2, group: 'المقاس' },

    { key: 'boxColor', label: 'لون المنظّم', type: 'color', default: '#1e5bd8', group: 'الألوان' },
    { key: 'textColor', label: 'لون الاسم', type: 'color', default: '#f5f5f5', group: 'الألوان' },
  ],
  fonts: (p) => (p.name?.trim() ? [p.font] : []),
  build(p, fonts) {
    const L = p.length, D = p.depth, H = p.height, w = p.wall;
    const outer = roundRect(0, 0, L, D, 8);
    const inner = offset(outer, -w);
    const floorT = 2;
    const parts = [
      { name: 'القاعدة', color: p.boxColor, geometry: extrude(outer, floorT, 0) },
      { name: 'الجدران', color: p.boxColor, geometry: extrude(difference(outer, inner), H - floorT, floorT) },
    ];
    const n = Math.round(p.cells);
    if (n > 1) {
      const ib = bounds2(inner);
      let divs = [];
      for (let i = 1; i < n; i++) divs = union(divs, roundRect(ib.minX + (ib.w * i) / n, 0, w, D, 0));
      parts.push({ name: 'الفواصل', color: p.boxColor, geometry: extrude(intersection(divs, inner), H * 0.8 - floorT, floorT) });
    }
    if (p.name?.trim()) {
      const tb = textBox(fonts[p.font], p.name.trim(), { height: H * 0.42, maxWidth: (L - 16) * 0.9, cx: 0, cy: 0 });
      if (!tb.contours.length) throw new Error('ما قدرنا نرسم الاسم بهالخط');
      const face = (backSide) => {
        const g = extrude(union(tb.contours), p.textDepth, 0);
        g.rotateX(Math.PI / 2); // text stands up on the front wall: (x, y, z) → (x, -z, y)
        if (backSide) g.rotateZ(Math.PI);
        g.translate(0, backSide ? D / 2 : -D / 2, H / 2);
        return g;
      };
      parts.push({ name: 'الاسم', color: p.textColor, geometry: face(false) });
      if (p.back) parts.push({ name: 'الاسم (خلف)', color: p.textColor, geometry: face(true) });
    }
    return parts.filter((x) => x.geometry);
  },
};
