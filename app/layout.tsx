import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Daywinner',
  description:
    'Daywinner bot is a productivity dashboard that functions as your "work homebase" — a tab in your browser that helps you organize & finish the tasks you need to do to hit your first six figures (or make your first $1 online), finally build & launch the project you\'ve been sitting on, pass any exam, or land the remote job you actually want. Here\'s the key: You don\'t have a discipline problem — you just have no structure. Until now. Daywinner bot helps you build your tasks and work sessions the way 7-figure entrepreneurs run theirs while blocking your most distracting websites, so you get sh*t done and make more progress in 30 days than you have in the last 5 years.',
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
