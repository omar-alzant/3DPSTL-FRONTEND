/* eslint-disable import/no-anonymous-default-export */
// 3D QR code: a link, Wi-Fi login, WhatsApp, Instagram or any text → a printable two-colour plate.
// Flat two-colour (inlay) scans best: the code is level with the plate, so no shadows.
import QRCode from 'qrcode';
import { shapeText } from '../lib/fonts.js';
import { traceImage } from '../lib/trace.js';
import { THREE, union, difference, offset, circle, roundRect, bounds2, extrude, subtract } from '../lib/geo.js';

const MIN_MODULE = 1.2; // mm — smaller squares don't print cleanly with a 0.4 mm nozzle

const wifiEscape = (s) => String(s || '').replace(/([\\;,:"])/g, '\\$1');

/** the text that goes inside the QR code */
export function qrPayload(p) {
  switch (p.kind) {
    case 'wifi': {
      if (!p.ssid?.trim()) throw new Error('اكتب اسم شبكة الـ Wi-Fi');
      const sec = p.security === 'nopass' ? 'nopass' : p.security;
      const pass = sec === 'nopass' ? '' : `P:${wifiEscape(p.password)};`;
      return `WIFI:T:${sec};S:${wifiEscape(p.ssid.trim())};${pass}${p.hidden ? 'H:true;' : ''};`;
    }
    case 'whatsapp': {
      const digits = String(p.phone || '').replace(/\D/g, '');
      if (digits.length < 7) throw new Error('اكتب رقم الواتساب مع رمز البلد (مثل 96170123456)');
      return `https://wa.me/${digits}${p.message?.trim() ? `?text=${encodeURIComponent(p.message.trim())}` : ''}`;
    }
    case 'instagram': {
      const handle = String(p.handle || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '');
      if (!handle) throw new Error('اكتب اسم الحساب على Instagram');
      return `https://instagram.com/${handle}`;
    }
    case 'text':
      if (!p.text?.trim()) throw new Error('اكتب النص');
      return p.text.trim();
    case 'link':
    default: {
      let url = String(p.url || '').trim();
      if (!url) throw new Error('اكتب الرابط');
      if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
      return url;
    }
  }
}

/** dark modules as contours (mm), QR centred on 0,0; each row's dark run is one rectangle */
function qrContours(payload, size, ecc, soft) {
  const qr = QRCode.create(payload, { errorCorrectionLevel: ecc });
  const n = qr.modules.size;
  const m = size / n;
  if (m < MIN_MODULE) {
    throw new Error(`الكود كثيف على هالحجم (كل مربع ${m.toFixed(2)} مم) — كبّر الحجم لـ ${Math.ceil(MIN_MODULE * n)} مم أو قصّر النص`);
  }
  const x = (c) => -size / 2 + c * m;
  const y = (r) => size / 2 - r * m;
  const rects = [];
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.modules.get(r, c)) { c++; continue; }
      const start = c;
      while (c < n && qr.modules.get(r, c)) c++;
      rects.push([[x(start), y(r + 1)], [x(c), y(r + 1)], [x(c), y(r)], [x(start), y(r)]]);
    }
  }
  let dark = union(rects);
  if (soft) dark = offset(offset(dark, -m * 0.22), m * 0.22); // rounded corners, still scans
  return { dark, n, m };
}

// a stand for the plate: a low wedge with a slot that holds the plate leaning back a little.
// It is laid on the bed in front of the plate.
function stand(width, thick, slot, plateBottom) {
  const W = Math.max(40, width);
  const D = Math.max(36, thick * 7);
  const H = slot + 6;
  // side profile (x = depth, y = height), pushed along z for the width
  const prof = [[0, 0], [D, 0], [D, 5], [D * 0.66, H], [D * 0.2, H], [0, 5]];
  const g = extrude([prof], W, -W / 2);
  if (!g) return null;
  g.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
  // the slot: plate thickness + play, leaning back 12°
  const cut = new THREE.BoxGeometry(width + 1, thick + 0.5, slot * 2 + 2);
  cut.rotateX(-0.21);
  cut.translate(0, D * 0.43, H);
  const body = subtract(g, cut.toNonIndexed());
  body.translate(0, plateBottom - 12 - D, 0);
  return body;
}

