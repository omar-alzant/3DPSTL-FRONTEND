import React from 'react';
import { Button } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';

const OrderSuccess = () => {

  const { orderId } = useParams();
    const message = encodeURIComponent("Hello! I'm shopping at Liban bebe and have a question about an item.");
  const phoneNumber = "96170693460";
  const supportNumber = "+961 70 693 460";

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <div className="container py-5 text-center">
      <div className="py-5">
        <div className="display-1 text-success mb-4">✓</div>
        <h2 className="fw-bold">Thank You for your Order!</h2>
        <p className="text-muted">Your order has been placed successfully.</p>
        
        <div className="card bg-light border-0 my-4 mx-auto" style={{ maxWidth: '400px' }}>
          <div className="card-body">
            <div className="small text-muted text-uppercase tracking-wide">Order Reference</div>
            <div className="h4 fw-mono text-dark">{orderId || "N/A"}</div>
          </div>
        </div>

        <p className="mb-4 c-black">
          Need help? Contact our support:<br/>
          <Button                 
            onClick={() => window.open(whatsappUrl, "_blank")}
            className="m-1 fw-bold bg-success text-light">
              {supportNumber}
            </Button>
        </p>

        <Link to="/" className="btn btn-primary px-5 shadow-sm">
          Return to Shop
        </Link>
      </div>
    </div>
  );
};

export default OrderSuccess;