// Terms & Conditions — English + Arabic, following the site language (ع / EN in the navbar).
import React from 'react';
import { Container, Row, Col, ListGroup, Card } from 'react-bootstrap';
import MapLocation from './MapLocation';
import { useLang } from '../i18n/LanguageContext';

const TermsPage = () => {
  const { tx, lang } = useLang();
  const sections = [
    { id: 'general', title: tx('1. General terms', '1. الشروط العامة') },
    { id: 'account', title: tx('2. Your account', '2. حسابك') },
    { id: 'orders', title: tx('3. Orders, prices & payments', '3. الطلبات والأسعار والدفع') },
    { id: 'studio', title: tx('4. Studio & credits', '4. الاستوديو والكريدت') },
    { id: 'contact', title: tx('5. Contact us', '5. تواصل معنا') },
  ];

  return (
    <Container className="py-5 mt-5">
      <Row>
        <Col className="text-center mb-5">
          <h1 className="fw-bold c-black">{tx('Terms & Conditions', 'الشروط والأحكام')}</h1>
          <p className="text-muted">
            {tx('Last updated:', 'آخر تحديث:')}{' '}
            {new Date().toLocaleDateString(lang === 'ar' ? 'ar-LB' : 'en-GB', { month: 'long', year: 'numeric' })}
          </p>
        </Col>
      </Row>

      <Row>
        <Col lg={3} className="d-none d-lg-block">
          <div className="sticky-top" style={{ top: '100px' }}>
            <h6 className="fw-bold mb-3 small">{tx('On this page', 'بهالصفحة')}</h6>
            <ListGroup className="small">
              {sections.map((sec) => (
                <ListGroup.Item key={sec.id} action href={`#${sec.id}`} className="border-0 ps-2 brr text-muted">
                  {sec.title}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        </Col>

        <Col lg={9}>
          <Card className="border-0 shadow-sm p-4 p-md-5">
            <section id="general" className="mb-5">
              <h3 className="c-black mb-3">{sections[0].title}</h3>
              <p>
                {tx('By using', 'باستعمالك')} <strong>3dpstl.com</strong>{' '}
                {tx('you agree to these terms. 3DSTL is a 3D printing studio based in Tripoli, serving customers across Lebanon.',
                  'بتكون موافق على هالشروط. 3DSTL استوديو طباعة ثلاثية الأبعاد مقرّه طرابلس، ومنخدم الزباين بكل لبنان.')}
              </p>
              <MapLocation />
              <p className="mt-3 small text-muted">{tx('These terms are governed by the laws of Lebanon.', 'هالشروط بتخضع للقوانين اللبنانية.')}</p>
            </section>

            <section id="account" className="mb-5">
              <h3 className="c-black mb-3">{sections[1].title}</h3>
              <p>{tx('You can create an account to order, follow your orders and use credits in the Studio. You are responsible for:', 'فيك تعمل حساب لتطلب، وتتابع طلباتك، وتستعمل الكريدت بالاستوديو. إنت مسؤول عن:')}</p>
              <ul className="text-muted">
                <li>{tx('Giving accurate, up-to-date information.', 'إنو تكون معلوماتك صحيحة ومحدّثة.')}</li>
                <li>{tx('Keeping your password private.', 'إنك تحافظ على سرّية كلمة السر.')}</li>
                <li>{tx('Everything done from your account.', 'كل شي بيصير من حسابك.')}</li>
              </ul>
            </section>

            <section id="orders" className="mb-5">
              <h3 className="c-black mb-3">{sections[2].title}</h3>
              <p className="text-muted">
                {tx('We accept one-time payments only. Prices may change without notice; prices shown in the Studio are estimates, and the final price is confirmed with you before printing. Delivery costs and times are estimates and may vary with the location or outside delays.',
                  'منقبل دفعات لمرة وحدة بس. الأسعار ممكن تتغيّر بلا إنذار مسبق؛ والأسعار يلي بتطلع بالاستوديو تقريبية، والسعر النهائي منأكّده معك قبل الطباعة. كلفة التوصيل ومدّته تقديرية وممكن تختلف حسب المنطقة أو ظروف خارجة عن إرادتنا.')}
              </p>
              <div className="bg-light p-3 border-start border-success border-4">
                {tx('Note: product images are for illustration and may differ slightly from the printed piece.', 'ملاحظة: صور القطع للتوضيح، وممكن تختلف شوي عن القطعة المطبوعة.')}
              </div>
            </section>

            <section id="studio" className="mb-5">
              <h3 className="c-black mb-3">{sections[3].title}</h3>
              <p className="text-muted">
                {tx('Designing and previewing in the Studio is free. Downloading a design file uses credits, which you top up with Whish Money or Neo; credits are added after we confirm your transfer. A design you have paid for can be downloaded again for free from “My files”.',
                  'التصميم والمعاينة بالاستوديو مجاني. تنزيل ملف التصميم بيستعمل كريدت، وبتشحنه عبر Whish Money أو Neo؛ والكريدت بينزاد بعد ما نتأكّد من التحويل. التصميم يلي دفعت حقّه فيك تنزّله مرة تانية ببلاش من «ملفاتي».')}
              </p>
            </section>

            <section id="contact" className="mb-5">
              <h3 className="c-black mb-3">{sections[4].title}</h3>
              <p className="text-muted">
                {tx('If you have any question about these terms, our work or your orders, contact us using the details below — we’ll be happy to help.',
                  'إذا عندك أي سؤال عن هالشروط أو شغلنا أو طلباتك، تواصل معنا على المعلومات تحت — منكون مبسوطين نساعدك.')}
              </p>
              <Card className="bg-light border-0 mt-3">
                <Card.Body className="small">
                  <p className="mb-2"><strong>{tx('Name:', 'الاسم:')}</strong> 3DSTL</p>
                  <p className="mb-2">
                    <strong>{tx('Phone / WhatsApp:', 'هاتف / واتساب:')}</strong>{' '}
                    <a href="https://wa.me/96176118290" target="_blank" rel="noopener noreferrer" className="text-decoration-none" dir="ltr">+961 76 118 290</a>
                  </p>
                  <p className="mb-2"><strong>{tx('Location:', 'الموقع:')}</strong> {tx('Tripoli, Lebanon', 'طرابلس، لبنان')}</p>
                  <p className="mb-0">
                    <strong>{tx('Social media:', 'السوشيال ميديا:')}</strong>{' '}
                    {tx('you can also reach us on our Facebook and Instagram pages, linked in the footer.', 'فيك كمان تحكينا على صفحاتنا عالفيسبوك والإنستغرام، روابطها تحت بالصفحة.')}
                  </p>
                </Card.Body>
              </Card>
              <p className="mt-3 small text-muted">{tx('We aim to answer every message as quickly as we can during working hours.', 'منحاول نرد على كل رسالة بأسرع وقت خلال ساعات الشغل.')}</p>
            </section>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TermsPage;
