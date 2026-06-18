"use client";

import { AboutSection } from "./_components/AboutSection";
import { HeroSection } from "./_components/HeroSection";
import { MarqueeSection } from "./_components/MarqueeSection";
import { ProjectsSection } from "./_components/ProjectsSection";
import { ServicesSection } from "./_components/ServicesSection";

export default function PortfolioPage() {
  return (
    <main className="bg-[#0C0C0C]" style={{ overflowX: "clip" }}>
      <HeroSection />
      <MarqueeSection />
      <AboutSection />
      <ServicesSection />
      <ProjectsSection />
    </main>
  );
}
