export const USER_PROFILE_STORAGE_KEY = 'agentHQ_userProfile';
export const CELEBRATION_SETTINGS_STORAGE_KEY = 'agentHQ_celebrationSettings';

export interface UserProfile {
  displayName: string;
  onboardingComplete: boolean;
}

export interface CelebrationSettings {
  /** Show confetti + overlay on project completion */
  enabled: boolean;
  /** Show bold text overlay (if enabled, confetti still runs when enabled) */
  showMessage: boolean;
  /** Use {name} for the user's display name */
  messageTemplate: string;
}

export const DEFAULT_CELEBRATION_TEMPLATE =
  'YOUR A FUCKING BEAST. YOURE A FUCKING ANIMAL. NOBODY CAN TAME YOU. THE WORLD IS YOURS, {name}!';

export const DEFAULT_USER_PROFILE: UserProfile = {
  displayName: '',
  onboardingComplete: false,
};

export const DEFAULT_CELEBRATION_SETTINGS: CelebrationSettings = {
  enabled: true,
  showMessage: true,
  messageTemplate: DEFAULT_CELEBRATION_TEMPLATE,
};

export const ONBOARDING_NAME_PROMPT =
  'Initialized. To tailor this system to you, we need to build your profile. What name should we call you?';

export function formatCelebrationMessage(template: string, displayName: string): string {
  const name = displayName.trim() || 'CHAMP';
  return template.replace(/\{name\}/gi, name.toUpperCase());
}

export function welcomeLabel(displayName: string): string {
  const name = displayName.trim();
  return name ? `Welcome back, ${name}` : 'Welcome back';
}
