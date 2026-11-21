import { useRef, useMemo } from "react";
import { Button, Card, Container, Stack } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { IoIosArrowForward, IoIosArrowBack  } from "react-icons/io";
import { SHOW_SHOP_DETAILS } from '../config/site';
import { useLang } from '../i18n/LanguageContext';

export default function RelatedItemsSlider({ items = [], onSeeMore = () => {} }) {
  const { tx } = useLang();
  const sliderRef = useRef(null);
  const navigate = useNavigate();

  // Filter invalid / disabled / empty items
  const validItems = useMemo(() => {
    // console.log("validItems", items)
    if (!Array.isArray(items)) return [];
    
    return items.filter(item => {
      if (!item?.id) return false;
      return true
      // Variant-based item → must have variants
    });

  }, [items]);
  
  const scroll = (direction) => {
    if (!sliderRef.current) return;

    const cardWidth = 260; // card width + gap
    sliderRef.current.scrollBy({
      left: direction === "left" ? -cardWidth : cardWidth,
      behavior: "smooth",
    });
  };

  if (validItems.length === 0) return null;

  return (
    <Container fluid className="mt-5 position-relative">
      <Stack direction="horizontal" className="d-flex justify-content-between mb-3">
        <h5 className="fw-bold mb-0">{tx('Related Items', 'قطع مشابهة')}</h5>
        <Button
          variant="outline-warning"
          onClick={onSeeMore}
        >
          {tx('See more', 'شوف أكتر')}
        </Button>
      </Stack>

      {/* Left Button (physical left in Arabic too, so the arrows always point outwards) */}
      <Button
        variant="light"
        className="position-absolute top-50 translate-middle-y shadow-sm rounded-circle d-none d-md-flex align-items-center justify-content-center"
        style={{ width: 40, height: 40, zIndex: 2, left: 0 }}
        onClick={() => scroll("left")}
        aria-label={tx('Scroll left', 'لليسار')}
      >
        <IoIosArrowBack />

      </Button>

      {/* Slider */}
      <div
        ref={sliderRef}
        className="d-flex gap-3 px-2 overflow-auto"
        style={{
          scrollBehavior: "smooth",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>
          {`
            .overflow-auto::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>

        {validItems.map(item => (
        <Card
        key={item.id}
        className="border-0 shadow-sm rounded-4 flex-shrink-0 modern-card"
        style={{ width: 240 }}
        onClick={() => navigate(`/item/${item.id}`)}
      >
        <div className="image-wrapper">
          <Card.Img
            src={item.galleryurls?.[0] || item.galleryUrls?.[0] || "/thumbnail.png"}
            alt={item.name}
            className="card-image cursor"
          />
        </div>
      
        <Card.Body className="p-3">
          <Card.Title className="fs-6 fw-semibold mb-1 text-truncate">
            {item.name}
          </Card.Title>
      
          {item.short_description?.trim() && (
            <p className="small text-muted mb-2 line-clamp-2">
              {item.short_description}
            </p>
          )}
      
          {SHOW_SHOP_DETAILS && item.min_price && (
            <div className="fw-bold text-primary fs-6">
              ${item.min_price}
            </div>
          )}
        </Card.Body>
      </Card>
      
        ))}
      </div>

      {/* Right Button */}
      <Button
        variant="light"
        className="position-absolute top-50 translate-middle-y shadow-sm rounded-circle d-none d-md-flex align-items-center justify-content-center"
        style={{ width: 40, height: 40, zIndex: 2, right: 0 }}
        onClick={() => scroll("right")}
        aria-label={tx('Scroll right', 'لليمين')}
      >
        <IoIosArrowForward />
      </Button>
    </Container>
  );
}
