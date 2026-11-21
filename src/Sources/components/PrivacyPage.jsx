import React from 'react';
import { useLang } from '../i18n/LanguageContext';
import { Container, Row, Col, ListGroup, Card, ButtonGroup, Button } from 'react-bootstrap';

// سياسة الخصوصية — /privacy (إنكليزي + عربي). مرتبطة بشاشة موافقة Google وتسجيل الدخول بـ Google.
const CONTACT = '3dstl.lb@gmail.com';
const UPDATED = 'November 2026';

const EN = {
  dir: 'ltr',
  title: 'Privacy Policy',
  updated: `Last updated: ${UPDATED}`,
  sections: [
    {
      id: 'who', title: '1. Who we are',
      body: [
        <>This policy explains how <strong>3DSTL</strong> (3dpstl.com), a 3D printing studio based in Tripoli, Lebanon, collects and uses your information when you use our website, shop and Studio.</>,
      ],
    },
    {
      id: 'collect', title: '2. Information we collect',
      list: [
        <><strong>Account:</strong> your email address and name. If you sign in with Google, we receive your name, email address and profile picture from Google. We never receive your Google password.</>,
        <><strong>Orders:</strong> the name, phone number, delivery address and notes you enter when you place a shop or Studio print order.</>,
        <><strong>Studio designs:</strong> the settings of designs you order or download (text, colours, sizes) and any image you upload into a design, so we can print it and so you can re-download it from “My files”.</>,
        <><strong>Credits:</strong> your credit balance and history, and for top-ups the package, payment method (Whish Money / Neo), the transaction number and the sender name you provide. We never receive card or bank account numbers.</>,
        <><strong>Technical:</strong> a security check (Cloudflare Turnstile) to block bots, and data stored in your own browser to keep you signed in and remember your cart. We do not use advertising trackers.</>,
      ],
    },
    {
      id: 'use', title: '3. How we use it',
      list: [
        'To create and secure your account and keep you signed in.',
        'To prepare, print and deliver your orders, and to contact you about them (phone, WhatsApp or email).',
        'To manage your Studio credits and verify your payments.',
        'To protect the website against abuse and fraud.',
      ],
      after: 'We do not sell your personal information and we do not use it for advertising.',
    },
    {
      id: 'share', title: '4. Who we share it with',
      body: ['Only with the services that run our website, and only what they need to do their job:'],
      list: [
        'Supabase (accounts and database), Railway (server) and Netlify (website hosting).',
        'Cloudflare (bot protection) and Google (Google sign-in and our order-notification emails).',
        'Delivery partners, when needed to deliver your order (name, phone and address only).',
      ],
      after: 'We may also disclose information if required by Lebanese law.',
    },
    {
      id: 'keep', title: '5. How long we keep it',
      body: ['We keep your account information while your account is active, and order and payment records as long as needed for our accounting and legal obligations. You can ask us to delete your account at any time.'],
    },
    {
      id: 'rights', title: '6. Your choices and rights',
      list: [
        'You can view and edit your profile information from your account.',
        <>You can ask for a copy of your data, or for your account and data to be deleted, by emailing <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</>,
        <>If you signed in with Google, you can remove 3DSTL's access at any time from your Google Account (Security → Third-party connections).</>,
      ],
    },
    {
      id: 'security', title: '7. Security',
      body: ['We use encrypted connections (HTTPS), access controls and server-side checks to protect your information. No online service can be 100% secure, so please keep your password private.'],
    },
    {
      id: 'children', title: '8. Children',
      body: ['Our website is not intended for children under 13. Parents may place orders on behalf of their children.'],
    },
    {
      id: 'contact', title: '9. Contact & changes',
      body: [<>For any privacy question, contact us at <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. If we change this policy, we will update the date at the top of this page.</>],
    },
  ],
};

