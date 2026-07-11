'use client';

import { useCallback, useMemo } from 'react';
import { createEodReport, EOD_REPORTS_KEY, reportsByDate, upsertEodReport } from '../eodReports';
import type { BuildEodReportParams } from '../eodReports';
import type { EodReport } from '../types';
import { useLocalStorage } from './useLocalStorage';

export function useEodReports() {
  const [reports, setReports] = useLocalStorage<EodReport[]>(EOD_REPORTS_KEY, []);

  const byDate = useMemo(() => reportsByDate(reports), [reports]);

  const saveReport = useCallback(
    (params: BuildEodReportParams) => {
      const report = createEodReport(params);
      setReports(prev => upsertEodReport(prev, report));
      return report;
    },
    [setReports]
  );

  const getReport = useCallback((dateKey: string) => byDate.get(dateKey) ?? null, [byDate]);

  return { reports, byDate, saveReport, getReport };
}
