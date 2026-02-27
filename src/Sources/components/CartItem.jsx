import React, { useMemo, useState } from "react";
import { Card, Row, Col, Button, Accordion, Image, Badge } from "react-bootstrap";
import { MdDeleteForever } from "react-icons/md";
import ConfirmationModal from "./ConfirmationModal";
import { useAccordionButton } from 'react-bootstrap/AccordionButton';
import "../Style/CartItem.css";

function CustomToggle({ children, eventKey }) {
  const decoratedOnClick = useAccordionButton(eventKey);

  return (
    <div
      role="button"
      className="d-flex align-items-center w-100"
      onClick={decoratedOnClick}
    >
      {children}
    </div>
  );
}

const CartItem = ({
  item,
  increment,
  decrement,
  removeFromCart,
  onClickAction,
  showDetails = true,
}) => {
  const [removeTarget, setRemoveTarget] = useState(null);
  
  const allOutOfStock = useMemo(() => {
    if (!Array.isArray(item?.variants)) return true;
  
    return item.variants.every(v =>
      v.outofstock === true || Number(v.stock) <= 0
    );
  }, [item]);
  
  const itemContent = (
    <div className="d-flex align-items-center">
      <div className="d-flex flex-column gap-1 justify-content-center align-items-center">
        {allOutOfStock && <Badge bg="danger" className="ms-2">OOS</Badge>}
        <Image src={item.image || "/thumbnail.png"} width={50} height={50} rounded />
      </div>
      <h6 className="mb-0 ms-2 text-dark">{item.name}</h6>
    </div>
  );
  
  const itemTotal = useMemo(() => {
    if (!item || !Array.isArray(item.variants)) return 0;

    return item.variants.reduce(
      (sum, v) => sum + Number(v.price) * Number(v.quantity || 0),
      0
    );
  }, [item]);

  /* ✅ Early return AFTER hooks */
  if (!item || !Array.isArray(item.variants) || item.variants.length === 0) {
    return null;
  }

  const mainVariant = item.variants[0];

  return (
    <>
      <Card className={"cart-item-card mb-2"}>
        <Card.Body className={`"p-2" ${allOutOfStock ? "bg-red-light" : ""}`}>
          <Accordion
            className={`cart-item-accordion ${
              !showDetails ? "hide-accordion-toggle" : ""
            }`}
          >
      <div className="d-flex align-items-center w-100 p-2"> 
              <Row className="align-items-center w-100 g-2 m-0">
                
                {/* Clickable Area for Accordion Toggle */}
                <Col xs="auto" className="d-flex  justify-content-center w-100">
                  <Button 
                    size="sm" 
                    variant="primary" 
                    className="me-3" 
                    onClick={(e) => {
                      e.stopPropagation(); // Safety first
                      onClickAction();
                    }}
                  >
                    Open
                  </Button>

                </Col>
                <Col className="p-0">
                {showDetails ? (
                  <CustomToggle eventKey="0">
                    <div className="d-flex align-items-center cursor">
                      <Image src={item.image} width={50} height={50} rounded />
                      <h6 className="mb-0 ms-2">{item.name}</h6>
                    </div>
                  </CustomToggle>
                ) : (
                  itemContent
                )}  
                </Col>

                {/* Independent Button Area (Not inside Toggle) */}

                  <div style={{ minWidth: '65px', textAlign: 'right' }}>
                    {showDetails ? (
                      itemTotal > 0 && <strong>${itemTotal.toFixed(2)}</strong>
                    ) : (
                      <div className="d-flex ">
                        <strong>${mainVariant.price}</strong>
                        {mainVariant?.oldprice > 0 && (
                      <Badge bg="warning" className="ms-2">Save {(mainVariant.price/mainVariant.oldprice)*100}%</Badge>
                    
                    )}
                    </div>
                    )}
                  </div>
              </Row>
            </div>
            {showDetails && (
              <Accordion.Collapse eventKey="0">
                <div className="pt-2 border-top mt-2 px-2">
                  {item.variants.map((variant) => (
                    <VariantRow
                      key={variant.sku}
                      variant={variant}
                      increment={increment}
                      decrement={decrement}
                      onRemove={(sku) => setRemoveTarget(sku)}
                    />
                  ))}
                </div>
              </Accordion.Collapse>            )}
          </Accordion>
        </Card.Body>
      </Card>

      <ConfirmationModal
        show={!!removeTarget}
        onHide={() => setRemoveTarget(null)}
        title="Remove item"
        message="Remove this item from cart?"
        primaryButton={{
          text: "Remove",
          variant: "danger",
          onClick: () => {
            removeFromCart(removeTarget);
            setRemoveTarget(null);
          },
        }}
        secondaryButton={{
          text: "Cancel",
          variant: "secondary",
          onClick: () => setRemoveTarget(null),
        }}
      />
    </>
  );
};

const VariantRow = ({ variant, increment, decrement, onRemove }) => (
  <>
    <Row className="align-items-center py-2 gx-2">
      <Col xs={3}>
        <span className="text-muted">{variant.size || "Simple"}</span>
      </Col>

      <Col xs={2}>
        {variant.color && variant.color !== "simple" && (
          <span
            className="swatch"
            title={variant.color}
            style={{ backgroundColor: variant.color }}
          />
        )}
      </Col>

      <Col xs={2}>
        <strong>${variant.price}</strong>
      </Col>

      <Col xs={3} className="d-flex justify-content-end gap-1">
      <Button
        variant={variant.quantity <= 1 ? "secondary" : "outline-dark"} 
        size="sm"
        disabled={variant.quantity <= 1} 
        onClick={() => decrement(variant.sku)}
        className="d-flex align-items-center justify-content-center rounded-circle"
        style={{ width: '32px', height: '32px' }} // Keep it a perfect square
      >
        −
      </Button>

        <span className="fw-bold fs-5 ms-1 me-1 ">{variant.quantity}</span>
        <Button
          variant={variant.quantity >= variant.stock ? "secondary" : "outline-dark"}
          size="sm"
          disabled={variant.quantity >= variant.stock}
          onClick={() => increment(variant.sku)}
          className="d-flex align-items-center justify-content-center rounded-circle" 
          style={{ width: '32px', height: '32px' }} // Keep it a perfect square
          >
        +
      </Button>
      </Col>

      <Col xs={2} className="text-end">
        <Button
          variant="danger"
          size="sm"
          
          onClick={(e) => {
            e.stopPropagation();
            onRemove(variant.sku);
          }}
        >
          <MdDeleteForever className="fs-5" />
        </Button>
      </Col>
    </Row>
    <hr className="my-1" />
  </>
);

export default CartItem;
