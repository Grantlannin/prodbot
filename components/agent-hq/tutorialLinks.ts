/** Loom tutorial share URLs — set in Vercel / .env as NEXT_PUBLIC_LOOM_* */
export const TUTORIAL_LOOM_URLS = {
  fullBot: process.env.NEXT_PUBLIC_LOOM_FULL_BOT_TUTORIAL_URL?.trim() || '',
  windDown: process.env.NEXT_PUBLIC_LOOM_WIND_DOWN_URL?.trim() || '',
  projects: process.env.NEXT_PUBLIC_LOOM_PROJECTS_URL?.trim() || '',
  notes: process.env.NEXT_PUBLIC_LOOM_NOTES_URL?.trim() || '',
  openLoops: process.env.NEXT_PUBLIC_LOOM_OPEN_LOOPS_URL?.trim() || '',
  eod: process.env.NEXT_PUBLIC_LOOM_EOD_URL?.trim() || '',
} as const;

export type TutorialKey = keyof typeof TUTORIAL_LOOM_URLS;

/** When false, section "how do I use this" links are hidden. */
export const SHOW_SECTION_HELP_KEY = 'agentHQ_showSectionHelp';

export function openTutorialVideo(url: string): void {
  const trimmed = url.trim();
  if (!trimmed) {
    window.alert('Tutorial video coming soon.');
    return;
  }
  window.open(trimmed, '_blank', 'noopener,noreferrer');
}
