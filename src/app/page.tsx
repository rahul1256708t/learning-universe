"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  BrainCircuitIcon,
  CheckIcon,
  CircleHelpIcon,
  GlobeIcon,
  LayersIcon,
  LockIcon,
  RocketIcon,
  SearchIcon,
  SparklesIcon,
  TrendingUpIcon,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════
   Learning Universe — landing page.
   Direction: minimal SaaS ("Serein"-style hero, motion used sparingly),
   executed like a big-tech product page: calm type, one accent,
   honest copy, and the product itself as the hero demo.
   ════════════════════════════════════════════════════════════════ */

const INK = "#05070D";
const ACCENT_GRADIENT = "linear-gradient(90deg, #22D3EE 0%, #818CF8 100%)";

/* ── Scroll-reveal wrapper ───────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 0.61, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Buttons ─────────────────────────────────────────────────── */
function PrimaryButton({
  children,
  href,
  dark = false,
}: {
  children: React.ReactNode;
  href: string;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:px-7 ${
        dark
          ? "bg-[#05070D] text-white hover:shadow-black/20"
          : "bg-white text-[#05070D] hover:shadow-white/10"
      }`}
    >
      {children}
      <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

function GhostButton({
  children,
  href,
  dark = false,
}: {
  children: React.ReactNode;
  href: string;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition-colors duration-200 sm:px-7 ${
        dark
          ? "border-black/15 text-[#05070D] hover:bg-black/5"
          : "border-white/20 text-white hover:bg-white/8"
      }`}
    >
      {children}
    </Link>
  );
}

/* ── Signature: the Research Console demo ─────────────────────
   An auto-playing simulation of a real agent run. This is the
   product's core loop shown truthfully — steps, sources, cited
   answer, confidence — not decorative animation.               */

const DEMO_QUESTION = "Why is the sky blue at noon but red at sunset?";
const DEMO_STEPS = ["Understand", "Search", "Read", "Verify", "Write"] as const;
const DEMO_SOURCES = [
  { name: "NASA Space Place", domain: "spaceplace.nasa.gov" },
  { name: "NOAA SciJinks", domain: "scijinks.gov" },
  { name: "The Physics Classroom", domain: "physicsclassroom.com" },
];
const DEMO_ANSWER =
  "Sunlight scatters off air molecules, and shorter blue wavelengths scatter the most — so the daytime sky looks blue [1]. At sunset, light travels through much more atmosphere, the blue is scattered away, and the longer red wavelengths reach your eyes [2][3].";

/* Timeline (ms from start): when each step becomes active. */
const STEP_TIMES = [400, 1400, 2600, 3900, 4900];
const SOURCE_TIMES = [2700, 3100, 3500];
const TYPE_START = 5200;
const TYPE_SPEED = 14; // ms per character
const LOOP_PAUSE = 5000;

