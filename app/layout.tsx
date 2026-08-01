import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Daywinner',
  description:
    'Daywinner bot is your "work homebase" that sits as a tab on your browser that helps you hit your first six figures (or make your first $1 online), finally build & ship the project you\'ve been sitting on, land the remote job you actually want. Daywinner bot helps people get sh*t done & follow their dreams by structuring their work blocks and blocking distractions the way 7-figure entrepreneurs do — so you make more progress in 30 days than you have in the last 5 years.',
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
