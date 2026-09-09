import Link from 'next/link'

import './styles.css'

export default function HomePage() {
  return (
    <main className="cms-landing">
      <section>
        <p>DGTL platform</p>
        <h1>One CMS. Four isolated client websites.</h1>
        <div className="cms-landing__actions">
          <Link href="/admin">Open CMS Admin</Link>
          <Link href="/api/health">Health check</Link>
        </div>
      </section>
    </main>
  )
}
