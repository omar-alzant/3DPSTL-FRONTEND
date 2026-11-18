import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, Col, Row } from 'react-bootstrap';
import { listMyOrders, designPath } from '../lib/api.js';

// Studio orders for the logged-in customer, shown in Profile → My Orders
const STEPS = [
  { value: 'new', label: 'Received' },
  { value: 'printing', label: 'Printing' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
];
const BADGE = { new: 'secondary', printing: 'info', ready: 'success', delivered: 'primary', cancelled: 'danger' };
const LABEL = { new: 'Received', printing: 'Printing', ready: 'Ready for pickup / delivery', delivered: 'Delivered', cancelled: 'Cancelled' };

const when = (d) => (d && !isNaN(new Date(d)) ? new Date(d).toLocaleString() : '');
const summary = (p = {}) => [p.text || p.name, p.letter || p.letters, p.digits].filter(Boolean).join(' · ');

function Progress({ status }) {
  if (status === 'cancelled') return null;
  const at = STEPS.findIndex((s) => s.value === status);
  return (
    <div className="studio-steps">
      {STEPS.map((s, i) => (
        <div key={s.value} className={`studio-step ${i <= at ? 'done' : ''} ${i === at ? 'current' : ''}`}>
          <span className="dot" />
          <small>{s.label}</small>
        </div>
      ))}
    </div>
  );
}

export default function MyStudioOrders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listMyOrders().then(setOrders).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-danger small">{error}</p>;
  if (!orders) return <p className="small text-muted">Loading studio orders…</p>;
  if (!orders.length)
    return (
      <p className="small text-muted">
        No custom design orders yet. <Link to="/studio">Design one in the Studio</Link>.
      </p>
    );

  return orders.map((o) => (
    <Card key={o.id} className="mb-3 p-3 shadow-sm">
      <Row className="align-items-center">
        <Col md={6}>
          <strong>Order ID:</strong> {o.id}
        </Col>
        <Col md={6} className="text-md-end">
          <strong>Status:</strong>{' '}
          <Badge bg={BADGE[o.status] || 'secondary'}>{LABEL[o.status] || o.status}</Badge>
        </Col>
      </Row>
      <Row className="mt-1">
        <Col>
          <strong><bdi>{o.tool_name || o.tool_id}</bdi></strong>
          {summary(o.params) && <> — <bdi>{summary(o.params)}</bdi></>}
        </Col>
      </Row>
      <Row>
        <Col>
          Qty {o.qty}
          {o.estimate?.price != null && <> · Estimated total: {o.estimate.price} {o.estimate.currency}</>}
        </Col>
      </Row>
      <Progress status={o.status} />
      <Row>
        <Col>
          <small>
            {when(o.created_at) && <>Ordered {when(o.created_at)}</>}
            {when(o.updated_at) && o.updated_at !== o.created_at && <> · Updated {when(o.updated_at)}</>}
          </small>
        </Col>
        <Col xs="auto">
          <Link className="small" to={designPath(o.tool_id, o.params)}>View design</Link>
        </Col>
      </Row>
    </Card>
  ));
}
