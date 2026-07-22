import IntroVideo from '../IntroVideo';

export default function IntroVideoPage() {
  const loomUrl = process.env.NEXT_PUBLIC_LOOM_INTRO_URL?.trim() || null;
  return <IntroVideo loomUrl={loomUrl} />;
}
