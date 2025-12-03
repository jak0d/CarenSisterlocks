# Worker Invitation System - Documentation

## Overview
The worker management system has been enhanced to use an **email invitation flow** instead of temporary passwords. When admins add a new worker, the worker receives an email invitation to set up their own password and complete their account details.

---

## How It Works

### For Admins

#### 1. **Adding a New Worker**
1. Navigate to **Workers Management** (`/admin/workers`)
2. Click **"Add Worker"** button
3. Fill in the worker details:
   - Full Name
   - Email Address (invitation will be sent here)
   - Dashboard Permission (none/view/worker)
   - Active status
4. Click **"Create Worker"**

#### 2. **After Creating a Worker**
A modal will appear showing:
- ✅ **Invitation Sent** confirmation
- Worker's name and email
- **Backup temporary password** (save this!)
- Next steps for the worker

**Important**: The backup password is shown only once. Save it in case the worker doesn't receive the email.

#### 3. **Managing Worker Services**
- Click the **briefcase icon** on any worker card
- Select/deselect services the worker can provide
- Click **"Save Services"** to update

---

### For Workers

#### 1. **Receiving the Invitation**
Workers will receive an email at the address provided by the admin with:
- Welcome message
- Link to set up their account
- Instructions to complete setup

#### 2. **Setting Up Account**
1. Click the link in the invitation email
2. You'll be taken to `/worker/setup` page
3. Complete the setup form:
   - Verify your email (pre-filled)
   - Enter your full name
   - Create a secure password (min 8 characters)
   - Confirm your password
4. Click **"Complete Setup"**

#### 3. **After Setup**
- You'll see a success message
- Automatic redirect to login page after 3 seconds
- Log in with your email and new password

#### 4. **Backup Password Option**
If you don't receive the email:
1. Ask your admin for the backup password
2. Go to the login page
3. Log in with your email and the backup password
4. **Change your password immediately** after logging in

---

## Technical Details

### Email Invitation Flow

```
Admin Creates Worker
       ↓
Supabase Auth User Created
       ↓
Worker Profile Created in DB
       ↓
Email Sent to Worker
       ↓
Worker Clicks Link → /worker/setup
       ↓
Worker Sets Password & Name
       ↓
Profile Updated
       ↓
Redirect to Login
```

### Database Structure

**users table**:
- `id` (UUID) - Links to auth.users
- `email` (TEXT)
- `full_name` (TEXT)
- `role` (TEXT) - Set to 'worker'

**workers table**:
- `id` (UUID)
- `user_id` (UUID) - Links to users.id
- `name` (TEXT)
- `email` (TEXT)
- `dashboard_permission` (TEXT)
- `is_active` (BOOLEAN)
- `calendar_connected` (BOOLEAN)

**worker_services table**:
- `id` (UUID)
- `worker_id` (UUID) - Links to workers.id
- `service_id` (UUID) - Links to services.id
- `custom_price` (DECIMAL)

---

## Features

### Admin Features
✅ Create worker accounts with email invitations  
✅ Manage worker services (assign/unassign)  
✅ View service count per worker  
✅ Activate/deactivate workers  
✅ Edit worker details  
✅ Delete workers (cascades to user account)  
✅ Backup password for email delivery issues  

### Worker Features
✅ Receive email invitation  
✅ Set own password  
✅ Complete profile information  
✅ Secure account setup  
✅ Backup password option  

---

## Security Considerations

1. **Password Requirements**:
   - Minimum 8 characters
   - Must match confirmation
   - Stored securely by Supabase Auth

2. **Email Verification**:
   - Workers must have access to the email provided
   - Email link expires after a certain time (Supabase default)

3. **Backup Password**:
   - Generated securely (12 characters, mixed case + numbers + symbols)
   - Shown only once to admin
   - Worker should change it immediately if used

4. **RLS Policies**:
   - Workers can only update their own profile
   - Admins have full access to worker management
   - Service assignments controlled by RLS

---

## Troubleshooting

### Worker Didn't Receive Email
**Solution**: Admin should share the backup password shown during worker creation. Worker can log in and change password immediately.

### Worker Can't Access Setup Page
**Solution**: Ensure the email link hasn't expired. Admin can delete and recreate the worker account if needed.

### Password Reset Needed
**Solution**: Use Supabase's password reset flow or admin can delete and recreate the worker account.

### Services Not Showing for Worker
**Solution**: Admin needs to assign services to the worker using the briefcase icon in Workers Management.

---

## API Endpoints Used

### Worker Creation
```typescript
// Create auth user with invitation
supabase.auth.signUp({
  email: formData.email,
  password: temporaryPassword,
  options: {
    data: { full_name, role: 'worker' },
    emailRedirectTo: `${window.location.origin}/worker/setup`
  }
});

// Create worker profile
supabase.from('workers').insert([{
  user_id, name, email, dashboard_permission, is_active
}]);
```

### Worker Setup
```typescript
// Update password
supabase.auth.updateUser({
  password: newPassword,
  data: { full_name }
});

// Update profiles
supabase.from('users').update({ full_name });
supabase.from('workers').update({ name });
```

---

## Future Enhancements

Potential improvements:
- [ ] Email template customization
- [ ] Resend invitation option
- [ ] Bulk worker import
- [ ] Worker onboarding checklist
- [ ] Custom email redirect URLs
- [ ] Worker profile photos
- [ ] SMS invitation option
- [ ] Multi-language support

---

## Support

For issues or questions:
1. Check this documentation
2. Review the troubleshooting section
3. Contact system administrator
4. Check Supabase Auth logs for email delivery status

---

**Last Updated**: December 3, 2025  
**Version**: 1.0
