"use client";

import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef, type CSSProperties } from "react";

interface AnimatedTextProps {
  text: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Character-by-character scroll reveal. Each character fades from 0.2 -> 1
 * opacity as the paragraph passes through the viewport.
 */
export function AnimatedText({ text, className, style }: AnimatedTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.2"],
  });

  const chars = text.split("");

  return (
    <p ref={ref} className={className} style={style}>
      {chars.map((char, i) => {
        const start = i / chars.length;
        const end = start + 1 / chars.length;
        return (
          <Char key={i} progress={scrollYProgress} range={[start, end]}>
            {char}
          </Char>
        );
      })}
    </p>
  );
}

function Char({
  children,
  progress,
  range,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.2, 1]);
  // Non-breaking space keeps the placeholder from collapsing on whitespace.
  const display = children === " " ? " " : children;

  return (
    <span className="relative inline-block">
      {/* Invisible placeholder reserves layout space. */}
      <span className="opacity-0">{display}</span>
      <motion.span
        style={{ opacity }}
        className="absolute left-0 top-0"
        aria-hidden
      >
        {display}
      </motion.span>
    </span>
  );
}
