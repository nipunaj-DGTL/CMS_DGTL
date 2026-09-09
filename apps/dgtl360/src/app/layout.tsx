import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const deploymentHost =
  process.env.SITE_URL ??
  process.env.VERCEL_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL;

const metadataBase = new URL(
  deploymentHost
    ? deploymentHost.startsWith('http')
      ? deploymentHost
      : `https://${deploymentHost}`
    : 'http://localhost:3102',
);

const interfaceFont = Geist({
  variable: '--font-interface',
  subsets: ['latin'],
});

const monoFont = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: 'DGTL 360 — Make the thing. Make it land. Make it work.',
    template: '%s — DGTL 360',
  },
  description:
    'DGTL 360 brings brand, production, product, growth, digital systems, experiences and agentic AI together through one Colombo crew.',
  openGraph: {
    title: 'DGTL 360 — Make the thing. Make it land. Make it work.',
    description: 'One Colombo crew connecting brand, production, product, growth, digital systems, experiences and agentic AI.',
    images: [{ url: '/og.png', width: 1730, height: 909, alt: 'DGTL 360 — Make the thing. Make it land. Make it work.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DGTL 360 — Make the thing. Make it land. Make it work.',
    description: 'One Colombo crew connecting brand, production, product, growth, digital systems, experiences and agentic AI.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${interfaceFont.variable} ${monoFont.variable}`}>{children}</body>
    </html>
  );
}
