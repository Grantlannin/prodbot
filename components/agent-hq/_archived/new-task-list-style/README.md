# New task list style (archived)

Snapshot of the dual-list wind-down UI (Today editable list + Tomorrow/planned list,
drag-to-project, promote-on-day-roll, add-from-today in wind-down) before reverting the
live Night Prep panel to the simpler pre–task-list style.

Source files use a `.snapshot` suffix so TypeScript/Next do not compile them.

## Contents

- `NightPrepPanel.tsx.snapshot` — dual list UI
- `todayTaskList/` — freeform today-list storage
- `nightPrep/` — storage/flows/windDownItems/utils as they were for this feature
- `NightPrepModal.tsx.snapshot` — includes “add from today’s list” pick
- `related-diffs.patch` — other wiring (Dashboard start-today, Projects drag, globals CSS, etc.)

## Restore

1. Copy `*.snapshot` files back to live paths (strip `.snapshot`).
2. Restore `todayTaskList/` under `components/agent-hq/`.
3. Apply `related-diffs.patch` carefully (may include unrelated local edits).
