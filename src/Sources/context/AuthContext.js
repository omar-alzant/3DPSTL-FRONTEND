import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from './ToastProvider';

const AuthContext = createContext();

// بيانات الدخول محفوظة بـ localStorage: مشتركة بين كل التابات وتبقى بعد إغلاق المتصفح
const AUTH_KEYS = ['token', 'email', 'isAdmin', 'Profile'];
const clearStoredAuth = () => AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
// ترحيل من النسخة القديمة (sessionStorage) مرة واحدة
try {
  if (!localStorage.getItem('token') && sessionStorage.getItem('token')) {
    ['token', 'email', 'isAdmin'].forEach((k) => {
      const v = sessionStorage.getItem(k);
      if (v !== null) localStorage.setItem(k, v);
    });
  }
} catch {}

export function AuthProvider({ children }) {
  const [email, setemail] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token') || "");
  const navigate = useNavigate();
  const location = useLocation();
  const apiAuthUrl = `${process.env.REACT_APP_API_URL}/api/auth` 
  const [profile, setProfile] = useState(null);
  const { showToast } = useToast();

  const saveToken = (newToken) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
  };

// Inside AuthProvider in AuthContext.jsx
useEffect(() => {
  const storedToken = localStorage.getItem('token');

  if (!storedToken) {
    clearAuth();
    setLoading(false);
    return;
  }

  try {
    const payload = JSON.parse(atob(storedToken.split('.')[1]));
    const expiryTime = payload.exp * 1000;

    if (Date.now() > expiryTime) {
      clearAuth();
      setLoading(false);
      return;
    }

    // Token is valid → now hydrate cached data
    setToken(storedToken);
    setemail(localStorage.getItem('email'));
    setIsAdmin(localStorage.getItem('isAdmin') === "true");

    const storedProfile = localStorage.getItem("Profile");
    if (storedProfile) {
      setProfile(JSON.parse(storedProfile));
    }

  } catch {
    clearAuth();
  } finally {
    setLoading(false);
  }
}, []);



  // ✅ Centralized register
  // AuthContext.jsx
  const registerUser = async (email, password) => {
    try {
      const res = await fetch(`${apiAuthUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await res.json();
      if (!res.ok || data.error) {
        showToast(`${data.error || "Registration failed"}`, "danger"); 
        return { success:false, message: "Registration failed!" };
      }
  
      // Optionally navigate user after success
      navigate('/login');
      showToast("Check your email to confirm your account!")
      return { success: true, message: "Check your email to confirm your account!" };
    } catch (err) {
      showToast(err.message, "danger")
      return { success: false, error: err.message };
    }
  };  

  // ✅ Centralized forgot password
  const resetPasswordRequest = async (email) => {
    try {
      const res = await fetch(`${apiAuthUrl}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) showToast(`${data.error || "Reset request failed"}`, "danger");
      
      showToast("Please check your email");
      return { success: true, data };
    } catch (err) {
      showToast(`${err.message || "Reset request failed"}`, "danger");
      return { success: false, error: err.message };
    }
  };

  // ✅ Centralized update password
  const updatePassword = async (token, newPassword) => {
    try {
      const res = await fetch(`${apiAuthUrl}/update-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password update failed");
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

// ✅ بعد أي تسجيل دخول ناجح (إيميل/كلمة سر أو Google): حفظ الجلسة والرجوع للصفحة المطلوبة
const completeLogin = (data) => {
  const { token: newToken, email: userEmail, isAdmin, profile: newProfile } = data;
  saveToken(newToken);
  localStorage.setItem('email', userEmail);
  localStorage.setItem('isAdmin', isAdmin);
  localStorage.setItem("Profile", JSON.stringify(newProfile || null));
  setemail(userEmail);
  setIsAdmin(!!isAdmin);
  setProfile(newProfile || null);
  // Go back to the page that asked for login (e.g. a Studio design), otherwise home
  let back = '/';
  try {
    back = sessionStorage.getItem('afterLogin') || '/';
    sessionStorage.removeItem('afterLogin');
  } catch {}
  navigate(back.startsWith('/') ? back : '/', { replace: true });
};

// ✅ Centralized login function
const loginUser = async (email, password) => {
  try {
    const res = await fetch(`${apiAuthUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    
    if (!res.ok || data.error) throw new Error(data.error || "Login failed");

    completeLogin(data);
    return { success: true, data };
  } catch (err) {
 // Clear token/session data on failure
    setToken("");
    setemail(null);
    clearStoredAuth();
    
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
};

const clearAuth = () => {
  setToken("");
  setemail(null);
  setProfile(null);
  setIsAdmin(false);
  sessionStorage.clear();
  clearStoredAuth();
};

// مزامنة بين التابات: تسجيل الدخول/الخروج في تاب ينعكس على الباقي
useEffect(() => {
  const onStorage = (e) => {
    if (e.key !== 'token' && e.key !== null) return;
    const t = localStorage.getItem('token') || '';
    setToken(t);
    if (!t) {
      setemail(null);
      setProfile(null);
      setIsAdmin(false);
    } else {
      setemail(localStorage.getItem('email'));
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
      try { setProfile(JSON.parse(localStorage.getItem('Profile') || 'null')); } catch {}
    }
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}, []);

const logout = async () => {
  try {
    const email = localStorage.getItem('email');
    const token = localStorage.getItem('token');

    await fetch(`${process.env.REACT_APP_API_URL}/supabase/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token }),
    });
  } catch (e) {
    showToast("Logout API failed, clearing locally", "warning");
  } finally {
    clearAuth();
    showToast("Logout Done.", "warning")
    navigate('/login');
  }
};

  return (
    <AuthContext.Provider
    value={{
      email,
      loading,
      setemail,
      isAdmin,
      setIsAdmin,
      token,
      loginUser,
      completeLogin,
      saveToken,
      setProfile,
      profile,
      registerUser, // ✅ now exposed to components
      resetPasswordRequest,
      updatePassword
    }}
  >
    {children}
  </AuthContext.Provider>
  
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
