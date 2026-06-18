"use client";

import type { CSSProperties } from "react";

interface ButtonProps {
  className?: string;
  onClick?: () => void;
}

export function ContactButton({ className = "", onClick }: ButtonProps) {
  const style: CSSProperties = {
    background:
      "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
    boxShadow:
      "0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset",
    outline: "2px solid #ffffff",
    outlineOffset: "-3px",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`rounded-full px-8 py-3 text-xs font-medium uppercase tracking-widest text-white transition-transform duration-200 hover:scale-[1.03] sm:px-10 sm:py-3.5 sm:text-sm md:px-12 md:py-4 md:text-base ${className}`}
    >
      Contact Me
    </button>
  );
}

export function LiveProjectButton({ className = "", onClick }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border-2 border-[#D7E2EA] px-8 py-3 text-sm font-medium uppercase tracking-widest text-[#D7E2EA] transition-colors duration-200 hover:bg-[#D7E2EA]/10 sm:px-10 sm:py-3.5 sm:text-base ${className}`}
    >
      Live Project
    </button>
  );
}
