'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useDoneToday } from './hooks/useDoneToday';
import { useWorkTrackerContext } from './hooks/WorkTrackerProvider';
import { useNightPrep } from './hooks/NightPrepProvider';
import { useMorningFlow } from './hooks/MorningFlowProvider';
import { WIND_DOWN_FLOW_COPY } from './nightPrep/flows';
import { buildWindDownItems } from './nightPrep/windDownItems';
import {
  DEFAULT_NIGHT_PREP_TIME,
  NIGHT_PREP_TIME_KEY,
  openNightPrepAppleCalendar,
  openNightPrepGoogleCalendar,
  openNightPrepOutlookCalendar,
  parseTimeInput,
  timeToInput,
  type NightPrepReminderTime,
} from './nightPrepReminder';
import { formatNightPrepPlanSummary, getActiveNightPrepPlan, NIGHT_PREP_PLAN_KEY, promoteNightPrepPlanToToday, type NightPrepTomorrowPlan } from './nightPrep/storage';
import { SIMULATED_MORNING_TASKS, MORNING_FLOW_COPY } from './morningFlow/flows';
import { MORNING_FLOW_TEST_MODE_KEY, MORNING_FLOW_USED_KEY } from './morningFlow/storage';
import { SIMULATED_WIND_DOWN_ITEMS } from './nightPrep/windDownItems';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const QUESTIONS = [
  'have i prioritized my sleep/energy',
  "do i know where I'm working tomorrow / roughly when",
  'Is my task list finished for tomorrow (set up below)',
];

interface NightPrepPanelProps {
  autoStartWindDown?: boolean;
  onAutoStartHandled?: () => void;
}

