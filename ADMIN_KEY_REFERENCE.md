# 🔑 Admin Registration - Quick Reference

## Current Admin Key
```
CSL-ADMIN-2024-SECURE-KEY-XYZ789
```
⚠️ **CHANGE THIS IMMEDIATELY IN PRODUCTION!**

---

## How to Sign Up as Admin

1. Go to: `http://localhost:5173/signup`
2. Select: **Admin** from Account Type dropdown
3. Enter the admin key above when prompted
4. Complete the rest of the form

---

## How to Change the Key

1. Open `.env` file
2. Update `VITE_ADMIN_REGISTRATION_KEY=your-new-secure-key`
3. Restart dev server: `npm run dev`

---

## Generate Secure Key (PowerShell)
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

---

📖 **Full Documentation**: See `ADMIN_REGISTRATION.md`
