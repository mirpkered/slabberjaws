# Supabase database keepalive

`.github/workflows/supabase-keepalive.yml` performs a direct, read-only PostgreSQL `SELECT 1` against the Slabberjaws project (`kewynepvspcmrujustds`). It runs on cron `23 7 */3 * *` (UTC) and can also be started with **Actions → Supabase database keepalive → Run workflow**. GitHub cron uses calendar day-of-month steps rather than a rolling timer, can be delayed, and is not guaranteed to run at an exact time.

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

After adding the secret, open the workflow under the repository's **Actions** tab and select **Run workflow** for an immediate check. A successful run must show the `SELECT 1` verification step; a green HTTP/API response alone is not used as evidence. Scheduled and manual failures are visible in the same workflow's run history and logs. The output is limited to connection validation and the scalar query result; no card records are selected or changed.

Disable it from the workflow's Actions page using **Disable workflow**. Re-enable it there when desired. Scheduled Actions can be delayed or paused by GitHub and this activity may help reduce inactivity pauses, but it is not a guaranteed substitute for Supabase's paid availability guarantees.

