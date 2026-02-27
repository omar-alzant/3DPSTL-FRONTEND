import React, { useEffect, useState, useRef, useMemo } from "react";
import { Container, Row, Col, Card, Button, Form } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import CommentsSection from "../components/CommentsSection";
import { jwtDecode } from 'jwt-decode';
import RelatedItemsSlider from "../components/RelatedItemsSlider";
import ConfirmationModal from "../components/ConfirmationModal";
import ItemDetails from "../components/ItemDetails";
import { useToast } from "../context/ToastProvider";


export default function ItemPage() {
  const { id } = useParams();
  const [decoded, setDecoded] = useState([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { showToast } = useToast();

  const { addToCart, increment, decrement, cart } = useCart();
  const [item, setItem] = useState(null);
  const [relatedItemsSameType, setRelatedItemsSameType] = useState(null);
  const [typeId, setTypeId] = useState(null);
  const [activeImage, setActiveImage] = useState("/thumbnail.png");

  const [variants, setVariants] = useState([]);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  
  
  const [rating, setRating] = useState(0);


  const colorsForSelectedSize = useMemo(() => {
    if (!selectedSize) return [];
  
    return [
      ...new Set(
        variants
          .filter(v => v.size === selectedSize)
          .map(v =>  v.color)
      )
    ];
  }, [variants, selectedSize]);
    

  useEffect(() => {
    if (!selectedSize) return;
  
    const colors = variants
      .filter(v => v.size === selectedSize)
      .map(v => v.color)
      .filter(Boolean);
  
    setSelectedColor(colors[0] ?? null);
  }, [selectedSize, variants]);

  useEffect(() => {
    setItem(null);
    setSelectedSize(null);
    setSelectedColor(null);
    setVariants([]);
  }, [id]);
  
  const navigate = useNavigate();

  const handleGoToLogin = () => navigate("/login");

  const handleClose = () => {
    setShowLoginModal(false);
  };

  
  const uniqueSizes = useMemo(
    () => [...new Set(variants.map(v => v.size))],
  [variants]
  );

  const sizes = useMemo(
    () => [...new Set(variants.map(v => v.size).filter(Boolean))],
    [variants]
  );
  
  const resolvedVariant = useMemo(() => {
    if (!item || variants.length === 0) return null;
  
    // SIMPLE PRODUCT
    if (item.isSimple) {
      return variants[0] || null;
    }
  
    // VARIABLE PRODUCT
    if (!selectedSize || !selectedColor) return null;
  

    return variants.find(
      v => v.size === selectedSize && v.color === selectedColor
    ) || null;
    
  }, [item, variants, selectedSize, selectedColor]);
    

  const token = sessionStorage.getItem("token");
  const email = sessionStorage.getItem("email");

  useEffect(() => {
    if (item) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [item]);
  

  useEffect(() => {
    if (!token) return;
    const d = jwtDecode(token);
    const profile = localStorage.getItem("Profiles")
    setDecoded({...d, profile: profile?.avatar });    
  }, [token]);
  
  // -----------------------------------
// Load Item
// -----------------------------------
const fetchItem = async () => {
  const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/products/item/${id}`);
  const data = await res.json();

  if (data.item) {
    setItem(data.item);
    // Look inside data.item for the variants
    setVariants(Array.isArray(data.item.variants) ? data.item.variants : []);
    setRating(data.item.rating_avg);
    setRelatedItemsSameType(data.relatedItems);
    console.log({data});
    setTypeId(data.item.model.type.id)
    
    if (data.item.galleryurls?.length > 0) {
      setActiveImage(data.item.galleryurls[0]);
    }
  }
};

useEffect(() => {
  fetchItem();
}, [id]);

useEffect(() => {
  if (!item || item.isSimple) return;

  if (!selectedSize && variants.length > 0) {
    setSelectedSize(variants[0].size);
    setSelectedColor(variants[0].color);
  }
}, [item, variants, selectedSize]);

  
  const normalizeVariant = v => ({
    sku: v.sku,
    size: v.size || null,
    color: v.color || null,
    price: v.price,
    oldprice: v.oldprice || null,
    stock: v.stock ?? 0,
    outofstock: !!v.outofstock,
    age: Array.isArray(v.age) && v.age.length === 2 ? v.age : null,
    lengthcm: Array.isArray(v.lengthcm) && v.length === 2 ? v.lengthcm : null
  });

  const canAddToCart =
  resolvedVariant &&
  !resolvedVariant.outofstock &&
  resolvedVariant.stock > 0;


// -----------------------------------
// RENDER
// -----------------------------------
// ...
  const formatDate = (ts) => {
    return new Date(ts).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleAddToCart = () => {
    if (!resolvedVariant) return;
  
    addToCart({
      productId: item.id,
      name: item.name,
      image: activeImage,
      variant: {
        sku: resolvedVariant.sku,
        size: resolvedVariant.size,
        color: resolvedVariant.color,
        price: resolvedVariant.price,
        stock: resolvedVariant.stock,
        age: resolvedVariant.age,
        lengthcm: resolvedVariant.lengthcm,
        quantity: resolvedVariant.quantity,
      }
    });
  
    showToast("Item added to cart", "success");
  };


  

  const submitRating = async (value) => {
    if (!token) {
      setShowLoginModal(true);
      return;
    }
  
    await fetch(
      `${process.env.REACT_APP_API_URL}/api/ratings/${item.id}/ratings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rate: value })
      }
    );
    await fetchItem();     
    setRating(value);
  };
  

