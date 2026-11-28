// Admin → Studio orders: when an order turns "Ready", offer to tell the customer by WhatsApp or email.
import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { emailOrderReady } from '../studio/lib/api.js';
import { useLang } from '../i18n/LanguageContext';

/** Lebanese numbers are often written locally (71 922 605, 03 123 456): add 961 so WhatsApp finds them */
export function waNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length <= 8) d = `961${d}`;
  return d;
}

const defaultMessage = (o) =>
  `مرحبا ${o.customer_name}،\nطلبك من 3DSTL (رقم ${o.id}${o.tool_name ? ` — ${o.tool_name}` : ''}) صار جاهز 🎉\nخبّرنا إيمتى بيناسبك تستلمه أو نبعتلك ياه.\nشكراً على ثقتك 💜\n\n— رسالة مبعوتة من موقع www.3dpstl.com`;

export default function ReadyNotice({ order, onClose }) {
  const { tx } = useLang();
  const [msg, setMsg] = useState(() => defaultMessage(order));
  const [state, setState] = useState({ sending: false, sent: null, error: null });
  const hasAccount = !!order.user_id;

  const email = async () => {
    setState({ sending: true, sent: null, error: null });
    try {
      const r = await emailOrderReady(order.id, msg);
      setState({ sending: false, sent: r.email || true, error: null });
    } catch (e) {
      setState({ sending: false, sent: null, error: e.message });
    }
  };

  return (
    <Modal show onHide={onClose} centered fullscreen="sm-down" className="sd-ready-notice">
      <Modal.Header closeButton>
        <Modal.Title>{tx('Tell the customer it’s ready?', 'خبّر الزبون إنو الطلب جاهز؟')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-2"><bdi>{order.customer_name}</bdi> · <span dir="ltr">{order.customer_phone}</span> · <span className="text-muted">{order.id}</span></p>
        <label className="w-100">
          <span className="d-block mb-1 text-muted">{tx('Message (you can change it)', 'الرسالة (فيك تعدّلها)')}</span>
          <textarea className="form-control" rows="5" value={msg} onChange={(e) => setMsg(e.target.value)} dir="auto" maxLength={1000} />
        </label>
        {!hasAccount && (
          <small className="text-muted d-block mt-2">{tx('This order isn’t linked to an account, so there’s no email: WhatsApp only.', 'هالطلب مش مربوط بحساب، فما في إيميل: بس واتساب.')}</small>
        )}
        {state.sent && <p className="text-success mt-2 mb-0">{tx('Email sent', 'انبعت الإيميل')}{typeof state.sent === 'string' ? ` (${state.sent})` : ''} ✓</p>}
        {state.error && <p className="text-danger mt-2 mb-0">{state.error}</p>}
      </Modal.Body>
      <Modal.Footer className="flex-wrap">
        <button type="button" className="btn btn-outline-secondary me-auto" onClick={onClose}>{tx('Not now', 'مش هلّق')}</button>
        {hasAccount && (
          <button type="button" className="btn btn-outline-primary" onClick={email} disabled={state.sending || !!state.sent}>
            {state.sending ? tx('Sending…', 'عم يبعت…') : tx('Send email', 'ابعت إيميل')}
          </button>
        )}
        <a
          className="btn btn-success"
          href={`https://wa.me/${waNumber(order.customer_phone)}?text=${encodeURIComponent(msg)}`}
          target="_blank"
          rel="noreferrer"
        >
          {tx('Send on WhatsApp', 'ابعت عالواتساب')}
        </a>
      </Modal.Footer>
    </Modal>
  );
}
