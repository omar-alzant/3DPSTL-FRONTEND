import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import Editor from "./quill";
import Card from "react-bootstrap/Card";
import Accordion from "react-bootstrap/Accordion";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/esm/Row";
import Col from "react-bootstrap/esm/Col";
import MultiImageInput from "./MultiImageInput";
import ConfirmationModal from "./ConfirmationModal";
import Form from "react-bootstrap/Form";
import { Badge, Image, ListGroup } from "react-bootstrap";

const PreviewAdminContent = ({ materials, editingId, startEditing, deleteMaterial, copyMaterial, canDelete, withVariants = false, flatView = false }) => {
  const [showModal, setShowModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const quillRef = useRef(null);

  // --- Modal Handlers (No change) ---
  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteMaterial(itemToDelete.id);
    }
    handleClose();
  };

  const handleShow = (item) => {
    setItemToDelete(item);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setItemToDelete(null);
  };

  // --- Filter Logic (Minimal change, focusing on top-level data) ---
  const filteredMaterials = Array.isArray(materials)
    ? materials.filter((m) => {
        const key = searchTerm.toLowerCase();
        return (
          m.name?.toLowerCase().includes(key) ||
          m.model_name?.toLowerCase().includes(key) ||
          m.description?.toLowerCase().includes(key)
        );
      })
    : [];
    //   console.log(filteredMaterials);
      
  if (!filteredMaterials.length) {
    return (
      <Container className="text-center mt-4">
        <Form.Control
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-3 w-50 mx-auto"
        />
        <p className="empty-list">No data found.</p>
      </Container>
    );
  }

  return (
    <>
    <Container className="p-4">
    {/* Search Bar with modern styling */}
    <Form className="mb-4">
        <Form.Control
            type="search" // Use 'search' type for better mobile usability
            placeholder="Search products by name, model, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="shadow-lg border-primary border-2 rounded-pill p-3" // Modern border and shadow
        />
    </Form>

    {/* Use a larger grid for better card display */}
    <Row xs={1} md={2} lg={2} className="g-4">
        {Array.isArray(filteredMaterials) && filteredMaterials.map((m) => (
            // Card wrapper for visual separation and shadow effect
            <Col key={m.id}>
                <Card 
                    className={` shadow-sm transition-shadow ${editingId === m.id ? "border-primary border-3 selectedCard" : "border-0"} ${
                        (m?.isDisabled) ? "opacity-75" : "shadow-hover" // Add a custom shadow-hover class for interaction
                    }`}
                    style={{transform: 'scale(1.01)'}}
                >
                {flatView ? 
                    <>
                        <Card.Header className="p-3 bg-light">
                        <div className="d-flex align-items-center w-100">
                            <h5 className={`mb-0 fw-bold text-truncate ${(m.isDisabled) ? 'text-muted' : 'text-dark'}`}>
                                {(m.isDisabled ) ? "🔒" : "✨"} {m.name || 'Untitled Product'}
                            </h5>
                            {m.isDisabled && <Badge pill bg="danger" className="ms-3">Disabled</Badge>}
                        </div>
                        </Card.Header>
                        <Card.Body className="p-4">
                        {m.brandsF &&
                                            <div className="mb-2">
                                                <h4> Brands:</h4>
                                                {m.brandsF?.map((b) => (
                                                    <span key={b.value} className="badge bg-warning c-black me-2">{b.label}</span>
                                                    ))}
                                            </div>
                                        }
                    {/* Tags */}
                    {(m.category_name || m.type_name || m.model_name) && 
                        <div className="d-flex flex-wrap gap-2 mb-3">
                            <Badge bg="primary">{m.category_name}</Badge>
                            <Badge bg="secondary">{m.type_name}</Badge>
                            <Badge bg="info">{m.model_name}</Badge>
                        </div>
                    }
                    {(m.linkedPath) && 
                        <div className="d-flex flex-wrap gap-2 mb-3">
                            <p>Linked Path: </p>
                            <p> {m.linkedPath} </p>
                        </div>
                    }
                    {/* Images */}
                    {((m?.galleryurls && m.galleryurls?.length !== 0)  ||(m.image && m.image?.length !== 0)) && (
                        <div className="mb-3 border rounded">
                            <MultiImageInput
                                label=""
                                controlId={m.id + "-img"}
                                formData={m}
                                readOnly={true}
                            />
                        </div>
                    )}
                    {(m.icon_url && m?.icon_url !== '')  && 
                        <Image   width="150px" height="150px" 
                               src={m.icon_url} 
                               alt={m.name}
                           />}
                    {(m.image && m?.image !== '')  && 
                        <Image   width="150px" height="150px" 
                               src={m.image} 
                               alt={m.name}
                           />}
                    {(m.banner_url && m?.banner_url !== '')  && 
                        <Image   width="150px" height="150px" 
                               src={m.banner_url} 
                               alt={m.name}
                           />}
                                            
                    {/* Description */}
                    {m.description !== "" && m.description && (
                        <div className="mb-4">
                            <h6 className="fw-bold text-muted">Description:</h6>
                            <Editor
                                ref={quillRef}
                                label={"Description"}
                                key={m.id + "-desc"}
                                initialValue={m.description}
                                readOnly={true}
                                previewMode={true}
                                maxWidth="100%"
                            />
                        </div>
                    )}
                        {m.short_description && m.short_description.trim() !== "" && (
                    <div className="mb-4">
                        <h6 className="fw-bold text-muted">Short Description:</h6>
                        <textarea
                        readOnly
                        className="fw-semibold text-primary form-control"
                        value={m.short_description}
                        />
                    </div>
                    )}

            
                    {/* Variants */}
                    {withVariants && (
                        <>
                            <hr />
            
                            <h6 className="fw-bold text-dark mb-3">
                                Variants ({m.variants?.length || 0})
                            </h6>
            
                            <ListGroup variant="flush">
                                {Array.isArray(m.variants) && m.variants.map((v, index) => (
                                    <ListGroup.Item
                                        key={v.id || index}
                                        className={`py-3 ${v.outofstock ? 'list-group-item-danger' : ''}`}
                                    >
                                        <Row className="align-items-center">
            
                                            {/* Left */}
                                            <Col md={6}>
                                                {<h6 className="fw-bold mb-1">
                                                    {v.size && 
                                                        <>
                                                            📏 {v.size?.toUpperCase()} 
                                                        </>
                                                    }
                                                    {v.gender && <small className="text-muted ms-2">({v.gender})</small>}
                                                    </h6>
                                                }
            
                                                <div className="d-flex align-items-baseline">
                                                    <span className={`fw-bold fs-5 ${v.onsale ? "text-danger" : "text-success"}`}>
                                                        {v.price} $
                                                    </span>
                                                    {v.oldprice > v.price && <del className="ms-2 text-muted">{v.oldprice} $</del>}
                                                    {v.outofstock && <Badge bg="danger" className="ms-2">OOS</Badge>}
                                                </div>
                                            </Col>
            
                                            {/* Right */}
                                            <Col md={6} className="text-md-end">
                                                <p className="small c-black text-muted mb-1">Stock: {v.stock ?? 'N/A'}</p>
            
                                                {v?.color !== ""  && 
                                                    <div className="d-flex justify-content-md-end flex-wrap gap-2">
                                                        <small className="text-muted">Color:</small>
                                                        <span
                                                            className="swatch"
                                                            style={{ backgroundColor: v.color }}
                                                        >

                                                        </span>

                                                        {/* <MultiColorPicker value={v.color} isReadOnly={true} /> */}
                                                    </div>
                                                }
                                            </Col>
                                        </Row>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </>
                    )}
            
                    <hr />
            
                    {/* Buttons */}
                    <div className="d-flex justify-content-end gap-2">
                        <Button variant="secondary" onClick={() => startEditing(m)}>Edit</Button>
                        {copyMaterial && (
                            <Button variant="outline-info" onClick={() => copyMaterial(m)}>Copy</Button>
                        )}
                        {canDelete && (
                            <Button variant="danger" onClick={() => handleShow(m)}>Remove</Button>
                        )}
                    </div>
            
                            </Card.Body>
                    </>
                :
                    <Accordion defaultActiveKey="0" className="w-100">
                        <Accordion.Item eventKey={m.id}>
                            {/* Card Header (Accordion Toggle) */}
                            <Accordion.Header className="p-3">
                                <div className="d-flex align-items-center w-100">
                                    <h5 className={`mb-0 fw-bold text-truncate ${(m.isDisabled) ? 'text-muted' : 'text-dark'}`}>
                                        {(m.isDisabled) ? "🔒" : "✨"} {m.name || 'Untitled Product'}
                                    </h5>
                                    {m.isDisabled && <Badge pill bg="danger" className="ms-3">Disabled</Badge>}
                                    {/* Optional: Add min/max price indicator here if available in the data */}
                                </div>
                            </Accordion.Header>

                            <Accordion.Body className="p-0">
                                <Card.Body className="p-4 ">
                                    
                                {Array.isArray(m.brandsF) && m.brandsF.length > 0 && (
                                    <div className="mb-2">
                                        <h4>Brands:</h4>
                                        {m.brandsF.map(b => (
                                        <span
                                            key={b.value}
                                            className="badge bg-warning c-black me-2"
                                        >
                                            {b.label}
                                        </span>
                                        ))}
                                    </div>
                                    )}

                                    {(m.category_name || m.type_name || m.model_name) && 
                                        <>
                                        <h4>Parents:</h4>
                                        <div className="d-flex flex-wrap gap-2 mb-3">
                                            <Badge bg="primary" className="fw-normal">{m.category_name || ""}</Badge>
                                            <Badge bg="secondary" className="fw-normal">{m.type_name || m.typename}</Badge>
                                            <Badge bg="info" className="fw-normal">{m.model_name}</Badge>
                                        </div>
                                        </>
                                    }
                                    
                                {(m.linkedPath) && 
                                                <div className="d-flex flex-wrap gap-2 p-2 mb-1 border rounded">
                                                    <h6>Linked Path: 
                                                    <hr />
                                                    </h6>
                                                    <small> {m.linkedPath} </small>
                                                </div>
                                            }
                                    {/* Image Gallery */}
                                    {((m?.galleryurls && m.galleryurls?.length !== 0)  ||(m.image && m.image?.length !== 0)) && (
                                        <div className="mb-3 border rounded">
                                            <MultiImageInput
                                                label={""}
                                                controlId={m.id + "-img"}
                                                formData={m}
                                                readOnly={true}
                                            />
                                        </div>
                                    )}

                                    {(m.icon_url && m?.icon_url !== '')  && 
                                           <Image   width="150px" height="150px" 
                                           src={m.icon_url} 
                                           alt={m.name}
                                       />}
                                    {/* {(m.image && m?.image !== '')  && 
                                           <Image   width="150px" height="150px" 
                                           src={m.image} 
                                           alt={m.name}
                                       />} */}
                                    {(m.banner_url && m?.banner_url !== '')  && 
                                           <Image   width="150px" height="150px" 
                                           src={m.banner_url} 
                                           alt={m.name}
                                       />}
                                    {/* Description */}
                                    {m.description && m.description.replace(" ", "") !== "" && (
                                        <div className="mb-4">
                                            <h6 className="fw-bold text-muted">Description:</h6>
                                            <Editor
                                                label={"Description"}
                                                key={m.id + "-desc"}
                                                initialValue={m.description}
                                                readOnly={true}
                                                previewMode={true}
                                                ref={quillRef}
                                                previewStyle={{
                                                    padding: "10px",
                                                    borderRadius: "5px",
                                                    maxWidth:'100%',
                                                    overflow: 'auto',
                                                    background: "var(--bs-gray-100)",
                                                    border: "1px solid var(--bs-gray-300)",
                                                }}
                                            />
                                        </div>
                                    )}
                                    {m.short_description && m.short_description.trim() !== "" && (
                                        <div className="mb-4">
                                            <h6 className="fw-bold text-muted">Short Description:</h6>
                                            <textarea
                                            readOnly
                                            className="fw-semibold text-primary form-control"
                                            value={m.short_description}
                                            />
                                        </div>
                                        )}

                            
                                    {
                                        withVariants && 
                                        <>
                                        
                                    <hr className="my-3"/>
                                    
                                    {/* 🔑 KEY CHANGE: Variant List Group */}
                                    <h6 className="fw-bold text-dark mb-3">Available Variants ({m.variants?.length || 0})</h6>
                                    <ListGroup variant="flush" className="rounded-3 border">
    {Array.isArray(m.variants) && m.variants.map((v, index) => {
        const isOutOfStock = v.outofstock || v.stock === 0;
        
        // Helper to check for array data (Assuming [min, max, unit])
        const hasAge = Array.isArray(v.age) && v.age[0] !== '' && v.age[1] !== '';
        const hasLen = Array.isArray(v.lengthcm) && v.lengthcm[0] !== '' && v.lengthcm[1] !== '';

        return (
            <ListGroup.Item 
                key={v.id || index} 
                className={`py-3 ${isOutOfStock ? 'bg-light opacity-75' : ''}`}
            >
                <Row className="gy-2 align-items-center">
                    {/* Left Side: Identity & Price */}
                    <Col xs={12} md={7}>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <h6 className="fw-bold mb-0">
                                {v.size === 'simple' ? 'Standard Unit' : v.size?.toUpperCase()}
                            </h6>
                            {v.gender && <Badge bg="secondary" className="text-uppercase" style={{fontSize: '10px'}}>{v.gender}</Badge>}
                            {v.color && v.color !== 'simple' && (
                                <span 
                                    className="rounded-circle border shadow-sm" 
                                    style={{ width: '16px', height: '16px', backgroundColor: v.color, display: 'inline-block' }} 
                                />
                            )}
                        </div>

                        {/* Meta Info Line (Age, Length, Barcode) */}
                        <div className="text-muted small d-flex flex-wrap gap-2 align-items-center">
                            {hasAge && <span>👶 {v.age[0]}-{v.age[1]} {v.age[2] || 'Yrs'}</span>}
                            {hasAge && hasLen && <span className="text-silver">|</span>}
                            {hasLen && <span>📏 {v.lengthcm[0]}-{v.lengthcm[1]} {v.lengthcm[2] || 'cm'}</span>}
                            {v.barcode && (
                                <>
                                    {/* <span className="text-silver">•</span> */}
                                    <span className="font-monospace bg-light px-1">{v.barcode}</span>
                                </>
                            )}
                        </div>
                    </Col>

                    {/* Right Side: Stock & Price */}
                    <Col xs={12} md={5} className="text-md-end">
                        <div className="d-flex flex-md-column align-items-center align-items-md-end justify-content-between">
                            {/* Price Section */}
                            <div className="mb-md-1">
                                {v.price !== null && (
                                    <div className="d-flex align-items-center gap-2">
                                        {v.oldprice > v.price && (
                                            <del className="text-muted small">${v.oldprice}</del>
                                        )}
                                        <span className={`fw-bold fs-5 ${v.onsale ? 'text-danger' : 'text-dark'}`}>
                                            ${v.price}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Status Badges */}
                            <div className="d-flex gap-1 align-items-center">
                         
                                {v.onsale && <Badge bg="warning" text="dark">SALE</Badge>}
                                {isOutOfStock && <Badge bg="danger">OOS</Badge>}
                            </div>
                        </div>
                    </Col>
                </Row>
            </ListGroup.Item>
        );
    })}
</ListGroup>
                                    </>
                                    }
                                    <hr className="my-3"/>
                                        
                                    {/* Action Buttons */}
                                    <div className="d-flex justify-content-end gap-2">
                                        <Button
                                            variant="secondary"
                                            onClick={() => startEditing(m)}
                                        >
                                                Edit
                                        </Button>
                                        {copyMaterial && (
                                            <Button
                                                variant="outline-info"
                                                onClick={() => copyMaterial(m)}
                                            >
                                                    Copy
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button
                                                variant="danger"
                                                onClick={() => handleShow(m)}
                                            >
                                                    Remove
                                            </Button>
                                        )}
                                    </div>
                                </Card.Body>
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                }

            </Card>
            </Col>
        ))}
    </Row>
</Container>

<ConfirmationModal
    show={showModal}
    onHide={handleClose}
    title="Confirm Deletion"
    titleClassName="text-danger"
    message={
        <>
            Are you sure you want to permanently remove{" "}
            <strong>{itemToDelete?.name || "this item"}</strong>?<br />
            This action cannot be undone. This will delete all variants.
        </>
    }
    primaryButton={{
        text: "Yes, Delete it",
        variant: "danger",
        onClick: handleConfirmDelete,
    }}
    secondaryButton={{
        text: "Cancel",
        variant: "secondary",
        onClick: handleClose,
    }}
/> 
    </>
  );
};

PreviewAdminContent.propTypes = {
  materials: PropTypes.array.isRequired,
  editingId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  startEditing: PropTypes.func.isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  copyMaterial: PropTypes.func,
};

export default PreviewAdminContent;