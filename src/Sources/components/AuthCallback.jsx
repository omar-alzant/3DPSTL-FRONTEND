import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useToast } from '../context/ToastProvider';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { completeLogin } = useAuth();

  useEffect(() => {
    const finalizeAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        navigate('/login');
        return;
      }

      const accessToken = data.session.access_token;

      // Send token to backend to create app session
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auth/confirm-login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const result = await res.json();

      if (!res.ok) {
        showToast(`Confirmation Failed!`, "danger");
        navigate('/login');
        return;
      }

      // Email confirmed → the user is logged in straight away
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      showToast("Email confirmed — welcome!");
      completeLogin(result);
    };

    finalizeAuth();
  }, [navigate]);

  return null;
}
