import React, { useEffect, useState } from 'react';
import { useLang } from '../i18n/LanguageContext';

// Home hero: an enclosed multi-colour 3D printer (our own design, 3DSTL on the front) printing a vase
// layer by layer. A filament box on top holds 4 spools; every few layers the printer switches colour,
// the active spool lights up and the filament in the tube changes colour. Each loop uses a new palette.
// With "reduce motion" on, it shows the finished vase without moving.

const N = 32; // layers
const LH = 6; // layer height (px in the drawing)
const PLATE = 330; // top of the build plate
const CX = 200;
const LAYER_MS = 300;
const HOLD_MS = 2400;
const BAND = 4; // layers per colour

// palettes (4 spools each), soft matte filament tones; the loop goes through them one after the other
const PALETTES = [
  ['#8577d6', '#d98f7a', '#dfc47f', '#72b3a8'],
  ['#c9818b', '#e2c393', '#91bea1', '#7299b6'],
  ['#9d90c7', '#83a5c9', '#d18c9f', '#d9a073'],
];

// vase profile: half width of each layer
const halfWidth = (i) => {
  const t = i / (N - 1);
  return 26 + 22 * Math.sin(Math.PI * (t * 1.15 + 0.08)) - 10 * t + (t > 0.86 ? (t - 0.86) * 64 : 0);
};
const LAYERS = Array.from({ length: N }, (_, i) => ({ y: PLATE - (i + 1) * LH, w: halfWidth(i) }));
// which spool prints each layer: bands that go through the 4 spools
const spoolOf = (i) => Math.floor(i / BAND) % 4;

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const CYCLE = N * LAYER_MS + HOLD_MS;