export default function NightPrepPanel({
  autoStartWindDown = false,
  onAutoStartHandled,
}: NightPrepPanelProps) {
  const { items: doneTodayItems } = useDoneToday();
  const { getTodayStats } = useWorkTrackerContext();
  const { openNightPrepChat } = useNightPrep();
  const { openMorningFlow } = useMorningFlow();
  const [reminderTime, setReminderTime] = useLocalStorage<NightPrepReminderTime>(
    NIGHT_PREP_TIME_KEY,
    DEFAULT_NIGHT_PREP_TIME
  );
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const [plan, setPlan] = useLocalStorage<NightPrepTomorrowPlan | null>(NIGHT_PREP_PLAN_KEY, null);
  const [, setMorningFlowUsed] = useLocalStorage<string | null>(MORNING_FLOW_USED_KEY, null);
  const [morningTestMode, setMorningTestMode] = useLocalStorage<boolean>(MORNING_FLOW_TEST_MODE_KEY, false);
  const [testNote, setTestNote] = useState<string | null>(null);

  const startWindDown = useCallback(() => {
    const items = buildWindDownItems(getTodayStats().projectStats, doneTodayItems);
    openNightPrepChat(items);
  }, [getTodayStats, doneTodayItems, openNightPrepChat]);

  const startSimulatedWindDown = useCallback(() => {
    setTestNote(null);
    openNightPrepChat(SIMULATED_WIND_DOWN_ITEMS);
  }, [openNightPrepChat]);

  const startNightPrepOnly = useCallback(() => {
    setTestNote(null);
    openNightPrepChat([]);
  }, [openNightPrepChat]);

  const usePlanForToday = useCallback(() => {
    if (!plan) return;
    setPlan(promoteNightPrepPlanToToday(plan));
    setTestNote('Plan is active for today — ready for morning flow testing.');
  }, [plan, setPlan]);

  const startBeginMyDayTest = useCallback(() => {
    setMorningTestMode(true);
    setMorningFlowUsed(null);
    let active = getActiveNightPrepPlan(plan);
    if (!active?.tasks?.length && plan?.tasks?.length) {
      const promoted = promoteNightPrepPlanToToday(plan);
      setPlan(promoted);
      active = getActiveNightPrepPlan(promoted);
    }
    const tasks = active?.tasks?.length ? active.tasks : SIMULATED_MORNING_TASKS;
    openMorningFlow(tasks);
    setTestNote(MORNING_FLOW_COPY.testModeOn);
  }, [plan, setPlan, setMorningTestMode, setMorningFlowUsed, openMorningFlow]);

  const resetMorningFlowTest = useCallback(() => {
    setMorningFlowUsed(null);
    setTestNote('Morning flow reset — green button is available again.');
  }, [setMorningFlowUsed]);

  useEffect(() => {
    if (!autoStartWindDown) return;
    startWindDown();
    onAutoStartHandled?.();
  }, [autoStartWindDown, startWindDown, onAutoStartHandled]);

  const onTimeChange = useCallback(
    (value: string) => {
      const parsed = parseTimeInput(value);
      if (!parsed) return;
      setReminderTime(parsed);
      setReminderNote(null);
    },
    [setReminderTime]
  );

  const addToGoogleCalendar = useCallback(() => {
    openNightPrepGoogleCalendar(reminderTime);
    setReminderNote('Google Calendar opened.');
  }, [reminderTime]);

  const addToAppleCalendar = useCallback(() => {
    openNightPrepAppleCalendar(reminderTime);
    setReminderNote('Apple Calendar opened.');
  }, [reminderTime]);

  const addToOutlookCalendar = useCallback(() => {
    openNightPrepOutlookCalendar(reminderTime);
    setReminderNote('Outlook opened — set repeat to Daily.');
  }, [reminderTime]);

  return (
    <div style={styles.root}>
      <button type="button" onClick={startWindDown} style={styles.windDownBtn}>
        {WIND_DOWN_FLOW_COPY.windDownButton}
      </button>

      <div style={styles.testRow}>
        <button type="button" onClick={startSimulatedWindDown} style={styles.testBtn}>
          {WIND_DOWN_FLOW_COPY.simulateWindDown}
        </button>
        <button type="button" onClick={startNightPrepOnly} style={styles.testBtn}>
          {WIND_DOWN_FLOW_COPY.nightPrepOnly}
        </button>
      </div>

      <div style={styles.testRow}>
        <button type="button" onClick={startBeginMyDayTest} style={styles.testBtnGreen}>
          {MORNING_FLOW_COPY.beginTest}
        </button>
        <button type="button" onClick={resetMorningFlowTest} style={styles.testBtn}>
          {MORNING_FLOW_COPY.resetTest}
        </button>
      </div>

      {morningTestMode ? <p style={styles.testNote}>{MORNING_FLOW_COPY.testModeOn}</p> : null}

      {plan ? (
        <>
          <p style={styles.planSummary}>
            {plan.testMode ? 'Today (test)' : 'Tomorrow'}: {formatNightPrepPlanSummary(plan)}
          </p>
          {!plan.testMode ? (
            <button type="button" onClick={usePlanForToday} style={styles.testBtnWide}>
              {WIND_DOWN_FLOW_COPY.usePlanForToday}
            </button>
          ) : null}
        </>
      ) : null}

      {testNote ? <p style={styles.testNote}>{testNote}</p> : null}

      <div style={styles.checksBlock}>
        <p style={styles.subheadline}>
          If you can take 10 minutes to answer YES to these 3 questions the night before, you&apos;re all set
          &amp; will WIN your day tomorrow like an unstoppable force.
        </p>

        <ul style={styles.list}>
          {QUESTIONS.map(label => (
            <li key={label} style={styles.item}>
              <span style={styles.question}>{label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={styles.reminderSection}>
        <span style={styles.reminderLabel}>Calendar reminder</span>
        <p style={styles.reminderHint}>(set a reminder for yourself to do your night prep)</p>
        <div style={styles.reminderRow}>
          <input
            type="time"
            value={timeToInput(reminderTime.hour, reminderTime.minute)}
            onChange={e => onTimeChange(e.target.value)}
            style={styles.timeInput}
            aria-label="Night prep calendar reminder time"
          />
          <button type="button" onClick={addToAppleCalendar} style={styles.calendarBtn} title="Add to Apple Calendar">
            Apple
          </button>
          <button type="button" onClick={addToGoogleCalendar} style={styles.calendarBtn} title="Add to Google Calendar">
            Google
          </button>
          <button type="button" onClick={addToOutlookCalendar} style={styles.calendarBtn} title="Add to Outlook">
            Outlook
          </button>
        </div>
      </div>

      {reminderNote ? <p style={styles.reminderNote}>{reminderNote}</p> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    fontFamily: font,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  windDownBtn: {
    border: '1px solid #007aff',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: font,
    background: '#007aff',
    color: '#fff',
    cursor: 'pointer',
    textTransform: 'lowercase',
    width: '100%',
  },
  testRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  testBtn: {
    flex: 1,
    minWidth: 120,
    border: '1px dashed #cbd5e1',
    borderRadius: 10,
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    background: '#f8fafc',
    color: '#475569',
    cursor: 'pointer',
    textTransform: 'lowercase',
  },
  testBtnGreen: {
    flex: 1,
    minWidth: 120,
    border: '1px dashed #86efac',
    borderRadius: 10,
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    background: '#f0fdf4',
    color: '#15803d',
    cursor: 'pointer',
    textTransform: 'lowercase',
  },
  testBtnWide: {
    border: '1px dashed #cbd5e1',
    borderRadius: 10,
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    background: '#f8fafc',
    color: '#475569',
    cursor: 'pointer',
    textTransform: 'lowercase',
    width: '100%',
  },
  testNote: {
    margin: 0,
    fontSize: 11,
    color: '#15803d',
    lineHeight: 1.4,
  },
  planSummary: {
    margin: 0,
    fontSize: 12,
    color: '#0f172a',
    lineHeight: 1.45,
    padding: '8px 10px',
    borderRadius: 8,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  checksBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  subheadline: {
    margin: 0,
    fontSize: 10,
    color: '#64748b',
    lineHeight: 1.35,
    fontStyle: 'italic',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  item: {
    margin: 0,
  },
  question: {
    fontSize: 11,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  reminderSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingTop: 2,
  },
  reminderHint: {
    margin: 0,
    fontSize: 10,
    color: '#64748b',
    lineHeight: 1.35,
  },
  reminderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  reminderLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#94a3b8',
    letterSpacing: '0.02em',
    flexShrink: 0,
  },
  timeInput: {
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: '2px 4px',
    fontSize: 11,
    fontFamily: font,
    color: '#0f172a',
    background: '#fff',
    height: 22,
  },
  calendarBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: '2px 7px',
    background: '#fff',
    color: '#475569',
    fontSize: 10,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    lineHeight: '18px',
  },
  reminderNote: {
    margin: 0,
    fontSize: 9,
    color: '#15803d',
    lineHeight: 1.3,
  },
};
