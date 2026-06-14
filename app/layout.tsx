import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ["ai meeting assistant", "open source granola alternative", "ai meeting notes", "meeting transcription", "private meeting notes", "self-hosted meeting notes"],
  openGraph: { title: SITE.name, description: SITE.description, url: SITE.url, siteName: SITE.name, type: "website" },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description },
  alternates: { canonical: SITE.url },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE.name,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web (Chromium browsers)",
  description: SITE.description,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  url: SITE.url,
};

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-[var(--paper)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-600 text-sm text-white">P</span>
          Parley<span className="text-emerald-600">Notes</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-stone-600">
          <Link href="/transcribe" className="hidden hover:text-stone-900 sm:inline">Transcribe</Link>
          <Link href="/alternatives" className="hidden hover:text-stone-900 sm:inline">Alternatives</Link>
          <Link href="/use-cases" className="hidden hover:text-stone-900 md:inline">Use cases</Link>
          <Link href="/pricing" className="hover:text-stone-900">Pricing</Link>
          <a href={SITE.repo} className="hidden hover:text-stone-900 sm:inline" target="_blank" rel="noreferrer">GitHub</a>
          <Link href="/app" className="rounded-lg bg-stone-900 px-3 py-1.5 font-medium text-white hover:bg-stone-700">Open app</Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-stone-200 bg-white/50">
      <div className="mx-auto max-w-6xl px-5 py-10 text-sm text-stone-500">
        <div className="grid gap-6 sm:grid-cols-4">
          <div>
            <div className="font-bold text-stone-800">{SITE.name}</div>
            <p className="mt-2 max-w-xs text-xs text-stone-400">{SITE.tagline}. Audio is transcribed on your device and never uploaded.</p>
          </div>
          <FooterCol title="Product" links={[["Open app", "/app"], ["Pricing", "/pricing"], ["Open source", "/open-source"]]} />
          <FooterCol title="Transcribe" links={[["Zoom", "/transcribe/zoom"], ["Google Meet", "/transcribe/google-meet"], ["Microsoft Teams", "/transcribe/microsoft-teams"]]} />
          <FooterCol title="Alternatives" links={[["Granola", "/alternatives/granola"], ["Otter.ai", "/alternatives/otter-ai"], ["Fireflies", "/alternatives/fireflies-ai"]]} />
        </div>
        <p className="mt-8 text-xs text-stone-400">© {new Date().getFullYear()} {SITE.name}. Open source under the MIT licence. Free forever for individuals.</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">{title}</div>
      <ul className="mt-2 space-y-1.5">
        {links.map(([label, href]) => (
          <li key={href}><Link href={href} className="hover:text-stone-900">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
