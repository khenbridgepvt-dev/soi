# Tracker (local-markdown)

No remote issue tracker is configured for this repo, so issues live here as markdown files — one file per issue in [`issues/`](./issues/). If a real tracker (GitHub Issues, Linear…) is adopted later, migrate these files and delete this folder.

## Issue format

Filename: `NNNN-slug.md` — the number is the issue **id**, assigned sequentially. The **title** in front matter is the issue's name; refer to issues by name, not id.

```yaml
---
id: 4
title: Human-readable name
labels: [wayfinder:task, sprint-1-2]
status: open          # open | closed
assignee:             # empty = unclaimed
parent: 1             # id of the parent issue (map), if any
blocked-by: [2, 3]    # ids that must be closed before this is workable
mode: AFK             # AFK (agent alone) | HITL (needs the human live)
created: 2026-08-01
---
```

The body below the front matter is the issue content (`## Question` for wayfinder tickets). Execution tickets on this map additionally carry **Scope / Spec pointers / Done when / Test seam / Do NOT** subsections — the Do NOT list is the scope-creep guard and is binding.

## Wayfinding operations

How this tracker expresses the operations `skills/engineering/wayfinder/SKILL.md` needs:

- **The map** — the issue labelled `wayfinder:map` ([MVP Implementation Map](./issues/0001-mvp-implementation-map.md)). Child tickets set `parent:` to the map's id.
- **Create a ticket** — add a new file with the next free id. Ids are deterministic (file numbering), so blocking edges can be written at creation time; still re-verify edges after a batch of new tickets.
- **Claim** — set `assignee:` to yourself **before any work**. An open, unassigned ticket is unclaimed; skip tickets someone else has claimed.
- **Block** — list blocker ids in `blocked-by:`. A ticket is unblocked when every listed id has `status: closed`.
- **Close / resolve** — append a `## Resolution` section to the ticket body (the answer, links to assets), set `status: closed`, and add a one-line entry to the map's **Decisions so far**.
- **Frontier query** — open + unassigned + all blockers closed. To list candidates:

  ```powershell
  rg -l "status: open" tracker/issues   # then check assignee/blocked-by in each hit
  ```

  With a dozen-odd files, scanning the front matter by eye is fine.

Concurrent sessions may edit this folder; claim before working.
