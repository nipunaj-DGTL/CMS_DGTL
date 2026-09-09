'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="error-page">
          <p>Service interruption</p>
          <h1>The website is temporarily unavailable.</h1>
          <button className="button" onClick={reset}>Try again ↗</button>
        </main>
      </body>
    </html>
  )
}
