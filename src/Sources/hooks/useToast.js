import { useState, useCallback } from "react";

export default function useToast() {
  const [toast, setToast] = useState({
    show: false,
    message: "",
    bg: "success",
  });

  const showToast = useCallback((message, bg = "success") => {
    setToast({ show: true, message, bg });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, show: false }));
  }, []);

  return {
    toast,
    showToast,
    hideToast,
  };
}
