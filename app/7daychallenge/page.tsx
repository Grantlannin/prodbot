import type { Metadata } from 'next';
import ChallengeLandingPage from '@/components/marketing/ChallengeLandingPage';

export const metadata: Metadata = {
  title: 'The 7-day Get Sh*t Done Challenge | Daywinner bot',
  description:
    'A 7-day challenge to run the Simple productivity system with your Daywinner bot — tee up your #1 task, lock in, and actually get sh*t done. Start for $1.',
};

export default function SevenDayChallengePage() {
  return <ChallengeLandingPage />;
}
