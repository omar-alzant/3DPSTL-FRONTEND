import React from 'react';
import { MessageCircle, Globe, ExternalLink, MapIcon, LocationEditIcon, LocateIcon, LocateOffIcon } from 'lucide-react';
import { FaFacebookF, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import '../Style/AboutUs.css';

const message = encodeURIComponent(`Hello, I am interested in your 3D printing services`);
const phoneNumber = "96176118290";
const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

const profileData = {
  name: "@3dstl961",
  bio: "3D printing | Engineer projects",
  avatar: "./3dstlLogo.jpeg", // Replace with your photo URL
  links: [
    { name: 'WhatsApp', url: whatsappUrl, icon: <FaWhatsapp />, color: '#25D366' },
    { name: 'Instagram', url: 'https://www.instagram.com/3dstl961?igsh=MTFpamM4eHc3MGhvYQ==', icon: <FaInstagram />, color: '#E1306C' },
    { name: 'Facebook', url: 'https://facebook.com/your', icon: <FaFacebookF />, color: '#1877F2' },
    { name: 'Location', url: 'https://maps.app.goo.gl/YgeRm1o4HJLLJn2CA', icon: <LocateIcon />, color: '#187755' },
    // { name: 'Website', url: '/', icon: <Globe />, color: '#6366F1' },
  ]
};

const AboutUs = () =>  {
  return (
    <div className="app-wrapper">
      <div className="glass-card">
        <img src={profileData.avatar} alt="Profile" className="profile-img" />
        <h4>{profileData.name}</h4>
        <p className="c-b">{profileData.bio}</p>

        <div className="links-container">
          {profileData.links.map((link, index) => (
            <a key={index} href={link.url} target="_blank" rel="noreferrer" className="link-item">
              <span className="icon-wrapper" style={{ color: link.color }}>{link.icon}</span>
              <span className="link-text">{link.name}</span>
              {
                link.name === 'Website' && <small className='c-red mr-1'> Under coding </small>
              }
              <ExternalLink size={16} className="arrow" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AboutUs;