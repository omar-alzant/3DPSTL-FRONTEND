// قاعدة مقاسات الهواتف لأداة الكفر.
// w/h/d: العرض/الطول/السماكة الرسمية (مم). r: تدوير الزوايا (تقريبي).
// cam: مربّع وحدة الكاميرا كما تُرى من الخلف — [بُعدها عن الحافة اليسرى، عن الحافة العليا، عرضها، طولها، تدويرها].
//      العرض 'full' = هضبة كاميرا بعرض الهاتف كله (iPhone 17 Pro / Air).
// keys: فتحات الأزرار كما تُرى من الأمام — [الجهة 'L'|'R'، بداية الفتحة من الأعلى، طولها].
// ⚠️ أبعاد الهاتف الخارجية رسمية؛ أماكن الكاميرا والأزرار تقديرية وتحتاج تجربة طباعة لكل موديل.

// قوالب الأزرار
const IPH = [['L', 20, 50], ['R', 30, 28]]; // جانب أيسر: زر الأكشن/الصامت + الصوت · أيمن: التشغيل
const IPH_CC = [...IPH, ['R', null, 20]]; // + زر التحكم بالكاميرا (يُحسب مكانه من طول الهاتف)
const SAM = [['R', null, null]]; // سامسونغ/شاومي: الصوت + التشغيل على اليمين
const P = (brand, id, name, h, w, d, r, cam, keys) => ({ brand, id, name, h, w, d, r, cam, keys });

