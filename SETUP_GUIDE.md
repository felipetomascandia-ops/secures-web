# Olimpo Coverage Group - Complete Setup Guide

## 1. Prerequisites
- Node.js 18+ installed
- Supabase account (https://supabase.com)
- Google Cloud Console account for OAuth

## 2. Supabase Setup

### 2.1 Create a New Project
1. Go to https://supabase.com
2. Click "New Project"
3. Fill in project details:
   - Name: `Olimpo Coverage Group`
   - Database Password: (save this!)
   - Region: Choose your region
4. Click "Create new project" and wait for it to be ready

### 2.2 Update Environment Variables
1. In Supabase, go to Project Settings → API
2. Copy:
   - Project URL (looks like: `https://abcdefghijklmnopqrst.supabase.co`)
   - `anon public` key (starts with `eyJ...`)
3. Paste into your `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 2.3 Run Database Migration
1. In Supabase, go to SQL Editor
2. Click "New Query"
3. Copy the entire content of `supabase-schema.sql`
4. Paste and click "Run"

## 3. Google OAuth Setup

### 3.1 Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing

### 3.2 Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" → "Create"
3. Fill in:
   - App name: `Olimpo Coverage Group`
   - User support email: your email
   - Developer contact information: your email
4. Click "Save and Continue" through all steps
5. Click "Back to Dashboard"

### 3.3 Create OAuth Credentials
1. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
2. Application type: "Web application"
3. Name: `Olimpo Coverage Group Web`
4. Authorized JavaScript origins:
   ```
   https://www.olimpocoveragegroup.com
   https://www.olimpocoveragegroup.com
   ```
5. Authorized redirect URIs:
   ```
   https://YOUR_SUPABASE_URL/auth/v1/callback
   ```
6. Click "Create"
7. **IMPORTANT**: Save the Client ID and Client Secret

### 3.4 Enable Google Auth in Supabase
1. In Supabase, go to Authentication → Providers → Google
2. Toggle "Enabled" ON
3. Paste your Google Client ID and Client Secret
4. Click "Save"

## 4. First Admin Setup

### 4.1 Create Your Account
1. Start the dev server: `npm run dev`
2. Go to https://www.olimpocoveragegroup.com
3. Click "Sign Up"
4. Register with your email or Google
5. Verify your email if using email/password

### 4.2 Make Yourself an Admin
1. In Supabase, go to Authentication → Users
2. Find your user and copy your User ID
3. Go to SQL Editor
4. Run this query (replace YOUR_USER_ID):
```sql
INSERT INTO admins (user_id)
VALUES ('YOUR_USER_ID');
```

### 4.3 Verify Admin Access
1. Go to https://www.olimpocoveragegroup.com/admin/tickets
2. You should see the admin panel!

## 5. Features Overview

### User Features
- ✅ Register with email/password or Google
- ✅ Email verification
- ✅ User profile (name, business name)
- ✅ Create support tickets
- ✅ Chat with support
- ✅ View ticket history

### Admin Features
- ✅ View all tickets
- ✅ Update ticket status
- ✅ Chat with users (marked as admin)
- ✅ Separate admin panel at `/admin/tickets`

### Widget
- ✅ Floating "Support" button on all pages
- ✅ Quick ticket creation
- ✅ Access to tickets (if logged in)

## 6. Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 7. Troubleshooting

### "Invalid hook call" error
- Make sure all components using Supabase are wrapped in `SupabaseProvider`
- The root layout now has the provider

### "Access Denied" on admin panel
- Verify your user ID is in the `admins` table
- Check that you're logged in with the correct account

### Can't sign in with Google
- Double-check Client ID/Secret in Supabase
- Verify redirect URI matches exactly
- Check Google Cloud Console for errors

### Database errors
- Make sure you ran the full `supabase-schema.sql`
- Check that Row Level Security policies are correct

## 8. Production Deployment
1. Set up your domain
2. Update Google OAuth redirect URIs with production URL
3. Deploy to Vercel or similar
4. Set environment variables in production
5. Enjoy!
