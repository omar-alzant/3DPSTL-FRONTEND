// Home — what 3DSTL is and everything the site offers, in one page:
// hero → ways to order → what the Studio makes → our works → how an order goes → print it yourself → contact
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MdWhatsapp } from "react-icons/md";
import { FaInstagram } from "react-icons/fa";
import ImageSlide from "../components/ImageSlide";
import CarouselComp from "../components/CarouselComp";
import CartItem from "../components/CartItem";
import RelatedItemsSlider from "../components/RelatedItemsSlider";
import MultiImageInput from "../components/MultiImageInput";
import { PageLoader } from "../components/BrandSpinner";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastProvider";
import { CART_ENABLED, WORKS_PATH, whatsappLink } from "../config/site";
import { getConfig } from "../studio/lib/api";
import { isToolEnabled } from "../studio/lib/pricing";
import "../Style/Home.css";

const base = process.env.REACT_APP_API_URL;

const saveLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const loadLS = (key, fallback = []) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const arr = (d) => (Array.isArray(d) ? d : []);

// Studio tools shown on the home page (ids from src/Sources/studio/tools/*). Order = what people ask for most.
const STUDIO_TOOLS = [
  { id: "name-keychain", name: "Name keychain", text: "Any name, your font, two colours." },
  { id: "phone-case", name: "Phone case", text: "Fitted to your model, with a name, photo or pattern." },
  { id: "birth-sign", name: "Baby birth sign", text: "Name, date, time, weight and length." },
  { id: "initial-sign", name: "Initial & name sign", text: "A big first letter with the name across it." },
  { id: "dual-name", name: "Two names, one piece", text: "Reads one name from the front, another from the side." },
  { id: "lebanese-plate", name: "Lebanese car plate", text: "Cedar, letter and number — or your company logo." },
  { id: "pencil-topper", name: "Pencil topper", text: "A student's name that slides onto the pencil." },
  { id: "keycaps", name: "Name keycaps", text: "Mechanical keyboard keys, one letter each." },
  { id: "flexi-toy", name: "Flexi toy from a photo", text: "Upload a drawing, get a toy that bends." },
  { id: "tpu-tote", name: "Flexible tote bag", text: "Printed in one piece in soft TPU." },
  { id: "plate-keychain", name: "Saudi plate keychain", text: "Your plate numbers as a mini keychain." },
];

