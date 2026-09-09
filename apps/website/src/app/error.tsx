'use client'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="error-page"><p>Temporary interruption</p><h1>We couldn’t load this page.</h1><button className="button" onClick={reset}>Try again ↗</button></main>
}
