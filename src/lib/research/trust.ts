/**
 * Pure, dependency-free helpers for judging source trust. Safe to import from
 * both server and client (no API keys, no fetch).
 */

/** Domains we treat as high-trust for education / research / coding. */
export const TRUSTED_DOMAINS = [
  "ncert.nic.in", "nic.in", "gov.in", ".gov", ".edu", "wikipedia.org",
  "nature.com", "sciencedirect.com", "ncbi.nlm.nih.gov", "arxiv.org",
  "developer.mozilla.org", "docs.python.org", "react.dev", "nextjs.org",
  "khanacademy.org", "britannica.com", "byjus.com", "geeksforgeeks.org",
  "stackoverflow.com", "w3.org", "ietf.org",
]

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function isTrustedDomain(url: string): boolean {
  const host = domainOf(url).toLowerCase()
  return TRUSTED_DOMAINS.some((d) => host.includes(d.replace(/^\./, "")))
}
