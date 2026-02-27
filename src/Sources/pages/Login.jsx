import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ReactComponent as Logo } from '../../logo.svg';
import ReCAPTCHA from "react-google-recaptcha";
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';

import {
  Container,
  Card,
  Form,
  Button,
  Modal,
  Spinner,
  Alert,
  InputGroup
} from 'react-bootstrap';

import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastProvider';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoutFromOtherDevicesBtn, setLogoutFromOtherDevicesBtn] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [recaptchaValid, setRecaptchaValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { showToast } = useToast();

  const apiAuthUrl = `${process.env.REACT_APP_API_URL}/api/auth`;
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  // ✅ Read query param (?verify=1)
  const [searchParams] = useSearchParams();
  const showVerifyMessage = searchParams.get('verify') === '1';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [error]);

  // --- Recaptcha Handlers ---
  const handleRecaptchaChange = (token) => {
    setRecaptchaToken(token);
    setRecaptchaValid(!!token);
    setError("");
  };

  const handleRecaptchaExpired = () => {
    setRecaptchaToken(null);
    setRecaptchaValid(false);
    setError("The recaptcha token was invalid.");
    showToast("The recaptcha token was invalid.", "danger")

  };

  const handleRecaptchaError = () => {
    setRecaptchaToken(null);
    setRecaptchaValid(false);
    setError("Please, try again!");
    showToast("Please, try again!", "danger")

  };

  // --- Logout Logic ---
  const handleLogoutClick = () => {
    setShowForm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      const res = await fetch(`${apiAuthUrl}/logoutAlldevices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, recaptchaToken }),
      });

      const data = await res.json();

      if (data.ok) {
        setError('');
        showToast("Logout from other devices done", "warning")
        setRecaptchaToken(null);
        setRecaptchaValid(false);
        setLogoutFromOtherDevicesBtn(false);
        setShowForm(false);
      }
    } catch (err) {
      setError("Error occurred.");
      showToast("Error occurred", "danger")

      setRecaptchaValid(false);
    }
  };

  // --- Login Logic ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await loginUser(email, password);

    if (result.success) {
      setError('');
    showToast("Login Done" )
      
      setLogoutFromOtherDevicesBtn(false);
    } else {
      setError(result.error);
      showToast(result.error, "danger")

      if (
        result.error &&
        result.error.startsWith('User is already logged in on another device')
      ) {
        setLogoutFromOtherDevicesBtn(true);
      } else {
        setLogoutFromOtherDevicesBtn(false);
      }
    }

    setLoading(false);
  };

  return (
    <Container
      className="auth-container d-flex flex-column align-items-center py-5"
      style={{ maxWidth: '400px' }}
    >
      <Logo className="logo-svg mb-4" style={{ height: '60px' }} />
      <h2 className='c-black'> Login </h2>
      {error && <Alert variant="danger" className="w-100">{error}</Alert>}

      {logoutFromOtherDevicesBtn && (
        <>
          <Button
            variant="warning"
            className="mb-3 w-100"
            onClick={handleLogoutClick}
          >
            Logout from all devices
          </Button>

          <Modal show={showForm} onHide={() => setShowForm(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Confirm Logout</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Control
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <InputGroup>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ border: 'none' }}
                    >
                      {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                    </Button>
                  </InputGroup>
                </Form.Group>

                <div className="d-flex justify-content-center">
                  <ReCAPTCHA
                    sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                    onChange={handleRecaptchaChange}
                    onExpired={handleRecaptchaExpired}
                    onErrored={handleRecaptchaError}
                  />
                </div>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="danger"
                disabled={!recaptchaValid}
                onClick={handleConfirmLogout}
              >
                Confirm
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      )}

      <Card className="auth-card p-4 w-100">

        {/* ✅ EMAIL CONFIRMATION MESSAGE */}
        {showVerifyMessage && (
          <Alert variant="info" className="mb-3">
            Please check your email and confirm your account before logging in.
          </Alert>
        )}

        <Form onSubmit={handleLogin}>
          <Form.Group className="mb-3">
            <Form.Control
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <InputGroup>
              <Form.Control
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowPassword(!showPassword)}
                style={{ border: 'none' }}
              >
                {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
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
                <Spinner size="sm" animation="border" className="me-2" />
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </Button>
        </Form>
      </Card>

      <p className="mt-3">
        You don't have an account? <Link to="/register">Register</Link>
      </p>
      <p>
        Forgot password? <Link to="/forgot-password">Forgot password</Link>
      </p>
    </Container>
  );
}
