// Shown instead of "Add to cart" while the cart is off (see config/site.js)
import React from 'react';
import { Link } from 'react-router-dom';
import { MdWhatsapp } from 'react-icons/md';
import { orderLikeThisLink } from '../config/site';

export default function OrderLikeThis({ item, variant }) {
  return (
    <div className="d-flex flex-column gap-2">
      <a
        href={orderLikeThisLink(item, variant)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-success btn-lg w-100 fw-bold py-3 d-flex align-items-center justify-content-center gap-2"
      >
        <MdWhatsapp size={24} /> Order one like this
      </a>
      <small className="text-center" style={{ color: 'var(--brand-light, #A5B4FC)' }}>
        Tell us the changes you want — name, size, colors — and we'll print it for you.
      </small>
      <Link to="/studio" className="btn btn-outline-primary w-100 fw-bold">
        Or design your own in the Studio
      </Link>
    </div>
  );
}
