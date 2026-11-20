import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '../tools/index.js';
import { thumbnail } from '../lib/thumbs.js';
import { isToolEnabled } from '../lib/pricing.js';

function Card({ tool }) {
  const [img, setImg] = useState(null);
  useEffect(() => {
    let alive = true;
    // رسم الصور بالتتابع حتى لا يتجمّد المتصفح
    const t = setTimeout(() => thumbnail(tool).then((u) => alive && setImg(u)).catch(() => {}), 30);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [tool]);
  return (
    <Link className="sd-card" to={`/studio/${tool.id}`}>
      <div className="sd-card-img">{img ? <img src={img} alt={tool.name} /> : <div className="sd-shimmer" />}</div>
      <div className="sd-card-body">
        <span className="sd-chip">{tool.category}</span>
        <h3>{tool.name}</h3>
        <p>{tool.description}</p>
      </div>
    </Link>
  );
}

export default function Gallery({ config }) {
  const tools = TOOLS.filter((t) => isToolEnabled(config, t.id));
  return (
    <div className="sd-gallery">
      <section className="sd-hero">
        <span className="sd-kicker" dir="ltr">3DSTL Studio</span>
        <h1>صمّم قطعتك… واطبعها</h1>
        <p>اختر قالباً جاهزاً، اكتب اسمك وعدّل المقاسات والألوان، شاهد النتيجة ثلاثية الأبعاد فوراً، ثم حمّل الملف أو اطلب الطباعة.</p>
        <div className="sd-row">
          <Link className="sd-btn sd-ghost" to="/credits">رصيد الكريدت</Link>
          <Link className="sd-btn sd-ghost" to="/tools">أدوات مجانية</Link>
        </div>
      </section>
      <h2 className="sd-section-title">الأدوات</h2>
      <div className="sd-grid">
        {tools.map((t) => (
          <Card key={t.id} tool={t} />
        ))}
      </div>
    </div>
  );
}
