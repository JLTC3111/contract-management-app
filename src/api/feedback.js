import { supabase } from '../utils/supaBaseClient';

export async function submitFeedback(payload) {
  const { data, error } = await supabase.functions.invoke('contract-feedback', { body: payload });
  if (error) {
    let code = 'unavailable';
    try { code = (await error.context?.clone().json())?.code || code; } catch { /* network error */ }
    throw Object.assign(new Error('Feedback submission failed'), { feedbackCode: code });
  }
  if (!data?.saved || !data.reference) throw new Error('Missing feedback receipt');
  return data;
}

export function feedbackMailto(category, message, page) {
  const body = `Type: ${category}\nPage: ${page}\n\n${message}`;
  return `mailto:support@icue.vn?subject=${encodeURIComponent('Contract Management App Feedback')}&body=${encodeURIComponent(body)}`;
}
