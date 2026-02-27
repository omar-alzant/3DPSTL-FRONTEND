import React, { useEffect } from "react";
import { Toast, ToastContainer } from "react-bootstrap";

export default function AppToast({
  show,
  message,
  bg = "success",
  title,
  onClose
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  const resolvedTitle =
    title ||
    (bg === "success"
      ? "Success"
      : bg === "warning"
      ? "Warning"
      : bg === "danger"
      ? "Error"
      : "Notice");

  return (
    <ToastContainer
      position="fixed"
      className="p-3 bottom-0 end-0"
      style={{ zIndex: 9999 }}
    >
      <Toast
        bg={bg}
        show={show}
        onClose={onClose}
        delay={3000}
        autohide
      >
        <Toast.Header>
          <strong className="me-auto">{resolvedTitle}</strong>
        </Toast.Header>

        <Toast.Body className="text-white">
          {message}
        </Toast.Body>
      </Toast>
    </ToastContainer>
  );
}
