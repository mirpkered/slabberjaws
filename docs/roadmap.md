# Slabberjaws Roadmap

This roadmap summarizes the current product state and the remaining work identified in recent development and physical-device testing. Completed items reflect the project history and the user's reported device/workflow results; they are not a claim that every item was re-tested in this update.

## Completed

- Support eleven graders across the collection and card-entry workflows: Degree, PSA, CGC, PGS, Collect Direct, GMA, Integrity Grading, CSG, C3G, SGC, and GAS.
- Preserve supported Degree certification lookup while keeping unsupported grader lookups on manual-entry paths.
- Recognize the confirmed CSG and C3G QR formats, retaining their certification numbers and original verification URLs. CSG's encoded grade is an editable candidate, not an authentication claim.
- Support scan and Photograph Slab evidence in one in-progress Add Card session, with stronger structured scan evidence and manual edits protected from weaker OCR suggestions.
- Keep captured slab photos local and temporary; no photo upload or permanent photo storage is part of the workflow.
- Expand the Supabase grader constraint for all eleven canonical grader values without changing collection records, duplicate protection, or RLS.
- Add a restricted-role Supabase keepalive workflow using a read-only `SELECT 1`, scheduled daily at 07:23 UTC and manually runnable. Historical GitHub runs show successful database queries, including Oct 25, 2026; whether Supabase counts this operation toward Free-plan inactivity is undocumented, and the project's restored/active state still requires verification.

## Next

- Continue physical iPhone checks of scan-to-photo evidence handoff, CSG QR grade retention, crop behavior, and OCR diagnostics on real slabs.
- Use diagnostic-mode raw OCR and exact Tesseract input previews to identify any remaining image-quality or candidate-extraction failures before tuning OCR further.
- Keep certification lookups limited to integrations that are explicitly supported; do not scrape grader websites or infer slab authenticity from a decoded code or OCR result.

## Operational notes

- The keepalive uses the restricted `slabberjaws_keepalive` database role and the shared session pooler. It does not read or write card records and does not require app users to sign in.
- The workflow runs once per day on `23 7 * * *` (UTC). GitHub Actions scheduling may be delayed or missed; the cron time is not guaranteed.
- Daily `SELECT 1` success confirms the restricted database connection and query, but does not prove Supabase counts the operation as qualifying activity. Free-plan inactivity pauses remain possible; this is not a substitute for a paid availability guarantee.
- The dashboard showed the project as Unhealthy during the Oct 27, 2026 investigation. After restoration, verify Healthy/Active status and manually run the keepalive before treating database connectivity as current. No database schema or card-data change was part of the scheduling update.
