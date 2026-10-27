# Supabase database keepalive

`.github/workflows/supabase-keepalive.yml` performs a direct, read-only PostgreSQL `SELECT 1` against the Slabberjaws project (`kewynepvspcmrujustds`). It runs once each day at `07:23 UTC` (`23 7 * * *`) and can also be started with **Actions → Supabase database keepalive → Run workflow**. The minute is off the hour to reduce scheduling contention, but GitHub scheduled workflows can be delayed or missed and are not guaranteed to run at an exact time.

## One-time credential setup

The workflow intentionally does not use the Supabase `service_role`, the app's public key, or the database owner. The app's current schema revokes table access from `anon`; a REST request with the public key would not be a reliable database health query. Instead, configure a dedicated login role with no table/schema access. `SELECT 1` needs no table grants.

In the Supabase SQL editor for project `kewynepvspcmrujustds`, create a unique random password and run the following after replacing the placeholder. Keep the password private:

```sql
create role slabberjaws_keepalive
  login
  password 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD'
  nosuperuser
  nocreatedb
  nocreaterole
  noinherit
  noreplication;

grant connect on database postgres to slabberjaws_keepalive;
```

This creates a narrowly scoped login role; it does not change the application schema, RLS, policies, or card rows, and it grants no access to card tables. If the role already exists, do not rerun `CREATE ROLE`; rotate/set its password and verify that its attributes and grants remain restricted.

Add one **Actions repository secret** named `SUPABASE_KEEPALIVE_DB_URL` in `mirpkered/slabberjaws`. Use the project dashboard's **Connect** dialog and the new role's connection details. The workflow accepts either:

- Direct host `db.kewynepvspcmrujustds.supabase.co`, database `postgres`, username `slabberjaws_keepalive`; or
- Supabase **shared session pooler** host `aws-0-us-east-1.pooler.supabase.com`, port `5432`, database `postgres`, username `slabberjaws_keepalive.kewynepvspcmrujustds`.

The password must be URL-encoded if it contains reserved URI characters. Before connecting, the validator checks the protocol, exact hostname, endpoint-specific username, database, port, and password presence. Failures name only the failed category and print the expected configuration; they never print the submitted URI, password, or actual supplied fields. A custom role through the shared session pooler uses the role-plus-project-ref username format described in [Supabase's connection documentation](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Running and monitoring

After adding the secret, open the workflow under the repository's **Actions** tab and select **Run workflow** for an immediate check. A successful run must show the `SELECT 1` verification step; a green HTTP/API response alone is not used as evidence. Review successful and failed executions in the same workflow's run history and open a run to inspect its validation and query steps. Failures cause the run to fail and are reported without printing the credential. The output is limited to connection validation and the scalar query result; no card records are selected or changed.

If Supabase has paused the project, open the project in the Supabase dashboard, choose **Resume project**, and confirm the restoration. Wait until the project reports Healthy/Active. Then manually run this workflow and verify the `SELECT 1` step succeeds. A workflow run cannot restore a paused project.

### Failure notifications

GitHub does not guarantee email for every scheduled workflow failure unless workflow notifications are enabled for the account that created the schedule. To receive email alerts:

1. In GitHub, open **Settings → Notifications → System → Actions**.
2. Select **Email** and **Only notify for failed workflows**, then save.
3. Confirm you are watching `mirpkered/slabberjaws` and that your GitHub email notifications are enabled.

GitHub's [workflow notification guidance](https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs) says scheduled workflow notifications go to the user who initially created the workflow; changing the cron syntax or disabling and re-enabling the workflow can change that recipient. The Actions tab remains the source for reviewing each run and its query step.

### Inactivity pause investigation — 2026-10-27

The GitHub Actions history available during this investigation contained 14 runs:

| Run | Started (UTC) | Event | Result | Database query |
| --- | --- | --- | --- | --- |
| 1 | Oct 10 17:05 | Manual | Failed | Not reached; connection validation failed |
| 2 | Oct 13 15:09 | Scheduled | Failed | Not reached; connection validation failed |
| 3–7 | Oct 14 19:30–19:59 | Manual | Failed | Not reached; connection validation failed |
| 8–9 | Oct 14 20:02–20:05 | Manual | Failed | Target validated; password authentication failed |
| 10 | Oct 14 20:13 | Manual | Succeeded | `SELECT 1` step succeeded |
| 11 | Oct 16 12:33 | Scheduled | Succeeded | `SELECT 1` step succeeded |
| 12 | Oct 19 14:46 | Scheduled | Succeeded | `SELECT 1` step succeeded |
| 13 | Oct 22 13:02 | Scheduled | Succeeded | `SELECT 1` step succeeded |
| 14 | Oct 25 12:38 | Scheduled | Succeeded | `SELECT 1` step succeeded |

The first workflow commit was made Oct 10 at 17:05 UTC, after that day's scheduled 07:23 UTC time, so no Oct 10 scheduled run was expected. From the first scheduled attempt on Oct 13 onward, the listed scheduled runs occurred; none were cancelled. The Oct 16–25 scheduled runs each completed the actual PostgreSQL query. They started roughly five to seven and a half hours after the old 07:23 UTC cron time, illustrating GitHub's scheduling delay.

Supabase's current [Free-plan pausing guide](https://supabase.com/docs/guides/platform/free-project-pausing) says a project is evaluated on sufficient **user database activity** over the past week, that too few user queries are the clearest candidates, and that a few database requests each day typically suffice. It also says that after a warning, project API calls or requests through a connected application can generate activity. The guide does **not** define whether a scheduled direct PostgreSQL `SELECT 1` from a restricted CI role counts, nor whether Auth or Edge Function requests count. It neither explicitly blesses nor prohibits synthetic scheduled keepalive traffic. The recorded SQL runs prove that the workflow connected and executed its query; they do not prove Supabase counted them for inactivity. The exact warning and pause timestamps were not available in the repository or Actions history, so the evidence cannot establish whether early failures, a missed qualifying activity window, or Supabase's activity classification caused this pause.

The operation remains direct SQL because the existing app schema denies `anon` access to `public.cards`; adding a public table grant, broadening RLS, using a service-role key, or creating a privileged API endpoint would expand access and is not justified by the available evidence. At the time of that investigation, no schedule change was made: the available run history showed no missed scheduled run after Oct 13, while the query type's eligibility remained undocumented. In this follow-up, the schedule is changed to daily at the user's request; it is the same restricted `SELECT 1` query and this frequency change does not establish that Supabase counts it. No card data, schema, grants, or policies were changed.

Supabase documents visiting the project dashboard or generating sufficient project API/application requests as ways to respond to a warning. We do not have evidence that daily scheduled `SELECT 1` queries alone cause Supabase to consider the project active or prevent an inactivity pause. If the Free project pauses again despite daily green query runs, use the dashboard/API activity guidance or consider a paid plan; this workflow is not an availability guarantee.

Disable it from the workflow's Actions page using **Disable workflow**. Re-enable it there when desired. Scheduled Actions can be delayed or paused by GitHub, and Supabase Free projects can still be paused for inactivity. This workflow is not a guaranteed substitute for Supabase's paid availability guarantees.

