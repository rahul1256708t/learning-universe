/** Shared dashboard page header — calm, sentence-case, consistent. */
export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-white md:text-4xl">
        {title}
      </h1>
      <p className="mt-1.5 text-sm text-[#D7E2EA]/50">{subtitle}</p>
    </div>
  )
}
