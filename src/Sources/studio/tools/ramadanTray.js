/* eslint-disable import/no-anonymous-default-export */
// Ramadan tray: a tray for dates / sweets (rectangle, oval or crescent) with optional dividers,
// and a standing sign ("رمضان كريم" + a family name) that slots into the back of the tray.
import { textBox } from '../lib/fonts.js';
import { union, difference, intersection, offset, circle, roundRect, bounds2, extrude } from '../lib/geo.js';

function ellipse(w, h, seg = 128) {
  const pts = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push([(Math.cos(a) * w) / 2, (Math.sin(a) * h) / 2]);
  }
  return [pts];
}
function crescent(cx, cy, r) {
  return difference(circle(cx, cy, r, 96), circle(cx + r * 0.42, cy + r * 0.18, r * 0.84, 96));
}
function star(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return [pts];
}

export default {
  id: 'ramadan-tray',
  name: 'صينية رمضان',
  description: 'صينية للتمر أو الحلو بشكل مستطيل أو بيضاوي أو هلال، مع فواصل اختيارية ولافتة واقفة «رمضان كريم» واسم العيلة تتركّب ورا الصينية.',
  category: 'مناسبات',
  params: [
    { key: 'shape', label: 'شكل الصينية', type: 'select', default: 'rect', group: 'الصينية',
      options: [{ value: 'rect', label: 'مستطيل' }, { value: 'oval', label: 'بيضاوي' }, { value: 'crescent', label: 'هلال' }] },
    { key: 'length', label: 'الطول', type: 'number', min: 100, max: 230, step: 1, unit: 'مم', default: 180, group: 'الصينية' },
    { key: 'width', label: 'العرض', type: 'number', min: 60, max: 160, step: 1, unit: 'مم', default: 110, group: 'الصينية', show: (p) => p.shape !== 'crescent' },
    { key: 'wallH', label: 'ارتفاع الحافة', type: 'number', min: 8, max: 40, step: 1, unit: 'مم', default: 18, group: 'الصينية' },
    { key: 'wall', label: 'سماكة الحافة', type: 'number', min: 1.6, max: 4, step: 0.1, unit: 'مم', default: 2.4, group: 'الصينية' },
    { key: 'dividers', label: 'عدد الفواصل', type: 'number', min: 0, max: 5, step: 1, default: 2, group: 'الصينية', show: (p) => p.shape !== 'crescent' },

    { key: 'sign', label: 'لافتة واقفة', type: 'checkbox', default: true, group: 'اللافتة' },
    { key: 'text1', label: 'الكتابة', type: 'text', default: 'رمضان كريم', maxLength: 20, group: 'اللافتة', show: (p) => p.sign },
    { key: 'text2', label: 'السطر الثاني (اسم العيلة)', type: 'text', default: 'عائلة زنط', maxLength: 24, group: 'اللافتة', show: (p) => p.sign },
    { key: 'font', label: 'الخط', type: 'font', sample: ['text1', 'text2'], default: 'ruqaa', group: 'اللافتة', show: (p) => p.sign },
    { key: 'signH', label: 'ارتفاع اللافتة', type: 'number', min: 40, max: 120, step: 1, unit: 'مم', default: 70, group: 'اللافتة', show: (p) => p.sign },
    { key: 'decor', label: 'هلال ونجمة', type: 'checkbox', default: true, group: 'اللافتة', show: (p) => p.sign },

    { key: 'trayColor', label: 'لون الصينية', type: 'color', default: '#f5f5f5', group: 'الألوان' },
    { key: 'signColor', label: 'لون اللافتة', type: 'color', default: '#f5f5f5', group: 'الألوان', show: (p) => p.sign },
    { key: 'textColor', label: 'لون الكتابة', type: 'color', default: '#c9a227', group: 'الألوان', show: (p) => p.sign },
  ],
  fonts: (p) => (p.sign && (p.text1?.trim() || p.text2?.trim()) ? [p.font] : []),
  build(p, fonts) {
    const L = p.length;
    const Wd = p.shape === 'crescent' ? L * 0.62 : p.width;
    const outer = p.shape === 'rect' ? roundRect(0, 0, L, Wd, 14) : p.shape === 'oval' ? ellipse(L, Wd) : crescent(0, 0, L / 2);
    const inner = offset(outer, -p.wall);
    const floorT = 2;
    const ob = bounds2(outer);

    // slot for the sign's tab, near the back wall
    const signW = Math.min(L * 0.7, 140);
    const tabW = Math.min(30, signW * 0.3);
    const signT = 3;
    let slot = [];
    if (p.sign) {
      if (p.shape === 'crescent') {
        // the thick middle of the crescent's band, the sign faces the hollow
        const r = L / 2;
        const sx = -r + (0.58 * r) / 2;
        slot = roundRect(sx, 0, signT + 0.5, tabW + 0.6, 0.3);
      } else {
        slot = roundRect(0, ob.maxY - p.wall - signT / 2 - 3, tabW + 0.6, signT + 0.5, 0.3);
      }
      if (difference(slot, offset(inner, -1)).length) throw new Error('ما في محل للافتة بهالشكل — كبّر الصينية');
    }

    const parts = [
      { name: 'أرضية الصينية', color: p.trayColor, geometry: extrude(difference(outer, slot), floorT, 0) },
      { name: 'حافة الصينية', color: p.trayColor, geometry: extrude(difference(outer, inner), p.wallH, floorT) },
    ];
    if (p.shape !== 'crescent' && p.dividers > 0) {
      const n = Math.round(p.dividers);
      const ib = bounds2(inner);
      let divs = [];
      for (let i = 1; i <= n; i++) {
        const x = ib.minX + (ib.w * i) / (n + 1);
        divs = union(divs, roundRect(x, ib.cy, 2, ib.h + 2, 0));
      }
      divs = intersection(divs, inner);
      parts.push({ name: 'الفواصل', color: p.trayColor, geometry: extrude(divs, p.wallH * 0.75, floorT) });
    }

    if (p.sign) {
      // the sign is built at the origin (an arch with raised lettering and a tab at the bottom),
      // then laid flat wherever it fits on the bed next to the tray
      const H = p.signH;
      const body = union(roundRect(0, -H / 2 + H * 0.3, signW, H * 0.6, 6), ellipse(signW, H * 0.8).map((c) => c.map(([x, y]) => [x, y + H * 0.1])));
      const sb = bounds2(body);
      const tab = roundRect(0, sb.minY - 6, tabW, 12.5, 0);
      let ink = [];
      const lines = [p.text1, p.text2].map((t) => (t || '').trim()).filter(Boolean);
      const area = { top: sb.maxY - (p.decor ? H * 0.27 : 7), bottom: sb.minY + 4 };
      const avail = area.top - area.bottom;
      lines.forEach((line, i) => {
        const h = lines.length === 2 ? (i === 0 ? avail * 0.55 : avail * 0.38) : avail * 0.7;
        const cy = lines.length === 2 ? (i === 0 ? area.top - h / 2 : area.bottom + h / 2) : (area.top + area.bottom) / 2;
        const tb = textBox(fonts[p.font], line, { height: h * 0.95, maxWidth: signW * 0.88, cx: 0, cy });
        ink = union(ink, tb.contours);
      });
      if (p.decor) {
        const r = H * 0.13;
        ink = union(ink, crescent(-r * 0.4, sb.maxY - H * 0.17, r), star(r * 0.95, sb.maxY - H * 0.15, r * 0.42));
      }
      ink = intersection(ink, offset(body, -2));
      const sign = union(body, tab);

      // candidate spots: below the tray, beside it (turned), inside the crescent's hollow
      const tf = (cs, dx, dy, rot) => cs.map((c) => c.map(([x, y]) => (rot ? [-y + dx, x + dy] : [x + dx, y + dy])));
      const local = bounds2(sign);
      const cands = [
        [0, ob.minY - 12 - local.maxY, false],
        [ob.maxX + 12 + local.maxY, ob.cy, true],
        [ob.minX - 12 + local.minY, ob.cy, true],
      ];
      if (p.shape === 'crescent') {
        const r = L / 2;
        cands.unshift([r * 0.42 + r * 0.18, r * 0.18 - local.cy, false], [r * 0.5, r * 0.18, true]);
      }
      const keepOff = offset(outer, 5);
      let spot = null;
      for (const [dx, dy, rot] of cands) {
        const placed = tf(sign, dx, dy, rot);
        if (intersection(placed, keepOff).length) continue;
        const all = bounds2([...outer, ...placed]);
        if (all.w <= 250 && all.h <= 250) { spot = [dx, dy, rot]; break; }
      }
      if (!spot) throw new Error('الصينية واللافتة ما بيوسعوا على سطح الطابعة سوا — صغّر الصينية أو اللافتة');
      parts.push({ name: 'اللافتة', color: p.signColor, geometry: extrude(tf(sign, ...spot), signT, 0) });
      if (ink.length) parts.push({ name: 'كتابة اللافتة', color: p.textColor, geometry: extrude(tf(ink, ...spot), 1, signT) });
    }
    return parts.filter((x) => x.geometry);
  },
};
