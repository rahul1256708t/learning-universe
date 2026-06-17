import type { ReactNode } from "react"

export function AppBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[url('/cosmic-field.svg')] bg-cover bg-center opacity-85" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.2),transparent_30%),radial-gradient(circle_at_88%_20%,rgba(245,158,11,0.13),transparent_25%),radial-gradient(circle_at_74%_84%,rgba(244,114,182,0.15),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.32),rgba(2,6,23,0.97))]" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
