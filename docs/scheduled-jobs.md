# Scheduled jobs (ticket 0028)

Edge Functions deploy separately from the Next.js app (ADR-0013). Register cron schedules in the Supabase dashboard after deploy.

## Deploy

```bash
supabase functions deploy detect-overdue
supabase functions deploy du-alerts
```

Required secrets (set in Supabase dashboard → Edge Functions → Secrets, or via CLI):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Cron schedules (Supabase dashboard → Edge Functions → Schedules)

| Function | Schedule | Notes |
|----------|----------|-------|
| `detect-overdue` | `*/15 * * * *` | Every 15 minutes — flags `is_overdue` and sends `task_overdue` notifications |
| `du-alerts` | `0 9 * * *` | Daily at 09:00 UTC — DU Tasks 12/13 escalation ladder (ADR-0007) |

Optional: invoke `du-alerts` with `?date=YYYY-MM-DD` for backfill or manual testing.

## Verify

```bash
curl -X POST "$SUPABASE_URL/functions/v1/detect-overdue" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
curl -X POST "$SUPABASE_URL/functions/v1/du-alerts?date=2026-07-17" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Integration tests in `tests/integration/scheduled-jobs.test.ts` exercise the shared runners (`runDetectOverdue`, `runDuAlerts`) directly.
