'use client';

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import DailyStructureCalendar from './DailyStructureCalendar';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  DAILY_STRUCTURE_KEY,
  getActiveDayPlan,
  sortBlocks,
  type DailyStructureStore,
} from './stuckHelp/dailyStructureUtils';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function DayAtGlancePanel() {
  const [store] = useLocalStorage<DailyStructureStore>(DAILY_STRUCTURE_KEY, {});
  const plan = useMemo(() => getActiveDayPlan(store), [store]);
  const blocks = plan?.blocks ?? [];

  return (
    <div style={styles.root}>
      {blocks.length === 0 ? (
        <p style={styles.empty}>
          No blocks planned yet. Use Admin calendar to build your calendar.
        </p>
      ) : (
        <DailyStructureCalendar blocks={sortBlocks(blocks)} interactive={false} compact />
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    fontFamily: font,
    minHeight: 120,
  },
  empty: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.5,
    color: '#64748b',
  },
};
