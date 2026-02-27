import React from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

const ConfirmationModal = ({
  show,
  onHide,
  title = "Confirm Action",
  message,
  primaryButton = { text: "Confirm", variant: "primary", onClick: () => {} },
  secondaryButton = { text: "Cancel", variant: "secondary", onClick: () => {} },
  titleClassName = "",
}) => {
  const handlePrimaryClick = () => {
    primaryButton.onClick();
    if (primaryButton.closeOnClick !== false) {
      onHide();
    }
  };

  const handleSecondaryClick = () => {
    secondaryButton.onClick();
    if (secondaryButton.closeOnClick !== false) {
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title className={titleClassName}>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant={secondaryButton.variant} onClick={handleSecondaryClick}>
          {secondaryButton.text}
        </Button>
        <Button variant={primaryButton.variant} onClick={handlePrimaryClick}>
          {primaryButton.text}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

ConfirmationModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  primaryButton: PropTypes.shape({
    text: PropTypes.string,
    variant: PropTypes.string,
    onClick: PropTypes.func,
    closeOnClick: PropTypes.bool,
  }),
  secondaryButton: PropTypes.shape({
    text: PropTypes.string,
    variant: PropTypes.string,
    onClick: PropTypes.func,
    closeOnClick: PropTypes.bool,
  }),
  titleClassName: PropTypes.string,
};

export default ConfirmationModal;

