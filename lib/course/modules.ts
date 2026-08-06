/** Hosted Daywinner course — sections + lesson videos. */

export interface CourseLesson {
  id: string;
  title: string;
  videoUrl: string;
}

export interface CourseSection {
  id: string;
  title: string;
  subtitle?: string;
  lessons: CourseLesson[];
}

export const COURSE_TITLE = 'The Simple Productivity System';
export const COURSE_TAGLINE_BEFORE = 'The system behind the bot — energy, environment, focus, and execution so you actually ';
export const COURSE_TAGLINE_EMPHASIS = 'win your day';
export const COURSE_TAGLINE = `${COURSE_TAGLINE_BEFORE}${COURSE_TAGLINE_EMPHASIS}.`;

/** Convert a YouTube watch URL (optional &t=) into an embeddable player URL. */
export function toYouTubeEmbedUrl(watchUrl: string): string | null {
  try {
    const url = new URL(watchUrl);
    const id = url.searchParams.get('v');
    if (!id) return null;

    const embed = new URL(`https://www.youtube.com/embed/${id}`);
    const t = url.searchParams.get('t');
    if (t) {
      const seconds = t.endsWith('s') ? Number.parseInt(t.slice(0, -1), 10) : Number.parseInt(t, 10);
      if (Number.isFinite(seconds) && seconds > 0) {
        embed.searchParams.set('start', String(seconds));
      }
    }
    embed.searchParams.set('rel', '0');
    return embed.toString();
  } catch {
    return null;
  }
}

