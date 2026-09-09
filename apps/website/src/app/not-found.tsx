import Link from 'next/link'

export default function NotFound() {
  return <main className="error-page"><p>404</p><h1>That page has moved—or never existed.</h1><Link className="button" href="/">Return home ↗</Link></main>
}
