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
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'; // Import icons

export default function Register() {
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
      showToast(`Please, review your email to complete the confirmation!`, "success");

    } else {
      setMessage('');
      setError(result.error);
      showToast(`Somethings went wrong!`, "danger");
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
    // Use Container for structure and centering, limiting width
    <Container className="auth-container d-flex flex-column align-items-center py-5" style={{ maxWidth: '400px' }}>
    <Logo className="logo-svg mb-4" style={{ height: '60px' }} />

      <h2 className='c-black'>Register email</h2>
      
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
              placeholder="Email" // Changed to start with uppercase for consistency
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </Form.Group>
 
           <Form.Group className="mb-4">
            <InputGroup>
              <Form.Control
                type={showPassword ? "text" : "password"} // Switches type
                placeholder="Password"
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
                    Submitting...
                </>
            ) : (
                'Submit'
            )}
          </Button>
        </Form>
      </Card>

      {/* Link to Login */}
      <p className='mt-3'>
        have you an account? <Link to="/login">Login </Link>
      </p>
    </Container>
    </>

  );
}