export const COURSE_SECTIONS: CourseSection[] = [
  {
    id: 'intro',
    title: 'Intro + What hyperactive brain actually is',
    subtitle: 'Hyperactive mind = gift',
    lessons: [
      {
        id: 'intro-1',
        title: 'Course intro',
        videoUrl: 'https://www.youtube.com/watch?v=unnpps7tGSw',
      },
      {
        id: 'intro-2',
        title: 'What people call "ADHD" actually is at an obstacle level (you\'ve been lied to)',
        videoUrl: 'https://www.youtube.com/watch?v=hbdegn16O3k',
      },
      {
        id: 'intro-3',
        title: 'Re-framing the word productivity',
        videoUrl: 'https://www.youtube.com/watch?v=mB24rikMvBk',
      },
      {
        id: 'intro-4',
        title: 'CHOOSING what to believe about yourself',
        videoUrl: 'https://www.youtube.com/watch?v=kqlxYNc__m8',
      },
    ],
  },
  {
    id: 'work-system',
    title: 'The world’s simplest 3-part work system',
    lessons: [
      {
        id: 'work-1',
        title: '3-part work system overview',
        videoUrl: 'https://www.youtube.com/watch?v=lH1pOxNgUiI',
      },
      {
        id: 'work-2',
        title: 'Part 1: Environment prep',
        videoUrl: 'https://www.youtube.com/watch?v=qT5YgZ2t8Og',
      },
      {
        id: 'work-3',
        title: 'Part 2: Work prep',
        videoUrl: 'https://www.youtube.com/watch?v=uiKMGu_2T0I',
      },
      {
        id: 'work-4',
        title: 'Part 3: Daily deadline decision',
        videoUrl: 'https://www.youtube.com/watch?v=f9S-RM5UBJ8',
      },
      {
        id: 'work-5',
        title: 'Shoot 1 big arrow daily',
        videoUrl: 'https://www.youtube.com/watch?v=HBhRibe0Lug',
      },
      {
        id: 'work-6',
        title: 'Putting it all together (winning night before)',
        videoUrl: 'https://www.youtube.com/watch?v=HorJ0Nth92Q',
      },
      {
        id: 'work-7',
        title: 'Designing your day',
        videoUrl: 'https://www.youtube.com/watch?v=lHw76uDbdRE&t=1318s',
      },
      {
        id: 'work-8',
        title: 'Actually implementing this system into your life (run it)',
        videoUrl: 'https://www.youtube.com/watch?v=Ah-3GSDsCiU',
      },
    ],
  },
  {
    id: 'energy',
    title: 'Designing your personal energy system',
    lessons: [
      {
        id: 'energy-1',
        title: 'How energy works in the body',
        videoUrl: 'https://www.youtube.com/watch?v=4rsDQNjGT1g',
      },
      {
        id: 'energy-2',
        title: 'Macro: Infinite energy generation routine',
        videoUrl: 'https://www.youtube.com/watch?v=vuegeouEAjI',
      },
      {
        id: 'energy-3',
        title: 'Things that verifiably destroy your energy',
        videoUrl: 'https://www.youtube.com/watch?v=K9Pb3b7xMZU',
      },
      {
        id: 'energy-4',
        title: 'Micro: you don’t “generate” the energy, it is there',
        videoUrl: 'https://www.youtube.com/watch?v=WSMYbg2Bw0U',
      },
    ],
  },
  {
    id: 'focus',
    title: 'Designing your focus / emotional management system',
    lessons: [
      {
        id: 'focus-1',
        title: 'What "focus" actually is',
        videoUrl: 'https://www.youtube.com/watch?v=fFvfUfWfFco',
      },
      {
        id: 'focus-2',
        title: 'How to train your ability to "catch and remove"',
        videoUrl: 'https://www.youtube.com/watch?v=5DBy7bBoLYM',
      },
      {
        id: 'focus-3',
        title: 'Direct goal meditation',
        videoUrl: 'https://www.youtube.com/watch?v=svPfYPmsT44',
      },
      {
        id: 'focus-4',
        title: 'Emotions will hijack your focus',
        videoUrl: 'https://www.youtube.com/watch?v=ndpMtQotOK4',
      },
    ],
  },
  {
    id: 'prioritization',
    title: 'Reverse-engineering / task-prioritization',
    subtitle: 'How to not do the wrong stuff / actually know what to do',
    lessons: [
      {
        id: 'prio-1',
        title: '"What if I don\'t know what to do / how to do it?" (reverse-engineering + data-seeking)',
        videoUrl: 'https://www.youtube.com/watch?v=M6g_JZdKoas',
      },
      {
        id: 'prio-2',
        title: 'What is *ACTUALLY* moving the ball forward? Finding the A+ task',
        videoUrl: 'https://www.youtube.com/watch?v=ME1rpk_Pgao',
      },
      {
        id: 'prio-3',
        title: 'Advanced tasking (batching / organizing by work type)',
        videoUrl: 'https://www.youtube.com/watch?v=P4H_GWA0uJs',
      },
    ],
  },
  {
    id: 'personality',
    title: 'Personality awareness basics',
    lessons: [
      {
        id: 'personality-1',
        title: '2 most common work types',
        videoUrl: 'https://www.youtube.com/watch?v=T_k-6gkB3oE',
      },
      {
        id: 'personality-2',
        title: 'Makers vs managers schedule',
        videoUrl: 'https://www.youtube.com/watch?v=QMdi0vh5GyU',
      },
      {
        id: 'personality-3',
        title: 'Beginning to understand your wiring',
        videoUrl: 'https://www.youtube.com/watch?v=Zvplf8vm3Hs',
      },
    ],
  },
  {
    id: 'identity',
    title: 'Building new identity of doer',
    lessons: [
      {
        id: 'identity-1',
        title: 'Rebuild your identity as a doer (you had no system)',
        videoUrl: 'https://www.youtube.com/watch?v=wX2ptznm9X8',
      },
      {
        id: 'identity-2',
        title: 'Winning simulation + baby visualization',
        videoUrl: 'https://www.youtube.com/watch?v=Aao4WkBAisc',
      },
    ],
  },
  {
    id: 'supporting',
    title: '3-part work system supporting ideas',
    lessons: [
      {
        id: 'supporting-1',
        title: 'Fix 99% of procrastination (the 2 big problems you\'ll \'forget\' that you\'re doing)',
        videoUrl: 'https://www.youtube.com/watch?v=7HADn8JCX2E',
      },
      {
        id: 'supporting-2',
        title: 'Fiddling vs DOING (why fiddling happens, how to avoid)',
        videoUrl: 'https://www.youtube.com/watch?v=LckleYKiaJY',
      },
      {
        id: 'supporting-3',
        title: 'Avoid the clarity tax (monstrous time/energy waste). NOTES.',
        videoUrl: 'https://www.youtube.com/watch?v=kATGHN1VhKw',
      },
      {
        id: 'supporting-4',
        title: 'Expanding your definitions of rest',
        videoUrl: 'https://www.youtube.com/watch?v=2IM3fKd8OjA',
      },
      {
        id: 'supporting-5',
        title: 'What to do if you \'miss\' or fall off the wagon',
        videoUrl: 'https://www.youtube.com/watch?v=y_yvvE4oixQ',
      },
    ],
  },
  {
    id: 'bonus',
    title: 'Bonus: Savage execution re-frames',
    subtitle: 'Stuff that’s helped me',
    lessons: [
      {
        id: 'bonus-1',
        title: '9 operational principles',
        videoUrl: 'https://www.youtube.com/watch?v=KR09W-r7yC4',
      },
      {
        id: 'bonus-2',
        title: 'Nothing should ever take longer than 48 hrs',
        videoUrl: 'https://www.youtube.com/watch?v=aFijSulJCkk',
      },
      {
        id: 'bonus-3',
        title: 'F*** perfection, 100 contact points',
        videoUrl: 'https://www.youtube.com/watch?v=0iD_j12lIbE',
      },
      {
        id: 'bonus-4',
        title: '70% = figuring out what the work is. Directional/strategic.',
        videoUrl: 'https://www.youtube.com/watch?v=kWGGG13-UAA',
      },
      {
        id: 'bonus-5',
        title: 'Boring = blessing',
        videoUrl: 'https://www.youtube.com/watch?v=39YhnMTO51I',
      },
      {
        id: 'bonus-6',
        title: '"This or that?" No. Go deeper.',
        videoUrl: 'https://www.youtube.com/watch?v=vgFZOPbrtaY',
      },
    ],
  },
];
