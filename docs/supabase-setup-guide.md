# Supabase Authentication Configuration Guide

This guide walks you through setting up authentication providers in your Supabase project dashboard.

## Prerequisites

1. You must have a Supabase project created at [supabase.com](https://supabase.com)
2. Your project should have the authentication service enabled

## Step 1: Enable Email/Password Authentication

1. Navigate to your Supabase project dashboard
2. Go to **Authentication > Settings**
3. In the **Auth Providers** section, ensure **Email** is enabled
4. Configure the following settings:
   - ✅ **Enable email confirmations**: Recommended for production
   - ✅ **Enable email change confirmations**: Recommended for security
   - ✅ **Enable secure email change**: Recommended for security

## Step 2: Set Up Google OAuth Provider

1. In the same **Authentication > Settings** page
2. Scroll to **Auth Providers** section
3. Find **Google** provider and click **Configure**
4. You'll need to create a Google OAuth application:

### Google Cloud Console Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google+ API**
4. Go to **Credentials** > **Create Credentials** > **OAuth 2.0 Client IDs**
5. Set **Application type** to **Web application**
6. Add these **Authorized redirect URIs**:
   - Development: `https://[your-project-id].supabase.co/auth/v1/callback`
   - Production: `https://[your-custom-domain].supabase.co/auth/v1/callback`
7. Copy the **Client ID** and **Client Secret**

### Configure in Supabase:
1. Back in Supabase dashboard, paste:
   - **Google Client ID**: From Google Cloud Console
   - **Google Client Secret**: From Google Cloud Console
2. Click **Save**

## Step 3: Configure OAuth Redirect URLs

1. In **Authentication > Settings**
2. Find **Site URL** section
3. Set your application URLs:
   - **Site URL**: `http://localhost:3000` (development)
   - **Additional Redirect URLs**: Add these URLs separated by commas:
     ```
     http://localhost:3000/auth/callback,
     https://yourdomain.com/auth/callback
     ```

## Step 4: Configure Email Templates

1. Go to **Authentication > Templates**
2. Customize the following email templates:

### Confirm Signup Template:
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your account</a></p>
```

### Reset Password Template:
```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

### Change Email Address Template:
```html
<h2>Confirm Change of Email</h2>
<p>Follow this link to confirm the update of your email from {{ .Email}} to {{ .NewEmail}}:</p>
<p><a href="{{ .ConfirmationURL }}">Change Email</a></p>
```

## Step 5: Environment Variables Setup

After configuring Supabase, update your environment variables:

### For Web App (.env.local):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase
```

### For API App (.env):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase
```

## Step 6: Test Authentication Setup

1. Start your development servers:
   ```bash
   # In apps/web
   npm run dev
   
   # In apps/api  
   npm run dev
   ```

2. Test the following flows:
   - ✅ Email/password signup
   - ✅ Email/password login
   - ✅ Google OAuth login
   - ✅ Password reset email
   - ✅ Logout functionality

## Verification Checklist

- [ ] Email/password authentication enabled in Supabase dashboard
- [ ] Google OAuth provider configured with valid Client ID/Secret
- [ ] Redirect URLs properly configured for both development and production
- [ ] Email templates customized and tested
- [ ] Environment variables updated in both applications
- [ ] All authentication flows tested successfully

## Troubleshooting

### Common Issues:

1. **OAuth redirect mismatch**: Ensure redirect URLs in Google Cloud Console match exactly with Supabase settings
2. **Email not sending**: Check spam folder and verify email template configuration
3. **Environment variables not loading**: Restart development servers after updating .env files
4. **CORS errors**: Verify Site URL and redirect URLs are correctly configured

### Getting Help:

- [Supabase Authentication Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup Guide](https://developers.google.com/identity/protocols/oauth2)

---

Once you've completed this setup, Task 2 will be ready for completion! 🚀 