export default function PrinterScene() {
  const { tx } = useLang();
  const [time, setTime] = useState(() => (reduced() ? N * LAYER_MS : 0));

  useEffect(() => {
    if (reduced()) return undefined;
    let raf;
    const start = performance.now();
    let last = 0;
    const loop = (now) => {
      if (now - last > 33) { last = now; setTime(Math.max(0, now - start)); } // ~30 fps is plenty; the first frame's time can be a little before start
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const safeTime = Math.max(0, time || 0);
  const round = Math.floor(safeTime / CYCLE);
  const t = safeTime % CYCLE;
  const pal = PALETTES[round % PALETTES.length];
  const done = t >= N * LAYER_MS;
  const current = Math.max(0, Math.min(N - 1, Math.floor(t / LAYER_MS)));
  const f = done ? 1 : (t % LAYER_MS) / LAYER_MS;
  const L = LAYERS[current];
  const dir = current % 2 ? -1 : 1;
  const headX = done ? CX : CX + dir * (-L.w + 2 * L.w * f);
  const headY = done ? LAYERS[N - 1].y - 40 : L.y - 2;
  const fade = done ? Math.min(1, Math.max(0, 1 - (t - N * LAYER_MS - HOLD_MS + 450) / 450)) : 1;
  const active = done ? -1 : spoolOf(current);
  const colorNow = active >= 0 ? pal[active] : pal[spoolOf(N - 1)];
  // spool x positions in the box on top
  const SP = [118, 172, 228, 282];
  const tubeStart = active >= 0 ? SP[active] : SP[spoolOf(N - 1)];

  return (
    <figure className="hm-printer" role="img" aria-label={tx('A 3D printer printing a colourful vase, layer by layer', 'طابعة ثلاثية الأبعاد عم تطبع مزهرية ملوّنة طبقة طبقة')}>
      <svg viewBox="0 0 400 460" aria-hidden="true">
        <defs>
          <linearGradient id="pr-chamber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b3b4a" />
            <stop offset="1" stopColor="#24242f" />
          </linearGradient>
          <linearGradient id="pr-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".16" />
            <stop offset=".35" stopColor="#ffffff" stopOpacity=".03" />
            <stop offset=".6" stopColor="#ffffff" stopOpacity=".09" />
            <stop offset="1" stopColor="#ffffff" stopOpacity=".02" />
          </linearGradient>
          <radialGradient id="pr-light" cx=".5" cy="0" r=".8">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".28" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <clipPath id="pr-window"><rect x="58" y="112" width="284" height="262" rx="14" /></clipPath>
        </defs>

        {/* filament box on top, with a window showing the 4 spools */}
        <rect x="70" y="14" width="260" height="72" rx="16" className="hm-pr-box" />
        <rect x="84" y="24" width="232" height="52" rx="11" className="hm-pr-boxwin" />
        {SP.map((x, i) => (
          <g key={i} className={i === active ? 'hm-pr-spool on' : 'hm-pr-spool'}>
            <circle cx={x} cy="50" r="21" fill={pal[i]} />
            <circle cx={x} cy="50" r="13" fill={pal[i]} style={{ filter: 'brightness(.8)' }} />
            <circle cx={x} cy="50" r="6" className="hm-pr-hub" />
          </g>
        ))}

        {/* printer body */}
        <rect x="40" y="92" width="320" height="356" rx="26" className="hm-pr-body" />
        <rect x="58" y="112" width="284" height="262" rx="14" fill="url(#pr-chamber)" />
        <rect x="58" y="112" width="284" height="80" rx="14" fill="url(#pr-light)" />
        <rect x="80" y="116" width="240" height="3" rx="1.5" className="hm-pr-lamp" />

        <g clipPath="url(#pr-window)">
          {/* the vase so far */}
          <g style={{ opacity: fade }}>
            {LAYERS.slice(0, done ? N : current).map((l, i) => (
              <rect key={i} x={CX - l.w} y={l.y} width={l.w * 2} height={LH - 0.7} rx="2.4" fill={pal[spoolOf(i)]} />
            ))}
            {!done && (() => {
              const from = dir > 0 ? CX - L.w : headX;
              const width = Math.abs(headX - (dir > 0 ? CX - L.w : CX + L.w));
              return <rect x={from} y={L.y} width={Math.max(0, width)} height={LH - 0.7} rx="2.4" fill={pal[spoolOf(current)]} />;
            })()}
          </g>

          {/* build plate */}
          <rect x="92" y={PLATE} width="216" height="8" rx="3" className="hm-pr-plate" />
          <rect x="112" y={PLATE + 8} width="176" height="30" rx="4" className="hm-pr-bed" />

          {/* gantry + tool head */}
          <rect x="66" y={headY - 38} width="268" height="8" rx="4" className="hm-pr-gantry" />
          <path d={`M${tubeStart} 112 C ${tubeStart} ${headY - 60}, ${headX + 30} ${headY - 70}, ${headX} ${headY - 42}`} fill="none" stroke={colorNow} strokeWidth="3" strokeLinecap="round" />
          <g transform={`translate(${headX} ${headY})`}>
            <rect x="-19" y="-46" width="38" height="36" rx="8" className="hm-pr-head" />
            <rect x="-12" y="-39" width="24" height="5" rx="2.5" fill={colorNow} />
            <path d="M-6 -10 L6 -10 L3 -2 L-3 -2 Z" className="hm-pr-nozzle" />
            {!done && <circle cx="0" cy="-1" r="2.4" className="hm-pr-hot" />}
          </g>
        </g>

        {/* glass door: frame + reflection */}
        <rect x="58" y="112" width="284" height="262" rx="14" fill="url(#pr-glass)" className="hm-pr-door" />
        <rect x="330" y="200" width="5" height="70" rx="2.5" className="hm-pr-handle" />

        {/* front panel: small screen + name */}
        <rect x="66" y="392" width="92" height="38" rx="8" className="hm-pr-screen" />
        <rect x="74" y="402" width={done ? 76 : 76 * Math.min(1, t / (N * LAYER_MS))} height="5" rx="2.5" fill={colorNow} />
        <rect x="74" y="414" width="40" height="4" rx="2" className="hm-pr-screenline" />
        <text x="330" y="418" textAnchor="end" className="hm-pr-brand">3DSTL</text>
        <circle cx="186" cy="411" r="4.5" className={done ? 'hm-pr-led done' : 'hm-pr-led'} />
      </svg>
    </figure>
  );
}
