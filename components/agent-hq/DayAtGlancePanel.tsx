'use client';

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import DailyStructureCalendar from './DailyStructureCalendar';
import { useLocalStorage } from './hooks/useLocalStorage';
import { localDateKey } from './eodReports';
import {
  DAILY_STRUCTURE_KEY,
  getTodayPlan,
  sortBlocks,
  type DailyStructureStore,
} from './stuckHelp/dailyStructureUtils';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function DayAtGlancePanel() {
  const [store] = useLocalStorage<DailyStructureStore>(DAILY_STRUCTURE_KEY, {});
  const todayKey = localDateKey();
  const plan = useMemo(() => getTodayPlan(store, todayKey), [store, todayKey]);
  const blocks = plan?.blocks ?? [];

  return (
    <div style={styles.root}>
      {blocks.length === 0 ? (
        <p style={styles.empty}>
          No blocks planned for today yet. Use &quot;lets quickly build my day&quot; to build your day.
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