if (!item || !resolvedVariant) return <div className="text-center py-5">Loading…</div>;

const isSameCartVariant = (cartVariant, targetVariant) => {
  return cartVariant.sku === targetVariant.sku;
};



const renderAddToCartButton = (targetVariant, cartItems) => {
  const productInCart = cartItems.find(
    p => p.productId === item.id
  );

  const variantInCart = productInCart?.variants?.find(v =>
    isSameCartVariant(v, targetVariant)
  );
  if (!item) return <div className="text-center py-5">Loading item...</div>;
  if (!variantInCart) {
    return (
      <Button
        className="btn btn-primary"
        onClick={handleAddToCart}
        disabled={!canAddToCart}
      >
        Add to Cart
      </Button>
    );
  }

  return (
    <div className="d-flex align-items-center gap-2">
      <Button
        variant="outline-danger"
        size="sm"
        onClick={() => decrement(resolvedVariant.sku)}
      >
        −
      </Button>

      <span className="fw-bold">{variantInCart.quantity}</span>

      <Button
        variant="outline-success"
        size="sm"
        disabled={variantInCart.quantity >= resolvedVariant.stock}
        onClick={() => increment(resolvedVariant.sku)}
      >
        +
      </Button>
    </div>
  );
};


const hasColors = Boolean(resolvedVariant?.color);


return (
  <>
  <Container className="py-5 c-black">
  <ItemDetails
          item={item}
          resolvedVariant={resolvedVariant}
          activeImage={activeImage}
          setActiveImage={setActiveImage}
          sizes={sizes}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
          colorsForSelectedSize={colorsForSelectedSize}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          rating={rating}
          submitRating={submitRating}
        />


    <CommentsSection
      itemId={id}
      key={decoded?.id || "guest"}
      rating_count={item?.rating_count}
      rating_avg = {item?.rating_avg}
      user={{
        id: decoded?.id,
        isadmin: decoded?.isAdmin,
        token,
        profile: decoded?.profile
      }}
    />
      <RelatedItemsSlider 
        items={relatedItemsSameType} 
        onSeeMore={() => navigate(`/shop?type_id=${typeId}`)}
      />
  

    </Container>

    <ConfirmationModal
        show={showLoginModal}
        onHide={() => setShowLoginModal(false)}
        title="Login Required"
        message="You must be logged in."
        primaryButton={{
          text: "Go to Login",
          variant: "primary",
          onClick: handleGoToLogin,
        }}
        secondaryButton={{
          text: "Cancel",
          variant: "secondary",
          onClick: handleClose,
        }}
      />
    </>
);
// }
}