'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="site-state">
      <p>Temporary interruption</p>
      <h1>We couldn’t load this page.</h1>
      <button onClick={reset} type="button">Try again</button>
    </main>
  );
}
