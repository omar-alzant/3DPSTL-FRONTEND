// About Us — who 3DSTL is, what we make, how we print, where we are, and how to reach us. Arabic + English.
// Uses the same look as the Home page (Style/Home.css) plus a few About-only rules (Style/AboutUs.css).
import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import { MdLocationOn } from 'react-icons/md';
import { WORKS_PATH, whatsappLink } from '../config/site';
import { useLang } from '../i18n/LanguageContext';
import '../Style/Home.css';
import '../Style/AboutUs.css';

const MAP_URL = 'https://maps.app.goo.gl/YgeRm1o4HJLLJn2CA';

const MAKES = [
  { title: ['Personal gifts', 'هدايا شخصية'], text: ['Name keychains, baby birth signs, initial signs and two-name pieces — in Arabic or English.', 'ميداليات بالأسماء، لوحات مواليد، حروف كبيرة مع أسماء وقطع باسمين — بالعربي أو بالإنكليزي.'] },
  { title: ['Phone cases', 'كفرات موبايل'], text: ['Fitted to your phone model, with a soft TPU frame and a back that carries your name or photo.', 'على قياس موبايلك، بإطار TPU مرن وظهر عليه اسمك أو صورتك.'] },
  { title: ['School & office', 'للمدرسة والمكتب'], text: ['Pencil toppers with students’ names, desk signs and name keycaps.', 'رؤوس أقلام بأسماء التلاميذ، منظّمات مكتب، وأزرار كيبورد بالأسماء.'] },
  { title: ['Your own idea', 'فكرتك إنت'], text: ['Send a photo, a sketch or an STL file and we’ll print it, or design it with you first.', 'ابعت صورة أو رسمة أو ملف STL ومنطبعه، أو منصمّمه معك من الأول.'] },
];

