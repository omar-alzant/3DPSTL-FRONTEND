import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  InputGroup
} from 'react-bootstrap';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { useToast } from "../context/ToastProvider";

import { ReactComponent as Logo } from '../../logo.svg';
import { supabase } from '../supabase';
import { useLang } from '../i18n/LanguageContext';

export default function UpdatePassword() {
  const { tx } = useLang();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const navigate = useNavigate();

  /**
   * Handle Supabase recovery tokens on redirect
   */
  useEffect(() => {
    const handleRecovery = async () => {
      const hash = window.location.hash;
      if (!hash) return;

      const params = new URLSearchParams(hash.replace('#', ''));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const type = params.get('type');

      if (type === 'recovery' && access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          showToast(tx('Invalid or expired reset link.', 'الرابط غلط أو انتهت صلاحيته.'), "danger");
          navigate('/login');
          return;
        }

        // Clean URL
        window.history.replaceState(null, '', '/update-password');
      }
    };

    handleRecovery();
  }, [navigate, showToast]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(tx('Passwords do not match.', 'كلمتين السر مش متل بعض.'));
      showToast(tx('Passwords do not match.', 'كلمتين السر مش متل بعض.'), "danger");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
      showToast(error.message, "danger");
    } else {
      showToast(tx('Password updated successfully.', 'تغيّرت كلمة السر.'), "success");
      await supabase.auth.signOut();
      navigate('/login');
    }

    setLoading(false);
  };

  return (
    <Container
      className="auth-container d-flex flex-column align-items-center py-5"
      style={{ maxWidth: '400px' }}
    >
      <Logo className="logo-svg mb-4" style={{ height: '60px' }} />

      <h2 className="mb-3 c-black">{tx('Update Password', 'تغيير كلمة السر')}</h2>

      {error && <Alert variant="danger" className="w-100">{error}</Alert>}

      <Card className="auth-card p-4 w-100">
        <Form onSubmit={handleUpdate}>

          {/* New Password */}
          <Form.Group className="mb-3">
            <InputGroup>
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                placeholder={tx('New password', 'كلمة السر الجديدة')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowPassword(v => !v)}
                style={{ border: 'none' }}
              >
                {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </Button>
            </InputGroup>
          </Form.Group>

          {/* Confirm Password */}
          <Form.Group className="mb-4">
            <InputGroup>
              <Form.Control
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={tx('Confirm new password', 'أكّد كلمة السر الجديدة')}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowConfirmPassword(v => !v)}
                style={{ border: 'none' }}
              >
                {showConfirmPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </Button>
            </InputGroup>
          </Form.Group>

          <Button
            type="submit"
            variant="primary"
            className="w-100"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                {tx('Updating...', 'عم يحدّث...')}
              </>
            ) : (
              tx('Update Password', 'تغيير كلمة السر')
            )}
          </Button>

        </Form>
      </Card>
    </Container>
  );
}
