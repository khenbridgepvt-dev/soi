# Global monthly reference counter with edit sync

Case reference sequential numbers are **global per month** — the 4th case accepted in May 2026 is `04` regardless of application type. Format: `MMYYNO/TYPE/ABC` (e.g. `052604/SKW/MAR`).

References are **editable by administrators** to align with external software. Edit rules:

1. **Uniqueness** — no two cases may share the same reference.
2. **Conflict on edit** — if admin changes sequence `04` → `05` but `05` already exists, the system assigns the next available number (`06`) instead and notifies the admin.
3. **Counter sync** — when an admin edits a reference to a higher sequence number, the monthly `reference_counters` value updates to `max(existing counter, edited sequence)` so the next auto-generated reference does not collide.
4. **External alignment** — admins may set any valid reference; the system does not renumber other cases automatically, only prevents duplicates and keeps the counter ahead of the highest used number.
