"use client";

import { useEffect, useRef } from "react";

/**
 * A glowing particle trail that follows the cursor (mouse/pen) and finger
 * (touch) across the whole app. Rendered on a single fixed, full-screen
 * canvas with `pointer-events: none` so it never blocks clicks.
 *
 * Performance & a11y notes (UI/UX rules):
 *  - Only paints inside one requestAnimationFrame loop (no layout reads/writes,
 *    no DOM nodes per particle) → no reflow / CLS, stays in the frame budget.
 *  - Uses transform-free canvas drawing with additive glow.
 *  - Fully disabled when the user prefers reduced motion.
 *  - The loop idles (stops drawing) once all particles fade out.
 */
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1 → 0
  size: number;
  hue: number;
};

// Brand "universe" palette — magenta → purple → cyan glow.
const HUES = [318, 280, 256, 190];

export function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    // Skip the effect on coarse-pointer-only devices? No — finger trails are
    // explicitly requested, so we keep touch. Only reduced-motion opts out.
    if (reduceMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();

    const particles: Particle[] = [];
    let lastX = 0;
    let lastY = 0;
    let hasLast = false;
    let rafId = 0;
    let running = false;

    const spawn = (x: number, y: number) => {
      // Distance since last sample controls how many particles to emit so
      // fast movements still draw a continuous trail.
      const dist = hasLast ? Math.hypot(x - lastX, y - lastY) : 0;
      const count = hasLast ? Math.min(6, 1 + Math.floor(dist / 6)) : 2;
      const hue = HUES[Math.floor(Math.random() * HUES.length)];

      for (let i = 0; i < count; i++) {
        // Interpolate along the path between the last and current point.
        const t = count > 1 ? i / count : 0;
        const px = hasLast ? lastX + (x - lastX) * t : x;
        const py = hasLast ? lastY + (y - lastY) * t : y;
        particles.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6 - 0.2,
          life: 1,
          size: 6 + Math.random() * 8,
          hue,
        });
      }
      lastX = x;
      lastY = y;
      hasLast = true;
      ensureRunning();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 0.025;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;

        const r = p.size * p.life * dpr;
        const cx = p.x * dpr;
        const cy = p.y * dpr;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${0.5 * p.life})`);
        gradient.addColorStop(1, `hsla(${p.hue}, 100%, 60%, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      if (particles.length > 0) {
        rafId = requestAnimationFrame(draw);
      } else {
        running = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const ensureRunning = () => {
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(draw);
      }
    };

    const handleMove = (e: PointerEvent) => spawn(e.clientX, e.clientY);
    const handleLeave = () => {
      hasLast = false;
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerdown", handleMove, { passive: true });
    window.addEventListener("pointerout", handleLeave, { passive: true });
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerdown", handleMove);
      window.removeEventListener("pointerout", handleLeave);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999]"
    />
  );
}
