import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Daywinner',
  description: 'Accountability for deep work — timer, projects, and end-of-day check-ins.',
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
