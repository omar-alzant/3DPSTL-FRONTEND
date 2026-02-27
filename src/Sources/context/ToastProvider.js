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
