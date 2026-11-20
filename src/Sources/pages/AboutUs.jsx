// About Us — who 3DSTL is, what we make, how we print, where we are, and how to reach us.
// Uses the same look as the Home page (Style/Home.css) plus a few About-only rules (Style/AboutUs.css).
import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import { MdLocationOn } from 'react-icons/md';
import { WORKS_PATH, whatsappLink } from '../config/site';
import '../Style/Home.css';
import '../Style/AboutUs.css';

const MAP_URL = 'https://maps.app.goo.gl/YgeRm1o4HJLLJn2CA';

const CONTACTS = [
  { name: 'WhatsApp', detail: '+961 76 118 290', url: whatsappLink('Hello, I am interested in your 3D printing services'), icon: <FaWhatsapp />, color: '#25D366' },
  { name: 'Instagram', detail: '@3dpstl', url: 'https://www.instagram.com/3dpstl', icon: <FaInstagram />, color: '#E1306C' },
  { name: 'Facebook', detail: '3DSTL', url: 'https://www.facebook.com/share/1GC7Rn5NZM/', icon: <FaFacebookF />, color: '#1877F2' },
  { name: 'Location', detail: 'Tripoli, Lebanon', url: MAP_URL, icon: <MdLocationOn />, color: '#34d399' },
];

const MAKES = [
  { title: 'Personal gifts', text: 'Name keychains, baby birth signs, initial signs and two-name pieces — in Arabic or English.' },
  { title: 'Phone cases', text: 'Fitted to your phone model, with a soft TPU frame and a back that carries your name or photo.' },
  { title: 'School & office', text: 'Pencil toppers with students’ names, desk signs and name keycaps.' },
  { title: 'Your own idea', text: 'Send a photo, a sketch or an STL file and we’ll print it, or design it with you first.' },
];

export default function AboutUs() {
  return (
    <div className="hm ab">
      {/* intro */}
      <section className="ab-intro">
        <img src="/3dstlLogo.jpeg" alt="3DSTL logo" className="ab-logo" width="112" height="112" />
        <div>
          <h1 className="ab-title">About 3DSTL</h1>
          <p className="hm-lead">
            3DSTL is a small 3D printing studio in Tripoli, Lebanon. We design and print personalised pieces —
            gifts, signs, phone cases and useful parts — and we built an online Studio so you can design yours and
            see it in 3D before it is printed.
          </p>
          <div className="hm-actions">
            <Link to={WORKS_PATH} className="hm-btn hm-btn-primary">See our works</Link>
            <Link to="/studio" className="hm-btn hm-btn-ghost">Open the Studio</Link>
          </div>
        </div>
      </section>

      {/* what we make */}
      <section className="hm-section">
        <h2 className="hm-h2">What we make</h2>
        <div className="ab-makes">
          {MAKES.map((m) => (
            <div key={m.title} className="ab-make">
              <h3>{m.title}</h3>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how we print */}
      <section className="hm-section hm-split">
        <div className="hm-panel">
          <h2 className="hm-h3">How we print</h2>
          <p>
            We print on a Bambu Lab A1 with multi-colour printing, so names and logos come out in several colours in
            one piece — no painting or gluing. A single piece can be up to about 25 × 25 cm; bigger work is printed
            in parts and assembled.
          </p>
          <p className="ab-small">Every order is checked with you before it is printed: size, colours and final price.</p>
        </div>
        <div className="hm-panel">
          <h2 className="hm-h3">Materials</h2>
          <ul className="ab-list">
            <li><strong>PLA</strong> — hard and clean-looking, for gifts, signs and decorations.</li>
            <li><strong>TPU</strong> — flexible and tough, for phone case frames, bags and parts that bend.</li>
          </ul>
          <Link to="/filamentColors" className="hm-link">See the colours in stock</Link>
        </div>
      </section>

      {/* contact */}
      <section className="hm-section">
        <h2 className="hm-h2">Contact us</h2>
        <p className="hm-sub ab-sub">Questions, prices or a custom idea — message us on any of these.</p>
        <div className="ab-contacts">
          {CONTACTS.map((c) => (
            <a key={c.name} href={c.url} target="_blank" rel="noopener noreferrer" className="ab-contact">
              <span className="ab-contact-icon" style={{ color: c.color }}>{c.icon}</span>
              <span>
                <span className="ab-contact-name">{c.name}</span>
                <span className="ab-contact-detail">{c.detail}</span>
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
