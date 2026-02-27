import React from 'react';
import NavbarComp from '../components/NavbarComp';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import FloatingCart from '../components/FloatingCart';


export default function MainLayout({ children }) {
  return (
    <div className="app-shell">
      {/* <span className='header-banner'> This Website is under development, some features may not work as expected.</span> */}
      <NavbarComp />
      <main className="page-content">{children}</main>
      <Footer />
      <div className="fab-container">
        <FloatingCart />
        <WhatsAppButton />
      </div>      
    </div>
  );
}
