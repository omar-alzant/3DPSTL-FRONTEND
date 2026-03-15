import React from 'react';
import { Navigate } from "react-router-dom";
import { Routes, Route } from 'react-router-dom';
import AdminLayout from './Sources/layouts/AdminLayout';
import AdminTypes from './Sources/pages/AdminTypes';
import MainLayout from './Sources/layouts/MainLayout';
import Login from './Sources/pages/Login';
import Register from './Sources/pages/Register';
import ForgotPassword from './Sources/pages/ForgotPassword';
import UpdatePassword from './Sources/pages/UpdatePassword';
import AdminModels from './Sources/pages/AdminModels';
import AdminItems from './Sources/pages/AdminItems';
import Home from './Sources/pages/Home';
import AdminCarousel from './Sources/pages/AdminCarousel';
import Shop from './Sources/pages/Shop';
import CartPage from './Sources/pages/CartPage';
import ItemPage from './Sources/pages/ItemPage';
import ProfilePage from './Sources/pages/Profile';
import AdminCategories from './Sources/pages/AdminCategories';
import AdminBrands from './Sources/pages/AdminBrands';
import TermsPage from './Sources/components/TermsPage';
import AdminOrders from './Sources/pages/AdminOrders';
import OrderSummary from './Sources/pages/OrderSummary';
import OrderSuccess from './Sources/pages/OrderSuccess';
import AuthCallback from './Sources/components/AuthCallback';
import AdminColors from './Sources/pages/AdminColors';
import FilamentColors from './Sources/pages/FilamentColors';

export default function AppRoutes() {
  return (
      <Routes>

        <Route path="/login" element={<MainLayout><Login /></MainLayout>} />
        <Route path="/register" element={<MainLayout><Register /></MainLayout>} />
        <Route path="/forgot-password" element={<MainLayout><ForgotPassword /></MainLayout>} />
        <Route path="/update-password" element={<MainLayout><UpdatePassword /></MainLayout>} />
        <Route path="/update-password" element={<MainLayout><UpdatePassword /></MainLayout>} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/" element={<MainLayout><Home /></MainLayout>} />
        <Route path="/shop" element={<MainLayout><Shop /></MainLayout>} />
        <Route path="/order-summary" element={<MainLayout><OrderSummary /></MainLayout>} />
        <Route path="/order-success/:orderId" element={<MainLayout><OrderSuccess /></MainLayout>} />
        <Route path="/cart" element={<MainLayout><CartPage /></MainLayout>} />
        <Route path="/profile" element={<MainLayout><ProfilePage /></MainLayout>} />
        <Route path="/terms" element={<MainLayout><TermsPage /></MainLayout>} />
        <Route path="/filamentColors" element={<MainLayout><FilamentColors /></MainLayout>} />
        <Route path="/item/:id" element={ <MainLayout> <ItemPage /> </MainLayout>} />

        {/* Admin Section */}
        <Route path="admin" element={<MainLayout><AdminLayout /></MainLayout>} >
          <Route index element={<Navigate to="brands" replace />} />
           <Route path="category" element={<AdminCategories />} />
           <Route path="brands" element={<AdminBrands />} />
           <Route path="types" element={<AdminTypes />} />
           <Route path="models" element={<AdminModels />} />
           <Route path="items" element={<AdminItems />} />
           <Route path="carousel" element={<AdminCarousel />} />
           <Route path="orders" element={<AdminOrders />} />
           <Route path="colors" element={<AdminColors />} />
          {/*<Route path="benefits" element={<AdminBenefits />} />
          <Route path="home" element={<AdminHome />} />
          <Route path="shop" element={<AdminShop />} />
          <Route path="ourModels" element={<AdminOurModels />} /> */}
        </Route>

        <Route 
          path="*" 
          element={
            window.location.pathname === '/sitemap.xml' 
              ? null // Returns nothing, letting the browser hit the server
              : <Navigate to="/" replace />
          } 
        />   
      </Routes>
  );
}
