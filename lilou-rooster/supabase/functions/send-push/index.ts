// Supabase Edge Function: pushmeldingen op de telefoon.
//
// 1. De app vraagt hier de publieke sleutel op ({ action: 'public_key' }). Bestaat er nog geen
//    sleutelpaar, dan maakt deze functie er zelf één en bewaart het in de tabel app_secrets
//    (alleen bereikbaar voor de server). Niemand hoeft dus sleutels over te typen.
// 2. Een Database Webhook (tabel notifications, Insert) roept deze functie aan voor elke nieuwe
//    melding. De melding wordt opnieuw uit de database gelezen, zodat een aanroep van buitenaf
//    geen eigen tekst kan versturen.
//
// Online zetten: Edge Functions → Deploy a new function → Via Editor, naam: send-push, plak deze code.
// "Verify JWT" mag AAN blijven.

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let keys: { publicKey: string; privateKey: string } | null = null;
async function getKeys() {
  if (keys) return keys;
  const read = async () => {
    const { data, error } = await db.from('app_secrets').select('key, value').in('key', ['vapid_public', 'vapid_private']);
    if (error) throw new Error('Sleutels lezen mislukt: ' + error.message);
    const m = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    return m.vapid_public && m.vapid_private ? { publicKey: m.vapid_public, privateKey: m.vapid_private } : null;
  };
  keys = await read();
  if (!keys) {
    const k = webpush.generateVAPIDKeys();
    // ignoreDuplicates: wint een gelijktijdige aanroep, dan gebruiken we diens sleutels
    await db.from('app_secrets').upsert([{ key: 'vapid_public', value: k.publicKey }, { key: 'vapid_private', value: k.privateKey }],
      { onConflict: 'key', ignoreDuplicates: true });
    keys = await read();
    if (!keys) throw new Error('Sleutels aanmaken mislukt');
  }
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:rooster@lilou-ede.nl', keys.publicKey, keys.privateKey);
  return keys;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Alleen POST' }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const k = await getKeys();
    if (body?.action === 'public_key') return json({ publicKey: k.publicKey });

    const id = body?.record?.id;
    if (!id) return json({ error: 'geen melding' }, 400);
    const { data: n } = await db.from('notifications').select('id, employee_id, title, body, view').eq('id', id).maybeSingle();
    if (!n?.employee_id) return json({ sent: 0 });
    const { data: subs, error } = await db.from('push_subscriptions').select('endpoint, p256dh, auth').eq('employee_id', n.employee_id);
    if (error) return json({ error: error.message }, 500);

    const payload = JSON.stringify({ id: n.id, title: n.title, body: n.body ?? '', view: n.view ?? '' });
    let sent = 0;
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;   // abonnement verlopen of ingetrokken: opruimen
        if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      }
    }));
    return json({ sent });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
