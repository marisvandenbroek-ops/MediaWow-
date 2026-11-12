// Supabase Edge Function: verstuurt een pushmelding voor elke nieuwe rij in public.notifications.
//
// Koppelen: Supabase → Database → Webhooks → "Create a new hook"
//   Table: notifications · Events: Insert · Type: Supabase Edge Functions · Function: send-push
//
// Benodigde secrets (Supabase → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (bijv. mailto:info@jouwdomein.nl)
// SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn standaard beschikbaar.

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:rooster@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const body = await req.json().catch(() => null);
  const n = body?.record;
  if (!n?.employee_id) return new Response('geen melding', { status: 400 });

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('employee_id', n.employee_id);
  if (error) return new Response(error.message, { status: 500 });

  const payload = JSON.stringify({ id: n.id, title: n.title, body: n.body ?? '', view: n.view ?? '' });
  let sent = 0;
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
      sent++;
    } catch (e) {
      // Abonnement verlopen of ingetrokken: opruimen
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
    }
  }));
  return new Response(JSON.stringify({ sent }), { headers: { 'content-type': 'application/json' } });
});
