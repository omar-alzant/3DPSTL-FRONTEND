import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { Container, Row, Col, Card, Button, Form } from "react-bootstrap";
import CartItem from "../components/CartItem";
import ConfirmationModal from "../components/ConfirmationModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastProvider";

const CartPage = () => {
  const { cart, increment, decrement, removeVariantFromCart,  updateVariant, clearCart } = useCart();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showClearCartModal, setShowClearCartModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    name: profile?.full_name || "",
    phone: profile?.phone || "",
    address: "",
    payment: "cash",
  });
  const { showToast } = useToast();

  useEffect(() => {
    if (cart) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [cart]);


  const subtotal = cart.reduce((sum, item) => {
    const variants = Array.isArray(item.selectedVariant) 
      ? item.selectedVariant 
      : item.variants || [];
  
    const itemTotal = variants.reduce((vSum, v) => {
      return vSum + Number(v.price || 0) * Number(v.quantity || 0);
    }, 0);
  
    return sum + itemTotal;
  }, 0);
    
  const shipping = (subtotal  > 50 || cart.length == 0) ? 0 : 5; 
  const total = subtotal + shipping;

  // STEP 1: Validation and Triggering the Popup
const handleCheckout = () => {
  const token = sessionStorage.getItem("token");
  const email = sessionStorage.getItem("email");

  // User not logged in
  if (!token || !email) {
    setShowLoginModal(true);
    return;
  }

  // Missing fields
  if (!checkoutData.name || !checkoutData.phone || !checkoutData.address) {
    showToast("Please fill all fields", "danger");
    return;
  }

  // If all valid, show the confirmation modal
  setShowConfirmModal(true);
};

// STEP 2: The actual API call (Executed when user clicks "Yes" in the popup)
const processOrder = async () => {

  setShowConfirmModal(false); 
  setLoading(true);

  try {
    const token = sessionStorage.getItem("token");
    const lineItems = [];

    cart.forEach(item => {
      if (Array.isArray(item.variants)) {
        item?.variants.forEach(variant => {
          lineItems.push({
            item_id: item.productId,
            item_name: item.name,
            sku: variant.sku,
            qty: variant.quantity,
            price: variant.price,
            size: variant.size,
            color: variant.color,
            gender: variant.gender,
            age: variant.age,
            lengthcm: variant.lengthcm,
          });
        });
      }
    });

    const body = {
      items: lineItems,
      shipping: {
        name: checkoutData.name,
        phone: checkoutData.phone,
        address: checkoutData.address,
        city: checkoutData.city || ""
      },
      note: checkoutData.note || ""
    };
    
    const res = await fetch(`${process.env.REACT_APP_API_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Order failed", "danger");
      setLoading(false);
      return;
    }

    if (data.orderId) {
      clearCart();  
      navigate('/order-summary', { state: { order: data.order, items: data.items } });
    }
  } catch (err) {
    showToast("Something went wrong during checkout.", "danger");
  } finally {
    setLoading(false);
    showToast("Ckeckout Done.")
  }
};

    const handleGoToLogin = () => {
    navigate("/login");
  };
  const updateVariantContext = (itemId, newVariant) => {
    updateVariant(itemId, newVariant)
  };
  
  return (
    <>
      
      <h2 className="c-black mb-4 text-center">Your Shopping Cart</h2>

      <Container className="my-5">
  <Row className="g-4"> {/* g-4 adds a nice gap between columns */}
    
    {/* LEFT SIDE: CART ITEMS */}
    <Col lg={8} md={7} xs={12}>
    <div className="d-flex justify-content-between align-items-center mb-4">
      <h4 className="mb-0">Items in your cart</h4>

      {cart.length > 0 && (
        <Button 
          variant="outline-danger" 
          size="sm"
          onClick={() => setShowClearCartModal(true)}
        >
          Clear Cart
        </Button>
      )}
    </div>
      {Array.isArray(cart) && cart.length > 0 ? (
        cart.map((item) => (
          <CartItem
            key={item.productId}
            item={item}
            increment={increment}
            decrement={decrement}
            removeFromCart={removeVariantFromCart}
            onClickAction={() => navigate(`/item/${item.productId}`)}
          />
        ))
      ) : (
        <Card className="p-5 text-center">
          <h5>Your cart is empty</h5>
          <Button variant="primary" className="mt-3" onClick={() => navigate('/shop')}>
            Go Shopping
          </Button>
        </Card>
      )}
    </Col>

    {/* RIGHT SIDE: STICKY SUMMARY & CHECKOUT */}
    <Col lg={4} md={5} xs={12}>
      <div className="sticky-top" style={{ top: '100px', zIndex: 10 }}>
        {/* Order Summary Card */}
        <Card className="shadow-sm mb-3">
          <Card.Body>
            <h4 className="mb-3">Order Summary</h4>
            <div className="d-flex justify-content-between mb-2">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>Delivery</span>
              <span>${shipping.toFixed(2)}</span>
            </div>
            <hr />
            <div className="d-flex justify-content-between mb-0">
              <p className="fw-bold">Total</p>
              <p className="fw-bold">${total.toFixed(2)}</p>
            </div>
          </Card.Body>
        </Card>

        {/* Checkout Form Card */}
        <Card className="shadow-sm">
          <Card.Body>
            <h4 className="mb-3">Checkout</h4>
            <Form>
              <Form.Group className="mb-3" controlId="checkout-name">
                <Form.Label>Full Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter name"
                  value={checkoutData.name}
                  onChange={(e) => setCheckoutData({ ...checkoutData, name: e.target.value })}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="checkout-phone">
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="0123456789"
                  value={checkoutData.phone}
                  onChange={(e) => setCheckoutData({ ...checkoutData, phone: e.target.value })}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="checkout-address">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Shipping address..."
                  value={checkoutData.address}
                  onChange={(e) => setCheckoutData({ ...checkoutData, address: e.target.value })}
                />
              </Form.Group>

              <Button variant="success" className="w-100 py-2 fw-bold" onClick={handleCheckout}>
                Place Order
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
    </Col>
  </Row>
  <ConfirmationModal
          show={showLoginModal}
          onHide={() => setShowLoginModal(false)}
          title="Login Required"
          message="You need to be logged in to place an order. Please log in to continue."
          primaryButton={{
            text: "Go to Login Page",
            variant: "primary",
            onClick: handleGoToLogin,
          }}
          secondaryButton={{
            text: "Cancel",
            variant: "secondary",
            onClick: () => setShowLoginModal(false),
          }}
        />

        {/* Order Confirmation Modal */}
      <ConfirmationModal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        title="Confirm Order"
        message={`Are you sure you want to place this order for $${total.toFixed(2)}?`}
        primaryButton={{
          text: "Place Order",
          variant: "success",
          onClick: processOrder,
        }}
        secondaryButton={{
          text: "Cancel",
          variant: "secondary",
          onClick: () => setShowConfirmModal(false),
        }}
      />
      <ConfirmationModal
        show={showClearCartModal}
        onHide={() => setShowClearCartModal(false)}
        title="Clear Cart"
        message="Are you sure you want to remove all items from your cart?"
        primaryButton={{
          text: "Yes, Clear",
          variant: "danger",
          onClick: () => {
            clearCart();
            setShowClearCartModal(false);
            showToast("Cart cleared successfully", "success");
          },
        }}
        secondaryButton={{
          text: "Cancel",
          variant: "secondary",
          onClick: () => setShowClearCartModal(false),
        }}
      />

</Container>
    </>

  );
};

export default CartPage;
