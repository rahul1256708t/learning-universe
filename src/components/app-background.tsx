import type { ReactNode } from "react"

export function AppBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070D] text-foreground">
      {/* Faint cosmic texture — brand nod, kept quiet */}
      <div className="absolute inset-0 bg-[url('/cosmic-field.svg')] bg-cover bg-center opacity-15" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% -10%, rgba(99,102,241,0.12), transparent 70%), linear-gradient(180deg, rgba(5,7,13,0.35), rgba(5,7,13,0.92))",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
