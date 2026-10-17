import { Suspense } from 'react';
import LinkClient from './LinkClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container page">
          <div className="page-head">
            <span className="eyebrow">Console link</span>
            <h1>Bind the box</h1>
            <p>Loading handshake…</p>
          </div>
        </div>
      }
    >
      <LinkClient />
    </Suspense>
  );
}
