# GitHub Scout Google login setup

## Google Cloud configuration

1. Open Google Cloud Console and create or select a project.
2. Open **Google Auth Platform > Branding**.
3. Use `GitHub Scout` as the application name and complete the required contact fields.
4. Open **Audience** and select **External** so any Google account can sign in.
5. Open **Data Access** and keep only the basic identity scopes: `openid`, email and profile.
6. Open **Clients** and create an OAuth client.
7. Choose **Web application**.
8. Add this Authorized JavaScript origin:

   `https://github-scout-three.vercel.app`

9. Add this Authorized redirect URI:

   `https://welgeoyeurirwujlowle.supabase.co/auth/v1/callback`

10. Create the client and privately copy the Client ID and Client Secret.

## Supabase configuration

1. Open **Authentication > Sign In / Providers > Google**.
2. Enable the Google provider.
3. Paste the Google Client ID and Client Secret.
4. Save the provider settings.

The Client Secret belongs only in the Supabase provider settings. Never paste it
into `index.html`, `backend.js`, GitHub, chat, email or a public document.

## Website behavior

- The public landing page remains visible.
- Scan, candidate search, contributor search, X-ray and shortlist actions require login.
- Selecting a gated action opens the account window.
- Users can continue with Google or use verified email/password login.
- A Google login creates the same private recruiter profile and workspace as email login.
- The owner dashboard records the account provider as Google or email.
