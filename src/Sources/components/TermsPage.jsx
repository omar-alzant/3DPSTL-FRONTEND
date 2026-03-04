import React from 'react';
import { Container, Row, Col, ListGroup, Card } from 'react-bootstrap';
import MapLocation from './MapLocation';

const TermsPage = () => {
  const sections = [
    { id: 'general', title: '1. General Terms' },
    { id: 'account', title: '2. Account & Registration' },
    { id: 'ecommerce', title: '3. Sales & Payments' },
    { id: 'contact', title: '4. Contact Us' },
  ];

  return (
    <Container className="py-5 mt-5">
      <Row>
        <Col className="text-center mb-5">
          <h1 className="fw-bold c-black">Terms & Conditions</h1>
          <p className="text-muted">
            Last Updated:{" "}
            {new Date().toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </Col>
      </Row>

      <Row>
        {/* Sticky Navigation Sidebar */}
        <Col lg={3} className="d-none d-lg-block">
          <div className="sticky-top" style={{ top: '100px' }}>
            <h6 className="fw-bold mb-3 text-uppercase small">On this page</h6>
            <ListGroup  className="small">
              {sections.map((sec) => (
                <ListGroup.Item 
                  key={sec.id} 
                  action
                  href={`#${sec.id}`}
                  className="border-0 ps-2 brr text-muted "
                >
                  {sec.title}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        </Col>

        {/* Main Content */}
        <Col lg={9}>
          <Card className="border-0 shadow-sm p-4 p-md-5">
          <section id="general" className="mb-5">
  <h3 className="c-black mb-3">1. General Terms and Acceptance</h3>
  <p>
    By using <strong>3dpstl.com</strong>, you agree to be bound by these terms. 
    Our physical store is located in Tripoli, serving families across Lebanon.
  </p>
  
  {/* The Map Component */}
  <MapLocation />
  
  <p className="mt-3 small text-muted">
    These terms are governed by the laws of Lebanon.
  </p>
</section>

            <section id="account" className="mb-5">
              <h3 className="c-black mb-3">2. Account and Registration Terms</h3>
              <p>Users may create accounts to enhance their shopping experience. You are responsible for:</p>
              <ul className="text-muted">
                <li>Providing accurate and current information.</li>
                <li>Maintaining the confidentiality of your password.</li>
                <li>All activity occurring under your account.</li>
              </ul>
            </section>

            <section id="ecommerce" className="mb-5">
              <h3 className="c-black mb-3">3. E-commerce and Sales Terms</h3>
              <p className="fw-bold">Pricing & Payments</p>
              <p className="text-muted">We accept one-time payments only. All prices are subject to change without notice. Shipping costs and delivery times are estimates and may vary due to location or external delays.</p>
              <div className="bg-light p-3 border-start border-success border-4 italic">
                Note: Product images are for illustration purposes and may vary slightly from the actual product.
              </div>
            </section>

            <section id="contact" className="mb-5">
  <h3 className="c-black mb-3">4. Contact Us</h3>

  <p className="text-muted">
    If you have any questions regarding these Terms & Conditions, our products,
    or your orders, please feel free to contact us using the information below.
    Our team will be happy to assist you.
  </p>

  <Card className="bg-light border-0 mt-3">
    <Card.Body className="small">
      <p className="mb-2">
        <strong>Store Name:</strong> 3DSTL
      </p>

      <p className="mb-2">
        <strong>Phone / WhatsApp:</strong>{" "}
        <a
          href="https://wa.me/96176118290"
          target="_blank"
          rel="noopener noreferrer"
          className="text-decoration-none"
        >
          +961 76 118 290
        </a>
      </p>

      <p className="mb-2">
        <strong>Location:</strong> Tripoli, Lebanon
      </p>

      <p className="mb-0">
        <strong>Social Media:</strong> You may also reach us through our official
        Facebook and Instagram pages listed in the website footer.
      </p>
    </Card.Body>
  </Card>

  <p className="mt-3 small text-muted">
    We aim to respond to all inquiries as quickly as possible during business
    hours.
  </p>
</section>


            {/* ... Add other sections here ... */}

            {/* <section id="contact" className="mb-5">
              <h3 className="c-black mb-3">7. Contact Information</h3>
              <p>Questions about the Terms and Conditions should be sent to us at:</p>
              <Card className="bg-light border-0">
                <Card.Body>
                  <p className="mb-0 fw-bold">Phone: +961 71 711 207</p>
                </Card.Body>
              </Card>
            </section> */}
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TermsPage;