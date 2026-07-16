'use client';

import { useState, type CSSProperties } from 'react';
import CaptureNotesPanel, { QuestionsModal } from './CaptureNotesPanel';
import OpenLoopCalendarReminder from './OpenLoopCalendarReminder';
import { DECISION_ICON, OPEN_LOOP_ICON } from './openLoopsUi';

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
        headerExtra={
          <button type="button" onClick={() => setShowQuestions(true)} style={questionsBtnStyle}>
            <span style={btnContentStyle}>
              <span aria-hidden style={iconStyle}>
                ?
              </span>
              <span>Prompt questions</span>
            </span>
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

const btnContentStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const iconStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1,
  flexShrink: 0,
};

const questionsBtnStyle: CSSProperties = {
  background: '#fff',
  color: '#334155',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: '7px 12px',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
