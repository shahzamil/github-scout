# GitHub Scout visitor tracking setup

## 1. Create the database table

1. Open the Supabase project.
2. Select **SQL Editor** in the left sidebar.
3. Select **New query**.
4. Open `supabase-tracker.sql`, copy the entire file, and paste it into the editor.
5. Select **Run**.
6. Confirm that the result says `Success`.

## 2. Deploy the website update

The updated `index.html` already contains the Supabase Project URL and
publishable key. Push `index.html` and `supabase-tracker.sql` to GitHub. Vercel
will redeploy the site automatically when the repository is connected.

## 3. Verify tracking

1. Open the deployed GitHub Scout website in a private browser window.
2. Refresh the page once.
3. In Supabase, open **Table Editor** and select `visitor_events`.
4. A `page_view` row should appear.
5. The website footer should display the anonymous visitor count.

## Recorded information

- Anonymous browser ID
- Anonymous session ID
- New or returning visitor status
- Visit time
- Page path
- Referral hostname
- Device type
- Browser and operating system
- Browser language and time zone
- Screen dimensions
- Product actions such as candidate scan, search, shortlist save, and print

## Never recorded

- GitHub tokens
- GitHub usernames or candidate information
- Search filters or search queries
- Job descriptions
- LinkedIn text
- Shortlist contents or notes
- Names, email addresses, or phone numbers

Individual visitor rows are visible only through the private Supabase project.
Public visitors can submit allowed events and read the aggregate visitor count,
but they cannot read, change, or delete individual event records.
