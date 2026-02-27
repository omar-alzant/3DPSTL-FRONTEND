import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from './ToastProvider';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [email, setemail] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(sessionStorage.getItem('token') || "");
  const navigate = useNavigate();
  const location = useLocation();
  const apiAuthUrl = `${process.env.REACT_APP_API_URL}/api/auth` 
  const [profile, setProfile] = useState(null);
  const { showToast } = useToast();

  const saveToken = (newToken) => {
    setToken(newToken);
    sessionStorage.setItem('token', newToken);
  };

// Inside AuthProvider in AuthContext.jsx
useEffect(() => {
  const storedToken = sessionStorage.getItem("token");

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
    setemail(sessionStorage.getItem("email"));
    setIsAdmin(sessionStorage.getItem("isAdmin") === "true");

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

    const { token: newToken, email: userEmail, isAdmin, profile: newProfile } = data;
    
    saveToken(newToken);
    
    sessionStorage.setItem("email", userEmail);
    sessionStorage.setItem("isAdmin", isAdmin);
    localStorage.setItem("Profile", JSON.stringify(newProfile)); 

    setemail(userEmail);
    setIsAdmin(isAdmin);
    setProfile(newProfile);
    // Navigate to the dashboard or home page
    navigate('/'); 

    return { success: true, data };
  } catch (err) {
    // Clear token/session data on failure
    setToken("");
    setemail(null);
    sessionStorage.clear(); 
    
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
};

const clearAuth = () => {
  setToken("");
  setemail(null);
  setProfile(null);
  setIsAdmin(false);
  sessionStorage.clear();
  localStorage.removeItem("Profile");
};

const logout = async () => {
  try {
    const email = sessionStorage.getItem("email");
    const token = sessionStorage.getItem("token");

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
