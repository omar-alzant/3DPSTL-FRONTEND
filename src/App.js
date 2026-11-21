import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { AuthProvider } from './Sources/context/AuthContext';
import { BrowserRouter } from "react-router-dom";
import { CartProvider } from './Sources/context/CartContext';
import { CreditsProvider } from './Sources/context/CreditsContext';
import HumanGate from './Sources/components/HumanGate';
import ErrorBoundary from './Sources/components/ErrorBoundary';
import GlobalLoader from './Sources/components/GlobalLoader';
import { LanguageProvider } from './Sources/i18n/LanguageContext';
import { ThemeProvider } from './Sources/context/ThemeContext';

export default function App() {
  return (
    <ErrorBoundary>
    <GlobalLoader />
    <HumanGate>
    <BrowserRouter>
      <LanguageProvider>
      <ThemeProvider>
      <AuthProvider>
      <CreditsProvider>
      <CartProvider>
        <AppRoutes />
      </CartProvider>
      </CreditsProvider>
      </AuthProvider>
      </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
    </HumanGate>
    </ErrorBoundary>
  );
}
