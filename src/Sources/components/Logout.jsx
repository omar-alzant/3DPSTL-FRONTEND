import React from 'react';
import { Button } from 'react-bootstrap';
import { useToast } from '../context/ToastProvider';
import { useLang } from '../i18n/LanguageContext';

const LogoutButton = ({ onClose }) => {
  const { tx } = useLang();
  const token = localStorage.getItem('token');
  const apiAuthUrl = `${process.env.REACT_APP_API_URL}/api/auth` 
  const { showToast } = useToast();

  const handleLogout = async () => {
    onClose?.(); 

    try {
        const email = localStorage.getItem('email')?.replace(/^"|"$/g, '');
        const response = await fetch(`${apiAuthUrl}/logout`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'            },
            // If you need to send cookies/session info, include credentials
            body: JSON.stringify({ email, token}), // ✅ stringify
    });

      const data = await response.json();

      if (!response.ok) {
        showToast(`${data.error || tx('Logout failed', 'فشل تسجيل الخروج')}`, "danger");
      }
      else{
        showToast('Logging out done', 'warning')
        localStorage.clear();
        sessionStorage.clear(); 
        window.location.href = '/login';
      }
    } catch (err) {
      showToast(`Logout error: ${err.message}`, "danger");

    }
  };

  const handleLogin = () => {
    onClose?.(); 

    window.location.href = '/login';
  }

  return (
    <>
    {
      token !== null ?
      (
        <Button className="br-0" onClick={handleLogout} >
          {tx('Logout', 'تسجيل الخروج')}
        </Button>
      )
      :
      (
        <Button onClick={handleLogin} >
          {tx('Login', 'تسجيل الدخول')}
        </Button>
      )
    }
    </>
  );
};

export default LogoutButton;
