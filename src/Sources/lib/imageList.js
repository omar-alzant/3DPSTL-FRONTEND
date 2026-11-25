// A picture field can come back as a list, as a list saved as text ('["https://…"]'), or as one link.
// This always gives a list of links.
export function toImageList(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v !== "string" || !v.trim()) return [];
  const t = v.trim();
  if (t.startsWith("[")) {
    try {
      const a = JSON.parse(t);
      return Array.isArray(a) ? a.filter((x) => typeof x === "string" && x) : [];
    } catch {
      return [];
    }
  }
  return [t];
}
