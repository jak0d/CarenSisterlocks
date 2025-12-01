# Quick Setup Guide

## 🎉 Your CarenSisterlocks booking platform is ready!

The foundation has been built with:
- ✅ React + TypeScript + Tailwind CSS
- ✅ Authentication system
- ✅ Database schema
- ✅ All page layouts
- ✅ Beautiful landing page

## 🚀 Next Steps to Get Running:

### 1. Set Up Supabase (5 minutes)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project"
3. Fill in:
   - **Name**: CarenSisterlocks
   - **Database Password**: (choose a strong password)
   - **Region**: Choose closest to Kenya
4. Wait for project to be created (~2 minutes)

### 2. Get Your API Credentials

1. In your Supabase project, go to **Settings** > **API**
2. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### 3. Configure Your App

1. In your project folder, create a file called `.env`:
   ```
   VITE_SUPABASE_URL=paste_your_project_url_here
   VITE_SUPABASE_ANON_KEY=paste_your_anon_key_here
   ```

### 4. Run Database Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Open `supabase/migrations/001_initial_schema.sql` from your project
4. Copy and paste the entire contents
5. Click "Run" (bottom right)
6. Repeat for:
   - `002_rls_policies.sql`
   - `003_seed_data.sql`

### 5. Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### 6. Test the App!

1. Open http://localhost:5173
2. Click "Sign Up"
3. Create an admin account:
   - Full Name: Your Name
   - Email: your@email.com
   - Account Type: **Client** (for now, we'll make you admin manually)
   - Password: (choose one)

### 7. Make Yourself Admin (One-time setup)

1. In Supabase dashboard, go to **Table Editor**
2. Find the `users` table
3. Find your user row
4. Change `role` from `client` to `admin`
5. Click "Save"
6. Refresh your app - you should now see the admin dashboard!

## 🎨 What You Can Do Now:

### As Admin:
- View dashboard at `/admin`
- See sample services (from seed data)
- Navigate through all admin pages

### As Client:
- View the beautiful landing page
- See all services
- Click "Book Appointment" (coming soon)

## 📝 What's Next:

The next phase is to build:
1. **Services Management** - Full CRUD for services
2. **Workers Management** - Add and manage workers
3. **Booking System** - The 5-step booking flow
4. **Google Calendar** - Real-time availability
5. **M-Pesa Payments** - Deposit payments

## 🐛 Troubleshooting:

**Problem**: "Missing Supabase environment variables"
- **Solution**: Make sure `.env` file exists with correct values

**Problem**: Can't see admin dashboard after signup
- **Solution**: Change your role to `admin` in Supabase Table Editor

**Problem**: Database errors
- **Solution**: Make sure all 3 migration files were run successfully

**Problem**: Page won't load
- **Solution**: Check browser console (F12) for errors

## 📞 Need Help?

Check the full README.md for detailed documentation!

---

**Current Status**: ✅ Foundation Complete - Ready for Phase 2!
