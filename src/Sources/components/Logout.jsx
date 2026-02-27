import React from 'react';
import { Button } from 'react-bootstrap';
import { useToast } from '../context/ToastProvider';

const LogoutButton = ({ onClose }) => {
  const token = sessionStorage.getItem("token");
  const apiAuthUrl = `${process.env.REACT_APP_API_URL}/api/auth` 
  const { showToast } = useToast();

  const handleLogout = async () => {
    onClose?.(); 

    try {
        const email = sessionStorage.getItem("email")?.replace(/^"|"$/g, '');
        const response = await fetch(`${apiAuthUrl}/logout`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'            },
            // If you need to send cookies/session info, include credentials
            body: JSON.stringify({ email, token}), // ✅ stringify
    });

      const data = await response.json();

      if (!response.ok) {
        showToast(`${data.error || 'Logout failed'}`, "danger");
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
        <Button className="bg-gr-h br-0" onClick={handleLogout} >
          Logout
        </Button>
      )
      :
      (
        <Button onClick={handleLogin} >
          Login
        </Button>
      )
    }
    </>
  );
};

export default LogoutButton;
