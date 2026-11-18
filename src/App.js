import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { AuthProvider } from './Sources/context/AuthContext';
import { BrowserRouter } from "react-router-dom";
import { CartProvider } from './Sources/context/CartContext';
import HumanGate from './Sources/components/HumanGate';

export default function App() {
  return (
    <HumanGate>
    <BrowserRouter>
      <AuthProvider>
      <CartProvider>
        <AppRoutes />
      </CartProvider>
      </AuthProvider>
    </BrowserRouter>
    </HumanGate>
  );
}
