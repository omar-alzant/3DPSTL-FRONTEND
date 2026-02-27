import React, { useState, useMemo, useEffect } from "react";
import { Card, Badge, Button, Modal, Image, Ratio } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import ItemDetails from "./ItemDetails"; // Ensure path is correct

function ProductCard({ product, cart, onAddToCart }) {
  const navigate = useNavigate();
  const img = product.galleryurls?.[0] || "/thumbnail.png";
  const variants = Array.isArray(product.variants) ? product.variants : [];
  // --- Modal & Selection State ---
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [activeImage, setActiveImage] = useState(img);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);

  // --- Memoized Logic for ItemDetails ---
  const sizes = useMemo(() => 
    [...new Set(variants.map((v) => v.size).filter(Boolean))], 
  [variants]);

  const allOutOfStock = useMemo(() => {
    if (!Array.isArray(variants)) return true;
  
    return variants.every(v =>
      v.outofstock === true || Number(v.stock) <= 0
    );
  }, [variants]);
  
  const colorsForSelectedSize = useMemo(() => {
    if (!selectedSize) return [];
    return [...new Set(variants.filter(v => v.size === selectedSize).map(v => v.color))];

  }, [variants, selectedSize]);

  const resolvedVariant = useMemo(() => {
    if (variants.length === 0) return null;
    // Find exact match or default to first
    return variants.find(v => v.size === selectedSize && v.color === selectedColor) || variants[0];
  }, [variants, selectedSize, selectedColor]);

  // Sync state when modal opens
  useEffect(() => {
    if (showVariantModal && variants.length > 0) {
      setSelectedSize(variants[0].size);
      setSelectedColor(variants[0].color);
      setActiveImage(img);
    }
  }, [showVariantModal, variants, img]);

  const itemExistInCart = useMemo(() => {
    return cart.some((item) => item.productId === product.id);
  }, [cart, product.id]);

  const handleAddClick = (e) => {
    e.stopPropagation();
    if (product.issimple || variants.length === 1) {
      const v = variants[0];
      if (!v || v.outofstock || v.stock <= 0) return;
      onAddToCart({
        productId: product.id,
        name: product.name,
        image: img,
        variant: v,
      });
    } else {
      setShowVariantModal(true);
    }
  };

  return (
    <>
      <Card className="shadow-sm br-0 cursor h-100" onClick={() => navigate(`/item/${product.id}`)}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <Ratio aspectRatio="1x1">
            <Image src={img} alt={product?.name} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
          </Ratio>
        </div>
        <hr className="m-0" />
        <Card.Body className={`
              d-flex flex-column
              ${(allOutOfStock && !itemExistInCart) ? "bg-red-light" : ""}
          `}>
          <Card.Title className="fs-6 text-truncate">{product?.name}</Card.Title>
          <div className="d-flex flex-wrap gap-1 mb-2">
            <Badge bg="primary" size="sm">{product?.category_name}</Badge>
            <Badge bg="info" size="sm">{product?.type_name}</Badge>
          </div>

          <div className="d-flex align-items-center justify-content-between mt-auto">
            <div className="fw-bold text-primary">
              ${resolvedVariant?.price}
              {resolvedVariant?.oldprice > 0 && (
                <small className="ms-1 text-muted text-decoration-line-through">${resolvedVariant.oldprice}</small>
              )}
            </div>
            {itemExistInCart ? (
              <Button variant="outline-info" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/cart`); }}>
                In Cart
              </Button>
            ) : (
              !allOutOfStock ? 
                <Button variant="outline-success" size="sm" onClick={handleAddClick}>
                  Add
                </Button>
                :
               <Badge bg="danger" className="ms-2">OOS</Badge>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* --- REUSABLE MODAL WITH ITEM DETAILS --- */}
      <Modal show={showVariantModal} onHide={() => setShowVariantModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Select Options</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {resolvedVariant && (
            <ItemDetails
              item={product}
              resolvedVariant={resolvedVariant}
              activeImage={activeImage}
              setActiveImage={setActiveImage}
              sizes={sizes}
              selectedSize={selectedSize}
              setSelectedSize={setSelectedSize}
              colorsForSelectedSize={colorsForSelectedSize}
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
              rating={product.rating_avg}
              submitRating={() => {}} 
            />
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}

export default ProductCard;