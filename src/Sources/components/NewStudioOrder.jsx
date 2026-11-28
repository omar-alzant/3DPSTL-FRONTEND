// Admin → Studio orders → "+ New order": add an order that came by phone, WhatsApp or in the shop.
// With `order` it edits that order instead (same form, filled in).
import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useLang } from '../i18n/LanguageContext';

const STATUSES = [
  ['new', 'New', 'جديد'],
  ['printing', 'Printing', 'قيد الطباعة'],
  ['ready', 'Ready', 'جاهز'],
  ['delivered', 'Delivered', 'تم التسليم'],
  ['cancelled', 'Cancelled', 'ملغى'],
];

const fromOrder = (o) => ({
  toolId: o.tool_id || 'manual',
  what: o.params?.what || '',
  name: o.customer_name || '',
  phone: o.customer_phone || '',
  address: o.customer_address || '',
  location: o.customer_location || '',
  qty: o.qty || 1,
  price: o.estimate?.price ?? '',
  status: o.status || 'new',
  notes: o.notes || '',
});

export default function NewStudioOrder({ tools, onSave, onCancel, order = null }) {
  const { tx } = useLang();
  const editing = !!order;
  const [f, setF] = useState(() => (order ? fromOrder(order) : { toolId: 'manual', what: '', name: '', phone: '', address: '', location: '', qty: 1, price: '', status: 'new', notes: '' }));
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim() || f.phone.replace(/\D/g, '').length < 6) {
      setError(tx('Write the name and the phone number.', 'اكتب الاسم ورقم التلفون.'));
      return;
    }
    const tool = tools.find((t) => t.id === f.toolId);
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await onSave({
          toolId: f.toolId,
          toolName: tool ? tool.name : f.toolId === order.tool_id ? order.tool_name : tx('Special order', 'طلب خاص'),
          what: f.what.trim(),
          customer: { name: f.name, phone: f.phone, address: f.address, location: f.location },
          qty: f.qty,
          price: f.price === '' ? null : Number(f.price),
          status: f.status,
          notes: f.notes,
        }, files);
        return;
      }
      await onSave({
        toolId: f.toolId,
        toolName: tool ? tool.name : tx('Special order', 'طلب خاص'),
        params: f.what.trim() ? { what: f.what.trim() } : {},
        customer: { name: f.name, phone: f.phone, address: f.address, location: f.location },
        qty: f.qty,
        price: f.price === '' ? null : Number(f.price),
        status: f.status,
        notes: f.notes,
      }, files);
    } catch (x) {
      setError(x.message);
      setBusy(false);
    }
  };

  return (
    <Modal show onHide={onCancel} centered scrollable fullscreen="sm-down">
      <form onSubmit={submit} className="sd-new-order">
        <Modal.Header closeButton>
          <Modal.Title>{editing ? `${tx('Edit order', 'تعديل الطلب')} ${order.id}` : tx('New studio order', 'طلب استوديو جديد')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <label>{tx('What', 'شو الطلب')}
            <select className="form-select" value={f.toolId} onChange={set('toolId')}>
              <option value="manual">{tx('Special order (not a Studio tool)', 'طلب خاص (مش من أدوات الاستوديو)')}</option>
              {tools.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label>{tx('Details (name on it, colours, size…)', 'التفاصيل (الاسم عليها، الألوان، الحجم…)')}
            <input className="form-control" value={f.what} onChange={set('what')} maxLength={200} dir="auto" />
          </label>
          <div className="sd-new-row">
            <label>{tx('Customer name', 'اسم الزبون')}
              <input className="form-control" value={f.name} onChange={set('name')} maxLength={80} required dir="auto" />
            </label>
            <label>{tx('Phone', 'التلفون')}
              <input className="form-control" value={f.phone} onChange={set('phone')} maxLength={30} required dir="ltr" inputMode="tel" placeholder="+961 …" />
            </label>
          </div>
          <label>{tx('Address (optional)', 'العنوان (اختياري)')}
            <input className="form-control" value={f.address} onChange={set('address')} maxLength={300} dir="auto" />
          </label>
          <label>{tx('Map link (optional)', 'رابط الموقع عالخريطة (اختياري)')}
            <input className="form-control" value={f.location} onChange={set('location')} maxLength={600} dir="ltr" placeholder="https://maps.google.com/…" />
          </label>
          <div className="sd-new-row">
            <label>{tx('Quantity', 'الكمية')}
              <input className="form-control" type="number" min="1" max="500" value={f.qty} onChange={set('qty')} />
            </label>
            <label>{tx('Price (optional)', 'السعر (اختياري)')}
              <input className="form-control" type="number" min="0" step="0.5" value={f.price} onChange={set('price')} inputMode="decimal" />
            </label>
            <label>{tx('Status', 'الحالة')}
              <select className="form-select" value={f.status} onChange={set('status')}>
                {STATUSES.map(([v, en, ar]) => <option key={v} value={v}>{tx(en, ar)}</option>)}
              </select>
            </label>
          </div>
          <label>{tx('Notes (optional)', 'ملاحظات (اختياري)')}
            <textarea className="form-control" rows="3" value={f.notes} onChange={set('notes')} maxLength={1000} dir="auto" />
          </label>
          <label>{editing ? tx('Add files (optional)', 'زيد ملفات (اختياري)') : tx('Files (optional): STL, 3MF, photos, PDF…', 'ملفات (اختياري): STL أو 3MF أو صور أو PDF…')}
            <input className="form-control" type="file" multiple onChange={(e) => setFiles([...e.target.files].filter((x) => x.size <= 60 * 1024 * 1024))} />
          </label>
          {files.length > 0 && <small className="text-muted d-block mb-2">{files.map((x) => x.name).join('، ')}</small>}
          {error && <p className="text-danger m-0">{error}</p>}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>{tx('Cancel', 'إلغاء')}</button>
          <button type="submit" className="btn btn-primary px-4" disabled={busy}>{busy ? (files.length ? tx('Saving and uploading…', 'عم نحفظ ونرفع الملفات…') : tx('Saving…', 'عم نحفظ…')) : editing ? tx('Save changes', 'احفظ التعديلات') : tx('Add the order', 'زيد الطلب')}</button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
