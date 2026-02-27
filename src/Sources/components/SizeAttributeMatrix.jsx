import React, { useEffect, useState } from 'react';
import { Button, Form, Row, Col, Accordion } from 'react-bootstrap';
import RangeInput from './RangeInput';
import MultiColorPicker from './MultiColorPicker';
import ConfirmationModal from './ConfirmationModal';
import RangeInputAge from './RangeInputAge';
import RangeInputLength from './RangeInputLength';

// Utility function to generate a unique ID for a new variant
const generateUniqueId = () => Math.random().toString(36).substring(2, 9);

export default function SizeAttributeMatrix({ value, onChange, options, isSimple = false }) {
    const { allSizes, genderOptions } = options;
    const [showModal, setShowModal] = useState(false);
    const [variantToDelete, setVariantToDelete] = useState(null);



    const simpleVariant = {
        size: null,
        color: [],
        gender:  '',
        barcode:  '',
        age: ['', '', ''],
        stock: 0,
        price: 0,
        lengthcm: ['', '', ''],
        oldprice: 0,
        outofstock: false,
        onSale: false,
        tempId: generateUniqueId(),
    };

    const variants = value || [];
    useEffect(() => {
        if (isSimple && variants.length === 0) {
        onChange([simpleVariant]);
        }
    }, [isSimple]);
    
    
    // Filter out sizes already used in variants to prevent duplicates
    const availableSizes = allSizes.filter(
        size => !variants.some(variant => variant.size === size.value)
    );
    

    const handleShow = (index) => {
        setVariantToDelete(index);
        setShowModal(true);
    };

    const handleConfirmDelete = () => {
        if (variantToDelete !== null) {
            const newVariants = variants.filter((_, i) => i !== variantToDelete);
            onChange(newVariants);
        }
        setShowModal(false);
        setVariantToDelete(null);
    };

    const handleClose = () => {
        setShowModal(false);
        setVariantToDelete(null);
    };

    // Adds a new blank variant
    const addVariant = () => {
        if (availableSizes.length === 0) return;

        const newVariant = {
            size: availableSizes[0].value,
            color: [],
            barcode: '',
            gender: genderOptions[0]?.value || '',
            age: ['', '', ''],
            stock: 0,
            price: 0,
            lengthcm: ['', '', ''],
            oldprice: 0,
            outofstock: false,
            onSale: false,
            tempId: generateUniqueId(),
        };
        onChange([...variants, newVariant]);
    };

    // Update a field in a variant
    const updateVariantField = (index, fieldName, fieldValue) => {
        const newVariants = [...variants];
        newVariants[index] = { ...newVariants[index], [fieldName]: fieldValue };
       console.log(newVariants);
       
        onChange(newVariants);
    };

    return (
        <div className="mb-3">
            {/* <Form.Label className="mt-3">Size-Specific Attributes</Form.Label> */}

            <Accordion alwaysOpen>
                {Array.isArray(variants) && variants.map((variant, index) => (
                    <Accordion.Item
                        eventKey={String(index)}
                        key={variant.tempId || index}
                        className="mb-3 shadow-sm rounded"
                    >
                        <Accordion.Header>
                            <div className="d-flex justify-content-between w-100">
                                {!isSimple ? 
                                    <div>
                                        <span className="fw-bold me-2">Variant #{index + 1}:</span>
                                        {variant.size?.toUpperCase() || 'Select Size'}
                                        {variant.gender && ` (${variant.gender})`}
                                    </div>
                                    :
                                    <span className="fw-bold me-2">
                                        Simple Item
                                    </span>
                                }
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleShow(index)}
                                    hidden={isSimple}
                                >
                                    Remove Variant
                                </Button>
                            </div>
                        </Accordion.Header>

                        <Accordion.Body className="bg-white p-4">

                            {/* Row 1: Size + Gender */}
                            <Row className="mb-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Size</Form.Label>
                                        <Form.Select
                                            value={variant.size || ''}
                                            onChange={(e) => updateVariantField(index, 'size', e.target.value)}
                                        >
                                            <option value="" disabled>Select Size...</option>
                                            {allSizes.map(s => (
                                                    <option key={s.value} value={s.value}>
                                                        {s.label.toUpperCase()}
                                                    </option>
                                                ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>

                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Gender</Form.Label>
                                        <Form.Select
                                            value={variant.gender || ''}
                                            onChange={(e) => updateVariantField(index, 'gender', e.target.value)}
                                        >
                                            <option value="" disabled>Select...</option>
                                            {genderOptions.map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Barcode</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="EAN / UPC / SKU"
                                        value={variant.barcode || ''}
                                        onChange={(e) => updateVariantField(index, 'barcode', e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            </Row>

                            {/* Color */}
                            <Row className="mb-3">
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold">Color</Form.Label>

                                        <div className="d-flex align-items-center gap-2">
                                            <Form.Control
                                            type="color"
                                            value={variant.color || ""}
                                            onChange={(e) =>
                                                updateVariantField(index, "color", e.target.value)
                                            }
                                            style={{ width: "60px", height: "38px", padding: "2px" }}
                                            />

                                            <Form.Control
                                            type="text"
                                            value={variant.color || ""}
                                            placeholder="Select Color"
                                            onChange={(e) =>
                                                updateVariantField(index, "color", e.target.value)
                                            }
                                            maxLength={7}
                                            />
                                        </div>
                                        </Form.Group>
                                </Col>
                            </Row>
                            {/* Price + Old Price */}
                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Price ($)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={variant.price || ''}
                                            onChange={(e) =>
                                                updateVariantField(index, 'price', e.target.value === '' ? null : parseFloat(e.target.value))
                                            }
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Old Price ($)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={variant.oldprice || ''}
                                            onChange={(e) =>
                                                updateVariantField(index, 'oldprice', e.target.value === '' ? null : parseFloat(e.target.value))
                                            }
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Stock + Checkboxes */}
                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Stock (pcs)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={variant.stock || ''}
                                            onChange={(e) =>
                                                updateVariantField(index, 'stock', e.target.value === '' ? null : parseInt(e.target.value, 10))
                                            }
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={6} className="d-flex align-items-center">
                                    <Form.Check
                                        type="checkbox"
                                        label="Out of Stock"
                                        checked={variant.outofstock || false}
                                        onChange={(e) =>
                                            updateVariantField(index, 'outofstock', e.target.checked)
                                        }
                                        className="me-3"
                                    />

                                    <Form.Check
                                        type="checkbox"
                                        label="On Sale"
                                        checked={variant.onSale || false}
                                        onChange={(e) =>
                                            updateVariantField(index, 'onSale', e.target.checked)
                                        }
                                    />
                                </Col>
                            </Row>

                            {/* Age + Length */}
                            <Row>
                                <Col md={6}>
                                    <Form.Label>Age Range</Form.Label>
                                    <RangeInputAge
                                        value={variant.age}
                                        onChange={(val) => updateVariantField(index, 'age', val)}
                                    />
                                </Col>

                                <Col md={6}>
                                    <Form.Label>Length</Form.Label>
                                    <RangeInputLength
                                        value={variant.lengthcm}
                                        onChange={(val) => updateVariantField(index, 'lengthcm', val)}
                                    />
                                </Col>
                            </Row>

                        </Accordion.Body>
                    </Accordion.Item>
                ))}
            </Accordion>

            <Button
                onClick={addVariant}
                disabled={availableSizes.length === 0}
                hidden={isSimple}
                className="mt-3"
            >
                {availableSizes.length > 0 ? "Add New Size Variant" : "All sizes added"}
            </Button>

            {/* ------------- GLOBAL MODAL ------------- */}
            <ConfirmationModal
                show={showModal}
                onHide={handleClose}
                title="Confirm Deletion"
                titleClassName="text-danger"
                message={<>Are you sure you want to remove this variant?</>}
                primaryButton={{
                    text: "Yes, remove it",
                    variant: "danger",
                    onClick: handleConfirmDelete,
                }}
                secondaryButton={{
                    text: "Cancel",
                    variant: "secondary",
                    onClick: handleClose,
                }}
            />
        </div>
    );
}