const AR = {
  dir: 'rtl',
  title: 'سياسة الخصوصية',
  updated: 'آخر تحديث: تشرين الثاني 2026',
  sections: [
    { id: 'who', title: '١. من نحن', body: [<>توضح هذه السياسة كيف يجمع <strong>3DSTL</strong> (3dpstl.com)، استوديو طباعة ثلاثية الأبعاد في طرابلس – لبنان، معلوماتك ويستعملها عند استخدامك للموقع والمتجر والـ Studio.</>] },
    {
      id: 'collect', title: '٢. المعلومات التي نجمعها',
      list: [
        <><strong>الحساب:</strong> بريدك الإلكتروني واسمك. عند الدخول بحساب Google نستلم من Google اسمك وبريدك وصورة حسابك فقط، ولا نستلم كلمة سر Google أبداً.</>,
        <><strong>الطلبات:</strong> الاسم ورقم الهاتف وعنوان التوصيل والملاحظات التي تكتبها عند الطلب من المتجر أو طباعة تصميم من الـ Studio.</>,
        <><strong>تصاميم الـ Studio:</strong> إعدادات التصاميم التي تطلبها أو تنزّلها (النص، الألوان، المقاسات) وأي صورة ترفعها داخل التصميم، لنطبعها ولتستطيع تنزيلها مجدداً من «ملفاتي».</>,
        <><strong>الكريدت:</strong> رصيدك وسجل الحركات، وعند الشحن: الباقة وطريقة الدفع (Whish Money / Neo) ورقم العملية واسم المحوِّل الذي تكتبه. لا نستلم أبداً أرقام بطاقات أو حسابات مصرفية.</>,
        <><strong>معلومات تقنية:</strong> فحص أمان (Cloudflare Turnstile) لمنع البرامج الآلية، وبيانات محفوظة في متصفحك أنت لإبقائك مسجّل الدخول وتذكّر السلة. لا نستعمل أدوات تتبّع إعلانية.</>,
      ],
    },
    {
      id: 'use', title: '٣. كيف نستعملها',
      list: ['لإنشاء حسابك وحمايته وإبقائك مسجّل الدخول.', 'لتحضير طلباتك وطباعتها وتوصيلها، والتواصل معك بشأنها (هاتف، واتساب أو بريد).', 'لإدارة رصيد الكريدت والتحقق من الدفعات.', 'لحماية الموقع من الاستغلال والاحتيال.'],
      after: 'لا نبيع معلوماتك الشخصية ولا نستعملها للإعلانات.',
    },
    {
      id: 'share', title: '٤. مع من نشاركها',
      body: ['فقط مع الخدمات التي يعمل عليها الموقع، وبالقدر الذي تحتاجه لعملها:'],
      list: ['Supabase (الحسابات وقاعدة البيانات)، Railway (الخادم) وNetlify (استضافة الموقع).', 'Cloudflare (الحماية من البرامج الآلية) وGoogle (الدخول بـ Google وإيميلات إشعار الطلبات).', 'شركات التوصيل عند الحاجة لتوصيل طلبك (الاسم والهاتف والعنوان فقط).'],
      after: 'وقد نكشف معلومات إذا طلب القانون اللبناني ذلك.',
    },
    { id: 'keep', title: '٥. مدة الاحتفاظ', body: ['نحتفظ بمعلومات حسابك ما دام حسابك فعّالاً، وبسجلات الطلبات والدفعات بالقدر اللازم للمحاسبة والالتزامات القانونية. يمكنك طلب حذف حسابك في أي وقت.'] },
    {
      id: 'rights', title: '٦. خياراتك وحقوقك',
      list: [
        'يمكنك مشاهدة معلومات حسابك وتعديلها من صفحة الحساب.',
        <>يمكنك طلب نسخة من بياناتك أو حذف حسابك وبياناتك بمراسلتنا على <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</>,
        'إذا دخلت بحساب Google، يمكنك إلغاء وصول 3DSTL في أي وقت من حساب Google (الأمان ← الاتصالات بتطبيقات الجهات الخارجية).',
      ],
    },
    { id: 'security', title: '٧. الحماية', body: ['نستعمل اتصالات مشفّرة (HTTPS) وصلاحيات وصول وفحوصات على الخادم لحماية معلوماتك. لا توجد خدمة إلكترونية آمنة 100%، لذلك حافظ على سرّية كلمة السر.'] },
    { id: 'children', title: '٨. الأطفال', body: ['الموقع غير موجّه للأطفال دون 13 سنة، ويمكن للأهل الطلب نيابةً عن أولادهم.'] },
    { id: 'contact', title: '٩. التواصل والتعديلات', body: [<>لأي سؤال عن الخصوصية راسلنا على <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. عند تعديل هذه السياسة نحدّث التاريخ أعلى الصفحة.</>] },
  ],
};

export default function PrivacyPage() {
  // follows the site language (ع / EN in the navbar); these buttons switch the whole site
  const { lang, setLang } = useLang();
  const t = lang === 'ar' ? AR : EN;

  return (
    <Container className="py-5 mt-5" dir={t.dir}>
      <Row>
        <Col className="text-center mb-4">
          <h1 className="fw-bold c-black">{t.title}</h1>
          <p className="text-muted">{t.updated}</p>
          <ButtonGroup size="sm">
            <Button variant={lang === 'en' ? 'primary' : 'outline-primary'} onClick={() => setLang('en')}>English</Button>
            <Button variant={lang === 'ar' ? 'primary' : 'outline-primary'} onClick={() => setLang('ar')}>العربية</Button>
          </ButtonGroup>
        </Col>
      </Row>

      <Row>
        <Col lg={3} className="d-none d-lg-block">
          <div className="sticky-top" style={{ top: '100px' }}>
            <ListGroup className="small">
              {t.sections.map((sec) => (
                <ListGroup.Item key={sec.id} action href={`#${sec.id}`} className="border-0 ps-2 brr text-muted">
                  {sec.title}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        </Col>

        <Col lg={9}>
          <Card className="border-0 shadow-sm p-4 p-md-5">
            {t.sections.map((sec) => (
              <section id={sec.id} key={sec.id} className="mb-5">
                <h3 className="c-black mb-3">{sec.title}</h3>
                {sec.body?.map((b, i) => <p key={i}>{b}</p>)}
                {sec.list && (
                  <ul className="text-muted">
                    {sec.list.map((li, i) => <li key={i} className="mb-2">{li}</li>)}
                  </ul>
                )}
                {sec.after && <p className="fw-bold">{sec.after}</p>}
              </section>
            ))}
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
