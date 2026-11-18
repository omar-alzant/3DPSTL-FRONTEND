import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { defaults } from '../tools/index.js';
import { useBuild } from '../lib/useBuild.js';
import { exportSTL, exportSTLByColor, exportBambu3MF } from '../lib/export.js';
import { designLink } from '../lib/api.js';
import { priceFor, printMinutes, formatMinutes } from '../lib/pricing.js';
import { peekPending, clearPending } from '../lib/pending.js';
import { useAuth } from '../../context/AuthContext';
import ParamPanel from './ParamPanel.jsx';
import Viewer from './Viewer.jsx';
import OrderDialog from './OrderDialog.jsx';

export default function Editor({ tool, initial, config, orderId }) {
  const { token } = useAuth();
  // a design saved before the customer went to log in comes back here (with its logo)
  const [pending] = useState(() => peekPending(tool.id));
  useEffect(() => { if (pending) clearPending(); }, [pending]);
  const [params, setParams] = useState(() => ({ ...defaults(tool), ...(initial || {}), ...(pending || {}) }));
  const [order, setOrder] = useState(!!(pending && token));
  const [copied, setCopied] = useState(false);
  const { parts, stats, error, busy } = useBuild(tool, params);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setParams({ ...defaults(tool), ...(initial || {}), ...(pending || {}) }), [tool]);

  const onChange = (k, v) => setParams((p) => ({ ...p, [k]: v }));
  // التصميم المفتوح من طلب: كل الملفات المنزّلة تبدأ برقم الطلب (مثل ST-261118-A3F9-birth-sign.3mf)
  const name = orderId ? `${orderId}-${tool.id}` : `${tool.id}-${params.text || params.name || params.digits || ''}`;
  const colors = parts ? new Set(parts.map((p) => p.color)).size : 0;
  const minutes = stats ? printMinutes(stats, config) : 0;
  const price = stats ? priceFor(config, tool.id, stats.grams, colors, minutes) : 0;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(designLink(tool.id, params));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div className="sd-editor">
      <aside className="sd-panel">
        <Link className="sd-back" to="/studio">→ كل الأدوات</Link>
        {orderId && <div className="sd-order-tag">طلب رقم <b dir="ltr">{orderId}</b> — كل الملفات المنزّلة تحمل هذا الرقم</div>}
        <h1>{tool.name}</h1>
        <p className="sd-muted">{tool.description}</p>
        <ParamPanel tool={tool} params={params} onChange={onChange} />
        <button className="sd-btn sd-link" onClick={() => setParams(defaults(tool))}>إعادة الضبط</button>
      </aside>

      <section className="sd-stage">
        <div className="sd-canvas-wrap">
          <Viewer parts={parts} fitKey={tool.id} />
          {busy && <div className="sd-badge">جارٍ التحديث…</div>}
          {error && <div className="sd-badge sd-err">خطأ: {error}</div>}
        </div>
        <div className="sd-bar">
          {stats && (
            <dl className="sd-stats">
              <div><dt>المقاس</dt><dd dir="ltr">{stats.size.x.toFixed(1)} × {stats.size.y.toFixed(1)} × {stats.size.z.toFixed(1)} mm</dd></div>
              <div><dt>الوزن التقريبي</dt><dd>{stats.grams.toFixed(1)} غ</dd></div>
              <div><dt>وقت الطباعة التقريبي</dt><dd>{formatMinutes(minutes)}</dd></div>
              <div><dt>الألوان</dt><dd>{colors}</dd></div>
              <div><dt>السعر التقريبي</dt><dd><b>{price.toFixed(2)} {config.currency}</b></dd></div>
            </dl>
          )}
          <div className="sd-actions">
            <button className="sd-btn sd-primary" disabled={!parts?.length} onClick={() => setOrder(true)}>اطلب الطباعة</button>
            <button className="sd-btn" disabled={!parts?.length} onClick={() => exportSTL(parts, name)}>تحميل STL</button>
            <button className="sd-btn" disabled={!parts?.length} onClick={() => exportBambu3MF(parts, name)} title="مشروع Bambu Studio (طابعة A1) يفتح بنفس الألوان التي اخترتها">3MF ملف</button>
            <button className="sd-btn" disabled={!parts?.length} onClick={() => exportSTLByColor(parts, name)}>STL لكل لون</button>
            <button className="sd-btn sd-link" onClick={copyLink}>{copied ? 'تم النسخ ✓' : 'نسخ رابط التصميم'}</button>
          </div>
        </div>
      </section>

      {order && stats && (
        <OrderDialog tool={tool} params={params} stats={stats} price={price} minutes={minutes} config={config} onClose={() => setOrder(false)} />
      )}
    </div>
  );
}
