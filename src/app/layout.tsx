import type { Metadata } from "next";
import { Geist, Geist_Mono, Kanit } from "next/font/google";
import { Toaster } from "sonner";

import { ClickSound } from "@/components/click-sound";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Learning Universe",
  description: "Explore knowledge across the AI universe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${kanit.variable} dark h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">
        <TooltipProvider>
          {children}
          <Toaster theme="dark" richColors position="top-right" />
          <ClickSound />
        </TooltipProvider>
      </body>
    </html>
  );
}
