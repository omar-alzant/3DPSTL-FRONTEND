import React from 'react';
import { Container, Row, Col, Form, Button, InputGroup } from 'react-bootstrap';
import { GoShieldCheck } from "react-icons/go";
import { AiOutlineTruck } from "react-icons/ai";
import { FiRotateCcw } from "react-icons/fi";
import { FaFacebookF, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import SocialButtons from './SocialButtons';
import MapLocation from './MapLocation';
import { useLang } from '../i18n/LanguageContext';

const Footer = () => {
  const { tx } = useLang();
  const programedByContact = `https://wa.me/96176118290?text=Hello, How are you?`;
  const message = encodeURIComponent(tx("Hello 3DSTL! I saw your work and I'd like to ask about a piece.", 'مرحبا 3DSTL! شفت شغلكن وحابب إسأل عن قطعة.'));
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
          background: "var(--brand-bg)",
          color: "var(--brand-text)",
          borderTop: "1px solid var(--brand-border)"
        }}
      >      <Container>
        {/* Section 1: Trust Badges */}
        <Row className="text-center mb-5 g-4">
          <Col md={4}>
            <GoShieldCheck size={32} style={{ color: "var(--brand-primary)" }} />
            <h6 className="fw-bold mt-2">{tx('Precision Quality', 'جودة ودقّة')}</h6>
            <p className="small ">
              {tx('High-accuracy 3D prints with professional finishing.', 'طباعة دقيقة بتشطيب احترافي.')}
            </p>
          </Col>

          <Col md={4}>
            <AiOutlineTruck size={32} style={{ color: "var(--brand-primary)" }} />
            <h6 className="fw-bold mt-2">{tx('Fast Production', 'تسليم سريع')}</h6>
            <p className="small ">
              {tx('Efficient turnaround for custom and business orders.', 'منسلّم الطلبات الخاصة وطلبات الشركات بوقت قصير.')}
            </p>
          </Col>

          <Col md={4}>
            <FiRotateCcw size={32} style={{ color: "var(--brand-primary)" }} />
            <h6 className="fw-bold mt-2">{tx('Custom Solutions', 'حسب طلبك')}</h6>
            <p className="small ">
              {tx('From prototypes to branding pieces — tailored to your needs.', 'من النماذج الأولية لقطع الهوية التجارية — على قياس حاجتك.')}
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
              background: "var(--brand-gradient)",
              WebkitBackgroundClip: "text",
              color: "transparent"
            }}
          >
            3DSTL
          </h4>         
          <p>
            {tx('Precision 3D printing & digital fabrication. Custom models, branding pieces, mechanical parts, and creative designs engineered with detail.',
              'طباعة ثلاثية الأبعاد دقيقة وتصنيع رقمي: مجسّمات حسب الطلب، قطع للهوية التجارية، قطع ميكانيكية، وتصاميم مبدعة بأدق التفاصيل.')}
          </p>
            <SocialButtons />
          </Col>

          <Col >
            <h6 className="fw-bold mb-3">{tx('Location', 'موقعنا')}</h6>
            <MapLocation />
          </Col>

          <Col >
            <h6 className="fw-bold mb-3">{tx('Pages', 'الصفحات')}</h6>
            <ul className="list-unstyled small">
              <li className="mb-2"><a href="/our-works" className="text-decoration-none ">{tx('Our Works', 'شغلنا')}</a></li>
              <li className="mb-2"><a href="/" className="text-decoration-none ">{tx('Home', 'الرئيسية')}</a></li>
              <li className="mb-2"><a href="/studio" className="text-decoration-none ">{tx('Studio', 'الاستوديو')}</a></li>
              <li className="mb-2"><a href="/tools" className="text-decoration-none ">{tx('Free tools', 'أدوات مجانية')}</a></li>
              {/* <li className="mb-2"><a href="/" className="text-decoration-none ">Size Guide</a></li> */}
              <li className="mb-2">
                <a href="/terms" className="text-decoration-none ">{tx('Terms & Conditions', 'الشروط والأحكام')}</a>
                </li>
              <li className="mb-2">
                <a href="/privacy" className="text-decoration-none ">{tx('Privacy Policy', 'سياسة الخصوصية')}</a>
              </li>
            </ul>
          </Col>

          {/* <Col lg={4} md={4}>
            <h6 className="fw-bold mb-3">{tx('Stay in touch', 'خلّينا على تواصل')}</h6>
            <p className="small ">{tx('Get news by email', 'وصلك جديدنا عالإيميل')}</p>
            <Form>
              <InputGroup className="mb-3">
                <Form.Control
                  placeholder={tx('Email address', 'البريد الإلكتروني')}
                  aria-label="Email address"
                  className="border-success"
                />
                <Button variant="success">{tx('Join', 'اشترك')}</Button>
              </InputGroup>
            </Form>
          </Col> */}
        </Row>

        {/* Section 3: Bottom Bar */}
        <div className="mt-5 pt-3 border-top d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
          <p className="small  mb-0">
            © {year} 3DSTL. {tx('Engineered with precision.', 'مصمّم بدقّة.')}
          </p>
          <div className="d-flex gap-3">
          <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
            <small className="" style={{ fontSize: '0.75rem' }}>
              {tx('Developed by:', 'تطوير:')}
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