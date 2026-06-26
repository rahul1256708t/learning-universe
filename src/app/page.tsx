"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { CheckIcon, RocketIcon, XIcon } from "lucide-react";

import { AppBackground } from "@/components/app-background";
import { FeatureCards } from "@/components/feature-cards";

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

/* ── Gradient pill button ────────────────────────────────────── */
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

/* ── Animated counter stat ───────────────────────────────────── */
function StatCounter({
  target,
  suffix = "",
  label,
  duration = 2200,
}: {
  target: number;
  suffix?: string;
  label: string;
  duration?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <p
        className="font-heading font-black leading-none tracking-tight text-white"
        style={{ fontSize: "clamp(2.8rem, 7vw, 6rem)" }}
      >
        {count.toLocaleString()}
        {suffix}
      </p>
      <p className="font-heading text-xs font-medium uppercase tracking-[0.25em] text-white/45">
        {label}
      </p>
    </div>
  );
}

/* ── App mockup (CSS) ────────────────────────────────────────── */
function AppMockup() {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      {/* Glow behind mockup */}
      <div
        className="absolute inset-0 rounded-3xl blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(182,0,168,0.25) 0%, rgba(118,33,176,0.15) 60%, transparent 100%)",
        }}
      />
      {/* Browser chrome */}
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#0a0a0f] shadow-2xl shadow-black/60">
        {/* Browser bar */}
        <div className="flex items-center gap-2 border-b border-white/8 bg-white/[0.03] px-4 py-3">
          <span className="size-3 rounded-full bg-red-500/70" />
          <span className="size-3 rounded-full bg-yellow-500/70" />
          <span className="size-3 rounded-full bg-green-500/70" />
          <div className="mx-auto flex h-6 w-56 items-center rounded-md bg-white/5 px-3">
            <span className="text-[10px] text-white/30">learninguniv.app/dashboard/chat</span>
          </div>
        </div>
        {/* App layout */}
        <div className="flex h-72 sm:h-96">
          {/* Sidebar */}
          <div className="hidden w-44 flex-col gap-2 border-r border-white/8 p-3 sm:flex">
            <div className="mb-2 flex items-center gap-2">
              <div className="size-5 rounded bg-[#D7E2EA]/10" />
              <div className="h-2 w-16 rounded bg-[#D7E2EA]/20" />
            </div>
            {["Fast Research", "Deep Research", "NCERT", "Exam", "Coding"].map((m, i) => (
              <div
                key={m}
                className={`rounded-lg border px-2 py-1.5 ${
                  i === 0
                    ? "border-purple-500/40 bg-purple-500/15"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <div
                  className={`h-1.5 w-14 rounded ${i === 0 ? "bg-purple-300/70" : "bg-white/15"}`}
                />
              </div>
            ))}
          </div>
          {/* Chat area */}
          <div className="flex flex-1 flex-col gap-3 p-4">
            {/* AI message */}
            <div className="max-w-[80%] rounded-xl border border-white/8 bg-white/[0.04] p-3">
              <div className="mb-2 h-1.5 w-12 rounded bg-purple-400/40" />
              <div className="flex flex-col gap-1.5">
                <div className="h-1.5 w-full rounded bg-white/15" />
                <div className="h-1.5 w-5/6 rounded bg-white/12" />
                <div className="h-1.5 w-4/6 rounded bg-white/10" />
              </div>
            </div>
            {/* User message */}
            <div className="ml-auto max-w-[70%] rounded-xl border border-[#D7E2EA]/15 bg-[#D7E2EA]/8 p-3">
              <div className="flex flex-col gap-1.5">
                <div className="h-1.5 w-full rounded bg-white/25" />
                <div className="h-1.5 w-3/4 rounded bg-white/18" />
              </div>
            </div>
            {/* AI reply streaming */}
            <div className="max-w-[80%] rounded-xl border border-white/8 bg-white/[0.04] p-3">
              <div className="mb-2 h-1.5 w-12 rounded bg-purple-400/40" />
              <div className="flex flex-col gap-1.5">
                <div className="h-1.5 w-full rounded bg-white/15" />
                <div className="h-1.5 w-3/5 rounded bg-white/12" />
                <motion.div
                  className="h-1.5 w-8 rounded bg-purple-400/60"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </div>
            </div>
            {/* Input bar */}
            <div className="mt-auto rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
              <div className="mb-2 h-8 rounded-lg bg-black/20" />
              <div className="flex justify-end">
                <div
                  className="h-7 w-24 rounded-full"
                  style={{
                    background:
                      "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Testimonials data ───────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote:
      "Learning Universe helped me ace my Chemistry board exam. The NCERT mode gives perfectly structured, exam-ready answers.",
    name: "Priya Sharma",
    role: "Class 12 · Delhi",
    rating: 5,
  },
  {
    quote:
      "I use it every day for JEE prep. The Formula Helper explains each variable clearly — better than my coaching notes.",
    name: "Arjun Mehta",
    role: "JEE Aspirant · Pune",
    rating: 5,
  },
  {
    quote:
      "The Quiz Generator revised an entire chapter for me in 20 minutes. I recommend it to every classmate before exams.",
    name: "Sneha Patel",
    role: "Class 10 · Mumbai",
    rating: 5,
  },
  {
    quote:
      "As a college student, the AI Tutor mode gives better step-by-step explanations than most textbooks I've read.",
    name: "Rohan Verma",
    role: "B.Tech Student · Bangalore",
    rating: 5,
  },
];

/* ── Feature comparison data ─────────────────────────────────── */
const COMPARISON_ROWS = [
  { feature: "AI Study Chat", free: true, pro: true },
  { feature: "Study Modes", free: "3 modes", pro: "All 8 modes" },
  { feature: "AI Models", free: "1 model", pro: "All 6 models" },
  { feature: "Chat History", free: "10 chats", pro: "Unlimited" },
  { feature: "Flashcard Generator", free: false, pro: true },
  { feature: "Progress Tracker", free: false, pro: true },
  { feature: "Image / PDF Upload", free: false, pro: true },
  { feature: "NCERT-style Answers", free: false, pro: true },
  { feature: "Priority Support", free: false, pro: true },
];

/* ── Nav links ───────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: "About", href: "#capabilities" },
  { label: "Models", href: "/dashboard/models" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Sign In", href: "/login" },
];

const CAPABILITIES = [
  {
    number: "01",
    name: "AI Research Agent",
    description:
      "Not a chatbot — a research agent. It classifies your question, searches the web, reads trusted sources, verifies the facts, then answers with inline citations and a confidence score.",
  },
  {
    number: "02",
    name: "Research Modes",
    description:
      "Six tuned modes — Fast Research, Deep Research, NCERT, Exam, Coding Research, and Step-by-Step Tutor — each shaping how deeply the agent searches and how it writes the answer.",
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

/* ── Page ────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <AppBackground>
      <main style={{ overflowX: "clip" }}>

        {/* ── Hero ───────────────────────────────────────── */}
        <section className="relative flex h-screen flex-col" style={{ overflowX: "clip" }}>
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

        {/* ── Animated Stats ─────────────────────────────── */}
        <section className="relative z-10 bg-[#0C0C0C] px-6 py-20 sm:py-24 md:px-10 md:py-28">
          {/* Subtle glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, rgba(182,0,168,0.08) 0%, transparent 70%)",
            }}
          />
          <FI y={30}>
            <p className="mb-14 text-center font-heading text-xs font-medium uppercase tracking-[0.35em] text-white/35 md:mb-20">
              Trusted by students across India
            </p>
          </FI>
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-10 md:grid-cols-4 md:gap-6">
            <FI delay={0}><StatCounter target={12450} suffix="+" label="Students" /></FI>
            <FI delay={0.1}><StatCounter target={58200} suffix="+" label="Questions Answered" /></FI>
            <FI delay={0.2}><StatCounter target={8} label="AI Study Modes" /></FI>
            <FI delay={0.3}><StatCounter target={6} label="AI Models" /></FI>
          </div>
        </section>

        {/* ── App Mockup ─────────────────────────────────── */}
        <section className="bg-[#0C0C0C] px-6 pb-20 sm:pb-24 md:px-10 md:pb-28">
          <FI y={40} className="mb-12 text-center">
            <p className="mb-3 font-heading text-xs font-medium uppercase tracking-[0.3em] text-white/35">
              See it in action
            </p>
            <h2
              className="font-heading font-black uppercase leading-none tracking-tight text-white"
              style={{ fontSize: "clamp(2rem, 6vw, 72px)" }}
            >
              Your AI Study Workspace
            </h2>
          </FI>
          <FI delay={0.2} y={50}>
            <AppMockup />
          </FI>
          <FI delay={0.4} className="mt-10 text-center">
            <GradientButton href="/signup">Start for Free</GradientButton>
          </FI>
        </section>

        {/* ── Glowing Feature Cards ──────────────────────── */}
        <FeatureCards />

        {/* ── Capabilities ───────────────────────────────── */}
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
                    borderTop: i === 0 ? undefined : "1px solid rgba(12, 12, 12, 0.15)",
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

        {/* ── Testimonials ───────────────────────────────── */}
        <section className="bg-[#f5f5f5] px-5 py-20 sm:px-8 sm:py-24 md:px-10 md:py-28">
          <FI y={40}>
            <h2
              className="mb-14 text-center font-heading font-black uppercase leading-none tracking-tight text-[#0C0C0C] sm:mb-16 md:mb-20"
              style={{ fontSize: "clamp(2.5rem, 9vw, 120px)" }}
            >
              Students Love It
            </h2>
          </FI>
          <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TESTIMONIALS.map((t, i) => (
              <FI key={t.name} delay={i * 0.1}>
                <div className="flex h-full flex-col gap-4 rounded-2xl border border-black/8 bg-white p-6 shadow-sm">
                  {/* Stars */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, s) => (
                      <svg key={s} className="size-4 fill-amber-400" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-[#0C0C0C]/70">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div>
                    <p className="font-heading text-sm font-semibold uppercase tracking-wide text-[#0C0C0C]">
                      {t.name}
                    </p>
                    <p className="text-xs text-[#0C0C0C]/40">{t.role}</p>
                  </div>
                </div>
              </FI>
            ))}
          </div>
        </section>

        {/* ── Feature Comparison ─────────────────────────── */}
        <section className="bg-white px-5 py-20 sm:px-8 sm:py-24 md:px-10 md:py-28">
          <FI y={40}>
            <h2
              className="mb-14 text-center font-heading font-black uppercase leading-none tracking-tight text-[#0C0C0C] sm:mb-16"
              style={{ fontSize: "clamp(2.5rem, 9vw, 120px)" }}
            >
              Free vs Pro
            </h2>
          </FI>
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-black/10">
            {/* Header */}
            <div className="grid grid-cols-3 border-b border-black/10 bg-[#0C0C0C] px-6 py-4">
              <span className="font-heading text-xs font-medium uppercase tracking-wider text-white/50">
                Feature
              </span>
              <span className="text-center font-heading text-xs font-medium uppercase tracking-wider text-white/50">
                Free
              </span>
              <span className="text-center font-heading text-xs font-bold uppercase tracking-wider text-purple-400">
                Pro
              </span>
            </div>
            {/* Rows */}
            {COMPARISON_ROWS.map((row, i) => (
              <FI key={row.feature} delay={i * 0.04}>
                <div
                  className="grid grid-cols-3 items-center px-6 py-3.5"
                  style={{
                    borderBottom:
                      i < COMPARISON_ROWS.length - 1 ? "1px solid rgba(0,0,0,0.07)" : undefined,
                    background: i % 2 === 0 ? "white" : "#fafafa",
                  }}
                >
                  <span className="text-sm font-medium text-[#0C0C0C]">{row.feature}</span>
                  <div className="flex justify-center">
                    {typeof row.free === "boolean" ? (
                      row.free ? (
                        <CheckIcon className="size-4 text-green-500" />
                      ) : (
                        <XIcon className="size-4 text-black/20" />
                      )
                    ) : (
                      <span className="font-heading text-xs uppercase tracking-wide text-[#0C0C0C]/60">
                        {row.free}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-center">
                    {typeof row.pro === "boolean" ? (
                      row.pro ? (
                        <CheckIcon className="size-4 text-purple-600" />
                      ) : (
                        <XIcon className="size-4 text-black/20" />
                      )
                    ) : (
                      <span className="font-heading text-xs font-bold uppercase tracking-wide text-purple-600">
                        {row.pro}
                      </span>
                    )}
                  </div>
                </div>
              </FI>
            ))}
            {/* Footer CTA */}
            <div className="flex flex-col items-center gap-4 bg-[#0C0C0C] px-6 py-8 sm:flex-row sm:justify-between">
              <p className="text-sm text-white/50">Start free. Upgrade anytime.</p>
              <GradientButton href="/signup">Get Started Free</GradientButton>
            </div>
          </div>
        </section>

        {/* ── CTA (dark) ─────────────────────────────────── */}
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
