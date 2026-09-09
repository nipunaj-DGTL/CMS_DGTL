'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="site-state">
          <p>Service interruption</p>
          <h1>The website is temporarily unavailable.</h1>
          <button onClick={reset} type="button">Try again</button>
        </main>
      </body>
    </html>
  );
}
