import React, { useCallback, useEffect, useRef, useState } from "react";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { Container, Row, Col, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import useIsDesktop from "../hooks/useIsDesktop";
import '../Style/Category.css'
import { useToast } from "../context/ToastProvider";
import { useLang } from '../i18n/LanguageContext';

const INITIAL_MENU_STATE = { id: null, name: null, types: [] };

function CategoryMenu({ onNavigate }) {
  const { tx } = useLang();
  const [menuData, setMenuData] = useState([]);
  const [activeCategory, setActiveCategory] = useState(INITIAL_MENU_STATE);

  // 🔹 MOBILE ONLY STATES
  const [mobileCategory, setMobileCategory] = useState(null);
  const [mobileType, setMobileType] = useState(null);
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL}/api/category/menu`
        );
        const json = await res.json();
        setMenuData(json.data || []);
        
      } catch (err) {
        showToast(err, "danger");
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const chipsRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  // which ends of the chip row are cut off (physical left/right, works in Arabic too)
  const updateEdges = useCallback(() => {
    const el = chipsRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const x = Math.abs(el.scrollLeft);
    const rtl = getComputedStyle(el).direction === 'rtl';
    const atStart = x <= 2, atEnd = x >= max - 2;
    setEdges(max <= 2 ? { left: false, right: false } : rtl ? { left: !atEnd, right: !atStart } : { left: !atStart, right: !atEnd });
  }, []);
  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [updateEdges, menuData, isDesktop]);
  const scrollChips = (dir) => chipsRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });

  const go = (url) => {
    navigate(url);
    setActiveCategory(INITIAL_MENU_STATE);
    onNavigate && onNavigate();
  };
  const openCategory = (cat) => {
    const ids = (cat.types || []).map((t) => t.id);
    if (ids.length) go(`/our-works?type_id=${ids.join(',')}`);
  };

  if (loading) {
    return <Spinner size="sm" />;
  }

  return (
    <Container               
      onMouseLeave={() => setActiveCategory(INITIAL_MENU_STATE)}
    >
      <Row>

        {/* ===================== DESKTOP ===================== */}
        {isDesktop && (
          <Col xs={12}>
            <div className="cat-bar">
              <span className="cat-bar-label">{tx('Categories', 'الأصناف')}</span>
              <div className="cat-chips-wrap">
                {edges.left && (
                  <button type="button" className="cat-scroll cat-scroll-left" onClick={() => scrollChips(-1)} aria-label={tx('Scroll left', 'لليسار')}>
                    <IoIosArrowBack />
                  </button>
                )}
                <div className="cat-chips" ref={chipsRef} onScroll={updateEdges}>
                  {menuData.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      className={`cat-chip ${activeCategory.id === cat.id ? 'on' : ''}`}
                      onMouseEnter={() => setActiveCategory(cat)}
                      onFocus={() => setActiveCategory(cat)}
                      onClick={() => openCategory(cat)}
                      aria-expanded={activeCategory.id === cat.id}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                {edges.right && (
                  <button type="button" className="cat-scroll cat-scroll-right" onClick={() => scrollChips(1)} aria-label={tx('Scroll right', 'لليمين')}>
                    <IoIosArrowForward />
                  </button>
                )}
              </div>
            </div>

            {activeCategory.id && (
              <div className="cat-panel">
                <div className="cat-panel-head">
                  <button type="button" className="cat-panel-title" onClick={() => openCategory(activeCategory)}>
                    {tx(`All ${activeCategory.name}`, `كل ${activeCategory.name}`)}
                  </button>
                  <button type="button" className="cat-panel-close" onClick={() => setActiveCategory(INITIAL_MENU_STATE)} aria-label={tx('Close', 'إغلاق')}>×</button>
                </div>
                {activeCategory.types?.length ? (
                  <div className="cat-panel-grid">
                    {activeCategory.types.map((type) => (
                      <div key={type.id} className="cat-col">
                        <button type="button" className="cat-col-title" onClick={() => go(`/our-works?type_id=${type.id}`)}>
                          {type.name}
                        </button>
                        <ul>
                          {type.models?.map((model) => (
                            <li key={model.id}>
                              <button type="button" className="cat-link" onClick={() => go(`/our-works?model_id=${model.id}`)}>
                                {model.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="cat-empty">{tx('Nothing in this category yet.', 'بعد ما في شي بهالصنف.')}</p>
                )}
              </div>
            )}
          </Col>
        )}

        {/* ===================== MOBILE: category → type → model ===================== */}
        {!isDesktop && (
          <Col xs={12} className="mcat">
            {!mobileCategory && (
              <>
                <div className="mcat-title">{tx('Categories', 'الأصناف')}</div>
                <div className="mcat-grid">
                  {menuData.map((cat) => (
                    <button type="button" key={cat.id} className="mcat-tile" onClick={() => { setMobileCategory(cat); setMobileType(null); }}>
                      <span>{cat.name}</span>
                      <IoIosArrowForward className="flip-rtl" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {mobileCategory && !mobileType && (
              <>
                <button type="button" className="mcat-back" onClick={() => setMobileCategory(null)}>
                  <IoIosArrowBack className="flip-rtl" aria-hidden="true" /> {tx('Categories', 'الأصناف')}
                </button>
                <div className="mcat-title">{mobileCategory.name}</div>
                <ul className="mcat-list">
                  <li>
                    <button type="button" className="mcat-row mcat-all" onClick={() => openCategory(mobileCategory)}>
                      {tx(`All ${mobileCategory.name}`, `كل ${mobileCategory.name}`)}
                    </button>
                  </li>
                  {mobileCategory.types?.map((type) => (
                    <li key={type.id}>
                      <button type="button" className="mcat-row" onClick={() => setMobileType(type)}>
                        <span>{type.name}</span>
                        <IoIosArrowForward className="flip-rtl" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {mobileType && (
              <>
                <button type="button" className="mcat-back" onClick={() => setMobileType(null)}>
                  <IoIosArrowBack className="flip-rtl" aria-hidden="true" /> {mobileCategory?.name}
                </button>
                <div className="mcat-title">{mobileType.name}</div>
                <ul className="mcat-list">
                  <li>
                    <button type="button" className="mcat-row mcat-all" onClick={() => go(`/our-works?type_id=${mobileType.id}`)}>
                      {tx(`All ${mobileType.name}`, `كل ${mobileType.name}`)}
                    </button>
                  </li>
                  {mobileType.models?.map((model) => (
                    <li key={model.id}>
                      <button type="button" className="mcat-row" onClick={() => go(`/our-works?model_id=${model.id}`)}>
                        {model.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Col>
        )}
      </Row>
    </Container>
  );
}

export default CategoryMenu;
