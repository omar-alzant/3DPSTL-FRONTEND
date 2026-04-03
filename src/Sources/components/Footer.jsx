import React from 'react';
import { Container, Row, Col, Form, Button, InputGroup } from 'react-bootstrap';
import { GoShieldCheck } from "react-icons/go";
import { AiOutlineTruck } from "react-icons/ai";
import { FiRotateCcw } from "react-icons/fi";
import { FaFacebookF, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import SocialButtons from './SocialButtons';
import MapLocation from './MapLocation';

const Footer = () => {
  const programedByContact = `https://wa.me/96176118290?text=Hello, How are you?`;
  const message = encodeURIComponent("Hello! I'm shopping at 3DSTL and have a question about an item.");
  const phoneNumber = "96176118290";

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
  const year = new Date().getFullYear();

  const socialLinks = [
    { 
      id: 'fb', 
      icon: <FaFacebookF />, 
      url: 'https://facebook.com/3dslt/', 
      color: 'fb-hover' 
    },
    { 
      id: 'ig', 
      icon: <FaInstagram />, 
      url: 'https://instagram.com/liban_bebe/', 
      color: 'ig-hover' 
    },
    { 
      id: 'wa', 
      icon: <FaWhatsapp />, 
      url: whatsappUrl, 
      color: 'wa-hover' 
    },
  ];
  return (
      <footer
        className="pt-5 pb-3 mt-5"
        style={{
          background: "#0B0F2A",
          color: "#E6E9FF",
          borderTop: "1px solid #1E245C"
        }}
      >      <Container>
        {/* Section 1: Trust Badges */}
        <Row className="text-center mb-5 g-4">
          <Col md={4}>
            <GoShieldCheck size={32} style={{ color: "#6C63FF" }} />
            <h6 className="fw-bold mt-2">Precision Quality</h6>
            <p className="small ">
              High-accuracy 3D prints with professional finishing.
            </p>
          </Col>

          <Col md={4}>
            <AiOutlineTruck size={32} style={{ color: "#6C63FF" }} />
            <h6 className="fw-bold mt-2">Fast Production</h6>
            <p className="small ">
              Efficient turnaround for custom and business orders.
            </p>
          </Col>

          <Col md={4}>
            <FiRotateCcw size={32} style={{ color: "#6C63FF" }} />
            <h6 className="fw-bold mt-2">Custom Solutions</h6>
            <p className="small ">
              From prototypes to branding pieces — tailored to your needs.
            </p>
          </Col>
        </Row>
        <hr className="my-5" />

        {/* Section 2: Main Footer Links */}
        <Row className="gy-4">
          <Col xs={12} lg={4} md={12}>
          <h4
            className="fw-bold mb-3"
            style={{
              background: "linear-gradient(90deg,#6C63FF,#4F46E5)",
              WebkitBackgroundClip: "text",
              color: "transparent"
            }}
          >
            3DSTL
          </h4>         
          <p>
            Precision 3D printing & digital fabrication.
            Custom models, branding pieces, mechanical parts,
            and creative designs engineered with detail.
          </p>
            <SocialButtons />
          </Col>

          <Col >
            <h6 className="fw-bold mb-3">Location</h6>
            <MapLocation />
          </Col>

          <Col >
            <h6 className="fw-bold mb-3">Pages</h6>
            <ul className="list-unstyled small">
              <li className="mb-2"><a href="/Shop" className="text-decoration-none ">Shop</a></li>
              <li className="mb-2"><a href="/" className="text-decoration-none ">Home</a></li>
              {/* <li className="mb-2"><a href="/" className="text-decoration-none ">Size Guide</a></li> */}
              <li className="mb-2">
                <a href="/terms" className="text-decoration-none ">Terms & Conditions</a>
                </li>
            </ul>
          </Col>

          {/* <Col lg={4} md={4}>
            <h6 className="fw-bold mb-3">Be on contact</h6>
            <p className="small ">Communicate with e-mail</p>
            <Form>
              <InputGroup className="mb-3">
                <Form.Control
                  placeholder="Email address"
                  aria-label="Email address"
                  className="border-success"
                />
                <Button variant="success">Join</Button>
              </InputGroup>
            </Form>
          </Col> */}
        </Row>

        {/* Section 3: Bottom Bar */}
        <div className="mt-5 pt-3 border-top d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
          <p className="small  mb-0">
            © {year} 3DSTL. Engineered with precision.
          </p>
          <div className="d-flex gap-3">
          <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
            <small className="" style={{ fontSize: '0.75rem' }}>
              Developped by:
            </small>
            <Button 
              variant="link" 
              className="p-0 border-0 d-flex align-items-center"
              onClick={() => window.open(programedByContact, "_blank")}
              style={{ textDecoration: 'none' }}
              title='Omar J Zant'
            >
              {/* <img 
                src="/3dstlLogo.jpeg" // Replace with your logo URL
                alt="3DSTL"
                style={{ 
                  height: "24px", 
                  width: "auto", 
                  transition: "0.3s"
                }}
              /> */}

              Omar J Zant
            </Button>
          </div>
            {/* <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" height="15" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" height="15" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="Paypal" height="15" /> */}
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;