import Carousel from "react-bootstrap/Carousel";
import { Button } from "react-bootstrap";
import Editor from "./quill";
import "../Style/Carousel.css";
import { IoIosArrowForward, IoIosArrowBack  } from "react-icons/io";
import { useRef } from "react";

export default function CarouselComp({ items, withDetails = true, label = "" }) {
  const quillRef = useRef(null);
 
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <p className="text-center py-5 text-muted">
        No {label} items available.
      </p>
    );
  }

  return (
    <div className="custom-carousel-wrapper">
      <Carousel
        fade
        indicators={items.length > 1}
        interval={5000}
        pause="hover"
        prevIcon={
          <Button
          variant="light"
          className="position-absolute top-50 start-0 translate-middle-y shadow-sm rounded-circle d-none d-md-flex align-items-center justify-content-center"
          style={{ width: 40, height: 40, zIndex: 2 }}
        >
          <IoIosArrowBack />
  
        </Button>        }
        nextIcon={
          <Button
          variant="light"
          className="position-absolute top-50 end-0 translate-middle-y shadow-sm rounded-circle d-none d-md-flex align-items-center justify-content-center"
          style={{ width: 40, height: 40, zIndex: 2 }}
        >
          <IoIosArrowForward />
        </Button>
        }
      >
        {items.map((item, index) => {
          const {
            TemplateComponent,
            templateProps = {},
            title,
            description,
          } = item;

          return (
            <Carousel.Item key={index}>
              {TemplateComponent && (
                <TemplateComponent {...templateProps} />
              )}

              {withDetails && (title || description) && (
                <Carousel.Caption className="carousel-caption-custom">
                  {title && <h3 className="carousel-title">{title}</h3>}

                  {description && (
                    <Editor
                      initialValue={description}
                      readOnly
                      ref={quillRef}
                      previewMode
                      previewStyle={{
                        background: "transparent",
                        color: "inherit",
                        border: "none",
                        padding: 0,
                      }}
                    />
                  )}
                </Carousel.Caption>
              )}
            </Carousel.Item>
          );
        })}
      </Carousel>
    </div>
  );
}
