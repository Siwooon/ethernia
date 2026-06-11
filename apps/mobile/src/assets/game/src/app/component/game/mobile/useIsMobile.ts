"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < breakpoint);

    update();
    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, [breakpoint]);

  return isMobile;
}
