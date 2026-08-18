/** Small stroke icons shared by the app. */
import type { ReactNode } from "react";

interface IconProps {
  className?: string;
}

function Base({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function AlertTriangleIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="m21 18-8-14a1.2 1.2 0 0 0-2 0L3 18a1.2 1.2 0 0 0 1 2h16a1.2 1.2 0 0 0 1-2Z" />
      <path d="M12 9v4M12 17h.01" />
    </Base>
  );
}

export function ArrowUpIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </Base>
  );
}

export function ArrowDownIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M12 5v14M18 13l-6 6-6-6" />
    </Base>
  );
}

export function MinusIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M5 12h14" />
    </Base>
  );
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M3 12a9 9 0 0 1 9-9 9.7 9.7 0 0 1 6.7 2.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.7 9.7 0 0 1-6.7-2.7L3 16" />
      <path d="M3 21v-5h5" />
    </Base>
  );
}
