"use client"

import { useEffect, useRef } from "react"

/**
 * Plays a soft "bubble pop" sound on every click across the app.
 * The sound is synthesised with the Web Audio API so no audio asset is needed.
 * An AudioContext can only be created/resumed after a user gesture, so it is
 * lazily initialised on the first interaction.
 */
export function ClickSound() {
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    // Respect users who prefer reduced motion / minimal effects.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduceMotion) return

    const getCtx = () => {
      if (!ctxRef.current) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AudioCtx) return null
        ctxRef.current = new AudioCtx()
      }
      if (ctxRef.current.state === "suspended") {
        void ctxRef.current.resume()
      }
      return ctxRef.current
    }

    const playBubble = () => {
      const ctx = getCtx()
      if (!ctx) return

      const now = ctx.currentTime

      // Oscillator: quick upward pitch sweep gives the "bloop" bubble feel.
      const osc = ctx.createOscillator()
      osc.type = "sine"
      osc.frequency.setValueAtTime(420, now)
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.09)

      // Gain envelope: fast attack, short decay so it stays subtle.
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.18)
    }

    const handlePointerDown = (event: PointerEvent) => {
      // Only react to primary interactions (left click / touch / pen).
      if (event.button !== 0) return
      playBubble()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      void ctxRef.current?.close()
      ctxRef.current = null
    }
  }, [])

  return null
}
