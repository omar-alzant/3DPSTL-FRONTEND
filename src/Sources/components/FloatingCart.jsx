// src/components/FloatingCart.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { CiShoppingCart } from 'react-icons/ci';
import { Badge } from 'react-bootstrap';
import { useCart } from '../context/CartContext'; // Assuming you have a CartContext

export default function FloatingCart() {
  const { cart } = useCart();

  if (cart.length === 0) return null; // Hide if empty (optional)

  return (
    <NavLink 
      to="/cart" 
      rel="noopener noreferrer"

      className="floating-cart shadow-lg d-flex align-items-center justify-content-center text-decoration-none"
    >
      <div className="position-relative">
        <CiShoppingCart size="2rem" color="white" />
        <span className="floating-cart-tooltip">Open cart</span>

        <Badge 
          pill 
          bg="danger" 
          className="position-absolute top-0 start-100 translate-middle"
        >
          {cart.length}
        </Badge>
      </div>
    </NavLink>
  );
}