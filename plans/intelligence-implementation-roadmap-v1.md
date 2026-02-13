# Intelligence Implementation Roadmap v1

## Objective
Deliver contract compatibility and stable client integration without changing chat/analysis quality logic.

## Track 1: Backend API contract alignment (1 day)
- Update serializer layer in `backend/apps/intelligence/serializers.py`
  - list/detail fields unified with `title/report_type/preview`
  - maintain compatibility aliases
- Update unread count endpoint in `backend/apps/intelligence/views.py`
  - return both `count` and `unread_count`
- Validate with API smoke checks from existing client calls.

## Track 2: Frontend normalization layer (1 day)
- Add `mobile/src/features/intelligence/adapters.ts`
- Update API layer to consume backend models and map to normalized UI models
- Update hooks and screens to use UUID strings
- Remove implicit numeric assumptions from report id
- Update read-marking condition based on canonical + compatibility status.

## Track 3: Documentation + rollout guardrails (same cycle)
- Add contract docs under `plans/`
- Keep a single source of truth for status and field mappings
- Keep compatibility fields in response for one transition release.

## Merge criteria
- `mobile` report list loads and opens details from UUID ids
- Detail screen renders without field-not-found crash
- report unread badge remains correct
- No encrypted analysis fields exposed beyond intended report payload
