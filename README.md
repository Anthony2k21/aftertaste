# Aftertaste

A small way to rate a video. Title and link are optional. Seven ratings, each from 1 to 5, become one score out of 100.

The look is a dark, square, terminal-style UI: near-black panels with 1px rules, an amber accent, zero rounded corners, Space Grotesk uppercase headings and JetBrains Mono for everything else, blocky 1–5 rating buttons, and a bracketed, segmented score readout. It is built to work on a phone as well as a desktop.

Signed-in ratings sync across devices through Supabase. With no Supabase env vars, or while signed out, ratings stay in this browser’s `localStorage`. After the first sign-in, the app offers once to copy those browser ratings onto the account.

Anthony creates the Supabase project and connects the repo to Vercel. Both need his accounts. The steps below are the whole setup.

## 1. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com) and create a project.
2. Wait until the database is ready.
3. Open **SQL Editor → New query**.
4. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it.

That creates `public.ratings`:

| Column | Type |
| --- | --- |
| `id` | `uuid` primary key |
| `user_id` | `uuid` references `auth.users` |
| `title` | `text` |
| `url` | `text` |
| `scores` | `jsonb` |
| `total` | `integer` |
| `created_at` | `timestamptz` |

Row level security is on. A signed-in person can read, insert, and delete only rows where `user_id` is their own id. The anon key cannot read anyone else’s ratings.

## 2. Turn on email sign-in

1. In Supabase, open **Authentication → Sign In / Providers → Email** and enable Email.
2. Open **Authentication → URL Configuration**.
3. Set **Site URL** to the Vercel URL you will use, for example `https://your-app.vercel.app`.
4. Add these **Redirect URLs**:
   - `http://127.0.0.1:4721`
   - `http://localhost:4721`
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/**`

The app sends a magic link with `signInWithOtp`. Open that link in the same browser that asked for it. Supabase uses PKCE, so the link finishes sign-in only in the browser that still has the code verifier.

## 3. Copy the URL and anon key

In **Project Settings → API** copy:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

Do not put the `service_role` key in the app or in Vercel. It bypasses row level security. The anon key is meant to be in the browser; the SQL policies are what keep rows private.

## 4. Connect the repo to Vercel

1. In Vercel, **Add New → Project** and import this repo.
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`. `vercel.json` already sets those.
3. Before the first deploy, add environment variables for **Production** (and **Preview**, if you use preview URLs):

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. Deploy.

Vite reads `VITE_*` variables at **build** time and bakes them into the static files. After you change either value in Vercel, redeploy. A restart is not enough.

The site is a static Vite build. There is no server in this repo. Vercel rewrites unknown paths to `index.html` so the magic-link return still loads the app.

If a preview URL differs from production, add that URL to the Supabase redirect list before asking for a magic link there.

## Local development

```bash
npm install
cp .env.example .env
```

Fill in `.env` with the same two values, then:

```bash
npm run dev
```

The dev server listens on [http://127.0.0.1:4721](http://127.0.0.1:4721). Add that origin to the Supabase redirect list or the magic link will be rejected.

Leave the variables empty, or omit `.env`, and the app never calls Supabase. Ratings stay in `localStorage` under `aftertaste.entries.v1`.

```bash
npm test
npm run lint
npm run build
npm run preview
```

## How sync works

- Signed out, or Supabase not configured: save, delete, clear, and JSON import/export use this browser only.
- Signed in: those actions read and write the `ratings` table. The scoreboard is the account, not the browser cache.
- The first time an account signs in on a browser that already has local ratings, the app asks once to add them to the account. **Add to my account** copies them. **Not now** leaves them local and does not ask again on this browser. JSON import still works later.
- Totals are calculated again when rows are loaded, so a stored `total` cannot drift from the formula.

## Scoring

A rating of 1 adds nothing. A rating of 5 adds that criterion’s full weight. 2, 3, and 4 fill in a quarter, a half, and three quarters.

```
score = round(sum of weight × (rating − 1) / 4)
```

| Criterion | Weight |
| --- | --- |
| How fulfilled do I feel | 20% |
| How good do I feel after watching | 20% |
| Would I watch it again | 15% |
| Did I learn something | 15% |
| Worth the time | 15% |
| Held my attention | 10% |
| Will I act on it | 5% |

If “How good do I feel after watching” is 1, the rounded total is capped at 60.

| Total | Tier |
| --- | --- |
| 90+ | Must-rewatch |
| 75–89 | Great |
| 60–74 | Decent |
| 40–59 | Meh |
| Under 40 | Skip |
