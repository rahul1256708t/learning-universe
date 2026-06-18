import type { Metadata } from "next";
import { Kanit } from "next/font/google";

import "./portfolio.css";

// Kanit is not a variable font, so the weights must be enumerated (300-900).
const kanit = Kanit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jack — 3D Creator",
  description:
    "A 3D creator driven by crafting striking and unforgettable projects.",
};

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The root layout owns <html>/<body>; this wrapper paints the dark theme
  // and applies Kanit for everything inside the /portfolio route.
  return (
    <div
      className={`${kanit.className} min-h-screen bg-[#0C0C0C] text-white`}
      style={{ overflowX: "clip" }}
    >
      {children}
    </div>
  );
}
