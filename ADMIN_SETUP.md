# Admin Panel Setup Guide

## 1. First, execute the updated SQL schema

1. Go to your Supabase project → SQL Editor
2. Click "New query"
3. Paste the contents of `supabase-schema.sql`
4. Click "Run"

This creates the `admins` table to identify admin users.

## 2. Add yourself as an admin

1. First, **log in with your Google account** on the website (go to `/tickets` and log in)
2. In Supabase, go to:
   - Authentication → Users
   - Find your email in the list
   - Copy your user ID (it looks like: `550e8400-e29b-41d4-a716-446655440000`)

3. Go to SQL Editor and run this query (replace `YOUR_USER_ID` with your actual ID):

```sql
INSERT INTO admins (user_id)
VALUES ('YOUR_USER_ID');
```

For example:
```sql
INSERT INTO admins (user_id)
VALUES ('550e8400-e29b-41d4-a716-446655440000');
```

## 3. Verify you're an admin

1. Go to `/admin/tickets`
2. If you see "Admin Panel" and can view tickets, it worked!
3. If you see "Access Denied", double-check the user ID you used in step 2

## 4. How the system works

- **Users**: Log in at `/tickets`, send messages marked `is_admin = false`
- **Admins**: Use `/admin/tickets`, send messages marked `is_admin = true`
- **Widget**: The floating "Support" button on the home page - works for both logged-in users and guests
- **Visuals**:
  - Admin messages: Purple, labeled "Support Team"
  - User messages: Blue, labeled "You" or "User"

## Troubleshooting

If you get "Access Denied":
1. Make sure you're logged in with the same account you added to `admins`
2. Double-check the user ID in Supabase
3. Try refreshing the page

If messages don't show up:
1. Check the browser console for errors
2. Make sure realtime is enabled in Supabase
