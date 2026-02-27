import { Ratio, Image } from "react-bootstrap";

export default function ImageSlide({
  src = "",
  altText = "",
  theme = "light",
  ratio = "16x9",
  enableOnClick = false,
  seeMore = () => {}
}) {
  return (
    <div
      className={`image-slide image-slide-${theme}`}
      style={{ width: "100%", maxHeight: 450 }}
    >
      <Ratio aspectRatio={ratio}>
        <Image
          src={src}
          alt={altText}
          fluid
          loading="lazy"
          onClick={enableOnClick ? seeMore : undefined}
          className={enableOnClick ? "cursor" : ""}
          style={{
            objectFit: "cover",
            width: "100%",
            height: "100%",
          }}
        />
      </Ratio>
    </div>
  );
}
