// Home — what 3DSTL is and everything the site offers, in one page:
// hero → ways to order → what the Studio makes → our works → how an order goes → print it yourself → contact
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MdWhatsapp } from "react-icons/md";
import { FaInstagram } from "react-icons/fa";
import PrinterScene from "../components/PrinterScene";
import WorksWall from "../components/WorksWall";
import LogoMarquee from "../components/LogoMarquee";
import CartItem from "../components/CartItem";
import RelatedItemsSlider from "../components/RelatedItemsSlider";
import MultiImageInput from "../components/MultiImageInput";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastProvider";
import { CART_ENABLED, WORKS_PATH, whatsappLink } from "../config/site";
import { getConfig } from "../studio/lib/api";
import { isToolEnabled } from "../studio/lib/pricing";
import "../Style/Home.css";
import { useLang } from '../i18n/LanguageContext';

const base = process.env.REACT_APP_API_URL;

const saveLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const loadLS = (key, fallback = []) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const arr = (d) => (Array.isArray(d) ? d : []);
// a picture field can be a list, a list saved as text ('["https://…"]') or one link
const firstImage = (v) => {
  if (Array.isArray(v)) return v.find(Boolean) || "";
  if (typeof v !== "string" || !v.trim()) return "";
  const t = v.trim();
  if (t.startsWith("[")) { try { const a = JSON.parse(t); return Array.isArray(a) ? a.find(Boolean) || "" : ""; } catch { return ""; } }
  return t;
};

// Studio tools shown on the home page (ids from src/Sources/studio/tools/*). Order = what people ask for most.
const STUDIO_TOOLS = [
  { id: "job-outfit", name: "Job gift: outfit and name", text: "A sculpted work outfit on a stand with the name.", nameAr: "هدية المهنة", textAr: "لبس المهنة منحوت على قاعدة عليها الاسم." },
  { id: "name-keychain", name: "Name keychain", text: "Any name, your font, two colours.", nameAr: "ميدالية باسم", textAr: "أي اسم، بالخط يلي بيعجبك، بلونين." },
  { id: "phone-case", name: "Phone case", text: "Fitted to your model, with a name, photo or pattern.", nameAr: "كفر موبايل", textAr: "على قياس موبايلك، مع اسم أو صورة أو نقشة." },
  { id: "qr-code", name: "3D QR code", text: "Your link, Wi-Fi or WhatsApp on a plate people can scan.", nameAr: "كود QR مطبوع", textAr: "رابطك أو الـ Wi-Fi أو واتساب على لوحة بتنمسح بالكاميرا." },
  { id: "coaster", name: "Coaster", text: "A photo or a name, flat in the surface so cups sit level.", nameAr: "كوستر", textAr: "صورة أو اسم مدموج بالسطح، فالكاسة بتقعد مستوية." },
  { id: "cookie-cutter", name: "Cookie cutter & stamp", text: "Your drawing or a shape, with a stamp that prints a name.", nameAr: "قالب كوكيز مع ختم", textAr: "رسمتك أو شكل جاهز، مع ختم بيطبع اسم." },
  { id: "lithophane", name: "Photo lithophane", text: "Your photo appears when light shines through it.", nameAr: "لوحة صورة مضيئة", textAr: "صورتك بتبيّن لما يضوي وراها ضو." },
  { id: "photo-lampshade", name: "Photo lampshade", text: "Your photo wrapped around a light, with a base for an LED.", nameAr: "أباجورة من صورة", textAr: "صورتك ملفوفة حوالين ضو، مع قاعدة لضو LED." },
  { id: "vase", name: "Vase generator", text: "Pick a shape, ribs and twist — prints in vase mode.", nameAr: "مولّد فازات", textAr: "اختار الشكل والخطوط واللفّة — بتنطبع بوضع vase." },
  { id: "jigsaw-puzzle", name: "Jigsaw puzzle", text: "Any picture cut into as many pieces as you like.", nameAr: "بازل من صورة", textAr: "أي صورة مقطّعة لعدد القطع يلي بدّك ياه." },
  { id: "clicker", name: "Clicker fidget", text: "A clicky keyboard switch under your picture or initial.", nameAr: "كليكر فيدجيت", textAr: "زر كيبورد بيطقطق تحت صورتك أو حرفك." },
  { id: "stamp", name: "Name stamp", text: "Up to three lines and your logo, with a handle.", nameAr: "ختم بالاسم", textAr: "لحد 3 أسطر مع شعارك، ومع مسكة." },
  { id: "lebanon-keychain", name: "Lebanon flag keychain", text: "Flag, heart or cedar — in red, white and green.", nameAr: "ميدالية علم لبنان", textAr: "علم أو قلب أو أرزة — بالأحمر والأبيض والأخضر." },
  { id: "ramadan-tray", name: "Ramadan tray", text: "A dates tray with a standing \"Ramadan Kareem\" sign.", nameAr: "صينية رمضان", textAr: "صينية تمر مع لافتة واقفة «رمضان كريم»." },
  { id: "desk-organizer", name: "Name desk organizer", text: "Pens and bits in compartments, your name on the front.", nameAr: "منظّم مكتب بالاسم", textAr: "أقلام وأغراض بأقسام، واسمك على الواجهة." },
  { id: "birth-sign", name: "Baby birth sign", text: "Name, date, time, weight and length.", nameAr: "لوحة مولود", textAr: "الاسم والتاريخ والساعة والوزن والطول." },
  { id: "initial-sign", name: "Initial & name sign", text: "A big first letter with the name across it.", nameAr: "حرف كبير مع اسم", textAr: "حرف أول كبير والاسم ماشي عليه." },
  { id: "dual-name", name: "Two names, one piece", text: "Reads one name from the front, another from the side.", nameAr: "اسمين بقطعة وحدة", textAr: "بتقرا اسم من قدّام واسم تاني من الجنب." },
  { id: "lebanese-plate", name: "Lebanese car plate", text: "Cedar, letter and number — or your company logo.", nameAr: "لوحة سيارة لبنانية", textAr: "الأرزة والحرف والرقم — أو شعار شركتك." },
  { id: "pencil-topper", name: "Pencil topper", text: "A student's name that slides onto the pencil.", nameAr: "رأس قلم بالاسم", textAr: "اسم التلميذ بيركب عالقلم." },
  { id: "keycaps", name: "Name keycaps", text: "Mechanical keyboard keys, one letter each.", nameAr: "أزرار كيبورد بالاسم", textAr: "أزرار ميكانيكية، كل حرف بزر." },
  { id: "flexi-toy", name: "Flexi toy from a photo", text: "Upload a drawing, get a toy that bends.", nameAr: "لعبة فليكسي من صورة", textAr: "ارفع رسمة، بتطلع لعبة بتتحرّك." },
  { id: "tpu-tote", name: "Flexible tote bag", text: "Printed in one piece in soft TPU.", nameAr: "حقيبة مرنة", textAr: "بتنطبع قطعة وحدة بخيط TPU طري." },
  { id: "plate-keychain", name: "Saudi plate keychain", text: "Your plate numbers as a mini keychain.", nameAr: "ميدالية لوحة سعودية", textAr: "أرقام لوحتك كميدالية صغيرة." },
];

