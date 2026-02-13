# Frontend Intelligence UI Gap Analysis v1

## Scope
This document covers screens/features that consume intelligence APIs:
- `mobile/src/app/(main)/home.tsx`
- `mobile/src/app/(main)/reports.tsx`
- `mobile/src/app/(main)/report/[id].tsx`
- `mobile/src/features/intelligence/*`

## Current gaps fixed
1) Contract mismatch
- Backend report id is UUID; mobile detail navigation and list previously used numeric assumption.
- Backend status is canonical (`pending/processing/completed/failed`), while UI used only `generated/read`.
- Backend unread count originally returned `unread_count` only, while UI consumed generic `count`.

2) Schema mismatch
- Backend list/detail fields are based on report model names (`report_title`, `report_summary`, `key_insights`, `suggested_actions`).
- UI expected `title`, `full_text`, `insights`, `recommended_actions`.

3) Missing compatibility in frontend
- No dedicated adapter previously for normalizing both canonical and compatibility shapes.

## New frontend contract flow
1) API layer reads canonical backend contracts.
2) Adapter maps to UI-friendly stable model:
   - `title`
   - `status`
   - `preview`
   - `full_text`
   - `insights`
   - `recommended_actions`
3) Routes use report `id` as string/UUID.
4) Unread count API reads both `count` and `unread_count`.

## Screen responsibilities

### `home.tsx`
- Display report unread badge when `count > 0` from `useUnreadCount`.
- Navigate to `/reports` directly.

### `reports.tsx`
- Render list of `InsightReportSummary` with string keys.
- Show empty state and retry flow unchanged.

### `report/[id].tsx`
- Receive route `id` as `string | string[]`, normalize to string.
- Call `markReportRead` for unread completed reports.

### components
- `ReportListItem.tsx`: works on normalized summary.
- `ReportDetailView.tsx`: handles normalized detail safely.

## Missing screens (left as future work)
- In-conversation delivery UI integration (not part of this cycle)
- Report filtering/sorting/segmented tabs
- Report type chips localization map expansion
