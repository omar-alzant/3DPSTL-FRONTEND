import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { getTool } from '../studio/tools/index.js';
import { getConfig, DEFAULT_CONFIG, decodeParams } from '../studio/lib/api.js';
import { isToolEnabled } from '../studio/lib/pricing.js';
import Gallery from '../studio/components/Gallery.jsx';
import Editor from '../studio/components/Editor.jsx';
import SplitEditor, { SPLIT_TOOL } from '../studio/split/SplitEditor.jsx';
import '../Style/Studio.css';
import { useLang } from '../i18n/LanguageContext';

// صفحة Studio: معرض الأدوات على /studio والمحرّر على /studio/:toolId (و ?d=… لتصميم محفوظ)
export default function Studio() {
  const { toolId } = useParams();
  const { dir, lang } = useLang();
  const [search] = useSearchParams();
  const location = useLocation();
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    getConfig().then(setConfig);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [toolId]);

  const isSplit = toolId === SPLIT_TOOL.id;
  const tool = toolId && !isSplit ? getTool(toolId) : null;
  // أداة مخفية من لوحة التسعير: لا تُفتح إلا من طلب موجود (لوحة الإدارة)
  const hidden = tool && !isToolEnabled(config, tool.id) && !location.state?.params;
  if ((toolId && !tool && !isSplit) || hidden || (isSplit && !isToolEnabled(config, SPLIT_TOOL.id))) return <Navigate to="/studio" replace />;

  const d = search.get('d');
  // من لوحة الإدارة نمرّر الإعدادات كاملة (مع الشعار) عبر state بدل الرابط
  const initial = location.state?.params || (d ? decodeParams(d) : null);

  return (
    <div className="studio" dir={dir} lang={lang}>
      {isSplit ? (
        <SplitEditor config={config} />
      ) : tool ? (
        <Editor key={toolId + (d || '') + (location.state?.params ? location.key : '')} tool={tool} initial={initial} config={config} orderId={location.state?.orderId} downloadId={location.state?.downloadId} />
      ) : (
        <Gallery config={config} />
      )}
    </div>
  );
}
