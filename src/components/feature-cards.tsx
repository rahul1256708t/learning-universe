"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Monitor, Palette, Zap } from "lucide-react";

/* ── Reusable glowing feature card ───────────────────────────── */
function FeatureCard({
  title,
  description,
  icon,
  gradient,
  delay,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  gradient: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "50px" }}
      transition={{ duration: 0.8, ease: "easeOut", delay }}
    >
      <div className="relative flex flex-col justify-start items-start w-full max-w-[260px] md:max-w-[300px] group mx-auto">
        {/* Glow background */}
        <div
          className="absolute w-full h-[260px] md:h-[300px] opacity-60 rounded-[40px] pointer-events-none"
          style={{ background: gradient, filter: "blur(45px)" }}
        />

        {/* Foreground card with gradient border */}
        <div
          className="relative self-stretch h-[260px] md:h-[300px] rounded-[40px] z-10 overflow-hidden"
          style={{
            border: "8px solid transparent",
            background: `linear-gradient(#1A1A1C, #1A1A1C) padding-box, ${gradient} border-box`,
          }}
        >
          <div className="w-full h-full p-7 flex flex-col justify-between">
            <div className="text-white/90">{icon}</div>
            <div>
              <h3 className="text-white font-medium text-xl mb-3 tracking-tight">
                {title}
              </h3>
              <p className="text-gray-400 text-[14px] leading-[1.6] font-normal selection:bg-white/20">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Card data ───────────────────────────────────────────────── */
const CARDS = [
  {
    title: "Hardware",
    icon: <Monitor size={32} strokeWidth={2.5} />,
    delay: 0.1,
    description:
      "My entire desktop setup is built for power. It is silent, durable, and holds my focus.",
    gradient:
      "linear-gradient(137deg, #FF3D77 0%, #FFB1CE 45%, #FF9D3C 100%)",
  },
  {
    title: "Studio",
    icon: <Palette size={32} strokeWidth={2.5} />,
    delay: 0.2,
    description:
      "Studio is where I define every single pixel. It is the hub for each canvas I deliver.",
    gradient:
      "linear-gradient(137deg, #FFFFFF 0%, #7DD3FC 45%, #06B6D4 100%)",
  },
  {
    title: "Motion",
    icon: <Zap size={32} strokeWidth={2.5} />,
    delay: 0.3,
    description:
      "I use Motion to build lively prototypes, bridging the gap between views and code.",
    gradient:
      "linear-gradient(137deg, #4361EE 0%, #E0AEFF 45%, #F72585 100%)",
  },
];

/* ── Section wrapper ─────────────────────────────────────────── */
export function FeatureCards() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-6 md:p-12 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-3 lg:gap-3 w-full max-w-[936px]">
        {CARDS.map((card) => (
          <FeatureCard
            key={card.title}
            title={card.title}
            description={card.description}
            icon={card.icon}
            gradient={card.gradient}
            delay={card.delay}
          />
        ))}
      </div>
    </div>
  );
}
