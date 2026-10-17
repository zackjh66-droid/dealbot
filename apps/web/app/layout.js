import './globals.css';
import './home.css';
import Link from 'next/link';
import Brand from '@/components/Brand';

export const metadata = {
  title: 'Project Zero · Season 7 on Xbox',
  description:
    'Project Zero is an independent Xbox Dev Mode preservation launcher focused on the archived Fortnite Chapter 1 Season 7 client, device linking and client handoff.'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#07080c'
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
                  Project Zero is an independent preservation workspace for Xbox Developer Mode. Only use
                  archived content you are authorised to hold. Game content and trademarks remain the property
                  of their respective rights holders. Project Zero is not affiliated with Epic Games or Microsoft.
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
