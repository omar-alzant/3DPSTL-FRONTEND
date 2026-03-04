import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Nav, Image, Button } from "react-bootstrap";
import { Link, NavLink, useNavigate } from "react-router-dom";
import ImageSlide from "../components/ImageSlide";
import CarouselComp from "../components/CarouselComp";
import { useCart } from "../context/CartContext";
import CartItem from "../components/CartItem";
import RelatedItemsSlider from "../components/RelatedItemsSlider";
import MultiImageInput from "../components/MultiImageInput";
import { useToast } from "../context/ToastProvider";

// Helper for localStorage JSON
const saveLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const loadLS = (key, fallback = []) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback; // In case of corrupted data
  }
};

export default function Home() {
  const [types, setTypes] = useState(loadLS("types"));
  const [carouselItems, setCarouselItems] = useState(loadLS("carousel"));
  const [homeTypeMapped, setHomeTypeMapped] = useState(loadLS("carousel"));
  const [carouselMarkets, setCarouselMarkets] = useState(loadLS("markets"));
  const [items, setItems] = useState(loadLS("items", [])); 
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { updateQuantity, removeFromCart, addTocart, updateVariant } = useCart();
  const [homeTypes, setHomeTypes] = useState([]);
  const { showToast } = useToast();

  const base = process.env.REACT_APP_API_URL;
  
  
  useEffect(() => {
    fetch(`${base}/api/home/types`)
      .then(res => res.json())
      .then(setHomeTypes);

      setHomeTypeMapped(normalizeArray(homeTypes)
          .filter(c => !c.isDisabled)
          .map(item => ({
            TemplateComponent: ImageSlide,
            templateProps: {
              src: item.image || "/thumbnail.png",
              altText: item.name
            },
            title: item.name,
            description: item.description || ""
          })))

          
      if (homeTypes) {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
  
  }, []);
  
  const normalizeArray = (data) =>
    Array.isArray(data) ? data : [];
  
  const safeFetchJSON = async (url) => {
    const res = await fetch(url);
    if (!res.ok) showToast(`Failed to fetch: ${url}`, "danger");
    return res.json();
  };
  
  const fetchAll = async () => {
    setLoading(true);
  
    try {
      const [
        carouselRaw,
        marketsRaw,
        itemsRaw
      ] = await Promise.all([
        safeFetchJSON(`${base}/api/admin/products/carousel`),
        safeFetchJSON(`${base}/api/admin/products/market`),
        safeFetchJSON(`${base}/api/admin/products/item/onsale`)
      ]);
  
      /* ---------------- Carousel ---------------- */
      const carousel = normalizeArray(carouselRaw)
        .filter(c => !c.isDisabled)
        .map(item => ({
          TemplateComponent: ImageSlide,
          templateProps: {
            src: item.image || "/thumbnail.png",
            altText: item.name,
            enableOnClick: true,
            seeMore: () => handleCarouselClick(item.linkedPath),
          },
          title: item.name,
          description: item.description || ""
        }));
  
      setCarouselItems(carousel);
      saveLS("carousel", carousel);
      // console.log(carouselRaw);
      
      /* ---------------- Markets ---------------- */
      const markets = normalizeArray(marketsRaw.items)
      .filter(m => !m.isdisabled)
      .map(market => ({
        TemplateComponent: ImageSlide,
        templateProps: {
          src: market.image?.[0] || "/thumbnail.png",
          altText: market.name,
          enableOnClick: true,
          seeMore: () => handleMarketClick(market.id),
        },
        title: market.name,
        description: market.description || ""
      }));
      

      setCarouselMarkets(markets);
      saveLS("markets", markets);
  
      /* ---------------- Items ---------------- */
      const items = normalizeArray(itemsRaw);
      setItems(items);
      saveLS("items", items);
  
    } catch (error) {
      showToast(`Error loading data: ${error}`, "danger")

    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const cached = loadLS("items");
    if (cached?.length) setItems(cached);
    fetchAll();
  }, []);
  

  const handleMarketClick = (marketId) => {
    navigate(`/shop?brand_id=${marketId}`);
  };
 
  const handleCarouselClick = (path) => {    
    navigate(`${path}`);
  };
  

  const formatPrice = (price) => {
    return Number(price || 0).toFixed(2);
  }

  // Filter items that are actually on sale and in stock
  const saleItems = Array.isArray(items) 
    ? items.filter((item) => item.onSale && !item.isDisabled && !item.outofstock)
    : [];
    
  // Filter items for category display
  const categories = Array.isArray(types)
    ? types.filter(t => t.image) // Only show categories with an image
    : [];

  const updateVariantContext = (itemId, newVariant) => {
      updateVariant(itemId, newVariant)
    };
  return (
    <>
      <Container className="c-black">

{/* LOGO */}
{/* <Row className="my-5">
  <Col className="text-center">
    <Image src="/logoico.svg" alt="Logo" style={{ maxWidth: 180 }} />
  </Col>
</Row> */}

{/* HERO */}
<Row className="justify-content-center text-center mb-5">
  <Col lg={8}>
  <h1
  style={{
    fontSize: "3.2rem",
    fontWeight: "800",
    background: "linear-gradient(90deg,#6C63FF,#4F46E5)",
    WebkitBackgroundClip: "text",
    color: "transparent",
    textShadow: "0 0 30px rgba(108,99,255,0.25)"
  }}
>
  Precision 3D Printing & Design
</h1>
    <p className="text-muted mb-4">
    Custom models, business branding, gifts, and functional prints — engineered with accuracy.
    </p>


{/* CAROUSEL */}
<Row className="mb-4">
  {loading ? (
    <div className="text-center py-5">Loading...</div>
  ) : (
    <CarouselComp items={carouselItems} label="Carousel"/>
  )}
</Row>


    <Nav.Link
      as={NavLink}
      to="/Shop"
      className="d-inline-block"
      style={{
        background: "linear-gradient(90deg,#6C63FF,#4F46E5)",
        border: "none",
        borderRadius: "8px",
        padding: "0.6rem 1.6rem",
        fontSize: "1.125rem",
        color: "white",
        fontWeight: "600",
        boxShadow: "0 4px 20px rgba(108,99,255,0.35)"
      }}
    >
      Shop Now
    </Nav.Link>
  </Col>
</Row>

{/* CATEGORIES */}
<section className="py-5">
  <Container>
    <h2
      className="text-center fw-bold mb-5"
      style={{
        color: "var(--brand-light)",
        letterSpacing: "1px"
      }}
    >
      Shop by Types
    </h2>
    <Row >
      {loading ? (
        <div className="text-center py-5">Loading...</div>
      ) : (
        Array.isArray(homeTypes) && homeTypes.map(type => (  
        <section
          key={type.id}
          className="mb-5 p-4 rounded-4"
          style={{
            background: "var(--brand-card)",
            border: "1px solid var(--brand-border)",
            boxShadow: "0 0 30px rgba(79,70,229,0.08)"
          }}
        >            
            {/* TYPE CAROUSEL */}
            <h3 className="mb-1">{type.name}
            < hr />
            </h3>
              
            <MultiImageInput
                label={""}
                controlId={type.id + "-img"}
                formData={type}
                readOnly={true}
                seeMore={() => navigate(`/shop?type_id=${type.id}`)}
                ratio='16x9'
            />

            {/* ITEMS SLIDER */}
            <RelatedItemsSlider
              items={type.items}
              onSeeMore={() => navigate(`/shop?type_id=${type.id}`)}
            />
          {/* <hr /> */}
          </section>
        ))
        
      )}
    </Row>
  </Container>
</section>

{/* SALE ITEMS */}
<div className="d-flex align-items-center justify-content-between text-danger">
  <h3
    className="mb-3 fw-bold"
    style={{
      color: "#6C63FF",
      display: "flex",
      alignItems: "center",
      gap: "10px"
    }}
  >
    🔥 On Sale
  </h3>
  {items.length !== 0 && 
         <Button
         style={{
          borderColor: "#6C63FF",
          color: "#6C63FF",
        }}
        onMouseOver={(e) => {
          e.target.style.background = "#6C63FF";
          e.target.style.color = "white";
        }}
        onMouseOut={(e) => {
          e.target.style.background = "transparent";
          e.target.style.color = "#6C63FF";
        }}
        onClick={() => navigate(`/shop?onsale=true`)}
       >
         See more 
       </Button>
  }
</div>

<Row className="g-4 mb-5">
  {
  loading ? (
      <div className="text-center py-5">Loading...</div>
    ) : 
    Array.isArray(items) ?
     (items
      .map((item) => (
        <Col xs={6} md={5} lg={3} key={item.id}>
       
           <CartItem
                key={item.id}
                item={item}
                updateQuantity={updateQuantity}
                removeFromCart={removeFromCart}
                addToCart={addTocart}
                showDetails={false}
                addFromExternal={true}
                updateVariant={updateVariantContext}
                onClickAction={() => navigate(`/item/${item.id}`)}
              />
        </Col>
      )
    ))
  :
  (
    "No Items available"
  )
  }
</Row>

<hr />
<h3 className="mb-3 fw-bold text-danger">Our Brands</h3>
<Row className="mb-4">
  {loading ? (
    <div className="text-center py-5">Loading...</div>
  ) : (
    <CarouselComp 
      withDetails={false} 
      items={carouselMarkets} 
      label="Brands"
      />
  )}
</Row>
</Container>

    </>
  );
}
