# Admin Registration Guide

## Overview

The CarenSisterlocks platform uses a **secure Admin Registration Key** system to control who can create admin accounts. This prevents unauthorized users from gaining administrative access while still allowing legitimate admins to sign up.

## How It Works

### For New Admins

1. **Navigate to Signup Page**: Go to `/signup` on the application
2. **Select Admin Role**: Choose "Admin" from the Account Type dropdown
3. **Enter Registration Key**: A special field will appear asking for the Admin Registration Key
4. **Complete Signup**: Fill in all other required fields and submit

### Admin Registration Key

The admin registration key is stored securely in the `.env` file:

```
VITE_ADMIN_REGISTRATION_KEY=CSL-ADMIN-2024-SECURE-KEY-XYZ789
```

**Important Security Notes:**
- ⚠️ **Change the default key immediately** to a secure, random string
- 🔒 Keep this key confidential - only share with trusted individuals
- 🔄 Rotate the key periodically for enhanced security
- 📝 Never commit the actual key to version control

### Generating a Secure Key

You can generate a secure admin key using various methods:

**Option 1: Online Generator**
- Use a password generator to create a 32+ character random string
- Example: `https://passwordsgenerator.net/`

**Option 2: Command Line (Linux/Mac)**
```bash
openssl rand -base64 32
```

**Option 3: Node.js**
```javascript
require('crypto').randomBytes(32).toString('hex')
```

**Option 4: PowerShell (Windows)**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### Key Format Recommendations

- **Minimum Length**: 24 characters
- **Include**: Letters (uppercase and lowercase), numbers, and special characters
- **Example Format**: `CSL-ADMIN-[YEAR]-[RANDOM-STRING]`
- **Good Example**: `CSL-ADMIN-2024-Kx9mP2nQ7vR4sT8wY3zA5bC1dE6fG0hJ`

## Sharing the Key

When you need to grant admin access to someone:

1. **Generate a new key** (optional but recommended)
2. **Update the `.env` file** with the new key
3. **Restart the application** for changes to take effect
4. **Share the key securely** via:
   - Encrypted messaging (Signal, WhatsApp)
   - Password manager sharing
   - In-person communication
   - **Never via email or unencrypted channels**

## Revoking Access

If you need to prevent future admin signups (e.g., key was compromised):

1. Generate a new random key
2. Update `VITE_ADMIN_REGISTRATION_KEY` in `.env`
3. Restart the application
4. The old key will no longer work

**Note**: Existing admin accounts remain active. To remove an admin, you'll need to change their role in the database.

## Security Best Practices

✅ **DO:**
- Use a strong, random key
- Change the default key immediately
- Rotate keys periodically (every 3-6 months)
- Share keys through secure channels only
- Keep a backup of the key in a secure location

❌ **DON'T:**
- Use simple or guessable keys
- Share the key publicly
- Commit the actual key to Git
- Reuse keys from other systems
- Share via unencrypted communication

## Troubleshooting

### "Invalid admin registration key" Error

**Cause**: The entered key doesn't match the one in `.env`

**Solutions**:
1. Verify you're using the correct key
2. Check for typos or extra spaces
3. Ensure the `.env` file has been updated
4. Restart the dev server after changing `.env`

### Admin Option Not Showing

**Cause**: The signup page might not have been updated

**Solutions**:
1. Clear browser cache
2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
3. Verify the code changes were applied

### Key Not Working After Update

**Cause**: Environment variables require server restart

**Solution**:
1. Stop the dev server (Ctrl+C)
2. Run `npm run dev` again
3. Try signing up again

## Technical Details

### Implementation

The admin registration system works as follows:

1. **Frontend Validation**: 
   - When "Admin" role is selected, an admin key input field appears
   - Form validation requires the key when admin role is chosen
   - Client-side validation checks the key against `VITE_ADMIN_REGISTRATION_KEY`

2. **Environment Variable**:
   - Key is stored in `.env` as `VITE_ADMIN_REGISTRATION_KEY`
   - Vite exposes it to the client via `import.meta.env.VITE_ADMIN_REGISTRATION_KEY`

3. **Signup Flow**:
   - User selects "Admin" role
   - Enters the registration key
   - System validates key before calling `signUp()`
   - If valid, proceeds with normal signup process
   - If invalid, shows error and prevents signup

### Files Modified

- `.env` - Added `VITE_ADMIN_REGISTRATION_KEY`
- `src/pages/auth/SignupPage.tsx` - Added admin option and key validation
- `src/contexts/AuthContext.tsx` - Already supports admin role

## Future Enhancements

Potential improvements to consider:

1. **Server-side Validation**: Move key validation to backend for enhanced security
2. **Multiple Keys**: Support multiple valid keys for different admin tiers
3. **Key Expiration**: Implement time-based key expiration
4. **Audit Logging**: Track admin account creation attempts
5. **Email Verification**: Require additional verification for admin accounts
6. **Two-Factor Authentication**: Add 2FA requirement for admin accounts

---

**Last Updated**: December 2024  
**Version**: 1.0
