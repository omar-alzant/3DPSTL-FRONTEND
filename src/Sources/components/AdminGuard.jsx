// Protects /admin: not logged in → login page; logged in but not admin → home.
// The admin flag in the browser can be edited, so we also ask the server once (it checks the database).
// The real protection is on the server — every admin API refuses non-admins — this only hides the pages.
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './BrandSpinner';

const API = process.env.REACT_APP_API_URL || '';

export default function AdminGuard({ children }) {
  const { loading, isAdmin } = useAuth();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const [server, setServer] = useState('checking'); // checking | ok | no

  useEffect(() => {
    if (loading || !token || !isAdmin) return undefined;
    let alive = true;
    fetch(`${API}/api/credits/admin/summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => alive && setServer(r.ok ? 'ok' : r.status === 401 || r.status === 403 ? 'no' : 'ok'))
      .catch(() => alive && setServer('ok')); // offline: the APIs will refuse anyway
    return () => { alive = false; };
  }, [loading, token, isAdmin]);

  if (loading) return null;
  if (!token) {
    sessionStorage.setItem('afterLogin', location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin || server === 'no') return <Navigate to="/" replace />;
  if (server === 'checking') return <PageLoader text="Checking access…" />;
  return children;
}
