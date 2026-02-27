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

export default function UpdatePassword() {
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
          showToast("Invalid or expired reset link.", "danger");
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
      setError('Passwords do not match.');
      showToast('Passwords do not match.', "danger");
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
      showToast("Password updated successfully.", "success");
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

      <h2 className="mb-3 c-black">Update Password</h2>

      {error && <Alert variant="danger" className="w-100">{error}</Alert>}

      <Card className="auth-card p-4 w-100">
        <Form onSubmit={handleUpdate}>

          {/* New Password */}
          <Form.Group className="mb-3">
            <InputGroup>
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
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
                placeholder="Confirm new password"
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
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </Button>

        </Form>
      </Card>
    </Container>
  );
}
