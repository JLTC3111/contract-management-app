import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.4';
import nodemailer from 'npm:nodemailer@10.1.7';
import { feedbackHandler } from '../_shared/contract-feedback.mjs';

const env = (name: string) => Deno.env.get(name);
const port = Number(env('FEEDBACK_SMTP_PORT') || 465);
const transport = nodemailer.createTransport({
  host: env('FEEDBACK_SMTP_HOST'), port, secure: port === 465,
  requireTLS: port !== 465,
  auth: { user: env('FEEDBACK_SMTP_USER'), pass: env('FEEDBACK_SMTP_PASSWORD') },
  connectionTimeout: 7000, greetingTimeout: 7000, socketTimeout: 10000,
  disableFileAccess: true, disableUrlAccess: true,
});

// Verified sessions and the server-only retry credential are checked by the handler.
Deno.serve(feedbackHandler({
  createClient, env,
  sendEmail: async (message: Record<string, string>) => {
    const from = env('FEEDBACK_SMTP_FROM');
    if (!from || !env('FEEDBACK_SMTP_HOST') || !env('FEEDBACK_SMTP_USER') || !env('FEEDBACK_SMTP_PASSWORD')) {
      throw new Error('SMTP is not configured');
    }
    const result = await transport.sendMail({ ...message, from });
    if (!result.accepted?.length || result.rejected?.length) throw new Error('SMTP did not accept the message');
  },
}));
