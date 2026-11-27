import Image from "next/image";

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

/**
 * Official Cheesco brand mark: diamond emblem with interlocking CL monogram
 * on vibrant Cheesco yellow background.
 */
export function CheescoLogo({ size = 40, className = "" }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 overflow-hidden rounded-xl shadow-sm ${className}`}
    >
      <Image
        src="/images/cheesco-mark.png"
        alt="Cheesco logo"
        width={size}
        height={size}
        priority
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export function CheescoFullLogo({ width = 160, className = "" }: { width?: number; className?: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-xl ${className}`} style={{ width }}>
      <Image
        src="/images/cheesco-logo.png"
        alt="Cheesco Leasing Agency"
        width={width}
        height={Math.round((width * 960) / 1024)}
        priority
        className="h-auto w-full object-contain"
      />
    </div>
  );
}

export function CheescoWordmark({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <span className={`flex flex-col leading-none select-none ${className}`}>
      <span className="text-lg font-black tracking-[0.18em] text-white">
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
