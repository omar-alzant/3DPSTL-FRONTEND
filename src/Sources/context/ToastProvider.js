import React, { createContext, useContext, useState } from "react";
import AppToast from "../components/AppToast";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({
    show: false,
    message: "",
    bg: "success",
  });

  const showToast = (message, bg = "success") => {
    // an Error object (or anything that isn't text/JSX) would crash the whole page when rendered
    if (message instanceof Error) message = message.message;
    else if (message && typeof message === "object" && !message.$$typeof) message = message.message || String(message);
    setToast({ show: true, message, bg });
  };

  const hideToast = () => {
    setToast((t) => ({ ...t, show: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* 🔥 One global toast */}
      <AppToast
        show={toast.show}
        message={toast.message}
        bg={toast.bg}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
