export const USER_PROFILE_STORAGE_KEY = 'agentHQ_userProfile';
export const CELEBRATION_SETTINGS_STORAGE_KEY = 'agentHQ_celebrationSettings';

export const DISPLAY_NAME_PLACEHOLDER = 'what should I call you?';

export interface UserProfile {
  displayName: string;
  onboardingComplete: boolean;
}

export interface CelebrationSettings {
  /** Show confetti + message overlay on project completion */
  enabled: boolean;
  /** @deprecated Always shows message when enabled; kept for stored settings compat */
  showMessage?: boolean;
  /** Use {name} for the user's display name */
  messageTemplate: string;
}

export const DEFAULT_CELEBRATION_TEMPLATE =
  'YOUR A FUCKING BEAST. YOURE A FUCKING ANIMAL. NOBODY CAN TAME YOU. THE WORLD IS YOURS, {name}!';

export const CELEBRATION_MESSAGE_OPTIONS = [
  DEFAULT_CELEBRATION_TEMPLATE,
  "YOU'RE UNSTOPPABLE. KEEP GOING",
  'BOOM. ONTO THE NEXT',
  'We did it. Next.',
  "LET'S GOOO!!",
] as const;

export type CelebrationMessageOption = (typeof CELEBRATION_MESSAGE_OPTIONS)[number];

export function resolveCelebrationTemplate(template: string): CelebrationMessageOption {
  const match = CELEBRATION_MESSAGE_OPTIONS.find(option => option === template);
  return match ?? CELEBRATION_MESSAGE_OPTIONS[0];
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  displayName: DISPLAY_NAME_PLACEHOLDER,
  onboardingComplete: true,
};

export const DEFAULT_CELEBRATION_SETTINGS: CelebrationSettings = {
  enabled: true,
  showMessage: true,
  messageTemplate: DEFAULT_CELEBRATION_TEMPLATE,
};

export const ONBOARDING_NAME_PROMPT =
  'Initialized. To tailor this system to you, we need to build your profile. What name should we call you?';

export function isPlaceholderDisplayName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  return trimmed.toLowerCase() === DISPLAY_NAME_PLACEHOLDER.toLowerCase();
}

export function formatCelebrationMessage(template: string, displayName: string): string {
  const name = isPlaceholderDisplayName(displayName) ? 'CHAMP' : displayName.trim();
  return template.replace(/\{name\}/gi, name.toUpperCase());
}

export function welcomeLabel(displayName: string): string {
  const name = displayName.trim() || DISPLAY_NAME_PLACEHOLDER;
  return `Welcome back, ${name}`;
}
