import './globals.css';
import './theme.css';
import './brand-font.css';
import './home.css';
import Link from 'next/link';
import Brand from '@/components/Brand';

export const metadata = {
  title: 'Project Zero · Season 7 on Xbox',
  description:
    'Project Zero is an independent Xbox Developer Mode preservation launcher focused on Fortnite Chapter 1 Season 7 build 7.00.'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#08090d'
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
              <nav className="nav-links" aria-label="Primary navigation">
                <Link href="/downloads">Downloads</Link>
                <Link href="/preview/launcher">Launcher</Link>
                <Link href="/account">Account</Link>
                <Link href="/link" className="nav-cta">Link console</Link>
              </nav>
            </div>
          </header>

          <main className="main">{children}</main>

          <footer className="footer">
            <div className="container footer-inner">
              <div>
                <Brand size={34} />
                <p>
                  Independent Xbox Developer Mode preservation project. Use only game content you are authorised
                  to hold. Fortnite and related marks belong to their respective rights holders. Project Zero is
                  not affiliated with Epic Games or Microsoft.
                </p>
              </div>
              <div className="footer-links">
                <Link href="/downloads">Downloads</Link>
                <Link href="/preview/launcher">Launcher</Link>
                <Link href="/link">Link</Link>
                <a href="/api/health">Status</a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
