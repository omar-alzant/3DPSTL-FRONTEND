import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner, Container } from 'react-bootstrap';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastProvider';
import { useLang } from '../i18n/LanguageContext';

// تسجيل الدخول بحساب Google عبر Supabase:
// 1) GoogleButton يفتح صفحة Google
// 2) Google يرجع إلى /auth/google ← GoogleCallback يرسل جلسة Supabase للـ backend ويحصل على توكن التطبيق

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
  </svg>
);

export function GoogleButton({ label }) {
  const { tx } = useLang();
  const text = label || tx('Continue with Google', 'كمّل بحساب Google');
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const go = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/google`, queryParams: { prompt: 'select_account' } },
    });
    if (error) {
      setBusy(false);
      showToast(error.message || 'Google sign-in failed', 'danger');
    }
  };
  return (
    <Button variant="light" className="w-100 d-flex align-items-center justify-content-center gap-2" onClick={go} disabled={busy}>
      {busy ? <Spinner size="sm" animation="border" /> : <GoogleIcon />}
      <span>{text}</span>
    </Button>
  );
}

export function GoogleCallback() {
  const { tx } = useLang();
  const { completeLogin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    // ننتظر حتى يقرأ Supabase الجلسة من الرابط (حتى 5 ثوانٍ)
    const waitForSession = () =>
      new Promise((resolve) => {
        let finished = false;
        const finish = (s) => { if (!finished) { finished = true; sub?.subscription?.unsubscribe(); resolve(s); } };
        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (s) finish(s); });
        supabase.auth.getSession().then(({ data }) => { if (data.session) finish(data.session); });
        setTimeout(() => finish(null), 5000);
      });

    (async () => {
      const urlError = new URLSearchParams(window.location.search).get('error_description')
        || new URLSearchParams(window.location.hash.slice(1)).get('error_description');
      const session = urlError ? null : await waitForSession();
      if (!session) {
        showToast(urlError || 'Google sign-in was cancelled or failed', 'danger');
        navigate('/login', { replace: true });
        return;
      }
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Google sign-in failed');
        // لا نحتاج جلسة Supabase بعد الآن — التطبيق يستعمل توكنه الخاص
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        showToast(tx('Logged in with Google', 'دخلت بحساب Google'));
        completeLogin(data);
      } catch (e) {
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        showToast(e.message, 'danger');
        navigate('/login', { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
      <Spinner animation="border" />
      <p className="mt-3">{tx('Signing you in with Google…', 'عم نسجّل دخولك بحساب Google…')}</p>
    </Container>
  );
}
