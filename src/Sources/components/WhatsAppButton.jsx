import React from 'react';
import { MdWhatsapp } from "react-icons/md";

const WhatsAppButton = () => {
  const phoneNumber = "96176118290"; // 🔑 Replace with your actual number (International format, no +)
  const message = encodeURIComponent("Hello! I'm shopping at 3DSTL and have a question about an item.");

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-float"
      aria-label="Chat with us on WhatsApp"
    >
      <div className="whatsapp-icon-container">
        <MdWhatsapp  size={30} color="white" fill="white" />
        <span className="whatsapp-tooltip">Chat with us!</span>
      </div>
    </a>
  );
};

export default WhatsAppButton;