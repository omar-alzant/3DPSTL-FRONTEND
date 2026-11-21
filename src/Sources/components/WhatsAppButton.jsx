import React from 'react';
import { MdWhatsapp } from "react-icons/md";
import { useLang } from '../i18n/LanguageContext';

const WhatsAppButton = () => {
  const { tx } = useLang();
  const phoneNumber = "96176118290"; // 🔑 Replace with your actual number (International format, no +)
  const message = encodeURIComponent(tx("Hello 3DSTL! I saw your work and I'd like to ask about a piece.", 'مرحبا 3DSTL! شفت شغلكن وحابب إسأل عن قطعة.'));

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-float"
      aria-label={tx('Chat with us on WhatsApp', 'راسلنا على واتساب')}
    >
      <div className="whatsapp-icon-container">
        <MdWhatsapp  size={30} color="white" fill="white" />
        <span className="whatsapp-tooltip">{tx('Chat with us!', 'راسلنا!')}</span>
      </div>
    </a>
  );
};

export default WhatsAppButton;