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
export const designPath = (toolId, params) =>
  `/studio/${toolId}${params ? `?d=${encodeParams(shareable(params))}` : ''}`;
export const designLink = (toolId, params) => `${window.location.origin}${designPath(toolId, params)}`;
