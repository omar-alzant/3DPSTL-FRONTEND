import { Image } from "react-bootstrap";

export default function MultiImageSlide({
  images = [],
  altText = "",
  ratio = "3x1",
}) {
  if (!Array.isArray(images) || images.length === 0) {
    return (
      <Image
        src="/thumbnail.png"
        alt={altText}
        fluid
        style={{ aspectRatio: "3 / 1", objectFit: "cover" }}
      />
    );
  }

  return (
    <div className="d-flex overflow-auto gap-3 pb-2">
      {images.map((src, i) => (
        <div
          key={i}
          className="flex-shrink-0 w-100"
          style={{ scrollSnapAlign: "start" }}
        >
          <Image
            src={src}
            alt={`${altText} ${i + 1}`}
            fluid
            rounded
            style={{
              aspectRatio: "3 / 1",
              objectFit: "cover",
            }}
          />
        </div>
      ))}
    </div>
  );
}
