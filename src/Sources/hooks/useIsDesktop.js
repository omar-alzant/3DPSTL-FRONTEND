import { useEffect, useState } from "react";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    window.innerWidth >= 992
  );

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 992);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return isDesktop;
}

export default useIsDesktop;
