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
  const message = encodeURIComponent("Hello! I'm shopping at Liban bebe and have a question about an item.");
  const phoneNumber = "96170693460";

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
    <footer className="bg-body-h  c-black pt-5 pb-3 border-top mt-5">
      <Container>
        {/* Section 1: Trust Badges */}
        <Row className="text-center mb-5 g-4">
          <Col md={4}>
            <GoShieldCheck  size={32} className="mb-2 " />
            <h6 className="fw-bold">Safety First</h6>
            <p className="small ">100% Non-toxic, BPA-free materials for your little ones.</p>
          </Col>
          <Col md={4}>
            <AiOutlineTruck  size={32} className="mb-2 " />
            <h6 className="fw-bold">Fast Delivery</h6>
            <p className="small ">Free shipping on all orders over $50.</p>
          </Col>
          <Col md={4}>
            <FiRotateCcw  size={32} className="mb-2 " />
            <h6 className="fw-bold">Easy Returns</h6>
            <p className="small ">Life is busy. Return anything within 30 days, no stress.</p>
          </Col>
        </Row>

        <hr className="my-5" />

        {/* Section 2: Main Footer Links */}
        <Row className="gy-4">
          <Col xs={12} lg={4} md={12}>
            <h4 className="fw-bold  mb-3">Little Family</h4>
            <p className="">
              Designed by moms, for moms. We curate the safest and most stylish 
              essentials for every stage of your parenting journey.
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
            © {year} Liban bebe. Made with ❤️ for happy families.
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