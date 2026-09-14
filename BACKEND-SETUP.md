# GitHub Scout account backend setup

The account backend uses Supabase Authentication, Postgres and Row Level
Security. It adds recruiter accounts, synced shortlists, hiring projects and an
owner dashboard.

## 1. Run the backend database script

1. Open the Supabase project.
2. Select **SQL Editor**.
3. Select **New query**.
4. Open `supabase-backend.sql` and copy the entire file.
5. Paste the SQL into Supabase and select **Run**.
6. Confirm that Supabase reports `Success`.

## 2. Configure account URLs

1. In Supabase, open **Authentication**.
2. Open **URL Configuration**.
3. Set **Site URL** to `https://github-scout-three.vercel.app`.
4. Add `https://github-scout-three.vercel.app/**` to **Redirect URLs**.
5. Save the settings.

Email/password authentication should remain enabled. Email confirmation is
recommended so the owner can know that registered email addresses are valid.

## 3. Deploy the website files

Copy these files into the GitHub Scout repository and push them to `main`:

- `index.html`
- `backend.js`
- `supabase-backend.sql`
- `supabase-tracker.sql`
- `BACKEND-SETUP.md`

Vercel will deploy the update automatically.

## 4. Create the owner account

1. Open the deployed website.
2. Select **Create account / Sign in**.
3. Register with `shahzad.muzzamil@gmail.com`.
4. Open the confirmation email from Supabase.
5. Return to GitHub Scout and sign in.

This email is the only account permitted to open the owner dashboard.

## Backend features

- Email/password registration and login
- Verified email flow through Supabase Auth
- Recruiter profiles
- Private hiring projects and job descriptions
- Cross-device shortlist synchronization
- Private candidate notes and stages
- Usage events associated with signed-in users
- Owner-only user list and recent activity dashboard
- Row Level Security for every user-owned table

## Privacy and security

- Passwords are managed by Supabase Auth and are never visible to the website owner.
- GitHub tokens remain in the visitor's browser and are never uploaded.
- Users can access only their own projects and candidate records.
- The owner account can read account and usage data for administration.
- Candidate search terms, GitHub tokens, pasted LinkedIn text and unsaved reports are not recorded by analytics.
