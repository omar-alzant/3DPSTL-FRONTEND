import React from 'react';
import { AuthProvider } from '../context/AuthContext';

export default function AuthLayout({ children }) {
  return (
    <AuthProvider>
        <div style={{ padding: '20px' }}>
        {children}
        </div>
    </AuthProvider>
  );
}
