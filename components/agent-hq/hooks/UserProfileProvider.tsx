'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { saveProfileDisplayName } from '@/lib/supabase/profile';
import { useLocalStorage } from './useLocalStorage';
import {
  CELEBRATION_SETTINGS_STORAGE_KEY,
  DEFAULT_CELEBRATION_SETTINGS,
  DEFAULT_USER_PROFILE,
  USER_PROFILE_STORAGE_KEY,
  formatCelebrationMessage,
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

  const setDisplayName = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      setProfile(prev => ({
        ...prev,
        displayName: trimmed,
        onboardingComplete: true,
      }));
      void saveProfileDisplayName(trimmed);
    },
    [setProfile]
  );

  const completeOnboarding = useCallback(
    (name: string) => {
      const trimmed = name.trim();
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
    return formatCelebrationMessage(celebration.messageTemplate, profile.displayName);
  }, [celebration.messageTemplate, profile.displayName]);

  const value = useMemo(
    () => ({
      profile,
      setDisplayName,
      completeOnboarding,
      celebration,
      setCelebration,
      resetCelebrationTemplate,
      getCelebrationMessage,
    }),
    [profile, setDisplayName, completeOnboarding, celebration, setCelebration, resetCelebrationTemplate, getCelebrationMessage]
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile(): UserProfileContextValue {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}
