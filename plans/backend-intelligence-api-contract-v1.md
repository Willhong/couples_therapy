# Backend Intelligence API Contract v1

## Purpose
Align backend `/api/v1/intelligence/` response schema and mobile consumption behavior.

## Endpoints

### `GET /api/v1/intelligence/reports/`
- Response: list of report summaries
- Canonical item fields:
  - `id`: UUID string
  - `title`: string
  - `status`: `pending | processing | completed | failed`
  - `is_read`: boolean
  - `created_at`: ISO string
  - `report_type`: string
  - `preview`: short text summary
- Compatibility fields retained for legacy references:
  - `trigger_tier`, `report_title`, `report_summary`

### `GET /api/v1/intelligence/reports/{id}/`
- `id` must be UUID string
- Response: detail object
- Canonical response fields:
  - `id`: UUID string
  - `title`: string
  - `status`: canonical enum above
  - `is_read`: boolean
  - `created_at`: ISO string
  - `report_type`: string
  - `full_text`: string
  - `insights`: string[]
  - `recommended_actions`: string[]
  - `recommended_activities`: `{ id, title, reason }[]`
- Compatibility aliases retained in payload where useful:
  - `report_title`, `report_summary`, `key_insights`, `suggested_actions`

### `GET /api/v1/intelligence/reports/unread-count/`
- Response keys:
  - `count`
  - `unread_count`
  - both are present during compatibility period and hold same value

### `POST /api/v1/intelligence/reports/{id}/read/`
- Marks report as read, `id` is UUID string

## Data mapping assumptions
- `report_type` is derived as:
  - `trigger_tier` if available, otherwise `accumulative`
- `title` is normalized from `report_title`
- `preview` is truncated summary from `report_summary`

## Status handling (mobile mapping)
- Frontend treats canonical status with a compatibility UI status:
  - `completed + is_read=false` -> `generated`
  - `completed + is_read=true` -> `read`
  - others keep canonical state

## Backward compatibility policy
- Keep old internal model names and security boundaries.
- Do not expose encrypted/internal analysis fields in client serializers.
- Add alias fields temporarily in payload for transition stability.