export default function AboutUs() {
  const { tx } = useLang();
  const contacts = [
    { name: 'WhatsApp', detail: '+961 76 118 290', url: whatsappLink(tx('Hello, I am interested in your 3D printing services', 'مرحبا، مهتم بخدمات الطباعة ثلاثية الأبعاد عندكن')), icon: <FaWhatsapp />, color: '#25D366' },
    { name: 'Instagram', detail: '@3dpstl', url: 'https://www.instagram.com/3dpstl', icon: <FaInstagram />, color: '#E1306C' },
    { name: 'Facebook', detail: '3DSTL', url: 'https://www.facebook.com/share/1GC7Rn5NZM/', icon: <FaFacebookF />, color: '#1877F2' },
    { name: tx('Location', 'الموقع'), detail: tx('Tripoli, Lebanon', 'طرابلس، لبنان'), url: MAP_URL, icon: <MdLocationOn />, color: '#34d399' },
  ];

  return (
    <div className="hm ab">
      {/* intro */}
      <section className="ab-intro">
        <img src="/3dstlLogo.jpeg" alt="3DSTL logo" className="ab-logo" width="112" height="112" />
        <div>
          <h1 className="ab-title">{tx('About 3DSTL', 'عن 3DSTL')}</h1>
          <p className="hm-lead">
            {tx(
              '3DSTL is a small 3D printing studio in Tripoli, Lebanon. We design and print personalised pieces — gifts, signs, phone cases and useful parts — and we built an online Studio so you can design yours and see it in 3D before it is printed.',
              '3DSTL استوديو طباعة ثلاثية الأبعاد صغير بطرابلس، لبنان. منصمّم ومنطبع قطع شخصية — هدايا ولوحات وكفرات وقطع مفيدة — وعملنا استوديو أونلاين لتصمّم قطعتك وتشوفها 3D قبل ما تنطبع.'
            )}
          </p>
          <div className="hm-actions">
            <Link to={WORKS_PATH} className="hm-btn hm-btn-primary">{tx('See our works', 'تفرّج على شغلنا')}</Link>
            <Link to="/studio" className="hm-btn hm-btn-ghost">{tx('Open the Studio', 'افتح الاستوديو')}</Link>
          </div>
        </div>
      </section>

      {/* what we make */}
      <section className="hm-section">
        <h2 className="hm-h2">{tx('What we make', 'شو منعمل')}</h2>
        <div className="ab-makes">
          {MAKES.map((m) => (
            <div key={m.title[0]} className="ab-make">
              <h3>{tx(...m.title)}</h3>
              <p>{tx(...m.text)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how we print */}
      <section className="hm-section hm-split">
        <div className="hm-panel">
          <h2 className="hm-h3">{tx('How we print', 'كيف منطبع')}</h2>
          <p>
            {tx(
              'We print on five machines — Bambu Lab H2S, Bambu Lab A1, Snapmaker U1, Creality K1 Max and Creality Hi — and pick the right one for each job. Multi-colour printing means names and logos come out in several colours in one piece, with no painting or gluing. A single piece can be up to about 30 × 30 cm; bigger work is printed in parts and assembled.',
              'منطبع على خمس مكنات — Bambu Lab H2S وBambu Lab A1 وSnapmaker U1 وCreality K1 Max وCreality Hi — ومنختار المناسبة لكل شغلة. الطباعة بعدّة ألوان بتخلّي الأسماء والشعارات تطلع بكذا لون بقطعة وحدة، بلا دهان ولا لزق. القطعة الوحدة بتوصل لحوالي 30 × 30 سم، والشغل الأكبر منطبعه قطع ومنركّبه.'
            )}
          </p>
          <p className="ab-small">{tx('Every order is checked with you before it is printed: size, colours and final price.', 'كل طلب منراجعه معك قبل الطباعة: القياس والألوان والسعر النهائي.')}</p>
        </div>
        <div className="hm-panel">
          <h2 className="hm-h3">{tx('Materials', 'المواد')}</h2>
          <ul className="ab-list">
            <li><strong>PLA</strong> — {tx('hard and clean-looking, for gifts, signs and decorations.', 'قاسي وشكله نضيف، للهدايا واللوحات والديكور.')}</li>
            <li><strong>TPU</strong> — {tx('flexible and tough, for phone case frames, bags and parts that bend.', 'مرن وقوي، لإطارات الكفرات والحقائب والقطع يلي بتنطوي.')}</li>
            <li><strong>PETG</strong> — {tx('stronger than PLA and handles water and some heat, for kitchen, bathroom and outdoor use.', 'أقوى من الـPLA وبيتحمّل المي وشوية حرارة، للمطبخ والحمّام والاستعمال برّا.')}</li>
            <li><strong>ASA</strong> — {tx('made for outdoors: keeps its colour in the sun and takes the weather, for car and garden parts.', 'معمول للبرّا: ما بيبهت بالشمس وبيتحمّل الطقس، لقطع السيارات والجنينة.')}</li>
            <li><strong>ABS</strong> — {tx('tough and heat-resistant, for parts that take knocks or sit somewhere warm.', 'قاسي وبيتحمّل الحرارة، للقطع يلي بتنضرب أو بتكون بمحل سخن.')}</li>
            <li><strong>PA-CF</strong> — {tx('nylon with carbon fibre: very stiff and strong, for engineering and replacement parts.', 'نايلون مع ألياف كربون: قاسي وقوي كتير، للقطع الهندسية وقطع التبديل.')}</li>
          </ul>
          <p className="ab-small">{tx('We choose the material with you, based on what the piece is for.', 'منختار المادة معك حسب استعمال القطعة وطلبك.')}</p>
          <Link to="/filamentColors" className="hm-link">{tx('See the colours in stock', 'شوف الألوان المتوفّرة')}</Link>
        </div>
      </section>

      {/* contact */}
      <section className="hm-section">
        <h2 className="hm-h2">{tx('Contact us', 'تواصل معنا')}</h2>
        <p className="hm-sub ab-sub">{tx('Questions, prices or a custom idea — message us on any of these.', 'سؤال، سعر أو فكرة خاصة — راسلنا على أي وحدة من هول.')}</p>
        <div className="ab-contacts">
          {contacts.map((c) => (
            <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" className="ab-contact">
              <span className="ab-contact-icon" style={{ color: c.color }}>{c.icon}</span>
              <span>
                <span className="ab-contact-name">{c.name}</span>
                <span className="ab-contact-detail" dir="auto">{c.detail}</span>
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
