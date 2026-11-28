import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listOrders, updateOrder, designPath, orderFileLink, createAdminOrder, deleteOrder } from '../studio/lib/api.js';
import { Modal } from 'react-bootstrap';
import { TOOLS as TEMPLATE_TOOLS } from '../studio/tools/index.js';
import { SPLIT_TOOL } from '../studio/split/meta.js';
import NewStudioOrder from '../components/NewStudioOrder';
import OrderFiles from '../components/OrderFiles';
import ReadyNotice, { waNumber } from '../components/ReadyNotice';
import { uploadAdminOrderFile } from '../studio/lib/api.js';
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
const summary = (p = {}) => [p.what, p.text || p.name, p.letter || p.letters, p.digits, fileName(p.model)].filter(Boolean).join(' · ');

export default function AdminStudioOrders() {
  const { tx } = useLang();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null); // the order being edited
  const [removing, setRemoving] = useState(null); // { order, busy, error } while confirming a delete
  const confirmDelete = async () => {
    const o = removing.order;
    setRemoving((r) => ({ ...r, busy: true, error: null }));
    try {
      await deleteOrder(o.id);
      setOrders((list) => list.filter((x) => x.id !== o.id));
      refreshAdminSummary();
      setRemoving(null);
    } catch (e) {
      setRemoving((r) => ({ ...r, busy: false, error: e.message }));
    }
  };
  const [readyFor, setReadyFor] = useState(null); // order that just turned "ready": offer to tell the customer
  const tools = [...TEMPLATE_TOOLS.map((t) => ({ id: t.id, name: t.name })), { id: SPLIT_TOOL.id, name: SPLIT_TOOL.nameAr }];

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
      if (status === 'ready') setReadyFor(o);
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
          <button className="sd-btn sd-primary" onClick={() => setAdding(true)}>{tx('+ New order', '+ طلب جديد')}</button>
        </div>
      </div>
      {error && <p className="sd-error">{error}</p>}
      {readyFor && <ReadyNotice order={readyFor} onClose={() => setReadyFor(null)} />}
      {removing && (
        <Modal show onHide={() => !removing.busy && setRemoving(null)} centered>
          <Modal.Header closeButton={!removing.busy}>
            <Modal.Title className="text-danger">{tx('Delete this order?', 'حذف هالطلب؟')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="mb-2">
              <b dir="ltr">{removing.order.id}</b> · <bdi>{removing.order.customer_name}</bdi> · <bdi>{removing.order.tool_name || removing.order.tool_id}</bdi>
            </p>
            <p className="mb-0">{tx('The order and all its files are deleted for good. This can’t be undone.', 'الطلب وكل ملفاته بينحذفوا نهائياً. ما فيك ترجّعهم.')}</p>
            {removing.error && <p className="text-danger mt-2 mb-0">{removing.error}</p>}
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setRemoving(null)} disabled={removing.busy}>{tx('Cancel', 'إلغاء')}</button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={removing.busy}>
              {removing.busy ? tx('Deleting…', 'عم يحذف…') : tx('Yes, delete it', 'إيه، احذفه')}
            </button>
          </Modal.Footer>
        </Modal>
      )}
      {editing && (
        <NewStudioOrder
          tools={tools}
          order={editing}
          onCancel={() => setEditing(null)}
          onSave={async (patch, files = []) => {
            const o = await updateOrder(editing.id, patch);
            const failed = [];
            for (const f of files) { try { await uploadAdminOrderFile(o.id, f); } catch { failed.push(f.name); } }
            if (failed.length) setError(`${tx('Saved, but these files did not upload:', 'انحفظ، بس هالملفات ما انرفعت:')} ${failed.join('، ')}`);
            setOrders((list) => list.map((x) => (x.id === o.id ? o : x)));
            refreshAdminSummary();
            const becameReady = o.status === 'ready' && editing.status !== 'ready';
            setEditing(null);
            if (becameReady) setReadyFor(o);
          }}
        />
      )}
      {adding && (
        <NewStudioOrder
          tools={tools}
          onCancel={() => setAdding(false)}
          onSave={async (order, files = []) => {
            const o = await createAdminOrder(order);
            // the order is saved first; a file that fails to upload can be attached again from its card
            const failed = [];
            for (const f of files) { try { await uploadAdminOrderFile(o.id, f); } catch { failed.push(f.name); } }
            if (failed.length) setError(`${tx('The order was saved, but these files did not upload:', 'انحفظ الطلب، بس هالملفات ما انرفعت:')} ${failed.join('، ')}`);
            setOrders((list) => [o, ...(list || [])]);
            refreshAdminSummary();
            setAdding(false);
          }}
        />
      )}
      {orders && !shown.length && <p className="sd-muted">{tx('No studio orders yet.', 'لا توجد طلبات استوديو بعد.')}</p>}
      <div className="sd-orders">
        {shown.map((o) => (
          <article key={o.id} className={`sd-order st-${o.status}`}>
            <div className="sd-order-head">
              <b>{o.tool_name || o.tool_id}{o.params?.manual && <span className="sd-tag-manual">{tx('Added by hand', 'مزاد باليد')}</span>}</b>
              <span className="sd-muted">{o.id}</span>
            </div>
            <p className="sd-big" dir="auto">{summary(o.params)}</p>
            <p>
              <bdi>{o.customer_name}</bdi> · <a href={`tel:${o.customer_phone}`}>{o.customer_phone}</a>
              {' · '}
              <a href={`https://wa.me/${waNumber(o.customer_phone)}`} target="_blank" rel="noreferrer">{tx('WhatsApp', 'واتساب')}</a>
            </p>
            <p className="sd-muted">
              Qty {o.qty}
              {o.estimate && <> · {o.estimate.grams} g{o.estimate.minutes ? <> · ~{Math.floor(o.estimate.minutes / 60)}h {o.estimate.minutes % 60}m/pc</> : null} · {o.estimate.price} {o.estimate.currency}</>}
              {o.size && <> · {o.size.map((v) => Math.round(v)).join('×')} {tx('mm', 'مم')}</>}
              {' · '}{new Date(o.created_at).toLocaleString()}
            </p>
            {o.customer_address && <p dir="auto">📍 <bdi>{o.customer_address}</bdi></p>}
            {o.customer_location && <p><a href={o.customer_location} target="_blank" rel="noreferrer">{tx('🗺️ افتح الموقع على الخريطة', '🗺️ افتح الموقع على الخريطة')}</a></p>}
            {o.user_id && <p className="sd-account" dir="auto">🔗 {tx('Account:', 'الحساب:')} <span dir="ltr">{o.account?.email || o.account?.name || '—'}</span></p>}
            {o.notes && <p className="sd-notes" dir="auto">{o.notes}</p>}
            <OrderFiles orderId={o.id} />
            <div className="sd-order-foot">
              <button type="button" className="sd-btn" onClick={() => setEditing(o)}>{tx('Edit', 'تعديل')}</button>
              <button type="button" className="sd-btn sd-danger-btn" onClick={() => setRemoving({ order: o, busy: false, error: null })}>{tx('Delete', 'حذف')}</button>
              <select className="sd-select" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{tx(s.label, s.ar)}</option>)}
              </select>
              {o.tool_id === 'manual' ? null : o.tool_id === 'mold-maker' ? (
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
