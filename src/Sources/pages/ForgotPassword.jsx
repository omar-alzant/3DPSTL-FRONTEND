import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ReactComponent as Logo } from '../../logo.svg';

// ⭐️ Import React-Bootstrap components ⭐️
import {
    Container,
    Card,
    Form,
    Button,
    Alert,
    Spinner,

} from 'react-bootstrap';
import { useToast } from "../context/ToastProvider";
import { useLang } from '../i18n/LanguageContext';


export default function ForgotPassword() {
  const { tx } = useLang();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Add loading state
  const apiAuthUrl = `${process.env.REACT_APP_API_URL}/api/auth` 
  const { showToast } = useToast();

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    
    // Clear previous messages
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${apiAuthUrl}/ForgotPwd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', 
          // Note: Token is usually not required for Forgot Password endpoint 
          // unless the API enforces authentication even for this flow. 
          // Keeping it for functional parity with the original code.
          'Authorization': `Bearer ${token}`, 
        },
        // The original code uses .replace to handle potential quotes, keeping it:
        body: JSON.stringify({ email: email.trim().replace(/^"|"$/g, '') }),
      });

      const data = await res.json();
        
      if (data.error) {
        setError(data.error);
      } else {
        setMessage('Check your email to confirm your account!');
      }
    } catch (err) {
      setError(tx('Something went wrong. Please try again.', 'صار خطأ. جرّب مرة تانية.'));
      showToast(tx('Something went wrong. Please try again.', 'صار خطأ. جرّب مرة تانية.'), "danger")
    } finally {
        setLoading(false);
        showToast(tx('Reset Done.', 'انبعت رابط تغيير كلمة السر.'))
    }
  };

  return (
    // Use Container for responsive centering, limiting width
    <Container className="auth-container d-flex flex-column align-items-center py-5" style={{ maxWidth: '400px' }}>
            <Logo className="logo-svg mb-4" style={{ height: '60px' }} />
      <h2 className='c-black'>{tx('Forgot Password!', 'نسيت كلمة السر؟')}</h2>
      
      {/* Error Message using Alert */}
      {error && <Alert variant="danger" className="w-100">{error}</Alert>}
      
      {/* Success Message Block using Alert and Link */}
      {message && 
        <Alert variant="success" className="w-100 d-flex flex-column align-items-center">
            <p className='mb-2'>{message}</p>
            {/* The text color will be styled by the Alert component's text color */}
            <Link to="/login" className="alert-link">
                {tx('Return to login page', 'رجوع لتسجيل الدخول')}
            </Link>
        </Alert>
      }

      {/* Reset Form using Card and Form components */}
      <Card className="auth-card p-4 w-100">
        <Form onSubmit={handleReset}>
            <Form.Group className="mb-4">
                <Form.Control 
                    type="email" 
                    placeholder={tx('Email', 'الإيميل')} 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    // Disable the input if message (success) is shown
                    disabled={!!message}
                />
            </Form.Group>

            {/* Submit Button */}
            <Button 
                type="submit" 
                variant="primary" 
                className="w-100" 
                // Disable if loading or if message (success) is displayed
                disabled={loading || !!message}
            >
                {loading ? (
                    <>
                        {/* Spinner for loading state */}
                        <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                        />
                        {tx('Submitting...', 'عم يبعت...')}
                    </>
                ) : (
                    'Submit'
                )}
            </Button>
        </Form>
      </Card>

      {/* Link to Login */}
      <p className='mt-3'>
        {tx('Back to', 'رجوع لـ')} <Link to="/login">{tx('Login', 'تسجيل الدخول')}</Link>
      </p>
    </Container>
  );
}