export default {
  id: 'qr-code',
  name: 'كود QR مطبوع',
  description: 'حوّل رابطاً أو شبكة Wi-Fi أو واتساب أو إنستغرام إلى لوحة QR مطبوعة بلونين — تُمسح بالكاميرا مباشرة. مثالية للمحلات والمطاعم والبيت.',
  category: 'أعمال',
  params: [
    { key: 'kind', label: 'نوع الكود', type: 'select', default: 'link', group: 'المحتوى',
      options: [
        { value: 'link', label: 'رابط موقع' },
        { value: 'wifi', label: 'شبكة Wi-Fi' },
        { value: 'whatsapp', label: 'واتساب' },
        { value: 'instagram', label: 'إنستغرام' },
        { value: 'text', label: 'نص' },
        { value: 'image', label: 'صورة كود جاهز' },
      ] },
    { key: 'qrImage', label: 'صورة الكود (أو SVG)', type: 'image', default: '', samplePic: false, maxSize: 700, group: 'المحتوى', show: (p) => p.kind === 'image' },
    { key: 'qrDark', label: 'قتامة الكود بالصورة', type: 'number', min: 20, max: 80, step: 1, unit: '%', default: 50, group: 'المحتوى', show: (p) => p.kind === 'image' && !!p.qrImage },
    { key: 'logo', label: 'لوغو بنص الكود (اختياري)', type: 'image', default: '', samplePic: false, maxSize: 400, group: 'اللوغو', show: (p) => p.kind !== 'image' },
    { key: 'logoSize', label: 'حجم اللوغو', type: 'number', min: 12, max: 30, step: 1, unit: '%', default: 22, group: 'اللوغو', show: (p) => p.kind !== 'image' && !!p.logo },
    { key: 'logoDark', label: 'قتامة اللوغو', type: 'number', min: 20, max: 80, step: 1, unit: '%', default: 50, group: 'اللوغو', show: (p) => p.kind !== 'image' && !!p.logo },
    { key: 'url', label: 'الرابط', type: 'text', default: 'www.3dpstl.com', maxLength: 300, dir: 'ltr', group: 'المحتوى', show: (p) => p.kind === 'link' },
    { key: 'ssid', label: 'اسم الشبكة', type: 'text', default: '', maxLength: 32, dir: 'ltr', group: 'المحتوى', show: (p) => p.kind === 'wifi' },
    { key: 'password', label: 'كلمة السر', type: 'text', default: '', maxLength: 63, dir: 'ltr', group: 'المحتوى', show: (p) => p.kind === 'wifi' && p.security !== 'nopass' },
    { key: 'security', label: 'نوع الحماية', type: 'select', default: 'WPA', group: 'المحتوى', show: (p) => p.kind === 'wifi',
      options: [{ value: 'WPA', label: 'WPA / WPA2 (الأكثر شيوعاً)' }, { value: 'WEP', label: 'WEP' }, { value: 'nopass', label: 'بدون كلمة سر' }] },
    { key: 'hidden', label: 'شبكة مخفية', type: 'checkbox', default: false, group: 'المحتوى', show: (p) => p.kind === 'wifi' },
    { key: 'phone', label: 'رقم الواتساب (مع رمز البلد)', type: 'text', default: '', maxLength: 20, dir: 'ltr', group: 'المحتوى', show: (p) => p.kind === 'whatsapp' },
    { key: 'message', label: 'رسالة جاهزة (اختياري)', type: 'text', default: '', maxLength: 120, group: 'المحتوى', show: (p) => p.kind === 'whatsapp' },
    { key: 'handle', label: 'اسم الحساب', type: 'text', default: '', maxLength: 40, dir: 'ltr', group: 'المحتوى', show: (p) => p.kind === 'instagram' },
    { key: 'text', label: 'النص', type: 'text', default: '', maxLength: 300, group: 'المحتوى', show: (p) => p.kind === 'text' },

    { key: 'label', label: 'كتابة مع الكود (اختياري)', type: 'text', default: 'Scan me', maxLength: 30, group: 'الكتابة' },
    { key: 'labelFont', label: 'خط الكتابة', type: 'font', sample: ['label'], default: 'cairo-black', group: 'الكتابة', show: (p) => !!p.label?.trim() },
    { key: 'labelPos', label: 'مكان الكتابة', type: 'select', default: 'below', group: 'الكتابة', show: (p) => !!p.label?.trim(),
      options: [{ value: 'below', label: 'تحت' }, { value: 'above', label: 'فوق' }, { value: 'right', label: 'يمين' }, { value: 'left', label: 'شمال' }] },
    { key: 'labelSize', label: 'حجم الكتابة', type: 'number', min: 4, max: 20, step: 0.5, unit: 'مم', default: 8, group: 'الكتابة', show: (p) => !!p.label?.trim() },

    { key: 'size', label: 'حجم الكود', type: 'number', min: 30, max: 150, step: 1, unit: 'مم', default: 60, group: 'الشكل' },
    { key: 'margin', label: 'الهامش حول الكود', type: 'number', min: 1, max: 6, step: 0.5, unit: 'مربع', default: 2, group: 'الشكل' },
    { key: 'corner', label: 'استدارة زوايا اللوحة', type: 'number', min: 0, max: 15, step: 0.5, unit: 'مم', default: 4, group: 'الشكل' },
    { key: 'soft', label: 'مربعات بزوايا ناعمة', type: 'checkbox', default: false, group: 'الشكل' },
    { key: 'ecc', label: 'قوة التصحيح', type: 'select', default: 'M', group: 'الشكل', show: (p) => p.kind !== 'image' && !p.logo,
      options: [{ value: 'L', label: 'منخفضة (كود أبسط)' }, { value: 'M', label: 'متوسطة (موصى بها)' }, { value: 'Q', label: 'عالية' }, { value: 'H', label: 'عالية جداً' }] },
    { key: 'mount', label: 'التعليق', type: 'select', default: 'none', group: 'الشكل',
      options: [{ value: 'none', label: 'بدون' }, { value: 'tab', label: 'حلقة ميدالية' }, { value: 'screws', label: 'ثقبين للتعليق على الحائط' }, { value: 'stand', label: 'ستاند (واقفة عالطاولة)' }] },

    { key: 'mode', label: 'طريقة الطباعة', type: 'select', default: 'inlay', group: 'السماكة',
      options: [{ value: 'inlay', label: 'مسطّح بلونين (أسهل للمسح)' }, { value: 'raised', label: 'الكود بارز' }] },
    { key: 'thickness', label: 'سماكة اللوحة', type: 'number', min: 1.6, max: 8, step: 0.1, unit: 'مم', default: 3, group: 'السماكة' },
    { key: 'codeHeight', label: 'سماكة طبقة الكود', type: 'number', min: 0.4, max: 2, step: 0.1, unit: 'مم', default: 0.6, group: 'السماكة' },

    { key: 'baseColor', label: 'لون اللوحة (فاتح)', type: 'color', default: '#f5f5f5', group: 'الألوان' },
    { key: 'codeColor', label: 'لون الكود (غامق)', type: 'color', default: '#111111', group: 'الألوان' },
  ],
  fonts: (p) => (p.label?.trim() ? [p.labelFont] : []),
  async build(p, fonts) {
    const S = p.size;
    let dark, m;
    if (p.kind === 'image') {
      // a ready code (e.g. a payment or menu QR): its dark parts are traced and sized to the plate
      if (!p.qrImage) throw new Error('ارفع صورة الكود (مقصوصة على قدّ الكود)');
      const t = await traceImage(p.qrImage, { threshold: p.qrDark });
      if (!t.contours.length) throw new Error('ما لقينا الكود بالصورة — جرّب تغيّر «قتامة الكود»');
      const b = bounds2(t.contours);
      const k = S / Math.max(b.maxX - b.minX, b.maxY - b.minY);
      dark = union(t.contours.map((c) => c.map(([x, y]) => [(x - b.cx) * k, (y - b.cy) * k])));
      m = S / 29; // about one square of a usual code, for the margin
      if (p.soft) dark = offset(offset(dark, -m * 0.2), m * 0.2);
    } else {
      // with a logo in the middle the code needs the strongest error correction to still scan
      ({ dark, m } = qrContours(qrPayload(p), S, p.logo ? 'H' : p.ecc, p.soft));
      if (p.logo) {
        const t = await traceImage(p.logo, { threshold: p.logoDark });
        if (!t.contours.length) throw new Error('ما لقينا شي باللوغو — جرّب تغيّر «قتامة اللوغو»');
        const L = (S * p.logoSize) / 100;
        const b = bounds2(t.contours);
        const k = L / Math.max(b.maxX - b.minX, b.maxY - b.minY);
        const logo = union(t.contours.map((c) => c.map(([x, y]) => [(x - b.cx) * k, (y - b.cy) * k])));
        // a clear light square behind the logo, one square wider all round
        const lb = bounds2(logo);
        const clear = roundRect(0, 0, lb.maxX - lb.minX + 2 * m, lb.maxY - lb.minY + 2 * m, m * 0.8);
        dark = union(difference(dark, clear), logo);
      }
    }
    const quiet = p.margin * m;

    // the label: under, above, right or left of the code
    let label = [];
    if (p.label?.trim()) {
      const t = shapeText(fonts[p.labelFont], p.label.trim(), p.labelSize);
      const b = bounds2(t.contours);
      const gap = quiet * 0.6;
      const [dx, dy] = {
        below: [-b.cx, -S / 2 - gap - b.maxY],
        above: [-b.cx, S / 2 + gap - b.minY],
        right: [S / 2 + gap - b.minX, -b.cy],
        left: [-S / 2 - gap - b.maxX, -b.cy],
      }[p.labelPos] || [-b.cx, -S / 2 - gap - b.maxY];
      label = union(t.contours.map((c) => c.map(([px, py]) => [px + dx, py + dy])));
    }

    // plate around code + label
    const content = bounds2([...dark, ...label, ...roundRect(0, 0, S, S)]);
    const extraTop = p.mount === 'screws' ? 9 : 0;
    const SLOT = 8; // how deep the plate sits in the stand: the plate gets that much more at the bottom
    const extraBottom = p.mount === 'stand' ? SLOT : 0;
    const x0 = content.minX - quiet, x1 = content.maxX + quiet;
    const y0 = content.minY - quiet - extraBottom, y1 = content.maxY + quiet + extraTop;
    let plate = roundRect((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, p.corner);
    if (p.mount === 'tab') {
      const R = 6;
      plate = union(plate, circle(0, y1 + R * 0.45, R));
      plate = difference(plate, circle(0, y1 + R * 0.45, 2.6));
    } else if (p.mount === 'screws') {
      const hy = y1 - extraTop / 2 - 0.5;
      plate = difference(plate, circle(x0 + 8, hy, 2.2), circle(x1 - 8, hy, 2.2));
    }

    const ink = union(dark, label);
    const T = p.thickness;
    const h = Math.min(p.codeHeight, T - 0.6);
    const parts = [];
    if (p.mode === 'raised') {
      parts.push({ name: 'اللوحة', color: p.baseColor, geometry: extrude(plate, T, 0) });
      parts.push({ name: 'الكود', color: p.codeColor, geometry: extrude(ink, h, T) });
    } else {
      parts.push({ name: 'اللوحة', color: p.baseColor, geometry: extrude(plate, T - h, 0) });
      parts.push({ name: 'اللوحة (الطبقة العليا)', color: p.baseColor, geometry: extrude(difference(plate, ink), h, T - h) });
      parts.push({ name: 'الكود', color: p.codeColor, geometry: extrude(ink, h, T - h) });
    }
    if (p.mount === 'stand') parts.push({ name: 'الستاند', color: p.baseColor, geometry: stand(x1 - x0, T, SLOT, y0) });
    return parts.filter((x) => x.geometry);
  },
};
