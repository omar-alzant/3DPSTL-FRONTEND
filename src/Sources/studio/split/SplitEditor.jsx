// Studio → "Split a model": upload an STL / 3MF, draw a loop on it, cut it into parts,
// give every part its own colour, download a multicolour 3MF or one STL per part.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { useAuth } from '../../context/AuthContext';
import { useCredits } from '../../context/CreditsContext';
import { useLang } from '../../i18n/LanguageContext';
import { toolCredits } from '../lib/pricing.js';
import { spendCredits, designHash } from '../lib/credits.js';
import { exportBambu3MF, exportSTLParts, stats as partStats } from '../lib/export.js';
import { loadPalette } from '../lib/palette.js';
import { ColorSelect } from '../components/ParamPanel.jsx';
import SplitViewer from './SplitViewer.jsx';
import { loadModelFile, MAX_BYTES } from './load.js';
import { runSplit } from './run.js';

import { SPLIT_TOOL } from './meta.js';

export { SPLIT_TOOL };

const FALLBACK_COLORS = ['#f2f0ea', '#1e1e1e', '#d9a066', '#6a4dff', '#d63031', '#2e86de', '#20bf6b', '#f7b731'];
let nextId = 1;
const r2 = (v) => Math.round(v * 100) / 100;

export default function SplitEditor({ config }) {
  const { token, isAdmin } = useAuth();
  const { tx, lang } = useLang();
  const { balance, setBalance } = useCredits();

  const [model, setModel] = useState(null); // { name, hash, triangles, size }
  const [parts, setParts] = useState([]);
  const [history, setHistory] = useState([]); // [{ parts, cuts }]
  const [cuts, setCuts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [points, setPoints] = useState([]);
  const [drawing, setDrawing] = useState(true);
  const [mode, setMode] = useState('through');
  const [depth, setDepth] = useState(3);
  const [tolerance, setTolerance] = useState(0.15);
  const [busy, setBusy] = useState(null); // 'loading' | 'cutting'
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [fitKey, setFitKey] = useState(0);
  const [palette, setPalette] = useState([]);
  const [guide, setGuide] = useState(false);
  const fileRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => { loadPalette().then(setPalette); }, []);
  const colorList = useMemo(() => palette.filter((c) => !/tpu/i.test(c.material || '')), [palette]);

  const pickColor = (used) => {
    const pool = colorList.length ? colorList.map((c) => c.hex) : FALLBACK_COLORS;
    return pool.find((c) => !used.includes(c)) || pool[used.length % pool.length];
  };

  // ---------- load ----------
  const openFile = async (file) => {
    if (!file) return;
    setError('');
    if (!/\.(stl|3mf)$/i.test(file.name)) return setError(tx('Choose an .stl or .3mf file.', 'اختار ملف ‎.stl أو ‎.3mf.'));
    if (file.size > MAX_BYTES) return setError(tx('This file is too big (over 120 MB).', 'الملف كبير كتير (أكتر من 120 MB).'));
    setBusy('loading');
    try {
      const m = await loadModelFile(file);
      const used = [];
      const list = m.parts.map((p) => {
        const color = p.color && /^#[0-9a-f]{6}$/i.test(p.color) && p.color !== '#ffffff' ? p.color : pickColor(used);
        used.push(color);
        return { id: nextId++, name: m.parts.length > 1 ? p.name : tx('Main body', 'الجسم الأساسي'), color, geometry: p.geometry, hidden: false };
      });
      setModel({ name: m.name, hash: m.hash, triangles: m.triangles, size: m.size });
      setParts(list);
      setHistory([]);
      setCuts([]);
      setPoints([]);
      setSelectedId(list[0].id);
      setDrawing(true);
      setFitKey((k) => k + 1);
    } catch (e) {
      setError(e.message === 'type' ? tx('Choose an .stl or .3mf file.', 'اختار ملف ‎.stl أو ‎.3mf.')
        : tx('Couldn’t read this file. Is it a valid STL / 3MF?', 'ما قدرنا نقرا هالملف. متأكد إنو STL أو 3MF سليم؟'));
    } finally {
      setBusy(null);
    }
  };
  const onPick = (e) => { const f = e.target.files?.[0]; e.target.value = ''; openFile(f); };

  // ---------- cut ----------
  // the part being cut: the one the points sit on (points beside the model belong to no part)
  const onPart = points.find((p) => p.partId);
  const target = points.length ? parts.find((p) => p.id === (onPart ? onPart.partId : selectedId) && !p.hidden) : null;
  const doSplit = async () => {
    if (points.length < 3 || !target || busy) return;
    const cam = apiRef.current?.camera;
    const c = points.reduce((a, p) => a.add(new THREE.Vector3(p.x, p.y, p.z)), new THREE.Vector3()).divideScalar(points.length);
    const dir = cam ? c.clone().sub(cam.position).normalize() : new THREE.Vector3(0, 1, 0);
    const opts = { points: points.map(({ x, y, z }) => ({ x, y, z })), dir: { x: dir.x, y: dir.y, z: dir.z }, mode, depth: Number(depth), tolerance: Number(tolerance) };
    setBusy('cutting');
    setError('');
    try {
      const r = await runSplit(target.geometry, opts);
      if (r.error) {
        const msg = {
          need3: tx('Place at least 3 points.', 'حط 3 نقاط عالأقل.'),
          tooSmall: tx('The loop is too small. Spread the points out more.', 'الحلقة صغيرة كتير. بعّد النقاط عن بعض.'),
          missed: tx('From this angle the loop doesn’t cover the model. Turn the view to look straight at the area and try again.', 'من هالزاوية الحلقة ما بتغطّي المجسّم. لفّ الشوف لتطلّع عالمنطقة من قدّام وجرّب مرة تانية.'),
          everything: tx('That cut would take the whole part. Draw a smaller loop.', 'هالقصة بتاخد القطعة كلها. ارسم حلقة أصغر.'),
        }[r.error] || tx('The cut failed. Try a slightly different loop or angle.', 'القص ما زبط. جرّب حلقة أو زاوية مختلفة شوي.');
        setError(msg);
        return;
      }
      const used = parts.map((p) => p.color);
      const piece = { id: nextId++, name: `${tx('Part', 'قطعة')} ${parts.length + 1}`, color: pickColor(used), geometry: r.piece, hidden: false };
      setHistory((h) => [...h.slice(-9), { parts, cuts }]);
      setParts((ps) => [...ps.map((p) => (p.id === target.id ? { ...p, geometry: r.rest } : p)), piece]);
      setCuts((cs) => [...cs, { part: target.id, mode, depth: r2(depth), tol: r2(tolerance), dir: [r2(dir.x), r2(dir.y), r2(dir.z)], pts: opts.points.map((p) => [r2(p.x), r2(p.y), r2(p.z)]) }]);
      setSelectedId(piece.id);
      setPoints([]);
    } finally {
      setBusy(null);
    }
  };
  const undoSplit = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setParts(last.parts);
    setCuts(last.cuts);
    setHistory((h) => h.slice(0, -1));
    setPoints([]);
  };
  const setPart = (id, patch) => setParts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  // ---------- download (credits, like every Studio tool) ----------
  const visible = parts.filter((p) => !p.hidden);
  const st = useMemo(() => (parts.length ? partStats(parts) : null), [parts]);
  const cost = isAdmin ? 0 : toolCredits(config, SPLIT_TOOL.id);
  const params = useMemo(() => (model ? { file: model.hash, cuts } : null), [model, cuts]);
  const [paid, setPaid] = useState(() => new Set());
  const [gate, setGate] = useState(null);
  const toolName = tx(SPLIT_TOOL.name, SPLIT_TOOL.nameAr);
  const body = (hash) => ({ toolId: SPLIT_TOOL.id, hash, params, toolName, label: (model?.name || '').slice(0, 80) });
  const download = async (run) => {
    if (!params) return;
    if (isAdmin) return run();
    const hash = await designHash(SPLIT_TOOL.id, params);
    if (paid.has(hash)) return run();
    if (!token) return cost === 0 ? run() : setGate({ step: 'login', run, hash });
    if (cost > 0) {
      try {
        const chk = await spendCredits({ ...body(hash), dry: true });
        if (!chk.already) {
          if (typeof chk.balance === 'number') setBalance(chk.balance);
          return setGate({ step: chk.balance < cost ? 'low' : 'confirm', run, hash });
        }
      } catch (e) {
        return setGate({ step: 'confirm', run, hash, error: e.message });
      }
    }
    try {
      const r = await spendCredits(body(hash));
      if (typeof r.balance === 'number') setBalance(r.balance);
      setPaid((s) => new Set(s).add(hash));
      run();
    } catch (e) {
      if (cost === 0) return run();
      setGate({ step: e.status === 402 ? 'low' : 'confirm', run, hash, error: e.status === 402 ? null : e.message });
    }
  };
  const confirmDownload = async () => {
    const g = gate;
    setGate({ ...g, step: 'busy', error: null });
    try {
      const r = await spendCredits(body(g.hash));
      if (typeof r.balance === 'number') setBalance(r.balance);
      setPaid((s) => new Set(s).add(g.hash));
      setGate(null);
      g.run();
    } catch (e) {
      if (e.status === 402) setGate({ ...g, step: 'low' });
      else setGate({ ...g, step: 'confirm', error: e.message });
    }
  };
  const tag = cost > 0 ? <small className="sd-cost"> · {cost} {tx('credits', 'كريدت')}</small> : null;
  const fileName = model ? `${model.name}-split` : 'split';

  // ---------- view ----------
  return (
    <div className="sd-editor">
      <aside className="sd-panel">
        <Link className="sd-back" to="/studio">{tx('← All templates', '→ كل الأدوات')}</Link>
        <h1>{toolName}</h1>
        <button type="button" className="sd-btn sd-ghost sd-guide-btn" onClick={() => setGuide(true)}>
          ▶ {tx('Watch how it works (1 min)', 'شوف كيف بتشتغل (دقيقة)')}
        </button>
        <p className="sd-muted">
          {tx('Upload your STL or 3MF, draw a loop around an area, and cut it into its own part — then give every part a colour and print it as one multicolour piece, or print the parts separately and put them together.',
            'ارفع ملف STL أو 3MF، ارسم حلقة حوالين أي منطقة وقصّها لقطعة لحالها، وبعدين اعطي كل قطعة لون واطبعها قطعة وحدة بكذا لون، أو اطبع القطع لحالها وركّبها.')}
        </p>

        {!model ? null : (
          <>
            <fieldset>
              <legend>{tx('1 · Draw the cut', '١ · ارسم القصة')}</legend>
              <p className="sd-help">
                {tx('Turn the model so you look straight at the area. Click to place points around it — at least 3 — and drag a point to move it. To cut off a whole piece (a base, an arm), put the points beside the model, all around it.',
                  'لفّ المجسّم لتطلّع عالمنطقة من قدّام. كبوس لتحط نقاط حواليها — 3 عالأقل — واسحب أي نقطة لتحرّكها. لتقص قطعة كاملة (قاعدة، إيد)، حط النقاط برّا المجسّم، حواليها كلها.')}
              </p>
              <div className="sd-seg" role="group" aria-label={tx('Cut type', 'نوع القص')}>
                <button type="button" className={mode === 'through' ? 'on' : ''} aria-pressed={mode === 'through'} onClick={() => setMode('through')}>{tx('Through', 'قص كامل')}</button>
                <button type="button" className={mode === 'depth' ? 'on' : ''} aria-pressed={mode === 'depth'} onClick={() => setMode('depth')}>{tx('Depth (inlay)', 'قص بعمق (تلبيسة)')}</button>
              </div>
              <small className="sd-hint">
                {mode === 'through'
                  ? tx('Cuts straight through the whole model, along your view.', 'بيقص عالمجسّم كلو من قدّام لورا، باتجاه نظرك.')
                  : tx('Cuts only a layer from the surface — great for faces, eyes, logos.', 'بيقص طبقة من الوجه بس — حلو للوجوه والعيون والشعارات.')}
              </small>
              {mode === 'depth' && (
                <div className="sd-field">
                  <label htmlFor="split-depth">{tx('Depth', 'العمق')}</label>
                  <div className="sd-range">
                    <input id="split-depth" type="range" min="0.6" max="20" step="0.2" value={depth} onChange={(e) => setDepth(e.target.value)} />
                    <input type="number" min="0.6" max="40" step="0.2" value={depth} onChange={(e) => setDepth(e.target.value)} aria-label={tx('Depth in mm', 'العمق بالمم')} />
                    <span className="sd-unit">mm</span>
                  </div>
                </div>
              )}
              <div className="sd-field">
                <label htmlFor="split-gap">{tx('Fit gap', 'فراغ التركيب')}</label>
                <div className="sd-range">
                  <input id="split-gap" type="range" min="0" max="0.5" step="0.05" value={tolerance} onChange={(e) => setTolerance(e.target.value)} />
                  <input type="number" min="0" max="1" step="0.05" value={tolerance} onChange={(e) => setTolerance(e.target.value)} aria-label={tx('Fit gap in mm', 'فراغ التركيب بالمم')} />
                  <span className="sd-unit">mm</span>
                </div>
                <small>{tx('A small gap so the printed parts slide into each other. 0 for one multicolour print.', 'فراغ صغير حتى القطع المطبوعة تفوت ببعض. خلّيه 0 إذا رح تطبعها قطعة وحدة بكذا لون.')}</small>
              </div>
              <div className="sd-actions">
                <button type="button" className={`sd-btn ${drawing ? 'sd-ghost' : ''}`} aria-pressed={drawing} onClick={() => setDrawing((d) => !d)}>
                  {drawing ? tx('Drawing: on', 'الرسم: شغّال') : tx('Drawing: off (rotate only)', 'الرسم: موقّف (تدوير بس)')}
                </button>
                <button type="button" className="sd-btn" disabled={!points.length} onClick={() => setPoints((p) => p.slice(0, -1))}>{tx('Undo point', 'شيل آخر نقطة')}</button>
                <button type="button" className="sd-btn" disabled={!points.length} onClick={() => setPoints([])}>{tx('Clear', 'امسح')}</button>
              </div>
              <div className="sd-actions mt-2">
                <button type="button" className="sd-btn sd-primary" disabled={points.length < 3 || !target || !!busy} onClick={doSplit}>
                  {busy === 'cutting' ? tx('Cutting…', 'عم يقص…') : tx(`Cut (${points.length} points)`, `قص (${points.length} نقاط)`)}
                </button>
                <button type="button" className="sd-btn sd-link" disabled={!history.length || !!busy} onClick={undoSplit}>{tx('Undo last cut', 'رجّع آخر قصة')}</button>
              </div>
            </fieldset>

            <fieldset>
              <legend>{tx('2 · Colours', '٢ · الألوان')}</legend>
              <ul className="sd-split-parts">
                {parts.map((p) => (
                  <li key={p.id} className={p.id === selectedId ? 'on' : ''}>
                    <button type="button" className="sd-split-name" onClick={() => setSelectedId(p.id)} aria-pressed={p.id === selectedId}>
                      <span className="sd-csel-dot" style={{ background: p.color }} />
                      <span>{p.name}</span>
                    </button>
                    <div className="sd-split-row">
                      {colorList.length ? (
                        <ColorSelect list={colorList} value={p.color} onChange={(c) => setPart(p.id, { color: c })} label={p.name} isAdmin={isAdmin} />
                      ) : (
                        <input type="color" value={p.color} onChange={(e) => setPart(p.id, { color: e.target.value })} aria-label={p.name} />
                      )}
                      <button type="button" className="sd-btn sd-split-eye" aria-pressed={!p.hidden} onClick={() => setPart(p.id, { hidden: !p.hidden })}
                        title={p.hidden ? tx('Show', 'بيّن') : tx('Hide', 'خبّي')} aria-label={p.hidden ? tx('Show part', 'بيّن القطعة') : tx('Hide part', 'خبّي القطعة')}>
                        {p.hidden ? '◌' : '●'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <small className="sd-hint">{tx('Hide a part to reach the area behind it.', 'خبّي قطعة لتوصل للمنطقة اللي وراها.')}</small>
            </fieldset>

            <button type="button" className="sd-btn sd-link" onClick={() => fileRef.current?.click()}>{tx('Open another file', 'افتح ملف تاني')}</button>
          </>
        )}
        <input ref={fileRef} type="file" accept=".stl,.3mf,model/stl,model/3mf" hidden onChange={onPick} />
      </aside>

      <section className="sd-stage">
        <div className="sd-canvas-wrap"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); openFile(e.dataTransfer.files?.[0]); }}
        >
          {model ? (
            <SplitViewer parts={parts} points={points} setPoints={setPoints} drawing={drawing && !busy} fitKey={fitKey} apiRef={apiRef} selectedId={selectedId} />
          ) : (
            <div className="sd-split-empty">
              <div
                className={`photo-drop ${dragOver ? 'is-over' : ''} ${busy ? 'is-busy' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => !busy && fileRef.current?.click()}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !busy) { e.preventDefault(); fileRef.current?.click(); } }}
              >
                <span className="photo-drop-icon" aria-hidden="true">⬡</span>
                <div className="photo-drop-text">
                  {busy === 'loading' ? tx('Opening your model…', 'عم نفتح المجسّم…') : (
                    <>
                      {tx('Drag your STL or 3MF here, or', 'اسحب ملف STL أو 3MF لهون، أو')}{' '}
                      <span className="photo-drop-link">{tx('choose a file', 'اختار ملف')}</span>
                    </>
                  )}
                </div>
                <small className="sd-muted">{tx('Up to 120 MB. Big, detailed models (over a million triangles) can be slow to cut.', 'لحد 120 MB. المجسّمات الكبيرة كتير (أكتر من مليون مثلث) ممكن يطوّل قصها.')}</small>
              </div>
              <button type="button" className="sd-guide-card" onClick={() => setGuide(true)}>
                <img src={`/media/split-guide-${lang === 'ar' ? 'ar' : 'en'}.jpg`} alt="" loading="lazy" />
                <span className="sd-guide-play" aria-hidden="true">▶</span>
                <span className="sd-guide-label">{tx('First time? Watch the 1-minute guide', 'أول مرة؟ شوف الشرح (دقيقة وحدة)')}</span>
              </button>
            </div>
          )}
          {busy === 'cutting' && <div className="sd-badge">{tx('Cutting… big models can take a little while', 'عم يقص… المجسّمات الكبيرة بتاخد شوي وقت')}</div>}
          {error && <div className="sd-badge sd-err" role="alert">{error}</div>}
          {model && drawing && !points.length && !busy && !error && (
            <div className="sd-badge">{tx('Click to place the first point', 'كبوس لتحط أول نقطة')}</div>
          )}
        </div>
        {model && (
          <div className="sd-bar">
            {st && (
              <dl className="sd-stats">
                <div><dt>{tx('Size', 'المقاس')}</dt><dd dir="ltr">{st.size.x.toFixed(1)} × {st.size.y.toFixed(1)} × {st.size.z.toFixed(1)} mm</dd></div>
                <div><dt>{tx('Parts', 'القطع')}</dt><dd>{parts.length}</dd></div>
                <div><dt>{tx('Colours', 'الألوان')}</dt><dd>{st.colors}</dd></div>
                <div><dt>{tx('Approx. weight', 'الوزن التقريبي')}</dt><dd>{st.grams.toFixed(0)} {tx('g', 'غ')}</dd></div>
                {model.triangles > 1000000 && <div><dt>{tx('Triangles', 'المثلثات')}</dt><dd dir="ltr">{(model.triangles / 1e6).toFixed(1)} M</dd></div>}
              </dl>
            )}
            <div className="sd-actions">
              <button className="sd-btn sd-primary" disabled={!visible.length || !!busy} onClick={() => download(() => exportBambu3MF(parts, fileName))}
                title={tx('One multicolour file for Bambu Studio / Orca: the parts stay in place, each in its colour', 'ملف واحد بكذا لون لـ Bambu Studio / Orca: القطع بمحلها وكل وحدة بلونها')}>
                {tx('3MF, multicolour', '3MF بكذا لون')}{tag}
              </button>
              <button className="sd-btn" disabled={!visible.length || !!busy} onClick={() => download(() => exportSTLParts(parts, fileName))}
                title={tx('A ZIP with one STL per part, to print them separately', 'ZIP فيه STL لكل قطعة، لتطبعهن لحالهن')}>
                {tx('STL per part (ZIP)', 'STL لكل قطعة (ZIP)')}{tag}
              </button>
            </div>
            {cost > 0 && (
              <p className="sd-credit-line">
                {tx('Downloading costs', 'التنزيل بيكلّف')} <b>{cost} {tx('credits', 'كريدت')}</b> {tx('(once, for both formats). Changing the colours afterwards is free.', '(مرة وحدة للصيغتين). تغيير الألوان بعدها ببلاش.')}
                {token && balance !== null && <> {tx('Your balance:', 'رصيدك:')} <b>{balance}</b>.</>} <Link to="/credits">{tx('Top up', 'اشحن رصيدك')}</Link>
              </p>
            )}
          </div>
        )}
      </section>

      {guide && (
        <div className="sd-modal-bg" onClick={() => setGuide(false)}>
          <div className="sd-modal sd-guide-modal" role="dialog" aria-label={tx('How the split tool works', 'كيف بيشتغل قص المجسّم')} onClick={(e) => e.stopPropagation()}>
            <button className="sd-x" onClick={() => setGuide(false)} aria-label={tx('Close', 'إغلاق')}>×</button>
            <h3>{tx('How it works', 'كيف بتشتغل')}</h3>
            <video
              key={lang}
              src={`/media/split-guide-${lang === 'ar' ? 'ar' : 'en'}.mp4`}
              poster={`/media/split-guide-${lang === 'ar' ? 'ar' : 'en'}.jpg`}
              controls
              autoPlay
              muted
              playsInline
              preload="metadata"
            />
          </div>
        </div>
      )}

      {gate && (
        <div className="sd-modal-bg" onClick={() => gate.step !== 'busy' && setGate(null)}>
          <div className="sd-modal sd-gate" onClick={(e) => e.stopPropagation()}>
            <button className="sd-x" onClick={() => setGate(null)} aria-label={tx('Close', 'إغلاق')}>×</button>
            {gate.step === 'login' ? (
              <>
                <h3>{tx('Log in to download the files', 'سجّل الدخول لتنزّل الملفات')}</h3>
                <p className="sd-muted">{tx('Downloading costs', 'التنزيل بيكلّف')} <b>{cost} {tx('credits', 'كريدت')}</b>. {tx('Your cuts are lost if you leave this page, so log in in a new tab, then come back and download.', 'القصّات بتروح إذا تركت الصفحة، فسجّل الدخول بتبويب جديد وارجع نزّل.')}</p>
                <div className="sd-row">
                  <a className="sd-btn sd-primary" href="/login" target="_blank" rel="noreferrer">{tx('Log in (new tab)', 'تسجيل الدخول (تبويب جديد)')}</a>
                </div>
              </>
            ) : gate.step === 'low' ? (
              <>
                <h3>{tx('Not enough credits', 'رصيدك لا يكفي')}</h3>
                <p className="sd-muted">{tx('Downloading needs', 'التنزيل بيحتاج')} <b>{cost} {tx('credits', 'كريدت')}</b>{tx(', and you have', '، ورصيدك')} <b>{balance ?? 0}</b>.</p>
                <div className="sd-row">
                  <a className="sd-btn sd-primary" href="/credits" target="_blank" rel="noreferrer">{tx('Top up (new tab)', 'اشحن رصيدك (تبويب جديد)')}</a>
                  <button className="sd-btn" onClick={() => setGate(null)}>{tx('Later', 'لاحقاً')}</button>
                </div>
              </>
            ) : (
              <>
                <h3>{tx('Download the files', 'تنزيل الملفات')}</h3>
                <p>{tx('This uses', 'سيُخصم')} <b>{cost} {tx('credits', 'كريدت')}</b> {tx('from your balance', 'من رصيدك')}{balance !== null && <> (<span dir="ltr">{balance} → {Math.max(0, balance - cost)}</span>)</>}.</p>
                <p className="sd-muted small">{tx('After that, both formats of these same cuts download free, even after you change the colours.', 'بعدها الصيغتين لنفس القصّات بينزلوا ببلاش، حتى لو غيّرت الألوان.')}</p>
                {gate.error && <p className="sd-error">{gate.error}</p>}
                <div className="sd-row">
                  <button className="sd-btn sd-primary" disabled={gate.step === 'busy'} onClick={confirmDownload}>
                    {gate.step === 'busy' ? tx('Working…', 'جارٍ…') : tx('Confirm & download', 'تأكيد وتنزيل')}
                  </button>
                  <button className="sd-btn" disabled={gate.step === 'busy'} onClick={() => setGate(null)}>{tx('Cancel', 'إلغاء')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
