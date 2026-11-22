import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '../tools/index.js';
import { thumbnail } from '../lib/thumbs.js';
import { isToolEnabled } from '../lib/pricing.js';
import { useT } from '../i18n/index.js';
import { useLang } from '../../i18n/LanguageContext';
import { SPLIT_TOOL } from '../split/meta.js';

function Card({ tool }) {
  const tr = useT();
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
      <div className="sd-card-img">{img ? <img src={img} alt={tr(tool.name)} /> : <div className="sd-shimmer" />}</div>
      <div className="sd-card-body">
        <span className="sd-chip">{tr(tool.category)}</span>
        <h3>{tr(tool.name)}</h3>
        <p>{tr(tool.description)}</p>
      </div>
    </Link>
  );
}

export default function Gallery({ config }) {
  const { tx } = useLang();
  const tools = TOOLS.filter((t) => isToolEnabled(config, t.id));
  return (
    <div className="sd-gallery">
      <section className="sd-hero">
        <span className="sd-kicker" dir="ltr">3DSTL Studio</span>
        <h1>{tx('Design your piece… and print it', 'صمّم قطعتك… واطبعها')}</h1>
        <p>{tx('Pick a ready template, type your name, adjust sizes and colours, see the 3D result instantly, then download the file or order the print.', 'اختر قالباً جاهزاً، اكتب اسمك وعدّل المقاسات والألوان، شاهد النتيجة ثلاثية الأبعاد فوراً، ثم حمّل الملف أو اطلب الطباعة.')}</p>
        <div className="sd-row">
          <Link className="sd-btn sd-ghost" to="/credits">{tx('My credits', 'رصيد الكريدت')}</Link>
          <Link className="sd-btn sd-ghost" to="/tools">{tx('Free tools', 'أدوات مجانية')}</Link>
        </div>
      </section>
      {isToolEnabled(config, SPLIT_TOOL.id) && (
        <Link className="sd-split-card" to={`/studio/${SPLIT_TOOL.id}`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <path d="M60 10 103 35v50L60 110 17 85V35z" fill="#6a4dff" />
            <path d="M60 10 103 35 60 60 17 35z" fill="#8f7bff" />
            <path d="M60 60v50" stroke="#ffd43b" strokeWidth="4" strokeDasharray="6 5" />
            <path d="M17 35 60 60 103 35" fill="none" stroke="#ffd43b" strokeWidth="4" strokeDasharray="6 5" />
            <circle cx="60" cy="60" r="5" fill="#ff3b5c" /><circle cx="17" cy="35" r="5" fill="#ff3b5c" /><circle cx="103" cy="35" r="5" fill="#ff3b5c" />
          </svg>
          <div>
            <span className="sd-chip">{tx('New', 'جديد')}</span>
            <h3>{tx(SPLIT_TOOL.name, SPLIT_TOOL.nameAr)}</h3>
            <p>{tx('Upload your own STL or 3MF, draw a line around any area and cut it into its own part — then print every part in its own colour.', 'ارفع ملف STL أو 3MF تبعك، ارسم خط حوالين أي منطقة وقصّها لقطعة لحالها — وبعدين اطبع كل قطعة بلونها.')}</p>
          </div>
        </Link>
      )}
      <h2 className="sd-section-title">{tx('Templates', 'الأدوات')}</h2>
      <div className="sd-grid">
        {tools.map((t) => (
          <Card key={t.id} tool={t} />
        ))}
      </div>
    </div>
  );
}
