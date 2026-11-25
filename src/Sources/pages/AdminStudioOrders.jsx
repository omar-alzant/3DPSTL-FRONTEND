import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listOrders, updateOrder, designPath, orderFileLink } from '../studio/lib/api.js';
import '../Style/Studio.css';
import { refreshAdminSummary } from '../hooks/useAdminSummary';
import { useLang } from '../i18n/LanguageContext';

const STATUSES = [
  { value: 'new', label: 'New', ar: 'جديد' },
  { value: 'printing', label: 'Printing', ar: 'قيد الطباعة' },
  { value: 'ready', label: 'Ready', ar: 'جاهز' },
  { value: 'delivered', label: 'Delivered', ar: 'تم التسليم' },
  { value: 'cancelled', label: 'Cancelled', ar: 'ملغى' },
];

const fileName = (ref) => (typeof ref === 'string' && ref.startsWith('idb:') ? ref.split(':').slice(2).join(':') : '');
const summary = (p = {}) => [p.text || p.name, p.letter || p.letters, p.digits, fileName(p.model)].filter(Boolean).join(' · ');

export default function AdminStudioOrders() {
  const { tx } = useLang();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  // the ready mold file the customer's browser sent with the order (a link that works for 10 minutes)
  const openFile = async (id) => {
    const win = window.open('', '_blank');
    try {
      const { url } = await orderFileLink(id);
      if (win) win.location.href = url; else window.location.href = url;
    } catch (e) {
      if (win) win.close();
      setError(e.message);
    }
  };

  const load = async () => {
    setError(null);
    try {
      setOrders(await listOrders());
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id, status) => {
    try {
      const o = await updateOrder(id, { status });
      refreshAdminSummary();
      setOrders((list) => list.map((x) => (x.id === id ? o : x)));
    } catch (e) {
      setError(e.message);
    }
  };

  const shown = (orders || []).filter((o) => filter === 'all' || o.status === filter);

  return (
    <div className="sd-admin">
      <div className="sd-admin-head">
        <h5 className="m-0">
          Studio orders <span className="sd-muted">({orders ? orders.length : '…'})</span>
        </h5>
        <div className="d-flex gap-2">
          <select className="sd-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">{tx('All statuses', 'كل الحالات')}</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{tx(s.label, s.ar)}</option>)}
          </select>
          <button className="sd-btn" onClick={load}>{tx('Refresh', 'تحديث')}</button>
        </div>
      </div>
      {error && <p className="sd-error">{error}</p>}
      {orders && !shown.length && <p className="sd-muted">{tx('No studio orders yet.', 'لا توجد طلبات استوديو بعد.')}</p>}
      <div className="sd-orders">
        {shown.map((o) => (
          <article key={o.id} className={`sd-order st-${o.status}`}>
            <div className="sd-order-head">
              <b>{o.tool_name || o.tool_id}</b>
              <span className="sd-muted">{o.id}</span>
            </div>
            <p className="sd-big" dir="auto">{summary(o.params)}</p>
            <p>
              <bdi>{o.customer_name}</bdi> · <a href={`tel:${o.customer_phone}`}>{o.customer_phone}</a>
              {' · '}
              <a href={`https://wa.me/${String(o.customer_phone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{tx('WhatsApp', 'واتساب')}</a>
            </p>
            <p className="sd-muted">
              Qty {o.qty}
              {o.estimate && <> · {o.estimate.grams} g{o.estimate.minutes ? <> · ~{Math.floor(o.estimate.minutes / 60)}h {o.estimate.minutes % 60}m/pc</> : null} · {o.estimate.price} {o.estimate.currency}</>}
              {o.size && <> · {o.size.map((v) => Math.round(v)).join('×')} {tx('mm', 'مم')}</>}
              {' · '}{new Date(o.created_at).toLocaleString()}
            </p>
            {o.customer_address && <p dir="auto">📍 <bdi>{o.customer_address}</bdi></p>}
            {o.customer_location && <p><a href={o.customer_location} target="_blank" rel="noreferrer">{tx('🗺️ افتح الموقع على الخريطة', '🗺️ افتح الموقع على الخريطة')}</a></p>}
            {o.notes && <p className="sd-notes" dir="auto">{o.notes}</p>}
            <div className="sd-order-foot">
              <select className="sd-select" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{tx(s.label, s.ar)}</option>)}
              </select>
              {o.tool_id === 'mold-maker' ? (
                <button type="button" className="sd-btn" onClick={() => openFile(o.id)}>
                  {tx('Download the mold (3MF)', 'نزّل ملف القالب (3MF)')}
                </button>
              ) : (
                <Link className="sd-btn" to={designPath(o.tool_id)} state={{ params: o.params, orderId: o.id }}>
                  Open design &amp; download file
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
