# Admin Password Reset Utility

## Overview
This utility allows administrators to reset passwords for users whose email addresses don't exist (and therefore can't receive password reset emails). 

## Security Features
- ✅ Uses Supabase service role key for admin operations
- ✅ Generates cryptographically secure temporary passwords
- ✅ Sets force_password_change flag for security
- ✅ Logs all admin actions for audit purposes
- ✅ Never exposes admin operations to client-side code

## Prerequisites

1. **Environment Variables**: Ensure your `.env` file contains:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Node.js Dependencies**: The required packages are already installed:
   ```bash
   # These packages are already available in the project:
   # - @supabase/supabase-js (for Supabase admin operations)
   # - dotenv (for environment variable loading)
   ```

## Usage

### Step 1: Run the Admin Script
```bash
node admin-password-reset.js user@company.com
```

### Step 2: Secure Communication
The script will generate a secure temporary password. **DO NOT** send this via:
- ❌ Unencrypted email
- ❌ SMS/Text messages
- ❌ Slack/Teams without encryption
- ❌ Written notes left unsecured

**DO** use secure methods like:
- ✅ Encrypted messaging apps (Signal, WhatsApp)
- ✅ In-person delivery
- ✅ Secure password manager sharing
- ✅ Phone call (for simple passwords)

### Step 3: User Login Process
1. User logs in with their email and the temporary password
2. System automatically detects `force_password_change` flag
3. User is presented with password change screen
4. User must change password before accessing the application
5. System removes the `force_password_change` flag

## Script Output Example
```
🔧 Admin Password Reset Tool
============================
Target user: user@company.com
Timestamp: 2025-08-13T10:30:00.000Z

⚠️  Are you sure you want to reset password for user@company.com? (y/N): y

🔍 Looking up user: user@company.com
✅ Found user: user@company.com (ID: 12345678-1234-1234-1234-123456789abc)
   Created: 2025-08-01T09:00:00.000Z
   Last sign in: Never
🔐 Generated temporary password for user@company.com
✅ Password reset successful for user@company.com
✅ Updated user profile to force password change

🎉 Password Reset Complete!
================================
User: user@company.com
Temporary Password: Xk7$mN9pQ2wE8rT5
Force Change: Yes
================================

📋 Next Steps:
1. Securely provide the temporary password to the user
2. User will be forced to change password on next login
3. Temporary password expires when changed

⚠️  SECURITY REMINDER:
- Do not send this password via unencrypted channels
- Consider using secure communication methods
- Monitor the audit log for successful password change
```

## Audit Logging
All admin actions are logged to `logs/admin-actions.log`:

```json
{"timestamp":"2025-08-13T10:30:00.000Z","action":"PASSWORD_RESET","userEmail":"user@company.com","success":true,"details":"Temporary password generated and set","adminUser":"admin"}
```

## Security Best Practices

### For Administrators:
1. **Verify Identity**: Confirm the user's identity through multiple channels before resetting
2. **Use Secure Communication**: Never send passwords via unencrypted channels
3. **Monitor Logs**: Check that users successfully change their passwords
4. **Limit Access**: Only trusted administrators should have access to service role keys
5. **Regular Rotation**: Rotate service role keys periodically

### For Users:
1. **Change Immediately**: Change the temporary password as soon as possible
2. **Use Strong Passwords**: Follow password strength requirements
3. **Don't Reuse**: Don't reuse the temporary password or previous passwords
4. **Secure Storage**: Use a password manager for the new password

## Troubleshooting

### Common Issues:

**Error: "Missing required environment variables"**
- Solution: Check your `.env` file has `SUPABASE_SERVICE_ROLE_KEY` set

**Error: "User not found"**
- Solution: Verify the email address is correct and the user exists in Supabase Auth

**Error: "Failed to update password"**
- Solution: Check service role key permissions and Supabase project status

**User can't log in with temporary password**
- Solution: Verify the password was copied correctly (no extra spaces/characters)

### Getting Help:
1. Check the audit logs for detailed error messages
2. Verify Supabase project settings and RLS policies
3. Test with a known working user account first
4. Contact system administrator if issues persist

## Technical Details

### Database Changes:
The script updates two locations:
1. **Supabase Auth**: Updates the user's password and metadata
2. **Users Table**: Sets `force_password_change = true` (if table exists)

### Password Requirements:
- Minimum 16 characters (for temporary passwords)
- Contains uppercase and lowercase letters
- Contains numbers and special characters
- Cryptographically random generation

### Metadata Fields:
- `force_password_change`: Boolean flag requiring password change
- `temp_password_set_at`: Timestamp of when temporary password was set
- `temp_password_set_by`: Indicates it was set by admin

## Compliance Notes
- All actions are logged for audit compliance
- Temporary passwords are cryptographically secure
- Users are forced to change passwords on first login
- No plaintext passwords are stored anywhere
- Admin actions are traceable and timestamped
