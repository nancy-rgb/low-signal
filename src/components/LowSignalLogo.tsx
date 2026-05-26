import { useState, useEffect } from "react";

type Translation = {
  primary: string;
  secondary: string;
  code: string;
  rtl: boolean;
  primaryScale: number; // multiplier for primary font size
  secondaryScale: number;
  uppercase: boolean;
};

const TRANSLATIONS: Translation[] = [
  {
    primary: "Low Signal",
    secondary: "reach out",
    code: "EN",
    rtl: false,
    primaryScale: 1,
    secondaryScale: 1,
    uppercase: true,
  },
  {
    primary: "Señal Baja",
    secondary: "pide ayuda",
    code: "ES",
    rtl: false,
    primaryScale: 1,
    secondaryScale: 1,
    uppercase: true,
  },
  {
    primary: "Signal Faible",
    secondary: "demande de l\u2019aide",
    code: "FR",
    rtl: false,
    primaryScale: 0.9,
    secondaryScale: 0.92,
    uppercase: true,
  },
  {
    primary: "\u0625\u0634\u0627\u0631\u0629 \u0636\u0639\u064A\u0641\u0629",
    secondary: "\u0627\u0637\u0644\u0628 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629",
    code: "AR",
    rtl: true,
    primaryScale: 1,
    secondaryScale: 1.08,
    uppercase: false,
  },
  {
    primary: "\u5FAE\u5F31\u4FE1\u53F7",
    secondary: "\u5BFB\u6C42\u5E2E\u52A9",
    code: "ZH",
    rtl: false,
    primaryScale: 1.1,
    secondaryScale: 1.08,
    uppercase: false,
  },
];

export interface LowSignalLogoProps {
  /** Base size in pixels for the primary wordmark. Default: 44 */
  size?: number;
  /** Cycle through languages automatically. Default: true */
  autoRotate?: boolean;
  /** Milliseconds between language changes. Default: 2800 */
  rotateInterval?: number;
  /** Force a specific language by index (0-4). Disables auto-rotate. */
  languageIndex?: number;
  /** Theme variant. Default: 'light' */
  theme?: "light" | "dark";
  /** Show the small ISO language code in the corner. Default: true */
  showLangCode?: boolean;
  /** Show the icon mark to the left of the wordmark. Default: true */
  showMark?: boolean;
  /** Optional className for the outer container */
  className?: string;
}

export default function LowSignalLogo({
  size = 44,
  autoRotate = true,
  rotateInterval = 2800,
  languageIndex,
  theme = "light",
  showLangCode = true,
  showMark = true,
  className = "",
}: LowSignalLogoProps) {
  const [current, setCurrent] = useState(languageIndex ?? 0);
  const [fading, setFading] = useState(false);

  // Sync to controlled languageIndex prop
  useEffect(() => {
    if (typeof languageIndex === "number") {
      setCurrent(languageIndex);
    }
  }, [languageIndex]);

  // Auto-rotation
  useEffect(() => {
    if (!autoRotate || typeof languageIndex === "number") return;
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % TRANSLATIONS.length);
        setFading(false);
      }, 200);
    }, rotateInterval);
    return () => clearInterval(id);
  }, [autoRotate, rotateInterval, languageIndex]);

  const t = TRANSLATIONS[current];
  const primaryColor = theme === "dark" ? "#f5f5f5" : "#0a0a0a";
  const secondaryColor =
    theme === "dark" ? "rgba(245,245,245,0.6)" : "rgba(10,10,10,0.55)";
  const tertiaryColor =
    theme === "dark" ? "rgba(245,245,245,0.35)" : "rgba(10,10,10,0.35)";

  const primarySize = size * t.primaryScale;
  const secondarySize = Math.max(11, size * 0.295 * t.secondaryScale);

  return (
    <div
      className={`inline-flex items-center gap-4 ${className}`}
      style={{ color: primaryColor }}
      aria-label={`Low Signal logo (${t.code})`}
    >
      {showMark && (
        <svg
          width={size * 0.82}
          height={size * 0.82}
          viewBox="0 0 32 32"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <rect x="2" y="22" width="5" height="8" rx="1" fill={primaryColor} />
          <rect
            x="10"
            y="14"
            width="5"
            height="16"
            rx="1"
            fill={primaryColor}
            opacity={0.35}
          />
          <rect
            x="18"
            y="6"
            width="5"
            height="24"
            rx="1"
            fill={primaryColor}
            opacity={0.15}
          />
          <line
            x1="4"
            y1="4"
            x2="28"
            y2="28"
            stroke={primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}

      <div className="relative" style={{ minWidth: size * 4 }}>
        <div
          dir={t.rtl ? "rtl" : "ltr"}
          style={{
            fontSize: `${primarySize}px`,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: primaryColor,
            opacity: fading ? 0 : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          {t.primary}
        </div>
        <div
          dir={t.rtl ? "rtl" : "ltr"}
          style={{
            fontSize: `${secondarySize}px`,
            fontWeight: 400,
            letterSpacing: t.uppercase ? "0.12em" : "0.05em",
            textTransform: t.uppercase ? "uppercase" : "none",
            marginTop: size * 0.32,
            color: secondaryColor,
            opacity: fading ? 0 : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          {t.secondary}
        </div>

        {showLangCode && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: t.rtl ? "auto" : -28,
              left: t.rtl ? -28 : "auto",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.15em",
              color: tertiaryColor,
            }}
          >
            {t.code}
          </span>
        )}
      </div>
    </div>
  );
}
