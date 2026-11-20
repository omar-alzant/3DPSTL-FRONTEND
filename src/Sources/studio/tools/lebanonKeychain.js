/* eslint-disable import/no-anonymous-default-export */
// Lebanon keychain / charm: the flag (red–white–red with the green cedar) as a flag, heart, circle or cedar shape,
// flat-inlaid in three colours, with the cedar or a name in the middle.
import { textBox } from '../lib/fonts.js';
import { cedar } from '../lib/cedar.js';
import { union, difference, intersection, offset, circle, roundRect, bounds2, extrude } from '../lib/geo.js';

function heart(size) {
  const pts = [];
  for (let i = 0; i < 160; i++) {
    const t = (i / 160) * Math.PI * 2;
    pts.push([16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]);
  }
  const b = bounds2([pts]);
  const s = size / Math.max(b.w, b.h);
  return [pts.map(([x, y]) => [(x - b.cx) * s, (y - b.cy) * s])];
}

export default {
  id: 'lebanon-keychain',
  name: 'ميدالية علم لبنان',
  description: 'ميدالية بعلم لبنان والأرزة بشكل علم أو قلب أو دائرة أو أرزة، بثلاث ألوان مدموجة، والأرزة أو اسمك بالنص. للأعياد الوطنية والمغتربين.',
  category: 'ميداليات',
  params: [
    { key: 'shape', label: 'الشكل', type: 'select', default: 'heart', group: 'الشكل',
      options: [{ value: 'flag', label: 'علم' }, { value: 'heart', label: 'قلب' }, { value: 'circle', label: 'دائرة' }, { value: 'cedar', label: 'أرزة' }] },
    { key: 'size', label: 'الحجم', type: 'number', min: 25, max: 90, step: 1, unit: 'مم', default: 45, group: 'الشكل' },
    { key: 'center', label: 'بالنص', type: 'select', default: 'cedar', group: 'الشكل', show: (p) => p.shape !== 'cedar',
      options: [{ value: 'cedar', label: 'الأرزة' }, { value: 'name', label: 'اسم' }] },
    { key: 'name', label: 'الاسم', type: 'text', default: 'لبنان', maxLength: 12, group: 'الشكل', show: (p) => p.shape !== 'cedar' && p.center === 'name' },
    { key: 'font', label: 'الخط', type: 'font', sample: ['name'], default: 'lalezar', group: 'الشكل', show: (p) => p.shape !== 'cedar' && p.center === 'name' },
    { key: 'thickness', label: 'السماكة', type: 'number', min: 2, max: 6, step: 0.1, unit: 'مم', default: 3, group: 'الشكل' },
    { key: 'ring', label: 'حلقة', type: 'checkbox', default: true, group: 'الشكل' },

    { key: 'red', label: 'الأحمر', type: 'color', default: '#d02020', group: 'الألوان' },
    { key: 'white', label: 'الأبيض', type: 'color', default: '#f5f5f5', group: 'الألوان' },
    { key: 'green', label: 'الأخضر (الأرزة / الاسم)', type: 'color', default: '#1f8a3b', group: 'الألوان' },
  ],
  fonts: (p) => (p.shape !== 'cedar' && p.center === 'name' && p.name?.trim() ? [p.font] : []),
  build(p, fonts) {
    const S = p.size;
    let outline;
    if (p.shape === 'flag') outline = roundRect(0, 0, S * 1.5, S, 2);
    else if (p.shape === 'heart') outline = heart(S);
    else if (p.shape === 'circle') outline = circle(0, 0, S / 2, 96);
    else outline = offset(union(cedar(0, -S / 2, S)), 1.4); // cedar silhouette with a small border
    const ob = bounds2(outline);

    let red, white, green;
    if (p.shape === 'cedar') {
      green = offset(union(cedar(0, -S / 2, S)), 0); // green cedar on a red outline
      red = difference(outline, green);
      white = [];
    } else {
      // flag stripes 1 : 2 : 1, cedar as tall as the white band (touching the red, like the real flag)
      const band = ob.h / 4;
      const midTop = ob.maxY - band, midBot = ob.minY + band;
      const full = roundRect(ob.cx, ob.cy, ob.w + 2, ob.h + 2, 0);
      const middle = roundRect(ob.cx, (midTop + midBot) / 2, ob.w + 2, midTop - midBot, 0);
      white = intersection(middle, outline);
      red = intersection(difference(full, middle), outline);
      if (p.center === 'name' && p.name?.trim()) {
        const tb = textBox(fonts[p.font], p.name.trim(), { height: (midTop - midBot) * 0.75, maxWidth: ob.w * 0.8, cx: ob.cx, cy: (midTop + midBot) / 2 });
        green = intersection(union(tb.contours), white);
      } else {
        const ch = (midTop - midBot) * 1.28;
        green = intersection(union(cedar(ob.cx, midBot - (ch - (midTop - midBot)) / 2, ch)), offset(outline, -0.8));
      }
      white = difference(white, green);
      red = difference(red, green);
    }

    let body = outline;
    let hole = [];
    if (p.ring) {
      const R = 4.6;
      const top = p.shape === 'flag' ? [ob.minX, ob.maxY] : [ob.cx, ob.maxY];
      const [cx, cy] = p.shape === 'flag' ? [top[0] + 1.5, top[1] + 1.5] : [top[0], top[1] + R * 0.45];
      body = union(outline, circle(cx, cy, R, 40));
      hole = circle(cx, cy, 2.2, 32);
      red = difference(union(red, difference(circle(cx, cy, R, 40), outline)), hole);
    }

    const T = p.thickness;
    const top = 0.6;
    const parts = [{ name: 'القاعدة', color: p.red, geometry: extrude(difference(body, hole), T - top, 0) }];
    const add = (name, color, sh) => { if (sh?.length) parts.push({ name, color, geometry: extrude(sh, top, T - top) }); };
    add('الأحمر', p.red, red);
    add('الأبيض', p.white, white);
    add('الأخضر', p.green, green);
    return parts.filter((x) => x.geometry);
  },
};
