// Supabase Edge Function: persoonlijke agenda-abonnementen (iPhone/Mac-agenda, Google Agenda, Outlook).
//
// De app geeft elke medewerker een geheime link: .../functions/v1/agenda?t=<calendar_token>
// De agenda-app haalt die link zelf regelmatig op, dus nieuwe en gewijzigde diensten verschijnen vanzelf.
// Alleen gepubliceerde diensten van die ene medewerker; geen andere gegevens.
//
// Online zetten: Edge Functions → Deploy a new function → Via Editor, naam: agenda, plak deze code,
// Deploy, en zet daarna bij Settings "Verify JWT" UIT (agenda-apps sturen geen inlog mee; de geheime link is de sleutel).

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const BEDRIJF = Deno.env.get('BEDRIJF') ?? 'Lilou';
const TZ = 'Europe/Amsterdam';

// Lokale Nederlandse tijd → UTC-tijdstempel voor de agenda (houdt rekening met zomer- en wintertijd)
function utcStamp(date: string, time: string, plusDays = 0): string {
  const [y, m, d] = date.split('-').map(Number), [hh, mi] = time.slice(0, 5).split(':').map(Number);
  let guess = Date.UTC(y, m - 1, d + plusDays, hh, mi);
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(guess)).map((x) => [x.type, x.value]));
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    guess += Date.UTC(y, m - 1, d + plusDays, hh, mi) - shown;
  }
  return new Date(guess).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
}
const esc = (s: unknown) => String(s ?? '').replace(/[\\;,]/g, (m) => '\\' + m).replace(/\r?\n/g, '\\n');
// Regels langer dan 75 bytes vouwen (agendastandaard), zonder een teken (bv. emoji) door te knippen
const enc = new TextEncoder();
function fold(line: string): string {
  const out: string[] = []; let cur = '', bytes = 0, max = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > max) { out.push(cur); cur = ''; bytes = 0; max = 74; }   // vervolgregels beginnen met een spatie
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const t = url.searchParams.get('t') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(t)) return new Response('Onbekende agenda', { status: 404 });
  const { data: e } = await db.from('employees').select('id, name, active').eq('calendar_token', t).maybeSingle();
  if (!e) return new Response('Onbekende agenda', { status: 404 });
  // uit dienst: lege agenda, zodat oude diensten uit de agenda van de medewerker verdwijnen

  const today = new Date(); const from = new Date(today.getTime() - 60 * 864e5).toISOString().slice(0, 10);
  const to = new Date(today.getTime() + 200 * 864e5).toISOString().slice(0, 10);
  const { data: shifts } = await db.from('shifts').select('id, date, start_time, end_time, position, note, break_minutes')
    .eq('employee_id', e.id).eq('published', true).gte('date', from).lte('date', to).order('date');

  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rooster//NL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(BEDRIJF + ' rooster')}`, `X-WR-TIMEZONE:${TZ}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H'];
  for (const s of e.active ? (shifts ?? []) : []) {
    const overnight = s.end_time.slice(0, 5) <= s.start_time.slice(0, 5);
    lines.push('BEGIN:VEVENT', `UID:${s.id}@rooster`, `DTSTAMP:${now}`,
      `DTSTART:${utcStamp(s.date, s.start_time)}`, `DTEND:${utcStamp(s.date, s.end_time, overnight ? 1 : 0)}`,
      `SUMMARY:${esc(`Werken ${BEDRIJF}${s.position ? ' – ' + s.position : ''}`)}`,
      `DESCRIPTION:${esc([s.break_minutes ? `${s.break_minutes} min pauze` : '', s.note || ''].filter(Boolean).join('\n'))}`,
      'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'no-cache', 'content-disposition': 'inline; filename="rooster.ics"' },
  });
});
