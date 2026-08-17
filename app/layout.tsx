import type { Metadata } from 'next';
import { PRODUCTION_SITE_ORIGIN } from '@/lib/site';
import './globals.css';

const SEO_TITLE = 'Daywinner bot';
const SEO_DESCRIPTION = 'Prioritize your #1 task. Set your timer. Go.';
const OG_IMAGE = {
  url: '/daywinner-bot.png',
  width: 1024,
  height: 1024,
  alt: SEO_TITLE,
};

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCTION_SITE_ORIGIN),
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  openGraph: {
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    url: PRODUCTION_SITE_ORIGIN,
    siteName: SEO_TITLE,
    type: 'website',
    locale: 'en_US',
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary',
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="m-0 min-h-full bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
