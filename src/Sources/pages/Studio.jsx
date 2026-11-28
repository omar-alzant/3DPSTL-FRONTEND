import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { getTool } from '../studio/tools/index.js';
import { getConfig, DEFAULT_CONFIG, decodeParams, hasSharedPictures, restorePictures } from '../studio/lib/api.js';
import { isToolEnabled } from '../studio/lib/pricing.js';
import Gallery from '../studio/components/Gallery.jsx';
import Editor from '../studio/components/Editor.jsx';
import SplitEditor, { SPLIT_TOOL } from '../studio/split/SplitEditor.jsx';
import '../Style/Studio.css';
import { useLang } from '../i18n/LanguageContext';

// a design link whose pictures are stored on the server: fetch them back before opening the editor.
// Picture fields only ever take pictures: any other web address in them is dropped.
function LinkedEditor({ tool, initial, ...rest }) {
  const { tx } = useLang();
  const clean = React.useMemo(() => {
    if (!initial) return initial;
    const out = { ...initial };
    for (const p of tool.params) if (p.type === 'image' && typeof out[p.key] === 'string' && !out[p.key].startsWith('data:image/') && !hasSharedPictures({ v: out[p.key] })) out[p.key] = '';
    return out;
  }, [initial, tool]);
  const needs = !!clean && hasSharedPictures(clean);
  const [restored, setRestored] = useState(null);
  useEffect(() => {
    let alive = true;
    if (needs) restorePictures(clean).then((p) => alive && setRestored(p));
    return () => { alive = false; };
  }, [clean, needs]);
  if (needs && !restored) return <div className="sd-loading-link">{tx('Opening the design…', 'عم نفتح التصميم…')}</div>;
  return <Editor tool={tool} initial={needs ? restored : clean} {...rest} />;
}

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
        <LinkedEditor key={toolId + (d || '') + (location.state?.params ? location.key : '')} tool={tool} initial={initial} config={config} orderId={location.state?.orderId} downloadId={location.state?.downloadId} />
      ) : (
        <Gallery config={config} />
      )}
    </div>
  );
}
