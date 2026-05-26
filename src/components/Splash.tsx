import { useEffect, useState } from "react";
import LowSignalLogo from "./LowSignalLogo";

const SHOWN_KEY = "lowsignal.splash.shown";

export function Splash({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(SHOWN_KEY);
  });

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      sessionStorage.setItem(SHOWN_KEY, "1");
      setShow(false);
    }, 1800);
    return () => clearTimeout(t);
  }, [show]);

  if (show) {
    return (
      <div
        role="status"
        aria-label="Low Signal — loading"
        className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      >
        <LowSignalLogo size={72} rotateInterval={900} />
      </div>
    );
  }
  return <>{children}</>;
}
