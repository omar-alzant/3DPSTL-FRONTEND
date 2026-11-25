import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n/LanguageContext';
import { WORKS_PATH } from '../config/site';

// Home: a wall of real photos from "Our works" — two rows drifting slowly in opposite directions.
// Each photo opens its piece. Pauses on hover/focus; with "reduce motion" the rows simply scroll by hand.
const base = process.env.REACT_APP_API_URL;
const KEY = 'worksWall';

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };

export default function WorksWall() {
  const { tx } = useLang();
  const [items, setItems] = useState(load);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch(`${base}/api/admin/products/item?pageSize=28`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const list = (d.items || [])
          .filter((i) => i.galleryurls?.[0])
          .map((i) => ({ id: i.id, name: i.name, src: i.galleryurls[0] }));
        setItems(list);
        setTotal(d.total || list.length);
        try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
      })
      .catch(() => {});
  }, []);

  if (items.length < 6) return null;
  const half = Math.ceil(items.length / 2);
  const rows = [items.slice(0, half), items.slice(half)];

  return (
    <section className="hm-wall-section" aria-labelledby="hm-works-title">
      <div className="hm-section-head">
        <div>
          <h2 className="hm-h2" id="hm-works-title">{tx('Our works', 'شغلنا')}</h2>
          <p className="hm-sub">{tx("Pieces we've printed. Open one to order something like it.", 'قطع طبعناها. افتح وحدة لتطلب متلها.')}</p>
        </div>
        <Link to={WORKS_PATH} className="hm-btn hm-btn-ghost hm-btn-sm">
          {total ? tx(`See all ${total}`, `شوف الـ${total} كلها`) : tx('See all', 'شوف الكل')}
        </Link>
      </div>
      <div className="hm-wall">
      {rows.map((row, r) => (
        <div key={r} className={`hm-wall-row ${r ? 'rev' : ''}`}>
          {/* the row is drawn twice so the loop has no gap; the copy is hidden from screen readers */}
          <div className="hm-wall-track" style={{ '--n': row.length }}>
            {[...row, ...row].map((it, i) => (
              <Link
                key={`${it.id}-${i}`}
                to={`/item/${it.id}`}
                className="hm-wall-tile"
                aria-hidden={i >= row.length ? 'true' : undefined}
                tabIndex={i >= row.length ? -1 : undefined}
                title={it.name}
              >
                <img src={it.src} alt={i >= row.length ? '' : it.name} loading="lazy" decoding="async" />
              </Link>
            ))}
          </div>
        </div>
      ))}
      </div>
    </section>
  );
}