const STEPS = [
  { title: "Choose or design", text: "Make it in the Studio, or pick a piece from our works.", titleAr: "اختار أو صمّم", textAr: "صمّمها بالاستوديو، أو اختار قطعة من شغلنا." },
  { title: "We confirm with you", text: "On WhatsApp: final price, colours and when it's ready. Nothing is printed before you agree.", titleAr: "منأكّد معك", textAr: "على واتساب: السعر النهائي والألوان وإيمتى بتكون جاهزة. ما منطبع شي قبل ما توافق." },
  { title: "We print it", text: "Hard PLA for gifts and parts, flexible TPU for cases and bags.", titleAr: "منطبعها", textAr: "PLA قاسي للهدايا والقطع، وTPU مرن للكفرات والحقائب." },
  { title: "You receive it", text: "We deliver it to the address in your order.", titleAr: "بتوصلك", textAr: "منوصّلها عالعنوان يلي بطلبك." },
];

/** the hero headline "prints" layer by layer once */
function PrintedHeadline({ children }) {
  return (
    <h1 className="hm-title" aria-label={typeof children === "string" ? children : undefined}>
      <span className="hm-title-text">{children}</span>
      <span className="hm-nozzle" aria-hidden="true" />
    </h1>
  );
}

export default function Home() {
  const { tx } = useLang();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { updateQuantity, removeFromCart, addTocart, updateVariant } = useCart();

  const [carouselItems, setCarouselItems] = useState(() => loadLS("occasions"));
  const [brands, setBrands] = useState(() => loadLS("brandLogos"));
  const [saleItems, setSaleItems] = useState(() => loadLS("items"));
  const [homeTypes, setHomeTypes] = useState([]);
  const [, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [showAllTools, setShowAllTools] = useState(false); // the Studio list shows 6 until "See more"

  useEffect(() => {
    window.scrollTo({ top: 0 });
    getConfig().then(setConfig);

    const getJSON = async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Couldn't load ${url.replace(base, "")}`);
      return r.json();
    };

    Promise.all([
      getJSON(`${base}/api/home/types`).catch(() => []),
      getJSON(`${base}/api/admin/products/carousel`).catch(() => []),
      getJSON(`${base}/api/admin/products/market?pageSize=100`).catch(() => ({})),
      CART_ENABLED ? getJSON(`${base}/api/admin/products/item/onsale`).catch(() => []) : Promise.resolve([]),
    ])
      .then(([types, carouselRaw, marketsRaw, itemsRaw]) => {
        setHomeTypes(arr(types));

        // occasions & offers (edited in Admin → Carousel)
        const carousel = arr(carouselRaw)
          .filter((c) => !c.isDisabled && c.image)
          .map((c) => ({ id: c.id, name: c.name, description: c.description || "", image: c.image, link: c.linkedPath || "" }));
        setCarouselItems(carousel);
        saveLS("occasions", carousel);

        // brands we worked for: shown as a wall of logos
        const markets = arr(marketsRaw?.items)
          .map((m) => ({ id: m.id, name: m.name, image: firstImage(m.image), off: m.isdisabled }))
          .filter((m) => !m.off && m.image);
        setBrands(markets);
        saveLS("brandLogos", markets);

        setSaleItems(arr(itemsRaw));
        saveLS("items", arr(itemsRaw));
      })
      .catch((e) => showToast(e.message, "danger"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tools = STUDIO_TOOLS.filter((t) => !config || isToolEnabled(config, t.id));
  const hasCarousel = carouselItems.length > 0;

  return (
    <div className="hm">
      {/* ───────── hero ───────── */}
      <section className="hm-hero has-media">
        <div className="hm-hero-copy">
          <PrintedHeadline>{tx("Your idea, printed layer by layer.", "فكرتك، مطبوعة طبقة طبقة.")}</PrintedHeadline>
          <p className="hm-lead">
            {tx("3DSTL is a 3D printing studio in Tripoli, Lebanon. Design a gift in our online Studio, take a piece from our work and make it yours, or send us your own idea.",
              "3DSTL استوديو طباعة ثلاثية الأبعاد بطرابلس، لبنان. صمّم هديتك بالاستوديو أونلاين، أو خود قطعة من شغلنا وخلّيها إلك، أو ابعتلنا فكرتك.")}
          </p>
          <div className="hm-actions">
            <Link to="/studio" className="hm-btn hm-btn-primary">{tx("Design in the Studio", "صمّم بالاستوديو")}</Link>
            <Link to={WORKS_PATH} className="hm-btn hm-btn-ghost">{tx("Browse our works", "تفرّج على شغلنا")}</Link>
          </div>
          <ul className="hm-facts">
            <li>{tx("Names in Arabic and English", "أسماء بالعربي والإنكليزي")}</li>
            <li>{tx("See your design in 3D before you order", "بتشوف تصميمك 3D قبل ما تطلب")}</li>
            <li>{tx("Price confirmed before printing", "السعر بيتأكّد قبل الطباعة")}</li>
          </ul>
        </div>
        <div className="hm-hero-media hm-hero-art">
          <PrinterScene />
        </div>
      </section>

      {/* ───────── a wall of real photos from our works ───────── */}
      <WorksWall />
      {/* ───────── our works by type (only when types are set up for the home page) ───────── */}
      {homeTypes.length > 0 && (
        <section className="hm-section">
          {homeTypes.map((type) => (
            <div key={type.id} className="hm-type">
              <div className="hm-type-head">
                <h3>{type.name}</h3>
                <Link to={`${WORKS_PATH}?type_id=${type.id}`}>{tx("See", "شوف")} {type.name}</Link>
              </div>
              <MultiImageInput
                label=""
                controlId={`${type.id}-img`}
                formData={type}
                readOnly
                seeMore={() => navigate(`${WORKS_PATH}?type_id=${type.id}`)}
                ratio="16x9"
              />
              <RelatedItemsSlider items={type.items} onSeeMore={() => navigate(`${WORKS_PATH}?type_id=${type.id}`)} />
            </div>
          ))}
        </section>
      )}


      {/* ───────── occasions & offers (Admin → Carousel) ───────── */}
      {hasCarousel && (
        <section className="hm-section hm-occasions" aria-label={tx("Occasions and offers", "مناسبات وعروض")}>
          <div className="hm-occ-grid">
            {carouselItems.map((o) => {
              const inner = (
                <>
                  <img src={o.image} alt="" loading="lazy" decoding="async" />
                  <span className="hm-occ-text">
                    <b>{o.name}</b>
                    {o.description && <span>{o.description}</span>}
                  </span>
                </>
              );
              return o.link
                ? (/^https?:/.test(o.link)
                  ? <a key={o.id} className="hm-occ" href={o.link} target="_blank" rel="noopener noreferrer">{inner}</a>
                  : <Link key={o.id} className="hm-occ" to={o.link}>{inner}</Link>)
                : <div key={o.id} className="hm-occ">{inner}</div>;
            })}
          </div>
        </section>
      )}

      {/* ───────── ways to order ───────── */}
      <section className="hm-section">
        <h2 className="hm-h2">{tx("Three ways to get something printed", "تلات طرق لتطبع شي")}</h2>
        <div className="hm-ways">
          <article className="hm-way hm-way-main">
            <h3>{tx("Design it yourself", "صمّمها بنفسك")}</h3>
            <p>{tx("Type a name, choose fonts and colours, and turn the 3D model around as you go. Order the print, or download the file.", "اكتب اسم، اختار الخط والألوان، ولفّ المجسّم وإنت عم تصمّم. بعدها اطلب الطباعة أو نزّل الملف.")}</p>
            <Link to="/studio">{tx("Open the Studio", "افتح الاستوديو")}</Link>
          </article>
          <article className="hm-way">
            <h3>{tx("Order one like ours", "اطلب متل شغلنا")}</h3>
            <p>{tx("Found a piece you like? Ask for the same with your name, size or colours changed.", "عجبتك قطعة؟ اطلب متلها باسمك أو بقياس أو ألوان تانية.")}</p>
            <Link to={WORKS_PATH}>{tx("Browse our works", "تفرّج على شغلنا")}</Link>
          </article>
          <article className="hm-way">
            <h3>{tx("Bring your own idea", "جيب فكرتك")}</h3>
            <p>{tx("Send a photo, a sketch or an STL file. We'll tell you if it can be printed and what it costs.", "ابعت صورة أو رسمة أو ملف STL، ومنقلّك إذا بتنطبع وقدّيش بتكلّف.")}</p>
            <a href={whatsappLink(tx("Hi 3DSTL! I have an idea I'd like to print:", "مرحبا 3DSTL! عندي فكرة بدّي إطبعها:"))} target="_blank" rel="noopener noreferrer">
              {tx("Message us on WhatsApp", "راسلنا على واتساب")}
            </a>
          </article>
        </div>
      </section>

      {/* ───────── studio ───────── */}
      <section className="hm-section hm-studio">
        <div className="hm-section-head">
          <div>
            <h2 className="hm-h2">{tx("What you can make in the Studio", "شو فيك تعمل بالاستوديو")}</h2>
            <p className="hm-sub">{tx("Each one is a template you fill in — the model updates while you type.", "كل واحد قالب بتعبّيه — والمجسّم بيتحدّث وإنت عم تكتب.")}</p>
          </div>
          <Link to="/studio" className="hm-btn hm-btn-ghost hm-btn-sm">{tx("All templates", "كل القوالب")}</Link>
        </div>
        <ul className="hm-tools" id="hm-tools">
          {(showAllTools ? tools : tools.slice(0, 6)).map((t) => (
            <li key={t.id}>
              <Link to={`/studio/${t.id}`} className="hm-tool">
                <span className="hm-tool-pic">
                  <img src={`${process.env.PUBLIC_URL || ""}/media/tools/${t.id}.webp`} alt="" loading="lazy" decoding="async" width="320" height="320" />
                </span>
                <span className="hm-tool-name">{tx(t.name, t.nameAr)}</span>
                <span className="hm-tool-text">{tx(t.text, t.textAr)}</span>
              </Link>
            </li>
          ))}
        </ul>
        {tools.length > 6 && (
          <div className="hm-more">
            <button type="button" className="hm-btn hm-btn-ghost" aria-expanded={showAllTools} aria-controls="hm-tools" onClick={() => setShowAllTools((v) => !v)}>
              {showAllTools ? tx("Show less", "خفّف") : tx(`See more (${tools.length - 6})`, `شوف المزيد (${tools.length - 6})`)}
            </button>
          </div>
        )}
        <p className="hm-sub hm-free">
          {tx("Free tools, no sign-up:", "أدوات مجانية بلا تسجيل:")} <Link to="/tools#fix-3mf">{tx("fix a 3MF file WhatsApp turned into .zip", "صلّح ملف 3MF حوّله واتساب لـ zip")}</Link> ·{" "}
          <Link to="/tools#arabic-text">{tx("Arabic text for your slicer", "نص عربي للـ slicer")}</Link> ·{" "}
          <Link to="/tools#cost">{tx("print cost & profit calculators", "حاسبة الكلفة والربح")}</Link>
        </p>
      </section>

      {/* ───────── on sale (only while the shop/cart is on) ───────── */}
      {CART_ENABLED && saleItems.length > 0 && (
        <section className="hm-section">
          <div className="hm-section-head">
            <h2 className="hm-h2">{tx("On sale", "عروض")}</h2>
            <Link to={`${WORKS_PATH}?onsale=true`} className="hm-btn hm-btn-ghost hm-btn-sm">{tx("See more", "شوف أكتر")}</Link>
          </div>
          <div className="hm-sale">
            {saleItems.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                updateQuantity={updateQuantity}
                removeFromCart={removeFromCart}
                addToCart={addTocart}
                showDetails={false}
                addFromExternal
                updateVariant={updateVariant}
                onClickAction={() => navigate(`/item/${item.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ───────── how an order goes ───────── */}
      <section className="hm-section">
        <h2 className="hm-h2">{tx("How an order goes", "كيف بيمشي الطلب")}</h2>
        <ol className="hm-steps">
          {STEPS.map((s) => (
            <li key={s.title}>
              <h3>{tx(s.title, s.titleAr)}</h3>
              <p>{tx(s.text, s.textAr)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────── print it yourself + colours ───────── */}
      <section className="hm-section hm-split">
        <div className="hm-panel">
          <h2 className="hm-h3">{tx("Have your own printer?", "عندك طابعة؟")}</h2>
          <p>
            {tx("Download any Studio design as a print-ready file using credits. Top up with Whish Money or Neo, and a design you paid for stays free to download again.",
              "نزّل أي تصميم من الاستوديو كملف جاهز للطباعة بالكريدت. اشحن رصيدك عبر Whish Money أو Neo، والتصميم يلي دفعت حقّه بتنزّله مرة تانية ببلاش.")}
          </p>
          <Link to="/credits" className="hm-link">{tx("Credits and my files", "الكريدت وملفاتي")}</Link>
        </div>
        <div className="hm-panel">
          <h2 className="hm-h3">{tx("Pick your colours", "اختار ألوانك")}</h2>
          <p>{tx("See every filament colour we have in stock right now, in PLA and flexible TPU.", "شوف كل ألوان الخيوط الموجودة عنا هلّق، PLA وTPU المرن.")}</p>
          <Link to="/filamentColors" className="hm-link">{tx("See the colours", "شوف الألوان")}</Link>
        </div>
      </section>

      {/* ───────── brands ───────── */}
      {brands.length > 0 && (
        <section className="hm-section hm-brands">
          <h2 className="hm-h2">{tx("They trusted us", "وثقوا فينا")}</h2>
          <p className="hm-sub">{tx("Shops and companies we've printed for. Tap one to see what we made them.", "محلات وشركات طبعنالهم. اكبس على وحدة لتشوف شو عملنالهم.")}</p>
          <LogoMarquee
            brands={brands}
            linkTo={(b) => `${WORKS_PATH}?brand_id=${b.id}`}
            backLabel={tx("Scroll back", "رجوع")}
            nextLabel={tx("Scroll on", "قدّام")}
          />
        </section>
      )}

      {/* ───────── contact ───────── */}
      <section className="hm-contact">
        <div>
          <h2 className="hm-h2">{tx("Have something in mind?", "في ببالك شي؟")}</h2>
          <p className="hm-sub">{tx("Send us a photo, a sketch or just the idea on WhatsApp or Instagram.", "ابعتلنا صورة أو رسمة أو بس الفكرة على واتساب أو إنستغرام.")}</p>
        </div>
        <div className="hm-actions">
          <a className="hm-btn hm-btn-wa" href={whatsappLink(tx("Hi 3DSTL!", "مرحبا 3DSTL!"))} target="_blank" rel="noopener noreferrer">
            <MdWhatsapp size={20} /> WhatsApp
          </a>
          <a className="hm-btn hm-btn-ghost" href="https://instagram.com/3dpstl" target="_blank" rel="noopener noreferrer">
            <FaInstagram size={18} /> @3dpstl
          </a>
        </div>
      </section>
    </div>
  );
}
