/** Placeholder modules — replace titles/links with your real course content. */
export interface CourseModule {
  id: string;
  title: string;
  summary: string;
  /** Loom / Vimeo / YouTube unlisted / etc. Leave empty until you paste links. */
  videoUrl?: string;
  resources?: { label: string; href: string }[];
}

export const COURSE_TITLE = 'Daywinner Course';
export const COURSE_TAGLINE =
  'The system behind the bot — energy, environment, and work prep so you actually ship.';

export const COURSE_MODULES: CourseModule[] = [
  {
    id: 'welcome',
    title: 'Welcome & how to use this course',
    summary: 'Orientation. Pair each module with timed blocks in Daywinner.',
  },
  {
    id: 'energy',
    title: 'Energy generation & management',
    summary: 'Stop running on empty — build energy so focus is possible.',
  },
  {
    id: 'environment',
    title: 'Environment & focus protection',
    summary: 'Set up your space and defaults so distraction loses by default.',
  },
  {
    id: 'prep',
    title: 'Task & work prep',
    summary: 'Prep work so sessions start clean and finish with proof.',
  },
  {
    id: 'bot',
    title: 'Pairing the system with Daywinner',
    summary: 'How the course and the bot reinforce each other day to day.',
  },
];
