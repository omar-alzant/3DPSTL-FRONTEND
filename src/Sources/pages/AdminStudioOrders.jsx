import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listOrders, updateOrder, designPath } from '../studio/lib/api.js';
import '../Style/Studio.css';
import { refreshAdminSummary } from '../hooks/useAdminSummary';

const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'printing', label: 'Printing' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const summary = (p = {}) => [p.text || p.name, p.letter || p.letters, p.digits].filter(Boolean).join(' · ');

export default function AdminStudioOrders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

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
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="sd-btn" onClick={load}>Refresh</button>
        </div>
      </div>
      {error && <p className="sd-error">{error}</p>}
      {orders && !shown.length && <p className="sd-muted">No studio orders yet.</p>}
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
              <a href={`https://wa.me/${String(o.customer_phone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>
            </p>
            <p className="sd-muted">
              Qty {o.qty}
              {o.estimate && <> · {o.estimate.grams} g{o.estimate.minutes ? <> · ~{Math.floor(o.estimate.minutes / 60)}h {o.estimate.minutes % 60}m/pc</> : null} · {o.estimate.price} {o.estimate.currency}</>}
              {o.size && <> · {o.size.map((v) => Math.round(v)).join('×')} mm</>}
              {' · '}{new Date(o.created_at).toLocaleString()}
            </p>
            {o.customer_address && <p dir="auto">📍 <bdi>{o.customer_address}</bdi></p>}
            {o.notes && <p className="sd-notes" dir="auto">{o.notes}</p>}
            <div className="sd-order-foot">
              <select className="sd-select" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <Link className="sd-btn" to={designPath(o.tool_id)} state={{ params: o.params, orderId: o.id }}>
                Open design &amp; download file
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
