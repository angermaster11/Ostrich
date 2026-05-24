"use client";

interface OstrichLogoProps {
  size?: number;
  className?: string;
}

export function OstrichLogo({ size = 36, className = "" }: OstrichLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle */}
      <circle cx="32" cy="32" r="32" fill="url(#logo-grad)" />

      {/* Ostrich body - elegant curved shape */}
      <ellipse cx="32" cy="42" rx="12" ry="10" fill="white" opacity="0.95" />

      {/* Long neck - graceful S-curve */}
      <path
        d="M34 35 Q36 28 34 22 Q32 16 30 12"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.95"
      />

      {/* Head */}
      <circle cx="29" cy="11" r="4.5" fill="white" opacity="0.95" />

      {/* Eye */}
      <circle cx="28" cy="10.5" r="1.5" fill="#4c1d95" />
      <circle cx="27.5" cy="10" r="0.5" fill="white" opacity="0.8" />

      {/* Beak */}
      <path
        d="M24.5 12 L22 13.5 L24.5 14"
        stroke="#f59e0b"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Tail feathers */}
      <path d="M42 38 Q48 34 46 30" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M41 40 Q49 37 48 32" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M40 42 Q47 40 47 35" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />

      {/* Legs */}
      <path d="M28 51 L26 58 L23 58" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
      <path d="M35 51 L37 58 L40 58" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />

      {/* Wing detail */}
      <path d="M26 40 Q32 38 38 40" stroke="white" strokeWidth="1" fill="none" opacity="0.4" />

      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
    </svg>
  );
}
