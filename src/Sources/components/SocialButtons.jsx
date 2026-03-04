import React from 'react';
import { FaFacebookF, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import '../Style/SocialButtons.css'


const SocialButtons = () => {
    
  const socialLinks = [
    { 
      id: 'fb', 
      icon: <FaFacebookF />, 
      url: 'https://facebook.com/profile.php?id=61583981580179', 
      color: 'fb-hover' 
    },
    { 
      id: 'ig', 
      icon: <FaInstagram />, 
      url: 'https://instagram.com/3dstl961', 
      color: 'ig-hover' 
    },
    { 
      id: 'wa', 
      icon: <FaWhatsapp />, 
      url: 'https://wa.me/96176118290', 
      color: 'wa-hover' 
    },
  ];

  return (
    <div className="d-flex gap-3 mt-2">
      {socialLinks.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`social-btn ${link.color}`}
        >
          {link.icon}
        </a>
      ))}
    </div>
  );
};

export default SocialButtons;