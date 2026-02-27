import React, { useEffect, useState } from "react";
import { Row, Col, Button, Badge, Form, Ratio, Image } from "react-bootstrap";
import { useCart } from "../context/CartContext";
import { CiStar } from "react-icons/ci";
import BreadcrumbNav from "./BreadcrumbNav";


const ReadMore = ({ htmlContent, maxChars = 250 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Strip HTML tags to check the actual text length
  const textOnly = htmlContent.replace(/<[^>]*>/g, '');
  
  if (textOnly.length <= maxChars) {
    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
  }

  return (
    <div>
      <div 
      style={{maxWidth: '90dvw', overflow:'auto'}}
        dangerouslySetInnerHTML={{ 
          __html: isExpanded ? htmlContent : textOnly.substring(0, maxChars) + "..." 
        }} 
      />
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ color: '#007bff', cursor: 'pointer', border: 'none', background: 'none', padding: 0, fontWeight: 'bold' }}
      >
        {isExpanded ? "Show Less" : "Read More"}
      </button>
    </div>
  );
};


export default function ItemDetails({
  item,
  resolvedVariant,
  activeImage,
  setActiveImage,
  sizes,
  selectedSize,
  setSelectedSize,
  colorsForSelectedSize,
  selectedColor,
  setSelectedColor,
  rating,
  submitRating,
}) {
  const { cart, addToCart, increment, decrement } = useCart();
  
  const productInCart = cart.find((p) => p.productId === item.id);
  const variantInCart = productInCart?.variants?.find(
    (v) => v.sku === resolvedVariant?.sku
  );
  
  const canAddToCart = resolvedVariant && !resolvedVariant.outofstock && resolvedVariant.stock > 0;

  useEffect(() => {
    if (colorsForSelectedSize && colorsForSelectedSize.length > 0) {
      setSelectedColor(colorsForSelectedSize[0]);
    }
  }, [selectedSize, colorsForSelectedSize, setSelectedColor]);


  return (
    <Row className="gy-4">
      {/* LEFT: IMAGE GALLERY */}
      <Col lg={6}>
        <div className="position-relative">
        <Ratio aspectRatio="1x1">
          <Image 
              src={activeImage || '/thumbnail.png'} 
              alt={item.name} 
              className="img-fluid rounded shadow-sm border" 
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "cover", backgroundColor: "#fff" }} 
              />
          </Ratio>
        </div>
        
        <div className="d-flex gap-2 mt-1 overflow-auto pb-2">
          {item.galleryurls?.map((url, idx) => (
            // <Ratio aspectRatio="1x1">
              <Image
                key={idx}
                src={url}
                alt="thumb"
                className={`rounded border ${activeImage === url ? "border-primary border-2" : ""}`}
                style={{ width: "70px", height: "70px", cursor: "pointer", objectFit: "cover" }}
                onClick={() => setActiveImage(url)}
              />
            // </Ratio>
          ))}
        </div>
      </Col>

      {/* RIGHT: DETAILS */}
      <Col lg={6} className="ps-lg-5">
      <BreadcrumbNav
        type={{
          id: item.model.type.id,
          name: item.model.type.name,
        }}
        model={{
          id: item.model.id,
          name: item.model.name,
        }}
      />

      <h3>{item.name}</h3>
      <div className="d-flex flex-row align-items-center justify-content-between">
            <h1 className="fw-bold mb-1">{ }</h1>
            {resolvedVariant.onsale && (
                <Badge bg="danger" className=" m-1 fs-6">SALE</Badge>
            )}
        </div>
        { 
        !resolvedVariant?.sku?.toLowerCase().includes('simple') && (
          <div className="d-flex align-items-center mb-1">
            <small className="text-muted">
              SKU: {resolvedVariant.sku}
            </small>
          </div>
        )
      }        {/* RATING SECTION */}
        <div className="d-flex align-items-center mb-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span 
              key={star} 
              style={{ cursor: "pointer", color: star <= rating ? "#ffc107" : "#e4e5e9" }}
              onClick={() => submitRating(star)}
            >
              {<CiStar size={20} />}
            </span>
          ))}
          {/* <span className="ms-2 text-muted small">({item.rating_count || 0} reviews)</span> */}
        </div>

        <div className="d-flex flex-row justify-content-between align-content-center gap-3 mb- w-100">
            <div className="d-flex flex-row gap-1">
                <h2 className="text-primary fw-bold mb-0">${resolvedVariant.price}</h2>
                {resolvedVariant.oldprice > 0 && (
                    <span className="text-muted text-decoration-line-through fs-5">${resolvedVariant.oldprice}</span>
                    )}
            </div>
            {resolvedVariant.gender !== '' && 
              <div className="d-flex flex-row gap-2">
                <strong>
                Gender: 
                </strong>
                <p>
                    {resolvedVariant.gender}
                </p>
            </div>
          }
        </div>

        {/* ATTRIBUTES: AGE & LENGTH */}
        {resolvedVariant.age[0] !== null || resolvedVariant.lengthcm[0] !== null && 
        <div className="bg-light p-3 rounded mb-1 border-start border-primary border-4">
          <Row>
          {resolvedVariant.age[0] !== null && 
            <Col xs={6}>
              <span className="text-muted small d-block">Recommended Age</span>
              <strong className="fs-6">
                {resolvedVariant.age ? `${resolvedVariant.age[0]} - ${resolvedVariant.age[1]} ${resolvedVariant.age[2] ?? 'Years'}` : "N/A"}
              </strong>
            </Col>
          }
          { resolvedVariant.lengthcm[0] !== null && 
            <Col xs={6} className="border-start">
              <span className="text-muted small d-block">Item Length</span>
              <strong className="fs-6">
                {resolvedVariant.lengthcm ? `${resolvedVariant.lengthcm[0]} - ${resolvedVariant.lengthcm[1]} ${resolvedVariant.lengthcm[2] ?? 'Cm'}` : "N/A"}
              </strong>
            </Col>
          }
          </Row>
        </div>
        }

        {/* VARIANT SELECTORS (Sizes & Colors) */}
        {
          !sizes.find(s => s.toLowerCase() === "simple") &&
          <div className="mb-1">
          <label className="fw-bold mb-1">Size</label>
          <div className="d-flex gap-2">
            {sizes.map(s => (
              s.toLowerCase() !== "simple" && <Button 
                key={s} 
                variant={selectedSize === s ? "primary" : "outline-secondary"} 
                onClick={() => setSelectedSize(s)}
                style={{ width: "60px" }}
              >
                {s}
              </Button> 
            
            ))}
          </div>
        </div>
        }
        <div className="mb-1">
          <label className="fw-bold mb-1">Color</label>
          <div className="d-flex gap-3">
            {colorsForSelectedSize.map(c => (
              <div
                key={c}
                onClick={() => setSelectedColor(c)}
                style={{
                  backgroundColor: c,
                  width: "35px",
                  height: "35px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  border: selectedColor === c ? "3px solid #000" : "1px solid #ddd",
                  boxShadow: selectedColor === c ? "0 0 0 2px #fff, 0 0 0 4px #0d6efd" : "none"
                }}
              />
            ))}
          </div>
        </div>

        {/* DESCRIPTION (HTML/QUILL CONTENT) */}
        <div className="mb-2">
          <label className="fw-bold mb-2 border-bottom w-100 pb-1">Product Description</label>
          <ReadMore htmlContent={item.description ?? ""} maxChars={100} />
        </div>
        <div className={`d-flex flex-row gap-2 mb-2 ${resolvedVariant.stock < 3 ? 'text-danger' : ''} ? `}>
          <label className="fw-bold mb-2 ">On Stock: </label>
            <p>{resolvedVariant.stock}</p>
        </div>

        {/* QUANTITY / ADD TO CART */}
        <div className="mt-auto">
          {!variantInCart ? (
            <Button
              size="lg"
              className={`w-100 fw-bold py-3 ${!canAddToCart ? 'bg-danger' : ''}`}
              disabled={!canAddToCart}
              onClick={() => addToCart({
                productId: item.id,
                name: item.name,
                image: activeImage,
                variant: { ...resolvedVariant, quantity: 1 }
              })}
            >
              {canAddToCart ? "Add to Cart" : "Out of Stock"}
            </Button>
          ) : (
            <div className="d-flex align-items-center justify-content-center gap-4 p-2 border rounded bg-light">
              <Button variant="link" className="text-dark fs-3 text-decoration-none" onClick={() => decrement(resolvedVariant.sku)}>−</Button>
              <span className="fw-bold fs-4">{variantInCart.quantity}</span>
              <Button variant="link" className="text-dark fs-3 text-decoration-none" disabled={variantInCart.quantity >= resolvedVariant.stock} onClick={() => increment(resolvedVariant.sku)}>+</Button>
            </div>
          )}
        </div>
      </Col>
    </Row>
  );
}