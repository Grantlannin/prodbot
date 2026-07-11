import { AuthProvider } from '@/components/agent-hq/hooks/AuthProvider';

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
