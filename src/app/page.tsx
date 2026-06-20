"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { RocketIcon } from "lucide-react";

import { AppBackground } from "@/components/app-background";

/* ── Reusable viewport fade-in ──────────────────────────────── */
function FI({
  children,
  delay = 0,
  y = 30,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "50px", amount: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Gradient pill button (Jack-style) ──────────────────────── */
function GradientButton({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <Link
      href={href}
      style={{
        background:
          "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
        boxShadow:
          "0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset",
        outline: "2px solid #ffffff",
        outlineOffset: "-3px",
      }}
      className="inline-block rounded-full px-8 py-3 text-xs font-medium uppercase tracking-widest text-white transition-transform duration-200 hover:scale-[1.03] sm:px-10 sm:py-3.5 sm:text-sm md:px-12 md:py-4 md:text-base"
    >
      {children}
    </Link>
  );
}

/* ── Ghost pill button ──────────────────────────────────────── */
function GhostButton({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <Link
      href={href}
      className="inline-block rounded-full border-2 border-[#D7E2EA] px-8 py-3 text-xs font-medium uppercase tracking-widest text-[#D7E2EA] transition-colors duration-200 hover:bg-[#D7E2EA]/10 sm:px-10 sm:py-3.5 sm:text-sm md:px-12 md:py-4 md:text-base"
    >
      {children}
    </Link>
  );
}

const NAV_LINKS = [
  { label: "About", href: "#capabilities" },
  { label: "Models", href: "/dashboard/models" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Sign In", href: "/login" },
];

const CAPABILITIES = [
  {
    number: "01",
    name: "AI Tutor Chat",
    description:
      "Stream real-time answers from top OpenRouter models. Ask follow-ups, paste homework, and save every session automatically to your account.",
  },
  {
    number: "02",
    name: "Study Modes",
    description:
      "8 pre-built system prompts — tutor, quiz generator, notes, exam prep, formula helper, and more — each tailored to a specific learning workflow.",
  },
  {
    number: "03",
    name: "Smart Models",
    description:
      "Switch between Claude, GPT-4o, Gemini, Llama, and more without leaving the page. Pick the best model for each task.",
  },
  {
    number: "04",
    name: "Auto-Save",
    description:
      "Every chat persists to your Supabase project with full message history, titles, model info, and timestamps — always accessible.",
  },
  {
    number: "05",
    name: "Secure by Design",
    description:
      "Your OpenRouter API key lives server-side only. Students interact with powerful AI without ever touching a credential.",
  },
];

export default function LandingPage() {
  return (
    <AppBackground>
      <main style={{ overflowX: "clip" }}>
        {/* ── Hero ─────────────────────────────────────── */}
        <section
          className="relative flex h-screen flex-col"
          style={{ overflowX: "clip" }}
        >
          {/* Navbar */}
          <FI delay={0} y={-20}>
            <nav className="flex items-center justify-between px-6 pt-6 font-heading text-sm font-medium uppercase tracking-wider text-[#D7E2EA] md:px-10 md:pt-8 md:text-base lg:text-[1.1rem]">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg border border-[#D7E2EA]/20 bg-[#D7E2EA]/5 text-[#D7E2EA]">
                  <RocketIcon className="size-4" />
                </span>
                <span className="hidden sm:block tracking-widest">LU</span>
              </Link>
              <div className="flex items-center gap-5 md:gap-10">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="transition-opacity duration-200 hover:opacity-70"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          </FI>

          {/* Massive two-line heading */}
          <div className="overflow-hidden px-6 md:px-10">
            <FI delay={0.15} y={50}>
              <h1
                className="hero-heading mt-6 font-heading font-black uppercase leading-[0.92] tracking-tight sm:mt-4 md:-mt-2"
                style={{ fontSize: "clamp(3.5rem, 17vw, 240px)" }}
              >
                <span className="block">Learning</span>
                <span className="block">Universe</span>
              </h1>
            </FI>
          </div>

          {/* Bottom bar */}
          <div className="mt-auto flex items-end justify-between px-6 pb-7 sm:pb-8 md:px-10 md:pb-10">
            <FI delay={0.35} y={20}>
              <p
                className="max-w-[155px] font-light uppercase leading-snug tracking-wide text-[#D7E2EA] sm:max-w-[220px] md:max-w-[280px]"
                style={{ fontSize: "clamp(0.75rem, 1.4vw, 1.5rem)" }}
              >
                an ai-powered study companion built for students who demand more
              </p>
            </FI>

            <FI delay={0.5} y={20}>
              <GradientButton href="/dashboard/chat">Launch Dashboard</GradientButton>
            </FI>
          </div>
        </section>

        {/* ── Capabilities (white) ─────────────────────── */}
        <section
          id="capabilities"
          className="rounded-t-[40px] bg-white px-5 py-20 sm:rounded-t-[50px] sm:px-8 sm:py-24 md:rounded-t-[60px] md:px-10 md:py-32"
        >
          <FI y={40}>
            <h2
              className="mb-16 text-center font-heading font-black uppercase leading-none tracking-tight text-[#0C0C0C] sm:mb-20 md:mb-28"
              style={{ fontSize: "clamp(3rem, 12vw, 160px)" }}
            >
              Capabilities
            </h2>
          </FI>

          <div className="mx-auto max-w-5xl">
            {CAPABILITIES.map((cap, i) => (
              <FI key={cap.number} delay={i * 0.1}>
                <div
                  className="flex items-start gap-5 py-8 sm:gap-8 sm:py-10 md:gap-12 md:py-12"
                  style={{
                    borderTop:
                      i === 0 ? undefined : "1px solid rgba(12, 12, 12, 0.15)",
                  }}
                >
                  <span
                    className="shrink-0 font-heading font-black leading-none text-[#0C0C0C]"
                    style={{ fontSize: "clamp(3rem, 10vw, 140px)" }}
                  >
                    {cap.number}
                  </span>
                  <div className="flex flex-col gap-3 pt-2">
                    <h3
                      className="font-heading font-medium uppercase text-[#0C0C0C]"
                      style={{ fontSize: "clamp(1rem, 2.2vw, 2.1rem)" }}
                    >
                      {cap.name}
                    </h3>
                    <p
                      className="max-w-2xl font-light leading-relaxed text-[#0C0C0C] opacity-60"
                      style={{ fontSize: "clamp(0.85rem, 1.6vw, 1.25rem)" }}
                    >
                      {cap.description}
                    </p>
                  </div>
                </div>
              </FI>
            ))}
          </div>
        </section>

        {/* ── CTA (dark) ───────────────────────────────── */}
        <section className="relative z-10 -mt-10 flex flex-col items-center justify-center rounded-t-[40px] bg-[#0C0C0C] px-5 py-24 text-center sm:-mt-12 sm:rounded-t-[50px] sm:px-8 sm:py-32 md:-mt-14 md:rounded-t-[60px] md:px-10 md:py-40">
          <FI y={40}>
            <h2
              className="hero-heading font-heading font-black uppercase leading-none tracking-tight"
              style={{ fontSize: "clamp(3.5rem, 14vw, 180px)" }}
            >
              Start Learning
            </h2>
          </FI>

          <FI
            delay={0.2}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-6"
          >
            <GradientButton href="/signup">Create Account</GradientButton>
            <GhostButton href="/login">Sign In</GhostButton>
          </FI>

          <FI delay={0.4} className="mt-16">
            <p className="owner-title font-heading text-2xl font-black uppercase tracking-[0.35em] drop-shadow-[0_0_28px_rgba(244,114,182,0.85)]">
              Owner: Rahul Gupta
            </p>
          </FI>
        </section>
      </main>
    </AppBackground>
  );
}
