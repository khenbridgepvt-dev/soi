---
id: 31
title: MVP exit — Gate 3 and UAT sign-off
labels: [wayfinder:task, mvp-exit]
status: open
assignee:
parent: 1
blocked-by: [9, 24, 25, 26, 27, 28, 29, 30]
mode: HITL
created: 2026-08-01
---

## Question

Prove the destination is reached: the full pre-UAT verification gate, UAT with the firm, and pilot cutover — the map's exit ticket.

**Scope**

- **Gate 3** per [IMPLEMENTATION_PLAN.md §A.3](../../docs/IMPLEMENTATION_PLAN.md): full P1 sweep per the [test_plan.md §5.1](../../docs/test_plan.md) traceability matrix; security suite TC-097–100; TC-E2E-001 full lifecycle (§7 script, all 13 steps) — manually or via Playwright if time allows; performance (board < 3s @ 100 tasks, API < 1s); Lighthouse accessibility ≥ 90. Defects logged per §8, S1/S2 block.
- **Pre-UAT cutover** per plan §D.3: documented test-data reset on the cloud project, real firm accounts created, schema freeze.
- **UAT** per test_plan §9.2 (HITL): stakeholders walk the Must stories on the cloud URL; record ✅/❌/⚠ per story; sign-off document with signatures.
- **Raise the Excel question** (map fog): confirm with the firm whether historical Excel data is imported or the pilot starts clean; if import is wanted, it becomes a new charted effort, not scope creep here.

**Spec pointers** — test_plan §5.1, §7, §8, §9 · plan §A.3 Gate 3, §D.3

**Done when** every row of the test_plan §9.1 exit-criteria table holds and the signed UAT document exists. Resolution records results, open S3 defects with workarounds, and the go-live date. **This closes the map.**

**Test seam** — none new; this ticket runs everything the others built.

**Do NOT**

- No new features, however small — defect fixes only.
- No schema changes after the freeze except S1/S2 fixes.
- Do not skip the security suite because "RLS was tested per ticket" — the full matrix runs again here (risk R2).
