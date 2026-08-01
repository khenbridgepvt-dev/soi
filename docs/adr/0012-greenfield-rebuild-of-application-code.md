# Greenfield rebuild of application code

The existing application code in the lawcrm repo root is **disposable**. The MVP is built fresh from the locked spec package (`docs/Mvp4/docs/`) at the repo root after archiving the old code to a `legacy-app` branch and wiping everything except `docs/` and git history. During the rebuild, no session reads, reuses, or plans around the old code.

**Why:** The old app predates the locked specs and carries unknown drift from them. Auditing it for salvage would cost more than rebuilding against a complete, approved spec — and partial reuse would blur which behaviour is spec-conformant. A clean tree also matches the canonical structure in `deployment_guide.md` §10 exactly, which the implementation tickets and `IMPLEMENTATION_PLAN.md` depend on.
