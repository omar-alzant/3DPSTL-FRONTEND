import React from 'react';
import { useLocation } from 'react-router-dom';
import NavbarComp from '../components/NavbarComp';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import FloatingCart from '../components/FloatingCart';
import { CART_ENABLED } from '../config/site';


export default function MainLayout({ children }) {
  // the WhatsApp bubble is for customers; in the admin it only covers buttons
  const isAdmin = useLocation().pathname.startsWith('/admin');
  return (
    <div className="app-shell">
      {/* <span className='header-banner'> This Website is under development, some features may not work as expected.</span> */}
      <NavbarComp />
      <main className="page-content">{children}</main>
      <Footer />
      <div className="fab-container">
        {CART_ENABLED && <FloatingCart />}
        {!isAdmin && <WhatsAppButton />}
      </div>      
    </div>
  );
}
