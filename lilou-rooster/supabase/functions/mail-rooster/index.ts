// Supabase Edge Function: mailt medewerkers hun diensten nadat de directie een week heeft gepubliceerd.
//
// De app roept deze functie aan na "Publiceer". Alleen ingelogde directie mag dat.
// Mail gaat via de mailserver van Lilou (Vimexx) over poort 465 (Supabase blokkeert 25 en 587).
//
// Online zetten: Edge Functions → Deploy a new function → Via Editor, naam: mail-rooster, plak deze code,
// Deploy, en zet daarna bij Details "Verify JWT" UIT (de functie controleert zelf wie er belt).
// Secret nodig (Edge Functions → Secrets): SMTP_PASS = wachtwoord van rooster@lilou-ede.nl
// Optioneel: SMTP_HOST (mail.lilou-ede.nl), SMTP_PORT (465), SMTP_USER (rooster@lilou-ede.nl), APP_URL.

import nodemailer from 'npm:nodemailer@6.9.16';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

const DAG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MAAND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const d = (iso: string) => new Date(iso + 'T12:00:00Z');
const hm = (t: string) => String(t).slice(0, 5);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const dayLabel = (iso: string) => { const x = d(iso); return `${DAG[x.getUTCDay()]} ${x.getUTCDate()} ${MAAND[x.getUTCMonth()]}`; };
function weekNr(iso: string) {
  const x = d(iso); const t = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
}

type Shift = { date: string; start_time: string; end_time: string; break_minutes: number; position: string | null; note: string | null };

export function buildMail(name: string, from: string, to: string, shifts: Shift[], appUrl: string) {
  const first = (name || '').split(' ')[0];
  const wk = weekNr(from);
  const range = `${d(from).getUTCDate()} ${MAAND[d(from).getUTCMonth()]} – ${d(to).getUTCDate()} ${MAAND[d(to).getUTCMonth()]}`;
  const subject = `Je rooster voor week ${wk} (${range})`;
  const line = (s: Shift) => `${dayLabel(s.date)}: ${hm(s.start_time)}–${hm(s.end_time)}${s.break_minutes ? ` (${s.break_minutes} min pauze)` : ''}${s.position ? ` · ${s.position}` : ''}${s.note ? ` · ${s.note}` : ''}`;
  const text = `Hoi ${first},\n\nJe rooster voor week ${wk} staat klaar:\n\n${shifts.map((s) => '• ' + line(s)).join('\n')}\n\nBekijk of wijzig (ruilen, verlof) in de app: ${appUrl}\n\nGroet,\nLilou`;
  const rows = shifts.map((s) => {
    const info = [s.position, s.break_minutes ? s.break_minutes + ' min pauze' : '', s.note].filter(Boolean).join(' · ');
    return `<tr><td style="padding:12px 0;border-bottom:1px solid #ecdfd4">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:16px;font-weight:bold;color:#2b1611">${esc(cap(dayLabel(s.date)))}</td>
        <td align="right" style="font-size:16px;font-weight:bold;color:#912508;white-space:nowrap">${esc(hm(s.start_time))}–${esc(hm(s.end_time))}</td>
      </tr>${info ? `<tr><td colspan="2" style="padding-top:3px;font-size:14px;color:#7d6359">${esc(info)}</td></tr>` : ''}</table>
    </td></tr>`;
  }).join('');
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
  <style>a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;font-weight:inherit!important}</style></head>
  <body style="margin:0;background:#f9f3ec;font-family:Arial,Helvetica,sans-serif;color:#2b1611">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9f3ec;padding:16px 8px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden">
    <tr><td style="background:#912508;color:#f9efe6;padding:20px 22px;font-family:Georgia,serif;font-size:28px">Lilou<div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:4px;margin-top:4px">ROOSTER</div></td></tr>
    <tr><td style="padding:20px 22px 4px;font-size:16px;line-height:1.5">Hoi ${esc(first)},<br>je rooster voor <strong>week ${wk}</strong> staat klaar.<div style="font-size:14px;color:#7d6359">${esc(range)}</div></td></tr>
    <tr><td style="padding:6px 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
    <tr><td style="padding:18px 22px 24px"><a href="${esc(appUrl)}" style="display:inline-block;background:#912508;color:#f9efe6;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">Open het rooster</a>
      <p style="font-size:13px;color:#7d6359;margin:16px 0 0">Kun je een dienst niet werken? Bied hem aan via <em>Ruilen</em> in de app. De app is altijd leidend.</p></td></tr>
  </table></td></tr></table></body></html>`;
  return { subject, text, html };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Alleen POST' }, 405);
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: who, error: whoErr } = await admin.auth.getUser(token);
    if (whoErr || !who?.user) return json({ error: 'Niet ingelogd.' }, 401);
    const { data: me, error: meErr } = await admin.from('employees').select('id').eq('user_id', who.user.id)
      .eq('role', 'manager').eq('active', true).maybeSingle();
    if (meErr) return json({ error: 'Database niet bereikbaar voor de server-functie: ' + meErr.message }, 500);
    if (!me) return json({ error: 'Alleen de directie kan het rooster mailen.' }, 403);

    const pass = Deno.env.get('SMTP_PASS');
    if (!pass) return json({ error: 'Mail is nog niet ingesteld: zet SMTP_PASS bij Edge Functions → Secrets.' }, 500);

    const { from, to, employee_ids, app_url } = await req.json();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || !Array.isArray(employee_ids)) return json({ error: 'Ongeldige aanvraag.' }, 400);
    const ids = [...new Set(employee_ids.filter((x: unknown) => typeof x === 'string'))].slice(0, 200);
    if (!ids.length) return json({ sent: 0, failed: [] });

    const { data: emps } = await admin.from('employees').select('id, name, email, active').in('id', ids);
    const { data: shifts } = await admin.from('shifts').select('employee_id, date, start_time, end_time, break_minutes, position, note')
      .in('employee_id', ids).eq('published', true).gte('date', from).lte('date', to).order('date').order('start_time');

    const user = Deno.env.get('SMTP_USER') ?? 'rooster@lilou-ede.nl';
    const port = Number(Deno.env.get('SMTP_PORT') ?? 465);
    const mailer = nodemailer.createTransport({ host: Deno.env.get('SMTP_HOST') ?? 'mail.lilou-ede.nl', port, secure: port === 465, auth: { user, pass } });
    const appUrl = Deno.env.get('APP_URL') ?? (typeof app_url === 'string' && /^https:\/\//.test(app_url) ? app_url : 'https://rooster.lilou-ede.nl/');

    let sent = 0; const failed: string[] = [];
    for (const e of emps ?? []) {
      const mine = (shifts ?? []).filter((s) => s.employee_id === e.id);
      if (!e.active || !e.email || !mine.length) continue;
      const m = buildMail(e.name, from, to, mine as Shift[], appUrl);
      try {
        await mailer.sendMail({ from: `"Lilou Rooster" <${user}>`, to: e.email, subject: m.subject, text: m.text, html: m.html });
        sent++;
      } catch (err) {
        failed.push(`${e.name}: ${(err as Error)?.message ?? err}`);
      }
    }
    return json({ sent, failed });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
