import { Suspense } from 'react';
import LinkClient from './LinkClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container page">
          <header className="page-head">
            <span className="eyebrow">CONSOLE LINK</span>
            <h1>Link your Xbox.</h1>
            <p>Loading the console handshake…</p>
          </header>
        </div>
      }
    >
      <LinkClient />
    </Suspense>
  );
}
