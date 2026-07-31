'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardTab from './DashboardTab';
import AccountMenu from './AccountMenu';
import { AuthProvider, useAuth } from './hooks/AuthProvider';
import { WorkTrackerProvider } from './hooks/WorkTrackerProvider';
import { EndSessionProvider } from './hooks/EndSessionProvider';
import { HoverTimerProvider } from './hooks/HoverTimerProvider';
import { HoverNotesProvider } from './hooks/HoverNotesProvider';
import { ProjectsProvider } from './hooks/ProjectsProvider';
import { CloudSyncProvider } from './hooks/CloudSyncProvider';
import { UserProfileProvider, useUserProfile } from './hooks/UserProfileProvider';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Infraction } from './types';
import { INFRACTIONS_STORAGE_KEY } from './infractions';
import FocusExtensionBridge from './FocusExtensionBridge';
import { StuckHelpProvider } from './hooks/StuckHelpProvider';
import { NightPrepProvider } from './hooks/NightPrepProvider';
import { MorningFlowProvider } from './hooks/MorningFlowProvider';
import StuckHelpModal from './StuckHelpModal';
import NightPrepModal from './NightPrepModal';
import MorningFlowModal from './MorningFlowModal';
import StuckHelpOverlays from './StuckHelpOverlays';
import StuckHelpNavButton from './StuckHelpNavButton';
import FocusExtensionModal from './FocusExtensionModal';
import GetCourseModal from './GetCourseModal';
import EndSessionWorkCompleteDismiss from './EndSessionWorkCompleteDismiss';
import { clearNightPrepDeepLinkParam, readNightPrepDeepLink } from './nightPrepReminder';
import { fetchProfileDisplayName } from '@/lib/supabase/profile';
import { isPlaceholderDisplayName } from './userProfile';
import OnboardingNameModal from './OnboardingNameModal';
import { openTutorialVideo, SHOW_SECTION_HELP_KEY, TUTORIAL_LOOM_URLS } from './tutorialLinks';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const fullBotTutorialLinkStyle = {
  border: 'none',
  background: 'transparent',
  padding: '0 2px',
  margin: 0,
  fontSize: 11,
  fontWeight: 500,
  fontFamily: font,
  color: '#94a3b8',
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
  whiteSpace: 'nowrap' as const,
};

const sectionHelpToggleWrapStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'flex-start',
  gap: 3,
  flexShrink: 0,
};

const sectionHelpToggleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
};

const sectionHelpToggleLabelStyle = {
  fontSize: 10,
  fontWeight: 500,
  fontFamily: font,
  color: '#94a3b8',
  lineHeight: 1,
  whiteSpace: 'nowrap' as const,
  userSelect: 'none' as const,
};

const sectionHelpToggleTrackStyle = (on: boolean) => ({
  width: 26,
  height: 14,
  borderRadius: 999,
  border: 'none',
  padding: 1,
  cursor: 'pointer',
  background: on ? '#94a3b8' : '#e2e8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: on ? 'flex-end' : 'flex-start',
  flexShrink: 0,
});

const sectionHelpToggleThumbStyle = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: '#fff',
  boxShadow: '0 1px 2px rgba(15,23,42,0.15)',
};

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
  const [showSectionHelp, setShowSectionHelp] = useLocalStorage<boolean>(SHOW_SECTION_HELP_KEY, true);
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
    if (!authEnabled || !user || !isPlaceholderDisplayName(profile.displayName)) return;
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
      <ProjectsProvider>
      <CloudSyncProvider>
      <NightPrepProvider>
      <MorningFlowProvider>
      <StuckHelpProvider>
        <EndSessionWorkCompleteDismiss />
        <FocusExtensionBridge onAddInfraction={addInfraction} />
        <StuckHelpModal />
        <NightPrepModal />
        <MorningFlowModal />
        <StuckHelpOverlays />
        <OnboardingNameModal open={false} onSubmit={completeOnboarding} />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GetCourseModal variant="nav" />
              <div style={sectionHelpToggleWrapStyle}>
                <button
                  type="button"
                  onClick={() => openTutorialVideo(TUTORIAL_LOOM_URLS.fullBot)}
                  style={fullBotTutorialLinkStyle}
                >
                  full bot tutorial
                </button>
                <div style={sectionHelpToggleRowStyle}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showSectionHelp}
                    aria-label="Show section help tips"
                    title={showSectionHelp ? 'Hide section help tips' : 'Show section help tips'}
                    onClick={() => setShowSectionHelp(v => !v)}
                    style={sectionHelpToggleTrackStyle(showSectionHelp)}
                  >
                    <span style={sectionHelpToggleThumbStyle} />
                  </button>
                  <span style={sectionHelpToggleLabelStyle}>section tips</span>
                </div>
              </div>
              <FocusExtensionModal variant="nav" />
              <StuckHelpNavButton />
            </div>
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
      </MorningFlowProvider>
      </NightPrepProvider>
      </CloudSyncProvider>
      </ProjectsProvider>
      </HoverNotesProvider>
    </HoverTimerProvider>
  );
}
