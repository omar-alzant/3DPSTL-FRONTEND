// الكريدت: شحن الرصيد (Whish / Neo) والخصم عند تنزيل ملفات الـ Studio
const API = process.env.REACT_APP_API_URL || '';

const authHeader = () => {
  try {
    const t = localStorage.getItem('token');
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
};

async function call(path, { method = 'GET', body, fallback = 'حدث خطأ' } = {}) {
  const r = await fetch(`${API}/api/credits${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...authHeader() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(data.error || fallback);
    e.status = r.status;
    e.data = data;
    throw e;
  }
  return data;
}

// الزبون
export const getPackages = () => call('/packages', { fallback: 'تعذّر تحميل الباقات' });
export const getMyCredits = () => call('/me', { fallback: 'تعذّر تحميل رصيدك' });
export const requestTopUp = (body) => call('/requests', { method: 'POST', body, fallback: 'تعذّر إرسال الطلب' });
export const spendCredits = (body) => call('/spend', { method: 'POST', body, fallback: 'تعذّر خصم الكريدت' });
export const getDownloads = (page = 1) => call(`/downloads?page=${page}`, { fallback: 'تعذّر تحميل ملفاتك' });
export const getDownload = (id) => call(`/downloads/${id}`, { fallback: 'تعذّر فتح الملف' });

// الإدارة
export const adminRequests = (status = 'pending') => call(`/admin/requests?status=${status}`);
export const approveRequest = (id, note) => call(`/admin/requests/${encodeURIComponent(id)}/approve`, { method: 'POST', body: { note } });
export const rejectRequest = (id, note) => call(`/admin/requests/${encodeURIComponent(id)}/reject`, { method: 'POST', body: { note } });
export const adminPackages = () => call('/admin/packages');
export const createPackage = (p) => call('/admin/packages', { method: 'POST', body: p });
export const updatePackage = (id, p) => call(`/admin/packages/${id}`, { method: 'PUT', body: p });
export const deletePackage = (id) => call(`/admin/packages/${id}`, { method: 'DELETE' });
export const adminUsers = (q = '') => call(`/admin/users?q=${encodeURIComponent(q)}`);
export const adminUserLedger = (id) => call(`/admin/users/${encodeURIComponent(id)}/ledger`);
export const adjustCredits = (userId, delta, note) => call('/admin/adjust', { method: 'POST', body: { userId, delta, note } });

/** بصمة التصميم: نفس التصميم (أداة + إعدادات) لا يُخصم مرتين خلال 24 ساعة */
export async function designHash(toolId, params) {
  const text = JSON.stringify([toolId, params]);
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // متصفح بلا crypto.subtle (http): بصمة أبسط
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < text.length; i++) {
      h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619);
      h2 = Math.imul(h2 + text.charCodeAt(i), 2246822519);
    }
    return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')).repeat(2);
  }
}

export const KIND_LABEL = { topup: 'شحن', download: 'تنزيل ملف', admin: 'تعديل من الإدارة', refund: 'استرجاع' };
export const STATUS_LABEL = { pending: 'بانتظار المراجعة', approved: 'تمت الموافقة', rejected: 'مرفوض' };
export const METHOD_LABEL = { whish: 'Whish Money', neo: 'Neo' };
