import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Galaxy Sports Edge",
  description: "Public proof surfaces for Galaxy Sports Edge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topnav">
            <Link className="brand" href="/">
              Galaxy Sports Edge
            </Link>
            <nav className="links" aria-label="Primary">
              <Link href="/methodology">Methodology</Link>
              <Link href="/loss-room">Loss Room</Link>
              <Link href="/passes">Pass List</Link>
              <Link href="/ledger">Ledger</Link>
              <Link href="/fantasy">Fantasy</Link>
              <Link href="/vault">Vault</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
