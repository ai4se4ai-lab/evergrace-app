/** SVG icons lifted from the prototype so stroke weights stay consistent. */

type IconProps = { size?: number; className?: string };

function stroke(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

export function PlayIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function PauseIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

export function LockIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...stroke(size, className)}>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}

export function BellIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...stroke(size, className)}>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 01-3.4 0" />
    </svg>
  );
}

export function AccessibilityIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...stroke(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <path d="M12 11v6" />
    </svg>
  );
}

export function SunIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...stroke(size, className)}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
    </svg>
  );
}

export function MoonIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...stroke(size, className)}>
      <path d="M20 14.5A8 8 0 019.5 4a7 7 0 100 16 8 8 0 0010.5-5.5z" />
    </svg>
  );
}

export function AutoThemeIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...stroke(size, className)}>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

export function CheckIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...stroke(size, className)} strokeWidth={2.8}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...stroke(size, className)} strokeWidth={3}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...stroke(size, className)} strokeWidth={2.6}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function DownloadIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...stroke(size, className)}>
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
    </svg>
  );
}

export function UploadIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...stroke(size, className)} strokeWidth={2}>
      <path d="M12 16V4m0 0L7 9m5-5l5 5M4 20h16" />
    </svg>
  );
}

export function PlusIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...stroke(size, className)} strokeWidth={2.4}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ArrowUpIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...stroke(size, className)} strokeWidth={2.4}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function RewindIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...stroke(size, className)}>
      <path d="M11 4L4 9l7 5V4z" />
      <path d="M4 9h9a7 7 0 110 14H9" />
    </svg>
  );
}
