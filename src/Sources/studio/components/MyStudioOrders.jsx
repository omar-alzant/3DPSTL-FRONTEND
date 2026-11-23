import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, Col, Row } from 'react-bootstrap';
import { listMyOrders, designPath, getConfig } from '../lib/api.js';
import { useLang } from '../../i18n/LanguageContext';
import { useT } from '../i18n/index.js';

// Studio orders for the logged-in customer, shown in Profile → My Orders
const STEPS = [
  { value: 'new', label: 'Received', ar: 'تم الاستلام' },
  { value: 'printing', label: 'Printing', ar: 'قيد الطباعة' },
  { value: 'ready', label: 'Ready', ar: 'جاهز' },
  { value: 'delivered', label: 'Delivered', ar: 'تم التسليم' },
];
const BADGE = { new: 'secondary', printing: 'info', ready: 'success', delivered: 'primary', cancelled: 'danger' };
const LABEL = { new: 'Received', printing: 'Printing', ready: 'Ready for pickup / delivery', delivered: 'Delivered', cancelled: 'Cancelled' };
const LABEL_AR = { new: 'تم الاستلام', printing: 'قيد الطباعة', ready: 'جاهز للاستلام / التوصيل', delivered: 'تم التسليم', cancelled: 'ملغى' };

const when = (d, lang) => (d && !isNaN(new Date(d)) ? new Date(d).toLocaleString(lang === 'ar' ? 'ar-LB' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const summary = (p = {}) => [p.text || p.name, p.letter || p.letters, p.digits].filter(Boolean).join(' · ');

function Progress({ status }) {
  const { tx } = useLang();
  if (status === 'cancelled') return null;
  const at = STEPS.findIndex((s) => s.value === status);
  return (
    <div className="studio-steps">
      {STEPS.map((s, i) => (
        <div key={s.value} className={`studio-step ${i <= at ? 'done' : ''} ${i === at ? 'current' : ''}`}>
          <span className="dot" />
          <small>{tx(s.label, s.ar)}</small>
        </div>
      ))}
    </div>
  );
}

export default function MyStudioOrders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [showPrices, setShowPrices] = useState(false);
  useEffect(() => { getConfig().then((c) => setShowPrices(c?.showPrices === true)).catch(() => {}); }, []);
  const { tx, lang } = useLang();
  const t = useT();

  useEffect(() => {
    listMyOrders().then(setOrders).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-danger small">{error}</p>;
  if (!orders) return <p className="small text-muted">{tx('Loading studio orders…', 'جارٍ تحميل طلبات الاستوديو…')}</p>;
  if (!orders.length)
    return (
      <p className="small text-muted">
        {tx('No custom design orders yet.', 'ما في طلبات تصاميم خاصة بعد.')} <Link to="/studio">{tx('Design one in the Studio', 'صمّم واحداً في الاستوديو')}</Link>.
      </p>
    );

  return orders.map((o) => (
    <Card key={o.id} className="mb-3 p-3 shadow-sm">
      <Row className="align-items-center">
        <Col md={6}>
          <strong>{tx('Order ID:', 'رقم الطلب:')}</strong> <bdi dir="ltr">{o.id}</bdi>
        </Col>
        <Col md={6} className="text-md-end">
          <strong>{tx('Status:', 'الحالة:')}</strong>{' '}
          <Badge bg={BADGE[o.status] || 'secondary'}>{tx(LABEL[o.status] || o.status, LABEL_AR[o.status] || o.status)}</Badge>
        </Col>
      </Row>
      <Row className="mt-1">
        <Col>
          <strong><bdi>{t(o.tool_name || o.tool_id)}</bdi></strong>
          {summary(o.params) && <> — <bdi>{summary(o.params)}</bdi></>}
        </Col>
      </Row>
      <Row>
        <Col>
          {tx('Qty', 'الكمية')} {o.qty}
          {showPrices && o.estimate?.price != null && <> · {tx('Estimated total:', 'المجموع التقريبي:')} <bdi dir="ltr">{o.estimate.price} {o.estimate.currency}</bdi></>}
        </Col>
      </Row>
      <Progress status={o.status} />
      <Row>
        <Col>
          <small>
            {when(o.created_at, lang) && <>{tx('Ordered', 'تاريخ الطلب:')} {when(o.created_at, lang)}</>}
            {when(o.updated_at, lang) && o.updated_at !== o.created_at && <> · {tx('Updated', 'آخر تحديث:')} {when(o.updated_at, lang)}</>}
          </small>
        </Col>
        <Col xs="auto">
          <Link className="small" to={designPath(o.tool_id, o.params)}>{tx('View design', 'عرض التصميم')}</Link>
        </Col>
      </Row>
    </Card>
  ));
}
