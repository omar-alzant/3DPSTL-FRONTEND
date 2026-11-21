// Shown instead of "Add to cart" while the cart is off (see config/site.js)
import React from 'react';
import { Link } from 'react-router-dom';
import { MdWhatsapp } from 'react-icons/md';
import { FaInstagram } from 'react-icons/fa';
import { orderLikeThisLink } from '../config/site';
import { useLang } from '../i18n/LanguageContext';

export default function OrderLikeThis({ item, variant }) {
  const { tx, lang } = useLang();
  return (
    <div className="d-flex flex-column gap-2">
      <a
        href={orderLikeThisLink(item, variant, lang)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-success btn-lg w-100 fw-bold py-3 d-flex align-items-center justify-content-center gap-2"
      >
        <MdWhatsapp size={24} /> {tx('Order one like this', 'اطلب وحدة متلها')}
      </a>
      <small className="text-center" style={{ color: 'var(--brand-light, #A5B4FC)' }}>
        {tx("Tell us the changes you want — name, size, colors — and we'll print it for you.", 'قلّنا شو التعديلات يلي بدّك ياها — اسم، قياس، ألوان — ومنطبعلك ياها.')}
      </small>
      {item?.instagram_url && (
        <a
          href={item.instagram_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline-primary w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
        >
          <FaInstagram size={18} /> {tx('Watch it on Instagram', 'شوفها عالإنستغرام')}
        </a>
      )}
      <Link to="/studio" className="btn btn-outline-primary w-100 fw-bold">
        {tx('Or design your own in the Studio', 'أو صمّم قطعتك بالاستوديو')}
      </Link>
    </div>
  );
}
