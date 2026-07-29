'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import CaptureNotesPanel, { QuestionsModal } from './CaptureNotesPanel';
import OpenLoopCalendarReminder from './OpenLoopCalendarReminder';
import { DECISION_ICON, OPEN_LOOP_ICON } from './openLoopsUi';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const OPEN_LOOP_BODY_PROMPT = 'What do you need to do / when will you handle this?';

const OPEN_LOOP_PROMPT_QUESTIONS = [
  'What is currently on my mind that is taking my attention away, even a little bit? What is weighing on me?',
  'Is there currently something bothering me?',
  "Is there something I'm avoiding that is weighing on me?",
  'Is there something I need to "tie up"?',
  'Is there someone or something I owe a response to or need to respond to?',
  'Do I need to check in on something or someone?',
  "Is there something I need to do that I'm worried I'll forget?",
  'Is there something I need to fix that is just sitting there?',
];

export const openLoopExplainLinkStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  fontSize: 10,
  lineHeight: 1.35,
  color: '#94a3b8',
  cursor: 'pointer',
  textAlign: 'right',
  textDecoration: 'underline',
  textDecorationColor: 'rgba(148, 163, 184, 0.45)',
  textUnderlineOffset: 2,
  whiteSpace: 'nowrap',
  fontWeight: 500,
};

