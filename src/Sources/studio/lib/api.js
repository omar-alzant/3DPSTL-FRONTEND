// الاتصال بخادم الموقع (3DPSTL-BACKEND). إذا لم يكن الخادم متاحاً نستخدم قيماً افتراضية.
const API = process.env.REACT_APP_API_URL || '';

export const DEFAULT_CONFIG = {
  showPrices: false, // estimated prices are shown to customers only when the admin turns this on
  shopName: '3DSTL',
  currency: 'USD',
  pricePerGram: 0.12,
  minPrice: 3,
  colorFee: 0,
  whatsapp: '96176118290',
  tools: {},
};

const authHeader = () => {
  try {
    const t = localStorage.getItem('token');
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
};

async function json(r, fallback) {
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || fallback);
  return data;
}

export async function getConfig() {
  try {
    const r = await fetch(`${API}/api/studio/config`);
    if (!r.ok) throw new Error();
    return { ...DEFAULT_CONFIG, ...(await r.json()), online: true };
  } catch {
    return { ...DEFAULT_CONFIG, online: false };
  }
}

export async function createOrder(order) {
  const r = await fetch(`${API}/api/studio/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(order),
  });
  return json(r, 'تعذّر إرسال الطلب');
}

// the print-ready file for an order (tools that use the customer's own 3D file, e.g. the mold maker)
export async function uploadOrderFile(id, bytes) {
  const r = await fetch(`${API}/api/studio/orders/${encodeURIComponent(id)}/file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', ...authHeader() },
    body: bytes,
  });
  return json(r, 'تعذّر رفع ملف الطلب');
}

export async function orderFileLink(id) {
  const r = await fetch(`${API}/api/studio/orders/admin/${encodeURIComponent(id)}/file`, { headers: authHeader() });
  return json(r, 'No file for this order');
}

// طلبات Studio الخاصة بالزبون المسجّل (Profile → My Orders)
export async function listMyOrders() {
  const r = await fetch(`${API}/api/studio/orders/my`, { headers: authHeader() });
  return json(r, 'Failed to load your studio orders');
}

// لوحة الإدارة: تستخدم تسجيل دخول الموقع (حساب Admin)
export async function listOrders() {
  const r = await fetch(`${API}/api/studio/orders/admin`, { headers: authHeader() });
  return json(r, 'Failed to load studio orders');
}

// admin adds an order by hand (phone, WhatsApp, in the shop)
export async function createAdminOrder(order) {
  const r = await fetch(`${API}/api/studio/orders/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(order),
  });
  return json(r, 'تعذّر حفظ الطلب');
}

// admin attachments on an order (STL, 3MF, photos, PDF…)
export async function uploadAdminOrderFile(id, file) {
  const r = await fetch(`${API}/api/studio/orders/admin/${encodeURIComponent(id)}/files`, {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Filename': encodeURIComponent(file.name), ...authHeader() },
    body: file,
  });
  return json(r, `تعذّر رفع ${file.name}`);
}

export async function listAdminOrderFiles(id) {
  const r = await fetch(`${API}/api/studio/orders/admin/${encodeURIComponent(id)}/files`, { headers: authHeader() });
  return json(r, 'Failed to load the files');
}

// admin: email the customer that the order is ready
export async function emailOrderReady(id, message) {
  const r = await fetch(`${API}/api/studio/orders/admin/${encodeURIComponent(id)}/notify-ready`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ message }),
  });
  return json(r, 'تعذّر إرسال الإيميل');
}

// admin: customer accounts that match an email or a phone number (to link an order to)
export async function findAccounts(q) {
  const r = await fetch(`${API}/api/studio/orders/admin/accounts?q=${encodeURIComponent(q)}`, { headers: authHeader() });
  return json(r, 'Failed to search accounts');
}

export async function deleteOrder(id) {
  const r = await fetch(`${API}/api/studio/orders/admin/${encodeURIComponent(id)}`, { method: 'DELETE', headers: authHeader() });
  return json(r, 'تعذّر حذف الطلب');
}

export async function updateOrder(id, patch) {
  const r = await fetch(`${API}/api/studio/orders/admin/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(patch),
  });
  return json(r, 'Failed to update order');
}

// إعدادات التسعير (Admin → Studio Pricing)
export async function getSettings() {
  const r = await fetch(`${API}/api/studio/settings/admin`, { headers: authHeader() });
  return json(r, 'Failed to load pricing settings');
}

export async function saveSettings(settings) {
  const r = await fetch(`${API}/api/studio/settings/admin`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(settings),
  });
  return json(r, 'Failed to save pricing settings');
}

// ترميز إعدادات التصميم داخل الرابط لمشاركته أو فتحه من لوحة التحكم
export const encodeParams = (obj) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const decodeParams = (s) => {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
  } catch {
    return null;
  }
};
// الصور (الشعارات) لا توضع في رابط المشاركة لأنها كبيرة؛ تُحفظ مع الطلب فقط
export const shareable = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => !(typeof v === 'string' && v.startsWith('data:'))));
// pictures in shared links: stored on the server, the link carries their address
const SUPABASE = (process.env.REACT_APP_SUPABASE_URL || '').replace(/\/$/, '');
export const SHARE_PREFIX = SUPABASE ? `${SUPABASE}/storage/v1/object/public/studio-shared/` : '';
const isData = (v) => typeof v === 'string' && v.startsWith('data:image/');
const isShared = (v) => typeof v === 'string' && !!SHARE_PREFIX && v.startsWith(SHARE_PREFIX);
export const hasPictures = (params) => Object.values(params || {}).some(isData);
export const hasSharedPictures = (params) => Object.values(params || {}).some(isShared);

const shared = new Map(); // data URL -> its address (the same picture isn't sent twice)
async function shareImage(data) {
  if (shared.has(data)) return shared.get(data);
  const r = await fetch(`${API}/api/studio/share-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  const { url } = await json(r, 'تعذّر تجهيز الرابط');
  shared.set(data, url);
  return url;
}

/** the design with every uploaded picture replaced by its stored address (for "Copy design link") */
export async function withSharedPictures(params) {
  const out = { ...params };
  for (const [k, v] of Object.entries(out)) if (isData(v)) out[k] = await shareImage(v);
  return out;
}

const toDataURL = (blob) => new Promise((resolve, reject) => {
  const fr = new FileReader();
  fr.onload = () => resolve(fr.result);
  fr.onerror = () => reject(fr.error);
  fr.readAsDataURL(blob);
});

/** opening a link: stored pictures come back as pictures (as if just uploaded) */
export async function restorePictures(params) {
  const out = { ...params };
  for (const [k, v] of Object.entries(out)) {
    if (isShared(v)) {
      try {
        const r = await fetch(v);
        out[k] = r.ok ? await toDataURL(await r.blob()) : '';
      } catch { out[k] = ''; }
    }
  }
  return out;
}

export const designPath = (toolId, params) =>
  `/studio/${toolId}${params ? `?d=${encodeParams(shareable(params))}` : ''}`;
export const designLink = (toolId, params) => `${window.location.origin}${designPath(toolId, params)}`;
