import type { Metadata, Viewport } from "next";
import Link from "next/link";
import VapiNoiseGuard from "@/components/VapiNoiseGuard";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vantora — Cold_Calling_Agent",
  description:
    "Vantora Cold_Calling_Agent: live AI voice for outbound sales — browser calls, phone dialer, recordings, and transcripts in English and Urdu.",
  applicationName: "Vantora Cold_Calling_Agent",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b100e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <VapiNoiseGuard />
        <div className="shell">
          <header className="site-header">
            <Link href="/" className="brand">
              Van<span>tora</span>
            </Link>
            <nav className="nav" aria-label="Primary">
              <Link href="/#demo" className="nav-btn primary">
                Demo
              </Link>
              <Link href="/#talk" className="nav-btn">
                Call Agent
              </Link>
              <Link href="/calls" className="nav-btn">
                Call History
              </Link>
            </nav>
          </header>
          {children}
          <footer className="site-footer">
            Vantora · AI outbound voice · Permanent archive · Demo Samples · EN / Urdu
          </footer>
        </div>
      </body>
    </html>
  );
}