export function OpenLoopExplainModal({ onClose }: { onClose: () => void }) {
  const [pos, setPos] = useState({ x: 80, y: 80 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pw = 420;
    const ph = 520;
    setPos({
      x: Math.max(16, Math.min(w - pw - 16, w - pw - 24)),
      y: Math.max(16, Math.min(h - ph - 16, 72)),
    });
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { startX, startY, origX, origY } = dragRef.current;
      const panel = panelRef.current;
      const pw = panel?.offsetWidth ?? 420;
      const ph = panel?.offsetHeight ?? 520;
      setPos({
        x: Math.max(8, Math.min(window.innerWidth - pw - 8, origX + e.clientX - startX)),
        y: Math.max(8, Math.min(window.innerHeight - ph - 8, origY + e.clientY - startY)),
      });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  };

  const panel = (
    <div
      ref={panelRef}
      style={{
        ...explainStyles.panel,
        left: pos.x,
        top: pos.y,
      }}
      role="dialog"
      aria-labelledby="open-loop-explain-title"
    >
      <div style={explainStyles.header} onMouseDown={onDragStart}>
        <span style={explainStyles.dragHint} aria-hidden>
          ⠿
        </span>
        <h3 id="open-loop-explain-title" style={explainStyles.title}>
          what&apos;s an open loop?
        </h3>
        <button type="button" onClick={onClose} style={explainStyles.closeBtn} aria-label="Close">
          ×
        </button>
      </div>
      <div style={explainStyles.body}>
        <p style={explainStyles.heading}>what is an open loop?</p>
        <p style={explainStyles.para}>
          An open loop is anything that isn&apos;t &quot;completed&quot; or &quot;finished&quot; in your mind that is tugging
          at your attention / energy that needs to be put into words &amp; stored somewhere (here) so you can get it out
          of your head. This can be:
        </p>
        <ul style={explainStyles.list}>
          <li>
            something you need to do but haven&apos;t (text person back, return amazon item today, etc)
          </li>
          <li>
            a commitment you made that you need to remember (help a friend with move, doctor&apos;s appointment, lunch
            with stacy)
          </li>
          <li>
            a decision you have to make that you haven&apos;t yet or are avoiding (figure out brand direction, decide on
            posting schedule, decide who my ideal client is for my service, etc)
          </li>
        </ul>
        <p style={explainStyles.para}>
          Your brain wasn&apos;t meant to store 500 things inside of it. Storing them in your head costs energy. So we
          need to get that energy back and &quot;able for you to use it for yourself&quot; by storing all open loops HERE,
          so you can use that new energy/bandwidth on your most important task(s) so you can live/follow your dreams.
        </p>

        <p style={explainStyles.heading}>UNMADE DECISIONS</p>
        <p style={explainStyles.para}>
          You will also notice there is an &apos;unmade decision&apos; section. Why is that added? Because you will notice
          that as you work, you will come face-to-face with decisions that you&apos;ll need to make to move forward. You
          then have to ask yourself &apos;can i just make an intuitive decision here&apos; or &apos;do i need to think about
          this one&apos;. If answer is you can just make a quick intuitive decision, just go with your intuition &amp;
          don&apos;t worry about it. But if you need to think about it, instead of just letting that decision get lost in
          your brain &amp; steal your energy, put that decision down here so you can come back to them when you&apos;re
          ready.
        </p>

        <p style={explainStyles.subheading}>Example:</p>
        <p style={explainStyles.para}>
          You are working on your website and you aren&apos;t sure which way to take your brand colors/design. You&apos;re
          working on your website now, and this decision needs to be made because it influences how you work on the
          website moving forward. When this happens, you have 2 options:
        </p>
        <p style={explainStyles.para}>
          <strong>Option 1:</strong>{' '}
          <strong>Make a quick intuitive decision &amp; keep going on this task.</strong> If you have the brain power /
          can make a quick decision — you can just decide NOW on what you want to do, and keep moving forward on the same
          task.
        </p>
        <p style={explainStyles.para}>
          <strong>Option 2:</strong>
        </p>
        <p style={explainStyles.para}>
          You can decide{' '}
          <strong>
            &quot;this is an important decision but i don&apos;t want to use my brain power on this right now because i can
            use this energy for something more urgent&quot;
          </strong>
          , store that unmade decision here as &apos;decide brand direction&apos;, then move on to the other most important
          task you need your good brain power for. You can then circle back to make the decision when you&apos;re ready.
        </p>
        <p style={explainStyles.subheading}>The core idea:</p>
        <p style={explainStyles.para}>
          As you&apos;re working, new decisions / problems will pop up. When these happen, you have to ask yourself
          &apos;is this a good use of my energy right now?&apos;. If answer is YES because it&apos;s the most important
          thing/necessary, just do it. But if the answer is NO because you need to actually think through it &amp;
          there&apos;s other equally important work that you can do — just store it, and keep working on what will move
          the ball forward the most. That&apos;s the game.
        </p>

        <p style={explainStyles.heading}>Unmade decisions stop 99% of people from progress</p>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(panel, document.body);
}

export default function OpenLoopsPanel() {
  const [showQuestions, setShowQuestions] = useState(false);

  return (
    <>
      <CaptureNotesPanel
        storageKey="agentHQ_openLoops"
        bodyTemplate=""
        bodyPrompt={OPEN_LOOP_BODY_PROMPT}
        addLabel="Add open loop"
        addLabelIcon={OPEN_LOOP_ICON}
        emptyMessage="No open loops yet."
        styledTabsByKind
        groupedTabsByKind
        enableDragReorder
        extraAddActions={[
          {
            label: 'decision i need to make',
            kind: 'decision',
            icon: DECISION_ICON,
          },
        ]}
        toolbarSubtext={
          <button type="button" onClick={() => setShowQuestions(true)} style={promptSubtextStyle}>
            prompt questions to de-load brain-weight
          </button>
        }
        renderEditorExtra={note =>
          note.kind === 'decision' ? null : <OpenLoopCalendarReminder key={note.id} note={note} />
        }
      />
      {showQuestions && (
        <QuestionsModal
          title="Open loop prompt questions"
          questions={OPEN_LOOP_PROMPT_QUESTIONS}
          onClose={() => setShowQuestions(false)}
        />
      )}
    </>
  );
}

const promptSubtextStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  fontSize: 10,
  lineHeight: 1.35,
  color: '#94a3b8',
  cursor: 'pointer',
  textAlign: 'right',
  textDecoration: 'underline',
  textDecorationColor: 'rgba(148, 163, 184, 0.45)',
  textUnderlineOffset: 2,
};

const explainStyles: Record<string, CSSProperties> = {
  panel: {
    position: 'fixed',
    width: 420,
    maxWidth: 'calc(100vw - 24px)',
    maxHeight: 'min(78vh, 640px)',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 12px 32px rgba(15,23,42,0.16)',
    fontFamily: font,
    zIndex: 1000,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
    cursor: 'grab',
    userSelect: 'none',
    flexShrink: 0,
  },
  dragHint: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 1,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a',
    minWidth: 0,
  },
  closeBtn: {
    width: 28,
    height: 28,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#fff',
    color: '#475569',
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
    flexShrink: 0,
  },
  body: {
    margin: 0,
    padding: '14px 16px 18px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  heading: {
    margin: '4px 0 0',
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  subheading: {
    margin: '6px 0 0',
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  para: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.55,
    color: '#334155',
  },
  list: {
    margin: 0,
    paddingLeft: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
    lineHeight: 1.55,
    color: '#334155',
  },
};