export const PHONES = [
  // ——— Apple ———
  P('Apple', 'ip18pm', 'iPhone 18 Pro Max', 163.4, 78.0, 8.75, 11, [0, 0, 'full', 41, 0], IPH_CC),
  P('Apple', 'ip17pm', 'iPhone 17 Pro Max', 163.4, 78.0, 8.75, 11, [0, 0, 'full', 41, 0], IPH_CC),
  P('Apple', 'ip17p', 'iPhone 17 Pro', 150.0, 71.9, 8.75, 10.5, [0, 0, 'full', 39, 0], IPH_CC),
  P('Apple', 'ipair', 'iPhone Air', 156.2, 74.7, 5.64, 11, [0, 0, 'full', 25, 0], IPH_CC),
  P('Apple', 'ip17', 'iPhone 17', 149.6, 71.5, 7.95, 10.5, [8, 8, 21, 34, 10], IPH_CC),
  P('Apple', 'ip17e', 'iPhone 17e', 146.7, 71.5, 7.8, 10, [9, 9, 17, 17, 5], IPH),
  P('Apple', 'ip16pm', 'iPhone 16 Pro Max', 163.0, 77.6, 8.25, 11, [6, 6, 38, 39, 9], IPH_CC),
  P('Apple', 'ip16p', 'iPhone 16 Pro', 149.6, 71.5, 8.25, 10.5, [6, 6, 36, 37, 9], IPH_CC),
  P('Apple', 'ip16pl', 'iPhone 16 Plus', 160.9, 77.8, 7.8, 11, [8, 8, 21, 34, 10], IPH_CC),
  P('Apple', 'ip16', 'iPhone 16', 147.6, 71.6, 7.8, 10.5, [8, 8, 21, 34, 10], IPH_CC),
  P('Apple', 'ip16e', 'iPhone 16e', 146.7, 71.5, 7.8, 10, [9, 9, 17, 17, 5], IPH),
  P('Apple', 'ip15pm', 'iPhone 15 Pro Max', 159.9, 76.7, 8.25, 11, [6, 6, 38, 39, 9], IPH),
  P('Apple', 'ip15p', 'iPhone 15 Pro', 146.6, 70.6, 8.25, 10.5, [6, 6, 36, 37, 9], IPH),
  P('Apple', 'ip15pl', 'iPhone 15 Plus', 160.9, 77.8, 7.8, 11, [7, 7, 30, 30, 8], IPH),
  P('Apple', 'ip15', 'iPhone 15', 147.6, 71.6, 7.8, 10.5, [7, 7, 30, 30, 8], IPH),
  P('Apple', 'ip14pm', 'iPhone 14 Pro Max', 160.7, 77.6, 7.85, 11, [6, 6, 38, 39, 9], IPH),
  P('Apple', 'ip14p', 'iPhone 14 Pro', 147.5, 71.5, 7.85, 10.5, [6, 6, 36, 37, 9], IPH),
  P('Apple', 'ip14pl', 'iPhone 14 Plus', 160.8, 78.1, 7.8, 11, [7, 7, 30, 30, 8], IPH),
  P('Apple', 'ip14', 'iPhone 14', 146.7, 71.5, 7.8, 10.5, [7, 7, 30, 30, 8], IPH),
  P('Apple', 'ip13pm', 'iPhone 13 Pro Max', 160.8, 78.1, 7.65, 11, [6, 6, 37, 38, 9], IPH),
  P('Apple', 'ip13p', 'iPhone 13 Pro', 146.7, 71.5, 7.65, 10.5, [6, 6, 35, 36, 9], IPH),
  P('Apple', 'ip13', 'iPhone 13', 146.7, 71.5, 7.65, 10.5, [7, 7, 29, 29, 8], IPH),
  P('Apple', 'ip13m', 'iPhone 13 mini', 131.5, 64.2, 7.65, 9.5, [7, 7, 27, 27, 7], IPH),
  P('Apple', 'ip12pm', 'iPhone 12 Pro Max', 160.8, 78.1, 7.4, 11, [6, 6, 36, 37, 9], IPH),
  P('Apple', 'ip12', 'iPhone 12 / 12 Pro', 146.7, 71.5, 7.4, 10.5, [6, 6, 34, 35, 8], IPH),
  P('Apple', 'ip12m', 'iPhone 12 mini', 131.5, 64.2, 7.4, 9.5, [7, 7, 27, 27, 7], IPH),

  // ——— Samsung S ———
  P('Samsung', 's26u', 'Galaxy S26 Ultra', 163.6, 78.1, 7.9, 6, [6, 8, 22, 50, 8], SAM),
  P('Samsung', 's26p', 'Galaxy S26+', 158.4, 75.8, 7.3, 9, [8, 9, 18, 42, 9], SAM),
  P('Samsung', 's26', 'Galaxy S26', 149.6, 71.7, 7.2, 9, [8, 9, 17, 40, 8.5], SAM),
  P('Samsung', 's25u', 'Galaxy S25 Ultra', 162.8, 77.6, 8.2, 6, [6, 8, 22, 50, 8], SAM),
  P('Samsung', 's25e', 'Galaxy S25 Edge', 158.2, 75.6, 5.8, 9, [7, 9, 21, 34, 10], SAM),
  P('Samsung', 's25p', 'Galaxy S25+', 158.4, 75.8, 7.3, 9, [8, 9, 14, 40, 7], SAM),
  P('Samsung', 's25', 'Galaxy S25', 146.9, 70.5, 7.2, 9, [8, 9, 14, 38, 7], SAM),
  P('Samsung', 's25fe', 'Galaxy S25 FE', 161.3, 76.6, 7.4, 9, [8, 9, 15, 41, 7.5], SAM),
  P('Samsung', 's24u', 'Galaxy S24 Ultra', 162.3, 79.0, 8.6, 4, [6, 8, 22, 50, 8], SAM),
  P('Samsung', 's24p', 'Galaxy S24+', 158.5, 75.9, 7.7, 9, [8, 9, 14, 40, 7], SAM),
  P('Samsung', 's24', 'Galaxy S24', 147.0, 70.6, 7.6, 9, [8, 9, 14, 38, 7], SAM),
  P('Samsung', 's24fe', 'Galaxy S24 FE', 162.0, 77.3, 8.0, 9, [8, 9, 15, 41, 7.5], SAM),
  P('Samsung', 's23u', 'Galaxy S23 Ultra', 163.4, 78.1, 8.9, 4, [6, 8, 22, 50, 8], SAM),
  P('Samsung', 's23p', 'Galaxy S23+', 157.8, 76.2, 7.6, 9, [8, 9, 14, 40, 7], SAM),
  P('Samsung', 's23', 'Galaxy S23', 146.3, 70.9, 7.6, 9, [8, 9, 14, 38, 7], SAM),
  P('Samsung', 's23fe', 'Galaxy S23 FE', 158.0, 76.5, 8.2, 9, [8, 9, 15, 41, 7.5], SAM),
  // ——— Samsung A ———
  P('Samsung', 'a57', 'Galaxy A57', 161.5, 76.8, 6.9, 9, [7, 9, 18, 42, 9], SAM),
  P('Samsung', 'a37', 'Galaxy A37', 162.9, 78.2, 7.4, 9, [7, 9, 18, 42, 9], SAM),
  P('Samsung', 'a56', 'Galaxy A56', 162.2, 77.5, 7.4, 9, [7, 9, 18, 42, 9], SAM),
  P('Samsung', 'a36', 'Galaxy A36', 162.9, 78.2, 7.4, 9, [7, 9, 18, 42, 9], SAM),
  P('Samsung', 'a26', 'Galaxy A26', 164.0, 77.5, 7.7, 9, [7, 9, 16, 42, 8], SAM),
  P('Samsung', 'a17', 'Galaxy A17 5G', 164.4, 77.9, 7.5, 9, [7, 9, 16, 42, 8], SAM),
  P('Samsung', 'a16', 'Galaxy A16', 164.4, 77.9, 7.9, 9, [7, 9, 16, 42, 8], SAM),
  P('Samsung', 'a55', 'Galaxy A55', 161.1, 77.4, 8.2, 9, [7, 9, 16, 42, 8], SAM),
  P('Samsung', 'a35', 'Galaxy A35', 161.7, 78.0, 8.2, 9, [7, 9, 16, 42, 8], SAM),
  P('Samsung', 'a25', 'Galaxy A25', 161.0, 76.5, 8.3, 9, [7, 9, 16, 42, 8], SAM),
  P('Samsung', 'a15', 'Galaxy A15', 160.1, 76.8, 8.4, 9, [7, 9, 16, 42, 8], SAM),

  // ——— Xiaomi / Redmi ———
  P('Xiaomi', 'x15tp', 'Xiaomi 15T Pro', 162.7, 77.9, 8.0, 9, [7, 7, 31, 37, 9], SAM),
  P('Xiaomi', 'x15t', 'Xiaomi 15T', 163.2, 78.0, 7.5, 9, [7, 7, 31, 37, 9], SAM),
  P('Xiaomi', 'x15p', 'Xiaomi 15 Pro', 161.3, 75.3, 8.35, 10, [7, 7, 36, 36, 10], SAM),
  P('Xiaomi', 'x15', 'Xiaomi 15', 152.3, 71.2, 8.08, 9, [8, 8, 32, 32, 9], SAM),
  P('Xiaomi', 'rn15pp', 'Redmi Note 15 Pro+', 163.3, 78.3, 8.2, 10, [7, 7, 32, 32, 10], SAM),
  P('Xiaomi', 'rn15p', 'Redmi Note 15 Pro', 163.2, 76.3, 8.0, 10, [7, 7, 32, 32, 10], SAM),
  P('Xiaomi', 'rn15g', 'Redmi Note 15 5G', 164.0, 75.4, 7.4, 10, [7, 7, 32, 32, 10], SAM),
  P('Xiaomi', 'rn15', 'Redmi Note 15', 164.0, 75.4, 7.9, 10, [7, 7, 32, 32, 10], SAM),
  P('Xiaomi', 'rn14pp', 'Redmi Note 14 Pro+', 162.5, 74.7, 8.8, 10, [7, 7, 32, 32, 10], SAM),
  P('Xiaomi', 'rn14p5', 'Redmi Note 14 Pro 5G', 162.3, 74.4, 8.4, 10, [7, 7, 32, 32, 10], SAM),
  P('Xiaomi', 'rn14p', 'Redmi Note 14 Pro', 162.2, 74.9, 8.2, 10, [7, 7, 32, 32, 10], SAM),
  P('Xiaomi', 'rn14g', 'Redmi Note 14 5G', 162.4, 75.7, 8.0, 10, [7, 7, 30, 30, 8], SAM),
  P('Xiaomi', 'rn14', 'Redmi Note 14', 163.3, 76.6, 8.2, 10, [7, 7, 30, 30, 8], SAM),
  P('Xiaomi', 'rn13p', 'Redmi Note 13 Pro', 161.1, 74.95, 7.98, 10, [7, 7, 27, 33, 8], SAM),
  P('Xiaomi', 'rn13', 'Redmi Note 13', 162.24, 75.55, 7.97, 10, [7, 7, 26, 33, 7], SAM),
];

export const BRANDS = ['Apple', 'Samsung', 'Xiaomi'];

/** هاتف يدوي من مقاسات يدخلها الزبون */
export function manualPhone(p) {
  return {
    brand: 'manual', id: 'manual', name: 'مقاس يدوي',
    h: p.mH, w: p.mW, d: p.mD, r: p.mR,
    cam: [p.mCamX, p.mCamY, p.mCamFull ? 'full' : p.mCamW, p.mCamH, Math.min(8, p.mCamW / 2)],
    keys: [p.mKeyL > 0 ? ['L', p.mKeyLy, p.mKeyL] : null, p.mKeyR > 0 ? ['R', p.mKeyRy, p.mKeyR] : null].filter(Boolean),
  };
}

/** يحوّل قوالب الأزرار إلى أرقام فعلية حسب طول الهاتف */
export function resolveKeys(ph) {
  return ph.keys.map(([side, y0, len]) => {
    if (y0 == null && len == null) return [side, ph.h * 0.27, ph.h * 0.33]; // صوت + تشغيل
    if (y0 == null) return [side, ph.h * 0.6, len]; // زر الكاميرا بآيفون 16/17
    return [side, y0, len];
  });
}