function ResearchConsole() {
  const reduceMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (reduceMotion) return;
    let start = performance.now();
    const total = TYPE_START + DEMO_ANSWER.length * TYPE_SPEED + LOOP_PAUSE;
    const tick = (now: number) => {
      const t = now - start;
      if (t >= total) start = now;
      setElapsed(t % total);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [reduceMotion]);

  // With reduced motion, render the finished state.
  const t = reduceMotion ? Number.POSITIVE_INFINITY : elapsed;
  const typedChars = Math.max(0, Math.floor((t - TYPE_START) / TYPE_SPEED));
  const answer = DEMO_ANSWER.slice(0, typedChars);
  const doneTyping = typedChars >= DEMO_ANSWER.length;

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* Single restrained accent glow */}
      <div
        className="pointer-events-none absolute -inset-6 rounded-[32px] opacity-25 blur-3xl"
        style={{ background: ACCENT_GRADIENT }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-[#0A0E17] shadow-2xl shadow-black/50">
        {/* Window bar */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
          </div>
          <span className="font-mono text-[11px] text-white/35">Research Agent</span>
          <span className="w-14" />
        </div>

        <div className="grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
          {/* Pipeline rail */}
          <div className="hidden flex-col gap-1 border-r border-white/8 p-4 md:flex">
            {DEMO_STEPS.map((step, i) => {
              const active = t >= STEP_TIMES[i];
              const current =
                active && (i === DEMO_STEPS.length - 1 ? !doneTyping : t < STEP_TIMES[i + 1]);
              return (
                <div
                  key={step}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors duration-300 ${
                    active ? "text-white" : "text-white/30"
                  } ${current ? "bg-white/6" : ""}`}
                >
                  <span
                    className={`grid size-4.5 shrink-0 place-items-center rounded-full border text-[9px] transition-colors duration-300 ${
                      active && !current
                        ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-300"
                        : current
                          ? "border-cyan-400/60 text-cyan-300"
                          : "border-white/15 text-white/25"
                    }`}
                  >
                    {active && !current ? <CheckIcon className="size-2.5" /> : i + 1}
                  </span>
                  {step}
                  {current ? (
                    <motion.span
                      className="ml-auto size-1.5 rounded-full bg-cyan-300"
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Conversation */}
          <div className="flex min-h-[320px] flex-col gap-3.5 p-5">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/8 px-4 py-2.5 text-[13px] leading-relaxed text-white/85">
              {DEMO_QUESTION}
            </div>

            {/* Source chips appear while "reading" */}
            <div className="flex min-h-7 flex-wrap gap-1.5">
              {DEMO_SOURCES.map((s, i) =>
                t >= SOURCE_TIMES[i] ? (
                  <motion.span
                    key={s.domain}
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/4 px-2.5 py-1 text-[11px] text-white/60"
                  >
                    <GlobeIcon className="size-3 text-cyan-300/80" />
                    {s.name}
                    <span className="hidden font-mono text-[10px] text-white/30 sm:inline">
                      {s.domain}
                    </span>
                  </motion.span>
                ) : null
              )}
            </div>

            {/* Streamed answer */}
            <div className="max-w-[95%] rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-cyan-300/90">
                <SparklesIcon className="size-3" />
                Answer · cited
              </p>
              <p className="min-h-16 text-[13px] leading-relaxed text-white/80">
                {answer ? (
                  renderWithCitations(answer)
                ) : (
                  <span className="text-white/30">
                    {t < STEP_TIMES[1]
                      ? "Understanding the question…"
                      : t < STEP_TIMES[3]
                        ? "Reading trusted sources…"
                        : "Verifying facts across sources…"}
                  </span>
                )}
                {answer && !doneTyping ? (
                  <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-cyan-300 align-middle" />
                ) : null}
              </p>
              {doneTyping ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2.5 flex items-center gap-2 border-t border-white/8 pt-2.5"
                >
                  <span className="text-[11px] text-white/40">Confidence</span>
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full w-[92%] rounded-full"
                      style={{ background: ACCENT_GRADIENT }}
                    />
                  </span>
                  <span className="text-[11px] font-medium text-cyan-300">92%</span>
                  <span className="ml-auto hidden text-[11px] text-white/35 sm:block">
                    3 sources verified
                  </span>
                </motion.div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Highlight [n] citation markers in the demo answer. */
function renderWithCitations(text: string) {
  return text.split(/(\[\d\])/).map((part, i) =>
    /^\[\d\]$/.test(part) ? (
      <sup key={i} className="mx-px font-medium text-cyan-300">
        {part}
      </sup>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/* ── Content data ────────────────────────────────────────────── */

const PIPELINE = [
  {
    title: "Understands the question",
    body: "The agent classifies what you asked — a school doubt, homework, current information, or deep research — and picks the right strategy.",
  },
  {
    title: "Searches trusted sources",
    body: "When facts are needed, it searches the live web and prefers official, educational, and documentation sources over random pages.",
  },
  {
    title: "Verifies before answering",
    body: "It compares what different sources say, drops weak or outdated ones, and flags disagreements instead of hiding them.",
  },
  {
    title: "Answers with citations",
    body: "Every researched answer carries inline citations and a confidence score. If the evidence is thin, it says so — it never invents sources.",
  },
  {
    title: "Turns it into study tools",
    body: "One tap converts any answer into revision notes, spaced-repetition flashcards, or a scored practice quiz.",
  },
];

const FEATURES = [
  {
    icon: SearchIcon,
    title: "Deep research, cited",
    body: "Live web research with inline citations, a confidence score, and a list of exactly what was checked.",
  },
  {
    icon: BrainCircuitIcon,
    title: "10 research modes",
    body: "Fast, Deep, NCERT, Exam, Coding, Tutor, Homework, Notes, Quiz, and Formula — each tunes how the agent searches and writes.",
  },
  {
    icon: LayersIcon,
    title: "Spaced-repetition flashcards",
    body: "Generate a deck from any topic. Cards come back right before you'd forget them — rate Again, Good, or Easy.",
  },
  {
    icon: CircleHelpIcon,
    title: "Interactive quizzes",
    body: "Fresh MCQs at the difficulty you choose, with instant feedback, explanations, and saved scores.",
  },
  {
    icon: TrendingUpIcon,
    title: "Progress that's yours",
    body: "Streaks, study time, quiz accuracy, and cards due — every session saved to your account.",
  },
  {
    icon: LockIcon,
    title: "Private by design",
    body: "API keys stay on the server. Your data is protected by row-level security — only you can read your chats.",
  },
];

const FAQS = [
  {
    q: "Is Learning Universe free to use?",
    a: "Yes. Create an account and start researching, generating flashcards, and taking quizzes at no cost.",
  },
  {
    q: "How is this different from a normal AI chatbot?",
    a: "A chatbot answers from memory. Learning Universe is a research agent: it decides whether your question needs live information, searches trusted sources, verifies them against each other, and cites what it used. When it isn't sure, it tells you.",
  },
  {
    q: "Which AI models does it use?",
    a: "Claude, GPT-4o, Gemini, Llama, and Mistral through OpenRouter. You can pick a model per question, and if one fails the agent automatically falls back to another so you still get an answer.",
  },
  {
    q: "Does it work for NCERT and board exams?",
    a: "Yes — NCERT and Exam modes format answers the way school boards expect: precise definitions, numbered points, and step-by-step working. Homework mode shows every step and boxes the final answer.",
  },
  {
    q: "Can it invent sources?",
    a: "No. Citations only ever point to sources the agent actually read during your question. If it can't find reliable sources, it lowers its confidence score and says so instead of guessing.",
  },
];

const MODEL_NAMES = ["Claude", "GPT-4o", "Gemini", "Llama 3.1", "Mistral"];

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
];

/* ── Page ────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <main className="bg-white text-[#05070D]" style={{ overflowX: "clip" }}>
      {/* ═══ Dark canopy: nav + hero + demo + models ═══ */}
      <div className="relative" style={{ background: INK }}>
        {/* Faint cosmic texture — brand nod, kept quiet */}
        <div className="pointer-events-none absolute inset-0 bg-[url('/cosmic-field.svg')] bg-cover bg-center opacity-20" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% -10%, rgba(99,102,241,0.18), transparent 70%)",
          }}
        />

        {/* Nav */}
        <header className="relative">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg border border-white/15 bg-white/5 text-white">
                <RocketIcon className="size-3.5" />
              </span>
              <span className="font-heading text-[15px] font-semibold tracking-tight text-white">
                Learning Universe
              </span>
            </Link>
            <div className="hidden items-center gap-8 text-sm text-white/60 md:flex">
              {NAV_LINKS.map((link) => (
                <a key={link.label} href={link.href} className="transition-colors hover:text-white">
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden text-sm text-white/60 transition-colors hover:text-white sm:block"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-white px-4.5 py-2 text-sm font-medium text-[#05070D] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/10"
              >
                Get started
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/4 px-3.5 py-1.5 text-xs font-medium text-white/60">
                <span
                  className="inline-block size-1.5 rounded-full"
                  style={{ background: ACCENT_GRADIENT }}
                />
                AI research agent for students
              </p>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 0.61, 0.36, 1] }}
              className="font-heading text-4xl font-semibold leading-[1.06] tracking-tight text-white sm:text-5xl md:text-6xl"
            >
              Study with an agent
              <br />
              that{" "}
              <span
                style={{
                  background: ACCENT_GRADIENT,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                shows its sources
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16, ease: [0.22, 0.61, 0.36, 1] }}
              className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/55 md:text-lg"
            >
              Learning Universe researches your question across trusted sources, verifies the facts,
              and answers with citations — then turns it into notes, flashcards, and quizzes.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <PrimaryButton href="/signup">Start researching free</PrimaryButton>
              <GhostButton href="#how-it-works">See how it works</GhostButton>
            </motion.div>
          </div>

          {/* Signature demo */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
            className="mt-14 md:mt-16"
          >
            <ResearchConsole />
          </motion.div>

          {/* Model strip */}
          <Reveal delay={0.1} className="mt-14">
            <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-white/30">
              Powered by the models you already trust
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
              {MODEL_NAMES.map((name) => (
                <span
                  key={name}
                  className="font-heading text-lg font-medium tracking-tight text-white/35 transition-colors hover:text-white/60"
                >
                  {name}
                </span>
              ))}
            </div>
          </Reveal>
        </section>
      </div>

      {/* ═══ How it works ═══ */}
      <section id="how-it-works" className="scroll-mt-20 bg-white px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-black/40">
              How it works
            </p>
            <h2 className="mt-3 max-w-2xl font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              Not a chatbot. A research pipeline that runs on every question.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-x-10 gap-y-10 md:mt-16 md:grid-cols-2 lg:grid-cols-3">
            {PIPELINE.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.06}>
                <div className="flex gap-4">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                    style={{ background: INK }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-heading text-lg font-medium tracking-tight">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-black/55">{step.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
            {/* Pipeline CTA card fills the last cell */}
            <Reveal delay={0.3}>
              <Link
                href="/signup"
                className="group flex h-full min-h-28 items-center justify-between rounded-2xl border border-black/10 bg-[#F5F7FA] px-6 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="font-heading text-lg font-medium tracking-tight">
                  Run your first research
                </span>
                <span
                  className="grid size-9 place-items-center rounded-full text-white transition-transform duration-200 group-hover:translate-x-1"
                  style={{ background: INK }}
                >
                  <ArrowRightIcon className="size-4" />
                </span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ Features ═══ */}
      <section id="features" className="scroll-mt-20 bg-[#F5F7FA] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-black/40">Features</p>
            <h2 className="mt-3 max-w-2xl font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              Everything a study session needs, in one workspace.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.05}>
                <div className="group h-full rounded-2xl border border-black/8 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
                  <span className="mb-4 grid size-10 place-items-center rounded-xl border border-black/8 bg-[#F5F7FA] transition-colors duration-200 group-hover:border-transparent group-hover:text-white group-hover:[background:linear-gradient(90deg,#22D3EE,#818CF8)]">
                    <feature.icon className="size-4.5" />
                  </span>
                  <h3 className="font-heading text-lg font-medium tracking-tight">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-black/55">{feature.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Study loop spotlight (dark) ═══ */}
      <section className="relative overflow-hidden px-5 py-20 md:px-8 md:py-28" style={{ background: INK }}>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[400px]"
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 50% 110%, rgba(34,211,238,0.12), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
              The study loop
            </p>
            <h2 className="mt-3 font-heading text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl md:text-[2.75rem]">
              Research once. Revise until it sticks.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/55">
              Every answer can become study material in one tap. Flashcards come back on a
              spaced-repetition schedule — right before you&apos;d forget. Quizzes score themselves
              and explain every option. Your progress page keeps the receipts.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {[
                "Decks generated from any topic or answer",
                "Again / Good / Easy ratings reschedule each card",
                "Quiz accuracy and streaks tracked automatically",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-white/70">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <PrimaryButton href="/signup">Try the study tools</PrimaryButton>
            </div>
          </Reveal>

          {/* Flashcard + quiz vignette */}
          <Reveal delay={0.15}>
            <div className="relative mx-auto max-w-md">
              {/* Flashcard */}
              <div className="rounded-2xl border border-white/12 bg-[#0A0E17] p-6 shadow-2xl shadow-black/40">
                <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/35">
                  <LayersIcon className="size-3" />
                  Flashcard · Photosynthesis
                </p>
                <p className="text-[15px] font-medium leading-relaxed text-white/90">
                  Which pigment absorbs light energy in photosynthesis?
                </p>
                <p className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/8 px-4 py-2.5 text-sm text-cyan-100/90">
                  Chlorophyll — mainly chlorophyll-a in the chloroplasts.
                </p>
                <div className="mt-4 flex gap-2">
                  {[
                    { label: "Again", cls: "border-rose-400/30 text-rose-200" },
                    { label: "Good", cls: "border-cyan-400/30 text-cyan-200" },
                    { label: "Easy", cls: "border-emerald-400/30 text-emerald-200" },
                  ].map((b) => (
                    <span
                      key={b.label}
                      className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium ${b.cls}`}
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              </div>
              {/* Quiz card, offset */}
              <div className="ml-8 mt-4 rounded-2xl border border-white/12 bg-[#0A0E17] p-5 shadow-2xl shadow-black/40 sm:-mt-6 sm:ml-24">
                <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/35">
                  <CircleHelpIcon className="size-3" />
                  Quiz · 4 of 5
                </p>
                <p className="text-sm font-medium text-white/85">
                  SI unit of electric current?
                </p>
                <div className="mt-3 flex flex-col gap-1.5 text-[13px]">
                  <span className="rounded-lg border border-white/10 px-3 py-1.5 text-white/45">
                    Volt
                  </span>
                  <span className="flex items-center justify-between rounded-lg border border-emerald-400/50 bg-emerald-400/12 px-3 py-1.5 text-emerald-100">
                    Ampere
                    <CheckIcon className="size-3.5" />
                  </span>
                  <span className="rounded-lg border border-white/10 px-3 py-1.5 text-white/45">
                    Ohm
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ Honest numbers ═══ */}
      <section className="bg-white px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-10 text-center md:grid-cols-4">
          {[
            { value: "10", label: "Research modes" },
            { value: "7", label: "AI models" },
            { value: "100%", label: "Researched answers cited" },
            { value: "₹0", label: "To get started" },
          ].map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.06}>
              <p className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-black/45">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="scroll-mt-20 bg-[#F5F7FA] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-black/40">
              FAQ
            </p>
            <h2 className="mt-3 text-center font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Common questions
            </h2>
          </Reveal>
          <div className="mt-10 flex flex-col gap-3">
            {FAQS.map((faq, i) => (
              <Reveal key={faq.q} delay={i * 0.04}>
                <details className="group rounded-2xl border border-black/8 bg-white px-6 py-4 open:pb-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-[15px] font-medium tracking-tight [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-black/10 text-black/40 transition-transform duration-200 group-open:rotate-45">
                      <svg className="size-3" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-black/55">{faq.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Final CTA ═══ */}
      <section className="relative overflow-hidden px-5 py-24 md:px-8 md:py-32" style={{ background: INK }}>
        <div className="pointer-events-none absolute inset-0 bg-[url('/cosmic-field.svg')] bg-cover bg-center opacity-15" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-full"
          style={{
            background:
              "radial-gradient(ellipse 55% 60% at 50% 0%, rgba(129,140,248,0.15), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal>
            <h2 className="font-heading text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Ask better questions.
              <br />
              Get answers you can check.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base text-white/50">
              Free to start. Works for homework, boards, NCERT, and beyond.
            </p>
          </Reveal>
          <Reveal delay={0.15} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryButton href="/signup">Create free account</PrimaryButton>
            <GhostButton href="/login">Sign in</GhostButton>
          </Reveal>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-white/8 px-5 py-10 md:px-8" style={{ background: INK }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-lg border border-white/15 bg-white/5 text-white">
              <RocketIcon className="size-3" />
            </span>
            <span className="font-heading text-sm font-semibold tracking-tight text-white">
              Learning Universe
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/45">
            <Link href="/dashboard" className="transition-colors hover:text-white">
              Dashboard
            </Link>
            <Link href="/dashboard/models" className="transition-colors hover:text-white">
              Models
            </Link>
            <Link href="/signup" className="transition-colors hover:text-white">
              Get started
            </Link>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-white/35">
            <BookOpenCheckIcon className="size-3.5" />
            Built by Rahul Gupta
          </p>
        </div>
      </footer>
    </main>
  );
}
