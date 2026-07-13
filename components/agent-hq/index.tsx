'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardTab from './DashboardTab';
import AccountMenu from './AccountMenu';
import { AuthProvider, useAuth } from './hooks/AuthProvider';
import { WorkTrackerProvider } from './hooks/WorkTrackerProvider';
import { EndSessionProvider } from './hooks/EndSessionProvider';
import { HoverTimerProvider } from './hooks/HoverTimerProvider';
import { HoverNotesProvider } from './hooks/HoverNotesProvider';
import { UserProfileProvider, useUserProfile } from './hooks/UserProfileProvider';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Infraction } from './types';
import { INFRACTIONS_STORAGE_KEY } from './infractions';
import FocusExtensionBridge from './FocusExtensionBridge';
import { StuckHelpProvider } from './hooks/StuckHelpProvider';
import StuckHelpModal from './StuckHelpModal';
import StuckHelpOverlays from './StuckHelpOverlays';
import StuckHelpNavButton from './StuckHelpNavButton';
import EndSessionWorkCompleteDismiss from './EndSessionWorkCompleteDismiss';
import { clearNightPrepDeepLinkParam, readNightPrepDeepLink } from './nightPrepReminder';
import { fetchProfileDisplayName } from '@/lib/supabase/profile';
import OnboardingNameModal from './OnboardingNameModal';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function makeInfractionId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function AgentHQ() {
  return (
    <AuthProvider>
      <UserProfileProvider>
        <WorkTrackerProvider>
          <EndSessionProvider>
            <AgentHQInner />
          </EndSessionProvider>
        </WorkTrackerProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}

function AgentHQInner() {
  const { authEnabled, authRequired, loading: authLoading, user } = useAuth();
  const { profile, completeOnboarding } = useUserProfile();
  const [focusNightPrep, setFocusNightPrep] = useState(false);
  const [infractions, setInfractions] = useLocalStorage<Infraction[]>(INFRACTIONS_STORAGE_KEY, []);
  const addInfraction = useCallback(
    (categoryKey: string, label: string, source: Infraction['source'] = 'dashboard') => {
      setInfractions(prev => [
        ...prev,
        { id: makeInfractionId(), categoryKey, label, createdAt: Date.now(), source },
      ]);
    },
    [setInfractions]
  );

  const openNightPrep = useCallback(() => {
    setFocusNightPrep(true);
  }, []);

  useEffect(() => {
    if (readNightPrepDeepLink()) {
      openNightPrep();
      clearNightPrepDeepLinkParam();
    }
  }, [openNightPrep]);

  useEffect(() => {
    if (!authEnabled || !user || profile.displayName.trim()) return;
    void fetchProfileDisplayName().then(name => {
      if (name) completeOnboarding(name);
    });
  }, [authEnabled, user, profile.displayName, completeOnboarding]);

  if (authRequired && authLoading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f1f5f9',
          color: '#64748b',
          fontFamily: font,
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <HoverTimerProvider onAddInfraction={(k, l) => addInfraction(k, l, 'dashboard')}>
      <HoverNotesProvider>
      <StuckHelpProvider>
        <EndSessionWorkCompleteDismiss />
        <FocusExtensionBridge onAddInfraction={addInfraction} />
        <StuckHelpModal />
        <StuckHelpOverlays />
        <OnboardingNameModal
          open={!profile.onboardingComplete || !profile.displayName.trim()}
          onSubmit={completeOnboarding}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            background: '#f1f5f9',
            overflow: 'hidden',
            fontFamily: font,
          }}
        >
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              background: '#fff',
              borderBottom: '1px solid #e2e8f0',
              flexShrink: 0,
              minHeight: 52,
            }}
          >
            <AccountMenu />
            <StuckHelpNavButton />
          </nav>

          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <DashboardTab
              infractions={infractions}
              focusNightPrep={focusNightPrep}
              onNightPrepFocused={() => setFocusNightPrep(false)}
            />
          </div>
        </div>
      </StuckHelpProvider>
      </HoverNotesProvider>
    </HoverTimerProvider>
  );
}
