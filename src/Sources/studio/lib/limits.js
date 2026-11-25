// Limits that depend on other settings (e.g. a bag can't be narrower than its handle).
// A param's min / max can be a number or a function of all the settings; options can have show(p).
// fitParams() keeps every value inside what the tool can really build, so the customer
// can't pick a combination that fails.

export const lim = (def, p, end) => {
  const v = typeof def[end] === 'function' ? def[end](p) : def[end];
  return Number.isFinite(v) ? v : undefined;
};

export const visibleOptions = (def, p) => (def.options || []).filter((o) => !o.show || o.show(p));

export function fitParams(tool, params) {
  let out = params;
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (const def of tool.params) {
      const v = out[def.key];
      if (def.type === 'number' && typeof v === 'number') {
        const lo = lim(def, out, 'min'), hi = lim(def, out, 'max');
        let nv = v;
        if (hi !== undefined && nv > hi) nv = hi;
        if (lo !== undefined && nv < lo) nv = lo;
        if (def.step) nv = Math.round(nv / def.step) * def.step;
        nv = +nv.toFixed(4);
        if (nv !== v) { out = out === params ? { ...params } : out; out[def.key] = nv; changed = true; }
      } else if (def.type === 'select' && def.options?.some((o) => o.show)) {
        const opts = visibleOptions(def, out);
        if (opts.length && !opts.some((o) => o.value === v)) {
          out = out === params ? { ...params } : out; out[def.key] = opts[0].value; changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return out;
}
