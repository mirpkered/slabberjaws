# Slabberjaws Supabase setup

Cloud accounts remain disabled until these steps are completed. Without configuration, Slabberjaws continues to use browser-local storage.

## 1. Create the database objects

Create a Supabase project, open **SQL Editor**, and run [`supabase/schema.sql`](supabase/schema.sql). The script creates the `cards` table, its per-user certification uniqueness constraint, timestamp trigger, grants, Row Level Security, and separate ownership policies for reading, inserting, updating, and deleting.

Do not use a service-role key or database password in the frontend.

## 2. Configure authentication

In **Authentication → Providers → Email**, leave email/password enabled. Hosted Supabase projects require email confirmation by default; either keep that safer default or deliberately change it for testing.

In **Authentication → URL Configuration** set:

- Site URL: `https://mirpkered.github.io/slabberjaws/`
- Redirect URL: `https://mirpkered.github.io/slabberjaws/`
- Local redirect URL: `http://localhost:5173/`

The same URLs are used for email confirmation and password-recovery links. In
Supabase, make sure both exact URLs are listed in **Additional Redirect URLs**;
the recovery email exchanges its one-time token in the browser and opens the
in-app **Set a new password** screen. Keep the Site URL set to the production
Pages URL above.

If local development uses another port, add that exact origin with a trailing slash as another allowed redirect URL.

## 3. Configure local development

Copy `.env.example` to `.env.local` and replace only the placeholders:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

`.env.local` is ignored by Git. The anon key is designed for browser use; RLS is what enforces data ownership.

## 4. Configure GitHub Pages

In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables** and add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These are build-time public configuration values. No GitHub secret is required, and no service-role credential should be added. Re-run the Pages workflow after adding or changing either variable.

## Behavior

- Signed out or unconfigured: the `slabvault.cards.v1` → `slabberjaws.cards.v1` local migration remains supported.
- Signed in: Supabase is authoritative. Failed cloud writes show an error and are not copied into local storage.
- If local cards exist at sign-in, the user may explicitly import them. Duplicate grader/cert pairs are skipped and local data is never deleted automatically.
