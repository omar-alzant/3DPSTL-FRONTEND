// Studio translation: templates and messages are written in Arabic; in English they go through the EN dictionary.
//   const t = useT();   t('الخط') → 'Font' (English) / 'الخط' (Arabic)
import { useCallback } from 'react';
import { useLang } from '../../i18n/LanguageContext';
import { EN } from './en.js';

// messages with numbers or letters inside
const DYN = [
  [/^الأباجورة رح تطلع (\d+) مم طول — .*$/, (m) => `The lampshade would be ${m[1]} mm tall — make the diameter smaller or repeat the picture more`],
  [/^الحرف «(.+)» غير موجود في هذا الخط — .*$/, (m) => `The letter “${m[1]}” isn't in this font — try another font`],
  [/^الفازة عرضها (\d+) مم — .*$/, (m) => `The vase would be ${m[1]} mm wide — bigger than the print bed; make the diameters smaller`],
  [/^القطع أكبر من سطح الطباعة \((\d+) مم\) — .*$/, (m) => `The parts are bigger than the print bed (${m[1]} mm) — choose “Frame only” or “Back only”`],
  [/^الكود كثيف على هالحجم \(كل مربع ([\d.]+) مم\) — كبّر الحجم لـ (\d+) مم أو قصّر النص$/, (m) => `The code is too dense for this size (each square ${m[1]} mm) — make it ${m[2]} mm or shorten the text`],
  [/^المقاس أكبر من سطح الطباعة \((\d+) مم\) — الارتفاع الكلي مع المقابض (\d+) مم$/, (m) => `Too big for the print bed (${m[1]} mm) — total height with handles is ${m[2]} mm`],
  [/^تعذّر رسم الحرف «(.+)»$/, (m) => `Couldn't draw the letter “${m[1]}”`],
  [/^تعذّر تحميل الخط (.+)$/, (m) => `Couldn't load the font ${m[1]}`],
  [/^حرف (.+)$/, (m) => `Letter ${m[1]}`],
  [/^زر (.+)$/, (m) => `Key ${m[1]}`],
  [/^لون (\d+)$/, (m) => `Colour ${m[1]}`],
  [/^عدد الحروف يجب أن يتساوى: الأمام (\d+) — الجانب (\d+)$/, (m) => `Both names need the same number of letters: front ${m[1]} — side ${m[2]}`],
];

export function trStudio(text, lang) {
  if (lang === 'ar' || text == null || typeof text !== 'string') return text;
  if (EN[text] != null) return EN[text];
  for (const [re, fn] of DYN) {
    const m = text.match(re);
    if (m) return fn(m);
  }
  return text;
}

export function useT() {
  const { lang } = useLang();
  return useCallback((text) => trStudio(text, lang), [lang]);
}