const STEPS = [
  { title: "Choose or design", text: "Make it in the Studio, or pick a piece from our works." },
  { title: "We confirm with you", text: "On WhatsApp: final price, colours and when it's ready. Nothing is printed before you agree." },
  { title: "We print it", text: "Hard PLA for gifts and parts, flexible TPU for cases and bags." },
  { title: "You receive it", text: "We deliver it to the address in your order." },
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
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { updateQuantity, removeFromCart, addTocart, updateVariant } = useCart();

  const [carouselItems, setCarouselItems] = useState(() => loadLS("carousel"));
  const [brands, setBrands] = useState(() => loadLS("markets"));
  const [saleItems, setSaleItems] = useState(() => loadLS("items"));
  const [homeTypes, setHomeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);

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
      getJSON(`${base}/api/admin/products/market`).catch(() => ({})),
      CART_ENABLED ? getJSON(`${base}/api/admin/products/item/onsale`).catch(() => []) : Promise.resolve([]),
    ])
      .then(([types, carouselRaw, marketsRaw, itemsRaw]) => {
        setHomeTypes(arr(types));

        const carousel = arr(carouselRaw)
          .filter((c) => !c.isDisabled)
          .map((item) => ({
            TemplateComponent: ImageSlide,
            templateProps: {
              src: item.image || "/thumbnail.png",
              altText: item.name,
              enableOnClick: true,
              seeMore: () => navigate(`${item.linkedPath}`),
            },
            title: item.name,
            description: item.description || "",
          }));
        setCarouselItems(carousel);
        saveLS("carousel", carousel);

        const markets = arr(marketsRaw?.items)
          .filter((m) => !m.isdisabled)
          .map((m) => ({
            TemplateComponent: ImageSlide,
            templateProps: {
              src: m.image?.[0] || "/thumbnail.png",
              altText: m.name,
              enableOnClick: true,
              seeMore: () => navigate(`${WORKS_PATH}?brand_id=${m.id}`),
            },
            title: m.name,
            description: m.description || "",
          }));
        setBrands(markets);
        saveLS("markets", markets);

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
      <section className={`hm-hero ${hasCarousel ? "has-media" : ""}`}>
        <div className="hm-hero-copy">
          <PrintedHeadline>Your idea, printed layer by layer.</PrintedHeadline>
          <p className="hm-lead">
            3DSTL is a 3D printing studio in Tripoli, Lebanon. Design a gift in our online Studio, take a piece from
            our work and make it yours, or send us your own idea.
          </p>
          <div className="hm-actions">
            <Link to="/studio" className="hm-btn hm-btn-primary">Design in the Studio</Link>
            <Link to={WORKS_PATH} className="hm-btn hm-btn-ghost">Browse our works</Link>
          </div>
          <ul className="hm-facts">
            <li>Names in Arabic and English</li>
            <li>See your design in 3D before you order</li>
            <li>Price confirmed before printing</li>
          </ul>
        </div>
        {hasCarousel && (
          <div className="hm-hero-media">
            <CarouselComp items={carouselItems} label="Carousel" />
          </div>
        )}
      </section>

      {/* ───────── ways to order ───────── */}
      <section className="hm-section">
        <h2 className="hm-h2">Three ways to get something printed</h2>
        <div className="hm-ways">
          <article className="hm-way hm-way-main">
            <h3>Design it yourself</h3>
            <p>Type a name, choose fonts and colours, and turn the 3D model around as you go. Order the print, or download the file.</p>
            <Link to="/studio">Open the Studio</Link>
          </article>
          <article className="hm-way">
            <h3>Order one like ours</h3>
            <p>Found a piece you like? Ask for the same with your name, size or colours changed.</p>
            <Link to={WORKS_PATH}>Browse our works</Link>
          </article>
          <article className="hm-way">
            <h3>Bring your own idea</h3>
            <p>Send a photo, a sketch or an STL file. We'll tell you if it can be printed and what it costs.</p>
            <a href={whatsappLink("Hi 3DSTL! I have an idea I'd like to print:")} target="_blank" rel="noopener noreferrer">
              Message us on WhatsApp
            </a>
          </article>
        </div>
      </section>

      {/* ───────── studio ───────── */}
      <section className="hm-section hm-studio">
        <div className="hm-section-head">
          <div>
            <h2 className="hm-h2">What you can make in the Studio</h2>
            <p className="hm-sub">Each one is a template you fill in — the model updates while you type.</p>
          </div>
          <Link to="/studio" className="hm-btn hm-btn-ghost hm-btn-sm">All templates</Link>
        </div>
        <ul className="hm-tools">
          {tools.map((t) => (
            <li key={t.id}>
              <Link to={`/studio/${t.id}`} className="hm-tool">
                <span className="hm-tool-name">{t.name}</span>
                <span className="hm-tool-text">{t.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── our works ───────── */}
      <section className="hm-section">
        <div className="hm-section-head">
          <div>
            <h2 className="hm-h2">Our works</h2>
            <p className="hm-sub">Pieces we've printed. Open one to order something like it.</p>
          </div>
          <Link to={WORKS_PATH} className="hm-btn hm-btn-ghost hm-btn-sm">See all</Link>
        </div>
        {loading && !homeTypes.length ? (
          <PageLoader text="" size={44} />
        ) : homeTypes.length === 0 ? (
          <p className="hm-sub">New pieces are on the way. Meanwhile, <Link to="/studio">design your own</Link>.</p>
        ) : (
          homeTypes.map((type) => (
            <div key={type.id} className="hm-type">
              <div className="hm-type-head">
                <h3>{type.name}</h3>
                <Link to={`${WORKS_PATH}?type_id=${type.id}`}>See {type.name}</Link>
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
          ))
        )}
      </section>

      {/* ───────── on sale (only while the shop/cart is on) ───────── */}
      {CART_ENABLED && saleItems.length > 0 && (
        <section className="hm-section">
          <div className="hm-section-head">
            <h2 className="hm-h2">On sale</h2>
            <Link to={`${WORKS_PATH}?onsale=true`} className="hm-btn hm-btn-ghost hm-btn-sm">See more</Link>
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
        <h2 className="hm-h2">How an order goes</h2>
        <ol className="hm-steps">
          {STEPS.map((s) => (
            <li key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────── print it yourself + colours ───────── */}
      <section className="hm-section hm-split">
        <div className="hm-panel">
          <h2 className="hm-h3">Have your own printer?</h2>
          <p>
            Download any Studio design as a print-ready file using credits. Top up with Whish Money or Neo, and a
            design you paid for stays free to download again.
          </p>
          <Link to="/credits" className="hm-link">Credits and my files</Link>
        </div>
        <div className="hm-panel">
          <h2 className="hm-h3">Pick your colours</h2>
          <p>See every filament colour we have in stock right now, in PLA and flexible TPU.</p>
          <Link to="/filamentColors" className="hm-link">See the colours</Link>
        </div>
      </section>

      {/* ───────── brands ───────── */}
      {brands.length > 0 && (
        <section className="hm-section">
          <h2 className="hm-h2">Brands</h2>
          <CarouselComp withDetails={false} items={brands} label="Brands" />
        </section>
      )}

      {/* ───────── contact ───────── */}
      <section className="hm-contact">
        <div>
          <h2 className="hm-h2">Have something in mind?</h2>
          <p className="hm-sub">Send us a photo, a sketch or just the idea on WhatsApp or Instagram.</p>
        </div>
        <div className="hm-actions">
          <a className="hm-btn hm-btn-wa" href={whatsappLink("Hi 3DSTL!")} target="_blank" rel="noopener noreferrer">
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
