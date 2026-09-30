interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

/**
 * Cheesco brand mark: black rounded diamond, white inset border,
 * interlocking CH/CL monogram — paired with the geometric wordmark.
 */
export function CheescoLogo({ size = 40, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-label="Cheesco logo"
    >
      {/* rounded diamond */}
      <rect
        x="6"
        y="6"
        width="52"
        height="52"
        rx="10"
        transform="rotate(45 32 32)"
        fill="#0A0D14"
        stroke="#FFC700"
        strokeWidth="2"
      />
      {/* white inset border */}
      <rect
        x="12"
        y="12"
        width="40"
        height="40"
        rx="6"
        transform="rotate(45 32 32)"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        opacity="0.9"
      />
      {/* interlocking monogram: C H over C L */}
      <text
        x="32"
        y="30"
        textAnchor="middle"
        fontFamily="var(--font-geist-sans), sans-serif"
        fontWeight="800"
        fontSize="13"
        fill="#FFC700"
        letterSpacing="1"
      >
        CH
      </text>
      <text
        x="32"
        y="44"
        textAnchor="middle"
        fontFamily="var(--font-geist-sans), sans-serif"
        fontWeight="800"
        fontSize="13"
        fill="#FFFFFF"
        letterSpacing="1"
      >
        CL
      </text>
    </svg>
  );
}

export function CheescoWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex flex-col leading-none select-none">
      <span className="text-lg font-black tracking-[0.18em] text-ink">
        CHEESCO
      </span>
      {!compact && (
        <span className="text-[9px] font-bold tracking-[0.42em] text-cheesco-yellow">
          EQUIP HUB
        </span>
      )}
    </span>
  );
}
