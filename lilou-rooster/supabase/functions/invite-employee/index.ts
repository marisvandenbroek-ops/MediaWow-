// Supabase Edge Function: stuurt een nieuwe medewerker een uitnodiging per e-mail.
//
// Alleen ingelogde directie (role = 'manager') mag dit aanroepen. De geheime sleutel
// (SUPABASE_SERVICE_ROLE_KEY) is in Edge Functions standaard beschikbaar en komt nooit in de app.
//
// Online zetten (eenmalig): Supabase → Edge Functions → "Deploy a new function" → "Via Editor",
// naam: invite-employee, plak deze code en klik Deploy.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Alleen POST' }, 405);
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Wie roept dit aan? Moet ingelogde directie zijn.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: who, error: whoErr } = await admin.auth.getUser(token);
    if (whoErr || !who?.user) return json({ error: 'Niet ingelogd.' }, 401);
    const { data: me } = await admin.from('employees').select('id').eq('user_id', who.user.id)
      .eq('role', 'manager').eq('active', true).maybeSingle();
    if (!me) return json({ error: 'Alleen de directie kan medewerkers uitnodigen.' }, 403);

    // 2. Welke medewerker?
    const { employee_id, redirect_to } = await req.json();
    const { data: emp } = await admin.from('employees').select('id, email, name, user_id, active')
      .eq('id', employee_id).maybeSingle();
    if (!emp) return json({ error: 'Medewerker niet gevonden.' }, 404);
    if (emp.user_id) return json({ error: `${emp.name} heeft al een actief account.` }, 409);
    if (!emp.active) return json({ error: 'Deze medewerker staat op inactief.' }, 409);

    // 3. Uitnodiging versturen (Supabase gebruikt de mailtemplate "Invite user" en jullie eigen mailserver)
    const { error } = await admin.auth.admin.inviteUserByEmail(emp.email, {
      redirectTo: typeof redirect_to === 'string' ? redirect_to : undefined,
      data: { name: emp.name },
    });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) {
        return json({ error: `Er bestaat al een account met ${emp.email}, maar dat is nog niet bevestigd. Laat ${emp.name.split(' ')[0]} inloggen via "Wachtwoord vergeten?".` }, 409);
      }
      return json({ error: error.message }, 400);
    }
    await admin.from('employees').update({ invited_at: new Date().toISOString() }).eq('id', emp.id);
    return json({ ok: true, email: emp.email });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
