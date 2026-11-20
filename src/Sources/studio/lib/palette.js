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
export function snapColors(tool, params, palette) {
  if (!palette?.length) return params;
  let out = params;
  for (const def of tool.params) {
    if (def.type !== 'color') continue;
    const list = colorsFor(palette, def);
    const v = String(params[def.key] || '').toLowerCase();
    if (list.some((c) => c.hex === v)) continue;
    const near = nearestColor(v, list);
    if (near && near !== v) {
      if (out === params) out = { ...params };
      out[def.key] = near;
    }
  }
  return out;
}
