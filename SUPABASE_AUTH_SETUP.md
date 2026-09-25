# Contract password recovery

The contract app and HR app share Supabase project `idkfmgdfzcsydrqnjcla`.
The project's Site URL is `https://hr.icue.vn`. Contract password-reset requests
pass their own callback URL, which must also be allowed in Supabase.

In [Authentication → URL Configuration](https://supabase.com/dashboard/project/idkfmgdfzcsydrqnjcla/auth/url-configuration),
keep the existing settings and add these exact **Redirect URLs**:

- `https://contract.icue.vn/login`
- `http://localhost:5174/login` for local development on port 5174

If development uses a different origin or port, allow its exact `/login` URL
before testing recovery. Do not change the shared Site URL to fix a contract
redirect: it is also used by HR.

The Reset Password email template should link to `{{ .ConfirmationURL }}`.
The `/login` page displays the new-password form when Supabase verifies a
recovery link; ordinary visits still display sign-in. Expired links display
an invalid-link message.

On Vercel, deploy the root `vercel.json` so direct `/login` requests reach the
app instead of returning 404. `public/_redirects` provides the equivalent
fallback for Netlify and is not read by Vercel.

After changing the settings, request a new reset email from the intended
contract app origin. Existing emails retain their original destination.

## Verification

Run `node --test scripts/password-recovery.test.mjs scripts/password-recovery.integration.test.mjs`.
These checks use the installed Supabase SDK with simulated responses; they
cover recovery, reload, password update, and invalid or changed sessions.
They do not verify the hosted redirect allow-list or email delivery.

Check that a direct request to `https://contract.icue.vn/login` returns the
app, then check a newly requested email's `redirect_to` destination before
testing recovery with a designated account.

References: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
[Vite SPA routing on Vercel](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas).
