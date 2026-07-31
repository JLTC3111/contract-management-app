/**
 * Supabase auth errors, translated.
 *
 * supabase-js v2 attaches a stable machine-readable `code` to every AuthError
 * (see @supabase/auth-js ErrorCode). The `message` beside it is English-only and
 * written for developers, so we key off the code and fall back to the message
 * only for codes we have not mapped - a wrong-but-specific English string beats
 * a translated "something went wrong".
 */

/** Codes a user can actually hit from the login form or the password modal. */
const CODE_KEYS = {
  invalid_credentials: 'authErrors.invalidCredentials',
  email_not_confirmed: 'authErrors.emailNotConfirmed',
  user_not_found: 'authErrors.userNotFound',
  user_banned: 'authErrors.userBanned',
  email_address_invalid: 'authErrors.emailInvalid',
  email_address_not_authorized: 'authErrors.emailNotAuthorized',
  validation_failed: 'authErrors.validationFailed',
  weak_password: 'authErrors.weakPassword',
  same_password: 'authErrors.samePassword',
  over_request_rate_limit: 'authErrors.tooManyRequests',
  over_email_send_rate_limit: 'authErrors.tooManyEmails',
  session_expired: 'authErrors.sessionExpired',
  signup_disabled: 'authErrors.signupDisabled',
  provider_disabled: 'authErrors.providerDisabled',
  captcha_failed: 'authErrors.captchaFailed',
  request_timeout: 'authErrors.requestTimeout',
  unexpected_failure: 'authErrors.unexpectedFailure',
};

/**
 * Older gateways answer 400 with no `code`. These two are common enough at the
 * login form to be worth recognising by message.
 */
const MESSAGE_FALLBACKS = [
  [/invalid login credentials/i, 'authErrors.invalidCredentials'],
  [/email not confirmed/i, 'authErrors.emailNotConfirmed'],
];

/**
 * @param {import('react-i18next').TFunction} t
 * @param {{ code?: string, message?: string } | null | undefined} error
 * @param {string} [fallbackKey] used when the error carries neither a known code
 *   nor a message - e.g. a network failure that produced an empty object.
 */
export function authErrorMessage(t, error, fallbackKey = 'authErrors.unexpectedFailure') {
  if (!error) return t(fallbackKey, 'Something went wrong. Please try again.');

  const byCode = CODE_KEYS[error.code];
  if (byCode) return t(byCode);

  const message = error.message || '';
  const byMessage = MESSAGE_FALLBACKS.find(([pattern]) => pattern.test(message));
  if (byMessage) return t(byMessage[1]);

  // Unmapped: show what the server said rather than inventing a vaguer message.
  return message || t(fallbackKey, 'Something went wrong. Please try again.');
}

export default authErrorMessage;
