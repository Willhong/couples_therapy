# Intelligence Acceptance Matrix v1

## Backend acceptance
1. `GET /intelligence/reports/`
- returns list item with UUID `id`
- includes `title`, `status`, `created_at`, `preview`
- includes at least one of `report_type` / `trigger_tier`

2. `GET /intelligence/reports/{id}/`
- returns detail with `id`, `full_text`, `insights`, `recommended_actions`
- returns `recommended_activities` array
- returns status in canonical enum

3. `GET /intelligence/reports/unread-count/`
- includes `count`
- includes `unread_count`
- both values match

## Frontend acceptance
1. Report list load
- no crash when API returns canonical-only fields
- `id` is treated as string and used in route params

2. Report detail open
- detail page opens by uuid route param
- read API call is triggered for unread completed reports

3. Schema compatibility
- list/detail components can consume normalized payload from adapter
- legacy fields do not break UI rendering

## Cross-layer acceptance
- End-to-end open flow from home unread badge -> reports list -> detail works
- mark-read updates are idempotent and do not require numeric casts
