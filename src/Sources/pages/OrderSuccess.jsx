import React from 'react';
import { Button } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';

const OrderSuccess = () => {

  const { orderId } = useParams();
    const message = encodeURIComponent("Hello! I'm shopping at 3DSTL and have a question about an item.");
  const phoneNumber = "96176118290";
  const supportNumber = "+961 76 118 290";

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
  return (
    <div className="container py-5 text-center">
      <div className="py-5">
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