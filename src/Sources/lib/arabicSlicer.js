// Arabic for slicers (Bambu Studio, Cura, PrusaSlicer…): many of them draw text left-to-right and don't join letters.
// We replace every letter with its joined form (Unicode "presentation forms") and put the line in visual order,
// so typing the result into the slicer shows correctly joined Arabic.

// [isolated, final, initial, medial] — two-form letters only join to the letter before them
const FORMS = {
  'ء': [0xfe80],
  'آ': [0xfe81, 0xfe82], 'أ': [0xfe83, 0xfe84], 'ؤ': [0xfe85, 0xfe86], 'إ': [0xfe87, 0xfe88],
  'ئ': [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c], 'ا': [0xfe8d, 0xfe8e], 'ب': [0xfe8f, 0xfe90, 0xfe91, 0xfe92],
  'ة': [0xfe93, 0xfe94], 'ت': [0xfe95, 0xfe96, 0xfe97, 0xfe98], 'ث': [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c],
  'ج': [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0], 'ح': [0xfea1, 0xfea2, 0xfea3, 0xfea4], 'خ': [0xfea5, 0xfea6, 0xfea7, 0xfea8],
  'د': [0xfea9, 0xfeaa], 'ذ': [0xfeab, 0xfeac], 'ر': [0xfead, 0xfeae], 'ز': [0xfeaf, 0xfeb0],
  'س': [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4], 'ش': [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8], 'ص': [0xfeb9, 0xfeba, 0xfebb, 0xfebc],
  'ض': [0xfebd, 0xfebe, 0xfebf, 0xfec0], 'ط': [0xfec1, 0xfec2, 0xfec3, 0xfec4], 'ظ': [0xfec5, 0xfec6, 0xfec7, 0xfec8],
  'ع': [0xfec9, 0xfeca, 0xfecb, 0xfecc], 'غ': [0xfecd, 0xfece, 0xfecf, 0xfed0], 'ف': [0xfed1, 0xfed2, 0xfed3, 0xfed4],
  'ق': [0xfed5, 0xfed6, 0xfed7, 0xfed8], 'ك': [0xfed9, 0xfeda, 0xfedb, 0xfedc], 'ل': [0xfedd, 0xfede, 0xfedf, 0xfee0],
  'م': [0xfee1, 0xfee2, 0xfee3, 0xfee4], 'ن': [0xfee5, 0xfee6, 0xfee7, 0xfee8], 'ه': [0xfee9, 0xfeea, 0xfeeb, 0xfeec],
  'و': [0xfeed, 0xfeee], 'ى': [0xfeef, 0xfef0], 'ي': [0xfef1, 0xfef2, 0xfef3, 0xfef4],
  // Persian / Urdu letters
  'پ': [0xfb56, 0xfb57, 0xfb58, 0xfb59], 'چ': [0xfb7a, 0xfb7b, 0xfb7c, 0xfb7d], 'ژ': [0xfb8a, 0xfb8b],
  'ک': [0xfb8e, 0xfb8f, 0xfb90, 0xfb91], 'گ': [0xfb92, 0xfb93, 0xfb94, 0xfb95], 'ی': [0xfbfc, 0xfbfd, 0xfbfe, 0xfbff],
};
// lam + alef → one ligature [isolated, final]
const LAM_ALEF = { 'آ': [0xfef5, 0xfef6], 'أ': [0xfef7, 0xfef8], 'إ': [0xfef9, 0xfefa], 'ا': [0xfefb, 0xfefc] };
const TATWEEL = 'ـ';
const isMark = (ch) => /[ً-ٰٟۖ-ۭ]/.test(ch);
const isLetter = (ch) => !!FORMS[ch] || ch === TATWEEL;
const joinsForward = (ch) => ch === TATWEEL || (FORMS[ch] && FORMS[ch].length === 4);
const isArabic = (ch) => /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(ch);
const MIRROR = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '«': '»', '»': '«' };

/** joined forms, still in logical (typing) order; returns clusters = [base + its marks] */
function shapeLine(line) {
  const chars = [...line];
  // letters only (marks are skipped when deciding joins)
  const prevLetter = (i) => { for (let j = i - 1; j >= 0; j--) if (!isMark(chars[j])) return isLetter(chars[j]) ? chars[j] : null; return null; };
  const nextLetter = (i) => { for (let j = i + 1; j < chars.length; j++) if (!isMark(chars[j])) return isLetter(chars[j]) ? { ch: chars[j], j } : null; return null; };
  const out = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (isMark(ch) && out.length) { out[out.length - 1] += ch; continue; }
    if (!FORMS[ch]) { out.push(ch); continue; }
    const prev = prevLetter(i);
    const joinPrev = !!prev && joinsForward(prev);
    const nx = nextLetter(i);
    if (ch === 'ل' && nx && LAM_ALEF[nx.ch]) {
      out.push(String.fromCharCode(LAM_ALEF[nx.ch][joinPrev ? 1 : 0]));
      // keep the alef's marks, skip the alef itself
      for (let j = i + 1; j < nx.j; j++) out[out.length - 1] += chars[j];
      i = nx.j;
      continue;
    }
    const f = FORMS[ch];
    const joinNext = f.length === 4 && !!nx;
    let form;
    if (f.length === 1) form = f[0];
    else if (f.length === 2) form = f[joinPrev ? 1 : 0];
    else form = f[joinPrev ? (joinNext ? 3 : 1) : joinNext ? 2 : 0];
    out.push(String.fromCharCode(form));
  }
  return out;
}

/** text → what to paste into a left-to-right slicer */
export function arabicForSlicer(text) {
  return String(text || '')
    .split('\n')
    .map((line) => {
      if (![...line].some(isArabic)) return line; // nothing Arabic: leave as is
      const clusters = shapeLine(line);
      // classify: L = Latin letters / digits, N = spaces & punctuation, R = Arabic
      const kind = clusters.map((c) => (/^[A-Za-z0-9\u0660-\u0669\u06f0-\u06f9]/.test(c) ? 'L' : /^[\s.,:;!?'"()[\]{}<>«»\-_/@#%+*=&]/.test(c) ? 'N' : 'R'));
      // neutrals between two Latin/number pieces belong to them ("Omar Zant", "3.5")
      for (let i = 0; i < kind.length; i++) {
        if (kind[i] !== 'N') continue;
        let j = i;
        while (j < kind.length && kind[j] === 'N') j++;
        const before = kind.slice(0, i).reverse().find((k) => k !== 'N');
        if (before === 'L' && kind[j] === 'L') for (let k = i; k < j; k++) kind[k] = 'L';
        i = j - 1;
      }
      // runs in typing order, then the line is right-to-left: last run first, Arabic runs reversed
      const runs = [];
      clusters.forEach((c, i) => {
        const dir = kind[i] === 'L' ? 'L' : 'R';
        if (runs.length && runs[runs.length - 1].dir === dir) runs[runs.length - 1].items.push(c);
        else runs.push({ dir, items: [c] });
      });
      return runs
        .reverse()
        .map((r) => (r.dir === 'L' ? r.items.join('') : r.items.reverse().map((c) => MIRROR[c] || c).join('')))
        .join('');
    })
    .join('\n');
}
