// Home: the "They trusted us" logos drift slowly in a loop, like the works wall.
// The arrows push the row along, a finger or mouse can drag it, and it stops while you point at it.
import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const SPEED = 28; // px per second

export default function LogoMarquee({ brands, linkTo, backLabel, nextLabel }) {
  const viewRef = useRef(null);
  const trackRef = useRef(null);
  // enough copies to fill a wide screen, so the loop never shows a gap
  const copies = Math.max(2, Math.ceil(18 / Math.max(1, brands.length)));
  const s = useRef({ pos: 0, nudge: 0, hover: false, focus: false, drag: null, moved: false });

  useEffect(() => {
    const view = viewRef.current;
    const track = trackRef.current;
    if (!view || !track) return undefined;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const st = s.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const rtl = getComputedStyle(view).direction === "rtl";
      const half = track.scrollWidth / copies; // one full set of logos
      if (!st.drag) {
        if (!st.hover && !st.focus && !still) st.pos += SPEED * dt;
        if (st.nudge) {
          const step = Math.abs(st.nudge) < 0.5 ? st.nudge : st.nudge * Math.min(1, dt * 7);
          st.pos += step;
          st.nudge -= step;
        }
      }
      if (half > 0) st.pos = ((st.pos % half) + half) % half;
      track.style.transform = `translate3d(${rtl ? st.pos : -st.pos}px,0,0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [brands.length, copies]);

  const push = (d) => {
    const view = viewRef.current;
    if (view) s.current.nudge += d * view.clientWidth * 0.6;
  };

  const sign = () => (viewRef.current && getComputedStyle(viewRef.current).direction === "rtl" ? -1 : 1);
  const onDown = (e) => {
    s.current.drag = { x: e.clientX, id: e.pointerId };
    s.current.moved = false;
    s.current.nudge = 0;
  };
  const onMove = (e) => {
    const d = s.current.drag;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    d.x = e.clientX;
    if (Math.abs(dx) > 0) {
      s.current.pos -= dx * sign();
      if (!s.current.moved && Math.abs(dx) > 2) {
        s.current.moved = true;
        try { viewRef.current.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      }
    }
  };
  const onUp = () => { s.current.drag = null; };
  // a drag shouldn't open the logo it started on
  const onClickCapture = (e) => {
    if (s.current.moved) { e.preventDefault(); e.stopPropagation(); s.current.moved = false; }
  };

  const items = (copy) =>
    brands.map((b) => (
      <li key={`${copy}-${b.id}`} aria-hidden={copy ? "true" : undefined}>
        <Link
          to={linkTo(b)}
          className="hm-logo"
          title={b.name}
          tabIndex={copy ? -1 : undefined}
          draggable={false}
        >
          <img src={b.image} alt={copy ? "" : b.name} loading="lazy" decoding="async" draggable={false} />
        </Link>
      </li>
    ));

  return (
    <div className="hm-logos-wrap">
      <button type="button" className="hm-logos-arrow prev" aria-label={backLabel} onClick={() => push(-1)}>‹</button>
      <div
        className="hm-logos"
        ref={viewRef}
        onPointerEnter={(e) => { if (e.pointerType === "mouse") s.current.hover = true; }}
        onPointerLeave={() => { s.current.hover = false; onUp(); }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onFocus={() => { s.current.focus = true; }}
        onBlur={() => { s.current.focus = false; }}
        onClickCapture={onClickCapture}
      >
        <ul className="hm-logos-track" ref={trackRef}>
          {Array.from({ length: copies }, (_, i) => items(i))}
        </ul>
      </div>
      <button type="button" className="hm-logos-arrow next" aria-label={nextLabel} onClick={() => push(1)}>›</button>
    </div>
  );
}
