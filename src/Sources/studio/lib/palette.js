// The Studio's colours = the filament colours in stock (Admin → Colors).
// A colour field with `material: 'TPU'` only offers TPU colours; every other field offers the non-TPU ones (PLA…).
// If a list would be empty (nothing of that material in stock yet), all in-stock colours are offered instead.
const API = process.env.REACT_APP_API_URL || '';

let cache = null; // Promise<[{ id, name, hex, material }]>

export function loadPalette() {
  if (!cache) {
    cache = fetch(`${API}/api/admin/filament/colors`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) =>
        (Array.isArray(rows) ? rows : [])
          .filter((c) => c.active !== false && Number(c.stock) > 0 && /^#[0-9a-f]{6}$/i.test(c.hex || ''))
          .map((c) => ({ id: c.id, name: c.name, hex: c.hex.toLowerCase(), material: c.filament_materials?.name || '' }))
      )
      .catch(() => {
        cache = null; // try again next time
        return [];
      });
  }
  return cache;
}

const isTpu = (m) => /tpu/i.test(m || '');

/** colours allowed for one colour field */
export function colorsFor(palette, def) {
  if (!palette?.length) return [];
  const want = def?.material;
  const list = want
    ? palette.filter((c) => (c.material || '').toLowerCase().includes(String(want).toLowerCase()))
    : palette.filter((c) => !isTpu(c.material));
  return list.length ? list : palette;
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** the closest allowed colour (by how it looks: weighted RGB distance) */
export function nearestColor(hex, list) {
  if (!list?.length || !/^#[0-9a-f]{6}$/i.test(hex || '')) return list?.[0]?.hex || hex;
  const [r, g, b] = rgb(hex.toLowerCase());
  let best = list[0];
  let bestD = Infinity;
  for (const c of list) {
    const [r2, g2, b2] = rgb(c.hex);
    const rm = (r + r2) / 2;
    const d = (2 + rm / 256) * (r - r2) ** 2 + 4 * (g - g2) ** 2 + (2 + (255 - rm) / 256) * (b - b2) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best.hex;
}

/** params with every colour field moved onto an allowed colour (returns the same object if nothing changed) */
/** colour distance ("redmean", close to how the eye sees it) */
function dist(a, b) {
  const [r, g, bl] = rgb(a), [r2, g2, b2] = rgb(b);
  const rm = (r + r2) / 2;
  return (2 + rm / 256) * (r - r2) ** 2 + 4 * (g - g2) ** 2 + (2 + (255 - rm) / 256) * (bl - b2) ** 2;
}
const CLEAR = 9000; // two colours closer than this look alike on a print (≈ 50 steps on one channel)

export function snapColors(tool, params, palette) {
  if (!palette?.length) return params;
  let out = params;
  // colours already in stock stay as they are; the others go to the nearest stock colour,
  // but never to one another part already uses, so the base and the letters never come out the same
  const defs = tool.params.filter((d) => d.type === 'color');
  const used = [];
  const todo = [];
  for (const def of defs) {
    const list = colorsFor(palette, def);
    const v = String(params[def.key] || '').toLowerCase();
    if (list.some((c) => c.hex === v)) used.push(v);
    else todo.push([def, list, v]);
  }
  for (const [def, list, v] of todo) {
    if (!list.length || !/^#[0-9a-f]{6}$/i.test(v)) continue;
    const byNear = [...list].sort((a, b) => dist(v, a.hex) - dist(v, b.hex));
    // the same colour twice on purpose (e.g. base and stand both cream) stays the same
    const twin = defs.find((d) => d !== def && String(params[d.key] || '').toLowerCase() === v);
    const pick = twin
      ? byNear[0]
      : byNear.find((c) => used.every((u) => dist(u, c.hex) > CLEAR)) || byNear.find((c) => !used.includes(c.hex)) || byNear[0];
    used.push(pick.hex);
    if (pick.hex !== v) {
      if (out === params) out = { ...params };
      out[def.key] = pick.hex;
    }
  }
  return out;
}

// ── colours that come from a photo (multi-colour image designs) ──
// The Editor registers the stock list here; tools call stockColor() so a photo's colours become real filaments.
let stock = [];
export function setStockPalette(list) {
  stock = Array.isArray(list) ? list : [];
}
/** closest filament colour in stock (non-TPU unless material is given); the colour itself if no list yet */
export function stockColor(hex, material) {
  const list = colorsFor(stock, material ? { material } : {});
  return list.length ? nearestColor(hex, list) : hex;
}
