'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { saveProfileDisplayName } from '@/lib/supabase/profile';
import { useLocalStorage } from './useLocalStorage';
import {
  CELEBRATION_SETTINGS_STORAGE_KEY,
  DEFAULT_CELEBRATION_SETTINGS,
  DEFAULT_USER_PROFILE,
  DISPLAY_NAME_PLACEHOLDER,
  USER_PROFILE_STORAGE_KEY,
  formatCelebrationMessage,
  isPlaceholderDisplayName,
  resolveCelebrationTemplate,
  type CelebrationSettings,
  type UserProfile,
} from '../userProfile';

interface UserProfileContextValue {
  profile: UserProfile;
  setDisplayName: (name: string) => void;
  completeOnboarding: (name: string) => void;
  celebration: CelebrationSettings;
  setCelebration: (patch: Partial<CelebrationSettings>) => void;
  resetCelebrationTemplate: () => void;
  getCelebrationMessage: () => string;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useLocalStorage<UserProfile>(USER_PROFILE_STORAGE_KEY, DEFAULT_USER_PROFILE);
  const [celebration, setCelebrationState] = useLocalStorage<CelebrationSettings>(
    CELEBRATION_SETTINGS_STORAGE_KEY,
    DEFAULT_CELEBRATION_SETTINGS
  );

  // One-time: confetti-loop fix left some users with celebration disabled.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = 'agentHQ_celebrationReenable_v1';
    if (window.localStorage.getItem(key) === '1') return;
    window.localStorage.setItem(key, '1');
    setCelebrationState(prev => ({
      ...DEFAULT_CELEBRATION_SETTINGS,
      ...prev,
      enabled: true,
      showMessage: true,
    }));
  }, [setCelebrationState]);

  const resolvedCelebration = useMemo<CelebrationSettings>(
    () => ({
      ...DEFAULT_CELEBRATION_SETTINGS,
      ...celebration,
      showMessage: true,
      messageTemplate: resolveCelebrationTemplate(
        celebration.messageTemplate || DEFAULT_CELEBRATION_SETTINGS.messageTemplate
      ),
    }),
    [celebration]
  );

  const resolvedProfile = useMemo<UserProfile>(
    () => ({
      ...profile,
      displayName: profile.displayName.trim() || DISPLAY_NAME_PLACEHOLDER,
      onboardingComplete: true,
    }),
    [profile]
  );

  const setDisplayName = useCallback(
    (name: string) => {
      const trimmed = name.trim() || DISPLAY_NAME_PLACEHOLDER;
      setProfile(prev => ({
        ...prev,
        displayName: trimmed,
        onboardingComplete: true,
      }));
      if (!isPlaceholderDisplayName(trimmed)) {
        void saveProfileDisplayName(trimmed);
      }
    },
    [setProfile]
  );

  const completeOnboarding = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || isPlaceholderDisplayName(trimmed)) return;
      setProfile({
        displayName: trimmed,
        onboardingComplete: true,
      });
      void saveProfileDisplayName(trimmed);
    },
    [setProfile]
  );

  const setCelebration = useCallback(
    (patch: Partial<CelebrationSettings>) => {
      setCelebrationState(prev => ({ ...prev, ...patch }));
    },
    [setCelebrationState]
  );

  const resetCelebrationTemplate = useCallback(() => {
    setCelebrationState(prev => ({
      ...prev,
      messageTemplate: DEFAULT_CELEBRATION_SETTINGS.messageTemplate,
    }));
  }, [setCelebrationState]);

  const getCelebrationMessage = useCallback(() => {
    return formatCelebrationMessage(resolvedCelebration.messageTemplate, resolvedProfile.displayName);
  }, [resolvedCelebration.messageTemplate, resolvedProfile.displayName]);

  const value = useMemo(
    () => ({
      profile: resolvedProfile,
      setDisplayName,
      completeOnboarding,
      celebration: resolvedCelebration,
      setCelebration,
      resetCelebrationTemplate,
      getCelebrationMessage,
    }),
    [
      resolvedProfile,
      setDisplayName,
      completeOnboarding,
      resolvedCelebration,
      setCelebration,
      resetCelebrationTemplate,
      getCelebrationMessage,
    ]
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile(): UserProfileContextValue {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}
