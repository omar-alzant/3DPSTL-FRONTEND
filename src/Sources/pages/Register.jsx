import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReactComponent as Logo } from '../../logo.svg';

// ⭐️ Import React-Bootstrap components ⭐️
import {
    Container,
    Card,
    Form,
    Button,
    Alert,
    Spinner,
    InputGroup,

} from 'react-bootstrap';
import AppToast from '../components/AppToast';
import { GoogleButton } from '../components/GoogleSignIn';
import { useLang } from '../i18n/LanguageContext';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'; // Import icons

export default function Register() {
  const { tx } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { registerUser } = useAuth();
  const [loading, setLoading] = useState(false); // Add loading state for button feedback
  const [toast, setToast] = useState({
    show: false,
    message: "",
    bg: "success",
  });
  const [showPassword, setShowPassword] = useState(false); // New state
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await registerUser(email, password);

    if (result.success) {
      setError('');
      setMessage(result?.message);
      // Optionally clear fields on success
      // setEmail('');
      // setPassword('');
      showToast(tx('Please, review your email to complete the confirmation!', 'افتح إيميلك لتكمّل تأكيد الحساب!'), "success");

    } else {
      setMessage('');
      setError(result.error);
      showToast(tx('Somethings went wrong!', 'صار في خطأ!'), "danger");
    }
    setLoading(false);
  };

  const showToast = (message, bg = "success") => {
    setToast({ show: true, message, bg });
  };
  return (
    <>
    <AppToast
    show={toast.show}
    message={toast.message}
    bg={toast.bg}
    onClose={() => setToast({ ...toast, show: false })}
  />
    <Container className="auth-container d-flex flex-column align-items-center py-5" style={{ maxWidth: '400px' }}>
    <Logo className="logo-svg mb-4" style={{ height: '60px' }} />

      <h2 className='c-black'>{tx('Register email', 'إنشاء حساب')}</h2>
      
      {/* Error Message using Alert */}
      {error && <Alert variant="danger" className="w-100">{error}</Alert>}
      
      {/* Success Message using Alert */}
      {message && <Alert variant="success" className="w-100">{message}</Alert>}
      
      {/* Registration Form using Card and Form components */}
      <Card className="auth-card p-4 w-100">
        <Form onSubmit={handleRegister}>
          
          <Form.Group className="mb-3">
            <Form.Control
              type="email"
              placeholder={tx('Email', 'الإيميل')} // Changed to start with uppercase for consistency
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </Form.Group>
 
           <Form.Group className="mb-4">
            <InputGroup>
              <Form.Control
                type={showPassword ? "text" : "password"} // Switches type
                placeholder={tx('Password', 'كلمة السر')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <Button 
                variant="outline-secondary" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ borderLeft: 'none' }} // Makes it look integrated
              >
                {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </Button>
            </InputGroup>
          </Form.Group>


          {/* Submit Button */}
          <Button type="submit" variant="primary" className="w-100" disabled={loading}>
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

        <div className="d-flex align-items-center my-3 text-muted small">
          <hr className="flex-grow-1" /><span className="mx-2">{tx('or', 'أو')}</span><hr className="flex-grow-1" />
        </div>
        <GoogleButton label={tx('Sign up with Google', 'سجّل بحساب Google')} />
      </Card>

      {/* Link to Login */}
      <p className='mt-3'>
        {tx('Already have an account?', 'عندك حساب؟')} <Link to="/login">{tx('Login', 'تسجيل الدخول')} </Link>
      </p>
    </Container>
    </>

  );
}