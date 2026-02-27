import React, { useState, useRef, useEffect } from 'react';
import { Form, Carousel, Image, Ratio, Button } from 'react-bootstrap';
import { IoIosArrowForward, IoIosArrowBack  } from "react-icons/io";

const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1 MB
 
export default function MultiImageInput({
  label = "",
  formData = [],
  onChange = () => {},
  maxImages = 5,
  readOnly = false,
  colWidth = 12,
  ratio = '1x1',
  seeMore = () => {}
}) {
  const fileInputRef = useRef(null);
  const [images, setImages] = useState(
    formData.galleryurls || formData.image || []
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [files, setFiles] = useState([]);
  const [pendingImages, setPendingImages] = useState(null);
  
  useEffect(() => {
    if (pendingImages) {
      onChange(pendingImages);
      setPendingImages(null);
    }
  }, [pendingImages, onChange]);
  
  useEffect(() => {
    const newImages = normalizeImages(formData.galleryurls || formData.image);
  
    if (JSON.stringify(newImages) !== JSON.stringify(images)) {
      setImages(newImages);
    }
  }, [formData.galleryurls, formData.image]);
  
  const normalizeImages = (value) =>
    Array.isArray(value) ? value : value ? [value] : [];
  
 
  const updateFileInput = (newFiles) => {
    const dt = new DataTransfer();
    newFiles.forEach((f) => dt.items.add(f));
    fileInputRef.current.files = dt.files;
  };
  const handleFilesChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const availableSlots = maxImages - images.length;
    if (availableSlots <= 0) {
      alert(`You have already reached the maximum of ${maxImages} images.`);
      e.target.value = '';
      return;
    }

    // 1. Slice files to fit the limit instead of just failing
    let filesToProcess = selectedFiles;
    if (selectedFiles.length > availableSlots) {
      alert(`Only the first ${availableSlots} images will be added (Limit: ${maxImages}).`);
      filesToProcess = selectedFiles.slice(0, availableSlots);
    }

    // 2. Size validation
    const oversized = filesToProcess.find((file) => file.size > MAX_IMAGE_SIZE);
    if (oversized) {
      alert('Each image must be 1 MB or less.');
      e.target.value = '';
      return;
    }

    // 3. Update files state correctly
    const updatedFiles = [...files, ...filesToProcess];
    setFiles(updatedFiles);
    updateFileInput(updatedFiles);

    // 4. Read Previews
    const readers = filesToProcess.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then((newImages) => {
      setImages(prev => [...prev, ...newImages]);
      setPendingImages(prev => [...(prev || images), ...newImages]);
    
      // Functional update to ensure we have the absolute latest state
      // setImages((prev) => {
      //   const updated = [...prev, ...newImages];
      //   onChange(updated);        
      //   return updated;
      // });
    });
  };

  const handleRemove = (index) => {
    const updatedImages = images.filter((_, i) => i !== index);
    const updatedFiles = files.filter((_, i) => i !== index);
    
    setFiles(updatedFiles);
    updateFileInput(updatedFiles);
    setImages(updatedImages);
    onChange(updatedImages);
    
    if (activeIndex >= updatedImages.length) {
      setActiveIndex(Math.max(updatedImages.length - 1, 0));
    }
  };

  return (
    <Form.Group md={colWidth}>
      <Form.Label>{label}</Form.Label>

      {!readOnly && (
        <Form.Control
          ref={fileInputRef}
          type="file"
          multiple={maxImages > 1}
          accept="image/*"
          onChange={handleFilesChange}
        />
      )}

      {images.length > 0 && (
        <Carousel
          fade
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          interval={null}
          className="custom-carousel w-100"
          data-bs-theme="dark"
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
          {images.map((src, i) => (
            <Carousel.Item key={i}>
              <Ratio aspectRatio={ratio}>
                <Image
                  src={src || '/thumbnail.png'}
                  alt={`Preview ${i + 1}`}
                  onClick={seeMore}
                  className='cursor'
                  style={{ objectFit: 'cover', borderRadius: '8px' }}
                />
              </Ratio>
              {!readOnly && ( <Button variant="danger" size="sm" className="position-absolute top-0 start-50 translate-middle-x mt-2" onClick={(e) => { e.stopPropagation(); handleRemove(i) }} > ✕ </Button> )}
            </Carousel.Item>
          ))}
        </Carousel>
      )}
    </Form.Group>
  );
}
