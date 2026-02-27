import React, { useEffect, useState } from "react";
import { Container, Row, Col, Spinner, Accordion } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import useIsDesktop from "../hooks/useIsDesktop";
import '../Style/Category.css'
import { useToast } from "../context/ToastProvider";

const INITIAL_MENU_STATE = { id: null, name: null, types: [] };

function CategoryMenu({ onNavigate }) {
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

  if (loading) {
    return <Spinner size="sm" />;
  }

  return (
    <Container               
      onMouseLeave={() => setActiveCategory(INITIAL_MENU_STATE)}
    >
      <Row>

        {/* ===================== DESKTOP (UNCHANGED) ===================== */}
        {isDesktop && (
          <>
            <Col xs={12} 
              style={{  alignItems: "baseline" }}             
              className="d-flex flex-row mb-1"

            >
              <h6 className="fw-bold p-2">Categories:</h6>
              <ul 
                  className="list-unstyled d-flex flex-nowrap overflow-auto  category-scroll-container" 
                  style={{ whiteSpace: 'nowrap', alignItems: "baseline" }}             
              >
                {menuData.map((cat, index) => (
                  <React.Fragment key={cat.id}>
                    <li
                      className={`cursor  category-list
                        ${activeCategory.id === cat.id ? "text-primary fw-bold" : ""}
                        d-inline p-2
                      `}
                      onClick={() => setActiveCategory(cat)}
                      onMouseMove={() => setActiveCategory(cat)}
                    >
                      {cat.name}
                    </li>
                    {index < menuData.length - 1 && " | "}
                  </React.Fragment>
                ))}
              </ul>
            </Col>

            {/* <hr /> */}

            {activeCategory?.types?.length > 0 ? (
              <Col xs={12}>
                <div className="d-flex align-items-center justify-content-between border-top pt-3 mb-2">
                  <h6 className="fw-bold mb-0">
                    {activeCategory.name}
                  </h6>

                  <span
                    className="text-muted cursor"
                    onClick={() => setActiveCategory(INITIAL_MENU_STATE)}
                  >
                    ✕ Close
                  </span>
                </div>

                <Accordion alwaysOpen={false}>
                  {activeCategory.types.map((type, index) => (
                    <Accordion.Item
                      eventKey={String(index)}
                      key={type.id}
                    >
                      <Accordion.Header>
                        {type.name}
                      </Accordion.Header>

                      <Accordion.Body>
                        <ul className="list-unstyled ps-2 mb-0">
                          {type.models?.map(model => (
                            <li
                              key={model.id}
                              className="modelInCategory cursor py-1 text-secondary"
                              onClick={() => {
                                navigate(`/shop?model_id=${model.id}`);
                                onNavigate && onNavigate();
                              }}
                            >
                              {model.name}
                            </li>
                          ))}
                        </ul>

                        <div
                          className="mt-2 text-primary fw-semibold cursor"
                          onClick={() => {
                            navigate(`/shop?type_id=${type.id}`);
                            onNavigate && onNavigate();
                          }}
                        >
                          View all {type.name}
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </Col>
            ) : (
              activeCategory.name && "No Detail Exist"
            )}
          </>
        )}

        {/* ===================== MOBILE (AMAZON STYLE) ===================== */}
        {!isDesktop && (
          <Col xs={12}>

            {/* LEVEL 1 — CATEGORIES */}
            {!mobileCategory && (
              <>
                <h6 className="fw-bold mb-2">Categories</h6>
                <ul className="list-unstyled">
                  {menuData.map(cat => (
                    <li
                      key={cat.id}
                      className="py-2 border-bottom cursor"
                      onClick={() => {
                        setMobileCategory(cat);
                        setMobileType(null);
                      }}
                    >
                      {cat.name}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* LEVEL 2 — TYPES */}
            {mobileCategory && !mobileType && (
              <>
                <div
                  className="mb-2 text-primary cursor"
                  onClick={() => setMobileCategory(null)}
                >
                  ← Back
                </div>

                <h6 className="fw-bold mb-2">
                  {mobileCategory.name}
                </h6>

                <ul className="list-unstyled">
                  {mobileCategory.types?.map(type => (
                    <li
                      key={type.id}
                      className="py-2 border-bottom cursor"
                      onClick={() => setMobileType(type)}
                    >
                      {type.name}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* LEVEL 3 — MODELS */}
            {mobileType && (
              <>
                <div
                  className="mb-2 text-primary cursor"
                  onClick={() => setMobileType(null)}
                >
                  ← Back
                </div>

                <h6 className="fw-bold mb-2">
                  {mobileType.name}
                </h6>

                <ul className="list-unstyled">
                  {mobileType.models?.map(model => (
                    <li
                      key={model.id}
                      className="py-2 border-bottom cursor"
                      onClick={() => {
                        navigate(`/shop?model_id=${model.id}`);
                        onNavigate && onNavigate();
                      }}
                    >
                      {model.name}
                    </li>
                  ))}
                </ul>

                <div
                  className="mt-2 text-primary fw-semibold cursor"
                  onClick={() => {
                    navigate(`/shop?type_id=${mobileType.id}`);
                    onNavigate && onNavigate();
                  }}
                >
                  View all {mobileType.name}
                </div>
              </>
            )}

          </Col>
        )}

      </Row>
    </Container>
  );
}

export default CategoryMenu;
