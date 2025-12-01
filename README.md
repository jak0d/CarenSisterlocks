# CarenSisterlocks Booking Platform

A streamlined booking platform for CarenSisterlocks where clients can book appointments without signup, featuring Google Calendar integration, M-Pesa payment for deposits, and role-based admin/worker access.

## 🌟 Features

### For Clients
- **No Signup Required**: Book appointments in under 2 minutes
- **Real-Time Availability**: See available time slots from Google Calendar
- **M-Pesa Payments**: Secure deposit payments for guaranteed appointments
- **Email Confirmations**: Automatic booking confirmations and reminders

### For Workers
- **Personal Dashboard**: View your bookings and earnings
- **Service Management**: Choose which services you offer
- **Calendar Integration**: Connect your Google Calendar
- **Receipt Generation**: Generate receipts for completed services

### For Admins
- **Full Management**: Manage services, workers, and bookings
- **Analytics Dashboard**: Track revenue, bookings, and performance
- **Payment Tracking**: Monitor deposits and payments
- **System Configuration**: Configure M-Pesa, business hours, and settings

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **State Management**: React Query
- **Forms**: React Hook Form
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- (Optional) Google Cloud account for Calendar API
- (Optional) M-Pesa Daraja API credentials

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
cd CarenSisterlocks
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your project URL and anon key

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Database Migrations

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_seed_data.sql`

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
CarenSisterlocks/
├── src/
│   ├── components/          # Reusable components
│   │   └── DashboardLayout.tsx
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx
│   ├── lib/                # Utilities and configurations
│   │   └── supabase.ts
│   ├── pages/              # Page components
│   │   ├── admin/          # Admin pages
│   │   ├── worker/         # Worker pages
│   │   ├── client/         # Client pages
│   │   ├── auth/           # Authentication pages
│   │   └── HomePage.tsx
│   ├── types/              # TypeScript types
│   │   └── index.ts
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── supabase/
│   └── migrations/         # Database migrations
├── public/                 # Static assets
├── .env.example           # Environment variables template
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 🔐 User Roles

### Client
- Can book appointments without creating an account
- Optional account creation to track booking history
- Access to personal dashboard

### Worker
- Must be invited by admin
- Can view their own bookings
- Can manage their services
- Can generate receipts

### Admin
- Full system access
- Can manage services, workers, and bookings
- Can configure system settings
- Can invite other admins

## 📝 Database Schema

### Main Tables
- `users` - User profiles (extends Supabase auth)
- `services` - Available services
- `workers` - Worker profiles
- `worker_services` - Worker-service relationships
- `bookings` - Appointment bookings
- `payments` - M-Pesa payment records
- `admins` - Admin users
- `system_settings` - System configuration

## 🎨 Design System

### Colors
- **Primary**: Red/Pink tones for CarenSisterlocks branding
- **Secondary**: Blue/Gray tones for professional look
- **Accent**: Green for success states

### Components
- Buttons: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-ghost`
- Inputs: `.input`, `.input-error`
- Cards: `.card`, `.card-hover`
- Badges: `.badge`, `.badge-success`, `.badge-warning`, `.badge-error`

## 🚧 Development Roadmap

### Phase 1: Core Booking (Current)
- [x] Project setup
- [x] Authentication system
- [x] Database schema
- [x] Basic UI components
- [ ] Public booking page
- [ ] Google Calendar integration
- [ ] Email notifications

### Phase 2: Payments
- [ ] M-Pesa STK Push integration
- [ ] Payment status tracking
- [ ] Receipt generation
- [ ] Refund management

### Phase 3: Enhancements
- [ ] Worker dashboard features
- [ ] Analytics and reporting
- [ ] Booking export
- [ ] 24-hour reminders

### Phase 4: Deployment
- [ ] Production deployment
- [ ] Domain configuration
- [ ] Monitoring setup
- [ ] User training

## 🔧 Configuration

### Business Hours
Edit in Supabase `system_settings` table or through admin dashboard:
- Monday-Friday: 8:00 AM - 9:00 PM
- Saturday: 8:00 AM - 10:00 PM
- Sunday: Closed (configurable)

### Booking Rules
- Advance booking: Up to 30 days
- Same-day bookings: Allowed
- Buffer time: 10 minutes between appointments

## 📧 Email Templates

Email notifications are sent for:
- Booking confirmation (with/without deposit)
- 24-hour reminders
- New booking alerts (to workers/admins)
- Payment receipts

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Secure authentication via Supabase Auth
- Environment variables for sensitive data
- HTTPS enforced in production

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Missing Supabase environment variables"
- **Solution**: Ensure `.env` file exists with correct values

**Issue**: Database connection errors
- **Solution**: Verify Supabase URL and anon key are correct

**Issue**: RLS policy violations
- **Solution**: Ensure migrations are run in correct order

## 📄 License

© 2025 CarenSisterlocks. All rights reserved.

## 🤝 Support

For support, email info@carensisterlocks.com or call +254 700 123 456.

---

Built with ❤️ for CarenSisterlocks
