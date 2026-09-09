import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: '2rem', background: '#050706', color: '#fff', textAlign: 'center' }}>
      <div>
        <p style={{ fontFamily: 'var(--font-mono)', letterSpacing: '.1em' }}>404 · WRONG DOOR</p>
        <h1 style={{ margin: '1rem 0 2rem', fontFamily: 'var(--font-display)', fontSize: 'clamp(4rem, 12vw, 10rem)', lineHeight: '.82', letterSpacing: '-.07em' }}>There’s nothing<br />behind this one.</h1>
        <Link href="/" style={{ textDecoration: 'underline', textUnderlineOffset: '.4rem' }}>BACK TO DGTL 360 ↗</Link>
      </div>
    </main>
  );
}
