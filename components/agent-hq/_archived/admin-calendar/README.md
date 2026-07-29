# Admin calendar (archived)

Removed from the dashboard UI on 2026-07-29. Kept here so we can bring it back.

## What this was

Interactive **Admin calendar** under Notes: work blocks, commitments, open loops, empty/custom blocks, zoom, drag/resize, click-to-rename, Delete to remove, guided “Admin calendar” modal, colors.

## Files here

- `DesignMyDayPanel.tsx` — full panel + guided modal + add forms
- `DayAtGlancePanel.tsx` — read-only glance (was unused when archived)

## Still live (shared with Stuck Help)

Do **not** delete these — Stuck Help still uses them:

- `components/agent-hq/DailyStructureCalendar.tsx`
- `components/agent-hq/stuckHelp/dailyStructureUtils.ts`

Local storage keys (plans survive): `agentHQ_dailyStructure`, `agentHQ_dayBlockColors`, `agentHQ_adminCalendarZoom`.

## Restore

1. Move `DesignMyDayPanel.tsx` back to `components/agent-hq/` (and fix imports from `../../` → `./` / `./hooks/` / `./stuckHelp/`).
2. In `DashboardTab.tsx`, under Notes:

```tsx
import DesignMyDayPanel from './DesignMyDayPanel';

<DashCard
  title="Admin calendar"
  headerRight={<span style={styles.designDayHint}>Click · Delete to remove</span>}
>
  <DesignMyDayPanel />
</DashCard>
```

3. Optional: restore **Add to admin calendar** on open loops (was in `OpenLoopCalendarReminder.tsx`) — primary button that called `upsertActiveDayPlan` with an `open_loop` block.
