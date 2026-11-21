import React, { useState, useEffect, useRef } from "react";
import { Form, Button, InputGroup, Container, Spinner, Modal } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IoSearch, IoCameraOutline, IoImageOutline } from "react-icons/io5";
import { CiCircleRemove } from "react-icons/ci";
import { useLang } from '../i18n/LanguageContext';

// shrink the customer's photo before sending it (the AI only looks at 224×224 anyway)
async function shrinkPhoto(file, max = 448) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('bad image'));
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function GlobalSearch({ onClose }) {
  const { tx } = useLang();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const openPhoto = () => { setPhotoError(""); setPhotoPreview(null); setPhotoOpen(true); };
  const closePhoto = () => { if (!photoBusy) setPhotoOpen(false); };

  // photo search: upload / drop / paste a picture → the most similar works
  const searchFile = async (file) => {
    if (!file || photoBusy) return;
    if (!/^image\//.test(file.type)) {
      setPhotoError(tx("That isn't a photo. Use a JPG, PNG or WebP picture.", "هيدا مش صورة. استعمل صورة JPG أو PNG أو WebP."));
      return;
    }
    setPhotoError("");
    setPhotoBusy(true);
    try {
      setPhotoPreview(await shrinkPhoto(file, 360));
      const image = await shrinkPhoto(file);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/search/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 429 ? "busy" : "failed");
      try { sessionStorage.setItem("photoSearch", await shrinkPhoto(file, 160)); } catch {}
      const ids = (data.results || []).map((r) => r.id);
      setPhotoOpen(false);
      navigate(`/our-works?similar=${ids.length ? ids.join(",") : "none"}`);
      onClose?.();
    } catch (err) {
      setPhotoError(err.message === "busy"
        ? tx("Too many photo searches — try again in a few minutes.", "عملت بحث بالصور كتير — جرّب بعد كم دقيقة.")
        : tx("Couldn't search with this photo. Try another one.", "ما قدرنا ندوّر بهالصورة. جرّب صورة تانية."));
    } finally {
      setPhotoBusy(false);
    }
  };
  const onPick = (e) => { const f = e.target.files?.[0]; e.target.value = ""; searchFile(f); };

  // Ctrl+V while the photo window is open
  useEffect(() => {
    if (!photoOpen) return undefined;
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
      if (item) { e.preventDefault(); searchFile(item.getAsFile()); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoOpen, photoBusy]);

  // Keep input synced with URL
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const params = new URLSearchParams(searchParams);

    if (query.trim()) {
      params.set("q", query.trim());
      params.set("page", "1");
    } else {
      params.delete("q");
    }

    navigate(`/our-works?${params.toString()}`);
    onClose?.();
  };

  const resetSearch = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("q");
    params.set("page", "1");

    navigate(`/our-works?${params.toString()}`);
    setQuery("");
  };

  return (
    <Container className="my-4" fluid="sm">
      <Form onSubmit={handleSubmit}>
        <InputGroup
          style={{
            background: "var(--brand-card)",
            border: "1px solid var(--brand-border)",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 0 20px rgba(106, 77, 255,0.05)"
          }}
        >
          <Form.Control
            placeholder={tx('Search our works…', 'دوّر بشغلنا…')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--brand-text)",
              padding: "12px 16px"
            }}
          />
  
          <Button
            type="submit"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--brand-primary)",
              padding: "0 16px"
            }}
          >
            <IoSearch className="fs-5" />
          </Button>
  
          <Button
            type="button"
            onClick={openPhoto}
            disabled={photoBusy}
            aria-label={tx('Search with a photo', 'دوّر بصورة')}
            title={tx('Search with a photo', 'دوّر بصورة')}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--brand-primary)",
              padding: "0 12px"
            }}
          >
            {photoBusy ? <Spinner size="sm" /> : <IoCameraOutline className="fs-5" />}
          </Button>

          {query && (
            <Button
              onClick={resetSearch}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--brand-light)",
                padding: "0 16px"
              }}
            >
              <CiCircleRemove className="fs-5" />
            </Button>
          )}
        </InputGroup>
      </Form>

      <Modal show={photoOpen} onHide={closePhoto} centered size="lg" contentClassName="photo-search-modal">
        <Modal.Header closeButton={!photoBusy}>
          <Modal.Title as="h5">{tx('Search with a photo', 'دوّر بصورة')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div
            className={`photo-drop ${dragOver ? 'is-over' : ''} ${photoBusy ? 'is-busy' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => !photoBusy && fileRef.current?.click()}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !photoBusy) { e.preventDefault(); fileRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); searchFile(e.dataTransfer.files?.[0]); }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" className="photo-drop-preview" />
            ) : (
              <IoImageOutline className="photo-drop-icon" aria-hidden="true" />
            )}
            {photoBusy ? (
              <div className="photo-drop-text">
                <Spinner size="sm" className="me-2" />
                {tx('Looking for works like your photo… the first search can take up to half a minute.', 'عم ندوّر على شغل متل صورتك… أول بحث ممكن ياخد لنص دقيقة.')}
              </div>
            ) : (
              <div className="photo-drop-text">
                {tx('Drag a photo here, paste it with Ctrl+V, or', 'اسحب صورة لهون، الصقها بـ Ctrl+V، أو')}{' '}
                <span className="photo-drop-link">{tx('upload a photo', 'ارفع صورة')}</span>
              </div>
            )}
          </div>
          <div className="d-flex d-md-none justify-content-center mt-3">
            <Button variant="outline-primary" disabled={photoBusy} onClick={() => cameraRef.current?.click()}>
              <IoCameraOutline className="me-2" />{tx('Take a photo', 'صوّر هلق')}
            </Button>
          </div>
          {photoError && <p className="text-danger small mt-3 mb-0">{photoError}</p>}
          <p className="small text-muted mt-3 mb-0">
            {tx('Tip: a clear photo of one piece on a plain background gives the best matches.', 'نصيحة: صورة واضحة لقطعة وحدة على خلفية سادة بتعطي أحسن نتايج.')}
          </p>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
        </Modal.Body>
      </Modal>
    </Container>
  );
}
