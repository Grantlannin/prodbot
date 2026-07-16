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
