import './globals.css';
import Link from 'next/link';
import Brand from '@/components/Brand';

export const metadata = {
  title: 'Project Zero · Console Division',
  description:
    'Project Zero is a private Xbox Dev Mode home for Season 6 and Season 7 console builds: device linking, account creation and launcher handoff.'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#06050a'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="nav">
            <div className="container nav-inner">
              <Link href="/" aria-label="Project Zero home">
                <Brand />
              </Link>
              <nav className="nav-links">
                <Link href="/builds">Builds</Link>
                <Link href="/preview/launcher">Launcher</Link>
                <Link href="/account">Account</Link>
                <Link href="/link" className="nav-cta">
                  Link console
                </Link>
              </nav>
            </div>
          </header>
          <main className="main">{children}</main>
          <footer className="footer">
            <div className="container footer-inner">
              <div>
                <Brand size={30} />
                <p>
                  Project Zero is an independent preservation workspace for Xbox Dev Mode. It hosts no game
                  binaries and runs no official services. Builds remain the property of their rights holders.
                  Not affiliated with Epic Games or Microsoft.
                </p>
              </div>
              <div className="footer-links">
                <Link href="/builds">Registry</Link>
                <Link href="/preview/launcher">Launcher UI</Link>
                <a href="/api/health">Status</a>
                <a href="https://github.com/zackjh66-droid/dealbot">Source</a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
