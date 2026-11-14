(() => {
'use strict';

const CFG = Object.assign({ appName: 'Rooster', bedrijf: '', posities: [], diensten: [] }, window.ROOSTER_CONFIG || {});
const DEMO = !(CFG.supabaseUrl && CFG.supabaseAnonKey);
const START_HASH = location.hash;   // bevat bij een uitnodigings- of herstellink type=invite / type=recovery
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');

/* ================= Utils ================= */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -((x.getDay() + 6) % 7)); };
const todayIso = () => iso(new Date());
const DAG = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const dayIdx = d => (d.getDay() + 6) % 7;
const fmt = (d, o) => d.toLocaleDateString('nl-NL', o);
const fmtShort = s => fmt(parse(s), { weekday: 'short', day: 'numeric', month: 'short' });
const fmtLong = s => fmt(parse(s), { weekday: 'long', day: 'numeric', month: 'long' });
const hm = t => (t ? String(t).slice(0, 5) : t);
const mins = t => { const [h, m] = hm(t).split(':').map(Number); return h * 60 + m; };
const shiftHours = s => { let m = mins(s.end_time) - mins(s.start_time); if (m <= 0) m += 1440; return Math.max(0, (m - (Number(s.break_minutes) || 0)) / 60); };
const fmtH = h => { const m = Math.round(Math.abs(Number(h) || 0) * 60), H = Math.floor(m / 60), M = m % 60; return (h < 0 && m ? '−' : '') + (M ? `${H}:${String(M).padStart(2, '0')}` : `${H}`); };   // 7,67 → 7:40
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DEFAULT_LISTS = [{"name": "Opening bediening", "department": "Bediening", "moment": "opening", "kind": "check", "sort": 10, "items": [{"id": "i1", "label": "Alarm uit, rondje gelopen, geen bijzonderheden"}, {"id": "i2", "label": "Lichten en muziek aan (juiste volume)"}, {"id": "i3", "label": "Zaal op temperatuur, ventilatie aan"}, {"id": "i4", "label": "Entree, ramen en terras toonbaar"}, {"id": "i5", "label": "Vloer schoon, niets onder de tafels"}, {"id": "i6", "label": "Tafels ingedekt; bestek en glazen tegen het licht gecontroleerd"}, {"id": "i7", "label": "Tafels recht en wiebelen niet"}, {"id": "i8", "label": "Tafelindeling klopt met de reserveringen"}, {"id": "i9", "label": "Kaarsen, bloemen en decoratie verzorgd"}, {"id": "i10", "label": "Menukaarten en wijnkaart schoon en actueel"}, {"id": "i11", "label": "Servicestations aangevuld (bestek, servetten, borden)"}, {"id": "i12", "label": "Water, karaffen en ijs klaar"}, {"id": "i13", "label": "Allergeenprikkers, bonnen en pennen aanwezig"}, {"id": "i14", "label": "Reserveringslijst doorgenomen, bijzonderheden gemarkeerd"}, {"id": "i15", "label": "Kassa aan, bonrol vol, pinautomaten getest"}, {"id": "i16", "label": "Kasgeld geteld"}, {"id": "i17", "label": "Telefoon opneembaar, voicemail afgeluisterd"}, {"id": "i18", "label": "Toiletten schoon en aangevuld"}], "active": true}, {"name": "Sluiting bediening", "department": "Bediening", "moment": "sluiting", "kind": "check", "sort": 20, "items": [{"id": "i1", "label": "Laatste gasten weg; toiletten en terras gecontroleerd"}, {"id": "i2", "label": "Tafels afgeruimd, afgenomen en ingedekt"}, {"id": "i3", "label": "Vloer geveegd en gedweild"}, {"id": "i4", "label": "Kaarsen uit, bloemen water gegeven"}, {"id": "i5", "label": "Menukaarten afgenomen en opgeborgen"}, {"id": "i6", "label": "Servicestations leeg, schoon en aangevuld"}, {"id": "i7", "label": "Karaffen en koelers schoon, omgekeerd drogen"}, {"id": "i8", "label": "Vuile was in de waszak"}, {"id": "i9", "label": "Alle tafels afgesloten, geen open bonnen"}, {"id": "i10", "label": "Dagafsluiting (Z-rapport) gedraaid"}, {"id": "i11", "label": "Kas geteld, verschil doorgegeven"}, {"id": "i12", "label": "Pinautomaten aan de lader"}, {"id": "i13", "label": "Toiletten eindschoonmaak en aangevuld"}, {"id": "i14", "label": "Terrasmeubilair opgeborgen"}, {"id": "i15", "label": "Ramen en deuren op slot, nooduitgangen dicht"}, {"id": "i16", "label": "Muziek en lichten uit"}, {"id": "i17", "label": "Gevonden voorwerpen opgeborgen"}], "active": true}, {"name": "Opening keuken", "department": "Keuken", "moment": "opening", "kind": "check", "sort": 30, "items": [{"id": "i1", "label": "Afzuiging aan vóór het aansteken van gas"}, {"id": "i2", "label": "Apparatuur opgestart en werkt (oven, fornuis, plancha, friteuse, vaatwasser)"}, {"id": "i3", "label": "Nooduitgang en blusdeken vrij"}, {"id": "i4", "label": "Houdbaarheid koelingen gecontroleerd, verlopen weg (waste)"}, {"id": "i5", "label": "Prikthermometer schoon en werkt"}, {"id": "i6", "label": "Handenwasplaats: zeep, papier, desinfectie"}, {"id": "i7", "label": "Werkbanken, planken en messen schoon en gedesinfecteerd"}, {"id": "i8", "label": "Iedereen in schone keukenkleding, haar bedekt, geen sieraden"}, {"id": "i9", "label": "Gezondheidscheck: niemand met diarree, braken, koorts of open wond"}, {"id": "i10", "label": "Reserveringen en allergieën doorgenomen"}, {"id": "i11", "label": "Mise-en-place-lijsten per partie klaar"}, {"id": "i12", "label": "Leveringen van vandaag bekend"}], "active": true}, {"name": "Sluiting keuken", "department": "Keuken", "moment": "sluiting", "kind": "check", "sort": 40, "items": [{"id": "i1", "label": "Mise-en-place afgedekt, gelabeld en in de koeling"}, {"id": "i2", "label": "Terugkoelen gestart en geregistreerd"}, {"id": "i3", "label": "Niets buiten de koeling"}, {"id": "i4", "label": "Waste van vandaag geregistreerd"}, {"id": "i5", "label": "Werkbanken, koelwerkbanken en planken schoon en gedesinfecteerd"}, {"id": "i6", "label": "Fornuis, plancha en salamander ontvet"}, {"id": "i7", "label": "Oven/combisteamer reinigingsprogramma gedraaid"}, {"id": "i8", "label": "Friteuse: olie gecontroleerd/gefilterd, afgedekt"}, {"id": "i9", "label": "Vloer geveegd, gedweild, putjes leeg"}, {"id": "i10", "label": "Afval en glas weg, bakken schoon"}, {"id": "i11", "label": "Vaatwasser leeg, filters schoon, deur open"}, {"id": "i12", "label": "Gas dicht, apparatuur uit (behalve koeling)"}, {"id": "i13", "label": "Koelingen en vriezers goed dicht"}, {"id": "i14", "label": "Afzuiging uit"}, {"id": "i15", "label": "Achterdeur op slot"}, {"id": "i16", "label": "Bestellingen verstuurd"}, {"id": "i17", "label": "Overdracht naar de volgende dienst doorgegeven"}], "active": true}, {"name": "Opening bar", "department": "Bar", "moment": "opening", "kind": "check", "sort": 50, "items": [{"id": "i1", "label": "Koelingen aangevuld (FIFO)"}, {"id": "i2", "label": "Open flessen gecontroleerd op datum en geproefd"}, {"id": "i3", "label": "Garnituren vers gesneden, afgedekt, gelabeld"}, {"id": "i4", "label": "IJsbak vol, schone schep in de bak"}, {"id": "i5", "label": "Glaswerk gepoetst en op de vaste plek"}, {"id": "i6", "label": "Eerste bier getapt en geproefd, lekbak schoon"}, {"id": "i7", "label": "Koffiemachine warm, eerste espresso geproefd"}, {"id": "i8", "label": "Melk, thee, suiker aangevuld"}, {"id": "i9", "label": "Kassa en pin aan de bar werken"}, {"id": "i10", "label": "Werkblad schoon en leeg"}], "active": true}, {"name": "Sluiting bar", "department": "Bar", "moment": "sluiting", "kind": "check", "sort": 60, "items": [{"id": "i1", "label": "Open flessen afgesloten en gelabeld met openingsdatum"}, {"id": "i2", "label": "Garnituren weg of afgedekt en gelabeld"}, {"id": "i3", "label": "Koelingen aangevuld voor morgen"}, {"id": "i4", "label": "Koffiemachine gereinigd (backflush, stoompijpje, bakjes)"}, {"id": "i5", "label": "Glazenspoelmachine leeg en schoon"}, {"id": "i6", "label": "Tapkranen afgenomen, lekbak schoon, kranen dicht"}, {"id": "i7", "label": "IJsbak leeg en schoon"}, {"id": "i8", "label": "Werkblad, spoelbak en vloer achter de bar schoon"}, {"id": "i9", "label": "Breuk en derving geregistreerd"}, {"id": "i10", "label": "Bestellijst bar bijgewerkt"}], "active": true}, {"name": "Temperaturen opening", "department": "", "moment": "opening", "kind": "temp", "sort": 70, "items": [{"id": "i1", "label": "K1 Koelcel", "max": 7.0}, {"id": "i2", "label": "K2 Koelwerkbank keuken", "max": 7.0}, {"id": "i3", "label": "K3 Koeling bar", "max": 7.0}, {"id": "i4", "label": "V1 Vriezer", "max": -18.0}], "active": true}, {"name": "Temperaturen sluiting", "department": "", "moment": "sluiting", "kind": "temp", "sort": 80, "items": [{"id": "i1", "label": "K1 Koelcel", "max": 7.0}, {"id": "i2", "label": "K2 Koelwerkbank keuken", "max": 7.0}, {"id": "i3", "label": "K3 Koeling bar", "max": 7.0}, {"id": "i4", "label": "V1 Vriezer", "max": -18.0}], "active": true}, {"name": "Weekschoonmaak", "department": "", "moment": "week", "kind": "check", "sort": 90, "items": [{"id": "i1", "label": "Koelcellen en koelwerkbanken leeg en grondig schoon"}, {"id": "i2", "label": "Oven/combisteamer grondig"}, {"id": "i3", "label": "Filters afzuigkap in de vaatwasser"}, {"id": "i4", "label": "Wanden en tegels keuken"}, {"id": "i5", "label": "Afvalbakken uitgespoten"}, {"id": "i6", "label": "Droge opslag: schappen en vloer"}, {"id": "i7", "label": "Barkoelingen uitgenomen en schoon"}, {"id": "i8", "label": "IJsmachine gereinigd"}, {"id": "i9", "label": "Flessen en spiritrekken stofvrij"}, {"id": "i10", "label": "Ramen en deuren volledig"}, {"id": "i11", "label": "Lampen, lijsten en vensterbanken stofvrij"}], "active": true}, {"name": "Maandschoonmaak", "department": "", "moment": "maand", "kind": "check", "sort": 100, "items": [{"id": "i1", "label": "Vriezers ontdooid en schoon"}, {"id": "i2", "label": "Afzuigkap afgenomen"}, {"id": "i3", "label": "Vaatwasser ontkalkt"}, {"id": "i4", "label": "IJsmachine gedesinfecteerd"}], "active": true}];
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
const clone = o => JSON.parse(JSON.stringify(o));
const weekNr = d => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y) / 86400000 + 1) / 7);
};
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000) + 1;
const overlaps = (aFrom, aTo, bFrom, bTo) => aFrom <= bTo && bFrom <= aTo;
const REQ = { vakantie: 'Vakantie', vrij: 'Vrije dag', onbeschikbaar: 'Niet beschikbaar', ziek: 'Ziekmelding' };
const STATUS = { pending: 'Openstaand', approved: 'Goedgekeurd', rejected: 'Afgewezen' };
const ZSTATUS = { pending: 'Gemeld', approved: 'Verwerkt', rejected: 'Afgewezen' };
const stLabel = r => (r.type === 'ziek' ? ZSTATUS : STATUS)[r.status];
const AVAIL = { hele_dag: 'Hele dag', ochtend: 'Ochtend', middag: 'Middag', avond: 'Avond', niet: 'Niet beschikbaar' };
const AVAIL_SHORT = { hele_dag: '✓ hele dag', ochtend: '✓ ochtend', middag: '✓ middag', avond: '✓ avond', niet: '✕ niet' };
const SWAPST = { open: 'Wacht op collega', accepted: 'Wacht op directie', approved: 'Geregeld', rejected: 'Afgewezen', cancelled: 'Ingetrokken' };
const COLORS = ['#9a5b3f', '#3f7d58', '#3f6a9a', '#8a4f8f', '#b8862b', '#2f8a8a', '#b3485f', '#5b6b2f'];

function toast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.textContent = msg;
  const box = $('#toasts');
  const host = [...document.querySelectorAll('dialog[open]')].pop() || document.body;
  if (box.parentElement !== host) host.append(box);
  box.append(t);
  setTimeout(() => t.remove(), 3600);
}
function errMsg(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  const map = {
    'Invalid login credentials': 'E-mailadres of wachtwoord klopt niet.',
    'Email not confirmed': 'Bevestig eerst je e-mailadres via de link in je mail.',
    'User already registered': 'Er bestaat al een account met dit e-mailadres. Log in of vraag een nieuw wachtwoord aan.',
  };
  return map[m] || m;
}

const ICON = {
  planning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 14h3M13.5 14h3M7.5 17.5h3"/></svg>',
  diensten: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/></svg>',
  beschikbaar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M8.5 15l2.2 2.2 4.8-4.7"/></svg>',
  bell: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
  klokken: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><path d="M12 7v3.5l2 1.3"/></svg>',
  mijn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5"/><circle cx="17" cy="9.5" r="2.5"/><path d="M16.5 14.6c2.3.2 4 1.7 4.5 4.4"/></svg>',
  aanvragen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20.5V5a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 19 5v15.5l-3.5-2-3.5 2-3.5-2z"/><path d="M9 9h6M9 12.5h4"/></svg>',
  lijsten: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="18" rx="2"/><path d="M9 3.5h6v2.5H9zM8.5 11l1.5 1.5 3-3M8.5 16.5h7"/></svg>',
  uren: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/></svg>',
  overzicht: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19a8 8 0 1 1 16 0"/><path d="M12 19l4-6"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/></svg>',
  settings: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 16.5 14.5 12 10 7.5M14.5 12H4"/></svg>',
};

/* ================= Demo store (localStorage) ================= */
function demoSeed() {
  const mon = mondayOf(new Date());
  const D = n => iso(addDays(mon, n));
  const E = [
    { name: 'Mark Minkman', email: 'mark@voorbeeld.nl', position: 'Eigenaar', role: 'manager', contract_hours: 38, color: COLORS[0] },
    { name: 'Mariska van den Broek', email: 'mariska@voorbeeld.nl', position: 'Shiftleader', role: 'manager', contract_hours: 32, color: COLORS[6] },
    { name: 'Sanne Bakker', email: 'sanne@voorbeeld.nl', position: 'Bediening', role: 'staff', contract_hours: 24, color: COLORS[1] },
    { name: 'Daan Jansen', email: 'daan@voorbeeld.nl', position: 'Bar', role: 'staff', contract_hours: 20, color: COLORS[2] },
    { name: 'Noor El Amrani', email: 'noor@voorbeeld.nl', position: 'Keuken', role: 'staff', contract_hours: 32, color: COLORS[3] },
    { name: 'Mehmet Yilmaz', email: 'mehmet@voorbeeld.nl', position: 'Keuken', role: 'staff', contract_hours: 16, color: COLORS[4] },
    { name: 'Eva Smit', email: 'eva@voorbeeld.nl', position: 'Bediening', role: 'staff', contract_hours: 12, color: COLORS[5] },
  ].map(e => ({ id: uid(), user_id: 'demo', phone: '', active: true, ...e }));
  const [mark, mariska, sanne, daan, noor, mehmet, eva] = E;
  const S = [];
  const add = (e, day, start, end, pauze, pub, pos) => S.push({ id: uid(), employee_id: e.id, date: D(day), start_time: start, end_time: end, break_minutes: pauze, position: pos || e.position, note: '', published: pub });
  for (const wk of [0, 7]) {
    const pub = wk === 0;
    [1, 2, 4, 5].forEach(d => add(mariska, wk + d, '16:00', '23:00', 30, pub));
    [3, 4, 5].forEach(d => add(mark, wk + d, '11:00', '19:00', 30, pub));
    [0, 2, 5].forEach(d => add(sanne, wk + d, '11:00', '17:00', 30, pub));
    add(sanne, wk + 4, '17:00', '23:00', 30, pub);
    [3, 4, 5].forEach(d => add(daan, wk + d, '17:00', '01:00', 30, pub));
    [1, 2, 3, 4, 5].forEach(d => add(noor, wk + d, '14:00', '22:00', 30, pub));
    [5, 6].forEach(d => add(mehmet, wk + d, '12:00', '20:00', 30, pub));
    [5, 6].forEach(d => add(eva, wk + d, '12:00', '18:00', 30, pub));
  }
  const now = new Date().toISOString();
  const R = [
    { id: uid(), employee_id: sanne.id, type: 'vakantie', start_date: D(21), end_date: D(27), note: 'Weekje naar Portugal met familie.', status: 'pending', manager_note: null, created_at: now },
    { id: uid(), employee_id: eva.id, type: 'vrij', start_date: D(13), end_date: D(13), note: 'Verjaardag van mijn oma.', status: 'pending', manager_note: null, created_at: now },
    { id: uid(), employee_id: daan.id, type: 'vrij', start_date: D(1), end_date: D(1), note: 'Tentamen', status: 'approved', manager_note: 'Succes!', leave_hours: 4, created_at: now },
  ];
  // Klokregistraties voor afgelopen diensten
  const T = [];
  const at = (ds, t, plusMin) => { const d = parse(ds); const [h, m] = t.split(':').map(Number); d.setHours(h, m + plusMin, 0, 0); return d; };
  const nowD = new Date();
  S.filter(s => s.published).forEach((s, i) => {
    const inD = at(s.date, s.start_time, [-4, 2, -1, 7, 0, -3][i % 6]);
    let outD = at(s.date, s.end_time, [6, -2, 12, 0, 3, 25][i % 6]);
    if (outD <= inD) outD = new Date(outD.getTime() + 86400000);
    if (outD > nowD) return;
    const old = (nowD - outD) / 86400000 > 2;
    T.push({ id: uid(), employee_id: s.employee_id, clock_in: inD.toISOString(), clock_out: outD.toISOString(), break_minutes: s.break_minutes, break_started_at: null,
      in_method: i % 3 ? 'wifi' : 'gps', out_method: i % 4 ? 'wifi' : 'gps', in_distance_m: i % 3 ? null : 12 + (i * 7) % 40, out_distance_m: i % 4 ? null : 9 + (i * 11) % 50, flags: [], reason: null, status: old ? 'approved' : 'pending', manager_note: null, edited: false,
      overtime_status: [6, -2, 12, 0, 3, 25][i % 6] >= 20 ? (old ? 'approved' : 'requested') : null,
      overtime_reason: [6, -2, 12, 0, 3, 25][i % 6] >= 20 ? 'Laatste tafel bleef lang zitten, keuken nog schoongemaakt' : null });
  });
  const flagged = T.filter(t => t.status === 'pending')[0];
  if (flagged) Object.assign(flagged, { flags: ['uit_buiten_locatie'], out_distance_m: 1840, reason: 'Na sluiting nog boodschappen weggebracht bij de groothandel' });
  T.push({ id: uid(), employee_id: mariska.id, clock_in: new Date(nowD.getTime() - 95 * 60000).toISOString(), clock_out: null, break_minutes: 0, break_started_at: null, in_distance_m: 18, out_distance_m: null, flags: [], reason: null, status: 'open', manager_note: null, edited: false });
  const settings = { lat: 52.3702, lng: 4.8952, radius_m: 150, allow_override: true, swap_needs_approval: true, wifi_ips: ['84.12.34.56'], plan_leading: true, plan_margin_min: 5,
    pct_avond: 0, pct_nacht: 25, pct_zondag: 0, pct_feestdag: 50, pct_vakantiegeld: 8, pct_werkgever: 25, goal_labor_pct: 30, goal_productivity: 60, goal_cost_hour: 24, demo: true };
  // Vertrouwelijk: uurloon, geboortedatum, verlof (Daan is 17 → jongerenregels)
  const yr = new Date().getFullYear();
  const P = {};
  [[mariska, 17.5, '1991-04-12', 8], [sanne, 14.2, '2001-09-03', 12], [daan, 10.85, `${yr - 17}-03-15`, 0], [noor, 16, '1996-01-22', 20], [mehmet, 15.25, '1999-07-30', 0], [eva, 13.68, `${yr - 19}-06-01`, 4]]
    .forEach(([e, w, b, o]) => (P[e.id] = { employee_id: e.id, hourly_wage: w, birth_date: b, leave_hours_year: null, leave_opening: o, leave_year: yr }));
  // Open diensten, ruilen, beschikbaarheid, meldingen
  const open1 = { id: uid(), employee_id: null, date: D(6), start_time: '17:00', end_time: '23:00', break_minutes: 30, position: 'Bediening', note: 'Extra drukte verwacht', published: true };
  const open2 = { id: uid(), employee_id: null, date: D(12), start_time: '12:00', end_time: '18:00', break_minutes: 30, position: 'Keuken', note: '', published: false };
  S.push(open1, open2);
  const A = [{ id: uid(), shift_id: open1.id, employee_id: eva.id, status: 'pending', created_at: now }];
  const daanSat = S.find(s => s.employee_id === daan.id && s.date === D(5) && s.published);
  const W = daanSat ? [{ id: uid(), shift_id: daanSat.id, from_employee: daan.id, to_employee: null, swap_shift_id: null, taken_by: null, note: 'Verjaardag van mijn broer', manager_note: null, status: 'open', created_at: now }] : [];
  const V = [];
  const pat = { [sanne.id]: ['hele_dag', 'niet', 'middag', 'hele_dag', 'avond', 'hele_dag', 'niet'], [noor.id]: ['niet', 'hele_dag', 'hele_dag', 'hele_dag', 'hele_dag', 'hele_dag', 'niet'], [eva.id]: ['niet', 'niet', 'niet', 'niet', 'avond', 'hele_dag', 'hele_dag'], [daan.id]: ['avond', 'avond', 'niet', 'avond', 'avond', 'hele_dag', 'niet'] };
  Object.entries(pat).forEach(([emp, ks]) => ks.forEach((k, i) => V.push({ employee_id: emp, date: D(7 + i), kind: k, note: k === 'niet' && i === 1 ? 'Tentamen' : null })));
  const N = [];
  const n = (emp, title, body, view, read) => N.push({ id: uid(), employee_id: emp, title, body, view, read_at: read ? now : null, created_at: new Date(Date.now() - N.length * 3600000).toISOString() });
  [sanne, daan, noor, mehmet, eva].forEach(e => n(e.id, 'Open dienst beschikbaar', `${fmtShort(open1.date)} 17:00–23:00 · Bediening. Meld je aan!`, 'diensten'));
  if (daanSat) [sanne, noor, mehmet, eva, mark, mariska].forEach(e => n(e.id, 'Dienst aangeboden', `Daan biedt ${fmtShort(daanSat.date)} 17:00–01:00 aan. Wil jij hem overnemen?`, 'diensten'));
  [mark, mariska].forEach(e => { n(e.id, 'Aanmelding open dienst', `Eva wil ${fmtShort(open1.date)} 17:00–23:00 werken`, 'aanvragen:open'); n(e.id, 'Nieuwe aanvraag', `Sanne: Vakantie ${fmtShort(D(21))} t/m ${fmtShort(D(27))}`, 'aanvragen:verlof'); });
  [sanne, daan, noor, mehmet, eva, mariska, mark].forEach(e => n(e.id, 'Nieuw rooster', `Het rooster van week ${weekNr(mon)} staat klaar`, 'mijn', true));
  // voorbeeldomzet voor deze week: verwacht per dag, werkelijk tot en met gisteren
  const revenue = {};
  [950, 1100, 1250, 1300, 2100, 2600, 1400].forEach((v, i) => { const d = iso(addDays(mon, i)); revenue[d] = { date: d, forecast: v, actual: d < iso(new Date()) ? Math.round(v * (0.9 + ((i * 7) % 5) / 25)) : null }; });
  const announcements = [
    { id: uid(), title: 'Welkom in de nieuwe rooster-app', body: 'Hier vind je voortaan je rooster, ruil je diensten en vraag je verlof aan. Zet de app op je beginscherm en zet meldingen aan via het belletje.', pinned: true, created_by: mark.id, created_at: new Date(Date.now() - 6 * 864e5).toISOString() },
    { id: uid(), title: 'Nieuwe najaarskaart vanaf vrijdag', body: 'Vrijdag gaat de najaarskaart live. Donderdag om 15:00 proeven we alles samen in de keuken; fijn als je erbij bent.', pinned: false, created_by: mark.id, created_at: new Date(Date.now() - 864e5).toISOString() },
  ];
  return { employees: E, shifts: S, requests: R, entries: T, settings, applications: A, swaps: W, availability: V, notifications: N, private: P, revenue, announcements, annReads: [] };
}

function demoStore() {
  const KEY = 'lilou-rooster-demo-v9';
  let mem = null;
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* ignore */ }
  if (!db || !db.employees) db = demoSeed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ } };
  save();
  try { mem = sessionStorage.getItem(KEY + '-me'); } catch (e) { /* ignore */ }
  const me = () => db.employees.find(e => e.id === mem) || null;
  const isMgr = () => me()?.role === 'manager';
  ['applications', 'swaps', 'availability', 'notifications'].forEach(k => (db[k] ||= []));
  const fname = id => (db.employees.find(e => e.id === id)?.name || '').split(' ')[0];
  const lbl = s => `${fmtShort(s.date)} ${hm(s.start_time)}–${hm(s.end_time)}`;
  const notify = (emp, title, body, view) => { if (emp) db.notifications.push({ id: uid(), employee_id: emp, title, body, view, read_at: null, created_at: new Date().toISOString() }); };
  const notifyMgrs = (t, b, v, except) => db.employees.filter(e => e.role === 'manager' && e.active !== false && e.id !== except).forEach(e => notify(e.id, t, b, v));
  const notifyTeam = (t, b, v, except) => db.employees.filter(e => e.active !== false && e.id !== except).forEach(e => notify(e.id, t, b, v));
  const shiftById = id => db.shifts.find(s => s.id === id);
  db.audit ||= [];
  db.checklists ||= DEFAULT_LISTS.map(l => ({ ...l, id: uid(), items: l.items.map(it => ({ ...it })) }));
  db.ticks ||= []; db.logs ||= [];
  const leads = () => db.employees.filter(e => ['manager', 'planner'].includes(e.role) && e.active !== false);
  const audit = (tbl, rowId, action, oldObj, newObj) => {
    let o = oldObj ? { ...oldObj } : null, n = newObj ? { ...newObj } : null;
    if (action === 'update') {
      const keys = Object.keys(n).filter(k => k !== 'updated_at' && JSON.stringify(o[k] ?? null) !== JSON.stringify(n[k] ?? null));
      if (!keys.length) return;
      o = Object.fromEntries(keys.map(k => [k, oldObj[k] ?? null])); n = Object.fromEntries(keys.map(k => [k, newObj[k] ?? null]));
    }
    db.audit.push({ id: uid(), at: new Date().toISOString(), actor: mem, actor_name: me()?.name || 'Systeem', tbl, row_id: rowId, action, old: o, new: n });
  };
  const swapExec = w => {
    const a = shiftById(w.shift_id);
    if (!a || a.employee_id !== w.from_employee) throw new Error('De dienst is intussen gewijzigd; de ruil kan niet doorgaan.');
    const b = w.swap_shift_id ? shiftById(w.swap_shift_id) : null;
    if (w.swap_shift_id && (!b || b.employee_id !== w.taken_by)) throw new Error('De dienst van de collega is intussen gewijzigd; de ruil kan niet doorgaan.');
    a.employee_id = w.taken_by; if (b) b.employee_id = w.from_employee;
    w.status = 'approved'; w.decided_at = new Date().toISOString();
    db.swaps.forEach(o => { if (o !== w && ['open', 'accepted'].includes(o.status) && [w.shift_id, w.swap_shift_id].filter(Boolean).some(id => o.shift_id === id || o.swap_shift_id === id)) o.status = 'cancelled'; });
  };
  return {
    demo: true,
    async init() { return me() ? { employee: clone(me()) } : null; },
    async demoUsers() { return clone(db.employees.filter(e => e.active !== false)).sort((a, b) => (a.role === 'manager' ? -1 : 1) - (b.role === 'manager' ? -1 : 1) || a.name.localeCompare(b.name)); },
    async demoLogin(id) { mem = id; try { sessionStorage.setItem(KEY + '-me', id); } catch (e) { /* ignore */ } return { employee: clone(me()) }; },
    async resetDemo() { db = demoSeed(); save(); },
    async signOut() { mem = null; try { sessionStorage.removeItem(KEY + '-me'); } catch (e) { /* ignore */ } },
    async employees() { return clone(db.employees).sort((a, b) => a.name.localeCompare(b.name)); },
    async saveEmployee(e) {
      if (!isMgr()) throw new Error('Geen rechten');
      if (db.employees.some(x => x.email.toLowerCase() === e.email.toLowerCase() && x.id !== e.id)) throw new Error('Dit e-mailadres is al in gebruik.');
      let id = e.id;
      if (id) {
        const cur = db.employees.find(x => x.id === id), old = { ...cur }; Object.assign(cur, e); audit('employees', id, 'update', old, { ...cur });
        if (old.active !== false && cur.active === false) {   // uit dienst: aanmeldingen en ruilverzoeken vervallen
          db.applications.filter(a => a.employee_id === id && a.status === 'pending').forEach(a => (a.status = 'rejected'));
          db.swaps.filter(w => ['open', 'accepted'].includes(w.status) && [w.from_employee, w.to_employee, w.taken_by].includes(id)).forEach(w => (w.status = 'cancelled'));
        }
      }
      else { id = uid(); db.employees.push({ ...e, id, user_id: null }); audit('employees', id, 'insert', null, e); }   // net als echt: pas actief na activeren
      save(); return id;
    },
    async inviteEmployee(id) {
      const e = db.employees.find(x => x.id === id);
      e.invited_at = new Date().toISOString(); save();
      return { email: e.email, demo: true };
    },
    async privates() { db.private ||= {}; return clone(Object.values(db.private).filter(p => isMgr() || p.employee_id === mem)); },
    async savePrivate(p) {
      if (!isMgr()) throw new Error('Geen rechten');
      db.private ||= {};
      const old = db.private[p.employee_id];
      db.private[p.employee_id] = { ...(old || {}), ...p };
      audit('employee_private', p.employee_id, old ? 'update' : 'insert', old || null, db.private[p.employee_id]);
      save();
    },
    async deleteEmployee(id) {
      if (db.entries.some(x => x.employee_id === id)) throw new Error(KLOK_DELETE);
      db.employees = db.employees.filter(e => e.id !== id);
      db.shifts = db.shifts.filter(s => s.employee_id !== id);
      db.requests = db.requests.filter(r => r.employee_id !== id);
      db.applications = db.applications.filter(a => a.employee_id !== id);
      db.availability = db.availability.filter(a => a.employee_id !== id);
      db.swaps = db.swaps.filter(w => ![w.from_employee, w.to_employee, w.taken_by].includes(id));
      save();
    },
    async shifts(from, to) {
      return clone(db.shifts.filter(s => s.date >= from && s.date <= to && (canPlan() || s.published)))
        .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
    },
    async shiftsOf(emp, from, to) { return (await this.shifts(from, to)).filter(s => s.employee_id === emp); },
    async saveShifts(list) {
      for (const s of list) {
        if (s.id) {
          const cur = db.shifts.find(x => x.id === s.id), old = { ...cur };
          Object.assign(cur, s);
          if (old.published && cur.published && cur.date >= todayIso() && ['date', 'start_time', 'end_time', 'employee_id'].some(k => old[k] !== cur[k])) {
            if (cur.employee_id) notify(cur.employee_id, old.employee_id !== cur.employee_id ? 'Dienst toegevoegd' : 'Dienst gewijzigd', lbl(cur), 'mijn');
            if (old.employee_id && old.employee_id !== cur.employee_id) notify(old.employee_id, 'Dienst vervallen', lbl(old), 'mijn');
            if (old.employee_id && !cur.employee_id) notifyTeam('Open dienst beschikbaar', `${lbl(cur)}. Meld je aan!`, 'diensten', old.employee_id);
          }
          // ruilverzoeken voor deze dienst vervallen als de eigenaar verandert
          if (old.employee_id !== cur.employee_id) db.swaps.filter(w => ['open', 'accepted'].includes(w.status) && (w.shift_id === cur.id || w.swap_shift_id === cur.id)).forEach(w => (w.status = 'cancelled'));
        } else db.shifts.push({ ...s, id: uid() });
      }
      save();
    },
    async deleteShift(id) {
      const s = shiftById(id);
      if (s && s.published && s.employee_id && s.date >= todayIso()) notify(s.employee_id, 'Dienst vervallen', lbl(s), 'mijn');
      db.shifts = db.shifts.filter(x => x.id !== id);
      db.applications = db.applications.filter(a => a.shift_id !== id);
      db.swaps = db.swaps.filter(w => w.shift_id !== id && w.swap_shift_id !== id);
      save();
    },
    async bulkShifts(ids, action) {
      const set = new Set(ids), hit = db.shifts.filter(s => set.has(s.id)), t = todayIso();
      const owners0 = [...new Set(hit.map(x => x.employee_id).filter(Boolean))];   // één medewerker: die krijgt geen 'open diensten'-melding over zijn eigen diensten
      const per = {};
      hit.filter(s => s.published && s.employee_id && s.date >= t && db.employees.find(e => e.id === s.employee_id)?.active !== false).forEach(s => (per[s.employee_id] ||= []).push(s));
      if (action === 'delete') {
        db.shifts = db.shifts.filter(s => !set.has(s.id));
        db.applications = db.applications.filter(a => !set.has(a.shift_id));
        db.swaps = db.swaps.filter(w => !set.has(w.shift_id) && !set.has(w.swap_shift_id));
      } else {
        hit.forEach(s => { db.swaps.filter(w => ['open', 'accepted'].includes(w.status) && (w.shift_id === s.id || w.swap_shift_id === s.id)).forEach(w => (w.status = 'cancelled')); s.employee_id = null; });
      }
      Object.entries(per).forEach(([emp, l]) => notify(emp, l.length === 1 ? 'Dienst vervallen' : `${l.length} diensten vervallen`, l.length === 1 ? lbl(l[0]) : `Er zijn ${l.length} diensten van je uit het rooster gehaald. Tik om je rooster te bekijken.`, 'mijn'));
      const o = hit.filter(s => s.published && s.employee_id && s.date >= t).length;   // ook als de medewerker al uit dienst is
      if (action === 'open' && o) notifyTeam(`Open dienst${o > 1 ? 'en' : ''} beschikbaar`, `${o} open dienst${o > 1 ? 'en' : ''} in het rooster. Meld je aan!`, 'diensten', owners0.length === 1 ? owners0[0] : undefined);
      save(); return hit.length;
    },
    async publish(from, to) {
      const upd = db.shifts.filter(s => s.date >= from && s.date <= to && !s.published);
      upd.forEach(s => (s.published = true));
      const per = {}; upd.filter(s => s.employee_id).forEach(s => (per[s.employee_id] = (per[s.employee_id] || 0) + 1));
      Object.entries(per).forEach(([emp, n]) => notify(emp, `Je rooster voor week ${weekNr(parse(from))} staat klaar`, `Je hebt ${n} nieuwe dienst${n > 1 ? 'en' : ''}. Tik om je rooster te bekijken.`, 'mijn'));
      const o = upd.filter(s => !s.employee_id).length;
      if (o) notifyTeam(`Open dienst${o > 1 ? 'en' : ''} beschikbaar`, `${o} open dienst${o > 1 ? 'en' : ''} in week ${weekNr(parse(from))}. Meld je aan!`, 'diensten');
      save();
    },
    async mailRoster(from, to, ids) { return { sent: ids.length, failed: [], demo: true }; },
    // --- prikbord
    async announcements() {
      db.announcements ||= []; db.annReads ||= [];
      return { list: clone(db.announcements).sort((a, b) => (b.pinned - a.pinned) || b.created_at.localeCompare(a.created_at)), reads: clone(db.annReads.filter(r => isMgr() || r.employee_id === mem)) };
    },
    async saveAnnouncement(a) {
      if (!isMgr()) throw new Error('Alleen de directie kan mededelingen plaatsen.');
      db.announcements ||= [];
      if (a.id) Object.assign(db.announcements.find(x => x.id === a.id), a, { updated_at: new Date().toISOString() });
      else { const n = { pinned: false, ...a, id: uid(), created_by: mem, created_at: new Date().toISOString() }; db.announcements.push(n); notifyTeam('📣 ' + n.title, (n.body || 'Nieuwe mededeling op het prikbord').slice(0, 140), 'mededelingen', mem); }
      save();
    },
    async deleteAnnouncement(id) { db.announcements = db.announcements.filter(x => x.id !== id); db.annReads = (db.annReads || []).filter(r => r.announcement_id !== id); save(); },
    async markAnnRead(id) { db.annReads ||= []; if (!db.annReads.some(r => r.announcement_id === id && r.employee_id === mem)) db.annReads.push({ announcement_id: id, employee_id: mem, read_at: new Date().toISOString() }); save(); },
    async uploadAttachment(file) {
      if (file.size > 1.5e6) throw new Error('In de demo kunnen alleen bestanden tot 1,5 MB.');
      const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
      const path = 'demo/' + uid(); db.files ||= {}; db.files[path] = data; save();
      return { path, name: file.name, type: file.type };
    },
    async attachmentUrl(path) { return (db.files || {})[path] || ''; },
    async attachmentBlob(path) { const d = (db.files || {})[path]; if (!d) throw new Error('Bestand niet gevonden'); return (await fetch(d)).blob(); },
    async deleteAttachment(path) { if (db.files) { delete db.files[path]; save(); } },
    async renotifyAnnouncement(id) {
      const a = db.announcements.find(x => x.id === id); db.annReads = (db.annReads || []).filter(r => r.announcement_id !== id);
      notifyTeam('📣 ' + a.title, (a.body || 'Bijgewerkte mededeling op het prikbord').slice(0, 140), 'mededelingen', mem); save();
    },
    async revenue(from, to) { db.revenue ||= {}; if (!isMgr()) return []; return Object.values(db.revenue).filter(d => d.date >= from && d.date <= to).map(clone); },
    async saveRevenue(date, patch) {
      if (!isMgr()) throw new Error('Alleen de directie kan omzet invullen.');
      db.revenue ||= {}; const cur = { date, forecast: null, actual: null, ...(db.revenue[date] || {}), ...patch };
      if (cur.forecast == null && cur.actual == null) delete db.revenue[date]; else db.revenue[date] = cur; save();
    },
    async dayInfo(from, to) { db.dayinfo ||= {}; return Object.values(db.dayinfo).filter(d => d.date >= from && d.date <= to).map(clone); },
    async saveDay(date, guests) { db.dayinfo ||= {}; if (guests == null) delete db.dayinfo[date]; else db.dayinfo[date] = { date, guests }; save(); },
    async vapidKey() { return ''; },
    async resetCalendarToken() { return uid(); },
    async requests() {
      return clone(db.requests.filter(r => canPlan() || r.employee_id === mem)).sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    // --- lijsten
    async checklists() { return clone(db.checklists).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)); },
    async saveChecklist(c) {
      if (!isMgr()) throw new Error('Geen rechten');
      if (c.id) Object.assign(db.checklists.find(x => x.id === c.id), c); else db.checklists.push({ active: true, ...c, id: uid() });
      save();
    },
    async deleteChecklist(id) { db.checklists = db.checklists.filter(x => x.id !== id); db.ticks = db.ticks.filter(t => t.checklist_id !== id); save(); },
    async ticks(periods) { return clone(db.ticks.filter(t => periods.includes(t.period))); },
    async ticksSince(from) { return clone(db.ticks.filter(t => t.at.slice(0, 10) >= from)); },
    async tick(t) {
      const l = db.checklists.find(x => x.id === t.checklist_id), it = l?.items.find(x => x.id === t.item_id);
      if (!it) throw new Error('Onbekend onderdeel van de lijst.');
      if (db.ticks.some(x => x.checklist_id === t.checklist_id && x.period === t.period && x.item_id === t.item_id)) throw Object.assign(new Error('duplicate'), { code: '23505' });
      let flagged = false;
      if (l.kind === 'temp') {
        if (t.value == null) throw new Error('Vul een temperatuur in.');
        flagged = (it.max != null && t.value > it.max) || (it.min != null && t.value < it.min);
        if (flagged) leads().forEach(e => notify(e.id, '🌡️ Temperatuur te hoog', `${it.label}: ${t.value} °C (norm max ${it.max} °C), gemeten door ${fname(mem)}.`, 'lijsten'));
      }
      db.ticks.push({ ...t, id: uid(), employee_id: mem, at: new Date().toISOString(), flagged, value: t.value ?? null });
      save();
    },
    async untick(id) {
      const t = db.ticks.find(x => x.id === id); if (!t) return;
      if (t.employee_id !== mem && !canPlan()) throw new Error('Alleen wie het afvinkte of de leiding kan dit ongedaan maken');
      db.ticks = db.ticks.filter(x => x.id !== id); save();
    },
    async logs(from, to, openOnly) {
      return clone(db.logs.filter(x => (canPlan() || x.employee_id === mem) && x.at.slice(0, 10) >= from && x.at.slice(0, 10) <= to && (!openOnly || (x.kind === 'melding' && !x.resolved_at)))).sort((a, b) => b.at.localeCompare(a.at));
    },
    async addLog(kind, data) {
      const t = data.temp === '' || data.temp == null ? null : Number(data.temp);
      const flagged = kind === 'melding' || (kind === 'ontvangst' && (data.ok === false || (t != null && t > (data.max === '' || data.max == null ? 7 : Number(data.max))))) || (kind === 'kern' && t != null && t < 75);
      db.logs.push({ id: uid(), kind, data, employee_id: mem, at: new Date().toISOString(), flagged, resolved_at: null, resolved_by: null, resolution: null });
      const title = kind === 'melding' ? ({ incident: '⚠️ Incident gemeld', klacht: '💬 Klacht gemeld' }[data.soort] || '🔧 Gebrek gemeld') : kind === 'kern' ? '🌡️ Kerntemperatuur te laag' : '📦 Levering afgekeurd of te warm';
      if (flagged) leads().filter(e => e.id !== mem).forEach(e => notify(e.id, title, `${kind === 'melding' ? (data.tekst || '').slice(0, 120) : (data.product || data.leverancier || '')} (${fname(mem)})`, 'lijsten'));
      save();
    },
    async resolveLog(id, resolution) {
      if (!canPlan()) throw new Error('Geen rechten');
      Object.assign(db.logs.find(x => x.id === id), { resolved_at: new Date().toISOString(), resolved_by: mem, resolution }); save();
    },
    async sickRecover(id) {
      const r = db.requests.find(x => x.id === id && x.employee_id === mem && x.type === 'ziek'); if (!r) throw new Error('Ziekmelding niet gevonden');
      const t = todayIso(); if (r.end_date > t) r.end_date = r.start_date > t ? r.start_date : t;
      db.employees.filter(e => ['manager', 'planner'].includes(e.role) && e.active !== false && e.id !== mem).forEach(e => notify(e.id, '💪 Weer beter', `${fname(mem)} is weer beter en kan weer werken.`, e.role === 'manager' ? 'aanvragen:verlof' : 'planning'));
      save();
    },
    async saveRequest(r) {
      db.requests.push({ ...r, id: uid(), status: 'pending', manager_note: null, created_at: new Date().toISOString() });
      const per = `${fmtShort(r.start_date)}${r.end_date !== r.start_date ? ' t/m ' + fmtShort(r.end_date) : ''}`;
      if (r.type === 'ziek') db.employees.filter(e => ['manager', 'planner'].includes(e.role) && e.active !== false && e.id !== r.employee_id).forEach(e => notify(e.id, '🤒 Ziekmelding', `${fname(r.employee_id)} heeft zich ziek gemeld: ${per}`, e.role === 'manager' ? 'aanvragen:verlof' : 'planning'));
      else notifyMgrs('Nieuwe aanvraag', `${fname(r.employee_id)}: ${REQ[r.type]} ${per}`, 'aanvragen:verlof');
      save();
    },
    async decideRequest(id, status, note, hours) {
      const r = db.requests.find(x => x.id === id);
      Object.assign(r, { status, manager_note: note || null, decided_at: new Date().toISOString() });
      if (hours !== undefined) r.leave_hours = hours;
      if (status !== 'pending') notify(r.employee_id, `Aanvraag ${status === 'approved' ? 'goedgekeurd' : 'afgewezen'}`, `${REQ[r.type]} ${fmtShort(r.start_date)}${note ? ' — ' + note : ''}`, 'aanvragen');
      else notify(r.employee_id, 'Aanvraag weer in behandeling', `${REQ[r.type]} ${fmtShort(r.start_date)} wordt opnieuw beoordeeld.`, 'aanvragen');
      save();
    },
    // --- open diensten
    async applications() { return clone(db.applications.filter(a => canPlan() || a.employee_id === mem)); },
    async openApply(shiftId) {
      const s = shiftById(shiftId);
      if (!s || s.employee_id || !s.published || s.date < todayIso()) throw new Error('Deze dienst is niet (meer) open.');
      const a = db.applications.find(x => x.shift_id === shiftId && x.employee_id === mem);
      if (a) a.status = 'pending'; else db.applications.push({ id: uid(), shift_id: shiftId, employee_id: mem, status: 'pending', created_at: new Date().toISOString() });
      notifyMgrs('Aanmelding open dienst', `${fname(mem)} wil ${lbl(s)} werken`, 'aanvragen:open');
      save();
    },
    async openWithdraw(shiftId) { db.applications = db.applications.filter(a => !(a.shift_id === shiftId && a.employee_id === mem && a.status === 'pending')); save(); },
    async openAssign(shiftId, emp) {
      if (!canPlan()) throw new Error('Alleen de directie of een shiftleader kan toewijzen.');
      if (!db.employees.some(e => e.id === emp && e.active !== false)) throw new Error('Deze medewerker is niet (meer) actief.');
      const s = shiftById(shiftId);
      if (!s || s.employee_id) throw new Error('Deze dienst is al toegewezen.');
      s.employee_id = emp;
      db.applications.filter(a => a.shift_id === shiftId).forEach(a => { a.status = a.employee_id === emp ? 'accepted' : 'rejected'; if (a.employee_id !== emp) notify(a.employee_id, 'Open dienst vergeven', `${lbl(s)} is aan een collega gegeven.`, 'diensten'); });
      notify(emp, 'Open dienst is van jou', lbl(s), 'mijn');
      save();
    },
    // --- ruilen
    async swaps() { return clone(db.swaps.filter(w => isMgr() || w.from_employee === mem || w.to_employee === mem || w.taken_by === mem || (!w.to_employee && w.status === 'open'))); },
    async swapOffer({ shift_id, to_employee, swap_shift_id, note }) {
      const s = shiftById(shift_id);
      if (!s || s.employee_id !== mem || !s.published || s.date < todayIso()) throw new Error('Je kunt alleen je eigen, komende diensten aanbieden.');
      if (swap_shift_id) { const b = shiftById(swap_shift_id); if (!to_employee || !b || b.employee_id !== to_employee || !b.published || b.date < todayIso()) throw new Error('Je kunt alleen ruilen tegen een komende dienst van de gekozen collega.'); }
      if (db.swaps.some(w => w.shift_id === shift_id && ['open', 'accepted'].includes(w.status))) throw new Error('Voor deze dienst loopt al een verzoek.');
      db.swaps.push({ id: uid(), shift_id, from_employee: mem, to_employee: to_employee || null, swap_shift_id: swap_shift_id || null, taken_by: null, note: (note || '').trim() || null, manager_note: null, status: 'open', created_at: new Date().toISOString() });
      if (!to_employee) notifyTeam('Dienst aangeboden', `${fname(mem)} biedt ${lbl(s)} aan. Wil jij hem overnemen?`, 'diensten', mem);
      else if (swap_shift_id) notify(to_employee, 'Ruilverzoek', `${fname(mem)} wil ${lbl(s)} ruilen tegen jouw ${lbl(shiftById(swap_shift_id))}`, 'diensten');
      else notify(to_employee, 'Dienst aangeboden', `${fname(mem)} vraagt of jij ${lbl(s)} wilt overnemen`, 'diensten');
      save();
    },
    async swapRespond(id, accept) {
      const w = db.swaps.find(x => x.id === id);
      if (!w || w.status !== 'open') throw new Error('Dit verzoek is niet meer open.');
      if (w.from_employee === mem || (w.to_employee && w.to_employee !== mem)) throw new Error('Dit verzoek is niet voor jou.');
      const s = shiftById(w.shift_id);
      if (!accept) { if (!w.to_employee) return; w.status = 'rejected'; notify(w.from_employee, 'Verzoek geweigerd', `${fname(mem)} kan ${lbl(s)} niet overnemen`, 'diensten'); return save(); }
      w.status = 'accepted'; w.taken_by = mem;
      if (db.settings.swap_needs_approval !== false) {
        notify(w.from_employee, 'Collega gevonden', `${fname(mem)} neemt ${lbl(s)} over. Wacht op goedkeuring directie.`, 'diensten');
        notifyMgrs('Ruil ter goedkeuring', `${fname(w.from_employee)} → ${fname(mem)}: ${lbl(s)}`, 'aanvragen:ruilen');
      } else {
        swapExec(w);
        notify(w.from_employee, 'Ruil geregeld', `${fname(mem)} neemt ${lbl(s)} over.`, 'mijn');
        notifyMgrs('Dienst geruild', `${fname(w.from_employee)} → ${fname(mem)}: ${lbl(s)}`, 'planning');
      }
      save();
    },
    async swapDecide(id, approve, note) {
      if (!isMgr()) throw new Error('Alleen de directie kan ruilen goedkeuren.');
      const w = db.swaps.find(x => x.id === id);
      if (!w || w.status !== 'accepted') throw new Error('Dit verzoek wacht niet op goedkeuring.');
      const s = shiftById(w.shift_id), L = lbl(s);
      if (approve) { swapExec(w); w.manager_note = note || null; notify(w.from_employee, 'Ruil goedgekeurd', `${L} is overgenomen door ${fname(w.taken_by)}`, 'mijn'); notify(w.taken_by, 'Ruil goedgekeurd', `${L} staat nu in jouw rooster`, 'mijn'); }
      else { w.status = 'rejected'; w.manager_note = note || null; [w.from_employee, w.taken_by].forEach(e => notify(e, 'Ruil afgewezen', L + (note ? ' — ' + note : ''), 'diensten')); }
      save();
    },
    async swapCancel(id) {
      const w = db.swaps.find(x => x.id === id);
      if (!w || w.from_employee !== mem || !['open', 'accepted'].includes(w.status)) throw new Error('Dit verzoek kun je niet (meer) intrekken.');
      w.status = 'cancelled'; notify(w.taken_by || w.to_employee, 'Verzoek ingetrokken', `${fname(mem)} heeft het verzoek ingetrokken.`, 'diensten');
      save();
    },
    // --- beschikbaarheid
    async availability(from, to) { return clone(db.availability.filter(a => a.date >= from && a.date <= to && (canPlan() || a.employee_id === mem))); },
    async saveAvailability(rows) {
      const dates = rows.map(r => r.date);
      db.availability = db.availability.filter(a => !(a.employee_id === mem && dates.includes(a.date)));
      rows.filter(r => r.kind).forEach(r => db.availability.push({ employee_id: mem, date: r.date, kind: r.kind, note: r.note || null }));
      save();
    },
    // --- meldingen
    async notifications() { return clone(db.notifications.filter(n => n.employee_id === mem)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 60); },
    async markRead(ids) { const t = new Date().toISOString(); db.notifications.forEach(n => { if (n.employee_id === mem && !n.read_at && (!ids || ids.includes(n.id))) n.read_at = t; }); save(); },
    async savePushSub() { /* demo: niets */ },
    async deleteRequest(id) { db.requests = db.requests.filter(r => r.id !== id); save(); },
    // --- klokken
    async settings() { return clone(db.settings); },
    async saveSettings(st) { Object.assign(db.settings, st); save(); },
    async registerWifi() { const ip = '84.12.34.56'; db.settings.wifi_ips = [...new Set([...(db.settings.wifi_ips || []), ip])]; save(); return ip; },
    async entries(from, to) {
      const a = new Date(parse(from)).toISOString(), b = addDays(parse(to), 1).toISOString();
      return clone(db.entries.filter(e => e.clock_in >= a && e.clock_in < b && (isMgr() || e.employee_id === mem))).sort((x, y) => x.clock_in.localeCompare(y.clock_in));
    },
    async openEntries() { return clone(db.entries.filter(e => !e.clock_out && (isMgr() || e.employee_id === mem))); },
    async clock(action, pos, reason, overtime) {
      const st = db.settings;
      const open = db.entries.find(e => e.employee_id === mem && !e.clock_out);
      const now = new Date().toISOString();
      let dist = null, flag = null, method = null;
      if (action === 'in' || action === 'uit') {
        const ip = S.demoLoc === 'wifi' ? '84.12.34.56' : '31.20.99.1';
        if ((st.wifi_ips || []).includes(ip)) method = 'wifi';
        else {
          if (!pos || st.lat == null) flag = 'geen_locatie';
          else { dist = Math.round(distanceM(st.lat, st.lng, pos.lat, pos.lng)); if (dist - Math.min(pos.accuracy || 0, 100) > st.radius_m) flag = 'buiten_locatie'; else method = 'gps'; }
          if (flag && (!st.allow_override || !(reason || '').trim())) throw Object.assign(new Error(flag === 'geen_locatie' ? ((st.wifi_ips || []).length ? 'Je zit niet op de wifi van de zaak en je locatie is onbekend. Verbind met de wifi of zet locatievoorzieningen aan.' : 'Locatie onbekend. Zet locatievoorzieningen aan om te klokken.') : `Je bent ${dist} meter van de werklocatie. Klokken kan alleen op locatie.`), { code: 'LC001' });
        }
      }
      const r = (reason || '').trim() || null;
      if (action === 'in') {
        if (open) throw new Error('Je bent al ingeklokt.');
        db.entries.push({ id: uid(), employee_id: mem, clock_in: now, clock_out: null, break_minutes: 0, break_started_at: null, in_method: method, in_distance_m: dist, out_distance_m: null, flags: flag ? ['in_' + flag] : [], reason: r, status: 'open', manager_note: null, edited: false });
      } else {
        if (!open) throw new Error('Je bent niet ingeklokt.');
        const brk = () => (open.break_started_at ? Math.round((Date.now() - new Date(open.break_started_at)) / 60000) : 0);
        if (action === 'pauze_start') { if (open.break_started_at) throw new Error('Pauze loopt al.'); open.break_started_at = now; }
        else if (action === 'pauze_eind') { if (!open.break_started_at) throw new Error('Er loopt geen pauze.'); open.break_minutes += brk(); open.break_started_at = null; }
        else { open.break_minutes += brk(); open.break_started_at = null; open.clock_out = now; open.out_distance_m = dist; open.out_method = method; if (flag) open.flags.push('uit_' + flag); if (r) open.reason = [open.reason, r].filter(Boolean).join(' / '); open.status = 'pending'; const ot = (overtime || '').trim(); open.overtime_status = ot ? 'requested' : null; open.overtime_reason = ot || null; }
      }
      save();
    },
    async saveEntry(e) {
      if (e.id) { const cur = db.entries.find(x => x.id === e.id), old = { ...cur }; Object.assign(cur, e, { edited: true }); audit('time_entries', cur.id, 'update', old, { ...cur }); }
      else { const row = { id: uid(), break_started_at: null, in_distance_m: null, out_distance_m: null, flags: ['handmatig'], reason: null, ...e, edited: true }; db.entries.push(row); audit('time_entries', row.id, 'insert', null, row); }
      save();
    },
    async deleteEntry(id) { const old = db.entries.find(e => e.id === id); audit('time_entries', id, 'delete', old, null); db.entries = db.entries.filter(e => e.id !== id); save(); },
    async setEntryStatus(id, status, note, ot) {
      const e = db.entries.find(x => x.id === id), old = { ...e };
      e.status = status; if (note !== undefined && note !== null) e.manager_note = note; if (ot) e.overtime_status = ot;
      audit('time_entries', id, 'update', old, { ...e }); save();
    },
    async audit(rowId) { return clone(db.audit.filter(a => a.row_id === rowId)).sort((a, b) => b.at.localeCompare(a.at)); },
    // Automatische taken (in de echte versie: run_jobs() in de database, elke 15 min)
    async runJobs() {
      const now = Date.now(); db.reminders ||= {};
      let n = 0;
      db.entries.filter(e => !e.clock_out).forEach(e => {
        const ds = tDate(e.clock_in);
        const sh = matchShift(e, db.shifts.filter(x => x.employee_id === e.employee_id && x.published && x.date === ds));
        if (sh) {
          const pe = shiftWindow(sh)[1].getTime();
          if (now > pe + 3600000) {
            const old = { ...e };
            e.clock_out = new Date(Math.max(pe, new Date(e.clock_in).getTime() + 60000)).toISOString();
            if (e.break_started_at) { e.break_minutes += Math.max(0, Math.round((pe - new Date(e.break_started_at)) / 60000)); e.break_started_at = null; }
            e.flags = [...(e.flags || []), 'auto_uit']; e.status = 'pending';
            const m0 = mem; mem = null; audit('time_entries', e.id, 'update', old, { ...e }); mem = m0;
            notify(e.employee_id, 'Automatisch uitgeklokt', `Je was vergeten uit te klokken en bent uitgeklokt op ${tHM(pe)} (einde dienst). Langer gewerkt? Laat het de directie weten.`, 'mijn');
            n++;
          } else if (now > pe + 900000 && !db.reminders['u' + e.id]) {
            db.reminders['u' + e.id] = 1;
            notify(e.employee_id, 'Vergeet niet uit te klokken', `Je dienst eindigde om ${tHM(pe)}.`, 'mijn');
          }
        } else if (now > new Date(e.clock_in).getTime() + 16 * 3600000) {
          e.clock_out = new Date(new Date(e.clock_in).getTime() + 8 * 3600000).toISOString(); e.break_started_at = null;
          e.flags = [...(e.flags || []), 'auto_uit']; e.status = 'pending'; n++;
          notify(e.employee_id, 'Automatisch uitgeklokt', 'Je stond langer dan 16 uur ingeklokt zonder geplande dienst. De directie controleert je uren.', 'mijn');
          notifyMgrs('Registratie controleren', `${fname(e.employee_id)} stond langer dan 16 uur ingeklokt zonder dienst.`, 'klokken');
        }
      });
      db.shifts.filter(x => x.published && x.employee_id).forEach(x => {
        const st = shiftWindow(x)[0].getTime();
        if (st - now > 45 * 60000 && st - now < 75 * 60000 && !db.reminders['d' + x.id]) {
          db.reminders['d' + x.id] = 1;
          notify(x.employee_id, `Je dienst begint om ${hm(x.start_time)}`, lbl(x) + (x.position ? ' · ' + x.position : ''), 'mijn');
        }
      });
      save(); return n;
    },
  };
}

/* ================= Supabase store ================= */
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Kon ' + src + ' niet laden')); document.head.append(s); });
}

async function supabaseStore() {
  await loadScript('vendor/supabase.min.js');   // lokaal: geen verbinding met een externe CDN
  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  const fixShift = s => ({ ...s, start_time: hm(s.start_time), end_time: hm(s.end_time) });
  const redirect = location.origin + location.pathname;
  return {
    demo: false, sb,
    async init() {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return null;
      const emp = ok(await sb.from('employees').select('*').eq('user_id', session.user.id).maybeSingle());
      return emp ? { employee: emp } : { unlinked: true, email: session.user.email };
    },
    async signIn(email, password) { ok(await sb.auth.signInWithPassword({ email, password })); },
    async signUp(email, password) { return ok(await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirect } })); },
    async resetPassword(email) { ok(await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect })); },
    async updatePassword(password) { ok(await sb.auth.updateUser({ password })); },
    async signOut() { await sb.auth.signOut(); },
    async employees() {
      if (isMgr()) return ok(await sb.from('employees').select('*').order('name'));
      return ok(await sb.rpc('team'));   // medewerkers: alleen naam, functie en kleur van collega's
    },
    async saveEmployee(e) {
      const { id, ...rest } = e;
      if (id) { ok(await sb.from('employees').update(rest).eq('id', id)); return id; }
      return ok(await sb.from('employees').insert(rest).select('id').single()).id;
    },
    async privates() { return ok(await sb.from('employee_private').select('*')); },
    async inviteEmployee(id) {
      const { data, error } = await sb.functions.invoke('invite-employee', { body: { employee_id: id, redirect_to: location.origin + location.pathname } });
      if (error) {
        let msg = error.message || 'Uitnodigen mislukt';
        try { const b = await error.context.json(); if (b && b.error) msg = b.error; } catch (e) { /* geen JSON */ }
        if (/Failed to send a request|not found|404|FunctionsFetchError|FunctionsRelayError/i.test(msg)) msg = 'Uitnodigen per e-mail is nog niet ingesteld (Edge Function "invite-employee"). Gebruik voorlopig "Kopieer uitnodigingsbericht".';
        throw new Error(msg);
      }
      return data;
    },
    async savePrivate(p) { ok(await sb.from('employee_private').upsert({ ...p, updated_at: new Date().toISOString() })); },
    async deleteEmployee(id) {
      const { error } = await sb.from('employees').delete().eq('id', id);
      if (error) throw new Error(error.code === '23503' ? KLOK_DELETE : error.message);
    },
    async shifts(from, to, emp) {
      // per 1000 ophalen: de database geeft er nooit meer tegelijk, en we willen er geen missen
      const out = [];
      for (let i = 0; ; i += 1000) {
        let q = sb.from('shifts').select('*').gte('date', from).lte('date', to);
        if (emp) q = q.eq('employee_id', emp);
        const part = ok(await q.order('date').order('start_time').order('id').range(i, i + 999));
        out.push(...part); if (part.length < 1000) break;
      }
      return out.map(fixShift);
    },
    async shiftsOf(emp, from, to) { return this.shifts(from, to, emp); },
    async saveShifts(list) {
      const ins = list.filter(s => !s.id);
      if (ins.length) ok(await sb.from('shifts').insert(ins));
      for (const s of list.filter(s => s.id)) { const { id, ...rest } = s; ok(await sb.from('shifts').update(rest).eq('id', id)); }
    },
    async deleteShift(id) { ok(await sb.from('shifts').delete().eq('id', id)); },
    async publish(from, to) { ok(await sb.rpc('publish_week', { p_from: from, p_to: to })); },
    async bulkShifts(ids, action) { const { data, error } = await sb.rpc('shifts_bulk', { p_ids: ids, p_action: action }); if (error) throw error; return data; },
    // --- prikbord
    async announcements() {
      const [list, reads] = await Promise.all([
        sb.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(60),
        sb.from('announcement_reads').select('*')]);
      return { list: ok(list), reads: ok(reads) };
    },
    async saveAnnouncement(a) {
      const { id, ...rest } = a;
      if (id) ok(await sb.from('announcements').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id));
      else ok(await sb.from('announcements').insert({ ...rest, created_by: S.me.id }));
    },
    async deleteAnnouncement(id, path) {
      if (path) await sb.storage.from('mededelingen').remove([path]);
      ok(await sb.from('announcements').delete().eq('id', id));
    },
    async markAnnRead(id) {
      const { error } = await sb.from('announcement_reads').insert({ announcement_id: id, employee_id: S.me.id });
      if (error && error.code !== '23505') throw error;   // al gelezen = prima
    },
    async uploadAttachment(file) {
      if (file.size > 10e6) throw new Error('Het bestand is groter dan 10 MB.');
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
      const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from('mededelingen').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
      if (error) throw new Error('Uploaden mislukt: ' + error.message);
      return { path, name: file.name, type: file.type };
    },
    async attachmentUrl(path) { const { data } = await sb.storage.from('mededelingen').createSignedUrl(path, 3600); return data?.signedUrl || ''; },
    async attachmentBlob(path) { const { data, error } = await sb.storage.from('mededelingen').download(path); if (error) throw new Error('Bestand niet gevonden'); return data; },
    async deleteAttachment(path) { await sb.storage.from('mededelingen').remove([path]); },
    async renotifyAnnouncement(id) { const { error } = await sb.rpc('renotify_announcement', { p_id: id }); if (error) throw error; },
    async revenue(from, to) { if (!isMgr()) return []; return ok(await sb.from('revenue').select('*').gte('date', from).lte('date', to)); },
    async saveRevenue(date, patch) {
      const cur = ok(await sb.from('revenue').select('*').eq('date', date).maybeSingle()) || { date, forecast: null, actual: null };
      const next = { ...cur, ...patch, date, updated_at: new Date().toISOString() };
      if (next.forecast == null && next.actual == null) ok(await sb.from('revenue').delete().eq('date', date));
      else ok(await sb.from('revenue').upsert(next));
    },
    async dayInfo(from, to) { return ok(await sb.from('day_info').select('*').gte('date', from).lte('date', to)); },
    async saveDay(date, guests) {
      if (guests == null) ok(await sb.from('day_info').delete().eq('date', date));
      else ok(await sb.from('day_info').upsert({ date, guests, updated_at: new Date().toISOString() }));
    },
    async mailRoster(from, to, employee_ids, changed = false) {
      const { data, error } = await sb.functions.invoke('mail-rooster', { body: { from, to, employee_ids, changed, app_url: location.origin + location.pathname } });
      if (error) {
        let msg = error.message || 'Mailen mislukt';
        try { const b = await error.context.json(); if (b && b.error) msg = b.error; } catch (e) { /* geen JSON */ }
        if (/Failed to send a request|not found|404|FunctionsFetchError|FunctionsRelayError/i.test(msg)) msg = 'het mailen is nog niet ingesteld (Edge Function "mail-rooster")';
        throw new Error(msg);
      }
      return data;
    },
    async resetCalendarToken() { const { data, error } = await sb.rpc('reset_calendar_token'); if (error) throw error; return data; },
    async vapidKey() {
      if (CFG.vapidPublicKey) return CFG.vapidPublicKey;
      if (this._vapid) return this._vapid;
      const { data, error } = await sb.functions.invoke('send-push', { body: { action: 'public_key' } });
      if (error || !data?.publicKey) return '';
      return (this._vapid = data.publicKey);
    },
    async requests() { return ok(await sb.from('requests').select('*').order('created_at', { ascending: false })); },
    async saveRequest(r) { ok(await sb.from('requests').insert(r)); },
    async sickRecover(id) { const { error } = await sb.rpc('sick_recover', { p_id: id }); if (error) throw error; },
    // --- lijsten
    async checklists() { return ok(await sb.from('checklists').select('*').order('sort').order('name')); },
    async saveChecklist(c) {
      if (c.id) { const { id, ...rest } = c; ok(await sb.from('checklists').update(rest).eq('id', id)); }
      else ok(await sb.from('checklists').insert(c));
    },
    async deleteChecklist(id) { ok(await sb.from('checklists').delete().eq('id', id)); },
    async ticks(periods) { return periods.length ? ok(await sb.from('checklist_ticks').select('*').in('period', periods)) : []; },
    async ticksSince(from) {
      const out = [];
      for (let i = 0; ; i += 1000) { const part = ok(await sb.from('checklist_ticks').select('employee_id, at, flagged').gte('at', from).order('at').range(i, i + 999)); out.push(...part); if (part.length < 1000) break; }
      return out;
    },
    async tick(t) { ok(await sb.from('checklist_ticks').insert({ ...t, employee_id: S.me.id })); },
    async untick(id) { ok(await sb.from('checklist_ticks').delete().eq('id', id)); },
    async logs(from, to, openOnly) {
      let q = sb.from('log_entries').select('*').order('at', { ascending: false }).limit(300);
      if (openOnly) q = q.eq('kind', 'melding').is('resolved_at', null);
      return ok(await q.gte('at', new Date(from + 'T00:00:00').toISOString()).lt('at', new Date(iso(addDays(parse(to), 1)) + 'T00:00:00').toISOString()));
    },
    async addLog(kind, data) { ok(await sb.from('log_entries').insert({ kind, data, employee_id: S.me.id })); },
    async resolveLog(id, resolution) { ok(await sb.from('log_entries').update({ resolved_at: new Date().toISOString(), resolution }).eq('id', id)); },
    async decideRequest(id, status, note, hours) {
      const u = { status, manager_note: note || null, decided_at: new Date().toISOString() };
      if (hours !== undefined) u.leave_hours = hours;
      ok(await sb.from('requests').update(u).eq('id', id));
    },
    async deleteRequest(id) { ok(await sb.from('requests').delete().eq('id', id)); },
    // --- klokken
    async settings() { return ok(await sb.from('settings').select('*').eq('id', 1).maybeSingle()) || {}; },
    async saveSettings(st) { ok(await sb.from('settings').update({ ...st, updated_at: new Date().toISOString() }).eq('id', 1)); },
    async registerWifi() { return ok(await sb.rpc('register_wifi')); },
    // --- open diensten
    async applications() { return ok(await sb.from('shift_applications').select('*')); },
    async openApply(shiftId) { ok(await sb.rpc('open_apply', { p_shift: shiftId })); },
    async openWithdraw(shiftId) { ok(await sb.rpc('open_withdraw', { p_shift: shiftId })); },
    async openAssign(shiftId, emp) { ok(await sb.rpc('open_assign', { p_shift: shiftId, p_emp: emp })); },
    // --- ruilen
    async swaps() { return ok(await sb.from('swaps').select('*').order('created_at', { ascending: false })); },
    async swapOffer(o) { ok(await sb.rpc('swap_offer', { p_shift: o.shift_id, p_to: o.to_employee || null, p_swap_shift: o.swap_shift_id || null, p_note: o.note || null })); },
    async swapRespond(id, accept) { ok(await sb.rpc('swap_respond', { p_id: id, p_accept: accept })); },
    async swapDecide(id, approve, note) { ok(await sb.rpc('swap_decide', { p_id: id, p_approve: approve, p_note: note || null })); },
    async swapCancel(id) { ok(await sb.rpc('swap_cancel', { p_id: id })); },
    // --- beschikbaarheid
    async availability(from, to) { return ok(await sb.from('availability').select('*').gte('date', from).lte('date', to)); },
    async saveAvailability(rows) {
      const me = S.me.id;
      const del = rows.filter(r => !r.kind).map(r => r.date);
      if (del.length) ok(await sb.from('availability').delete().eq('employee_id', me).in('date', del));
      const up = rows.filter(r => r.kind).map(r => ({ employee_id: me, date: r.date, kind: r.kind, note: r.note || null, updated_at: new Date().toISOString() }));
      if (up.length) ok(await sb.from('availability').upsert(up));
    },
    // --- meldingen
    async notifications() { return ok(await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(60)); },
    async markRead(ids) {
      let q = sb.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
      if (ids) q = q.in('id', ids);
      ok(await q);
    },
    async savePushSub(sub) { ok(await sb.from('push_subscriptions').upsert({ ...sub, employee_id: S.me.id })); },
    async entries(from, to) {
      return ok(await sb.from('time_entries').select('*').gte('clock_in', parse(from).toISOString()).lt('clock_in', addDays(parse(to), 1).toISOString()).order('clock_in'));
    },
    async openEntries() { return ok(await sb.from('time_entries').select('*').is('clock_out', null)); },
    async clock(action, pos, reason, overtime) {
      ok(await sb.rpc('clock', { p_action: action, p_lat: pos?.lat ?? null, p_lng: pos?.lng ?? null, p_accuracy: pos?.accuracy ?? null, p_reason: reason || null, p_overtime: overtime || null }));
    },
    async saveEntry(e) {
      const { id, ...rest } = e;
      if (id) ok(await sb.from('time_entries').update({ ...rest, edited: true }).eq('id', id));
      else ok(await sb.from('time_entries').insert({ ...rest, flags: ['handmatig'], edited: true }));
    },
    async deleteEntry(id) { ok(await sb.from('time_entries').delete().eq('id', id)); },
    async audit(rowId) { return ok(await sb.from('audit_log').select('*').eq('row_id', rowId).order('at', { ascending: false }).limit(50)); },
    async runJobs() { return ok(await sb.rpc('run_jobs')); },
    async setEntryStatus(id, status, note, ot) {
      const u = { status }; if (note !== undefined && note !== null) u.manager_note = note; if (ot) u.overtime_status = ot;
      ok(await sb.from('time_entries').update(u).eq('id', id));
    },
  };
}

/* ================= State ================= */
const S = {
  me: null, view: null,
  week: mondayOf(new Date()),
  month: todayIso().slice(0, 7),
  reqFilter: 'pending',
  pending: 0,
};
let store;
const isMgr = () => S.me?.role === 'manager';
const canPlan = () => S.me?.role === 'manager' || S.me?.role === 'planner';   // shiftleader mag plannen, ziet geen lonen
const KLOK_DELETE = 'Deze medewerker heeft kloktijden. Die horen bij de loonadministratie en moeten bewaard blijven. Zet de medewerker op inactief in plaats van te verwijderen.';
const CT = { vast: 'Vaste uren', minmax: 'Min-max', nuluren: 'Nuluren', oproep: 'Oproep', stage: 'Stage / BBL' };
const isFlex = e => ['nuluren', 'oproep'].includes(e?.contract_type);
const sortEmps = list => list.sort((a, b) => (a.role === 'manager' ? 0 : 1) - (b.role === 'manager' ? 0 : 1) || a.name.localeCompare(b.name, 'nl'));

/* ================= Dialog ================= */
function openDialog(title, body, { onSubmit, onReady } = {}) {
  const dlg = document.createElement('dialog');
  dlg.className = 'dlg';
  dlg.innerHTML = `<form class="dlg-form" novalidate><header><h2>${esc(title)}</h2><button type="button" class="x" data-close aria-label="Sluiten">×</button></header><div class="dlg-body">${body}</div></form>`;
  document.body.append(dlg);
  dlg.addEventListener('close', () => {
    const box = $('#toasts', dlg);
    if (box) (([...document.querySelectorAll('dialog[open]')].filter(d => d !== dlg).pop()) || document.body).append(box);
    dlg.remove();
  });
  $$('[data-close]', dlg).forEach(b => (b.onclick = () => dlg.close()));
  const form = $('form', dlg);
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const btn = ev.submitter;
    const action = btn?.value || 'save';
    if (form.dataset.busy) return;
    if (action !== 'delete' && !form.checkValidity()) { form.reportValidity(); return; }
    form.dataset.busy = '1';
    const label = btn ? btn.textContent : '';
    $$('button', form).forEach(b => (b.disabled = true));
    if (btn) btn.textContent = 'Bezig…';
    $('[data-dlgerr]', dlg)?.remove();
    try {
      const keep = await onSubmit(new FormData(form), action, dlg);
      if (keep !== false) dlg.close();
    } catch (e) {
      if (e !== 'cancel') {
        const box = document.createElement('div');
        box.className = 'msg err dlgerr'; box.dataset.dlgerr = ''; box.setAttribute('role', 'alert');
        box.textContent = errMsg(e);
        $('.dlg-body', dlg).prepend(box);
        box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    } finally {
      delete form.dataset.busy;
      if (btn) btn.textContent = label;
      $$('button', form).forEach(b => (b.disabled = false));
    }
  });
  dlg.showModal();
  onReady && onReady(dlg);
  return dlg;
}

function ask(msg, okLabel = 'Doorgaan') {
  return new Promise(res => {
    let yes = false;
    const dlg = openDialog('Weet je het zeker?', `<p style="margin:0">${esc(msg)}</p><div class="dlg-foot"><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">${esc(okLabel)}</button></div>`, { onSubmit() { yes = true; } });
    dlg.addEventListener('close', () => res(yes));
  });
}

/* ================= Auth screens ================= */
const LEGAL = `<nav class="legal"><a href="afspraken.html">Afspraken</a><span aria-hidden="true">·</span><a href="privacy.html">Privacy</a></nav>`;
function authPage(card) {
  const top = CFG.logoAuth ? `<div class="auth-brand"><img src="${esc(CFG.logoAuth)}" alt="${esc(CFG.bedrijf)}"><span>Rooster${location.hash === '#directie' ? ' · Directie' : location.hash === '#personeel' ? ' · Personeel' : ''}</span></div>` : '';
  return `<div class="auth"><div class="auth-wrap">${top}<div class="auth-card">${card}</div>${store && store.demo ? '' : LEGAL}</div></div>`;
}
const authLogo = () => (CFG.logoAuth ? '' : `<div class="logo big">${esc((CFG.bedrijf || CFG.appName).charAt(0))}</div>`);
async function renderAuth(mode = 'login', msg = '') {
  const name = esc(CFG.appName);
  const letter = esc((CFG.bedrijf || CFG.appName).charAt(0));
  let inner = '';
  if (store.demo) {
    const h = (location.hash || '').slice(1);
    const users = (await store.demoUsers()).filter(u => h === 'directie' ? u.role === 'manager' : h === 'personeel' ? u.role !== 'manager' : true);
    inner = `<div class="demo-box">
      <p><strong>Demo-modus.</strong> Er is nog geen database gekoppeld; alles blijft in deze browser. Kies als wie je wilt inloggen:</p>
      <div class="demo-list">${users.map(u => `<button class="btn" data-demo="${u.id}"><span class="dot" style="background:${esc(u.color)};margin:0"></span>${esc(u.name)} <span class="muted small">· ${u.role === 'manager' ? 'leidinggevende' : esc(u.position || 'medewerker')}</span></button>`).join('')}</div>
      <p style="margin:12px 0 0"><button class="linkbtn small" data-reset>Demo-gegevens opnieuw beginnen</button></p>
    </div>`;
  } else {
    const titles = { login: 'Log in om je rooster te bekijken.', signup: 'Eerste keer? Maak je account aan met het e-mailadres dat bij je werkgever bekend is.', forgot: 'Vul je e-mailadres in; je ontvangt een link om een nieuw wachtwoord in te stellen.' };
    inner = `<p class="hint" style="margin-bottom:16px">${titles[mode]}</p>
      ${msg}
      <form class="stack" id="authform">
        <label class="field">E-mailadres<input name="email" type="email" autocomplete="email" required></label>
        ${mode !== 'forgot' ? `<label class="field">Wachtwoord<input name="password" type="password" minlength="8" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" required></label>` : ''}
        <button class="btn primary block" type="submit">${{ login: 'Inloggen', signup: 'Account aanmaken', forgot: 'Stuur herstellink' }[mode]}</button>
      </form>
      <div class="auth-links">
        ${mode === 'login' ? '<button class="linkbtn" data-mode="signup">Eerste keer inloggen</button><button class="linkbtn" data-mode="forgot">Wachtwoord vergeten?</button>' : '<button class="linkbtn" data-mode="login">← Terug naar inloggen</button>'}
      </div>`;
  }
  app.innerHTML = authPage(`${authLogo()}<h1>${CFG.logoAuth ? (mode === 'signup' ? 'Account activeren' : mode === 'forgot' ? 'Wachtwoord vergeten' : 'Welkom') : name}</h1>${store.demo ? '<p>Roosters, verlof en beschikbaarheid op één plek.</p>' : '<p></p>'}${inner}`);
  void letter;

  $$('[data-demo]', app).forEach(b => (b.onclick = async () => handleSession(await store.demoLogin(b.dataset.demo))));
  const reset = $('[data-reset]', app);
  if (reset) reset.onclick = async () => { await store.resetDemo(); toast('Demo-gegevens zijn teruggezet'); renderAuth(); };
  $$('[data-mode]', app).forEach(b => (b.onclick = () => renderAuth(b.dataset.mode)));
  const form = $('#authform', app);
  if (form) form.onsubmit = async ev => {
    ev.preventDefault();
    const fd = new FormData(form);
    const btn = $('button[type=submit]', form); btn.disabled = true;
    try {
      if (mode === 'login') { await store.signIn(fd.get('email'), fd.get('password')); handleSession(await store.init()); }
      else if (mode === 'signup') {
        const r = await store.signUp(fd.get('email'), fd.get('password'));
        if (r && r.session) handleSession(await store.init());
        else renderAuth('login', '<div class="msg ok">Bijna klaar! Klik op de bevestigingslink in je mail en log daarna hier in.</div>');
      } else {
        await store.resetPassword(fd.get('email'));
        renderAuth('login', '<div class="msg ok">Check je mail voor de link om je wachtwoord opnieuw in te stellen.</div>');
      }
    } catch (e) {
      renderAuth(mode, `<div class="msg err">${esc(errMsg(e))}</div>`);
    }
  };
}

function renderNewPassword(kind = 'recovery') {
  const welcome = kind === 'invite';
  app.innerHTML = authPage(`${authLogo()}<h1>${welcome ? 'Welkom!' : 'Nieuw wachtwoord'}</h1><p>${welcome ? 'Je bent uitgenodigd voor het rooster. Kies een wachtwoord (minimaal 8 tekens); daarmee log je voortaan in.' : 'Kies een nieuw wachtwoord van minimaal 8 tekens.'}</p>
    <form class="stack" id="pwform"><label class="field">${welcome ? 'Kies je wachtwoord' : 'Nieuw wachtwoord'}<input name="password" type="password" minlength="8" autocomplete="new-password" required></label>
    <button class="btn primary block">${welcome ? 'Wachtwoord opslaan en beginnen' : 'Opslaan'}</button></form>
    ${welcome ? '<p class="hint" style="margin-top:14px">Tip: zet de app daarna op je beginscherm (iPhone: deelknop → Zet op beginscherm).</p>' : ''}`);
  $('#pwform').onsubmit = async ev => {
    ev.preventDefault();
    try {
      await store.updatePassword(new FormData(ev.target).get('password'));
      history.replaceState(null, '', location.pathname);
      toast(welcome ? 'Welkom! Je account is klaar' : 'Wachtwoord gewijzigd');
      handleSession(await store.init());
    } catch (e) { toast(errMsg(e), 'error'); }
  };
}

function renderUnlinked(email) {
  app.innerHTML = authPage(`${authLogo()}<h1>Bijna zover</h1>
    <p>Je bent ingelogd als <strong>${esc(email)}</strong>, maar dit e-mailadres staat nog niet in het team van ${esc(CFG.bedrijf || 'het bedrijf')}.</p>
    <p class="hint">Vraag je leidinggevende om je toe te voegen met precies dit e-mailadres. Daarna kun je opnieuw inloggen.</p>
    <div class="stack" style="margin-top:18px"><button class="btn primary" data-retry>Opnieuw proberen</button><button class="btn" data-out>Uitloggen</button></div>`);
  $('[data-retry]').onclick = async () => handleSession(await store.init());
  $('[data-out]').onclick = signOut;
}

async function signOut() { clearInterval(S.poll); await store.signOut(); S.me = null; S.lDate = S.lDep = S.lOpen = S.lKey = null; renderAuth(); }

// Controleert of de eigen rol of status is gewijzigd (bv. shiftleader → medewerker, of uit dienst).
// De database weigert ongeoorloofde acties al direct; dit zorgt dat ook het scherm meteen klopt.
let meCheckedAt = 0;
async function checkMe(force = false) {
  if (!S.me || (!force && Date.now() - meCheckedAt < 15000)) return true;
  meCheckedAt = Date.now();
  let r; try { r = await store.init(); } catch (e) { return true; }   // geen verbinding: niets doen
  const emp = r && r.employee;
  if (!emp || emp.active === false) { await signOut(); toast('Je account is niet meer actief. Je bent uitgelogd.', 'error'); return false; }
  if (emp.role !== S.me.role) {
    S.me = emp; S.view = isMgr() ? 'overzicht' : canPlan() ? 'planning' : 'mijn';
    renderShell(); toast('Je rechten zijn gewijzigd'); return false;
  }
  Object.assign(S.me, emp); return true;
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.me) checkMe(true); });

// Standaardwaarden uit config.js; de directie kan ze overschrijven op de pagina Instellingen
const CFG_DEFAULTS = { posities: [...(CFG.posities || [])], diensten: (CFG.diensten || []).map(d => ({ ...d })), toeslagen: { ...(CFG.toeslagen || {}) } };
function applySettings(st) {
  if (!st) return;
  CFG.posities = Array.isArray(st.positions) && st.positions.length ? st.positions : CFG_DEFAULTS.posities;
  CFG.diensten = Array.isArray(st.shift_templates) ? st.shift_templates : CFG_DEFAULTS.diensten;
  CFG.toeslagen = Object.assign({}, CFG_DEFAULTS.toeslagen, st.toeslag_windows || {});
  CFG.specialDays = Array.isArray(st.special_days) ? st.special_days : [];
  CFG.swapNeedsApproval = st.swap_needs_approval !== false;
  CFG.costSt = st;
  CFG.sickName = st.sick_contact || ''; CFG.sickPhone = st.sick_phone || '';   // voor de kosten per dienst in het inplanvenster
}
async function handleSession(r) {
  if (!r) return renderAuth();
  if (r.unlinked) return renderUnlinked(r.email);
  S.me = r.employee;
  try { applySettings(await store.settings()); } catch (e) { /* standaardwaarden blijven gelden */ }
  S.view = isMgr() ? 'overzicht' : canPlan() ? 'planning' : 'mijn';
  const hv = location.hash.slice(1).split(':');
  if (tabsFor().some(([k]) => k === hv[0]) || hv[0] === 'lijsten' || (isMgr() && hv[0] === 'instellingen')) { S.view = hv[0]; if (hv[1]) S.reqTab = hv[1]; }
  renderShell();
}

/* ================= Shell ================= */
function tabsFor() {
  return isMgr()
    ? [['overzicht', 'Overzicht'], ['planning', 'Planning'], ['klokken', 'Klokken'], ['lijsten', 'Lijsten'], ['aanvragen', 'Aanvragen'], ['team', 'Team'], ['uren', 'Uren & export']]
    : [['mijn', 'Mijn rooster'], ['planning', canPlan() ? 'Planning' : 'Team'], ['diensten', 'Diensten'], ['beschikbaar', 'Beschikbaar'], ['aanvragen', 'Verlof']];
}

function renderShell() {
  window.scrollTo(0, 0);
  const letter = esc((CFG.bedrijf || CFG.appName).charAt(0));
  app.innerHTML = `
    ${store.demo ? '<div class="demo-banner">Demo-modus<span class="hide-sm"> · gegevens worden alleen in deze browser bewaard</span></div>' : ''}
    <header class="topbar"><div class="topbar-inner">
      <div class="brand">${CFG.logo ? `<div class="stack-brand"><img class="wordmark light" src="${esc(CFG.logo)}" alt="${esc(CFG.bedrijf)}"><img class="wordmark dark" src="${esc(CFG.logoDark || CFG.logo)}" alt="${esc(CFG.bedrijf)}"><div class="sub">Rooster · ${isMgr() ? 'Leiding' : S.me.role === 'planner' ? 'Shiftleader' : esc(S.me.position || 'Team')}</div></div>` : `<div class="logo">${letter}</div><div><strong>${esc(CFG.appName)}</strong><small>${isMgr() ? 'Leidinggevende' : esc(S.me.position || 'Medewerker')}</small></div>`}</div>
      <nav class="tabs" aria-label="Hoofdmenu">${tabsFor().map(([k, l]) => `<button class="tab" data-tab="${k}">${ICON[k === 'planning' && !canPlan() ? 'team' : k] || ''}<span class="tl">${l}</span><span class="ts">${l === 'Uren & export' ? 'Uren' : l === 'Mijn rooster' ? 'Rooster' : l}</span>${(isMgr() ? k === 'aanvragen' : k === 'diensten') ? '<span class="count hidden" data-count></span>' : ''}</button>`).join('')}</nav>
      <div class="userbox"><div class="who"><strong>${esc(S.me.name)}</strong><small>${esc(S.me.email)}</small></div><button class="btn ghost icon bell" data-bell title="Meldingen" aria-label="Meldingen">${ICON.bell}<span class="ncount hidden" data-ncount></span></button>${isMgr() ? `<button class="btn ghost icon" data-gosettings title="Instellingen" aria-label="Instellingen">${ICON.settings}</button>` : ''}<button class="btn ghost icon" data-logout title="Uitloggen" aria-label="Uitloggen">${ICON.logout}</button></div>
    </div></header>
    <main id="view"></main>
    ${store.demo ? '' : `<footer class="app-foot">${LEGAL}</footer>`}`;
  $$('[data-tab]').forEach(b => (b.onclick = () => go(b.dataset.tab)));
  const gs = $('[data-gosettings]'); if (gs) gs.onclick = () => go('instellingen');
  $('[data-logout]').onclick = signOut;
  $('[data-bell]').onclick = notifPanel;
  clearInterval(S.poll); S.poll = setInterval(refreshBadge, 60000);
  go(S.view);
}

async function refreshBadge() {
  if (!S.me) return;
  try {
    await maybeRunJobs();
    const notes = await store.notifications();
    const unread = notes.filter(n => !n.read_at).length;
    const nc = $('[data-ncount]');
    if (nc) { nc.textContent = unread > 9 ? '9+' : unread; nc.classList.toggle('hidden', !unread); }
    let n;
    if (isMgr()) { const c = await mgrCounts(); n = c.verlof + c.ruilen + c.open; }
    else {
      const today = todayIso();
      const [sw, sh, apps] = await Promise.all([store.swaps(), store.shifts(today, iso(addDays(new Date(), 90))), store.applications()]);
      const mineDates = new Set(sh.filter(s => s.employee_id === S.me.id).map(s => s.date));
      n = sw.filter(w => w.status === 'open' && w.from_employee !== S.me.id && (!w.to_employee || w.to_employee === S.me.id)).length
        + sh.filter(s => !s.employee_id && s.published && !apps.some(a => a.shift_id === s.id) && !mineDates.has(s.date)).length;
    }
    S.pending = n;
    const c = $('[data-count]');
    if (c) { c.textContent = n; c.classList.toggle('hidden', !n); }
  } catch (e) { /* ignore */ }
}

// Automatische taken (vergeten uit te klokken, herinneringen) max. 1× per 2 minuten vanuit de app
async function maybeRunJobs() {
  if (S.jobsAt && Date.now() - S.jobsAt < 120000) return;
  S.jobsAt = Date.now();
  try { await store.runJobs(); } catch (e) { /* niet kritiek: de database doet dit ook elke 15 min */ }
}

async function go(view) {
  clearInterval(S.timer);
  if (!(await checkMe())) return;
  await maybeRunJobs();
  if (S.view !== view) window.scrollTo(0, 0);
  S.view = view;
  $$('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === view));
  $('[data-gosettings]')?.classList.toggle('active', view === 'instellingen');
  const el = $('#view');
  el.onclick = null; el.onchange = null; el.ontouchstart = null; el.ontouchend = null;
  try {
    if (view === 'planning') await viewWeek(el, canPlan());
    else if (view === 'mijn') await viewMine(el);
    else if (view === 'aanvragen') await (isMgr() ? viewRequestsMgr(el) : viewRequestsStaff(el));
    else if (view === 'team') await viewTeam(el);
    else if (view === 'uren') await viewHours(el);
    else if (view === 'klokken') await viewClockMgr(el);
    else if (view === 'diensten') await viewDiensten(el);
    else if (view === 'beschikbaar') await viewBeschikbaar(el);
    else if (view === 'lijsten') await viewLijsten(el);
    else if (view === 'instellingen' && isMgr()) await viewSettings(el);
    else if (view === 'overzicht' && isMgr()) await viewDashboard(el);
  } catch (e) {
    console.error(e);
    el.innerHTML = `<div class="card pad"><p class="msg err">Er ging iets mis bij het laden: ${esc(errMsg(e))}</p><button class="btn" onclick="location.reload()">Opnieuw laden</button></div>`;
  }
  refreshBadge();
}
const rerender = () => go(S.view);

/* ================= Week planning ================= */
const MQ = window.matchMedia('(max-width: 760px)');
const isMobile = () => MQ.matches;
try { MQ.addEventListener('change', () => { if (S.me && S.view === 'planning') rerender(); }); } catch (e) { /* oude browsers */ }
function weekLabel(mon) {
  const sun = addDays(mon, 6);
  const sameMonth = mon.getMonth() === sun.getMonth();
  return {
    title: `Week ${weekNr(mon)}`,
    sub: sameMonth ? `${mon.getDate()} – ${fmt(sun, { day: 'numeric', month: 'long', year: 'numeric' })}` : `${fmt(mon, { day: 'numeric', month: 'short' })} – ${fmt(sun, { day: 'numeric', month: 'short', year: 'numeric' })}`,
  };
}

async function viewWeek(el, editable) {
  const from = iso(S.week), to = iso(addDays(S.week, 6));
  const [emps0, shifts, reqs, avail, apps, privList, stW, around, dayRows, revRows] = await Promise.all([store.employees(), store.shifts(from, to), store.requests(), canPlan() ? store.availability(from, to) : Promise.resolve([]), store.applications(),
    isMgr() ? store.privates() : Promise.resolve([]), canPlan() ? store.settings() : Promise.resolve({}), canPlan() ? store.shifts(iso(addDays(S.week, -1)), iso(addDays(S.week, 7))) : Promise.resolve([]), canPlan() ? store.dayInfo(from, to) : Promise.resolve([]), isMgr() ? store.revenue(from, to) : Promise.resolve([])]);
  const emps = sortEmps(emps0);
  const privs = Object.fromEntries(privList.map(p => [p.employee_id, p]));
  // Arbeidstijdenwet-signalen per dienst (directie)
  const atw = {};
  if (canPlan()) emps.forEach(e => Object.assign(atw, atwIssues(around.filter(x => x.employee_id === e.id), privs[e.id]?.birth_date)));
  // Contract- en sluitingssignalen
  if (canPlan()) {
    const addW = (x, m) => { (atw[x.id] ||= []); if (!atw[x.id].includes(m)) atw[x.id].push(m); };
    const now = Date.now();
    shifts.forEach(x => {
      const e = emps.find(y => y.id === x.employee_id);
      const cl = specialDay(x.date);
      if (cl?.kind === 'gesloten') addW(x, `${CFG.bedrijf} is gesloten (${cl.label})`);
      else if (hm(x.end_time) <= hm(x.start_time) && hm(x.end_time) > '00:00') { const nx = specialDay(iso(addDays(parse(x.date), 1))); if (nx?.kind === 'gesloten') addW(x, `loopt door tot in een gesloten dag (${nx.label})`); }
      const lvA = reqs.find(r => r.status === 'approved' && r.employee_id === x.employee_id && r.start_date <= x.date && r.end_date >= x.date);
      if (lvA) addW(x, `heeft ${REQ[lvA.type].toLowerCase()} (goedgekeurd)`);
      if (!e) return;
      if (e.contract_end && x.date > e.contract_end) addW(x, `na einde contract (${fmtShort(e.contract_end)})`);
      if (isFlex(e)) {
        const start = shiftWindow(x)[0].getTime();
        if (!x.published && start > now && start - now < 4 * 864e5) addW(x, 'oproep minder dan 4 dagen vooraf: de medewerker mag weigeren');
        if (shiftHours(x) + (Number(x.break_minutes) || 0) / 60 < 3) addW(x, 'oproep korter dan 3 uur: je betaalt minimaal 3 uur loon');
      }
    });
  }
  const costDay = ds => shifts.filter(x => x.date === ds && x.employee_id).reduce((t, x) => { const c = costOf(x, Number(privs[x.employee_id]?.hourly_wage), stW); return t + (c ? loonkosten(c.bruto, stW).totaal : 0); }, 0);
  const hasWages = privList.some(p => p.hourly_wage);
  const avMap = {}; avail.forEach(a => (avMap[a.employee_id + a.date] = a));
  const avHTML = (emp, ds) => { const a = avMap[emp + ds]; return a ? `<span class="av av-${a.kind}" title="${esc(AVAIL[a.kind])}${a.note ? ': ' + esc(a.note) : ''}">${AVAIL_SHORT[a.kind]}</span>` : ''; };
  const openShifts = shifts.filter(s => !s.employee_id);
  const people = emps.filter(e => e.active !== false || shifts.some(s => s.employee_id === e.id));
  const days = [...Array(7)].map((_, i) => addDays(S.week, i));
  const today = todayIso();
  const concept = shifts.filter(s => !s.published).length;
  // Concepten in alle komende weken (voor "Alles publiceren")
  const future = editable ? (await store.shifts(iso(mondayOf(new Date())), iso(addDays(new Date(), 400)))).filter(s => !s.published) : [];
  const futureWeeks = [...new Set(future.map(s => iso(mondayOf(parse(s.date)))))].sort();
  const elsewhere = future.filter(s => s.date < from || s.date > to).length;
  const leaves = reqs.filter(r => r.status !== 'rejected' && overlaps(r.start_date, r.end_date, from, to));
  const wl = weekLabel(S.week);
  // Bezetting: vaste norm per weekdag, eventueel verhoogd op basis van verwachte gasten
  const dayMap = Object.fromEntries((dayRows || []).map(r => [r.date, r]));
  const ratios = stW.guest_ratios || {}, staffing = stW.staffing || {};
  const guestMode = editable && Object.values(ratios).some(v => Number(v) > 0);
  const needOf = ds => {
    const base = staffing[dayIdx(parse(ds))] || {}, g = Number(dayMap[ds]?.guests) || 0, out = {};
    CFG.posities.forEach(p => { let n = Number(base[p]) || 0; const r = Number(ratios[p]) || 0; if (g && r) n = Math.max(n, Math.ceil(g / r)); if (n) out[p] = n; });
    return out;
  };
  const haveOf = (ds, p) => shifts.filter(x => x.date === ds && x.employee_id && x.position === p).length;
  const covOn = editable && (guestMode || Object.values(staffing).some(o => Object.values(o || {}).some(n => Number(n) > 0)) || (CFG.specialDays || []).some(x => x.kind === 'gesloten' && x.date >= from && x.date <= to));
  const covHTML = ds => {
    const sp = specialDay(ds);
    if (sp?.kind === 'gesloten') return `<span class="covp closed">Gesloten · ${esc(sp.label)}</span>`;
    const need = needOf(ds);
    return `${guestMode ? `<label class="guests" title="Verwachte gasten (optioneel)">Gasten<input type="number" min="0" step="5" inputmode="numeric" data-guests="${ds}" value="${dayMap[ds]?.guests ?? ''}" placeholder="–"></label>` : ''}${Object.entries(need).map(([p, n]) => { const h = haveOf(ds, p); return `<span class="covp ${h >= n ? 'ok' : 'short'}" title="${h} van ${n} ingepland">${esc(p)} ${h}/${n}</span>`; }).join('')}`;
  };
  // Directie: verwachte omzet en personeelskosten per dag, gekleurd tegen het doel
  const revMap = Object.fromEntries((revRows || []).map(r => [r.date, r]));
  const moneyOn = editable && isMgr();
  const moneyHTML = (ds, big) => {
    const r = revMap[ds] || {}, omzet = Number(r.forecast) || 0;
    const k = kpiOf(shifts.filter(x => x.date === ds && x.employee_id), privs, stW, omzet);
    const col = goalColor('pct', k.pct, stW);
    return `<div class="money ${big ? 'big' : ''}"><span class="mk" title="Personeelskosten van deze dag">Kosten ${k.cost ? euro0(k.cost) : '€ 0'}${k.pct != null ? ` <b class="kp ${col}">${pct1(k.pct)}</b>` : ''}</span>
      <label class="rev" title="Optioneel: verwachte omzet, dan zie je de kosten als % van de omzet">omzet<input type="number" min="0" step="50" inputmode="numeric" data-rev="${ds}" value="${r.forecast ?? ''}" placeholder="optioneel"></label></div>`;
  };
  const byCell = {};
  shifts.forEach(s => (byCell[s.employee_id + s.date] ||= []).push(s));

  const rows = people.map(e => {
    const mine = shifts.filter(s => s.employee_id === e.id);
    const hours = mine.reduce((t, s) => t + shiftHours(s), 0);
    const ct = e.contract_type || 'vast', max = Number(e.contract_hours) || 0, min = Number(e.contract_min_hours) || 0;
    const over = !isFlex(e) && max && hours > max + 0.01;
    const under = editable && ct === 'minmax' && min && hours < min - 0.01;
    const ctTxt = !editable ? '' : isFlex(e) ? ` · ${CT[ct].toLowerCase()}` : ct === 'minmax' && max ? ` / ${fmtH(min)}–${fmtH(max)} u` : max ? ` / ${fmtH(max)} u` : '';
    const cells = days.map(d => {
      const ds = iso(d);
      const lv = leaves.filter(r => r.employee_id === e.id && r.start_date <= ds && r.end_date >= ds)
        .map(r => `<span class="leave ${r.status === 'pending' ? 'pending' : ''}" title="${esc(STATUS[r.status])}">${esc(REQ[r.type])}${r.status === 'pending' ? ' ?' : ''}</span>`).join('');
      const chips = (byCell[e.id + ds] || []).map(s => {
        const tag = editable ? 'button' : 'div';
        const w = atw[s.id];
        return `<${tag} class="chip ${s.published ? '' : 'concept'} ${w ? 'atw' : ''}" style="--c:${esc(e.color || COLORS[0])}" ${editable ? `data-shift="${s.id}"` : ''} title="${w ? esc('⚠ ' + w.join('\n⚠ ')) : s.note ? esc(s.note) : ''}"><b>${w ? '⚠ ' : ''}${hm(s.start_time)}–${hm(s.end_time)}</b><small>${esc(s.position || '')}${s.published ? '' : ' · concept'}</small></${tag}>`;
      }).join('');
      return `<td class="cell ${editable ? 'editable' : ''} ${ds === today ? 'today' : ''}" data-emp="${e.id}" data-date="${ds}">${editable ? avHTML(e.id, ds) : ''}${lv}${chips}${editable ? '<button class="add" data-add aria-label="Dienst toevoegen">+</button>' : ''}</td>`;
    }).join('');
    return `<tr class="${e.id === S.me.id ? 'me' : ''}"><th class="who"><div class="who-inner"><span class="dot" style="background:${esc(e.color || COLORS[0])}"></span><div><strong>${esc(e.name)}</strong><small class="${over || under ? 'over' : ''}">${fmtH(hours)} u${ctTxt}${over ? ' · boven contract' : under ? ' · onder minimum' : ''}</small></div></div></th>${cells}</tr>`;
  }).join('');

  const openRow = openShifts.length || editable ? `<tr class="openrow"><th class="who"><div class="who-inner"><span class="dot" style="background:#a8988f"></span><div><strong>Open diensten</strong><small>${openShifts.length ? openShifts.length + ' open' : 'team kan zich aanmelden'}</small></div></div></th>${days.map(d => {
    const ds = iso(d);
    const chips = openShifts.filter(s => s.date === ds).map(s => {
      const n = apps.filter(a => a.shift_id === s.id && a.status === 'pending').length;
      const mineApp = apps.find(a => a.shift_id === s.id && a.employee_id === S.me.id);
      return editable
        ? `<button class="chip open ${s.published ? '' : 'concept'}" data-shift="${s.id}"><b>${hm(s.start_time)}–${hm(s.end_time)}</b><small>${esc(s.position || 'Open')} · ${n} aanmelding${n === 1 ? '' : 'en'}</small></button>`
        : `<button class="chip open" data-goopen><b>${hm(s.start_time)}–${hm(s.end_time)}</b><small>${esc(s.position || 'Open')} · ${mineApp ? 'aangemeld' : 'meld je aan'}</small></button>`;
    }).join('');
    return `<td class="cell ${editable ? 'editable' : ''} ${ds === today ? 'today' : ''}" data-emp="" data-date="${ds}">${chips}${editable ? '<button class="add" data-add aria-label="Open dienst toevoegen">+</button>' : ''}</td>`;
  }).join('')}</tr>` : '';

  const foot = days.map(d => {
    const ds = iso(d);
    const list = shifts.filter(s => s.date === ds);
    const h = list.reduce((t, s) => t + shiftHours(s), 0);
    const k = editable && hasWages ? costDay(ds) : 0;
    return `<td>${list.length ? `${new Set(list.filter(s => s.employee_id).map(s => s.employee_id)).size} pers · ${fmtH(h)} u${k ? `<br><span class="cost">${euro(k)}</span>` : ''}` : '—'}</td>`;
  }).join('');
  const totalH = shifts.reduce((t, s) => t + shiftHours(s), 0);
  const totalK = editable && hasWages ? days.reduce((t, d) => t + costDay(iso(d)), 0) : 0;
  const mobile = isMobile();
  if (S.dayWeek !== from) { S.dayWeek = from; const ti = days.findIndex(d => iso(d) === today); S.dayI = S.dayNext ?? (ti >= 0 ? ti : 0); }
  S.dayNext = undefined;
  const byId = Object.fromEntries(emps.map(e => [e.id, e]));
  if (!S.planView) { try { S.planView = localStorage.getItem('rooster-planview') || 'grid'; } catch (x) { S.planView = 'grid'; } }
  const listView = editable && S.planView === 'list';
  S.sel ||= new Set();
  const listHTML = () => days.map((d, i) => {
    const ds = iso(d), sp = specialDay(ds), fd = feestdag(ds);
    const list = shifts.filter(x => x.date === ds).sort((a, b) => hm(a.start_time).localeCompare(hm(b.start_time)) || (byId[a.employee_id]?.name || '').localeCompare(byId[b.employee_id]?.name || ''));
    const lv = leaves.filter(r => r.start_date <= ds && r.end_date >= ds);
    const h = list.reduce((t, x) => t + shiftHours(x), 0);
    const rowsL = list.map(x => {
      const isOpen = !x.employee_id, e = byId[x.employee_id] || (isOpen ? { name: 'Open dienst', color: '#a8988f' } : {}), w = atw[x.id];
      return `<button type="button" class="prow ${x.published ? '' : 'concept'} ${w ? 'atw' : ''} ${isOpen ? 'open' : ''}" data-shift="${x.id}" style="--c:${esc(e.color || COLORS[0])}" title="${w ? esc('⚠ ' + w.join('\n⚠ ')) : ''}">
        <span class="pcheck" aria-hidden="true"></span>
        <span class="ptime">${hm(x.start_time)}–${hm(x.end_time)}</span>
        <span class="pwho"><strong>${esc(e.name || '?')}</strong><small>${esc(x.position || '')}${x.position ? ' · ' : ''}${fmtH(shiftHours(x))} u${x.published ? '' : ' · concept'}${w ? ` · <span class="pwarn">⚠ ${esc(w[0])}</span>` : ''}</small></span>
        <span class="chev" aria-hidden="true">›</span></button>`;
    }).join('');
    return `<section class="pday ${ds === today ? 'today' : ''}">
      <div class="pday-head"><h3>${esc(fmtLong(ds).replace(/^./, c => c.toUpperCase()))}${fd ? ` <span class="fdtag">${esc(fd)}</span>` : ''}</h3><span class="muted small">${list.length ? `${new Set(list.filter(x => x.employee_id).map(x => x.employee_id)).size} pers · ${fmtH(h)} u` : ''}</span></div>
      ${covOn && !(sp?.kind === 'gesloten') ? `<div class="cov">${covHTML(ds)}</div>` : sp?.kind === 'gesloten' ? `<div class="cov">${covHTML(ds)}</div>` : ''}
      ${lv.length ? `<div class="mleaves">${lv.map(r => `<span class="leave ${r.status === 'pending' ? 'pending' : ''}">${esc(byId[r.employee_id]?.name || '')} · ${esc(REQ[r.type])}${r.status === 'pending' ? ' (aangevraagd)' : ''}</span>`).join('')}</div>` : ''}
      <div class="plist">${rowsL || '<p class="hint" style="margin:6px 2px">Nog niemand ingepland.</p>'}</div>
      <div class="pday-foot">${S.selMode ? (list.length ? `<button type="button" class="btn sm ghost" data-selday="${ds}">Hele dag selecteren</button>` : '') : `<button type="button" class="btn sm ghost" data-addon="${ds}">+ Dienst op ${DAG[i].toLowerCase()}</button>`}</div>
    </section>`;
  }).join('');
  const mobileHTML = () => {
    const di = S.dayI, ds = iso(days[di]);
    const list = shifts.filter(s => s.date === ds).sort((a, b) => hm(a.start_time).localeCompare(hm(b.start_time)) || (byId[a.employee_id]?.name || '').localeCompare(byId[b.employee_id]?.name || ''));
    const lv = leaves.filter(r => r.start_date <= ds && r.end_date >= ds);
    const h = list.reduce((t, s) => t + shiftHours(s), 0);
    const fd = feestdag(ds);
    const strip = days.map((d, i) => { const n = new Set(shifts.filter(s => s.date === iso(d)).map(s => s.employee_id)).size; const mineThere = shifts.some(s => s.date === iso(d) && s.employee_id === S.me.id);
      return `<button class="ds ${i === di ? 'on' : ''} ${iso(d) === today ? 'today' : ''}" data-day="${i}" aria-label="${fmtLong(iso(d))}"><span>${DAG[i]}</span><b>${d.getDate()}</b><i class="${mineThere && !editable ? 'mine' : ''}">${n || ''}</i></button>`; }).join('');
    const items = list.map(s => { const isOpen = !s.employee_id; const e = byId[s.employee_id] || (isOpen ? { name: 'Open dienst', color: '#a8988f' } : {}); const me = !isOpen && e.id === S.me.id; const tag = editable || isOpen ? 'button' : 'div';
      const nApps = isOpen ? apps.filter(a => a.shift_id === s.id && a.status === 'pending').length : 0;
      return `<${tag} class="mshift ${s.published ? '' : 'concept'} ${me ? 'me' : ''} ${isOpen ? 'open' : ''}" style="--c:${esc(e.color || COLORS[0])}" ${editable ? `data-shift="${s.id}"` : isOpen ? 'data-goopen' : ''}>
        <span class="mtime"><b>${hm(s.start_time)}</b><small>${hm(s.end_time)}</small></span>
        <span class="mwho"><strong>${esc(e.name || '?')}${me ? ' <em>jij</em>' : ''}</strong><small>${esc(s.position || '')}${s.position ? ' · ' : ''}${fmtH(shiftHours(s))} u${s.published ? '' : ' · concept'}${isOpen ? (editable ? ` · ${nApps} aanmelding${nApps === 1 ? '' : 'en'}` : ' · tik om je aan te melden') : ''}${s.note ? ' · ' + esc(s.note) : ''}</small></span>
        ${editable || isOpen ? '<span class="chev" aria-hidden="true">›</span>' : ''}</${tag}>`; }).join('');
    const availFree = editable ? avail.filter(a => a.date === ds && a.kind !== 'niet' && !list.some(s => s.employee_id === a.employee_id)) : [];
    const leaveHTML = lv.length ? `<div class="mleaves">${lv.map(r => `<span class="leave ${r.status === 'pending' ? 'pending' : ''}">${esc(byId[r.employee_id]?.name || '')} · ${esc(REQ[r.type])}${r.status === 'pending' ? ' (aangevraagd)' : ''}</span>`).join('')}</div>` : '';
    return `<div class="daystrip">${strip}</div>
      <div class="dayhead"><div><h2>${esc(fmtLong(ds).replace(/^./, c => c.toUpperCase()))}</h2>${fd ? `<span class="fdtag">${esc(fd)}</span>` : ''}</div><span>${list.length ? `${new Set(list.filter(s => s.employee_id).map(s => s.employee_id)).size} pers · ${fmtH(h)} u` : ''}</span></div>
      ${moneyOn ? moneyHTML(ds, true) : ''}
      ${covOn ? `<div class="cov mcov">${covHTML(ds)}</div>` : ''}
      ${leaveHTML}
      <div class="mlist">${items || `<div class="card empty">${editable ? 'Nog niemand ingepland.' : 'Geen diensten op deze dag.'}</div>`}</div>
      ${availFree.length ? `<p class="hint mavail">Beschikbaar, nog niet ingepland: ${availFree.map(a => `<strong>${esc((byId[a.employee_id]?.name || '').split(' ')[0])}</strong> (${AVAIL[a.kind].toLowerCase()})`).join(', ')}</p>` : ''}
      ${editable ? '<button class="btn primary block madd" data-addday>+ Dienst toevoegen</button>' : ''}
      <p class="hint swipehint">Veeg naar links of rechts voor een andere dag · week totaal ${fmtH(totalH)} u</p>`;
  };

  el.innerHTML = `
    <div class="print-title">${esc(CFG.appName)} · ${wl.title} · ${wl.sub}</div>
    <div class="page-head"><div><h1>${editable ? 'Planning' : 'Teamrooster'}</h1><p>${editable ? 'Plan diensten in en publiceer de week zodra hij klaar is.' : 'Het gepubliceerde rooster van het hele team.'}</p></div></div>
    <div class="toolbar">
      <div class="weeknav">
        <button class="btn icon" data-act="prev" aria-label="Vorige week">‹</button>
        <div class="label"><strong>${wl.title}</strong><span>${wl.sub}</span></div>
        <button class="btn icon" data-act="next" aria-label="Volgende week">›</button>
        <button class="btn ghost sm" data-act="today">Vandaag</button>
      </div>
      ${editable ? `<div class="actions">
        <button class="btn hide-sm" data-act="print">Afdrukken / PDF</button>
        <button class="btn" data-act="copy">Kopieer vorige week</button>
        <button class="btn primary" data-act="publish" ${concept ? '' : 'disabled'}>${concept ? `Publiceer ${concept} dienst${concept > 1 ? 'en' : ''}` : 'Week gepubliceerd ✓'}</button>
      </div>` : ''}
    </div>
    ${elsewhere ? `<div class="pubbar"><span>Nog <strong>${future.length} concept${future.length > 1 ? 'en' : ''}</strong> in ${futureWeeks.length} ${futureWeeks.length > 1 ? 'weken' : 'week'} (${futureWeeks.map(w => 'wk ' + weekNr(parse(w))).join(', ')})</span><button class="btn sm primary" data-act="publishall">Alles publiceren</button></div>` : ''}
    ${editable ? `<div class="viewbar"><div class="seg" role="group" aria-label="Weergave"><button type="button" class="${listView ? '' : 'on'}" data-pv="grid">Agenda</button><button type="button" class="${listView ? 'on' : ''}" data-pv="list">Lijst</button></div><button type="button" class="btn sm ${S.selMode ? 'primary' : ''}" data-selmode>${S.selMode ? 'Klaar met selecteren' : 'Selecteren'}</button><button type="button" class="btn sm" data-personpick>👤 Diensten per persoon</button></div>` : ''}
    ${S.selMode ? `<p class="hint selhint">Tik op diensten om ze te selecteren${listView ? ', of kies "Hele dag selecteren" onder een dag' : ''}. Met "Hele week" in de balk onderin selecteer je alles van deze week.</p>` : ''}
    ${editable && !mobile && !listView ? `<div class="legend"><span><i class="l-pub"></i>Gepubliceerd (zichtbaar voor team)</span><span><i class="l-con"></i>Concept (nog niet zichtbaar)</span><span><i class="l-leave"></i>Verlof</span><span><span class="av av-avond">✓ avond</span> <span class="av av-niet">✕ niet</span> doorgegeven beschikbaarheid</span></div>` : ''}
    ${people.length && listView ? listHTML() : ''}
    ${people.length && mobile && !listView ? mobileHTML() : ''}
    ${people.length && !mobile && !listView ? `<div class="grid-wrap"><table class="grid">
      <thead><tr><th class="who">Medewerker</th>${days.map(d => `<th class="${iso(d) === today ? 'today' : ''}" ${feestdag(iso(d)) ? `title="${esc(feestdag(iso(d)))}"` : ''}>${DAG[dayIdx(d)]}<b>${d.getDate()}</b>${feestdag(iso(d)) ? `<em class="fd">${esc(feestdag(iso(d)))}</em>` : ''}</th>`).join('')}</tr></thead>
      <tbody>${moneyOn ? `<tr class="moneyrow"><th class="who"><div class="who-inner"><div><strong>Personeelskosten</strong><small>${(revRows || []).some(r => r.forecast != null) ? (stW.goal_labor_pct ? `doel ${pct1(Number(stW.goal_labor_pct))} van de omzet` : 'kosten als % van verwachte omzet') : stW.goal_labor_pct ? `vul je omzet in, dan zie je het % (doel ${pct1(Number(stW.goal_labor_pct))})` : 'omzet invullen is optioneel'}</small></div></div></th>${days.map(d => `<td class="${iso(d) === today ? 'today' : ''}">${moneyHTML(iso(d))}</td>`).join('')}</tr>` : ''}${covOn ? `<tr class="covrow"><th class="who"><div class="who-inner"><div><strong>Bezetting</strong><small>ingepland / nodig</small></div></div></th>${days.map(d => `<td class="${iso(d) === today ? 'today' : ''}"><div class="cov">${covHTML(iso(d))}</div></td>`).join('')}</tr>` : ''}${openRow}${rows}</tbody>
      <tfoot><tr><th class="who">${fmtH(totalH)} u totaal${totalK ? `<br><span class="cost">${euro(totalK)} loonkosten</span>` : ''}</th>${foot}</tr></tfoot>
    </table></div>` : people.length ? '' : `<div class="card empty">Nog geen medewerkers. ${editable ? 'Voeg ze toe via <strong>Team</strong>.' : ''}</div>`}
    ${!editable && !shifts.length && people.length ? '<p class="hint" style="margin-top:12px">Voor deze week is nog geen rooster gepubliceerd.</p>' : ''}
    ${S.selMode ? `<div class="selbar"><span data-selcount>${S.sel.size} geselecteerd</span><button type="button" class="btn sm" data-selall>Hele week</button><button type="button" class="btn sm" data-selnone>Wissen</button><button type="button" class="btn sm danger" data-seldel ${S.sel.size ? '' : 'disabled'}>Verwijderen</button></div>` : ''}
  `;
  // geselecteerde diensten markeren
  const markSel = () => {
    $$('[data-shift]', el).forEach(b => b.classList.toggle('sel', S.sel.has(b.dataset.shift)));
    const c = $('[data-selcount]', el); if (c) c.textContent = `${S.sel.size} geselecteerd`;
    const d = $('[data-seldel]', el); if (d) d.disabled = !S.sel.size;
  };
  el.classList.toggle('selmode', !!S.selMode);
  if (S.selMode) markSel();

  el.onkeydown = ev => { if (ev.target.matches('[data-rev]')) S.lastKey = ev.key; };
  if (S.refocus && S.refocus.attr === 'data-rev') { const { date } = S.refocus; S.refocus = null; const ins = $$('[data-rev]', el); const i = ins.findIndex(x => x.dataset.rev === date); if (ins[i + 1]) ins[i + 1].focus(); }
  el.onchange = async ev => {
    const rv = ev.target.closest('[data-rev]');
    if (rv) {
      if (['Tab', 'Enter'].includes(S.lastKey)) S.refocus = { attr: 'data-rev', date: rv.dataset.rev }; S.lastKey = null;
      const v = rv.value.trim(); await store.saveRevenue(rv.dataset.rev, { forecast: v === '' ? null : Math.max(0, Number(v) || 0) }); return rerender();
    }
    const g = ev.target.closest('[data-guests]'); if (!g) return;
    const v = g.value.trim(); await store.saveDay(g.dataset.guests, v === '' ? null : Math.max(0, Math.round(Number(v)) || 0)); rerender();
  };
  el.onclick = async ev => {
    const act = ev.target.closest('[data-act]')?.dataset.act;
    if (act === 'prev') { S.week = addDays(S.week, -7); S.sel = new Set(); return rerender(); }
    if (act === 'next') { S.week = addDays(S.week, 7); S.sel = new Set(); return rerender(); }
    if (act === 'today') { S.week = mondayOf(new Date()); S.dayWeek = null; S.sel = new Set(); return rerender(); }
    const dayB = ev.target.closest('[data-day]'); if (dayB) { S.dayI = Number(dayB.dataset.day); return rerender(); }
    const pv = ev.target.closest('[data-pv]'); if (pv) { S.planView = pv.dataset.pv; try { localStorage.setItem('rooster-planview', S.planView); } catch (x) { /* geen opslag */ } return rerender(); }
    if (ev.target.closest('[data-personpick]')) return personPicker(people.filter(e => e.active !== false));
    if (ev.target.closest('[data-selmode]')) { S.selMode = !S.selMode; S.sel = new Set(); return rerender(); }
    if (S.selMode) {
      const sc = ev.target.closest('[data-shift]');
      if (sc) { const id = sc.dataset.shift; S.sel.has(id) ? S.sel.delete(id) : S.sel.add(id); return markSel(); }
      const sdy = ev.target.closest('[data-selday]'); if (sdy) { shifts.filter(x => x.date === sdy.dataset.selday).forEach(x => S.sel.add(x.id)); return markSel(); }
      if (ev.target.closest('[data-selall]')) { shifts.forEach(x => S.sel.add(x.id)); return markSel(); }
      if (ev.target.closest('[data-selnone]')) { S.sel.clear(); return markSel(); }
      if (ev.target.closest('[data-seldel]')) {
        const ids = [...S.sel].filter(id => shifts.some(x => x.id === id)); if (!ids.length) return;
        const pubN = shifts.filter(x => ids.includes(x.id) && x.published && x.employee_id).length;
        if (!await ask(`${ids.length} dienst${ids.length > 1 ? 'en' : ''} verwijderen?${pubN ? ` ${pubN} daarvan ${pubN > 1 ? 'zijn' : 'is'} al gepubliceerd; die medewerkers krijgen één melding.` : ''}`, 'Verwijderen')) return;
        try { await store.bulkShifts(ids, 'delete'); } catch (x) { return toast(errMsg(x), 'error'); }
        S.sel = new Set(); S.selMode = false; toast(`${ids.length} dienst${ids.length > 1 ? 'en' : ''} verwijderd`); return rerender();
      }
      if (ev.target.closest('[data-act]')) { /* weeknavigatie e.d. hieronder */ } else return;
    }
    const addOn = ev.target.closest('[data-addon]');
    if (addOn) {
      const ds = addOn.dataset.addon;
      const free = people.find(e => e.active !== false && !shifts.some(x => x.employee_id === e.id && x.date === ds)) || people[0];
      const t = CFG.diensten[0] || { start: '09:00', end: '17:00', pauze: 30 };
      return shiftDialog({ employee_id: free.id, date: ds, start_time: t.start, end_time: t.end, break_minutes: t.pauze || 0, position: free.position || '', note: '' }, emps, shifts, leaves, avail, apps, privs, around);
    }
    if (ev.target.closest('[data-goopen]')) return go('diensten');
    if (ev.target.closest('[data-addday]')) {
      const ds = iso(days[S.dayI]);
      const free = people.find(e => e.active !== false && !shifts.some(s => s.employee_id === e.id && s.date === ds)) || people[0];
      const t = CFG.diensten[0] || { start: '09:00', end: '17:00', pauze: 30 };
      return shiftDialog({ employee_id: free.id, date: ds, start_time: t.start, end_time: t.end, break_minutes: t.pauze || 0, position: free.position || '', note: '' }, emps, shifts, leaves, avail, apps, privs, around);
    }
    if (act === 'publish') {
      if (!await ask(`${concept} dienst(en) publiceren? Het team ziet ze daarna direct in hun rooster.`)) return;
      return publishWeek(from, to, shifts);
    }
    if (act === 'publishall') {
      if (!await ask(`${future.length} ${future.length === 1 ? 'dienst' : 'diensten'} in ${futureWeeks.length} ${futureWeeks.length > 1 ? 'weken' : 'week'} publiceren? Het team ziet ze daarna direct${stW.mail_on_publish !== false ? ', en wie nieuwe diensten heeft krijgt per week een mail' : ''}.`, 'Alles publiceren')) return;
      let sent = 0; const failed = [];
      for (const w of futureWeeks) {
        const wFrom = w, wTo = iso(addDays(parse(w), 6));
        const r = await publishWeek(wFrom, wTo, future.filter(x => x.date >= wFrom && x.date <= wTo), true);
        sent += r.sent || 0; if (r.failed) failed.push(...r.failed); if (r.error) failed.push(r.error);
      }
      rerender();
      if (failed.length) toast(`Gepubliceerd. Mails: ${sent} verstuurd; niet gelukt: ${failed.join('; ')}`, 'error');
      else toast(`${futureWeeks.length} ${futureWeeks.length > 1 ? 'weken' : 'week'} gepubliceerd${sent ? ` · ${sent} mail${sent > 1 ? 's' : ''} verstuurd` : ''}`);
      return;
    }
    if (act === 'copy') return copyWeek(shifts, emps, reqs);
    if (act === 'print') { try { window.print(); } catch (e) { toast('Afdrukken is hier niet beschikbaar', 'error'); } return; }
    const chip = ev.target.closest('[data-shift]');
    if (chip) return shiftDialog(shifts.find(s => s.id === chip.dataset.shift), emps, shifts, leaves, avail, apps, privs, around);
    const cell = ev.target.closest('td.cell.editable');
    if (cell && (ev.target.closest('[data-add]') || ev.target === cell)) {
      const e = emps.find(x => x.id === cell.dataset.emp);
      const t = CFG.diensten[0] || { start: '09:00', end: '17:00', pauze: 30 };
      return shiftDialog({ employee_id: e?.id || null, date: cell.dataset.date, start_time: t.start, end_time: t.end, break_minutes: t.pauze || 0, position: e?.position || '', note: '' }, emps, shifts, leaves, avail, apps, privs, around);
    }
  };
  if (mobile) {
    let x0 = null, y0 = null;
    el.ontouchstart = ev => { if (ev.target.closest('dialog')) return; x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; };
    el.ontouchend = ev => {
      if (x0 == null) return;
      const dx = ev.changedTouches[0].clientX - x0, dy = ev.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const dir = dx < 0 ? 1 : -1, n = S.dayI + dir;
      if (n < 0) { S.week = addDays(S.week, -7); S.dayNext = 6; }
      else if (n > 6) { S.week = addDays(S.week, 7); S.dayNext = 0; }
      else S.dayI = n;
      rerender();
    };
  }
}

async function copyWeek(current, emps = [], reqs = []) {
  const pFrom = iso(addDays(S.week, -7)), pTo = iso(addDays(S.week, -1));
  const prev = await store.shifts(pFrom, pTo);
  if (!prev.length) return toast('Vorige week bevat geen diensten');
  const key = s => s.employee_id + s.date + hm(s.start_time);
  const have = new Set(current.map(key));
  const list = prev.map(s => ({
    employee_id: s.employee_id, date: iso(addDays(parse(s.date), 7)), start_time: hm(s.start_time), end_time: hm(s.end_time),
    break_minutes: s.break_minutes || 0, position: s.position || null, note: s.note || null, published: false,
  })).filter(s => !have.has(key(s)));
  if (!list.length) return toast('Alle diensten van vorige week staan er al');
  // niet kopiëren: wie uit dienst is, gesloten dagen, goedgekeurd verlof, na einde contract
  const skipped = [];
  const ok2 = list.filter(x => {
    if (specialDay(x.date)?.kind === 'gesloten') { skipped.push(`${fmtShort(x.date)}: gesloten`); return false; }
    if (!x.employee_id) return true;
    const e = emps.find(y => y.id === x.employee_id);
    const nm = (e?.name || '').split(' ')[0];
    if (!e || e.active === false) { skipped.push(`${nm || 'oud-medewerker'}: uit dienst`); return false; }
    if (e.contract_end && x.date > e.contract_end) { skipped.push(`${nm}: contract afgelopen`); return false; }
    const lv = reqs.find(r => r.status === 'approved' && r.employee_id === x.employee_id && r.start_date <= x.date && r.end_date >= x.date);
    if (lv) { skipped.push(`${nm} ${fmtShort(x.date)}: ${REQ[lv.type].toLowerCase()}`); return false; }
    return true;
  });
  const skipTxt = skipped.length ? ` ${skipped.length} overgeslagen (${[...new Set(skipped)].join(', ')}).` : '';
  if (!ok2.length) return toast('Niets te kopiëren.' + skipTxt);
  if (!await ask(`${ok2.length} ${ok2.length === 1 ? 'dienst' : 'diensten'} van vorige week kopiëren als concept?${skipTxt}`)) return;
  await store.saveShifts(ok2);
  toast(`${ok2.length} ${ok2.length === 1 ? 'dienst' : 'diensten'} gekopieerd`);
  rerender();
}

function shiftDialog(s, emps, weekShifts, leaves, avail = [], apps = [], privs = {}, around = null) {
  const isNew = !s.id;
  const day = parse(s.date);
  const opts = (list, val) => list.map(v => `<option ${v === val ? 'selected' : ''}>${esc(v)}</option>`).join('');
  const posList = [...new Set([...(CFG.posities || []), s.position].filter(Boolean))];
  const body = `
    <label class="field">Medewerker<select name="employee_id"><option value="" ${!s.employee_id ? 'selected' : ''}>— Open dienst (team kan zich aanmelden) —</option>${emps.filter(e => e.active !== false || e.id === s.employee_id).map(e => `<option value="${e.id}" ${e.id === s.employee_id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>
    ${!isNew && !s.employee_id ? (() => {
      const l = apps.filter(a => a.shift_id === s.id && a.status === 'pending');
      return `<div class="applist-wrap"><div class="hint" style="margin-bottom:6px">Aanmeldingen</div>${l.length ? `<ul class="applist">${l.map(a => { const e = emps.find(x => x.id === a.employee_id) || {}; const v = avail.find(x => x.employee_id === a.employee_id && x.date === s.date);
        return `<li><span class="dot" style="background:${esc(e.color || COLORS[0])};margin:0"></span><strong>${esc(e.name || '?')}</strong>${v ? `<span class="muted small">${AVAIL_SHORT[v.kind]}</span>` : ''}${leaves.some(r => r.status === 'approved' && r.employee_id === a.employee_id && r.start_date <= s.date && r.end_date >= s.date) ? '<span class="pill warn">heeft verlof</span>' : ''}<button type="button" class="btn sm ok" data-assign="${a.employee_id}">Toewijzen</button></li>`; }).join('')}</ul>` : `<p class="hint">${s.published ? 'Nog niemand aangemeld.' : 'Publiceer de week om deze open dienst zichtbaar te maken.'}</p>`}</div>`;
    })() : ''}
    ${CFG.diensten.length ? `<div><div class="hint" style="margin-bottom:6px">Snelkeuze</div><div class="tpls">${CFG.diensten.map(d => `<button type="button" class="tpl" data-s="${d.start}" data-e="${d.end}" data-p="${d.pauze || 0}">${esc(d.label)} <span class="muted">${d.start}–${d.end}</span></button>`).join('')}</div></div>` : ''}
    <div class="row three keep">
      <label class="field">Begin<input type="time" name="start_time" value="${hm(s.start_time)}" required></label>
      <label class="field">Eind<input type="time" name="end_time" value="${hm(s.end_time)}" required></label>
      <label class="field">Pauze (min)<input type="number" name="break_minutes" min="0" step="5" value="${Number(s.break_minutes) || 0}"></label>
    </div>
    <div class="row">
      <label class="field">Datum<input type="date" name="date" value="${s.date}" required></label>
      <label class="field">Functie<select name="position"><option value="">—</option>${opts(posList, s.position)}</select></label>
    </div>
    ${isNew ? `<div><div class="hint" style="margin-bottom:6px">Zelfde dienst ook op (deze week)</div><div class="days">${DAG.map((d, i) => `<label><input type="checkbox" name="days" value="${i}" ${i === dayIdx(day) ? 'checked' : ''}>${d}</label>`).join('')}</div></div>` : ''}
    <label class="field">Notitie (zichtbaar voor medewerker)<input name="note" value="${esc(s.note || '')}" placeholder="Bijv. inwerken nieuwe collega"></label>
    ${isMgr() ? '<p class="costline hidden" data-cost></p>' : ''}
    <div class="warnbox hidden" data-warn></div>
    <div class="dlg-foot">
      ${isNew ? '' : '<button class="btn danger" value="delete" formnovalidate>Verwijderen</button>'}
      <span class="spacer"></span>
      <button type="button" class="btn" data-close>Annuleren</button>
      <button class="btn primary" value="save">${isNew ? 'Inplannen' : 'Opslaan'}</button>
    </div>
    ${!isNew ? `<p class="hint">Status: ${s.published ? 'gepubliceerd — wijzigingen zijn direct zichtbaar voor de medewerker.' : 'concept — nog niet zichtbaar voor de medewerker.'}</p>` : ''}`;

  openDialog(isNew ? 'Dienst inplannen' : 'Dienst bewerken', body, {
    onReady(dlg) {
      const f = $('form', dlg);
      const warn = $('[data-warn]', dlg);
      $$('[data-assign]', dlg).forEach(b => (b.onclick = async () => {
        try { await store.openAssign(s.id, b.dataset.assign); toast('Dienst toegewezen'); dlg.close(); rerender(); } catch (e) { toast(errMsg(e), 'error'); }
      }));
      const costEl = $('[data-cost]', dlg);
      const costLine = () => {
        if (!costEl) return;
        const emp = f.employee_id.value, wage = Number(privs[emp]?.hourly_wage);
        if (!emp || !f.start_time.value || !f.end_time.value || f.start_time.value === f.end_time.value) { costEl.classList.add('hidden'); return; }
        if (!wage) { costEl.innerHTML = 'Vul het uurloon in bij Team om te zien wat deze dienst kost.'; costEl.classList.remove('hidden'); return; }
        const m0 = mondayOf(parse(f.date.value));
        const dates = isNew ? [...new Set([f.date.value, ...$$('input[name=days]:checked', f).map(c => iso(addDays(m0, Number(c.value))))])] : [f.date.value];
        const costFor = d => loonkosten(costOf({ employee_id: emp, date: d, start_time: f.start_time.value, end_time: f.end_time.value, break_minutes: Number(f.break_minutes.value) || 0 }, wage, CFG.costSt || {}).bruto, CFG.costSt || {}).totaal;
        const one = costFor(f.date.value), tot = dates.reduce((t, d) => t + costFor(d), 0);
        costEl.innerHTML = `Deze dienst kost <strong>± ${euro(one)}</strong>${dates.length > 1 ? ` · ${dates.length} dagen samen <strong>± ${euro(tot)}</strong>` : ''} <span class="muted">(loon, toeslagen, vakantiegeld en werkgeverslasten)</span>`;
        costEl.classList.remove('hidden');
      };
      f.addEventListener('input', costLine); f.addEventListener('change', costLine);
      $$('.tpl', dlg).forEach(b => b.addEventListener('click', () => setTimeout(costLine, 0)));
      const check = () => {
        costLine();
        const emp = f.employee_id.value, date = f.date.value;
        const msgs = [];
        if (!emp) { warn.classList.add('hidden'); return; }
        const dates = isNew ? $$('input[name=days]:checked', f).map(c => iso(addDays(mondayOf(parse(date)), Number(c.value)))) : [date];
        dates.forEach(ds => {
          const sp = specialDay(ds); if (sp?.kind === 'gesloten') msgs.push(`${fmtShort(ds)}: ${CFG.bedrijf} is gesloten (${sp.label})`);
          const lv = leaves.find(r => r.employee_id === emp && r.start_date <= ds && r.end_date >= ds);
          if (lv) msgs.push(`${fmtShort(ds)}: ${REQ[lv.type].toLowerCase()} ${lv.status === 'pending' ? 'aangevraagd' : 'goedgekeurd'}`);
          const other = weekShifts.find(x => x.employee_id === emp && x.date === ds && x.id !== s.id);
          if (other) msgs.push(`${fmtShort(ds)}: heeft al een dienst ${hm(other.start_time)}–${hm(other.end_time)}`);
          const v = avail.find(a => a.employee_id === emp && a.date === ds);
          if (v && v.kind === 'niet') msgs.push(`${fmtShort(ds)}: heeft “niet beschikbaar” doorgegeven${v.note ? ' (' + v.note + ')' : ''}`);
          else if (v && v.kind !== 'hele_dag') msgs.push(`${fmtShort(ds)}: alleen ${AVAIL[v.kind].toLowerCase()} beschikbaar`);
          // Arbeidstijdenwet
          const cand = { id: '__nieuw', employee_id: emp, date: ds, start_time: f.start_time.value, end_time: f.end_time.value, break_minutes: Number(f.break_minutes.value) || 0 };
          if (cand.start_time && cand.end_time && cand.start_time !== cand.end_time) {
            const pool = (around || weekShifts).filter(x => x.employee_id === emp && x.id !== s.id && !(isNew && x.date === ds && false));
            const iss = atwIssues([...pool, cand], privs[emp]?.birth_date)['__nieuw'] || [];
            iss.forEach(m => msgs.push(`${fmtShort(ds)}: ${m}`));
          }
        });
        warn.innerHTML = msgs.length ? '⚠︎ ' + msgs.map(esc).join('<br>') : '';
        warn.classList.toggle('hidden', !msgs.length);
      };
      $$('.tpl', dlg).forEach(b => (b.onclick = () => { f.start_time.value = b.dataset.s; f.end_time.value = b.dataset.e; f.break_minutes.value = b.dataset.p; }));
      f.addEventListener('change', check);
      // nieuwe dienst: bij een andere datum ook het vinkje voor die dag zetten
      if (isNew) {
        let prevDay = dayIdx(parse(f.date.value));
        f.date.addEventListener('change', () => {
          if (!f.date.value) return;
          const nd = dayIdx(parse(f.date.value));
          const boxes = $$('input[name=days]', f);
          if (boxes[prevDay]) boxes[prevDay].checked = false;
          if (boxes[nd]) boxes[nd].checked = true;
          prevDay = nd; check();
        });
      }
      f.employee_id.addEventListener('change', () => { const e = emps.find(x => x.id === f.employee_id.value); if (e?.position && [...f.position.options].some(o => o.value === e.position)) f.position.value = e.position; });
      check();
    },
    async onSubmit(fd, action) {
      if (action === 'delete') {
        if (!await ask('Deze dienst verwijderen?')) throw 'cancel';
        await store.deleteShift(s.id); toast('Dienst verwijderd'); return rerender();
      }
      if (fd.get('start_time') === fd.get('end_time')) throw new Error('Begin- en eindtijd zijn gelijk.');
      const base = {
        employee_id: fd.get('employee_id') || null, start_time: fd.get('start_time'), end_time: fd.get('end_time'),
        break_minutes: Number(fd.get('break_minutes')) || 0, position: fd.get('position') || null, note: fd.get('note').trim() || null,
      };
      if (isNew) {
        const m = mondayOf(parse(fd.get('date')));
        const ds = fd.getAll('days');
        const dates = [...new Set([fd.get('date'), ...ds.map(i => iso(addDays(m, Number(i))))])].sort();
        await store.saveShifts(dates.map(date => ({ ...base, date, published: false })));
        toast(dates.length > 1 ? `${dates.length} diensten ingepland als concept` : 'Dienst ingepland als concept');
        // Meteen aanbieden om te publiceren, voor de week van de gekozen datum (die kan een andere week zijn dan op het scherm)
        const from = iso(m), to = iso(addDays(m, 6));
        setTimeout(async () => {
          S.pubAsked ||= new Set();
          if (S.pubAsked.has(from)) return rerender();   // per week één keer vragen; daarna via de knop Publiceer
          const [wk, stP] = await Promise.all([store.shifts(from, to), store.settings()]);
          const n = wk.filter(x => !x.published).length;
          if (!n) return rerender();
          S.pubAsked.add(from);
          const mailTxt = stP.mail_on_publish !== false && wk.some(x => !x.published && x.employee_id) ? ' De medewerkers krijgen hun rooster ook per mail.' : '';
          const yes = await ask(`Nu publiceren? Week ${weekNr(m)} heeft ${n} dienst${n > 1 ? 'en' : ''} die nog niet zichtbaar ${n > 1 ? 'zijn' : 'is'} voor het team.${mailTxt} Plan je nog meer? Kies Annuleren en publiceer straks met de knop.`, 'Publiceren');
          if (yes) { S.week = m; await publishWeek(from, to, wk); } else rerender();
        }, 50);
        return;
      } else {
        const date = fd.get('date');
        await store.saveShifts([{ ...base, id: s.id, date }]);
        const moved = s.published && (date !== s.date || hm(base.start_time) !== hm(s.start_time) || hm(base.end_time) !== hm(s.end_time) || (base.employee_id || null) !== (s.employee_id || null));
        if (!moved) { toast('Dienst opgeslagen'); return rerender(); }
        // Gepubliceerde dienst gewijzigd: de medewerker krijgt automatisch een melding in de app; mail aanbieden
        const who = [...new Set([base.employee_id, s.employee_id].filter(Boolean))];
        const names = who.map(id => (emps.find(e => e.id === id)?.name || '').split(' ')[0]).filter(Boolean).join(' en ');
        toast('Dienst gewijzigd');
        setTimeout(async () => {
          rerender();
          if (!who.length || !await ask(`${names} ${who.length > 1 ? 'krijgen' : 'krijgt'} automatisch een melding in de app. Ook een mail sturen met het aangepaste rooster?`, 'Mail sturen')) return;
          try {
            const weeks = [...new Set([date, s.date].map(d => iso(mondayOf(parse(d)))))];
            let sent = 0;
            for (const w of weeks) sent += (await store.mailRoster(w, iso(addDays(parse(w), 6)), who, true)).sent || 0;
            toast(store.demo ? 'Demo: in de echte app gaat er nu een mail met het gewijzigde rooster' : `Gewijzigd rooster gemaild (${sent})`);
          } catch (x) { toast('Mailen niet gelukt: ' + errMsg(x), 'error'); }
        }, 50);
        return;
      }
      rerender();
    },
  });
}

// Publiceert een week en mailt iedereen met nieuwe diensten zijn weekrooster
async function publishWeek(from, to, weekShifts, quiet = false) {
  const mailOn = (await store.settings()).mail_on_publish !== false;
  const ids = mailOn ? [...new Set(weekShifts.filter(s => !s.published && s.employee_id).map(s => s.employee_id))] : [];
  await store.publish(from, to);
  if (quiet) {
    if (!ids.length) return { sent: 0 };
    try { return await store.mailRoster(from, to, ids); } catch (x) { return { sent: 0, error: errMsg(x) }; }
  }
  if (!ids.length) { toast('Week gepubliceerd'); return rerender(); }
  toast('Week gepubliceerd · mails worden verstuurd…');
  rerender();
  try {
    const r = await store.mailRoster(from, to, ids);
    if (r.failed?.length) toast(`Gemaild naar ${r.sent}; niet gelukt: ${r.failed.join('; ')}`, 'error');
    else toast(r.demo ? `Demo: in de echte app krijgen ${r.sent} medewerker(s) nu hun rooster per mail` : `Rooster gemaild naar ${r.sent} medewerker${r.sent === 1 ? '' : 's'}`);
  } catch (x) { toast('Gepubliceerd, maar niet gemaild: ' + errMsg(x), 'error'); }
}

/* ================= Prikbord ================= */
const annBody = t => esc(t || '').replace(/(https?:\/\/[^\s<]+)/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`).replace(/\n/g, '<br>');
// wie telt mee voor "gelezen door": actieve medewerkers en shiftleaders, niet de directie (die ziet het prikbord in het Overzicht)
const annAudience = (a, emps) => emps.filter(e => e.active !== false && e.role !== 'manager' && e.id !== a.created_by);
function annCard(a, { read, mgr, readInfo } = {}) {
  const img = /^image\//.test(a.attachment_type || '');
  return `<article class="ann card ${a.pinned ? 'pinned' : ''} ${read ? 'read' : 'unread'}" data-ann="${a.id}">
    <div class="ann-head"><div><h3>${a.pinned ? '<span title="Vastgezet">📌</span> ' : ''}${esc(a.title)}</h3><small class="muted">${esc(fmtShort(iso(new Date(a.created_at))))}${a.updated_at && new Date(a.updated_at) - new Date(a.created_at) > 60000 ? ` · bijgewerkt ${esc(fmtShort(iso(new Date(a.updated_at))))}` : ''}</small></div>
      ${mgr ? `<div class="ann-tools"><button type="button" class="btn sm ghost" data-annedit="${a.id}">Bewerken</button></div>` : ''}</div>
    ${a.body ? `<p class="ann-body">${annBody(a.body)}</p>` : ''}
    ${a.attachment_path ? (img ? `<button type="button" class="ann-img" data-annview="${esc(a.attachment_path)}" data-annname="${esc(a.attachment_name || 'Afbeelding')}" data-anntype="${esc(a.attachment_type || '')}" aria-label="${esc(a.attachment_name || 'Afbeelding')} openen"><img data-annimg="${esc(a.attachment_path)}" alt="${esc(a.attachment_name || 'Afbeelding')}"></button>`
      : `<button type="button" class="btn sm ann-file" data-annview="${esc(a.attachment_path)}" data-annname="${esc(a.attachment_name || 'Bijlage')}" data-anntype="${esc(a.attachment_type || '')}">📄 ${esc(a.attachment_name || 'Bijlage openen')}</button>`) : ''}
    <div class="ann-foot">${mgr ? `<button type="button" class="linkbtn" data-annreads="${a.id}">${readInfo}</button>` : read ? '<span class="muted small">✓ Gelezen</span>' : `<button type="button" class="btn sm primary" data-annread="${a.id}">👍 Gelezen</button>`}</div>
  </article>`;
}
// bijlagen pas na het tekenen ophalen (beveiligde links zijn tijdelijk)
async function fillAnnFiles(el) {
  const todo = $$('[data-annimg]', el).filter(n => !n.src && !n.closest('details:not([open])'));
  await Promise.all(todo.map(async n => { const u = await store.attachmentUrl(n.dataset.annimg); if (u) n.src = u; }));
  if (!el.dataset.annToggle) { el.dataset.annToggle = '1'; el.addEventListener('toggle', ev => { if (ev.target.open) fillAnnFiles(ev.target); }, true); }
}

// Bijlagen openen in de app zelf (geen los tabblad met een Supabase-adres): foto's als afbeelding, pdf's pagina voor pagina
let pdfjsLib = null;
const PDFJS_DIR = 'vendor/pdfjs-4.10.38/';
async function loadPdfjs() {
  if (pdfjsLib) return pdfjsLib;
  const base = new URL(PDFJS_DIR, location.href).href;
  const lib = await import(base + 'pdf.min.mjs');
  lib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.mjs';
  return (pdfjsLib = lib);
}
async function fileViewer(path, name, type) {
  if (document.querySelector('dialog.viewer[open]')) return;   // dubbel tikken opent geen tweede venster
  const dlg = document.createElement('dialog');
  dlg.className = 'viewer';
  dlg.setAttribute('aria-labelledby', 'viewer-name');
  dlg.innerHTML = `<div class="viewer-bar"><strong class="viewer-name" id="viewer-name">${esc(name || 'Bijlage')}</strong><button type="button" class="btn sm" data-vsave disabled>Bewaren</button><button type="button" class="x" data-vclose aria-label="Sluiten">×</button></div>
    <div class="viewer-body"><p class="viewer-msg">Bezig met openen…</p></div>`;
  document.body.append(dlg);
  const urls = [];
  let closed = false, doc = null, io = null;
  dlg.addEventListener('close', () => {
    closed = true;
    if (io) io.disconnect();
    $$('canvas', dlg).forEach(c => { c.width = 0; c.height = 0; });   // geheugen direct vrijgeven (iPhone)
    if (doc) { try { doc.destroy(); } catch (x) { /* al opgeruimd */ } }
    urls.forEach(u => URL.revokeObjectURL(u));
    if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
  });
  $('[data-vclose]', dlg).onclick = () => dlg.close();
  dlg.showModal();
  const body = $('.viewer-body', dlg);
  try {
    const blob = await store.attachmentBlob(path);
    if (closed) return;
    const t = (type || blob.type || '').toLowerCase();
    const kind = /pdf/.test(t) || /\.pdf$/i.test(name || '') ? 'pdf' : /^image\/(jpe?g|png|gif|webp|svg\+xml|bmp|avif)$/.test(t) ? 'img' : 'other';
    const url = URL.createObjectURL(blob); urls.push(url);
    const save = $('[data-vsave]', dlg); save.disabled = false;
    save.onclick = async () => {
      const file = new File([blob], name || 'bijlage', { type: blob.type || type || 'application/octet-stream' });
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ files: [file] }); } catch (x) { if (x && x.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = url; a.download = name || 'bijlage'; document.body.append(a); a.click(); a.parentNode.removeChild(a);
    };
    if (kind === 'img') { body.innerHTML = `<img class="viewer-img" src="${url}" alt="${esc(name || 'Afbeelding')}">`; return; }
    if (kind === 'other') { body.innerHTML = '<p class="viewer-msg">Dit bestand kan niet in de app getoond worden. Tik op Bewaren om het op je telefoon te openen.</p>'; return; }
    const lib = await loadPdfjs();
    const loaded = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise;
    if (closed) { loaded.destroy(); return; }
    doc = loaded;
    body.innerHTML = '';
    const width = Math.min(body.clientWidth - 16, 1000), ratio = Math.min(window.devicePixelRatio || 1, 2);
    // pagina's pas tekenen als ze in beeld komen: ook een dikke menukaart blijft licht op de telefoon
    const draw = async c => {
      if (c.dataset.done || closed) return; c.dataset.done = '1';
      const page = await doc.getPage(Number(c.dataset.page)); if (closed) return;
      const vp = page.getViewport({ scale: (width / page.getViewport({ scale: 1 }).width) * ratio });
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    };
    io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) draw(en.target).catch(() => {}); }), { root: body, rootMargin: '600px 0px' }) : null;
    for (let i = 1; i <= doc.numPages && !closed; i++) {
      const vp1 = (await doc.getPage(i)).getViewport({ scale: 1 });
      const c = document.createElement('canvas');
      c.className = 'viewer-page'; c.dataset.page = i;
      c.style.width = width + 'px'; c.style.height = Math.round(width * vp1.height / vp1.width) + 'px';
      c.setAttribute('role', 'img'); c.setAttribute('aria-label', `Pagina ${i} van ${doc.numPages}`);
      body.append(c);
      if (io) io.observe(c); else await draw(c);
    }
  } catch (e) {
    if (!closed) body.innerHTML = `<p class="viewer-msg">Openen lukt niet: ${esc(errMsg(e))}. Tik op Bewaren om het bestand op je telefoon te openen.</p>`;
  }
}
// één luisteraar voor alle bijlageknoppen (prikbord, overzicht, 'alle mededelingen')
document.addEventListener('click', ev => {
  const v = ev.target.closest('[data-annview]'); if (!v) return;
  ev.preventDefault(); ev.stopPropagation();
  fileViewer(v.dataset.annview, v.dataset.annname, v.dataset.anntype);
}, true);
function annDialog(a = {}) {
  const isNew = !a.id;
  openDialog(isNew ? 'Nieuwe mededeling' : 'Mededeling bewerken', `
    <label class="field">Titel<input name="title" maxlength="120" required value="${esc(a.title || '')}" placeholder="Bijv. Nieuwe najaarskaart vanaf vrijdag"></label>
    <label class="field">Bericht<textarea name="body" rows="5" placeholder="Wat moet het team weten?">${esc(a.body || '')}</textarea></label>
    <label class="field">Foto of pdf (optioneel, bijv. de menukaart)<input type="file" name="file" accept="image/*,application/pdf"></label>
    ${a.attachment_path ? `<label class="check"><input type="checkbox" name="dropfile"> Huidige bijlage verwijderen (${esc(a.attachment_name || '')})</label>` : ''}
    ${isNew ? '' : '<label class="check"><input type="checkbox" name="renotify"> Opnieuw melden aan het team (iedereen leest hem opnieuw)</label>'}
    <label class="check"><input type="checkbox" name="pinned" ${a.pinned ? 'checked' : ''}> Vastzetten bovenaan (bijv. huisregels of de menukaart)</label>
    ${isNew ? '<p class="hint">Iedereen krijgt een melding en de mededeling staat bovenaan in hun rooster tot ze hem gelezen hebben.</p>' : ''}
    <div class="dlg-foot">${isNew ? '' : '<button class="btn danger" value="delete" formnovalidate>Verwijderen</button>'}<span class="spacer"></span><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">${isNew ? 'Plaatsen' : 'Opslaan'}</button></div>`, {
    async onSubmit(fd, action) {
      if (action === 'delete') { if (!await ask('Deze mededeling verwijderen?', 'Verwijderen')) throw 'cancel'; await store.deleteAnnouncement(a.id, a.attachment_path); toast('Mededeling verwijderd'); return rerender(); }
      const rec = { title: fd.get('title').trim(), body: fd.get('body').trim() || null, pinned: fd.get('pinned') === 'on' };
      if (!rec.title) throw new Error('Vul een titel in.');
      if (a.id) rec.id = a.id;
      if (fd.get('dropfile') === 'on') Object.assign(rec, { attachment_path: null, attachment_name: null, attachment_type: null });
      const file = fd.get('file');
      if (file && file.size) { const up = await store.uploadAttachment(file); Object.assign(rec, { attachment_path: up.path, attachment_name: up.name, attachment_type: up.type }); }
      await store.saveAnnouncement(rec);
      if (a.attachment_path && 'attachment_path' in rec && rec.attachment_path !== a.attachment_path) await store.deleteAttachment(a.attachment_path).catch(() => {});
      if (!isNew && fd.get('renotify') === 'on') await store.renotifyAnnouncement(a.id);
      toast(isNew ? 'Mededeling geplaatst · het team krijgt een melding' : fd.get('renotify') === 'on' ? 'Opgeslagen · het team krijgt opnieuw een melding' : 'Opgeslagen'); rerender();
    },
  });
}
async function annReadsDialog(a, reads, emps) {
  const team = annAudience(a, emps);
  const got = new Set(reads.filter(r => r.announcement_id === a.id).map(r => r.employee_id));
  const yes = team.filter(e => got.has(e.id)), no = team.filter(e => !got.has(e.id));
  openDialog('Wie heeft het gelezen?', `<p style="margin:0"><strong>${esc(a.title)}</strong></p>
    <div><h3 class="small-h">Gelezen (${yes.length})</h3><p>${yes.map(e => esc(e.name)).join(', ') || '<span class="muted">Nog niemand</span>'}</p></div>
    <div><h3 class="small-h">Nog niet (${no.length})</h3><p>${no.map(e => esc(e.name)).join(', ') || '<span class="muted">Iedereen heeft het gelezen 🎉</span>'}</p></div>
    <div class="dlg-foot"><button type="button" class="btn primary" data-close>Sluiten</button></div>`);
}
function annAllDialog(board, emps, mgr) {
  const mineRead = new Set(board.reads.filter(r => r.employee_id === S.me.id).map(r => r.announcement_id));
  const dlg = openDialog('Alle mededelingen', `<div class="annall">${board.list.map(a => {
    if (!mgr) return annCard(a, { read: mineRead.has(a.id) });
    const aud = annAudience(a, emps); const n = board.reads.filter(r => r.announcement_id === a.id && aud.some(e => e.id === r.employee_id)).length;
    return annCard(a, { mgr: true, readInfo: `Gelezen door ${n} van ${aud.length}` });
  }).join('')}</div><div class="dlg-foot"><button type="button" class="btn primary" data-close>Sluiten</button></div>`, {
    onReady(d) {
      d.addEventListener('click', async ev => {
        const ae = ev.target.closest('[data-annedit]'); if (ae) { d.close(); return annDialog(board.list.find(a => a.id === ae.dataset.annedit)); }
        const ar = ev.target.closest('[data-annreads]'); if (ar) return annReadsDialog(board.list.find(a => a.id === ar.dataset.annreads), board.reads, emps);
        const rd = ev.target.closest('[data-annread]'); if (rd) { await store.markAnnRead(rd.dataset.annread); toast('Gelezen. Je vindt hem nog op het prikbord.'); d.close(); rerender(); }
      });
    },
  });
  fillAnnFiles(dlg);
}
// Prikbord bovenaan Mijn rooster: ongelezen mededelingen en vastgezette berichten
async function boardHTML() {
  const { list, reads } = await store.announcements();
  const mineRead = new Set(reads.filter(r => r.employee_id === S.me.id).map(r => r.announcement_id));
  const unread = list.filter(a => !mineRead.has(a.id)).sort((a, b) => b.created_at.localeCompare(a.created_at));   // nieuwste eerst open
  const pinnedRead = list.filter(a => a.pinned && mineRead.has(a.id));
  // gelezen mededelingen blijven ingeklapt staan (de nieuwste 10; oudere onder 'Alle mededelingen'); alleen de directie verwijdert ze
  const recentRead = list.filter(a => !a.pinned && mineRead.has(a.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10);
  if (!list.length) return '';
  return `<section class="board">
    ${unread.map((a, i) => i === 0 ? annCard(a, { read: false }) : `<details class="pinitem unreaditem"><summary><span class="newdot">nieuw</span> ${esc(a.title)}</summary>${annCard(a, { read: false })}</details>`).join('')}
    ${pinnedRead.length || recentRead.length ? `<div class="pinlist">${pinnedRead.map(a => `<details class="pinitem"><summary>📌 ${esc(a.title)}</summary>${annCard(a, { read: true })}</details>`).join('')}${recentRead.map(a => `<details class="pinitem"><summary><span class="muted">✓</span> ${esc(a.title)}</summary>${annCard(a, { read: true })}</details>`).join('')}</div>` : ''}
    ${list.length > unread.length + pinnedRead.length + recentRead.length ? '<button type="button" class="linkbtn small" data-annall>Alle mededelingen</button>' : ''}
  </section>`;
}
function bindBoard(el) {
  fillAnnFiles(el);
  return async ev => {
    const r = ev.target.closest('[data-annread]');
    if (r) { await store.markAnnRead(r.dataset.annread); toast('Gelezen. Je vindt hem nog op het prikbord.'); rerender(); return true; }
    if (ev.target.closest('[data-annall]')) { annAllDialog(await store.announcements(), [], false); return true; }
    return false;
  };
}

/* ================= Overzicht (dashboard directie) ================= */
async function viewDashboard(el) {
  S.dashWeek ||= mondayOf(new Date());
  const from = iso(S.dashWeek), to = iso(addDays(S.dashWeek, 6)), today = todayIso();
  const [emps0, shifts, ents, privList, st, revRows, reqs, apps, openE, avail, board, ahead, swapsAll] = await Promise.all([
    store.employees(), store.shifts(from, to), store.entries(from, to), store.privates(), store.settings(), store.revenue(from, to),
    store.requests(), store.applications(), store.openEntries(), store.availability(from, to), store.announcements(),
    store.shifts(todayIso(), iso(addDays(new Date(), 70))), store.swaps()]);
  applySettings(st);
  const emps = sortEmps(emps0), byId = Object.fromEntries(emps.map(e => [e.id, e]));
  const privs = Object.fromEntries(privList.map(p => [p.employee_id, p]));
  const days = [...Array(7)].map((_, i) => iso(addDays(S.dashWeek, i)));
  const revMap = Object.fromEntries(revRows.map(r => [r.date, r]));
  const fc = days.reduce((t, d) => t + (Number(revMap[d]?.forecast) || 0), 0);
  const ac = days.reduce((t, d) => t + (Number(revMap[d]?.actual) || 0), 0);
  const hasActual = days.some(d => revMap[d]?.actual != null);
  const planned = shifts.filter(x => x.employee_id);
  const done = ents.filter(x => x.clock_out);
  const worked = done.map(x => entryAsShift(x, matchShift(x, shifts), st));
  const P = kpiOf(planned, privs, st, fc);
  // werkelijk: alleen de dagen waarop gewerkt is, met de omzet van die dagen (werkelijk, anders verwacht)
  const workedDays = [...new Set(worked.map(x => x.date))];
  const revW = workedDays.reduce((t, d) => t + (Number(revMap[d]?.actual ?? revMap[d]?.forecast) || 0), 0);
  const W = kpiOf(worked, privs, st, revW);
  const plannedSoFar = kpiOf(planned.filter(x => x.date < today), privs, st, 0).hours;
  const workedSoFar = worked.filter(x => x.date < today).reduce((t, x) => t + shiftHours(x), 0);
  const wl = weekLabel(S.dashWeek);
  const goal = (k, v) => (v ? `<span class="goal">doel ${k === 'pct' ? pct1(v) : euro(v)}</span>` : '');
  const tile = (key, label, info, planVal, workVal, fmt, kind, goalV) => {
    const c = goalColor(kind, planVal, st);
    return `<div class="kpi ${c}" data-kpi="${key}"><div class="kh"><span>${label}</span><span class="info" title="${esc(info)}">?</span></div>
      <b>${fmt(planVal)}</b><div class="kf"><span class="muted small">${key === 'omzet' ? 'verwacht' : 'gepland'}</span>${c ? `<span class="dot-${c}"></span>` : ''}${goal(kind, goalV)}</div>
      ${workVal !== undefined ? `<div class="kw"><span>Werkelijk tot nu</span><strong class="${goalColor(kind, workVal, st)}">${fmt(workVal)}</strong></div>` : ''}</div>`;
  };
  // per functie
  const byPos = {};
  planned.forEach(x => { const p = x.position || byId[x.employee_id]?.position || 'Overig'; (byPos[p] ||= []).push(x); });
  const posRows = Object.entries(byPos).map(([p, l]) => ({ p, k: kpiOf(l, privs, st, 0) })).sort((a, b) => b.k.cost - a.k.cost || b.k.hours - a.k.hours);
  // aandacht
  const pendReq = reqs.filter(r => r.status === 'pending').length;
  const openShifts = shifts.filter(x => !x.employee_id && x.date >= today);
  const openApps = apps.filter(a => a.status === 'pending' && openShifts.some(x => x.id === a.shift_id)).length;
  const concepts = shifts.filter(x => !x.published).length;
  const conceptsLater = ahead.filter(x => !x.published && x.date > to).length;
  const swapsWait = swapsAll.filter(w => w.status === 'accepted').length;
  const entDev = ents.filter(x => x.status === 'pending' && x.clock_out && (x.flags?.length || x.overtime_status === 'requested')).length;
  const noWageN = planned.filter(x => !Number(privs[x.employee_id]?.hourly_wage) && byId[x.employee_id]?.role !== 'manager').length;
  const inNow = openE.filter(x => !x.clock_out);
  const entPend = ents.filter(x => x.status === 'pending' && x.clock_out).length;
  const staffing = st.staffing || {};
  let short = 0;
  days.forEach(d => { if (specialDay(d)?.kind === 'gesloten') return; const base = staffing[dayIdx(parse(d))] || {}; Object.entries(base).forEach(([p, n]) => { const h = shifts.filter(x => x.date === d && x.employee_id && x.position === p).length; if (h < Number(n)) short++; }); });
  const yest = iso(addDays(new Date(), -1));
  let listMiss = 0, openMeld = 0;
  try {
    const cls = (await store.checklists()).filter(l => l.active !== false && ['opening', 'sluiting', 'dag'].includes(l.moment));
    const tky = await store.ticks([yest]);
    listMiss = cls.filter(l => (l.items || []).some(it => !tky.some(t => t.checklist_id === l.id && t.item_id === it.id))).length;
    openMeld = (await store.logs(iso(addDays(new Date(), -180)), todayIso(), true)).length;
  } catch (e) { /* lijsten nog niet ingesteld */ }
  const att = [
    openMeld && [`${openMeld} open ${openMeld === 1 ? 'melding' : 'meldingen'} (gebrek, incident of klacht)`, 'lijsten'],
    listMiss && [`${listMiss} ${listMiss === 1 ? 'lijst' : 'lijsten'} gisteren niet helemaal afgevinkt`, 'lijsten-gisteren'],
    pendReq && [`${pendReq} ${pendReq === 1 ? 'aanvraag wacht' : 'aanvragen wachten'} op je beslissing`, 'aanvragen:verlof'],
    swapsWait && [`${swapsWait} ${swapsWait === 1 ? 'ruil wacht' : 'ruilen wachten'} op goedkeuring`, 'aanvragen:ruilen'],
    openShifts.length && [`${openShifts.length} open ${openShifts.length === 1 ? 'dienst' : 'diensten'}${openApps ? ` · ${openApps} aanmelding${openApps === 1 ? '' : 'en'}` : ''}`, 'aanvragen:open'],
    concepts && [`${concepts} ${concepts === 1 ? 'dienst is' : 'diensten zijn'} nog niet gepubliceerd`, 'planning'],
    conceptsLater && [`${conceptsLater} ${conceptsLater === 1 ? 'dienst' : 'diensten'} in komende weken nog niet gepubliceerd`, 'planning-later'],
    short && [`${short}× te weinig mensen ingepland voor de bezetting`, 'planning'],
    entPend && [`${entPend} kloktijd${entPend === 1 ? '' : 'en'} goed te keuren${entDev ? ` (${entDev} met afwijking of overuren)` : ''}`, 'klokken'],
    noWageN && [`${noWageN} ${noWageN === 1 ? 'dienst' : 'diensten'} zonder uurloon: vul het uurloon in bij Team`, 'team'],
  ].filter(Boolean);
  el.innerHTML = `
    <div class="page-head"><div><h1>Overzicht</h1><p>Personeelskosten, omzet en wat er aandacht nodig heeft.</p></div><button class="btn" data-myagenda>📅 Mijn diensten in agenda</button></div>
    <div class="toolbar"><div class="weeknav">
      <button class="btn icon" data-dw="-1" aria-label="Vorige week">‹</button>
      <div class="label"><strong>${wl.title}</strong><span>${wl.sub}</span></div>
      <button class="btn icon" data-dw="1" aria-label="Volgende week">›</button>
      <button class="btn ghost sm" data-dw="0">Deze week</button>
    </div></div>
    ${!st.goal_labor_pct && !st.goal_productivity && !st.goal_cost_hour ? '<div class="pubbar"><span>Stel je doelen in, dan kleuren de cijfers groen, geel of rood.</span><button class="btn sm primary" data-gosettings2>Doelen instellen</button></div>' : ''}
    <div class="kpis">
      ${tile('omzet', 'Omzet', 'Verwachte omzet die je per dag invult. Werkelijk = omzet uit de kassa of zelf ingevuld.', fc || null, hasActual ? ac : undefined, euro0, '', 0)}
      ${tile('pct', 'Personeelskosten %', 'Personeelskosten (loon, toeslagen, vakantiegeld en werkgeverslasten) gedeeld door de omzet. Werkelijk: alleen de dagen waarop al gewerkt is.', P.pct, done.length ? W.pct : undefined, pct1, 'pct', Number(st.goal_labor_pct))}
      ${tile('prod', 'Productiviteit', 'Omzet per gewerkt uur.', P.prod, done.length ? W.prod : undefined, v => (v == null ? '—' : euro(v)), 'prod', Number(st.goal_productivity))}
      ${tile('hour', 'Kosten per uur', 'Gemiddelde personeelskosten per uur, inclusief toeslagen en werkgeverslasten.', P.perHour, done.length ? W.perHour : undefined, v => (v == null ? '—' : euro(v)), 'hour', Number(st.goal_cost_hour))}
    </div>
    <div class="dash2">
      <section class="card pad">
        <h2>${S.dashWeek.getTime() === mondayOf(new Date()).getTime() ? 'Deze week' : esc(wl.title)}</h2>
        <div class="pw"><div><small>Gepland</small><b>${fmtH(P.hours)} u</b><span class="muted small">${euro0(P.cost)}</span></div>
          <div><small>Gewerkt</small><b>${fmtH(W.hours)} u</b><span class="muted small">${plannedSoFar ? Math.round(workedSoFar / plannedSoFar * 100) + '% van gepland tot vandaag' : ''}</span></div>
          <div><small>Nu ingeklokt</small><b>${inNow.length}</b><span class="muted small">${esc(inNow.slice(0, 3).map(x => (byId[x.employee_id]?.name || '').split(' ')[0]).join(', '))}</span></div></div>
      </section>
      <section class="card pad">
        <h2>Aandacht nodig</h2>
        ${att.length ? `<ul class="attlist">${att.map(([t, v]) => `<li><button class="linkbtn" data-goto2="${v}">${esc(t)} ›</button></li>`).join('')}</ul>` : '<p class="hint" style="margin:0">Alles is bij. 🎉</p>'}
      </section>
    </div>
    <section class="card pad dsect">
      <div class="sect-head"><h2>Prikbord</h2><div class="req-actions">${board.list.length > 6 ? `<button class="btn sm" data-annallmgr>Alle (${board.list.length})</button>` : ''}<button class="btn sm primary" data-annnew>+ Nieuwe mededeling</button></div></div>
      ${board.list.length ? `<div class="annlist">${board.list.slice(0, 6).map(a => {
        const aud = annAudience(a, emps), team = aud.length;
        const n = board.reads.filter(r => r.announcement_id === a.id && aud.some(e => e.id === r.employee_id)).length;
        return annCard(a, { mgr: true, readInfo: `Gelezen door ${n} van ${team}` });
      }).join('')}</div>` : '<p class="hint" style="margin:0">Deel hier nieuws met het team, zoals een nieuwe menukaart, een proeverij of de huisregels. Iedereen krijgt een melding en ziet het bovenaan in de app. WhatsApp blijft voor het gewone kletsen.</p>'}
    </section>
    <section class="card pad dsect">
      <h2>Per dag</h2>
      <p class="hint">Omzet invullen is optioneel. Kosten % = geplande personeelskosten gedeeld door de verwachte omzet. De werkelijke omzet vul je achteraf in uit de kassa (later kan die automatisch uit Lightspeed komen); die gebruikt het Overzicht bij "werkelijk tot nu".</p>
      <div class="table-wrap"><table class="list daytable"><thead><tr><th>Dag</th><th class="num">Verwacht</th><th class="num">Werkelijk</th><th class="num hide-sm">Uren gepland</th><th class="num hide-sm">Kosten gepland</th><th class="num">Kosten %</th><th class="num hide-sm">Uren gewerkt</th></tr></thead>
      <tbody>${days.map((d, i) => {
        const r = revMap[d] || {}, om = Number(r.forecast) || 0, sp = specialDay(d);   // kosten % = gepland tegen verwachte omzet
        const k = kpiOf(planned.filter(x => x.date === d), privs, st, om), wk = kpiOf(worked.filter(x => x.date === d), privs, st, om);
        return `<tr class="${d === today ? 'today' : ''}"><td><strong>${DAG[i]} ${parse(d).getDate()}</strong>${sp?.kind === 'gesloten' ? ' <span class="pill">gesloten</span>' : ''}</td>
          <td class="num"><input class="revin" type="number" min="0" step="50" inputmode="numeric" data-revf="${d}" value="${r.forecast ?? ''}" placeholder="€"></td>
          <td class="num"><input class="revin" type="number" min="0" step="50" inputmode="numeric" data-reva="${d}" value="${r.actual ?? ''}" placeholder="€"></td>
          <td class="num hide-sm">${fmtH(k.hours)}</td><td class="num hide-sm">${euro0(k.cost)}</td>
          <td class="num"><b class="kp ${goalColor('pct', k.pct, st)}">${pct1(k.pct)}</b></td><td class="num hide-sm">${wk.hours ? fmtH(wk.hours) : '—'}</td></tr>`;
      }).join('')}</tbody>
      <tfoot><tr><th>Week</th><th class="num">${euro0(fc)}</th><th class="num">${hasActual ? euro0(ac) : '—'}</th><th class="num hide-sm">${fmtH(P.hours)}</th><th class="num hide-sm">${euro0(P.cost)}</th><th class="num"><b class="kp ${goalColor('pct', P.pct, st)}">${pct1(P.pct)}</b></th><th class="num hide-sm">${fmtH(W.hours)}</th></tr></tfoot></table></div>
    </section>
    <section class="card pad dsect">
      <h2>Per functie</h2>
      ${posRows.length ? `<div class="table-wrap"><table class="list"><thead><tr><th>Functie</th><th class="num">Uren</th><th class="num">Kosten</th><th class="num hide-sm">Kosten per uur</th><th class="num">Aandeel</th></tr></thead>
      <tbody>${posRows.map(({ p, k }) => `<tr><td>${esc(p)}</td><td class="num">${fmtH(k.hours)}</td><td class="num">${euro0(k.cost)}</td><td class="num hide-sm"><span class="${goalColor('hour', k.perHour, st)}">${k.perHour != null && k.cost ? euro(k.perHour) : '—'}</span></td><td class="num">${P.cost ? pct1(k.cost / P.cost * 100) : '—'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">Nog geen diensten deze week.</p>'}
    </section>`;
  fillAnnFiles(el);
  if (S.refocus) { const { attr, date } = S.refocus; S.refocus = null; const ins = $$(`[${attr}]`, el); const i = ins.findIndex(x => x.getAttribute(attr) === date); const nx = ins[i + 1]; if (nx) nx.focus(); }
  el.onclick = ev => {
    if (ev.target.closest('[data-annnew]')) return annDialog();
    if (ev.target.closest('[data-annallmgr]')) return annAllDialog(board, emps, true);
    const ae = ev.target.closest('[data-annedit]'); if (ae) return annDialog(board.list.find(a => a.id === ae.dataset.annedit));
    const ar = ev.target.closest('[data-annreads]'); if (ar) return annReadsDialog(board.list.find(a => a.id === ar.dataset.annreads), board.reads, emps);
    const dw = ev.target.closest('[data-dw]');
    if (dw) { const n = Number(dw.dataset.dw); S.dashWeek = n ? addDays(S.dashWeek, 7 * n) : mondayOf(new Date()); return rerender(); }
    if (ev.target.closest('[data-gosettings2]')) return go('instellingen');
    const g = ev.target.closest('[data-goto2]');
    if (g) {
      let v = g.dataset.goto2;
      if (v === 'lijsten-gisteren') { S.lDate = iso(addDays(new Date(), -1)); v = 'lijsten'; }
      if (v === 'planning' || v === 'klokken') S.week = S.dashWeek;
      if (v === 'planning-later') { const c = ahead.filter(x => !x.published && x.date > to).sort((a, b) => a.date.localeCompare(b.date))[0]; S.week = c ? mondayOf(parse(c.date)) : S.dashWeek; v = 'planning'; }
      return openView(v);
    }
    if (ev.target.closest('[data-myagenda]')) return agendaDialog(shifts.filter(x => x.employee_id === S.me.id && x.published));
  };
  el.onkeydown = ev => { if (ev.target.matches('.revin')) S.lastKey = ev.key; };
  el.onchange = async ev => {
    const f2 = ev.target.closest('[data-revf]'), a2 = ev.target.closest('[data-reva]');
    const t = f2 || a2; if (!t) return;
    if (['Tab', 'Enter'].includes(S.lastKey)) S.refocus = { attr: f2 ? 'data-revf' : 'data-reva', date: t.dataset.revf || t.dataset.reva, back: S.lastKey === 'Tab' && ev.shiftKey };
    S.lastKey = null;
    const v = t.value.trim(), val = v === '' ? null : Math.max(0, Number(v) || 0);
    await store.saveRevenue(t.dataset.revf || t.dataset.reva, f2 ? { forecast: val } : { actual: val });
    rerender();
  };
}

/* ================= Verlof en het rooster ================= */
// Keuze wat er met ingeplande diensten gebeurt als verlof wordt goedgekeurd
const notStarted = c => c.filter(s => shiftWindow(s)[0] > new Date());
function conflictChoice(c0, { keep = true } = {}) {
  const c = notStarted(c0), past = c0.length - c.length;
  if (!c.length) return past ? `<p class="hint">${past} dienst${past > 1 ? 'en' : ''} in deze periode ${past > 1 ? 'zijn' : 'is'} al begonnen of voorbij en ${past > 1 ? 'blijven' : 'blijft'} gewoon staan.</p>` : '';
  const sorted = c.slice().sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
  const show = sorted.slice(0, 6).map(s => `${esc(fmtShort(s.date))} ${hm(s.start_time)}–${hm(s.end_time)}`).join(', ');
  return `<div class="warnbox">Staat nog ${c.length}× ingepland: ${show}${c.length > 6 ? ` en nog ${c.length - 6} meer, t/m ${esc(fmtShort(sorted[sorted.length - 1].date))}` : ''}.</div>
    <fieldset class="choice"><legend>Wat moet er met ${c.length > 1 ? 'deze diensten' : 'deze dienst'} gebeuren?</legend>
      <label class="check"><input type="radio" name="conflict" value="open" checked> <span><strong>Open dienst van maken</strong><br><span class="hint">Collega's kunnen zich aanmelden; jij kiest wie hem krijgt.</span></span></label>
      <label class="check"><input type="radio" name="conflict" value="delete"> <span><strong>Verwijderen</strong><br><span class="hint">De dienst vervalt helemaal.</span></span></label>
      ${keep ? '<label class="check"><input type="radio" name="conflict" value="keep"> <span><strong>Laten staan</strong><br><span class="hint">Je past het later zelf aan in de planning.</span></span></label>' : ''}
    </fieldset>${past ? `<p class="hint">${past} dienst${past > 1 ? 'en' : ''} die al begonnen ${past > 1 ? 'zijn' : 'is'} of voorbij ${past > 1 ? 'zijn' : 'is'}, ${past > 1 ? 'blijven' : 'blijft'} gewoon staan.</p>` : ''}`;
}
async function resolveConflicts(c0, how) {
  const c = notStarted(c0);
  if (!c.length || !how || how === 'keep') return c.length ? ' · diensten staan nog in het rooster' : '';
  await store.bulkShifts(c.map(x => x.id), how === 'delete' ? 'delete' : 'open');
  return how === 'delete' ? ` · ${c.length} dienst${c.length > 1 ? 'en' : ''} verwijderd` : ` · ${c.length} open dienst${c.length > 1 ? 'en' : ''} gemaakt`;
}

/* ================= Lijsten (afvinken met naam en tijd, temperaturen, registraties) ================= */
const MOMENT = { opening: 'Opening', sluiting: 'Sluiting', dag: 'Vandaag', week: 'Deze week', maand: 'Deze maand' };
const periodOf = (moment, ds) => moment === 'week' ? iso(mondayOf(parse(ds))) : moment === 'maand' ? ds.slice(0, 7) : ds;
const tTime = ts => new Date(ts).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
const LOGK = { ontvangst: '📦 Ontvangst goederen', kern: '🌡️ Kerntemperatuur', melding: '⚠️ Melding' };
const MELD = { gebrek: 'Technisch gebrek', incident: 'Incident of ongeval', klacht: 'Klacht van een gast', ongedierte: 'Ongedierte' };
// welke lijsten horen bij mij: mijn functie + lijsten voor iedereen; leiding ziet alles
const myLists = (lists, dep) => lists.filter(l => l.active !== false && (dep === 'alle' ? true : dep ? (!l.department || l.department === dep) : (canPlan() || !l.department || l.department === S.me.position)));

async function viewLijsten(el) {
  const today = todayIso();
  if (!canPlan() || !S.lDate) S.lDate = today;
  const ds = S.lDate, lead = canPlan();
  S.lDep ??= lead ? 'alle' : '';
  if (S.lKey !== ds + S.lDep) { S.lKey = ds + S.lDep; S.lOpen = null; }   // andere dag of afdeling: standaard open/dicht
  const [lists0, emps] = await Promise.all([store.checklists(), store.employees()]);
  const lists = myLists(lists0, lead ? S.lDep : '');
  const periods = [...new Set(lists.map(l => periodOf(l.moment, ds)))];
  const [ticks, logs] = await Promise.all([store.ticks(periods), store.logs(ds, ds)]);
  const byId = Object.fromEntries(emps.map(e => [e.id, e]));
  const fn = id => (byId[id]?.name || '?').split(' ')[0];
  const tk = (l, it) => ticks.find(t => t.checklist_id === l.id && t.period === periodOf(l.moment, ds) && t.item_id === it.id);
  const past = ds < today;
  const card = l => {
    const items = l.items || [], done = items.filter(it => tk(l, it)).length, full = items.length && done === items.length;
    const flagged = items.some(it => tk(l, it)?.flagged);
    const stat = full ? `<span class="pill ok">Klaar ✓</span>` : past && l.moment !== 'week' && l.moment !== 'maand' ? `<span class="pill bad">Niet afgemaakt</span>` : `<span class="pill">${done}/${items.length}</span>`;
    const rows = items.map(it => {
      const t = tk(l, it), mine = t && t.employee_id === S.me.id;
      const undo = t && !past && (mine || lead) ? `<button type="button" class="linkbtn small" data-untick="${t.id}" aria-label="Vinkje weghalen">ongedaan</button>` : '';
      const who = t ? `<span class="who">${esc(fn(t.employee_id))} · ${tTime(t.at)}</span>` : '';
      if (l.kind === 'temp') {
        const norm = it.max != null && it.max !== '' ? `max ${it.max} °C` : it.min != null && it.min !== '' ? `min ${it.min} °C` : '';
        return `<div class="lrow temp ${t ? 'done' : ''} ${t?.flagged ? 'flag' : ''}"><span class="lbl">${esc(it.label)}<small>${norm}</small></span>
          ${t ? `<span class="tval">${String(t.value).replace('.', ',')} °C${t.flagged ? ' ⚠' : ''}</span>${who}${undo}`
              : past ? '<span class="missed">niet gemeten</span>' : `<form class="tform" data-temp="${l.id}|${it.id}"><input name="v" type="text" inputmode="decimal" placeholder="°C" aria-label="Temperatuur ${esc(it.label)}" required><button class="btn sm primary">Opslaan</button></form>`}</div>`;
      }
      return `<div class="lrow ${t ? 'done' : ''}">${t || past ? `<span class="box ${t ? 'on' : 'miss'}" aria-hidden="true">${t ? '✓' : ''}</span>` : `<button type="button" class="box" data-tick="${l.id}|${it.id}" aria-label="Afvinken: ${esc(it.label)}"></button>`}
        <span class="lbl" ${!t && !past ? `data-tick="${l.id}|${it.id}"` : ''}>${esc(it.label)}</span>${t ? who + undo : past ? '<span class="missed">niet gedaan</span>' : ''}</div>`;
    }).join('');
    const isOpen = S.lOpen ? S.lOpen.has(l.id) : (!lead && l.id === firstOpen);
    return `<details class="card lcard ${full ? 'full' : ''} ${flagged ? 'flag' : ''}" ${isOpen ? 'open' : ''} data-list="${l.id}">
      <summary><span class="lname">${esc(l.name)}${l.department ? ` <small>${esc(l.department)}</small>` : ''}</span>${stat}</summary>
      <div class="lrows">${rows || '<p class="hint">Nog geen onderdelen. Voeg ze toe bij Instellingen.</p>'}</div></details>`;
  };
  // medewerkers: alleen de eerste lijst die nog niet af is staat open; de rest ingeklapt (blijft zo bij het afvinken)
  const firstOpen = lists.filter(l => ['opening', 'dag', 'sluiting'].includes(l.moment)).sort((a, b) => (['opening', 'dag', 'sluiting'].indexOf(a.moment) - ['opening', 'dag', 'sluiting'].indexOf(b.moment)) || a.sort - b.sort)
    .find(l => (l.items || []).some(it => !tk(l, it)))?.id;
  const group = (title, ls) => ls.length ? `<section class="lgroup"><h2>${title}</h2>${ls.map(card).join('')}</section>` : '';
  const dayLists = lists.filter(l => ['opening', 'dag', 'sluiting'].includes(l.moment)).sort((a, b) => (['opening', 'dag', 'sluiting'].indexOf(a.moment) - ['opening', 'dag', 'sluiting'].indexOf(b.moment)) || a.sort - b.sort);
  const logRow = x => `<li class="logrow ${x.flagged && !x.resolved_at ? 'flag' : ''}"><strong>${LOGK[x.kind]}</strong> · ${tTime(x.at)} · ${esc(fn(x.employee_id))}<br>${logText(x)}${x.resolved_at ? `<br><span class="muted small">✓ Afgehandeld door ${esc(fn(x.resolved_by))}${x.resolution ? `: ${esc(x.resolution)}` : ''}</span>` : lead && x.kind === 'melding' ? ` <button type="button" class="btn sm" data-resolve="${x.id}">Afhandelen</button>` : ''}</li>`;
  const deps = ['alle', ...CFG.posities];
  el.innerHTML = `
    <div class="page-head"><div><h1>Lijsten</h1><p>${lead ? 'Wie wat afvinkt, met tijd. Rood = niet gedaan of buiten de norm.' : 'Vink af wat je gedaan hebt. Je naam en de tijd worden bewaard.'}</p></div>
      ${lead ? `<div class="weeknav"><button class="btn icon" data-lday="-1" aria-label="Vorige dag">‹</button><div class="label"><strong>${ds === today ? 'Vandaag' : esc(fmtLong(ds))}</strong><span>${ds === today ? esc(fmtLong(ds)) : ''}</span></div><button class="btn icon" data-lday="1" aria-label="Volgende dag" ${ds >= today ? 'disabled' : ''}>›</button></div>` : ''}</div>
    ${lead ? `<div class="filters ldeps">${deps.map(d => `<button type="button" class="${S.lDep === d ? 'active' : ''}" data-ldep="${esc(d)}">${d === 'alle' ? 'Alles' : esc(d)}</button>`).join('')}</div>` : ''}
    <div class="logbtns"><button class="btn" data-newlog="ontvangst">📦 Ontvangst goederen</button><button class="btn" data-newlog="kern">🌡️ Kerntemperatuur</button><button class="btn" data-newlog="melding">⚠️ Melding maken</button></div>
    ${group(ds === today ? 'Vandaag' : 'Deze dag', dayLists)}
    ${group('Deze week', lists.filter(l => l.moment === 'week'))}
    ${group('Deze maand', lists.filter(l => l.moment === 'maand'))}
    ${!lists.length ? '<div class="card empty">Er zijn nog geen lijsten voor jouw functie.</div>' : ''}
    <section class="lgroup"><h2>Registraties ${ds === today ? 'vandaag' : 'deze dag'}</h2>${logs.length ? `<ul class="card loglist">${logs.map(logRow).join('')}</ul>` : '<p class="hint">Nog niets geregistreerd.</p>'}</section>
    ${lead ? '<section class="lgroup" data-lopen></section><section class="lgroup" data-lstats></section>' : ''}`;
  if (lead) fillLeadPanels(el, byId, fn).catch(() => {});

  const tickIt = async (cid, iid, value) => {
    const l = lists.find(x => x.id === cid);
    try { await store.tick({ checklist_id: cid, period: periodOf(l.moment, ds), item_id: iid, ...(value != null ? { value } : {}) }); }
    catch (e) { return toast(/duplicate|unique|23505/i.test(errMsg(e) + (e.code || '')) ? 'Iemand anders heeft dit net afgevinkt' : errMsg(e), 'error'); }
    rerender();
  };
  if (!el.dataset.lToggle) { el.dataset.lToggle = '1'; el.addEventListener('toggle', ev => { if (S.view === 'lijsten' && ev.target.matches('details.lcard')) S.lOpen = new Set($$('details.lcard[open]', el).map(d => d.dataset.list)); }, true); }
  el.onclick = async ev => {
    const t = ev.target.closest('[data-tick]'); if (t) { const [c, i] = t.dataset.tick.split('|'); return tickIt(c, i); }
    const u = ev.target.closest('[data-untick]'); if (u) { try { await store.untick(u.dataset.untick); } catch (e) { return toast(errMsg(e), 'error'); } return rerender(); }
    const d = ev.target.closest('[data-lday]'); if (d) { S.lDate = iso(addDays(parse(ds), Number(d.dataset.lday))); if (S.lDate > today) S.lDate = today; return rerender(); }
    const dp = ev.target.closest('[data-ldep]'); if (dp) { S.lDep = dp.dataset.ldep; return rerender(); }
    const nl = ev.target.closest('[data-newlog]'); if (nl) return logDialog(nl.dataset.newlog);
    const r = ev.target.closest('[data-resolve]'); if (r) return resolveDialog(r.dataset.resolve);
    if (ev.target.closest('[data-gosettings2]')) return go('instellingen');
  };
  el.onsubmit = ev => {
    const f = ev.target.closest('[data-temp]'); if (!f) return;
    ev.preventDefault();
    const v = Number(String(f.v.value).replace(',', '.').trim());
    if (!f.v.value.trim() || Number.isNaN(v) || v < -40 || v > 120) return toast('Vul een geldige temperatuur in, bijvoorbeeld 4 of -18', 'error');
    const [c, i] = f.dataset.temp.split('|'); tickIt(c, i, v);
  };
}
const logText = x => {
  const d = x.data || {};
  if (x.kind === 'ontvangst') return `${esc(d.leverancier || '')}${d.product ? ' · ' + esc(d.product) : ''}${d.temp !== '' && d.temp != null ? ` · ${esc(String(d.temp).replace('.', ','))} °C` : ''} · ${d.ok === false || d.ok === 'false' ? `<b class="bad">afgekeurd</b>${d.reden ? ': ' + esc(d.reden) : ''}` : 'goedgekeurd'}`;
  if (x.kind === 'kern') return `${esc(d.product || '')} · ${esc(String(d.temp ?? '').replace('.', ','))} °C${x.flagged ? ' <b class="bad">te laag (min. 75 °C)</b>' : ''}${d.terug ? ` · terugkoelen: ${esc(String(d.terug).replace('.', ','))} °C na 5 uur` : ''}`;
  return `<b>${esc(MELD[d.soort] || 'Melding')}</b>: ${esc(d.tekst || '')}`;
};
async function fillLeadPanels(el, byId, fn) {
  const since = iso(addDays(new Date(), -30));
  const [open, recent, lists] = await Promise.all([store.logs(iso(addDays(new Date(), -180)), todayIso(), true), store.ticksSince(since), store.checklists()]);
  const op = $('[data-lopen]', el), st = $('[data-lstats]', el); if (!op || !st) return;
  op.innerHTML = open.length ? `<h2>Openstaande meldingen <span class="muted">(${open.length})</span></h2><ul class="card loglist">${open.map(x => `<li class="logrow flag"><strong>${LOGK[x.kind]}</strong> · ${esc(fmtShort(iso(new Date(x.at))))} ${tTime(x.at)} · ${esc(fn(x.employee_id))}<br>${logText(x)} <button type="button" class="btn sm" data-resolve="${x.id}">Afhandelen</button></li>`).join('')}</ul>` : '';
  const per = {};
  recent.forEach(t => { const p = (per[t.employee_id] ||= { n: 0, flag: 0, last: '' }); p.n++; if (t.flagged) p.flag++; if (t.at > p.last) p.last = t.at; });
  const rows = Object.entries(per).sort((a, b) => b[1].n - a[1].n);
  st.innerHTML = `<h2>Wie vinkt af <span class="muted">(laatste 30 dagen)</span></h2>${rows.length ? `<div class="table-wrap card"><table class="table"><thead><tr><th>Medewerker</th><th class="num">Vinkjes</th><th class="num">Buiten de norm</th><th class="num hide-sm">Laatst</th></tr></thead><tbody>${rows.map(([id, p]) => `<tr><td>${esc(byId[id]?.name || '?')}</td><td class="num">${p.n}</td><td class="num">${p.flag || '—'}</td><td class="num hide-sm">${esc(fmtShort(iso(new Date(p.last))))} ${tTime(p.last)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">Nog niets afgevinkt.</p>'}
    <p class="hint">Lijsten aanpassen (taken, koelingen, afdeling) doe je bij <button class="linkbtn" data-gosettings2>Instellingen</button>. ${lists.filter(l => l.active !== false).length} actieve lijsten.</p>`;
}
function logDialog(kind) {
  const body = kind === 'ontvangst' ? `
      <label class="field">Leverancier<input name="leverancier" required maxlength="60" placeholder="bv. Sligro"></label>
      <label class="field">Product(en)<input name="product" maxlength="120" placeholder="bv. vis, zuivel"></label>
      <div class="row keep"><label class="field">Temperatuur (°C)<input name="temp" inputmode="decimal" placeholder="bv. 3"></label><label class="field">Norm max (°C)<input name="max" inputmode="decimal" value="7"></label></div>
      <label class="check"><input type="checkbox" name="tht" checked> Houdbaarheid en verpakking in orde</label>
      <fieldset class="choice"><legend>Oordeel</legend><label class="check"><input type="radio" name="ok" value="true" checked> Goedgekeurd</label><label class="check"><input type="radio" name="ok" value="false"> Afgekeurd</label></fieldset>
      <label class="field">Reden bij afkeuren<input name="reden" maxlength="160"></label>`
    : kind === 'kern' ? `
      <label class="field">Product<input name="product" required maxlength="80" placeholder="bv. kippendij"></label>
      <label class="field">Kerntemperatuur (°C)<input name="temp" required inputmode="decimal" placeholder="minimaal 75"></label>
      <label class="field">Terugkoelen: temperatuur na 5 uur (°C, optioneel)<input name="terug" inputmode="decimal" placeholder="maximaal 7"></label>`
    : `<label class="field">Soort<select name="soort">${Object.entries(MELD).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label class="field">Wat is er aan de hand?<textarea name="tekst" required maxlength="600" rows="4" placeholder="Wat, waar en wanneer. Bij een klacht: tafel en wat de gast zei."></textarea></label>
      <p class="hint" style="margin:0">De directie en shiftleaders krijgen meteen een melding.</p>`;
  openDialog(LOGK[kind], body + `<div class="dlg-foot"><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">Opslaan</button></div>`, {
    async onSubmit(fd) {
      const num = k => { const v = String(fd.get(k) || '').replace(',', '.').trim(); if (v === '') return ''; const n = Number(v); if (Number.isNaN(n)) throw new Error('Vul bij temperatuur alleen een getal in'); return n; };
      let data;
      if (kind === 'ontvangst') data = { leverancier: fd.get('leverancier').trim(), product: fd.get('product').trim(), temp: num('temp'), max: num('max'), tht: fd.get('tht') === 'on', ok: fd.get('ok') === 'true' && fd.get('tht') === 'on', reden: fd.get('reden').trim() || (fd.get('tht') !== 'on' ? 'houdbaarheid of verpakking niet in orde' : '') };
      else if (kind === 'kern') data = { product: fd.get('product').trim(), temp: num('temp'), terug: num('terug') };
      else data = { soort: fd.get('soort'), tekst: fd.get('tekst').trim() };
      await store.addLog(kind, data);
      toast('Opgeslagen'); rerender();
    },
  });
}
function resolveDialog(id) {
  openDialog('Melding afhandelen', `<label class="field">Wat is er gedaan?<input name="r" maxlength="200" placeholder="bv. Monteur komt dinsdag"></label>
    <div class="dlg-foot"><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">Afgehandeld</button></div>`, {
    async onSubmit(fd) { await store.resolveLog(id, String(fd.get('r') || '').trim() || null); toast('Afgehandeld'); rerender(); },
  });
}
// kaartje op Mijn rooster: wat staat er vandaag voor mij open
async function listsHomeHTML() {
  try {
    const today = todayIso(), lists = myLists(await store.checklists(), '');
    if (!lists.length) return '';
    const ticks = await store.ticks([...new Set(lists.map(l => periodOf(l.moment, today)))]);
    const st = lists.filter(l => ['opening', 'dag', 'sluiting'].includes(l.moment)).map(l => { const n = (l.items || []).length, d = (l.items || []).filter(it => ticks.some(t => t.checklist_id === l.id && t.period === today && t.item_id === it.id)).length; return { l, n, d }; });
    const open = st.filter(x => x.d < x.n);
    return `<button type="button" class="card lhome" data-golists><span><strong>📋 Lijsten vandaag</strong><small>${open.length ? open.slice(0, 3).map(x => `${esc(x.l.name)} ${x.d}/${x.n}`).join(' · ') : 'Alles afgevinkt ✓'}</small></span><span class="chev">›</span></button>`;
  } catch (e) { return ''; }
}
// lijst bewerken (directie)
function listDialog(l = {}) {
  const isNew = !l.id, items = l.items || [];
  const lines = items.map(it => l.kind === 'temp' ? `${it.label} | ${it.max ?? ''}` : it.label).join('\n');
  openDialog(isNew ? 'Nieuwe lijst' : 'Lijst bewerken', `
    <label class="field">Naam<input name="name" required maxlength="80" value="${esc(l.name || '')}" placeholder="bv. Opening bediening"></label>
    <div class="row keep">
      <label class="field">Voor wie<select name="department"><option value="">Iedereen</option>${CFG.posities.map(p => `<option ${l.department === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
      <label class="field">Wanneer<select name="moment">${Object.entries({ opening: 'Bij opening', sluiting: 'Bij sluiting', dag: 'Elke dag', week: 'Elke week', maand: 'Elke maand' }).map(([k, v]) => `<option value="${k}" ${(l.moment || 'opening') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    </div>
    <label class="field">Soort<select name="kind"><option value="check" ${l.kind !== 'temp' ? 'selected' : ''}>Afvinken</option><option value="temp" ${l.kind === 'temp' ? 'selected' : ''}>Temperaturen meten</option></select></label>
    <label class="field">Onderdelen (één per regel)<textarea name="items" rows="10" required placeholder="Afvinken: één taak per regel.\nTemperaturen: naam | max, bv.\nK1 Koelcel | 7\nV1 Vriezer | -18">${esc(lines)}</textarea></label>
    <p class="hint" style="margin:0">Bij temperaturen: zet na een | de hoogst toegestane temperatuur. Daarboven krijgen directie en shiftleaders een melding.</p>
    <label class="check"><input type="checkbox" name="active" ${l.active !== false ? 'checked' : ''}> Actief</label>
    <div class="dlg-foot">${isNew ? '' : '<button class="btn danger" value="delete" formnovalidate>Verwijderen</button>'}<span class="spacer"></span><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">Opslaan</button></div>`, {
    async onSubmit(fd, action) {
      if (action === 'delete') { if (!await ask(`Lijst "${l.name}" verwijderen? Ook alle vinkjes van deze lijst verdwijnen. Tip: zet hem liever op niet actief.`, 'Verwijderen')) throw 'cancel'; await store.deleteChecklist(l.id); toast('Lijst verwijderd'); return rerender(); }
      const kind = fd.get('kind');
      const old = Object.fromEntries(items.map(it => [it.label.toLowerCase(), it.id]));
      const parsed = String(fd.get('items')).split('\n').map(x => x.trim()).filter(Boolean).slice(0, 80).map(x => {
        const [lab, mx] = kind === 'temp' ? x.split('|').map(y => y.trim()) : [x];
        const label = lab.slice(0, 120), id = old[label.toLowerCase()] || 'i' + uid().replace(/-/g, '').slice(0, 10);
        if (kind !== 'temp') return { id, label };
        const m = String(mx ?? '').replace(',', '.'); if (m !== '' && Number.isNaN(Number(m))) throw new Error(`Bij "${label}" staat na de | geen getal`);
        return { id, label, max: m === '' ? null : Number(m) };
      });
      if (!parsed.length) throw new Error('Zet minstens één onderdeel in de lijst');
      await store.saveChecklist({ ...(l.id ? { id: l.id } : { sort: 999 }), name: fd.get('name').trim(), department: fd.get('department'), moment: fd.get('moment'), kind, items: parsed, active: fd.get('active') === 'on' });
      toast('Lijst opgeslagen'); rerender();
    },
  });
}

/* ================= Instellingen (directie) ================= */
async function viewSettings(el) {
  const st = await store.settings();
  applySettings(st);
  const pos = [...CFG.posities];
  const tpl = CFG.diensten.map(d => ({ ...d }));
  const T = Object.assign({ avondVan: '20:00', avondTot: '24:00', nachtVan: '00:00', nachtTot: '06:00' }, CFG.toeslagen);
  const pf = (k, l, d) => `<label class="field">${l}<input type="number" name="${k}" min="0" max="300" step="0.5" value="${st[k] ?? d}"></label>`;
  const tf = (k, l) => `<label class="field">${l}<input type="time" name="${k}" value="${esc(T[k] === '24:00' ? '23:59' : T[k])}" required></label>`;
  const dayRow = d => `<div class="spdrow"><label class="field">Datum<input type="date" name="date" value="${esc(d.date || '')}" required></label><label class="field">Omschrijving<input name="label" value="${esc(d.label || '')}" maxlength="40" placeholder="bv. Kerstavond" required></label><label class="field">Soort<select name="kind"><option value="gesloten" ${d.kind !== 'feestdag' ? 'selected' : ''}>Gesloten</option><option value="feestdag" ${d.kind === 'feestdag' ? 'selected' : ''}>Feestdag (toeslag)</option></select></label><button type="button" class="btn ghost sm" data-spddel aria-label="Verwijderen">✕</button></div>`;
  const tplRow = (d, i) => `<div class="tplrow" data-i="${i}"><label class="field">Naam<input name="label" value="${esc(d.label || '')}" required maxlength="30"></label><label class="field">Van<input type="time" name="start" value="${esc(d.start || '')}" required></label><label class="field">Tot<input type="time" name="end" value="${esc(d.end || '')}" required></label><label class="field">Pauze (min)<input type="number" name="pauze" min="0" max="240" step="5" value="${Number(d.pauze) || 0}"></label><button type="button" class="btn ghost sm" data-tpldel="${i}" aria-label="Verwijderen">✕</button></div>`;
  el.innerHTML = `
    <div class="page-head"><div><h1>Instellingen</h1><p>Pas de app aan aan hoe jullie werken. Wijzigingen gelden meteen voor iedereen.</p></div></div>
    <div class="settings">
      <section class="card pad">
        <h2>Functies</h2>
        <p class="hint">De functies waarvoor je inplant, zoals Bediening, Keuken of Afwas. Bestaande diensten en medewerkers houden hun functie als je er een weghaalt.</p>
        <div class="poslist">${pos.map((p, i) => `<span class="pill">${esc(p)} <button type="button" class="linkbtn small" data-posdel="${i}" aria-label="${esc(p)} verwijderen">✕</button></span>`).join('') || '<span class="muted small">Nog geen functies.</span>'}</div>
        <form class="addrow" data-posadd><input class="input" name="pos" placeholder="Nieuwe functie, bv. Afwas" maxlength="30" required><button class="btn">Toevoegen</button></form>
      </section>

      <section class="card pad">
        <h2>Lijsten</h2>
        <p class="hint">Opening- en sluitlijsten, temperaturen en schoonmaak. Medewerkers zien de lijsten van hun eigen functie; elk vinkje bewaart naam en tijd.</p>
        <div class="lsetlist">${(await store.checklists()).map(l => `<button type="button" class="lsetrow ${l.active === false ? 'off' : ''}" data-ledit="${l.id}"><span><strong>${esc(l.name)}</strong><small>${esc(l.department || 'Iedereen')} · ${esc({ opening: 'bij opening', sluiting: 'bij sluiting', dag: 'elke dag', week: 'elke week', maand: 'elke maand' }[l.moment])} · ${(l.items || []).length} onderdelen${l.active === false ? ' · niet actief' : ''}</small></span><span class="chev">›</span></button>`).join('')}</div>
        <div class="actions" style="margin-top:10px"><button type="button" class="btn" data-lnew>+ Nieuwe lijst</button></div>
      </section>

      <section class="card pad">
        <h2>Snelkeuze-diensten</h2>
        <p class="hint">Deze diensten staan als knoppen in het inplanvenster, zodat je met één tik de tijden invult. De eerste is de standaard bij een nieuwe dienst.</p>
        <form data-tplform><div class="tpllist">${tpl.map(tplRow).join('')}</div>
          <div class="actions" style="margin-top:10px"><button type="button" class="btn" data-tpladd>+ Dienst toevoegen</button><button class="btn primary">Opslaan</button></div></form>
      </section>

      <section class="card pad">
        <h2>Bezetting per dag</h2>
        <p class="hint">Hoeveel mensen je per functie nodig hebt. De planning laat per dag zien of je genoeg mensen hebt ingepland, bijvoorbeeld <span class="covp short">Bediening 2/4</span>. Leeg of 0 betekent: geen norm.</p>
        <form data-staffform>
          <div class="table-wrap"><table class="stafftable">
            <thead><tr><th></th>${pos.map(p => `<th>${esc(p)}</th>`).join('')}</tr></thead>
            <tbody>${DAG.map((dn, wd) => `<tr><th>${dn}</th>${pos.map(p => `<td><input type="number" min="0" max="50" inputmode="numeric" data-staff="${wd}" data-pos="${esc(p)}" value="${(st.staffing || {})[wd]?.[p] || ''}"></td>`).join('')}</tr>`).join('')}</tbody>
            <tfoot><tr><th title="Optioneel">1 per … gasten</th>${pos.map(p => `<td><input type="number" min="0" max="500" inputmode="numeric" data-ratio="${esc(p)}" value="${(st.guest_ratios || {})[p] || ''}" placeholder="–"></td>`).join('')}</tr></tfoot>
          </table></div>
          <p class="hint" style="margin-top:8px"><strong>Optioneel, de onderste regel:</strong> vul je bijvoorbeeld 20 in bij Bediening, dan kun je in de planning per dag het aantal gasten of reserveringen invullen. De app rekent dan uit hoeveel mensen je nodig hebt: 80 gasten is 4 bediening. De norm per weekdag blijft het minimum.</p>
          <div class="actions"><button class="btn primary">Opslaan</button></div>
        </form>
      </section>

      <section class="card pad">
        <h2>Gesloten dagen en extra feestdagen</h2>
        <p class="hint">Gesloten dagen zie je in de planning; een dienst op zo'n dag krijgt een waarschuwing. Extra feestdagen tellen mee voor de feestdagtoeslag, net als de wettelijke feestdagen.</p>
        <form data-dayform><div class="daylist2">${(CFG.specialDays || []).slice().sort((a, b) => a.date.localeCompare(b.date)).map(dayRow).join('')}</div>
          <div class="actions" style="margin-top:10px"><button type="button" class="btn" data-dayadd>+ Dag toevoegen</button><button class="btn primary">Opslaan</button></div></form>
      </section>

      <section class="card pad">
        <h2>Doelen voor personeelskosten</h2>
        <p class="hint">De planning en het Overzicht kleuren groen (op doel), geel (net erover) of rood. Leeg laten = geen doel.</p>
        <form data-goalform>
          <div class="row keep">
            <label class="field">Personeelskosten, % van omzet<input type="number" name="goal_labor_pct" min="0" max="100" step="0.5" value="${st.goal_labor_pct ?? ''}" placeholder="bv. 30"></label>
            <label class="field">Productiviteit, omzet per uur (€)<input type="number" name="goal_productivity" min="0" step="1" value="${st.goal_productivity ?? ''}" placeholder="bv. 60"></label>
          </div>
          <label class="field">Personeelskosten per uur (€)<input type="number" name="goal_cost_hour" min="0" step="0.5" value="${st.goal_cost_hour ?? ''}" placeholder="bv. 22"></label>
          <div class="actions"><button class="btn primary">Opslaan</button></div>
        </form>
      </section>

      <section class="card pad">
        <h2>Toeslagen en loonkosten</h2>
        <p class="hint">Voor de urenexport en de loonkosten in de planning. Valt een uur onder meerdere toeslagen, dan telt de hoogste. Vraag de juiste percentages aan je salarisadministratie.</p>
        <form data-loonform>
          <div class="row keep">${tf('avondVan', 'Avond vanaf')}${tf('avondTot', 'Avond tot')}</div>
          <div class="row keep">${tf('nachtVan', 'Nacht vanaf')}${tf('nachtTot', 'Nacht tot')}</div>
          <div class="row keep">${pf('pct_avond', 'Avondtoeslag %', 0)}${pf('pct_nacht', 'Nachttoeslag %', 0)}</div>
          <div class="row keep">${pf('pct_zondag', 'Zondagtoeslag %', 0)}${pf('pct_feestdag', 'Feestdagtoeslag %', 0)}</div>
          <div class="row keep">${pf('pct_vakantiegeld', 'Vakantiegeld %', 8)}${pf('pct_werkgever', 'Werkgeverslasten % (indicatie)', 25)}</div>
          <div class="actions"><button class="btn primary">Opslaan</button></div>
        </form>
      </section>

      <section class="card pad">
        <h2>Publiceren, ruilen en klokken</h2>
        <label class="check"><input type="checkbox" data-set="mail_on_publish" ${st.mail_on_publish !== false ? 'checked' : ''}> Medewerkers krijgen hun weekrooster per mail als je publiceert</label>
        <form class="sickset" data-sickform><strong>Ziekmelden: wie bellen ze?</strong><p class="hint">Dit nummer staat als belknop in het venster "Ik ben ziek".</p>
          <div class="row keep"><label class="field">Naam<input name="sick_contact" maxlength="40" value="${esc(st.sick_contact || '')}" placeholder="bv. Mark"></label><label class="field">Telefoon<input name="sick_phone" type="tel" maxlength="20" value="${esc(st.sick_phone || '')}" placeholder="06 12345678"></label></div>
          <div class="actions"><button class="btn primary">Opslaan</button></div></form>
        <label class="check"><input type="checkbox" data-set="swap_needs_approval" ${st.swap_needs_approval !== false ? 'checked' : ''}> Ruilen moet door de directie worden goedgekeurd</label>
        <div class="setline"><div><strong>Werklocatie, wifi en klokregels</strong><p class="hint">${st.lat != null ? `Locatie ingesteld, straal ${st.radius_m || 150} m` : 'Nog geen locatie'} · ${(st.wifi_ips || []).length} wifi-netwerk${(st.wifi_ips || []).length === 1 ? '' : 'en'} · planning ${st.plan_leading !== false ? 'is leidend' : 'is niet leidend'}</p></div><button type="button" class="btn" data-clockset>Aanpassen</button></div>
      </section>
    </div>`;

  const savePos = async list => { await store.saveSettings({ positions: list }); applySettings(await store.settings()); toast('Functies opgeslagen'); rerender(); };
  const readTpl = () => $$('.tplrow', el).map(r => ({ label: $('[name=label]', r).value.trim(), start: $('[name=start]', r).value, end: $('[name=end]', r).value, pauze: Number($('[name=pauze]', r).value) || 0 }));
  el.onclick = async ev => {
    const pd = ev.target.closest('[data-posdel]');
    if (pd) { const p = pos[Number(pd.dataset.posdel)]; if (await ask(`Functie "${p}" verwijderen uit de lijst?`, 'Verwijderen')) await savePos(pos.filter((_, i) => i !== Number(pd.dataset.posdel))); return; }
    if (ev.target.closest('[data-tpladd]')) {
      const list = $('.tpllist', el); const i = $$('.tplrow', el).length;
      list.insertAdjacentHTML('beforeend', tplRow({ label: '', start: '17:00', end: '23:00', pauze: 30 }, i));
      $$('.tplrow', el)[i].querySelector('[name=label]').focus(); return;
    }
    const td = ev.target.closest('[data-tpldel]'); if (td) { td.closest('.tplrow').remove(); return; }
    if (ev.target.closest('[data-dayadd]')) { $('.daylist2', el).insertAdjacentHTML('beforeend', dayRow({ date: '', label: '', kind: 'gesloten' })); $$('.spdrow', el).pop().querySelector('[name=date]').focus(); return; }
    const sd = ev.target.closest('[data-spddel]'); if (sd) { sd.closest('.spdrow').remove(); return; }
    if (ev.target.closest('[data-clockset]')) return settingsDialog(st);
    const le = ev.target.closest('[data-ledit]'); if (le) { const l = (await store.checklists()).find(x => x.id === le.dataset.ledit); if (l) listDialog(l); return; }
    if (ev.target.closest('[data-lnew]')) return listDialog({});
  };
  el.onchange = async ev => {
    const k = ev.target.dataset.set; if (!k) return;
    await store.saveSettings({ [k]: ev.target.checked }); toast('Opgeslagen');
  };
  $('[data-posadd]', el).onsubmit = async ev => {
    ev.preventDefault(); const v = ev.target.pos.value.trim(); if (!v) return;
    if (pos.some(p => p.toLowerCase() === v.toLowerCase())) return toast('Deze functie bestaat al', 'error');
    await savePos([...pos, v]);
  };
  $('[data-tplform]', el).onsubmit = async ev => {
    ev.preventDefault();
    const list = readTpl();
    if (list.some(d => !d.label || !d.start || !d.end)) return toast('Vul bij elke dienst een naam, begin- en eindtijd in', 'error');
    if (list.some(d => d.start === d.end)) return toast('Begin- en eindtijd mogen niet gelijk zijn', 'error');
    await store.saveSettings({ shift_templates: list }); applySettings(await store.settings()); toast('Snelkeuze-diensten opgeslagen'); rerender();
  };
  $('[data-sickform]', el).onsubmit = async ev => {
    ev.preventDefault(); const fd = new FormData(ev.target);
    await store.saveSettings({ sick_contact: String(fd.get('sick_contact') || '').trim() || null, sick_phone: String(fd.get('sick_phone') || '').trim() || null });
    applySettings(await store.settings()); toast('Opgeslagen');
  };
  $('[data-goalform]', el).onsubmit = async ev => {
    ev.preventDefault(); const fd = new FormData(ev.target);
    const n = k => { const v = String(fd.get(k) || '').trim().replace(',', '.'); return v === '' ? null : Math.max(0, Number(v) || 0); };
    await store.saveSettings({ goal_labor_pct: n('goal_labor_pct'), goal_productivity: n('goal_productivity'), goal_cost_hour: n('goal_cost_hour') }); toast('Doelen opgeslagen'); rerender();
  };
  $('[data-staffform]', el).onsubmit = async ev => {
    ev.preventDefault();
    const staffing = {}, ratios = {};
    $$('[data-staff]', el).forEach(i => { const n = Math.max(0, Math.round(Number(i.value)) || 0); if (n) (staffing[i.dataset.staff] ||= {})[i.dataset.pos] = n; });
    $$('[data-ratio]', el).forEach(i => { const n = Math.max(0, Math.round(Number(i.value)) || 0); if (n) ratios[i.dataset.ratio] = n; });
    await store.saveSettings({ staffing, guest_ratios: ratios }); toast('Bezetting opgeslagen'); rerender();
  };
  $('[data-dayform]', el).onsubmit = async ev => {
    ev.preventDefault();
    const list = $$('.spdrow', el).map(r => ({ date: $('[name=date]', r).value, label: $('[name=label]', r).value.trim(), kind: $('[name=kind]', r).value }));
    if (list.some(d => !d.date || !d.label)) return toast('Vul bij elke dag een datum en omschrijving in', 'error');
    if (new Set(list.map(d => d.date)).size !== list.length) return toast('Elke datum mag maar één keer voorkomen', 'error');
    await store.saveSettings({ special_days: list.sort((a, b) => a.date.localeCompare(b.date)) }); applySettings(await store.settings()); toast('Dagen opgeslagen'); rerender();
  };
  $('[data-loonform]', el).onsubmit = async ev => {
    ev.preventDefault(); const fd = new FormData(ev.target);
    const t = k => { const v = fd.get(k); return v === '23:59' ? '24:00' : v; };
    const o = { toeslag_windows: { avondVan: t('avondVan'), avondTot: t('avondTot'), nachtVan: t('nachtVan'), nachtTot: t('nachtTot') } };
    ['pct_avond', 'pct_nacht', 'pct_zondag', 'pct_feestdag', 'pct_vakantiegeld', 'pct_werkgever'].forEach(k => (o[k] = Number(fd.get(k)) || 0));
    await store.saveSettings(o); applySettings(await store.settings()); toast('Toeslagen opgeslagen'); rerender();
  };
}

/* ================= My schedule ================= */
async function viewMine(el) {
  const start = mondayOf(new Date());
  const sel = S.mineWeek || null; // null = komende weken, anders maandag van gekozen week
  const fromD = sel && sel < start ? sel : start;
  const toD = sel && addDays(sel, 6) > addDays(start, 41) ? addDays(sel, 6) : addDays(start, 41);
  const from = iso(fromD), to = iso(toD);
  const [all, reqs, emps, swaps] = await Promise.all([store.shifts(from, to), store.requests(), store.employees(), store.swaps()]);
  const tdy = todayIso();
  const sickNow = reqs.find(r => r.employee_id === S.me.id && r.type === 'ziek' && r.status !== 'rejected' && r.start_date <= tdy && r.end_date >= tdy);
  const swapOf = id => swaps.find(w => w.shift_id === id && w.from_employee === S.me.id && ['open', 'accepted'].includes(w.status));
  const nameOf = Object.fromEntries(emps.map(e => [e.id, e.name.split(' ')[0]]));
  const withWho = s => { const o = all.filter(x => x.date === s.date && x.employee_id !== S.me.id && x.published).map(x => nameOf[x.employee_id]).filter(Boolean); return [...new Set(o)]; };
  const mine = all.filter(s => s.employee_id === S.me.id && s.published);
  const myLeaves = reqs.filter(r => r.employee_id === S.me.id && r.status === 'approved' && overlaps(r.start_date, r.end_date, from, to));
  const today = todayIso();
  const nowHM = `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
  const next = mine.find(s => s.date > today || (s.date === today && hm(s.end_time) > nowHM) || (s.date === today && mins(s.end_time) <= mins(s.start_time)));
  const [clockHTML, boardH] = await Promise.all([clockCard(mine.find(s => s.date === today)), boardHTML().catch(() => '')]);
  let workedHTML = '';
  if (sel) {
    const [ents0, stM] = await Promise.all([store.entries(iso(sel), iso(addDays(sel, 6))), store.settings()]);
    const ents = ents0.filter(x => x.employee_id === S.me.id && x.clock_out);
    if (ents.length) {
      const P = x => paidOf(x, matchShift(x, mine), stM).hours;
      const tot = ents.reduce((t, x) => t + P(x), 0), ok = ents.filter(x => x.status === 'approved').reduce((t, x) => t + P(x), 0);
      workedHTML = `<div class="card pad worked"><div><small>Telt mee deze week</small><b>${fmtH(tot)} uur</b></div><div><small>Goedgekeurd</small><b>${fmtH(ok)} uur</b></div><div><small>Registraties</small><b>${ents.length}</b></div></div>`;
    }
  }

  const weekBlock = (mon, showOff, compact) => {
    const wFrom = iso(mon), wTo = iso(addDays(mon, 6));
    const ws = mine.filter(s => s.date >= wFrom && s.date <= wTo);
    const wl = myLeaves.filter(r => overlaps(r.start_date, r.end_date, wFrom, wTo));
    if (!showOff && !ws.length && !wl.length) return '';
    const h = ws.reduce((t, s) => t + shiftHours(s), 0);
    const items = [];
    for (let i = 0; i < 7; i++) {
      const ds = iso(addDays(mon, i));
      const d = parse(ds);
      const dayHead = `<div class="d"><span>${DAG[i]}</span><b>${d.getDate()}</b></div>`;
      const fd = feestdag(ds);
      ws.filter(s => s.date === ds).forEach(s => items.push(`<li class="${ds === today ? 'today' : ''}">${dayHead}<div class="t"><strong>${hm(s.start_time)} – ${hm(s.end_time)}</strong><small>${esc(s.position || '')}${s.break_minutes ? ` · ${s.break_minutes} min pauze` : ''}${s.note ? ` · ${esc(s.note)}` : ''}${fd ? ` · ${esc(fd)}` : ''}</small>${withWho(s).length ? `<small class="with">Met ${esc(withWho(s).join(', '))}</small>` : ''}${shiftWindow(s)[0] > new Date() ? (swapOf(s.id) ? `<small class="swapst">⇄ ${SWAPST[swapOf(s.id).status].toLowerCase()}</small>` : `<button class="linkbtn small swapbtn" data-swap="${s.id}">⇄ Ruilen of overdragen</button>`) : ''}</div><div class="h">${fmtH(shiftHours(s))} u</div></li>`));
      if (ws.some(s => s.date === ds)) continue;
      const lv = wl.find(r => r.start_date <= ds && r.end_date >= ds);
      if (lv) items.push(`<li class="off ${ds === today ? 'today' : ''}">${dayHead}<div class="t"><strong>${esc(REQ[lv.type])}</strong></div><div class="h"><span class="pill ok">vrij</span></div></li>`);
      else if (showOff) items.push(`<li class="off free ${ds === today ? 'today' : ''}">${dayHead}<div class="t"><strong>Vrij</strong>${fd ? `<small>${esc(fd)}</small>` : ''}</div><div class="h"></div></li>`);
    }
    if (compact) return `<section class="weekblock"><div class="weekblock-head"><span>${ws.length} dienst${ws.length === 1 ? '' : 'en'}</span><span><strong style="color:var(--text)">${fmtH(h)} uur</strong></span></div><div class="card"><ul class="daylist">${items.join('')}</ul></div></section>`;
    return `<section class="weekblock"><div class="weekblock-head"><h3>Week ${weekNr(mon)} <span class="muted" style="font-family:var(--font);font-weight:400;font-size:13px">· ${fmt(mon, { day: 'numeric', month: 'short' })} – ${fmt(addDays(mon, 6), { day: 'numeric', month: 'short' })}</span></h3><span>${ws.length} dienst${ws.length === 1 ? '' : 'en'} · ${fmtH(h)} uur</span></div><div class="card"><ul class="daylist">${items.join('')}</ul></div></section>`;
  };

  let body;
  if (sel) {
    const wl = weekLabel(sel);
    body = `<div class="toolbar mine-nav"><div class="weeknav">
        <button class="btn icon" data-w="-1" aria-label="Vorige week">‹</button>
        <div class="label"><strong>${wl.title}</strong><span>${wl.sub}</span></div>
        <button class="btn icon" data-w="1" aria-label="Volgende week">›</button>
        ${iso(sel) !== iso(start) ? '<button class="btn ghost sm" data-w="0">Deze week</button>' : ''}
      </div></div>
      ${weekBlock(sel, true, true)}
      ${workedHTML}
      ${sel > addDays(start, 7 * 5) || !mine.some(s => s.date >= iso(sel) && s.date <= iso(addDays(sel, 6))) ? '<p class="hint" style="text-align:center">Diensten verschijnen hier zodra de week is gepubliceerd.</p>' : ''}`;
  } else {
    let weeks = '';
    for (let w = 0; w < 6; w++) weeks += weekBlock(addDays(start, w * 7), false);
    body = weeks || '<div class="card empty">Er staan nog geen gepubliceerde diensten voor je ingepland.</div>';
  }

  el.innerHTML = `
    <div class="page-head"><div><h1>Hoi ${esc(S.me.name.split(' ')[0])}</h1><p>Je rooster${sel ? ' per week' : ' voor de komende weken'}.</p></div>
      <div class="head-actions"><button class="btn" data-ics>📅 Zet in mijn agenda</button>${sickNow ? '' : '<button class="btn" data-sick>🤒 Ik ben ziek</button>'}</div></div>
    ${sickNow ? `<div class="sickbanner"><div><strong>🤒 Je bent ziek gemeld</strong><span>sinds ${esc(fmtLong(sickNow.start_date))}. Beterschap!</span></div><button class="btn primary" data-better="${sickNow.id}">Ik ben weer beter</button></div>` : ''}
    ${clockHTML}
    ${sel ? '' : await listsHomeHTML()}
    ${next && !sel ? `<div class="hero-next"><div><small>Volgende dienst</small><h2>${esc(fmtLong(next.date))}</h2><p>${hm(next.start_time)} – ${hm(next.end_time)}${next.position ? ' · ' + esc(next.position) : ''}${next.note ? ' · ' + esc(next.note) : ''}</p>${withWho(next).length ? `<p class="with">Met ${esc(withWho(next).join(', '))}</p>` : ''}</div><button class="btn" data-goto="aanvragen">Vrij vragen</button></div>` : ''}
    ${boardH}
    <div class="filters mine-filter"><button data-mf="all" class="${sel ? '' : 'active'}">Komende weken</button><button data-mf="week" class="${sel ? 'active' : ''}">Per week</button></div>
    ${body}
  `;
  bindClock(el);
  const boardClick = bindBoard(el);
  el.onclick = async ev => {
    if (clockClicks(ev)) return;
    if (await boardClick(ev)) return;
    const sw = ev.target.closest('[data-swap]'); if (sw) return swapDialog(mine, emps, all, sw.dataset.swap, swaps);
    if (ev.target.closest('[data-ics]')) agendaDialog(mine);
    if (ev.target.closest('[data-sick]')) return sickDialog();
    if (ev.target.closest('[data-golists]')) return go('lijsten');
    const bt = ev.target.closest('[data-better]');
    if (bt) { if (!await ask('Ben je weer beter? De directie krijgt een melding en je ziekmelding stopt vandaag.', 'Ik ben weer beter')) return; try { await store.sickRecover(bt.dataset.better); toast('Fijn dat je weer beter bent!'); rerender(); } catch (x) { toast(errMsg(x), 'error'); } return; }
    const g = ev.target.closest('[data-goto]'); if (g) return go(g.dataset.goto);
    const mf = ev.target.closest('[data-mf]'); if (mf) { S.mineWeek = mf.dataset.mf === 'week' ? start : null; return rerender(); }
    const w = ev.target.closest('[data-w]');
    if (w) { const n = Number(w.dataset.w); S.mineWeek = n === 0 ? start : addDays(S.mineWeek, 7 * n); return rerender(); }
  };
  if (sel) {
    let x0 = null, y0 = null;
    el.ontouchstart = ev => { x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; };
    el.ontouchend = ev => {
      if (x0 == null) return;
      const dx = ev.changedTouches[0].clientX - x0, dy = ev.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      S.mineWeek = addDays(S.mineWeek, dx < 0 ? 7 : -7); rerender();
    };
  }
}

// Agenda koppelen: abonnement dat vanzelf bijwerkt (iPhone/Mac via webcal, Android/computer via Google Agenda)
function agendaDialog(mine) {
  const tok = S.me.calendar_token;
  const ok2 = !store.demo && tok && CFG.supabaseUrl;
  const https = ok2 ? `${CFG.supabaseUrl.replace(/\/$/, '')}/functions/v1/agenda?t=${tok}` : '';
  const webcal = https.replace(/^https:/, 'webcal:');
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  const apple = /iphone|ipad|ipod|macintosh/i.test(navigator.userAgent);
  openDialog('Zet in mijn agenda', ok2 ? `
    <p style="margin:0">Je diensten komen in je eigen agenda en blijven <strong>vanzelf bijgewerkt</strong>: nieuwe en gewijzigde diensten verschijnen automatisch.</p>
    <div class="agenda-btns">
      <a class="btn ${apple ? 'primary' : ''} block" href="${esc(webcal)}" data-agclose>📅 iPhone- of Mac-agenda</a>
      <a class="btn ${apple ? '' : 'primary'} block" href="${esc(google)}" target="_blank" rel="noopener" data-agclose>Google Agenda (Android en computer)</a>
      <button type="button" class="btn block" data-agcopy>Link kopiëren (Outlook en andere)</button>
    </div>
    <p class="hint">iPhone: kies <em>Abonneer</em> en daarna in welke agenda. Android: tik op Google Agenda en kies <em>Toevoegen</em>; de diensten verschijnen daarna in de agenda op je telefoon.</p>
    <details class="agmore"><summary>Meer opties</summary>
      <p class="hint">De link is persoonlijk. Heb je hem per ongeluk gedeeld? Maak een nieuwe; de oude werkt dan niet meer (koppel je agenda daarna opnieuw).</p>
      <div class="req-actions"><button type="button" class="btn sm" data-agreset>Nieuwe link maken</button><button type="button" class="btn sm ghost" data-agfile>Eenmalig bestand downloaden</button></div>
    </details>` : `
    <p style="margin:0">${store.demo ? 'In de echte app koppel je hier je agenda: je diensten komen dan automatisch in je iPhone-, Google- of Outlook-agenda en blijven bijgewerkt.' : 'Agenda koppelen is nog niet ingesteld. Je kunt je diensten wel eenmalig als bestand toevoegen.'}</p>
    <button type="button" class="btn block" data-agfile>Eenmalig bestand downloaden</button>`, {
    onReady(dlg) {
      $$('[data-agclose]', dlg).forEach(a => a.addEventListener('click', () => setTimeout(() => dlg.close(), 300)));
      const cp = $('[data-agcopy]', dlg);
      if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(https); toast('Agendalink gekopieerd'); } catch (x) { prompt('Kopieer deze link:', https); } };
      const rs = $('[data-agreset]', dlg);
      if (rs) rs.onclick = async () => {
        if (!await ask('Nieuwe agendalink maken? De oude link werkt dan niet meer; koppel je agenda daarna opnieuw.', 'Nieuwe link')) return;
        try { S.me.calendar_token = await store.resetCalendarToken(); dlg.close(); toast('Nieuwe link gemaakt'); agendaDialog(mine); } catch (x) { toast(errMsg(x), 'error'); }
      };
      const fl = $('[data-agfile]', dlg); if (fl) fl.onclick = () => { downloadIcs(mine); };
    },
  });
}

function downloadIcs(shifts) {
  const dt = (date, t) => date.replace(/-/g, '') + 'T' + hm(t).replace(':', '') + '00';
  const icsEsc = s => String(s || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ev = shifts.map(s => {
    const endDate = mins(s.end_time) <= mins(s.start_time) ? iso(addDays(parse(s.date), 1)) : s.date;
    return ['BEGIN:VEVENT', `UID:${s.id}@rooster`, `DTSTAMP:${stamp}`, `DTSTART;TZID=Europe/Amsterdam:${dt(s.date, s.start_time)}`, `DTEND;TZID=Europe/Amsterdam:${dt(endDate, s.end_time)}`,
      `SUMMARY:${icsEsc(`Werken ${CFG.bedrijf}${s.position ? ' – ' + s.position : ''}`)}`, s.note ? `DESCRIPTION:${icsEsc(s.note)}` : null, 'END:VEVENT'].filter(Boolean).join('\r\n');
  });
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rooster//NL', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
  saveFile('mijn-rooster.ics', ics, 'text/calendar', null).then(r => {
    if (r === 'downloaded') toast('Agendabestand gedownload — open het om je diensten toe te voegen');
    if (r === 'shared') toast('Gedeeld');
  });
}

/* ================= Requests ================= */
function reqDates(r) {
  const n = daysBetween(r.start_date, r.end_date);
  return r.start_date === r.end_date ? fmtLong(r.start_date) : `${fmtShort(r.start_date)} t/m ${fmtShort(r.end_date)} <span class="muted">(${n} dagen)</span>`;
}

// Ziekmelden: snel en duidelijk, met de afspraak dat je eerst belt
function sickDialog() {
  const t = todayIso();
  openDialog('Ik ben ziek', `
    <div class="warnbox"><strong>Eerst bellen.</strong> Bel zo snel mogelijk, en uiterlijk 2 uur voor je dienst${CFG.sickName ? ` met ${esc(CFG.sickName)}` : ', met de directie'}. Een melding in de app alleen is niet genoeg.</div>
    ${CFG.sickPhone ? `<a class="btn primary block callbtn" href="tel:${esc(CFG.sickPhone.replace(/[^0-9+]/g, ''))}">📞 Bel ${esc(CFG.sickName || 'de directie')} (${esc(CFG.sickPhone)})</a>` : ''}
    <div class="row keep">
      <label class="field">Ziek vanaf<input type="date" name="start_date" value="${t}" min="${iso(addDays(new Date(), -7))}" required></label>
      <label class="field">Verwacht tot en met<input type="date" name="end_date" value="${t}" required></label>
    </div>
    <p class="hint" style="margin:0">Weet je nog niet hoe lang? Laat het op vandaag staan. Ben je weer beter, tik dan op je startscherm op <strong>Ik ben weer beter</strong>.</p>
    <label class="field">Opmerking<textarea name="note" placeholder="Optioneel, bv. dat je al gebeld hebt"></textarea></label>
    <p class="hint" style="margin:0">Vertel hier niet wat je hebt. Medische informatie hoort niet in de app.</p>
    <div class="dlg-foot"><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">Ziekmelding versturen</button></div>`, {
    onReady(dlg) { const f = $('form', dlg); f.start_date.onchange = () => { f.end_date.min = f.start_date.value; if (f.end_date.value < f.start_date.value) f.end_date.value = f.start_date.value; }; f.end_date.min = t; },
    async onSubmit(fd) {
      if (fd.get('end_date') < fd.get('start_date')) throw new Error('De einddatum ligt voor de begindatum');
      await store.saveRequest({ employee_id: S.me.id, type: 'ziek', start_date: fd.get('start_date'), end_date: fd.get('end_date'), note: String(fd.get('note') || '').trim() || null });
      toast('Ziekmelding verstuurd. Beterschap!'); rerender();
    },
  });
}

async function viewRequestsStaff(el) {
  const [reqs0, privList] = await Promise.all([store.requests(), store.privates()]);
  const reqs = reqs0.filter(r => r.employee_id === S.me.id);
  const t = todayIso();
  const bal = leaveBalance(S.me, privList.find(p => p.employee_id === S.me.id), reqs);
  const showBal = bal.entitlement || bal.opening || bal.used;
  el.innerHTML = `
    <div class="page-head"><div><h1>Verlof</h1><p>Vraag vakantie of een vrije dag aan, of meld je ziek. Beschikbaarheid per week geef je door onder <button class="linkbtn" data-goto="beschikbaar">Beschikbaar</button>.</p></div><button class="btn" data-sick>🤒 Ik ben ziek</button></div>
    ${showBal ? `<div class="card pad balance"><div><small>Verlofsaldo ${bal.year}</small><b>${fmtH(bal.rest)} uur</b></div><div class="hint">${fmtH(bal.opening)} meegenomen uit ${bal.year - 1} + ${fmtH(bal.entitlement)} recht − ${fmtH(bal.used)} opgenomen${bal.pending ? ` · ${bal.pending} ${bal.pending === 1 ? 'aanvraag' : 'aanvragen'} in behandeling` : ''}</div></div>` : ''}
    <div class="split">
      <form class="card pad stack" id="reqform">
        <h3 style="font-size:18px">Nieuwe aanvraag</h3>
        <label class="field">Soort<select name="type">${Object.entries(REQ).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
        <div class="row keep">
          <label class="field">Van<input type="date" name="start_date" min="${t}" value="${t}" required></label>
          <label class="field">Tot en met<input type="date" name="end_date" min="${t}" value="${t}" required></label>
        </div>
        <label class="field">Toelichting<textarea name="note" placeholder="Optioneel"></textarea></label>
        <button class="btn primary">Versturen</button>
      </form>
      <div>
        ${reqs.length ? `<div class="reqs">${reqs.map(r => `
          <article class="card req"><div class="req-head"><strong>${esc(REQ[r.type])}</strong><span class="status ${r.status}">${stLabel(r)}</span></div>
          <p class="dates">${reqDates(r)}</p>${r.note ? `<p class="note">${esc(r.note)}</p>` : ''}
          ${r.status === 'approved' && r.leave_hours ? `<p class="hint">${fmtH(Number(r.leave_hours))} verlofuren afgeschreven</p>` : ''}
          ${r.manager_note ? `<p class="reply"><strong>Reactie:</strong> ${esc(r.manager_note)}</p>` : ''}
          ${r.status === 'pending' ? `<div class="req-actions"><button class="btn sm danger" data-del="${r.id}">Intrekken</button></div>` : ''}</article>`).join('')}</div>`
          : '<div class="card empty">Je hebt nog geen aanvragen gedaan.</div>'}
      </div>
    </div>`;
  const f = $('#reqform');
  f.start_date.onchange = () => { f.end_date.min = f.start_date.value; if (f.end_date.value < f.start_date.value) f.end_date.value = f.start_date.value; };
  f.onsubmit = async ev => {
    ev.preventDefault();
    const fd = new FormData(f);
    if (fd.get('end_date') < fd.get('start_date')) return toast('De einddatum ligt voor de begindatum', 'error');
    try {
      await store.saveRequest({ employee_id: S.me.id, type: fd.get('type'), start_date: fd.get('start_date'), end_date: fd.get('end_date'), note: fd.get('note').trim() || null });
      toast('Aanvraag verstuurd'); rerender();
    } catch (e) { toast(errMsg(e), 'error'); }
  };
  el.onclick = async ev => {
    if (ev.target.closest('[data-sick]')) return sickDialog();
    const g = ev.target.closest('[data-goto]'); if (g) return go(g.dataset.goto);
    const d = ev.target.closest('[data-del]');
    if (d && await ask('Deze aanvraag intrekken?')) { await store.deleteRequest(d.dataset.del); toast('Aanvraag ingetrokken'); rerender(); }
  };
}

async function viewRequestsMgr(el) {
  S.reqTab ||= 'verlof';
  if (S.reqTab === 'ruilen') return viewSwapsMgr(el);
  if (S.reqTab === 'open') return viewOpenMgr(el);
  if (S.reqTab === 'beschikbaar') return viewAvailMgr(el);
  return viewLeaveMgr(el);
}

async function viewLeaveMgr(el) {
  const [reqs, emps, privList] = await Promise.all([store.requests(), store.employees(), store.privates()]);
  const privs = Object.fromEntries(privList.map(p => [p.employee_id, p]));
  const byId = Object.fromEntries(emps.map(e => [e.id, e]));
  const list = S.reqFilter === 'pending' ? reqs.filter(r => r.status === 'pending') : reqs;
  const pend = reqs.filter(r => r.status === 'pending');
  let conflicts = {};
  if (pend.length) {
    const from = pend.reduce((m, r) => (r.start_date < m ? r.start_date : m), pend[0].start_date);
    const to = pend.reduce((m, r) => (r.end_date > m ? r.end_date : m), pend[0].end_date);
    const sh = await store.shifts(from, to);
    pend.forEach(r => { conflicts[r.id] = sh.filter(s => s.employee_id === r.employee_id && s.date >= r.start_date && s.date <= r.end_date); });
  }
  el.innerHTML = `
    <div class="page-head"><div><h1>Aanvragen</h1><p>Verlof, ruilen, open diensten en beschikbaarheid van het team.</p></div></div>
    ${await reqTabsHTML()}
    <div class="toolbar"><div class="filters"><button data-f="pending" class="${S.reqFilter === 'pending' ? 'active' : ''}">Openstaand (${pend.length})</button><button data-f="all" class="${S.reqFilter === 'all' ? 'active' : ''}">Alle</button></div></div>
    ${list.length ? `<div class="reqs">${list.map(r => {
      const e = byId[r.employee_id] || { name: 'Onbekend' };
      const c = conflicts[r.id] || [];
      return `<article class="card req"><div class="req-head"><span class="dot" style="background:${esc(e.color || COLORS[0])};margin:0"></span><strong>${esc(e.name)}</strong><span class="badge">${esc(REQ[r.type])}</span><span class="status ${r.status}">${STATUS[r.status]}</span></div>
        <p class="dates">${reqDates(r)}${r.status === 'approved' && r.leave_hours ? ` <span class="muted">· ${fmtH(Number(r.leave_hours))} verlofuren</span>` : ''}</p>${r.note ? `<p class="note">“${esc(r.note)}”</p>` : ''}
        ${(r.type === 'vakantie' || r.type === 'vrij') && r.status === 'pending' ? `<p class="hint">Verlofsaldo ${esc(e.name.split(' ')[0])}: ${fmtH(leaveBalance(e, privs[e.id], reqs).rest)} uur</p>` : ''}
        ${c.length ? `<p class="conflict">⚠︎ Staat ${c.length}× ingepland in deze periode (${c.map(s => fmtShort(s.date)).join(', ')}).</p>` : ''}
        ${r.manager_note ? `<p class="reply"><strong>Jouw reactie:</strong> ${esc(r.manager_note)}</p>` : ''}
        <div class="req-actions">${r.status === 'pending'
          ? (r.type === 'ziek' ? `<button class="btn sm ok" data-ok="${r.id}">Verwerken</button>` : `<button class="btn sm ok" data-ok="${r.id}">Goedkeuren</button><button class="btn sm danger" data-no="${r.id}">Afwijzen</button>`)
          : `<button class="btn sm ghost" data-undo="${r.id}">Terugzetten naar openstaand</button>`}</div></article>`;
    }).join('')}</div>` : `<div class="card empty">${S.reqFilter === 'pending' ? 'Geen openstaande aanvragen. 🎉' : 'Nog geen aanvragen.'}</div>`}`;

  el.onclick = async ev => {
    if (rtClick(ev)) return;
    const f = ev.target.closest('[data-f]'); if (f) { S.reqFilter = f.dataset.f; return rerender(); }
    const okB = ev.target.closest('[data-ok]');
    if (okB) {
      const r = reqs.find(x => x.id === okB.dataset.ok);
      const c = conflicts[r.id] || [];
      if (r.type === 'vakantie' || r.type === 'vrij') {
        const e = byId[r.employee_id] || {}, bal = leaveBalance(e, privs[e.id], reqs);
        const sh = await store.shifts(iso(mondayOf(parse(r.start_date))), iso(addDays(mondayOf(parse(r.end_date)), 6)));
        const est = estimateLeaveHours(r, e, sh);
        return openDialog('Verlof goedkeuren', `
          <p style="margin:0"><strong>${esc(e.name || '')}</strong> · ${reqDates(r)}</p>
          ${conflictChoice(c)}
          <label class="field">Af te schrijven verlofuren<input type="number" name="hours" min="0" step="0.5" value="${est}"></label>
          <p class="hint">Voorstel: ${sh.some(s => s.employee_id === r.employee_id) ? 'de geplande uren; voor weken die nog niet zijn ingepland dagen × contracturen ÷ 7' : 'dagen × contracturen ÷ 7'}. Saldo nu ${fmtH(bal.rest)} uur → na goedkeuren <strong data-after>${fmtH(bal.rest - est)}</strong> uur.</p>
          <label class="field">Reactie (optioneel)<input name="note" placeholder="Bijv. fijne vakantie!"></label>
          <div class="dlg-foot"><button type="button" class="btn" data-close>Annuleren</button><button class="btn ok" value="save">Goedkeuren</button></div>`, {
          onReady(dlg) { const f = $('form', dlg); f.hours.oninput = () => { $('[data-after]', dlg).textContent = fmtH(bal.rest - (Number(f.hours.value) || 0)); }; },
          async onSubmit(fd) { await store.decideRequest(r.id, 'approved', fd.get('note').trim() || null, Number(fd.get('hours')) || 0); toast('Verlof goedgekeurd' + await resolveConflicts(c, fd.get('conflict'))); rerender(); },
        });
      }
      if (c.length) {
        return openDialog('Aanvraag goedkeuren', `
          <p style="margin:0"><strong>${esc(byId[r.employee_id]?.name || '')}</strong> · ${esc(REQ[r.type])} · ${reqDates(r)}</p>
          ${conflictChoice(c)}
          <div class="dlg-foot"><button type="button" class="btn" data-close>Annuleren</button><button class="btn ok" value="save">${r.type === 'ziek' ? 'Verwerken' : 'Goedkeuren'}</button></div>`, {
          async onSubmit(fd) { await store.decideRequest(r.id, 'approved', null); toast((r.type === 'ziek' ? 'Ziekmelding verwerkt' : 'Aanvraag goedgekeurd') + await resolveConflicts(c, fd.get('conflict'))); rerender(); },
        });
      }
      await store.decideRequest(r.id, 'approved', null); toast(r.type === 'ziek' ? 'Ziekmelding verwerkt' : 'Aanvraag goedgekeurd'); return rerender();
    }
    const no = ev.target.closest('[data-no]');
    if (no) {
      return openDialog('Aanvraag afwijzen', `<label class="field">Reden (de medewerker ziet dit)<textarea name="note" placeholder="Bijv. al te veel mensen vrij die week"></textarea></label>
        <div class="dlg-foot"><button type="button" class="btn" data-close>Annuleren</button><button class="btn danger" value="save">Afwijzen</button></div>`, {
        async onSubmit(fd) { await store.decideRequest(no.dataset.no, 'rejected', fd.get('note').trim()); toast('Aanvraag afgewezen'); rerender(); },
      });
    }
    const undo = ev.target.closest('[data-undo]');
    if (undo) {
      if (!await ask('Terugzetten naar openstaand? De medewerker krijgt hiervan een melding. Let op: diensten die je bij het goedkeuren open hebt gemaakt of hebt verwijderd, komen niet vanzelf terug; pas die zo nodig aan in de planning.', 'Terugzetten')) return;
      await store.decideRequest(undo.dataset.undo, 'pending', null); toast('Aanvraag staat weer open'); rerender();
    }
  };
}

/* ================= Team ================= */
function contractCell(e) {
  const ct = e.contract_type || 'vast', max = Number(e.contract_hours) || 0, min = Number(e.contract_min_hours) || 0;
  const h = isFlex(e) ? '' : ct === 'minmax' && max ? ` ${fmtH(min)}–${fmtH(max)} u` : max ? ` ${fmtH(max)} u` : '';
  let end = '';
  if (e.contract_end) {
    const days = daysBetween(todayIso(), e.contract_end) - 1;
    end = days < 0 ? ' <span class="pill warn">verlopen</span>' : days <= 45 ? ` <span class="pill warn">loopt af ${esc(fmtShort(e.contract_end))}</span>` : ` <span class="muted small">t/m ${esc(fmtShort(e.contract_end))}</span>`;
  }
  return `${esc(CT[ct])}${h}${end}`;
}
async function viewTeam(el) {
  const [emps0, privList, reqs] = await Promise.all([store.employees(), store.privates(), store.requests()]);
  const emps = sortEmps(emps0);
  const privs = Object.fromEntries(privList.map(p => [p.employee_id, p]));
  el.innerHTML = `
    <div class="page-head"><div><h1>Team</h1><p>Medewerkers, functies en contracturen.</p></div><button class="btn primary" data-new>+ Medewerker</button></div>
    ${emps.length ? `<div class="card table-wrap"><table class="list">
      <thead><tr><th>Naam</th><th class="hide-sm">Functie</th><th class="hide-sm">E-mail</th><th class="hide-sm">Telefoon</th><th class="num">Contract</th><th class="num hide-sm">Uurloon</th><th class="num hide-sm">Verlof over</th><th>Account</th></tr></thead>
      <tbody>${emps.map(e => `<tr class="click ${e.active === false ? 'inactive' : ''}" data-id="${e.id}">
        <td><div class="namecell"><span class="dot" style="background:${esc(e.color || COLORS[0])}"></span><span class="nm">${esc(e.name)}${e.role === 'manager' ? ' <span class="pill">directie</span>' : e.role === 'planner' ? ' <span class="pill">shiftleader</span>' : ''}<small class="show-sm">${esc(e.position || '')}</small></span></div></td>
        <td class="hide-sm">${esc(e.position || '—')}</td><td class="hide-sm">${esc(e.email)}</td><td class="hide-sm">${esc(e.phone || '—')}</td>
        <td class="num">${contractCell(e)}</td>
        <td class="num hide-sm">${privs[e.id]?.hourly_wage ? euro(Number(privs[e.id].hourly_wage)) : '—'}${(() => { const a = ageOn(privs[e.id]?.birth_date, todayIso()); return a != null && a < 18 ? ` <span class="pill warn">${a} jr</span>` : ''; })()}</td>
        <td class="num hide-sm">${(() => { const b = leaveBalance(e, privs[e.id], reqs); return b.entitlement || b.opening ? fmtH(b.rest) + ' u' : '—'; })()}</td>
        <td>${e.active === false ? '<span class="pill">inactief</span>' : e.user_id ? '<span class="pill ok">actief</span>' : e.invited_at ? `<span class="pill warn">uitgenodigd ${esc(fmtShort(iso(new Date(e.invited_at))))}</span>` : '<span class="pill warn">nog niet geactiveerd</span>'}</td></tr>`).join('')}</tbody>
    </table></div>` : '<div class="card empty">Nog geen medewerkers.</div>'}
    <p class="hint" style="margin-top:14px">Nieuwe medewerkers krijgen een uitnodiging per e-mail van ${esc(CFG.bedrijf)}. Komt die niet aan? Open de medewerker en kies <strong>Uitnodiging opnieuw sturen</strong>, of stuur het uitnodigingsbericht via WhatsApp.</p>`;
  el.onclick = ev => {
    if (ev.target.closest('[data-new]')) return employeeDialog({ active: true, role: 'staff', color: COLORS[emps.length % COLORS.length] }, {}, reqs);
    const tr = ev.target.closest('tr[data-id]');
    if (tr) employeeDialog(emps.find(e => e.id === tr.dataset.id), privs[tr.dataset.id] || {}, reqs);
  };
}

function employeeDialog(e, priv = {}, reqs = []) {
  const isNew = !e.id;
  const bal = leaveBalance(e, priv, reqs);
  const posList = [...new Set([...(CFG.posities || []), e.position].filter(Boolean))];
  const invite = `Hoi ${e.name ? e.name.split(' ')[0] : ''}! Je rooster bij ${CFG.bedrijf} staat online: ${location.origin + location.pathname}\nKies "Eerste keer inloggen" en gebruik dit e-mailadres: ${e.email || ''}\nTip: zet de pagina op je beginscherm, dan werkt hij als app.`;
  openDialog(isNew ? 'Medewerker toevoegen' : e.name, `
    <label class="field">Naam<input name="name" value="${esc(e.name || '')}" required></label>
    <div class="row">
      <label class="field">E-mailadres<input type="email" name="email" value="${esc(e.email || '')}" required></label>
      <label class="field">Telefoon<input type="tel" name="phone" value="${esc(e.phone || '')}"></label>
    </div>
    <div class="row">
      <label class="field">Functie<select name="position"><option value="">—</option>${posList.map(p => `<option ${p === e.position ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
      <label class="field">Contract<select name="contract_type">${Object.entries(CT).map(([k, v]) => `<option value="${k}" ${(e.contract_type || 'vast') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    </div>
    <div class="row">
      <label class="field"><span data-hlabel>Uren per week</span><input type="number" name="contract_hours" min="0" step="0.5" value="${e.contract_hours ?? ''}"></label>
      <label class="field" data-minrow>Minimum uren per week<input type="number" name="contract_min_hours" min="0" step="0.5" value="${e.contract_min_hours ?? ''}"></label>
    </div>
    <label class="field">Einddatum contract <span class="muted small">(leeg = onbepaalde tijd)</span><input type="date" name="contract_end" value="${esc(e.contract_end || '')}"></label>
    <p class="hint" data-cthint></p>
    <div class="row">
      <label class="field">Rol<select name="role"><option value="staff" ${e.role !== 'manager' ? 'selected' : ''}>Medewerker</option><option value="planner" ${e.role === 'planner' ? 'selected' : ''}>Shiftleader (mag plannen, ziet geen lonen)</option><option value="manager" ${e.role === 'manager' ? 'selected' : ''}>Directie (alles)</option></select></label>
      <label class="field">Kleur in rooster<input type="color" name="color" value="${esc(e.color || COLORS[0])}"></label>
    </div>
    <label class="check"><input type="checkbox" name="active" ${e.active !== false ? 'checked' : ''}> Actief (uit dienst? Zet dit uit, dan blijft de historie bewaard)</label>
    <fieldset class="privbox"><legend>🔒 Vertrouwelijk — alleen directie (en de medewerker zelf)</legend>
      <div class="row keep">
        <label class="field">Uurloon bruto (€)<input type="number" name="hourly_wage" min="0" step="0.01" value="${priv.hourly_wage ?? ''}" placeholder="bijv. 14,20"></label>
        <label class="field">Geboortedatum<input type="date" name="birth_date" value="${priv.birth_date || ''}"></label>
      </div>
      <div class="row keep">
        <label class="field">Verlofuren per jaar<input type="number" name="leave_hours_year" min="0" step="0.5" value="${priv.leave_hours_year ?? ''}" placeholder="4 × contract = ${fmtH(4 * (Number(e.contract_hours) || 0))}"></label>
        <label class="field">Meegenomen uit ${new Date().getFullYear() - 1} (uren)<input type="number" name="leave_opening" step="0.5" value="${Number(priv.leave_year) === new Date().getFullYear() ? priv.leave_opening ?? '' : ''}" placeholder="0"></label>
      </div>
      ${isNew ? '' : `<p class="hint">Verlof ${bal.year}: ${fmtH(bal.opening)} meegenomen uit ${bal.year - 1} + ${fmtH(bal.entitlement)} recht − ${fmtH(bal.used)} opgenomen = <strong>${fmtH(bal.rest)} uur over</strong>${bal.pending ? ` · ${bal.pending} ${bal.pending === 1 ? 'aanvraag' : 'aanvragen'} open` : ''}</p>`}
      <p class="hint">De geboortedatum gebruikt de app voor de jongerenregels uit de Arbeidstijdenwet.</p>
    </fieldset>
    ${isNew ? '' : `<div class="futbox"><div class="req-actions"><button type="button" class="btn sm" data-allshifts>👤 Alle diensten bekijken</button><button type="button" class="btn sm" data-futshifts>🗓️ Komende diensten uit het rooster halen…</button></div><span class="hint">Bijvoorbeeld als iemand stopt of langere tijd niet werkt. Alles vanaf een datum in één keer.</span></div>`}
    ${isNew ? '' : '<details class="history" data-history><summary>Geschiedenis van wijzigingen</summary><div class="hint">Laden…</div></details>'}
    ${isNew ? `<label class="check"><input type="checkbox" name="send_invite" checked> Stuur meteen een uitnodiging per e-mail</label>` : !e.user_id && e.active !== false ? `<div class="invitebox"><span class="hint">${e.invited_at ? `Uitgenodigd op ${esc(fmtShort(iso(new Date(e.invited_at))))} ${tHM(e.invited_at)}, nog niet geactiveerd.` : 'Nog niet uitgenodigd.'}</span>
      <div class="req-actions"><button type="button" class="btn sm primary" data-sendinvite>${e.invited_at ? 'Uitnodiging opnieuw sturen' : 'Uitnodiging sturen'}</button><button type="button" class="btn sm" data-invite>Kopieer bericht voor WhatsApp</button></div></div>` : ''}
    <div class="dlg-foot">
      ${isNew || e.id === S.me.id ? '' : '<button class="btn danger" value="delete" formnovalidate>Verwijderen</button>'}
      <span class="spacer"></span><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">Opslaan</button>
    </div>`, {
    onReady(dlg) {
      const ctSel = $('[name=contract_type]', dlg);
      const CTHINT = { vast: '', minmax: 'Min-max: je plant tussen het minimum en maximum. De planning waarschuwt bij te weinig of te veel uren.', nuluren: 'Nuluren: geen vaste uren. Roep minstens 4 dagen vooraf op en betaal per oproep minimaal 3 uur. Na 12 maanden moet je een contract met vaste uren aanbieden.', oproep: 'Oproep: geen vaste uren. Roep minstens 4 dagen vooraf op en betaal per oproep minimaal 3 uur. Na 12 maanden moet je een contract met vaste uren aanbieden.', stage: 'Stage of BBL: vul de uren per week in volgens de stage- of leerovereenkomst.' };
      const ctUpd = () => { const v = ctSel.value; $('[data-minrow]', dlg).style.display = v === 'minmax' ? '' : 'none'; $('[data-hlabel]', dlg).textContent = v === 'minmax' ? 'Maximum uren per week' : isFlex({ contract_type: v }) ? 'Gemiddelde uren per week (voor verlof)' : 'Uren per week'; $('[data-cthint]', dlg).textContent = CTHINT[v]; $('[data-cthint]', dlg).style.display = CTHINT[v] ? '' : 'none'; };
      ctSel.onchange = ctUpd; ctUpd();
      const h = $('[data-history]', dlg); if (h) h.addEventListener('toggle', () => { if (h.open && !h.dataset.loaded) { h.dataset.loaded = 1; historyHTML(e.id).then(x => { $('div', h).outerHTML = x; }); } });
      const b = $('[data-invite]', dlg);
      if (b) b.onclick = async () => { try { await navigator.clipboard.writeText(invite); toast('Bericht gekopieerd — plak het in WhatsApp of mail'); } catch (x) { prompt('Kopieer dit bericht:', invite); } };
      const fb = $('[data-futshifts]', dlg);
      if (fb) fb.onclick = () => futureShiftsDialog(e);
      const ab = $('[data-allshifts]', dlg); if (ab) ab.onclick = () => personShiftsDialog(e);
      const si = $('[data-sendinvite]', dlg);
      if (si) si.onclick = async () => {
        si.disabled = true; si.textContent = 'Versturen…';
        try { const r = await store.inviteEmployee(e.id); toast(r?.demo ? 'Demo: in de echte app gaat er nu een uitnodiging naar ' + e.email : 'Uitnodiging verstuurd naar ' + e.email); dlg.close(); rerender(); }
        catch (x) { toast(errMsg(x), 'error'); si.disabled = false; si.textContent = 'Uitnodiging opnieuw sturen'; }
      };
    },
    async onSubmit(fd, action) {
      if (action === 'delete') {
        if (!await ask(`${e.name} definitief verwijderen, inclusief alle diensten en aanvragen? Tip: zet de medewerker liever op inactief.`)) throw 'cancel';
        await store.deleteEmployee(e.id); toast('Medewerker verwijderd'); return rerender();
      }
      if (e.id === S.me.id && fd.get('active') !== 'on') throw new Error('Je kunt jezelf niet op inactief zetten. Laat dat een andere directielid doen.');
      if (e.id === S.me.id && fd.get('role') !== 'manager' && !await ask(fd.get('role') === 'planner' ? 'Je maakt jezelf shiftleader: je ziet daarna geen lonen, team, uren en instellingen meer. Zeker weten?' : 'Je haalt je eigen directierechten en planrechten weg. Zeker weten?')) throw 'cancel';
      const payload = {
        name: fd.get('name').trim(), email: fd.get('email').trim().toLowerCase(), phone: fd.get('phone').trim() || null,
        position: fd.get('position') || null, contract_hours: fd.get('contract_hours') ? Number(fd.get('contract_hours')) : null,
        contract_type: fd.get('contract_type') || 'vast', contract_min_hours: fd.get('contract_type') === 'minmax' && fd.get('contract_min_hours') ? Number(fd.get('contract_min_hours')) : null,
        contract_end: fd.get('contract_end') || null,
        role: fd.get('role'), color: fd.get('color'), active: fd.get('active') === 'on',
      };
      if (!isNew) payload.id = e.id;
      const id = await store.saveEmployee(payload);
      const num = k => (fd.get(k) === '' || fd.get(k) == null ? null : Number(String(fd.get(k)).replace(',', '.')));
      const pv = { employee_id: id || e.id, hourly_wage: num('hourly_wage'), birth_date: fd.get('birth_date') || null, leave_hours_year: num('leave_hours_year'), leave_opening: num('leave_opening') || 0, leave_year: new Date().getFullYear() };
      const changed = ['hourly_wage', 'birth_date', 'leave_hours_year'].some(k => (pv[k] ?? null) !== (priv[k] ?? null)) || pv.leave_opening !== (Number(priv.leave_year) === pv.leave_year ? Number(priv.leave_opening) || 0 : 0);
      if (changed && pv.employee_id) await store.savePrivate(pv);
      const selfRole = e.id === S.me.id && payload.role !== S.me.role;
      if (e.id === S.me.id && !selfRole) Object.assign(S.me, payload);
      if (selfRole) { meCheckedAt = 0; setTimeout(() => checkMe(true), 50); }
      if (isNew && fd.get('send_invite') === 'on' && id) {
        try { const r = await store.inviteEmployee(id); toast(r?.demo ? 'Medewerker toegevoegd (demo: in de echte app gaat er nu een uitnodiging per mail)' : `Medewerker toegevoegd en uitnodiging verstuurd naar ${payload.email}`); }
        catch (x) { toast('Medewerker toegevoegd, maar de uitnodiging is niet verstuurd: ' + errMsg(x), 'error'); }
      } else toast(isNew ? 'Medewerker toegevoegd' : 'Opgeslagen');
      rerender();
      // Uit dienst gezet: komende diensten afhandelen
      if (!isNew && e.active !== false && !payload.active) {
        const now = new Date();
        const fut = (await store.shiftsOf(e.id, todayIso(), iso(addDays(now, 800)))).filter(x => shiftWindow(x)[0] > now);
        if (fut.length) setTimeout(() => openDialog(`${esc(e.name.split(' ')[0])} is uit dienst`, `
          ${conflictChoice(fut)}
          <div class="dlg-foot"><span class="spacer"></span><button class="btn primary" value="save">Doorvoeren</button></div>`, {
          async onSubmit(fd2) { toast('Komende diensten afgehandeld' + await resolveConflicts(fut, fd2.get('conflict'))); rerender(); },
        }), 60);
      }
    },
  });
}

function personPicker(list) {
  openDialog('Diensten per persoon', `<p class="hint" style="margin:0">Kies wie je wilt bekijken. Je ziet al zijn of haar komende diensten, alle weken.</p>
    <div class="pickgrid">${list.map(e => `<button type="button" class="pickbtn" data-pick="${e.id}" style="--c:${esc(e.color || COLORS[0])}"><span class="dot"></span>${esc(e.name)}<small>${esc(e.position || '')}</small></button>`).join('')}</div>`, {
    onReady(dlg) { dlg.addEventListener('click', ev => { const b = ev.target.closest('[data-pick]'); if (!b) return; const e = list.find(x => x.id === b.dataset.pick); dlg.close(); if (e) personShiftsDialog(e); }); },
  });
}

// Alle komende diensten van één persoon, per week; selecteren en in één keer verwijderen of open zetten
async function personShiftsDialog(e) {
  const first = e.name.split(' ')[0], now = new Date();
  const list = (await store.shiftsOf(e.id, todayIso(), iso(addDays(now, 800))))
    .sort((a, b) => (a.date + hm(a.start_time)).localeCompare(b.date + hm(b.start_time)));
  const total = list.reduce((t, x) => t + shiftHours(x), 0);
  const weeks = {};
  list.forEach(x => { const m = iso(mondayOf(parse(x.date))); (weeks[m] ||= []).push(x); });
  const row = x => { const started = shiftWindow(x)[0] <= now;
    return `<label class="psrow ${x.published ? '' : 'concept'}"><input type="checkbox" name="ids" value="${x.id}" ${started ? 'disabled' : ''}>
      <span class="psdate">${esc(fmtLong(x.date))}</span><span class="pstime">${hm(x.start_time)}–${hm(x.end_time)}</span>
      <span class="psmeta">${esc(x.position || '')}${x.published ? '' : `${x.position ? ' · ' : ''}concept`}${started ? ' · bezig' : ''}</span></label>`; };
  openDialog(`Diensten van ${first}`, list.length ? `
    <p class="hint" style="margin:0"><strong>${list.length}</strong> komende dienst${list.length > 1 ? 'en' : ''} · ${fmtH(total)} uur · t/m ${esc(fmtShort(list[list.length - 1].date))}</p>
    <label class="check psall"><input type="checkbox" data-psall> Alles selecteren</label>
    <div class="pslist">${Object.entries(weeks).map(([m, l]) => `<section class="psweek"><h3>Week ${weekNr(parse(m))} <span class="muted">· ${l.length} dienst${l.length > 1 ? 'en' : ''} · ${fmtH(l.reduce((t, x) => t + shiftHours(x), 0))} u</span></h3>${l.map(row).join('')}</section>`).join('')}</div>
    <div class="dlg-foot"><span class="muted small" data-pscount>0 geselecteerd</span><span class="spacer"></span><button class="btn" value="open" disabled data-psact>Open dienst van maken</button><button class="btn danger" value="delete" disabled data-psact>Verwijderen</button></div>`
    : `<p style="margin:0">${esc(first)} heeft geen komende diensten.</p><div class="dlg-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Sluiten</button></div>`, {
    onReady(dlg) {
      const boxes = () => $$('input[name=ids]:not(:disabled)', dlg);
      const upd = () => { const n = boxes().filter(b => b.checked).length; const c = $('[data-pscount]', dlg); if (c) c.textContent = `${n} geselecteerd`; $$('[data-psact]', dlg).forEach(b => (b.disabled = !n)); const all = $('[data-psall]', dlg); if (all) all.checked = n && n === boxes().length; };
      dlg.addEventListener('change', ev => { if (ev.target.matches('[data-psall]')) boxes().forEach(b => (b.checked = ev.target.checked)); upd(); });
    },
    async onSubmit(fd, action) {
      const ids = fd.getAll('ids'); if (!ids.length) return false;
      const how = action === 'open' ? 'open' : 'delete';
      if (!await ask(`${ids.length} dienst${ids.length > 1 ? 'en' : ''} van ${first} ${how === 'delete' ? 'verwijderen' : 'open zetten'}? ${first} krijgt één melding.`, how === 'delete' ? 'Verwijderen' : 'Open zetten')) throw 'cancel';
      await store.bulkShifts(ids, how);
      toast(`${ids.length} dienst${ids.length > 1 ? 'en' : ''} ${how === 'delete' ? 'verwijderd' : 'open gezet'}`); rerender();
    },
  });
}

// Alle komende diensten van één medewerker vanaf een datum in één keer verwijderen of open zetten
async function futureShiftsDialog(e) {
  const now = new Date(), all = (await store.shiftsOf(e.id, todayIso(), iso(addDays(now, 800)))).filter(x => shiftWindow(x)[0] > now);
  const first = e.name.split(' ')[0];
  if (!all.length) return toast(`${first} heeft geen komende diensten`);
  const pick = from => all.filter(x => x.date >= from);
  openDialog(`Komende diensten van ${first}`, `
    <label class="field">Vanaf welke datum?<input type="date" name="from" value="${todayIso()}" min="${todayIso()}" required></label>
    <div data-futlist>${conflictChoice(all, { keep: false })}</div>
    <div class="dlg-foot"><button type="button" class="btn" data-close>Annuleren</button><span class="spacer"></span><button class="btn primary" value="save">Doorvoeren</button></div>`, {
    onReady(dlg) {
      const f = $('form', dlg), box = $('[data-futlist]', dlg);
      f.from.onchange = () => { const how = (f.conflict && f.conflict.value) || 'open'; const l = pick(f.from.value || todayIso()); box.innerHTML = l.length ? conflictChoice(l, { keep: false }) : '<p class="hint">Vanaf deze datum staan er geen diensten meer.</p>'; const r = $(`input[name=conflict][value=${how}]`, box); if (r) r.checked = true; };
    },
    async onSubmit(fd) {
      const l = pick(fd.get('from') || todayIso()), how = fd.get('conflict');
      if (!l.length || !how || how === 'keep') return;
      if (!await ask(`${l.length} dienst${l.length > 1 ? 'en' : ''} van ${first} ${how === 'delete' ? 'verwijderen' : 'open zetten'}?`, how === 'delete' ? 'Verwijderen' : 'Open zetten')) throw 'cancel';
      toast('Klaar' + await resolveConflicts(l, how)); rerender();
    },
  });
}

/* ================= Meldingen & push ================= */
function timeAgo(ts) {
  const m = Math.round((Date.now() - new Date(ts)) / 60000);
  if (m < 1) return 'zojuist';
  if (m < 60) return `${m} min geleden`;
  if (m < 60 * 24) return `${Math.round(m / 60)} uur geleden`;
  return fmtShort(iso(new Date(ts)));
}
function urlB64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

async function pushState() {
  if (store.demo) return { state: 'demo' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return { state: isIOS() && !isStandalone() ? 'ios-install' : 'unsupported' };
  if (!(await store.vapidKey())) return { state: 'not-configured' };
  if (Notification.permission === 'denied') return { state: 'denied' };
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); return { state: sub ? 'on' : 'off' }; }
  catch (e) { return { state: 'off' }; }
}
async function enablePush() {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Meldingen zijn niet toegestaan. Zet ze aan in de instellingen van je telefoon of browser.');
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(await store.vapidKey()) });
  const j = sub.toJSON();
  await store.savePushSub({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 200) });
}
const PUSHTXT = {
  demo: 'In de demo worden geen echte pushmeldingen verstuurd; je ziet ze hier in de lijst.',
  'ios-install': 'Op iPhone werken pushmeldingen alleen als de app op je beginscherm staat. Tik op de deelknop → “Zet op beginscherm”, open de app daar en zet dan meldingen aan.',
  unsupported: 'Deze browser ondersteunt geen pushmeldingen. Je meldingen verschijnen wel hier.',
  'not-configured': 'Pushmeldingen zijn nog niet ingesteld door de directie. Je meldingen verschijnen wel hier.',
  denied: 'Meldingen zijn geblokkeerd. Zet ze aan via de instellingen van je telefoon of browser.',
  on: 'Pushmeldingen staan aan op dit toestel ✓',
};

async function notifPanel() {
  const [list, ps] = await Promise.all([store.notifications(), pushState()]);
  const unread = list.filter(n => !n.read_at).length;
  openDialog('Meldingen', `
    <div class="pushbox ${ps.state === 'on' ? 'on' : ''}">${ps.state === 'off' ? '<span>Krijg een melding op je telefoon bij een nieuw rooster, wijziging of ruilverzoek.</span><button type="button" class="btn primary sm" data-push>Pushmeldingen aanzetten</button>' : `<span>${esc(PUSHTXT[ps.state])}</span>`}</div>
    ${list.length ? `<ul class="notifs">${list.map(n => `<li class="${n.read_at ? '' : 'unread'}"><button type="button" data-nid="${n.id}" data-nview="${esc(n.view || '')}"><strong>${esc(n.title)}</strong>${n.body ? `<span>${esc(n.body)}</span>` : ''}<small>${timeAgo(n.created_at)}</small></button></li>`).join('')}</ul>` : '<div class="empty">Nog geen meldingen.</div>'}
    <div class="dlg-foot">${unread ? '<button type="button" class="btn" data-readall>Alles gelezen</button>' : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Sluiten</button></div>`, {
    onReady(dlg) {
      dlg.addEventListener('click', async ev => {
        const p = ev.target.closest('[data-push]');
        if (p) { p.disabled = true; try { await enablePush(); toast('Pushmeldingen staan aan'); dlg.close(); } catch (e) { toast(errMsg(e), 'error'); p.disabled = false; } return; }
        if (ev.target.closest('[data-readall]')) { await store.markRead(null); dlg.close(); refreshBadge(); return; }
        const n = ev.target.closest('[data-nid]');
        if (n) { await store.markRead([n.dataset.nid]); dlg.close(); if (n.dataset.nview) openView(n.dataset.nview); else refreshBadge(); }
      });
    },
    onSubmit() {},
  });
}

// "aanvragen:ruilen" → tabblad + subtabblad
function openView(v) {
  if (v === 'mededelingen') v = isMgr() ? 'overzicht' : 'mijn';
  const [view, sub] = String(v).split(':');
  if (!tabsFor().some(([k]) => k === view)) return refreshBadge();
  if (sub) S.reqTab = sub;
  go(view);
}

/* ================= Ruilen (medewerker) ================= */
function swapDialog(myShifts, emps, allShifts, preselect, swaps = []) {
  const today = todayIso();
  const busy = new Set(swaps.filter(w => ['open', 'accepted'].includes(w.status)).flatMap(w => [w.shift_id, w.swap_shift_id]).filter(Boolean));
  const now = new Date();
  const all = myShifts.filter(s => s.date >= today && shiftWindow(s)[0] > now);   // alleen diensten die nog niet begonnen zijn
  const mine = all.filter(s => !busy.has(s.id));
  if (!all.length) return toast('Je hebt geen komende diensten om te ruilen');
  if (!mine.length) return toast('Voor al je komende diensten loopt al een ruilverzoek');
  if (preselect && busy.has(preselect)) return toast('Voor deze dienst loopt al een ruilverzoek');
  const colleagues = emps.filter(e => e.id !== S.me.id && e.active !== false);
  const theirs = id => allShifts.filter(s => s.employee_id === id && s.published && s.date >= today && shiftWindow(s)[0] > now && !busy.has(s.id));
  const opt = s => `${fmtShort(s.date)} ${hm(s.start_time)}–${hm(s.end_time)}${s.position ? ' · ' + s.position : ''}`;
  openDialog('Dienst ruilen of overdragen', `
    <label class="field">Welke dienst?<select name="shift_id">${all.map(s => `<option value="${s.id}" ${s.id === preselect ? 'selected' : ''} ${busy.has(s.id) ? 'disabled' : ''}>${esc(opt(s))}${busy.has(s.id) ? ' — verzoek loopt al' : ''}</option>`).join('')}</select></label>
    <label class="field">Aan wie?<select name="to"><option value="">Iedereen — wie het eerst reageert</option>${colleagues.map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></label>
    <label class="field" data-swapwrap hidden>In ruil voor (optioneel)<select name="swap_shift_id"><option value="">Niets — alleen overdragen</option></select></label>
    <label class="field">Toelichting<input name="note" placeholder="Bijv. verjaardag, tentamen"></label>
    <p class="hint">${CFG.swapNeedsApproval === false ? 'Zodra je collega accepteert, verandert het rooster.' : 'Je collega moet accepteren; daarna keurt de directie het goed. Pas dan verandert het rooster.'}</p>
    <div class="dlg-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">Versturen</button></div>`, {
    onReady(dlg) {
      const f = $('form', dlg), wrap = $('[data-swapwrap]', dlg);
      f.to.onchange = () => {
        const list = f.to.value ? theirs(f.to.value) : [];
        wrap.hidden = !f.to.value;
        const nm = (colleagues.find(e => e.id === f.to.value)?.name || '').split(' ')[0];
        f.swap_shift_id.innerHTML = '<option value="">Niets — alleen overdragen</option>' + (list.length ? list.map(s => `<option value="${s.id}">${esc(opt(s))}</option>`).join('') : `<option disabled>${esc(nm)} heeft geen komende diensten om te ruilen</option>`);
      };
    },
    async onSubmit(fd) {
      await store.swapOffer({ shift_id: fd.get('shift_id'), to_employee: fd.get('to') || null, swap_shift_id: fd.get('swap_shift_id') || null, note: fd.get('note') });
      toast(fd.get('to') ? 'Verzoek verstuurd naar je collega' : 'Dienst aangeboden aan het team'); rerender();
    },
  });
}

async function viewDiensten(el) {
  const today = todayIso();
  const [shifts, apps, swaps, emps0] = await Promise.all([store.shifts(iso(addDays(new Date(), -14)), iso(addDays(new Date(), 90))), store.applications(), store.swaps(), store.employees()]);
  const emps = sortEmps(emps0);
  const byId = Object.fromEntries(emps.map(e => [e.id, e]));
  const sh = id => shifts.find(s => s.id === id);
  const fn = id => (byId[id]?.name || '').split(' ')[0] || 'Collega';
  const L = s => (s ? `${fmtShort(s.date)} · ${hm(s.start_time)}–${hm(s.end_time)}${s.position ? ' · ' + esc(s.position) : ''}` : 'Dienst');
  const workDay = ds => shifts.find(s => s.employee_id === S.me.id && s.date === ds && s.published);
  const open = shifts.filter(s => !s.employee_id && s.published && s.date >= today);
  const myApp = id => apps.find(a => a.shift_id === id && a.employee_id === S.me.id);
  const incoming = swaps.filter(w => w.status === 'open' && w.from_employee !== S.me.id && (!w.to_employee || w.to_employee === S.me.id) && sh(w.shift_id)?.date >= today);
  const mine = swaps.filter(w => (w.from_employee === S.me.id || w.taken_by === S.me.id) && w.status !== 'cancelled').slice(0, 12);
  const myShifts = shifts.filter(s => s.employee_id === S.me.id && s.published);

  const openCard = s => {
    const a = myApp(s.id), clash = workDay(s.date);
    return `<article class="card req"><div class="req-head"><strong>${L(s)}</strong>${a ? `<span class="status ${a.status === 'pending' ? 'pending' : a.status === 'accepted' ? 'approved' : 'rejected'}">${{ pending: 'Aangemeld', accepted: 'Van jou', rejected: 'Niet gekregen' }[a.status]}</span>` : ''}</div>
      ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}${clash ? `<p class="conflict">Je werkt die dag al ${hm(clash.start_time)}–${hm(clash.end_time)}.</p>` : ''}
      <div class="req-actions">${!a || a.status === 'rejected' ? `<button class="btn sm primary" data-apply="${s.id}">Aanmelden</button>` : a.status === 'pending' ? `<button class="btn sm" data-withdraw="${s.id}">Afmelden</button><span class="hint">De directie kiest wie de dienst krijgt.</span>` : ''}</div></article>`;
  };
  const inCard = w => {
    const s = sh(w.shift_id), s2 = w.swap_shift_id ? sh(w.swap_shift_id) : null, clash = s && workDay(s.date);
    return `<article class="card req"><div class="req-head"><span class="dot" style="background:${esc(byId[w.from_employee]?.color || COLORS[0])};margin:0"></span><strong>${esc(fn(w.from_employee))} ${s2 ? 'wil ruilen' : w.to_employee ? 'vraagt jou' : 'biedt aan'}</strong></div>
      <p class="dates">${L(s)}</p>${s2 ? `<p class="note">In ruil voor jouw dienst: <strong>${L(s2)}</strong></p>` : ''}${w.note ? `<p class="note">“${esc(w.note)}”</p>` : ''}
      ${clash && !s2 ? `<p class="conflict">Je werkt die dag al ${hm(clash.start_time)}–${hm(clash.end_time)}.</p>` : ''}
      <div class="req-actions"><button class="btn sm ok" data-accept="${w.id}">${s2 ? 'Ruil accepteren' : 'Overnemen'}</button>${w.to_employee ? `<button class="btn sm danger" data-decline="${w.id}">Weigeren</button>` : ''}</div></article>`;
  };
  const myCard = w => {
    const s = sh(w.shift_id), s2 = w.swap_shift_id ? sh(w.swap_shift_id) : null, own = w.from_employee === S.me.id;
    const who = own ? (w.taken_by ? fn(w.taken_by) : w.to_employee ? fn(w.to_employee) : 'iedereen') : fn(w.from_employee);
    const st = w.status === 'accepted' && !own ? 'Je neemt over · wacht op directie' : SWAPST[w.status];
    return `<article class="card req"><div class="req-head"><strong>${own ? (s2 ? 'Ruilen met ' : 'Aangeboden aan ') + esc(who) : 'Overnemen van ' + esc(who)}</strong><span class="status ${w.status === 'approved' ? 'approved' : ['rejected', 'cancelled'].includes(w.status) ? 'rejected' : 'pending'}">${esc(st)}</span></div>
      <p class="dates">${L(s)}</p>${s2 ? `<p class="note">Tegen: ${L(s2)}</p>` : ''}${w.manager_note ? `<p class="reply"><strong>Directie:</strong> ${esc(w.manager_note)}</p>` : ''}
      ${own && ['open', 'accepted'].includes(w.status) ? `<div class="req-actions"><button class="btn sm danger" data-cancel="${w.id}">Intrekken</button></div>` : ''}</article>`;
  };

  el.innerHTML = `
    <div class="page-head"><div><h1>Diensten</h1><p>Open diensten, ruilen en overnemen.</p></div>
      <button class="btn primary" data-newswap ${myShifts.some(s => s.date >= today) ? '' : 'disabled'}>⇄ Dienst ruilen of overdragen</button></div>
    <section class="sect"><h2>Open diensten <span class="muted">(${open.length})</span></h2>
      ${open.length ? `<div class="reqs">${open.map(openCard).join('')}</div>` : '<div class="card empty">Er zijn nu geen open diensten.</div>'}</section>
    <section class="sect"><h2>Aangeboden door collega's <span class="muted">(${incoming.length})</span></h2>
      ${incoming.length ? `<div class="reqs">${incoming.map(inCard).join('')}</div>` : '<div class="card empty">Geen verzoeken op dit moment.</div>'}</section>
    ${mine.length ? `<section class="sect"><h2>Mijn ruilverzoeken</h2><div class="reqs">${mine.map(myCard).join('')}</div></section>` : ''}`;

  el.onclick = async ev => {
    const t = ev.target.closest('button'); if (!t) return;
    try {
      if (t.matches('[data-newswap]')) return swapDialog(myShifts, emps, shifts, null, swaps);
      if (t.dataset.apply) { await store.openApply(t.dataset.apply); toast('Aangemeld — de directie laat het weten'); return rerender(); }
      if (t.dataset.withdraw) { await store.openWithdraw(t.dataset.withdraw); toast('Afgemeld'); return rerender(); }
      if (t.dataset.accept) {
        if (!await ask('Weet je zeker dat je deze dienst wilt overnemen?', 'Ja, overnemen')) return;
        await store.swapRespond(t.dataset.accept, true); toast('Geaccepteerd'); return rerender();
      }
      if (t.dataset.decline) { await store.swapRespond(t.dataset.decline, false); toast('Geweigerd'); return rerender(); }
      if (t.dataset.cancel) { if (!await ask('Dit verzoek intrekken?')) return; await store.swapCancel(t.dataset.cancel); toast('Ingetrokken'); return rerender(); }
    } catch (e) { toast(errMsg(e), 'error'); }
  };
}

/* ================= Beschikbaarheid (medewerker) ================= */
async function viewBeschikbaar(el) {
  S.avWeek ||= addDays(mondayOf(new Date()), 7);
  const mon = S.avWeek, from = iso(mon), to = iso(addDays(mon, 6));
  const [av, prevAv, shifts] = await Promise.all([store.availability(from, to), store.availability(iso(addDays(mon, -7)), iso(addDays(mon, -1))), store.shifts(from, to)]);
  const mineAv = av.filter(a => a.employee_id === S.me.id);
  const get = ds => mineAv.find(a => a.date === ds);
  const wl = weekLabel(mon);
  const filled = mineAv.length;
  const rows = [...Array(7)].map((_, i) => {
    const ds = iso(addDays(mon, i)), a = get(ds), work = shifts.find(s => s.employee_id === S.me.id && s.date === ds);
    return `<div class="avrow"><div class="d"><span>${DAG[i]}</span><b>${addDays(mon, i).getDate()}</b></div>
      <div class="avopts"><label class="avopt av-leeg"><input type="radio" name="k-${i}" value="" ${a ? '' : 'checked'}><span>Leeg</span></label>${Object.keys(AVAIL).map(k => `<label class="avopt av-${k}"><input type="radio" name="k-${i}" value="${k}" ${a?.kind === k ? 'checked' : ''}><span>${k === 'niet' ? 'Niet' : AVAIL[k]}</span></label>`).join('')}</div>
      <input class="input avnote" name="n-${i}" placeholder="Opmerking (optioneel)" value="${esc(a?.note || '')}">
      ${work ? `<small class="hint">Ingepland: ${hm(work.start_time)}–${hm(work.end_time)}</small>` : ''}</div>`;
  }).join('');
  el.innerHTML = `
    <div class="page-head"><div><h1>Beschikbaarheid</h1><p>Geef per week door wanneer je kunt werken. De directie ziet dit bij het plannen.</p></div></div>
    <div class="toolbar"><div class="weeknav">
      <button class="btn icon" data-w="-1" aria-label="Vorige week">‹</button>
      <div class="label"><strong>${wl.title}</strong><span>${wl.sub}</span></div>
      <button class="btn icon" data-w="1" aria-label="Volgende week">›</button></div>
      <div class="actions"><button class="btn sm" data-fill="hele_dag">Hele week beschikbaar</button>${prevAv.some(a => a.employee_id === S.me.id) ? '<button class="btn sm" data-copyprev>Zelfde als vorige week</button>' : ''}</div></div>
    <form class="card avform" id="avform">${rows}
      <div class="avfoot"><span class="hint">${filled ? `✓ ${filled} van 7 dagen doorgegeven` : 'Nog niet doorgegeven'}</span><button class="btn primary">Opslaan</button></div></form>`;
  const f = $('#avform');
  f.onsubmit = async ev => {
    ev.preventDefault();
    const fd = new FormData(f);
    const out = [...Array(7)].map((_, i) => ({ date: iso(addDays(mon, i)), kind: fd.get(`k-${i}`) || null, note: (fd.get(`n-${i}`) || '').trim() || null }));
    try { await store.saveAvailability(out); toast('Beschikbaarheid opgeslagen'); rerender(); } catch (e) { toast(errMsg(e), 'error'); }
  };
  el.onclick = ev => {
    const w = ev.target.closest('[data-w]'); if (w) { S.avWeek = addDays(S.avWeek, 7 * Number(w.dataset.w)); return rerender(); }
    const fill = ev.target.closest('[data-fill]'); if (fill) { $$(`input[value="${fill.dataset.fill}"]`, f).forEach(r => (r.checked = true)); return toast('Ingevuld — vergeet niet op te slaan'); }
    if (ev.target.closest('[data-copyprev]')) {
      prevAv.filter(a => a.employee_id === S.me.id).forEach(a => { const i = dayIdx(parse(a.date)); const r = $(`input[name="k-${i}"][value="${a.kind}"]`, f); if (r) r.checked = true; if (a.note) f[`n-${i}`].value = a.note; });
      return toast('Overgenomen van vorige week — vergeet niet op te slaan');
    }
  };
}

/* ================= Directie: aanvragen-subtabs ================= */
async function mgrCounts() {
  const [reqs, swaps, apps, open] = await Promise.all([store.requests(), store.swaps(), store.applications(), store.shifts(todayIso(), iso(addDays(new Date(), 120)))]);
  const openIds = new Set(open.filter(s => !s.employee_id).map(s => s.id));
  return {
    verlof: reqs.filter(r => r.status === 'pending').length,
    ruilen: swaps.filter(w => w.status === 'accepted').length,
    open: new Set(apps.filter(a => a.status === 'pending' && openIds.has(a.shift_id)).map(a => a.shift_id)).size,
  };
}
async function reqTabsHTML() {
  const c = await mgrCounts();
  return `<div class="subtabs">${[['verlof', 'Verlof', c.verlof], ['ruilen', 'Ruilen', c.ruilen], ['open', 'Open diensten', c.open], ['beschikbaar', 'Beschikbaarheid', 0]].map(([k, l, n]) => `<button data-rt="${k}" class="${S.reqTab === k ? 'active' : ''}">${l}${n ? ` <span class="count">${n}</span>` : ''}</button>`).join('')}</div>`;
}
function rtClick(ev) { const b = ev.target.closest('[data-rt]'); if (b) { S.reqTab = b.dataset.rt; rerender(); return true; } return false; }

async function viewSwapsMgr(el) {
  const [swaps, emps, st] = await Promise.all([store.swaps(), store.employees(), store.settings()]);
  const ids = [...new Set(swaps.flatMap(w => [w.shift_id, w.swap_shift_id]).filter(Boolean))];
  const shifts = ids.length ? await store.shifts(iso(addDays(new Date(), -60)), iso(addDays(new Date(), 120))) : [];
  const byId = Object.fromEntries(emps.map(e => [e.id, e]));
  const sh = id => shifts.find(s => s.id === id);
  const fn = id => byId[id]?.name || '—';
  const L = s => (s ? `${fmtShort(s.date)} · ${hm(s.start_time)}–${hm(s.end_time)}${s.position ? ' · ' + esc(s.position) : ''}` : 'Dienst');
  S.swFilter ||= 'todo';
  const list = S.swFilter === 'todo' ? swaps.filter(w => ['open', 'accepted'].includes(w.status)) : swaps;
  el.innerHTML = `
    <div class="page-head"><div><h1>Aanvragen</h1><p>Diensten die medewerkers onderling ruilen of overdragen.</p></div></div>
    ${await reqTabsHTML()}
    <div class="toolbar"><div class="filters"><button data-swf="todo" class="${S.swFilter === 'todo' ? 'active' : ''}">Lopend</button><button data-swf="all" class="${S.swFilter === 'all' ? 'active' : ''}">Alles</button></div>
      <label class="check small"><input type="checkbox" data-needapp ${st.swap_needs_approval !== false ? 'checked' : ''}> Ruilen moet door directie worden goedgekeurd</label></div>
    ${list.length ? `<div class="reqs">${list.map(w => {
      const s = sh(w.shift_id), s2 = w.swap_shift_id ? sh(w.swap_shift_id) : null, taker = w.taken_by || w.to_employee;
      const clash = taker && s && shifts.find(x => x.employee_id === taker && x.date === s.date && x.id !== w.swap_shift_id);
      return `<article class="card req"><div class="req-head"><strong>${esc(fn(w.from_employee))} → ${taker ? esc(fn(taker)) : '<span class="muted">iedereen</span>'}</strong><span class="badge">${s2 ? 'Ruil' : 'Overdragen'}</span><span class="status ${w.status === 'approved' ? 'approved' : ['rejected', 'cancelled'].includes(w.status) ? 'rejected' : 'pending'}">${SWAPST[w.status]}</span></div>
        <p class="dates">${L(s)}</p>${s2 ? `<p class="note">Tegen: ${L(s2)}</p>` : ''}${w.note ? `<p class="note">“${esc(w.note)}”</p>` : ''}
        ${clash ? `<p class="conflict">⚠︎ ${esc(fn(taker))} werkt die dag al ${hm(clash.start_time)}–${hm(clash.end_time)}.</p>` : ''}
        ${w.manager_note ? `<p class="reply"><strong>Notitie:</strong> ${esc(w.manager_note)}</p>` : ''}
        ${w.status === 'accepted' ? `<div class="req-actions"><button class="btn sm ok" data-swok="${w.id}">Goedkeuren</button><button class="btn sm danger" data-swno="${w.id}">Afwijzen</button></div>` : ''}</article>`;
    }).join('')}</div>` : `<div class="card empty">${S.swFilter === 'todo' ? 'Geen lopende ruilverzoeken.' : 'Nog geen ruilverzoeken.'}</div>`}`;
  el.onclick = async ev => {
    if (rtClick(ev)) return;
    const f = ev.target.closest('[data-swf]'); if (f) { S.swFilter = f.dataset.swf; return rerender(); }
    try {
      const ok = ev.target.closest('[data-swok]'); if (ok) { await store.swapDecide(ok.dataset.swok, true, null); toast('Ruil goedgekeurd — rooster aangepast'); return rerender(); }
    } catch (e) { return toast(errMsg(e), 'error'); }
    const no = ev.target.closest('[data-swno]');
    if (no) openDialog('Ruil afwijzen', `<label class="field">Reden (beide medewerkers zien dit)<input name="note" placeholder="Bijv. onvoldoende ervaring achter de bar"></label><div class="dlg-foot"><button type="button" class="btn" data-close>Annuleren</button><button class="btn danger" value="save">Afwijzen</button></div>`, {
      async onSubmit(fd) { await store.swapDecide(no.dataset.swno, false, fd.get('note').trim()); toast('Ruil afgewezen'); rerender(); } });
  };
  el.onchange = async ev => { if (ev.target.matches('[data-needapp]')) { await store.saveSettings({ swap_needs_approval: ev.target.checked }); toast(ev.target.checked ? 'Ruilen vraagt nu goedkeuring' : 'Ruilen gaat nu direct door na akkoord collega'); } };
}

async function viewOpenMgr(el) {
  const today = todayIso(), to = iso(addDays(new Date(), 120));
  const [shifts, apps, emps0, av, reqsO] = await Promise.all([store.shifts(today, to), store.applications(), store.employees(), store.availability(today, to), store.requests()]);
  const emps = sortEmps(emps0);
  const onLeaveO = (emp, ds) => reqsO.some(r => r.status === 'approved' && r.employee_id === emp && r.start_date <= ds && r.end_date >= ds);
  const byId = Object.fromEntries(emps.map(e => [e.id, e]));
  const open = shifts.filter(s => !s.employee_id);
  const weekHours = (emp, ds) => { const m = iso(mondayOf(parse(ds))), e = iso(addDays(parse(m), 6)); return shifts.filter(s => s.employee_id === emp && s.date >= m && s.date <= e).reduce((t, s) => t + shiftHours(s), 0); };
  el.innerHTML = `
    <div class="page-head"><div><h1>Aanvragen</h1><p>Open diensten en wie zich heeft aangemeld.</p></div><button class="btn primary" data-newopen>+ Open dienst</button></div>
    ${await reqTabsHTML()}
    ${open.length ? `<div class="reqs">${open.map(s => {
      const list = apps.filter(a => a.shift_id === s.id && a.status === 'pending');
      return `<article class="card req"><div class="req-head"><strong>${fmtShort(s.date)} · ${hm(s.start_time)}–${hm(s.end_time)}</strong>${s.position ? `<span class="badge">${esc(s.position)}</span>` : ''}<span class="status ${s.published ? 'pending' : 'rejected'}">${s.published ? `${list.length} aanmelding${list.length === 1 ? '' : 'en'}` : 'Concept – nog niet zichtbaar'}</span></div>
        ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
        ${list.length ? `<ul class="applist">${list.map(a => { const e = byId[a.employee_id] || {}; const v = av.find(x => x.employee_id === a.employee_id && x.date === s.date); const h = weekHours(a.employee_id, s.date);
          return `<li><span class="dot" style="background:${esc(e.color || COLORS[0])};margin:0"></span><strong>${esc(e.name || '?')}</strong><span class="muted small">${fmtH(h)} u die week${e.contract_hours ? ` / ${fmtH(Number(e.contract_hours))}` : ''}${v ? ' · ' + AVAIL_SHORT[v.kind] : ''}${onLeaveO(a.employee_id, s.date) ? ' · <strong class="neg">heeft verlof</strong>' : ''}</span><button class="btn sm ok" data-assign="${s.id}|${a.employee_id}">Toewijzen</button></li>`; }).join('')}</ul>` : s.published ? '<p class="hint">Nog niemand aangemeld.</p>' : '<p class="hint">Publiceer de week in Planning om deze dienst zichtbaar te maken.</p>'}
        <div class="req-actions"><button class="btn sm" data-editopen="${s.id}">Bewerken</button></div></article>`;
    }).join('')}</div>` : '<div class="card empty">Geen open diensten. Maak er een via <strong>+ Open dienst</strong> of in de planning (kies “Open dienst” als medewerker).</div>'}`;
  el.onclick = async ev => {
    if (rtClick(ev)) return;
    const a = ev.target.closest('[data-assign]');
    if (a) { const [sid, emp] = a.dataset.assign.split('|'); try { await store.openAssign(sid, emp); toast(`Toegewezen aan ${byId[emp]?.name.split(' ')[0]}`); rerender(); } catch (e) { toast(errMsg(e), 'error'); } return; }
    const t = CFG.diensten[0] || { start: '09:00', end: '17:00', pauze: 30 };
    if (!ev.target.closest('[data-newopen], [data-editopen]')) return;
    const [lvAll0, privO0] = await Promise.all([store.requests(), store.privates()]);
    const lvAll = lvAll0.filter(r => r.status !== 'rejected'), privO = Object.fromEntries(privO0.map(p => [p.employee_id, p]));
    if (ev.target.closest('[data-newopen]')) return shiftDialog({ employee_id: null, date: today, start_time: t.start, end_time: t.end, break_minutes: t.pauze || 0, position: '', note: '' }, emps, shifts, lvAll, av, apps, privO);
    const ed = ev.target.closest('[data-editopen]'); if (ed) return shiftDialog(open.find(s => s.id === ed.dataset.editopen), emps, shifts, lvAll, av, apps, privO);
  };
}

async function viewAvailMgr(el) {
  S.avWeek ||= addDays(mondayOf(new Date()), 7);
  const mon = S.avWeek, from = iso(mon), to = iso(addDays(mon, 6));
  const [emps0, av] = await Promise.all([store.employees(), store.availability(from, to)]);
  const emps = sortEmps(emps0).filter(e => e.active !== false);
  const wl = weekLabel(mon);
  const missing = emps.filter(e => e.role !== 'manager' && !av.some(a => a.employee_id === e.id));
  el.innerHTML = `
    <div class="page-head"><div><h1>Aanvragen</h1><p>Doorgegeven beschikbaarheid per week.</p></div></div>
    ${await reqTabsHTML()}
    <div class="toolbar"><div class="weeknav">
      <button class="btn icon" data-w="-1" aria-label="Vorige week">‹</button>
      <div class="label"><strong>${wl.title}</strong><span>${wl.sub}</span></div>
      <button class="btn icon" data-w="1" aria-label="Volgende week">›</button></div></div>
    ${missing.length ? `<p class="warnbox" style="margin:0 0 12px">Nog niet doorgegeven: ${missing.map(e => esc(e.name.split(' ')[0])).join(', ')}</p>` : '<p class="msg ok">Iedereen heeft zijn beschikbaarheid doorgegeven ✓</p>'}
    <div class="card table-wrap"><table class="list avtable">
      <thead><tr><th>Medewerker</th>${[...Array(7)].map((_, i) => `<th>${DAG[i]} ${addDays(mon, i).getDate()}</th>`).join('')}</tr></thead>
      <tbody>${emps.map(e => `<tr><td><div class="namecell"><span class="dot" style="background:${esc(e.color || COLORS[0])}"></span>${esc(e.name)}</div></td>${[...Array(7)].map((_, i) => { const a = av.find(x => x.employee_id === e.id && x.date === iso(addDays(mon, i))); return `<td>${a ? `<span class="av av-${a.kind}" title="${esc(a.note || '')}">${AVAIL_SHORT[a.kind]}</span>${a.note ? `<small class="muted avn">${esc(a.note)}</small>` : ''}` : '<span class="muted">—</span>'}</td>`; }).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  el.onclick = ev => { if (rtClick(ev)) return; const w = ev.target.closest('[data-w]'); if (w) { S.avWeek = addDays(S.avWeek, 7 * Number(w.dataset.w)); rerender(); } };
}

/* ================= Feestdagen & toeslag-uren ================= */
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), n = h + l - 7 * m + 114;
  return new Date(y, Math.floor(n / 31) - 1, (n % 31) + 1);
}
const _fd = {};
// Gesloten dagen en extra feestdagen uit Instellingen
function specialDay(ds) { return (CFG.specialDays || []).find(x => x.date === ds) || null; }
function feestdag(ds) {
  const y = Number(ds.slice(0, 4));
  if (!_fd[y]) {
    const e = easter(y);
    const kd = new Date(y, 3, 27); if (kd.getDay() === 0) kd.setDate(26);
    _fd[y] = {
      [`${y}-01-01`]: 'Nieuwjaarsdag', [iso(e)]: '1e Paasdag', [iso(addDays(e, 1))]: '2e Paasdag', [iso(kd)]: 'Koningsdag',
      [`${y}-05-05`]: 'Bevrijdingsdag', [iso(addDays(e, 39))]: 'Hemelvaartsdag', [iso(addDays(e, 49))]: '1e Pinksterdag',
      [iso(addDays(e, 50))]: '2e Pinksterdag', [`${y}-12-25`]: '1e Kerstdag', [`${y}-12-26`]: '2e Kerstdag',
      ...(CFG.extraFeestdagen || {}),
    };
  }
  const sp = specialDay(ds);
  return (sp?.kind === 'feestdag' ? sp.label : null) || _fd[y][ds] || null;
}
// Splitst een dienst in uren per toeslagcategorie (bruto, pauze niet afgetrokken)
function splitShift(s) {
  const T = Object.assign({ avondVan: '20:00', avondTot: '24:00', nachtVan: '00:00', nachtTot: '06:00' }, CFG.toeslagen || {});
  const toM = t => (t === '24:00' ? 1440 : mins(t));
  const inWin = (m, a, b) => (a <= b ? m >= a && m < b : m >= a || m < b);
  const aV = toM(T.avondVan), aT = toM(T.avondTot), nV = toM(T.nachtVan), nT = toM(T.nachtTot);
  let len = mins(s.end_time) - mins(s.start_time); if (len <= 0) len += 1440;
  const out = { avond: 0, nacht: 0, zondag: 0, feestdag: 0 };
  const start = mins(s.start_time);
  const d0 = parse(s.date), d1 = addDays(d0, 1);
  const info = [d0, d1].map(d => ({ sun: d.getDay() === 0, fd: !!feestdag(iso(d)) }));
  for (let i = 0; i < len; i++) {
    const abs = start + i, day = abs >= 1440 ? 1 : 0, m = abs % 1440;
    if (inWin(m, aV, aT)) out.avond++;
    if (inWin(m, nV, nT)) out.nacht++;
    if (info[day].sun) out.zondag++;
    if (info[day].fd) out.feestdag++;
  }
  for (const k in out) out[k] /= 60;
  return out;
}

/* ================= Loon, verlof en Arbeidstijdenwet ================= */
const euro = n => (n == null ? '—' : '€ ' + (Math.round(n * 100) / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
function ageOn(birth, ds) {
  if (!birth) return null;
  const b = parse(birth), d = parse(ds);
  let a = d.getFullYear() - b.getFullYear();
  if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) a--;
  return a;
}
// Brutoloon van een dienst: uren × uurloon + toeslag. Per minuut telt de hoogste toeslag die van toepassing is.
function costOf(sh, wage, st = {}) {
  if (!wage) return null;
  const T = Object.assign({ avondVan: '20:00', avondTot: '24:00', nachtVan: '00:00', nachtTot: '06:00' }, CFG.toeslagen || {});
  const toM = t => (t === '24:00' ? 1440 : mins(t));
  const inWin = (m, a, b) => (a <= b ? m >= a && m < b : m >= a || m < b);
  const aV = toM(T.avondVan), aT = toM(T.avondTot), nV = toM(T.nachtVan), nT = toM(T.nachtTot);
  let len = mins(sh.end_time) - mins(sh.start_time); if (len <= 0) len += 1440;
  const net = Math.max(0, len - (Number(sh.break_minutes) || 0));
  const d0 = parse(sh.date), info = [d0, addDays(d0, 1)].map(d => ({ sun: d.getDay() === 0, fd: !!feestdag(iso(d)) }));
  const start = mins(sh.start_time);
  let pctSum = 0;
  for (let i = 0; i < len; i++) {
    const abs = start + i, day = abs >= 1440 ? 1 : 0, m = abs % 1440;
    pctSum += Math.max(inWin(m, aV, aT) ? Number(st.pct_avond) || 0 : 0, inWin(m, nV, nT) ? Number(st.pct_nacht) || 0 : 0,
      info[day].sun ? Number(st.pct_zondag) || 0 : 0, info[day].fd ? Number(st.pct_feestdag) || 0 : 0);
  }
  const base = wage * net / 60;
  const toeslag = len ? wage * (pctSum / 100) / 60 * (net / len) : 0;
  return { base, toeslag, bruto: base + toeslag };
}
// Loonkosten: bruto + vakantiegeld + werkgeverslasten (indicatie)
// Kosten en kerngetallen voor een lijst diensten (gepland of gewerkt)
function kpiOf(list, privs, st, omzet) {
  const hours = list.reduce((t, x) => t + shiftHours(x), 0);
  let cost = 0, noWage = 0, costHours = 0;
  list.forEach(x => { if (!x.employee_id) return; const w = Number(privs[x.employee_id]?.hourly_wage); const c = costOf(x, w, st); if (c) { cost += loonkosten(c.bruto, st).totaal; costHours += shiftHours(x); } else noWage++; });
  return { hours, cost, noWage, omzet: omzet || 0, pct: omzet ? cost / omzet * 100 : null, prod: omzet && hours ? omzet / hours : null, perHour: costHours ? cost / costHours : null };
}
// Kleur ten opzichte van het doel: ok (groen), warn (geel), bad (rood) of '' (geen doel)
function goalColor(kind, val, st) {
  if (val == null) return '';
  if (kind === 'pct') { const g = Number(st.goal_labor_pct); if (!g) return ''; return val <= g ? 'ok' : val <= g + 2 ? 'warn' : 'bad'; }
  if (kind === 'prod') { const g = Number(st.goal_productivity); if (!g) return ''; return val >= g ? 'ok' : val >= g * 0.9 ? 'warn' : 'bad'; }
  if (kind === 'hour') { const g = Number(st.goal_cost_hour); if (!g) return ''; return val <= g ? 'ok' : val <= g * 1.05 ? 'warn' : 'bad'; }
  return '';
}
const pct1 = v => (v == null ? '—' : v.toLocaleString('nl-NL', { maximumFractionDigits: 1 }) + '%');
const euro0 = v => (v == null ? '—' : '€ ' + Math.round(v).toLocaleString('nl-NL'));
function loonkosten(bruto, st = {}) {
  const vg = bruto * (Number(st.pct_vakantiegeld ?? 8) / 100);
  const wg = (bruto + vg) * (Number(st.pct_werkgever ?? 25) / 100);
  return { bruto, vg, wg, totaal: bruto + vg + wg };
}
// Verlofsaldo voor een jaar
function leaveBalance(emp, priv, reqs, year = new Date().getFullYear()) {
  const entitlement = priv?.leave_hours_year != null ? Number(priv.leave_hours_year) : 4 * (Number(emp?.contract_hours) || 0);
  const opening = priv && Number(priv.leave_year) === year ? Number(priv.leave_opening) || 0 : 0;
  const mine = reqs.filter(r => r.employee_id === emp?.id && (r.type === 'vakantie' || r.type === 'vrij') && r.start_date.slice(0, 4) === String(year));
  const used = mine.filter(r => r.status === 'approved').reduce((t, r) => t + (Number(r.leave_hours) || 0), 0);
  const pending = mine.filter(r => r.status === 'pending').length;
  return { year, entitlement, opening, used, rest: opening + entitlement - used, pending };
}
// Voorstel verlofuren: geplande uren in die periode, anders dagen × contracturen / 7
// Per week: is die week al ingepland, dan de geplande uren; anders dagen × contracturen ÷ 7
function estimateLeaveHours(r, emp, shifts) {
  const perDay = (Number(emp?.contract_hours) || 0) / 7;
  const weeks = {};
  for (let d = parse(r.start_date); iso(d) <= r.end_date; d = addDays(d, 1)) (weeks[iso(mondayOf(d))] ||= []).push(iso(d));
  let tot = 0;
  Object.values(weeks).forEach(days => {
    const mine = shifts.filter(s => s.employee_id === r.employee_id && days.includes(s.date));
    const plannedWeek = shifts.some(s => s.employee_id === r.employee_id && iso(mondayOf(parse(s.date))) === iso(mondayOf(parse(days[0]))));
    tot += plannedWeek ? mine.reduce((t, s) => t + shiftHours(s), 0) : days.length * perDay;
  });
  return Math.round(tot * 10) / 10;
}
// Arbeidstijdenwet-controle (signalering, geen juridisch advies)
function atwIssues(list, birth) {
  const L = list.map(x => ({ s: x, w: shiftWindow(x) })).sort((a, b) => a.w[0] - b.w[0]);
  const out = {}; const add = (x, m) => { const k = x.id; (out[k] ||= []); if (!out[k].includes(m)) out[k].push(m); };
  L.forEach((x, i) => {
    const age = ageOn(birth, x.s.date), young = age != null && age < 18;
    const dur = (x.w[1] - x.w[0]) / 3600000;
    const maxDur = age != null && age < 16 ? 8 : young ? 9 : 12;
    if (dur > maxDur) add(x.s, `dienst van ${fmtH(dur)} uur (max. ${maxDur}${young ? ' voor ' + age + '-jarigen' : ''})`);
    if (i > 0) {
      const rest = (x.w[0] - L[i - 1].w[1]) / 3600000, minRest = young ? 12 : 11;
      if (rest >= 0 && rest < minRest) add(x.s, `${fmtH(rest)} uur rust na vorige dienst (min. ${minRest})`);
      if (rest < 0) add(x.s, 'overlapt met een andere dienst');
    }
    if (young && age >= 16) {
      const d = parse(x.s.date);
      const nights = [[-1, 0], [0, 1]].map(([a, b]) => { const n0 = addDays(d, a); n0.setHours(23, 0, 0, 0); const n1 = addDays(d, b); n1.setHours(6, 0, 0, 0); return [n0, n1]; });
      if (nights.some(([n0, n1]) => x.w[0] < n1 && x.w[1] > n0)) add(x.s, `${age}-jarigen mogen niet werken tussen 23:00 en 06:00`);
    }
    if (age != null && age < 16) { const lim = parse(x.s.date); lim.setHours(19, 0, 0, 0); if (x.w[1] > lim) add(x.s, `onder 16 jaar: niet na 19:00 (controleer ook de schoolweekregels)`); }
  });
  const byWeek = {};
  L.forEach(x => (byWeek[iso(mondayOf(parse(x.s.date)))] ||= []).push(x));
  Object.values(byWeek).forEach(w => {
    const h = w.reduce((t, x) => t + shiftHours(x.s), 0), age = ageOn(birth, w[0].s.date), max = age != null && age < 18 ? 45 : 60;
    if (h > max) w.forEach(x => add(x.s, `${fmtH(h)} uur deze week (max. ${max})`));
  });
  return out;
}

/* ================= Periodes ================= */
function isoWeek1Monday(y) { return mondayOf(new Date(y, 0, 4)); }
function periodRange(mode, anchor) {
  if (mode === 'week') { const m = mondayOf(anchor); return { from: m, to: addDays(m, 6), label: `Week ${weekNr(m)}` }; }
  if (mode === '4weken') {
    const mon = mondayOf(anchor), thu = addDays(mon, 3), y = thu.getFullYear();
    const w1 = isoWeek1Monday(y), wk = Math.round((mon - w1) / 604800000) + 1;
    const p = Math.min(13, Math.ceil(wk / 4));
    const from = addDays(w1, (p - 1) * 28);
    const nextY = isoWeek1Monday(y + 1);
    const to = p === 13 ? addDays(nextY, -1) : addDays(from, 27);
    return { from, to, label: `Periode ${p} · ${y}` };
  }
  const f = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  return { from: f, to: new Date(f.getFullYear(), f.getMonth() + 1, 0), label: fmt(f, { month: 'long', year: 'numeric' }) };
}
function shiftPeriod(mode, anchor, dir) {
  if (mode === 'week') return addDays(anchor, 7 * dir);
  if (mode === '4weken') { const r = periodRange(mode, anchor); return dir > 0 ? addDays(r.to, 1) : addDays(r.from, -1); }
  return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
}

/* ================= Export helpers ================= */
// Draait de app in een ingesloten voorbeeld (zoals de demo op claude.ai)? Daar zijn downloads geblokkeerd.
const IN_PREVIEW = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
const IS_TOUCH = matchMedia('(pointer: coarse)').matches;

// Bestand opslaan: op de telefoon via het deelmenu (mail, Bestanden, WhatsApp), anders als download.
// Geeft terug wat er gebeurde: 'shared' | 'downloaded' | 'preview' | 'cancel'
async function saveFile(name, text, type, rows) {
  const file = new File([text], name, { type });
  if (IS_TOUCH && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return 'shared'; }
    catch (e) { if (e.name === 'AbortError') return 'cancel'; /* anders: terugvallen op downloaden */ }
  }
  if (IN_PREVIEW) { exportPreview(name, rows, text); return 'preview'; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
const SAVE_MSG = { shared: 'Bestand gedeeld', downloaded: 'Bestand gedownload — kijk in je map Downloads' };
function csvText(rows) {
  const q = v => { const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? ''); return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + rows.map(r => r.map(q).join(';')).join('\r\n');
}
async function exportCsv(name, rows) {
  const r = await saveFile(name + '.csv', csvText(rows), 'text/csv;charset=utf-8', rows);
  if (SAVE_MSG[r]) toast(SAVE_MSG[r]);
  return r;
}
// In de voorbeeldweergave: laat zien wat er in het bestand staat, met een kopieerknop
function exportPreview(name, rows, text) {
  const head = rows ? rows[0] : null, body = rows ? rows.slice(1, 31) : [];
  openDialog('Exporteren', `
    <div class="warnbox">Je bekijkt de demo in een voorbeeldweergave. Daar mag de app geen bestanden opslaan. Op jullie eigen adres (bijv. rooster.lilou.nl) wordt <strong>${esc(name)}</strong> gewoon gedownload of gedeeld.</div>
    ${rows ? `<div class="table-wrap exportprev"><table class="list"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${body.map(r => `<tr>${r.map(v => `<td>${esc(typeof v === 'number' ? String(v).replace('.', ',') : v ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      ${rows.length > 31 ? `<p class="hint">+ ${rows.length - 31} regels meer in het bestand</p>` : ''}` : `<pre class="exportprev">${esc(text.slice(0, 2000))}</pre>`}
    <div class="dlg-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Sluiten</button>${rows ? '<button type="button" class="btn primary" data-copyprev>Kopieer tabel (plakken in Excel)</button>' : ''}</div>`, {
    onReady(dlg) { const b = $('[data-copyprev]', dlg); if (b) b.onclick = () => copyRows(rows); },
    onSubmit() {},
  });
}
async function copyRows(rows) {
  const tsv = rows.map(r => r.map(v => (typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? '').replace(/[\t\n\r]+/g, ' '))).join('\t')).join('\n');
  try { await navigator.clipboard.writeText(tsv); toast('Gekopieerd — plak het in Excel of Google Sheets'); }
  catch (e) { toast('Kopiëren is hier niet toegestaan', 'error'); }
}
const r2 = n => Math.round(n * 100) / 100;
const overlapDays = (r, from, to) => { const a = r.start_date > from ? r.start_date : from, b = r.end_date < to ? r.end_date : to; return a > b ? 0 : daysBetween(a, b); };

/* ================= Uren & export ================= */
async function viewHours(el) {
  S.pmode ||= 'maand'; S.panchor ||= new Date(); if (S.onlyPub === undefined) S.onlyPub = true;
  const P = periodRange(S.pmode, S.panchor);
  const from = iso(P.from), to = iso(P.to);
  const [emps0, allShifts, reqs] = await Promise.all([store.employees(), store.shifts(from, to), store.requests()]);
  const emps = sortEmps(emps0);
  S.hsrc ||= 'gepland';
  const [ents, stH, privList] = await Promise.all([store.entries(from, to), store.settings(), store.privates()]);
  const privs = Object.fromEntries(privList.map(p => [p.employee_id, p]));
  const hasWages = privList.some(p => p.hourly_wage);
  const done = ents.filter(x => x.clock_out);
  const shifts = S.hsrc === 'gewerkt'
    ? done.filter(x => x.status === 'approved').map(x => entryAsShift(x, matchShift(x, allShifts), stH))
    : S.onlyPub ? allShifts.filter(s => s.published) : allShifts;
  const entPending = done.filter(x => x.status === 'pending').length;
  const weeks = daysBetween(from, to) / 7;
  const approved = reqs.filter(r => r.status === 'approved');

  const onLeave = (empId, ds) => approved.some(r => r.employee_id === empId && ['vakantie', 'vrij', 'ziek'].includes(r.type) && r.start_date <= ds && r.end_date >= ds);
  const rows = emps.map(e => {
    // geplande diensten op goedgekeurde verlof- of ziektedagen tellen niet als gewerkt (gewerkt = echte kloktijden, die tellen wel)
    const mine = shifts.filter(s => s.employee_id === e.id && (S.hsrc === 'gewerkt' || !onLeave(e.id, s.date)));
    const h = mine.reduce((t, s) => t + shiftHours(s), 0);
    const pauze = mine.reduce((t, s) => t + (Number(s.break_minutes) || 0) / 60, 0);
    const sp = mine.map(splitShift).reduce((a, b) => ({ avond: a.avond + b.avond, nacht: a.nacht + b.nacht, zondag: a.zondag + b.zondag, feestdag: a.feestdag + b.feestdag }), { avond: 0, nacht: 0, zondag: 0, feestdag: 0 });
    const lv = approved.filter(r => r.employee_id === e.id);
    const verlof = lv.filter(r => r.type === 'vakantie' || r.type === 'vrij').reduce((t, r) => t + overlapDays(r, from, to), 0);
    const ziek = lv.filter(r => r.type === 'ziek').reduce((t, r) => t + overlapDays(r, from, to), 0);
    // contractdoel: contracturen min verlof- en ziekte-uren; bij nuluren/oproep geen doel
    const ziekUren = ziek * (Number(e.contract_hours) || 0) / 7;
    const contract = e.contract_hours && !isFlex(e) ? Math.max(0, Number(e.contract_hours) * weeks - 0) : null;
    const wage = Number(privs[e.id]?.hourly_wage) || 0;
    const cs = wage ? mine.map(x => costOf(x, wage, stH)).reduce((a, c) => ({ base: a.base + c.base, toeslag: a.toeslag + c.toeslag, bruto: a.bruto + c.bruto }), { base: 0, toeslag: 0, bruto: 0 }) : null;
    const lk = cs ? loonkosten(cs.bruto, stH) : null;
    const verlofUren = lv.filter(r => (r.type === 'vakantie' || r.type === 'vrij') && r.leave_hours).reduce((t, r) => t + Number(r.leave_hours) * overlapDays(r, from, to) / daysBetween(r.start_date, r.end_date), 0);
    const target = contract != null ? Math.max(0, contract - verlofUren - ziekUren) : null;
    return { e, n: mine.length, h, pauze, ...sp, verlof, verlofUren, ziek, contract: target, diff: target != null ? h - target : null, wage, cs, lk };
  }).filter(r => r.n || r.verlof || r.ziek || r.e.active !== false);
  const T = rows.reduce((t, r) => ({ n: t.n + r.n, h: t.h + r.h, avond: t.avond + r.avond, nacht: t.nacht + r.nacht, zondag: t.zondag + r.zondag, feestdag: t.feestdag + r.feestdag, bruto: t.bruto + (r.lk?.bruto || 0), totaal: t.totaal + (r.lk?.totaal || 0) }), { n: 0, h: 0, avond: 0, nacht: 0, zondag: 0, feestdag: 0, bruto: 0, totaal: 0 });
  const conceptCount = allShifts.filter(s => !s.published).length;
  const fdIn = []; for (let d = new Date(P.from); d <= P.to; d = addDays(d, 1)) { const f = feestdag(iso(d)); if (f) fdIn.push(`${f} (${fmtShort(iso(d))})`); }
  const slug = `${S.hsrc}-${S.pmode}-${from}_${to}`;

  const payroll = () => [
    ['Periode van', 'Periode tot', 'Medewerker', 'E-mail', 'Functie', 'Contracttype', 'Contract u/week', 'Diensten', 'Gewerkte uren (netto)', 'Pauze (u)', 'Avonduren', 'Nachturen', 'Zondaguren', 'Feestdaguren', 'Vakantie/vrij (dagen)', 'Verlofuren', 'Ziek (dagen)', 'Contracturen periode', 'Verschil t.o.v. contract', 'Uurloon', 'Basisloon', 'Toeslagen', 'Bruto loon', 'Vakantiegeld', 'Werkgeverslasten (indicatie)', 'Totale loonkosten'],
    ...rows.map(r => [from, to, r.e.name, r.e.email, r.e.position || '', CT[r.e.contract_type || 'vast'], r.e.contract_hours ?? '', r.n, r2(r.h), r2(r.pauze), r2(r.avond), r2(r.nacht), r2(r.zondag), r2(r.feestdag), r.verlof, r2(r.verlofUren), r.ziek, r.contract != null ? r2(r.contract) : '', r.diff != null ? r2(r.diff) : '',
      r.wage || '', r.cs ? r2(r.cs.base) : '', r.cs ? r2(r.cs.toeslag) : '', r.lk ? r2(r.lk.bruto) : '', r.lk ? r2(r.lk.vg) : '', r.lk ? r2(r.lk.wg) : '', r.lk ? r2(r.lk.totaal) : '']),
  ];
  const detail = () => {
    const byId = Object.fromEntries(emps.map(e => [e.id, e]));
    return [['Datum', 'Dag', 'Medewerker', 'E-mail', 'Functie', 'Begin', 'Eind', 'Pauze (min)', 'Uren (netto)', 'Avond', 'Nacht', 'Zondag', 'Feestdag', 'Status', 'Notitie'],
      ...shifts.map(s => { const e = byId[s.employee_id] || { name: '(open dienst)' }; const sp = splitShift(s); return [s.date, DAG[dayIdx(parse(s.date))], e.name, e.email, s.position || '', hm(s.start_time), hm(s.end_time), s.break_minutes || 0, r2(shiftHours(s)), r2(sp.avond), r2(sp.nacht), r2(sp.zondag), r2(sp.feestdag), s.published ? 'gepubliceerd' : 'concept', s.note || '']; })];
  };
  const leave = () => {
    const byId = Object.fromEntries(emps.map(e => [e.id, e]));
    return [['Medewerker', 'Soort', 'Van', 'Tot en met', 'Dagen totaal', 'Dagen in periode', 'Status', 'Toelichting', 'Reactie leidinggevende', 'Aangevraagd op'],
      ...reqs.filter(r => overlaps(r.start_date, r.end_date, from, to)).map(r => [byId[r.employee_id]?.name || '', REQ[r.type], r.start_date, r.end_date, daysBetween(r.start_date, r.end_date), overlapDays(r, from, to), STATUS[r.status], r.note || '', r.manager_note || '', (r.created_at || '').slice(0, 10)])];
  };
  const team = () => [['Naam', 'E-mail', 'Telefoon', 'Functie', 'Rol', 'Contracttype', 'Contract u/week', 'Minimum u/week', 'Einddatum contract', 'Actief', 'Account geactiveerd'],
    ...emps.map(e => [e.name, e.email, e.phone || '', e.position || '', e.role === 'manager' ? 'Directie' : e.role === 'planner' ? 'Shiftleader' : 'Medewerker', CT[e.contract_type || 'vast'], e.contract_hours ?? '', e.contract_min_hours ?? '', e.contract_end || '', e.active === false ? 'nee' : 'ja', e.user_id ? 'ja' : 'nee'])];
  const EXPORTS = {
    payroll: ['Urenoverzicht voor salarisadministratie', 'Per medewerker: gewerkte uren, avond-/nacht-/zondag-/feestdaguren, verlof- en ziektedagen. Dit bestand stuur je naar je salarisverwerker.', payroll, `salaris-${slug}`],
    detail: ['Alle diensten (detail)', 'Elke dienst als losse regel met tijden, pauze en toeslaguren. Handig voor controle of voor je accountant.', detail, `diensten-${slug}`],
    leave: ['Verlof & ziekte', 'Alle aanvragen die in deze periode vallen, met status en reactie.', leave, `verlof-${slug}`],
    klok: ['Klokregistratie', 'Alle in- en uitkloktijden met pauze, afstand tot de zaak, meldingen en status. Bewijs bij vragen over gewerkte uren.', () => {
      const byId = Object.fromEntries(emps.map(e => [e.id, e]));
      return [['Datum', 'Medewerker', 'Gepland', 'Ingeklokt', 'Uitgeklokt', 'Pauze (min)', 'Geklokt (u)', 'Telt mee van', 'Telt mee tot', 'Telt mee (u)', 'Overuren', 'Toelichting overuren', 'Controle in', 'Controle uit', 'Afstand in (m)', 'Afstand uit (m)', 'Meldingen', 'Reden medewerker', 'Status', 'Aangepast', 'Notitie directie'],
        ...ents.map(x => { const sh = matchShift(x, allShifts); return [tDate(x.clock_in), byId[x.employee_id]?.name || '', sh ? `${hm(sh.start_time)}-${hm(sh.end_time)}` : '', tHM(x.clock_in), x.clock_out ? tHM(x.clock_out) : '', x.break_minutes || 0, x.clock_out ? r2(entryHours(x)) : '', ...(() => { const p = paidOf(x, sh, stH); return x.clock_out ? [tHM(p.start), tHM(p.end), r2(p.hours)] : ['', '', '']; })(), { requested: 'aangevraagd', approved: 'goedgekeurd', rejected: 'afgekeurd' }[x.overtime_status] || '', x.overtime_reason || '', x.in_method || '', x.out_method || '', x.in_distance_m ?? '', x.out_distance_m ?? '', (x.flags || []).map(f => FLAG[f] || f).join(', '), x.reason || '', ESTATUS[x.status], x.edited ? 'ja' : 'nee', x.manager_note || '']; })];
    }, `klokregistratie-${S.pmode}-${from}_${to}`],
    kosten: ['Loonkosten per functie (voor de salarisadministratie)', 'Uren en loonkosten per kostenplaats (Bediening, Bar, Keuken…). Werkgeverslasten zijn een indicatie; de exacte bedragen komen uit de salarisberekening.', () => {
      const per = {};
      rows.forEach(r => shifts.filter(x => x.employee_id === r.e.id).forEach(x => {
        const k = x.position || r.e.position || 'Overig', c = r.wage ? costOf(x, r.wage, stH) : null;
        per[k] ||= { uren: 0, bruto: 0, zonderLoon: 0 };
        per[k].uren += shiftHours(x); if (c) per[k].bruto += c.bruto; else per[k].zonderLoon += shiftHours(x);
      }));
      const lines = Object.entries(per).sort().map(([k, v]) => { const l = loonkosten(v.bruto, stH); return [from, to, k, r2(v.uren), r2(l.bruto), r2(l.vg), r2(l.wg), r2(l.totaal), v.zonderLoon ? `${fmtH(v.zonderLoon)} u zonder uurloon` : '']; });
      const tot = Object.values(per).reduce((t, v) => ({ uren: t.uren + v.uren, bruto: t.bruto + v.bruto }), { uren: 0, bruto: 0 }), lt = loonkosten(tot.bruto, stH);
      return [['Periode van', 'Periode tot', 'Kostenplaats (functie)', 'Uren', 'Bruto loon', 'Vakantiegeld', 'Werkgeverslasten (indicatie)', 'Totale loonkosten', 'Opmerking'], ...lines, [from, to, 'TOTAAL', r2(tot.uren), r2(lt.bruto), r2(lt.vg), r2(lt.wg), r2(lt.totaal), '']];
    }, `loonkosten-${slug}`],
    team: ['Medewerkerslijst', 'Contactgegevens, functies en contracturen van het hele team.', team, 'medewerkers'],
  };

  el.innerHTML = `
    <div class="page-head"><div><h1>Uren & export</h1><p>Overzicht per periode en exportbestanden voor salaris en boekhouding.</p></div><button class="btn" data-loonset>⚙︎ Loon & toeslagen</button></div>
    <div class="toolbar">
      <div class="weeknav">
        <button class="btn icon" data-p="-1" aria-label="Vorige periode">‹</button>
        <div class="label"><strong style="text-transform:capitalize">${esc(P.label)}</strong><span>${fmtShort(from)} – ${fmtShort(to)}</span></div>
        <button class="btn icon" data-p="1" aria-label="Volgende periode">›</button>
      </div>
      <div class="actions">
        <div class="filters">${[['maand', 'Maand'], ['4weken', '4 weken'], ['week', 'Week']].map(([k, l]) => `<button data-mode="${k}" class="${S.pmode === k ? 'active' : ''}">${l}</button>`).join('')}</div>
        <div class="filters">${[['gepland', 'Gepland'], ['gewerkt', 'Gewerkt (geklokt)']].map(([k, l]) => `<button data-src="${k}" class="${S.hsrc === k ? 'active' : ''}">${l}</button>`).join('')}</div>
        ${S.hsrc === 'gepland' ? `<label class="check small"><input type="checkbox" data-onlypub ${S.onlyPub ? 'checked' : ''}> Alleen gepubliceerd</label>` : ''}
      </div>
    </div>
    ${S.hsrc === 'gewerkt' && entPending ? `<p class="warnbox" style="margin:0 0 12px">Let op: ${entPending} klokregistratie(s) in deze periode zijn nog niet goedgekeurd en tellen niet mee. <button class="linkbtn" data-goto="klokken">Naar Klokken →</button></p>` : ''}
    ${S.hsrc === 'gepland' && conceptCount && S.onlyPub ? `<p class="warnbox" style="margin:0 0 12px">Let op: ${conceptCount} dienst(en) in deze periode zijn nog concept en tellen niet mee.</p>` : ''}
    ${fdIn.length ? `<p class="hint" style="margin:0 0 12px">Feestdagen in deze periode: ${esc(fdIn.join(', '))}</p>` : ''}
    <div class="card table-wrap"><table class="list">
      <thead><tr><th>Medewerker</th><th class="num hide-sm">Diensten</th><th class="num">Uren</th><th class="num hide-sm">Avond</th><th class="num hide-sm">Nacht</th><th class="num hide-sm">Zondag</th><th class="num hide-sm">Feestdag</th><th class="num hide-sm">Verlof</th><th class="num hide-sm">Ziek</th><th class="num"><span class="hide-sm">t.o.v. contract</span><span class="show-sm">± contract</span></th>${hasWages ? '<th class="num hide-sm">Bruto loon</th><th class="num">Loonkosten</th>' : ''}</tr></thead>
      <tbody>${rows.map(r => `<tr><td><div class="namecell"><span class="dot" style="background:${esc(r.e.color || COLORS[0])}"></span>${esc(r.e.name)}</div></td>
        <td class="num hide-sm">${r.n}</td><td class="num"><strong>${fmtH(r.h)}</strong></td>
        <td class="num hide-sm">${fmtH(r.avond)}</td><td class="num hide-sm">${fmtH(r.nacht)}</td><td class="num hide-sm">${fmtH(r.zondag)}</td><td class="num hide-sm">${fmtH(r.feestdag)}</td>
        <td class="num hide-sm">${r.verlof ? r.verlof + ' d' : '—'}</td><td class="num hide-sm">${r.ziek ? r.ziek + ' d' : '—'}</td>
        <td class="num ${r.diff == null ? '' : r.diff >= 0 ? 'pos' : 'neg'}">${r.diff == null ? '—' : (r.diff > 0 ? '+' : '') + fmtH(r.diff) + ' u'}</td>${hasWages ? `<td class="num hide-sm">${r.lk ? euro(r.lk.bruto) : '<span class="muted">geen uurloon</span>'}</td><td class="num">${r.lk ? euro(r.lk.totaal) : '—'}</td>` : ''}</tr>`).join('')}</tbody>
      <tfoot><tr><td>Totaal</td><td class="num">${T.n}</td><td class="num">${fmtH(T.h)}</td><td class="num hide-sm">${fmtH(T.avond)}</td><td class="num hide-sm">${fmtH(T.nacht)}</td><td class="num hide-sm">${fmtH(T.zondag)}</td><td class="num hide-sm">${fmtH(T.feestdag)}</td><td class="hide-sm"></td><td class="hide-sm"></td><td></td>${hasWages ? `<td class="num hide-sm">${euro(T.bruto)}</td><td class="num">${euro(T.totaal)}</td>` : ''}</tr></tfoot>
    </table></div>
    <h2 style="font-size:21px;margin:28px 0 12px">Exporteren</h2>
    <div class="exports">${Object.entries(EXPORTS).map(([k, [t, d]]) => `<div class="card pad export"><h3>${t}</h3><p class="hint">${d}</p><div class="req-actions"><button class="btn primary sm" data-csv="${k}">⬇︎ Download (Excel/CSV)</button><button class="btn sm" data-copy="${k}">Kopieer tabel</button></div></div>`).join('')}</div>
    <p class="hint" style="margin-top:14px">Uren zijn <strong>${S.hsrc === 'gewerkt' ? 'goedgekeurde gewerkte' : 'geplande'}</strong> uren (netto, na pauze). Toeslaguren zijn bruto (pauze niet afgetrokken), venster instelbaar bij Instellingen (tandwiel rechtsboven): avond ${esc((CFG.toeslagen || {}).avondVan || '20:00')}–${esc((CFG.toeslagen || {}).avondTot || '24:00')}, nacht ${esc((CFG.toeslagen || {}).nachtVan || '00:00')}–${esc((CFG.toeslagen || {}).nachtTot || '06:00')}. CSV-bestanden openen direct in Excel (puntkomma, komma als decimaalteken).</p>
    ${hasWages ? `<p class="hint">Loonkosten = bruto loon (incl. toeslagen) + ${esc(String(stH.pct_vakantiegeld ?? 8))}% vakantiegeld + ${esc(String(stH.pct_werkgever ?? 25))}% werkgeverslasten (indicatie). De exacte loonheffing en premies komen uit jullie salarisberekening.</p>` : '<p class="hint">Vul bij <strong>Team</strong> de uurlonen in om ook de loonkosten te zien.</p>'}`;

  el.onclick = ev => {
    const p = ev.target.closest('[data-p]'); if (p) { S.panchor = shiftPeriod(S.pmode, S.panchor, Number(p.dataset.p)); return rerender(); }
    const m = ev.target.closest('[data-mode]'); if (m) { S.pmode = m.dataset.mode; return rerender(); }
    const sr = ev.target.closest('[data-src]'); if (sr) { S.hsrc = sr.dataset.src; return rerender(); }
    const gt = ev.target.closest('[data-goto]'); if (gt) return go(gt.dataset.goto);
    if (ev.target.closest('[data-loonset]')) return loonSettingsDialog(stH);
    const c = ev.target.closest('[data-csv]'); if (c) { const x = EXPORTS[c.dataset.csv]; return exportCsv(x[3], x[2]()); }
    const cp = ev.target.closest('[data-copy]'); if (cp) return copyRows(EXPORTS[cp.dataset.copy][2]());
  };
  el.onchange = ev => { if (ev.target.matches('[data-onlypub]')) { S.onlyPub = ev.target.checked; rerender(); } };
}

function loonSettingsDialog(st) {
  const f = (k, l, d) => `<label class="field">${l}<input type="number" name="${k}" min="0" max="300" step="0.5" value="${st[k] ?? d}"></label>`;
  openDialog('Loon & toeslagen', `
    <p class="hint">Toeslagen in procenten van het uurloon. Valt een uur onder meerdere toeslagen, dan telt de hoogste. De tijdvakken voor avond en nacht stel je in bij Instellingen (tandwiel rechtsboven).</p>
    <div class="row keep">${f('pct_avond', 'Avondtoeslag %', 0)}${f('pct_nacht', 'Nachttoeslag %', 0)}</div>
    <div class="row keep">${f('pct_zondag', 'Zondagtoeslag %', 0)}${f('pct_feestdag', 'Feestdagtoeslag %', 0)}</div>
    <div class="row keep">${f('pct_vakantiegeld', 'Vakantiegeld %', 8)}${f('pct_werkgever', 'Werkgeverslasten % (indicatie)', 25)}</div>
    <p class="hint">Werkgeverslasten (premies, pensioen e.d.) verschillen per situatie; vraag het juiste percentage aan je salarisadministratie of accountant.</p>
    <div class="dlg-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">Opslaan</button></div>`, {
    async onSubmit(fd) {
      const o = {}; ['pct_avond', 'pct_nacht', 'pct_zondag', 'pct_feestdag', 'pct_vakantiegeld', 'pct_werkgever'].forEach(k => (o[k] = Number(fd.get(k)) || 0));
      await store.saveSettings(o); toast('Opgeslagen'); rerender();
    },
  });
}

/* ================= Klokken ================= */
function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000, toR = x => (x * Math.PI) / 180;
  const dLat = toR(lat2 - lat1), dLng = toR(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// Demo: gesimuleerde positie (de demo-omgeving mag geen echte locatie opvragen)
async function getPosition() {
  if (store.demo) {
    const st = await store.settings();
    const off = S.demoLoc === 'buiten' ? 0.018 : 0.0002;
    return { lat: st.lat + off, lng: st.lng + off / 2, accuracy: 15 };
  }
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => res(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  });
}
const tHM = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const tDate = ts => iso(new Date(ts));
const entryHours = e => {
  const end = e.clock_out ? new Date(e.clock_out) : new Date();
  let brk = Number(e.break_minutes) || 0;
  if (!e.clock_out && e.break_started_at) brk += (Date.now() - new Date(e.break_started_at)) / 60000;
  return Math.max(0, (end - new Date(e.clock_in)) / 3600000 - brk / 60);
};
const fmtDiff = h => { const m = Math.round(h * 60), a = Math.abs(m), sg = m > 0 ? '+' : m < 0 ? '−' : ''; return a < 60 ? `${sg}${a} min` : `${sg}${fmtDur(a / 60)} u`; };
const fmtDur = h => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${pad(m % 60)}`; };
const FLAG = { in_buiten_locatie: 'Ingeklokt buiten locatie', uit_buiten_locatie: 'Uitgeklokt buiten locatie', in_geen_locatie: 'Inklokken zonder locatie', uit_geen_locatie: 'Uitklokken zonder locatie', handmatig: 'Handmatig toegevoegd', auto_uit: 'Automatisch uitgeklokt (vergeten)' };
const ESTATUS = { open: 'Aan het werk', pending: 'Te controleren', approved: 'Goedgekeurd', rejected: 'Afgekeurd' };
// Koppel een registratie aan de geplande dienst (zelfde dag, dichtstbijzijnde begintijd)
function matchShift(e, shifts) {
  const ds = tDate(e.clock_in), m = mins(tHM(e.clock_in));
  const c = shifts.filter(s => s.employee_id === e.employee_id && s.date === ds);
  return c.sort((a, b) => Math.abs(mins(a.start_time) - m) - Math.abs(mins(b.start_time) - m))[0] || null;
}
// Registratie omzetten naar 'dienst-vorm' voor urentotalen en toeslagen
// Begin en eind van een geplande dienst als tijdstip (nachtdienst loopt door naar de volgende dag)
function shiftWindow(sh) {
  const a = parse(sh.date), [h1, m1] = hm(sh.start_time).split(':').map(Number), [h2, m2] = hm(sh.end_time).split(':').map(Number);
  const st = new Date(a); st.setHours(h1, m1, 0, 0);
  const en = new Date(a); en.setHours(h2, m2, 0, 0);
  if (en <= st) en.setDate(en.getDate() + 1);
  return [st, en];
}
// Tijd die meetelt. "Planning is leidend": te vroeg inklokken en na het einde uitklokken tellen niet mee,
// behalve goedgekeurde overuren. De echte kloktijden blijven altijd bewaard.
function paidOf(x, sh, st = {}) {
  const cin = new Date(x.clock_in), cout = x.clock_out ? new Date(x.clock_out) : null;
  let start = cin, end = cout;
  const why = [];
  let overMin = 0;
  if (st.plan_leading !== false && sh && cout) {
    const [ps, pe] = shiftWindow(sh);
    overMin = Math.max(0, Math.round((cout - pe) / 60000));
    if (cin < ps) { start = ps; why.push('vroeg'); }
    if (cout > pe && x.overtime_status !== 'approved') { end = pe; why.push('laat'); }
    if (end < start) end = start;
  }
  const hours = cout ? Math.max(0, (end - start) / 3600000 - (Number(x.break_minutes) || 0) / 60) : entryHours(x);
  return { start, end, hours, adjusted: why.length > 0, why, overMin };
}
const entryAsShift = (e, sh, st) => { const p = paidOf(e, sh, st); return { id: e.id, employee_id: e.employee_id, date: tDate(e.clock_in), start_time: tHM(p.start), end_time: tHM(p.end), break_minutes: e.break_minutes || 0, position: sh?.position || '', note: e.manager_note || '', published: true }; };

// Vraag bij uitklokken na het einde van de dienst: langer gewerkt?  → '' (nee), reden (ja) of null (annuleren)
function askOvertime(plannedEnd, overMin) {
  return new Promise(res => {
    let answer = null;
    const dlg = openDialog('Heb je langer gewerkt?', `
      <p style="margin:0">Je dienst eindigde om <strong>${tHM(plannedEnd)}</strong>. Het is nu ${tHM(new Date())} (${overMin} min later).</p>
      <label class="otchoice"><input type="radio" name="ot" value="nee" checked><span><strong>Nee</strong> — ik ben om ${tHM(plannedEnd)} gestopt met werken</span></label>
      <label class="otchoice"><input type="radio" name="ot" value="ja"><span><strong>Ja</strong> — ik heb langer gewerkt</span></label>
      <label class="field" data-otwhy hidden>Wat heb je gedaan? (de directie beoordeelt dit)<textarea name="why" placeholder="Bijv. laatste tafel bleef lang, kassa opgemaakt"></textarea></label>
      <div class="dlg-foot"><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">Uitklokken</button></div>`, {
      onReady(d) { const f = $('form', d); f.addEventListener('change', () => { $('[data-otwhy]', d).hidden = f.ot.value !== 'ja'; }); },
      onSubmit(fd) {
        if (fd.get('ot') === 'ja') { const w = (fd.get('why') || '').trim(); if (!w) throw new Error('Vul in wat je hebt gedaan.'); answer = w; }
        else answer = '';
      },
    });
    dlg.addEventListener('close', () => res(answer));
  });
}

async function clockCard(todayShift) {
  const [open] = await store.openEntries().then(l => l.filter(e => e.employee_id === S.me.id));
  const st = await store.settings();
  const onBreak = open && open.break_started_at;
  const state = !open
    ? `<span class="pulse"></span><div><strong>Niet ingeklokt</strong><small>${todayShift ? `Je dienst vandaag: ${hm(todayShift.start_time)} – ${hm(todayShift.end_time)}` : 'Geen dienst gepland vandaag'}</small></div>`
    : `<span class="pulse ${onBreak ? 'brk' : 'on'}"></span><div><strong>${onBreak ? 'Pauze sinds ' + tHM(open.break_started_at) : 'Ingeklokt sinds ' + tHM(open.clock_in)}</strong><small data-live="${open.id}">${fmtDur(entryHours(open))} gewerkt${open.break_minutes ? ` · ${open.break_minutes} min pauze` : ''}</small></div>`;
  const btns = !open
    ? `<button class="btn primary big" data-clock="in">Inklokken</button>`
    : `${onBreak ? '<button class="btn big" data-clock="pauze_eind">Pauze stoppen</button>' : '<button class="btn big" data-clock="pauze_start">Pauze</button>'}<button class="btn primary big" data-clock="uit">Uitklokken</button>`;
  const noLoc = st.lat == null && !(st.wifi_ips || []).length;
  return `<div class="card clock ${open ? 'is-on' : ''}" data-clockcard>
    <div class="clock-state">${state}</div>
    <div class="clock-btns">${noLoc ? '<p class="hint">De werklocatie is nog niet ingesteld. Vraag de directie om dit te doen.</p>' : btns}</div>
    <p class="hint clock-hint">${(st.wifi_ips || []).length ? '📶 Klokken kan op de wifi van de zaak, of op locatie via gps.' : '📍 Bij in- en uitklokken wordt gecontroleerd of je op de werklocatie bent.'}</p>
    ${store.demo ? `<div class="demo-loc"><span>Demo – doe alsof ik ben:</span><div class="filters"><button data-demoloc="wifi" class="${S.demoLoc === 'wifi' ? 'active' : ''}">Op de wifi</button><button data-demoloc="op" class="${!S.demoLoc || S.demoLoc === 'op' ? 'active' : ''}">Op locatie (gps)</button><button data-demoloc="buiten" class="${S.demoLoc === 'buiten' ? 'active' : ''}">Thuis</button></div></div>` : ''}
  </div>`;
}

function bindClock(el) {
  clearInterval(S.timer);
  S.timer = setInterval(async () => {
    const live = $('[data-live]', el); if (!live) return;
    const [open] = (await store.openEntries()).filter(e => e.id === live.dataset.live);
    if (open) live.textContent = `${fmtDur(entryHours(open))} gewerkt${open.break_minutes ? ` · ${open.break_minutes} min pauze` : ''}`;
  }, 30000);
}

async function doClock(action, btn) {
  const needLoc = action === 'in' || action === 'uit';
  const label = btn.textContent;
  btn.disabled = true;
  const done = { in: 'Ingeklokt — fijne dienst!', uit: 'Uitgeklokt — tot de volgende keer!', pauze_start: 'Pauze gestart', pauze_eind: 'Pauze gestopt' };
  const st0 = needLoc ? await store.settings() : {};
  let pos = null, ot = null;
  if (action === 'uit' && st0.plan_leading !== false) {
    const [open] = (await store.openEntries()).filter(e => e.employee_id === S.me.id);
    if (open) {
      const d0 = tDate(open.clock_in);
      const sh = matchShift(open, (await store.shifts(d0, d0)).filter(x => x.employee_id === S.me.id));
      if (sh) {
        const pe = shiftWindow(sh)[1], over = Math.round((Date.now() - pe) / 60000);
        if (over >= (st0.plan_margin_min ?? 5)) {
          ot = await askOvertime(pe, over);
          if (ot === null) { btn.disabled = false; btn.textContent = label; return; }
        }
      }
    }
  }
  try {
    // Eerst via de wifi van de zaak (geen locatievraag); lukt dat niet, dan via gps
    if (needLoc && (st0.wifi_ips || []).length) {
      btn.textContent = 'Wifi controleren…';
      try { await store.clock(action, null, null, ot); toast(done[action]); return rerender(); }
      catch (e) { if (e.code !== 'LC001') throw e; }
    }
    if (needLoc) { btn.textContent = 'Locatie bepalen…'; pos = await getPosition(); }
    await store.clock(action, pos, null, ot);
    toast(done[action]); rerender();
  } catch (e) {
    btn.disabled = false; btn.textContent = label;
    const st = await store.settings();
    if (e.code === 'LC001' && st.allow_override) {
      openDialog(action === 'in' ? 'Inklokken buiten locatie' : 'Uitklokken buiten locatie', `
        <div class="warnbox">${esc(e.message)}</div>
        <label class="field">Waarom klok je niet op de werklocatie? (de directie ziet dit)<textarea name="reason" required placeholder="Bijv. catering op locatie, inkoop bij de groothandel"></textarea></label>
        <div class="dlg-foot"><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">Toch ${action === 'in' ? 'inklokken' : 'uitklokken'}</button></div>`, {
        async onSubmit(fd) { await store.clock(action, pos, fd.get('reason'), ot); toast(done[action] + ' (gemarkeerd voor controle)'); rerender(); },
      });
    } else toast(errMsg(e), 'error');
  }
}

function clockClicks(ev) {
  const c = ev.target.closest('[data-clock]'); if (c) { doClock(c.dataset.clock, c); return true; }
  const d = ev.target.closest('[data-demoloc]'); if (d) { S.demoLoc = d.dataset.demoloc; rerender(); return true; }
  return false;
}

function settingsDialog(st) {
  openDialog('Klokinstellingen', `
    <div class="wifibox">
      <strong>⏱ Uren berekenen</strong>
      <label class="check"><input type="checkbox" name="plan_leading" ${st.plan_leading !== false ? 'checked' : ''}> Planning is leidend: te vroeg inklokken en na het einde uitklokken tellen niet mee, tenzij overuren zijn goedgekeurd</label>
      <label class="field" style="width:100%">Vraag “Heb je langer gewerkt?” vanaf … minuten na einde dienst<input type="number" name="plan_margin_min" min="0" max="60" step="1" value="${st.plan_margin_min ?? 5}"></label>
      <p class="hint">De echte kloktijden blijven altijd bewaard (verplicht volgens de Arbeidstijdenwet).</p>
    </div>
    <strong style="margin-top:4px">📍 Werklocatie (gps)</strong>
    <p class="hint">Klokken kan alleen binnen de straal rond dit punt. Tip: sta in de zaak en tik op <strong>Gebruik mijn huidige locatie</strong>.</p>
    <button type="button" class="btn" data-here>📍 Gebruik mijn huidige locatie</button>
    <div class="row keep">
      <label class="field">Breedtegraad<input name="lat" inputmode="decimal" value="${st.lat ?? ''}"></label>
      <label class="field">Lengtegraad<input name="lng" inputmode="decimal" value="${st.lng ?? ''}"></label>
    </div>
    <label class="field">Straal in meters (aanbevolen 100–200)<input type="number" name="radius_m" min="25" max="2000" step="25" value="${st.radius_m || 150}" required></label>
    <label class="check"><input type="checkbox" name="allow_override" ${st.allow_override !== false ? 'checked' : ''}> Buiten de straal toch toestaan met een reden (wordt gemarkeerd voor controle)</label>
    <div class="wifibox">
      <strong>📶 Wifi van de zaak</strong>
      <p class="hint">Wie op de wifi van de zaak zit, kan direct klokken — zonder gps. Verbind <em>dit toestel</em> met de wifi van Lilou en tik op de knop. Werkt alleen met een vast internetadres (vraag je provider).</p>
      <div class="wifilist">${(st.wifi_ips || []).map(ip => `<span class="pill ok">${esc(ip)} <button type="button" class="linkbtn small" data-wifidel="${esc(ip)}" aria-label="Verwijderen">✕</button></span>`).join('') || '<span class="muted small">Nog geen netwerk ingesteld.</span>'}</div>
      <button type="button" class="btn sm" data-wifiadd>Huidig netwerk toevoegen</button>
    </div>
    <p class="hint" data-maplink>${st.lat != null ? `Controleer op de kaart: <a href="https://www.google.com/maps?q=${st.lat},${st.lng}" target="_blank" rel="noopener">${st.lat}, ${st.lng}</a>` : ''}</p>
    <div class="dlg-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">Opslaan</button></div>`, {
    onReady(dlg) {
      $('[data-wifiadd]', dlg).onclick = async () => {
        try { const ip = await store.registerWifi(); toast(`Netwerk toegevoegd (${ip})`); dlg.close(); settingsDialog(await store.settings()); } catch (e) { toast(errMsg(e), 'error'); }
      };
      $$('[data-wifidel]', dlg).forEach(b => (b.onclick = async () => {
        await store.saveSettings({ wifi_ips: (st.wifi_ips || []).filter(x => x !== b.dataset.wifidel) }); toast('Netwerk verwijderd'); dlg.close(); settingsDialog(await store.settings());
      }));
      $('[data-here]', dlg).onclick = async () => {
        const b = $('[data-here]', dlg); b.textContent = 'Locatie bepalen…';
        const p = store.demo ? { lat: st.lat, lng: st.lng, accuracy: 10 } : await getPosition();
        b.textContent = '📍 Gebruik mijn huidige locatie';
        if (!p) return toast('Locatie niet beschikbaar. Sta locatietoegang toe in je browser.', 'error');
        $('[name=lat]', dlg).value = p.lat.toFixed(6); $('[name=lng]', dlg).value = p.lng.toFixed(6);
        toast(`Locatie overgenomen (nauwkeurigheid ±${Math.round(p.accuracy)} m)`);
      };
    },
    async onSubmit(fd) {
      const rawLat = String(fd.get('lat')).trim(), rawLng = String(fd.get('lng')).trim();
      const lat = rawLat ? Number(rawLat.replace(',', '.')) : null, lng = rawLng ? Number(rawLng.replace(',', '.')) : null;
      if ((lat == null) !== (lng == null)) throw new Error('Vul zowel breedte- als lengtegraad in.');
      if (lat != null && (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)) throw new Error('Ongeldige coördinaten.');
      if (lat == null && !(st.wifi_ips || []).length) throw new Error('Stel een gps-locatie of een wifi-netwerk in.');
      await store.saveSettings({ lat, lng, radius_m: Number(fd.get('radius_m')), allow_override: fd.get('allow_override') === 'on', plan_leading: fd.get('plan_leading') === 'on', plan_margin_min: Math.max(0, Number(fd.get('plan_margin_min')) || 0) });
      toast('Instellingen opgeslagen'); rerender();
    },
  });
}

function entryDialog(e, emps, defaults = {}) {
  const isNew = !e.id;
  const date = e.clock_in ? tDate(e.clock_in) : defaults.date || todayIso();
  openDialog(isNew ? 'Registratie toevoegen' : 'Registratie aanpassen', `
    <label class="field">Medewerker<select name="employee_id" ${isNew ? '' : 'disabled'}>${emps.map(x => `<option value="${x.id}" ${x.id === (e.employee_id || defaults.employee_id) ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
    <div class="row three keep">
      <label class="field">Datum<input type="date" name="date" value="${date}" required></label>
      <label class="field">In<input type="time" name="in" value="${e.clock_in ? tHM(e.clock_in) : defaults.start || ''}" required></label>
      <label class="field">Uit<input type="time" name="out" value="${e.clock_out ? tHM(e.clock_out) : defaults.end || ''}"></label>
    </div>
    <div class="row keep">
      <label class="field">Pauze (min)<input type="number" name="break_minutes" min="0" step="5" value="${e.break_minutes ?? defaults.pauze ?? 0}"></label>
      <label class="field">Status<select name="status">${['pending', 'approved', 'rejected'].map(k => `<option value="${k}" ${(e.status === k || (k === 'approved' && (isNew || e.status === 'open'))) ? 'selected' : ''}>${ESTATUS[k]}</option>`).join('')}</select></label>
    </div>
    <label class="field">Overuren (na einde dienst)<select name="overtime_status">${[['', 'Geen'], ['requested', 'Aangevraagd'], ['approved', 'Goedgekeurd'], ['rejected', 'Afgekeurd']].map(([k, l]) => `<option value="${k}" ${(e.overtime_status || '') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    ${e.overtime_reason ? `<div class="warnbox">Toelichting overuren: ${esc(e.overtime_reason)}</div>` : ''}
    ${e.reason ? `<div class="warnbox">Reden medewerker: ${esc(e.reason)}</div>` : ''}
    <label class="field">Notitie directie<input name="manager_note" value="${esc(e.manager_note || '')}" placeholder="Bijv. vergeten uit te klokken, gecorrigeerd"></label>
    <p class="hint">Laat “Uit” leeg als de medewerker nog aan het werk is. Een eindtijd vóór de begintijd telt als de volgende dag.</p>
    ${isNew ? '' : '<details class="history" data-history><summary>Geschiedenis van wijzigingen</summary><div class="hint">Laden…</div></details>'}
    <div class="dlg-foot">${isNew ? '' : '<button class="btn danger" value="delete" formnovalidate>Verwijderen</button>'}<span class="spacer"></span><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">Opslaan</button></div>`, {
    onReady(dlg) { const h = $('[data-history]', dlg); if (h) h.addEventListener('toggle', () => { if (h.open && !h.dataset.loaded) { h.dataset.loaded = 1; historyHTML(e.id).then(x => { $('div', h).outerHTML = x; }); } }); },
    async onSubmit(fd, action) {
      if (action === 'delete') { if (!await ask('Deze registratie verwijderen?')) throw 'cancel'; await store.deleteEntry(e.id); toast('Registratie verwijderd'); return rerender(); }
      const d = parse(fd.get('date'));
      const mk = t => { const [h, m] = t.split(':').map(Number); const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
      const cin = mk(fd.get('in'));
      let cout = fd.get('out') ? mk(fd.get('out')) : null;
      if (cout && cout <= cin) cout = new Date(cout.getTime() + 86400000);
      // Ongewijzigde tijden exact laten staan (geen schijnwijziging in het logboek)
      const same = (ts, d2) => ts && d2 && tHM(ts) === tHM(d2) && Math.abs(new Date(ts) - d2) < 60000;
      const cinIso = same(e.clock_in, cin) ? e.clock_in : cin.toISOString();
      const coutIso = cout ? (same(e.clock_out, cout) ? e.clock_out : cout.toISOString()) : null;
      const payload = { clock_in: cinIso, clock_out: coutIso, break_minutes: Number(fd.get('break_minutes')) || 0, break_started_at: null, status: cout ? fd.get('status') : 'open', manager_note: fd.get('manager_note').trim() || null, overtime_status: fd.get('overtime_status') || null };
      if (isNew) payload.employee_id = fd.get('employee_id'); else payload.id = e.id;
      await store.saveEntry(payload); toast('Registratie opgeslagen'); rerender();
    },
  });
}

// Leesbare geschiedenis uit het logboek
const AUDIT_LABEL = { clock_in: 'In', clock_out: 'Uit', break_minutes: 'Pauze (min)', status: 'Status', overtime_status: 'Overuren', manager_note: 'Notitie', flags: 'Meldingen', hourly_wage: 'Uurloon', birth_date: 'Geboortedatum', leave_hours_year: 'Verlofuren per jaar', leave_opening: 'Beginsaldo verlof', role: 'Rol', contract_hours: 'Contracturen', active: 'Actief', name: 'Naam', email: 'E-mail', position: 'Functie' };
const auditVal = (k, v) => {
  if (v == null || v === '') return '—';
  if (k === 'clock_in' || k === 'clock_out') return `${fmtShort(tDate(v))} ${tHM(v)}`;
  if (k === 'status') return ESTATUS[v] || STATUS[v] || v;
  if (k === 'overtime_status') return { requested: 'aangevraagd', approved: 'goedgekeurd', rejected: 'afgekeurd' }[v] || v;
  if (k === 'flags') return (v || []).map(f => FLAG[f] || f).join(', ') || '—';
  if (k === 'hourly_wage') return '€ ' + Number(v).toFixed(2).replace('.', ',');
  if (typeof v === 'boolean') return v ? 'ja' : 'nee';
  return String(v);
};
async function historyHTML(rowId) {
  let rows = [];
  try { rows = await store.audit(rowId); } catch (e) { return `<p class="hint">${esc(errMsg(e))}</p>`; }
  if (!rows.length) return '<p class="hint">Nog geen wijzigingen door de directie.</p>';
  return `<ul class="auditlist">${rows.map(a => {
    const keys = Object.keys(a.new || a.old || {}).filter(k => AUDIT_LABEL[k]);
    const what = a.action === 'insert' ? 'Toegevoegd' : a.action === 'delete' ? 'Verwijderd'
      : keys.map(k => `${AUDIT_LABEL[k]}: ${esc(auditVal(k, a.old?.[k]))} → <strong>${esc(auditVal(k, a.new?.[k]))}</strong>`).join('<br>');
    return what ? `<li><small>${esc(fmtShort(tDate(a.at)))} ${tHM(a.at)} · ${esc(a.actor_name || 'Systeem')}</small><div>${what}</div></li>` : '';
  }).join('')}</ul>`;
}

async function viewClockMgr(el) {
  const from = iso(S.week), to = iso(addDays(S.week, 6));
  const [emps0, entries, shifts, open, st] = await Promise.all([store.employees(), store.entries(from, to), store.shifts(iso(addDays(S.week, -1)), to), store.openEntries(), store.settings()]);
  const emps = sortEmps(emps0);
  const byId = Object.fromEntries(emps.map(e => [e.id, e]));
  const today = todayIso(), now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
  const wl = weekLabel(S.week);
  S.clockFilter ||= 'check';
  const todayShift = shifts.find(s => s.employee_id === S.me.id && s.date === today);

  // Signalen
  const notIn = shifts.filter(s => s.date === today && s.published && mins(s.start_time) + 10 < nowM && mins(s.end_time) > nowM
    && !open.some(o => o.employee_id === s.employee_id) && !entries.some(x => x.employee_id === s.employee_id && tDate(x.clock_in) === today));
  const forgot = open.filter(o => (now - new Date(o.clock_in)) / 3600000 > 12);
  const pending = entries.filter(x => x.status === 'pending');
  const isClean = x => { const sh = matchShift(x, shifts); return !x.flags?.length && x.overtime_status !== 'requested' && sh && Math.abs(paidOf(x, sh, st).hours - shiftHours(sh)) <= 0.25; };
  const list = (S.clockFilter === 'check' ? pending : entries.filter(x => x.clock_out)).slice().sort((a, b) => b.clock_in.localeCompare(a.clock_in));

  const entryCard = x => {
    const e = byId[x.employee_id] || { name: '?' };
    const sh = matchShift(x, shifts);
    const h = entryHours(x), p = paidOf(x, sh, st), diff = sh && x.clock_out ? p.hours - shiftHours(sh) : null;
    const pe = sh ? shiftWindow(sh)[1] : null;
    const otBox = x.overtime_status === 'requested'
      ? `<div class="otbox"><strong>⏱ Overuren aangevraagd: ${tHM(pe)} – ${tHM(x.clock_out)} (+${p.overMin} min)</strong>${x.overtime_reason ? `<span>“${esc(x.overtime_reason)}”</span>` : ''}</div>`
      : x.overtime_status === 'approved' ? `<span class="pill ok">Overuren goedgekeurd (+${p.overMin} min)</span>`
      : x.overtime_status === 'rejected' ? '<span class="pill">Overuren afgekeurd</span>'
      : p.why.includes('laat') && p.overMin >= (st.plan_margin_min ?? 5) ? `<p class="hint" style="margin:8px 0 0">Uitgeklokt om ${tHM(x.clock_out)}, telt tot ${tHM(pe)} — geen overuren opgegeven.</p>` : '';
    const flags = (x.flags || []).map(f => `<span class="pill warn">${esc(FLAG[f] || f)}${f.includes('buiten') && (f.startsWith('in') ? x.in_distance_m : x.out_distance_m) ? ` · ${(f.startsWith('in') ? x.in_distance_m : x.out_distance_m)} m` : ''}</span>`).join('');
    return `<article class="card entry">
      <div class="entry-head"><span class="dot" style="background:${esc(e.color || COLORS[0])};margin:0"></span><strong>${esc(e.name)}</strong><span class="muted small">${esc(fmtShort(tDate(x.clock_in)))}</span><span class="status ${x.status === 'approved' ? 'approved' : x.status === 'rejected' ? 'rejected' : 'pending'}">${ESTATUS[x.status]}</span></div>
      <div class="entry-grid">
        <div><small>Gepland</small><b>${sh ? `${hm(sh.start_time)} – ${hm(sh.end_time)}` : '—'}</b><span>${sh ? fmtH(shiftHours(sh)) + ' u' : 'geen dienst'}</span></div>
        <div><small>Geklokt</small><b>${tHM(x.clock_in)} – ${x.clock_out ? tHM(x.clock_out) : '…'}</b><span>${fmtH(h)} u · ${x.break_minutes || 0} min pauze${x.in_method ? ` · ${x.in_method === 'wifi' ? '📶 wifi' : '📍 gps'}` : ''}</span></div>
        <div><small>Telt mee</small><b class="${p.adjusted ? 'warnc' : ''}">${tHM(p.start)} – ${x.clock_out ? tHM(p.end) : '…'}</b><span>${fmtH(p.hours)} u${diff == null ? '' : Math.abs(diff) <= 0.25 ? ' · volgens planning' : ` · ${fmtDiff(diff)} t.o.v. planning`}</span></div>
      </div>
      ${otBox}
      ${flags || x.edited ? `<div class="entry-flags">${flags}${x.edited ? '<span class="pill">aangepast</span>' : ''}</div>` : ''}
      ${x.reason ? `<p class="note">“${esc(x.reason)}”</p>` : ''}${x.manager_note ? `<p class="reply"><strong>Notitie:</strong> ${esc(x.manager_note)}</p>` : ''}
      <div class="req-actions">${x.status === 'pending' ? (x.overtime_status === 'requested' ? `<button class="btn sm ok" data-eok="${x.id}|approved">Goedkeuren mét overuren</button><button class="btn sm" data-eok="${x.id}|rejected">Goedkeuren zonder overuren</button>` : `<button class="btn sm ok" data-eok="${x.id}">Goedkeuren</button>`) : ''}<button class="btn sm" data-eedit="${x.id}">Aanpassen</button>${x.status === 'pending' ? `<button class="btn sm danger" data-eno="${x.id}">Afkeuren</button>` : ''}</div>
    </article>`;
  };

  el.innerHTML = `
    <div class="page-head"><div><h1>Klokken</h1><p>Wie is er aan het werk, en gewerkte uren controleren.</p></div>
      <div class="actions"><button class="btn" data-settings>⚙︎ Instellingen</button><button class="btn" data-newentry>+ Registratie</button></div></div>
    ${st.lat == null ? '<div class="warnbox" style="margin-bottom:14px">Stel eerst de <strong>werklocatie</strong> in, anders kan niemand klokken.</div>' : ''}
    <div class="clock-top">
      ${await clockCard(todayShift)}
      <div class="card pad live">
        <h3>Nu aan het werk <span class="muted">(${open.length})</span></h3>
        ${open.length ? `<ul class="livelist">${open.map(o => { const e = byId[o.employee_id] || {}; return `<li><span class="pulse ${o.break_started_at ? 'brk' : 'on'}"></span><strong>${esc(e.name || '?')}</strong><span class="muted">${o.break_started_at ? 'pauze' : 'sinds ' + tHM(o.clock_in)} · ${fmtDur(entryHours(o))}</span>${(o.flags || []).length ? '<span class="pill warn">buiten locatie</span>' : ''}<button class="linkbtn small" data-eedit="${o.id}">aanpassen</button></li>`; }).join('')}</ul>` : '<p class="hint">Niemand ingeklokt.</p>'}
        ${notIn.length ? `<div class="alert"><strong>Nog niet ingeklokt:</strong> ${notIn.map(s => `${esc(byId[s.employee_id]?.name || '')} (${hm(s.start_time)})`).join(', ')}</div>` : ''}
        ${forgot.length ? `<div class="alert"><strong>Vergeten uit te klokken?</strong> ${forgot.map(o => esc(byId[o.employee_id]?.name || '')).join(', ')} — langer dan 12 uur ingeklokt.</div>` : ''}
      </div>
    </div>
    <div class="toolbar" style="margin-top:22px">
      <div class="weeknav">
        <button class="btn icon" data-act="prev" aria-label="Vorige week">‹</button>
        <div class="label"><strong>${wl.title}</strong><span>${wl.sub}</span></div>
        <button class="btn icon" data-act="next" aria-label="Volgende week">›</button>
      </div>
      <div class="actions">
        <div class="filters"><button data-cf="check" class="${S.clockFilter === 'check' ? 'active' : ''}">Te controleren (${pending.length})</button><button data-cf="all" class="${S.clockFilter === 'all' ? 'active' : ''}">Alles</button></div>
        ${pending.filter(isClean).length ? `<button class="btn ok" data-okall>✓ ${pending.filter(isClean).length} zonder afwijking goedkeuren</button>` : ''}
      </div>
    </div>
    ${list.length ? `<div class="reqs">${list.map(entryCard).join('')}</div>` : `<div class="card empty">${S.clockFilter === 'check' ? 'Alles is gecontroleerd. 🎉' : 'Geen registraties deze week.'}</div>`}
    <p class="hint" style="margin-top:12px">“Zonder afwijking” = geen locatiemelding en maximaal 15 minuten verschil met de planning.</p>`;

  bindClock(el);
  el.onclick = async ev => {
    if (clockClicks(ev)) return;
    const act = ev.target.closest('[data-act]')?.dataset.act;
    if (act === 'prev') { S.week = addDays(S.week, -7); return rerender(); }
    if (act === 'next') { S.week = addDays(S.week, 7); return rerender(); }
    if (ev.target.closest('[data-settings]')) return settingsDialog(st);
    if (ev.target.closest('[data-newentry]')) return entryDialog({}, emps.filter(e => e.active !== false), { date: today });
    const cf = ev.target.closest('[data-cf]'); if (cf) { S.clockFilter = cf.dataset.cf; return rerender(); }
    const all = [...entries, ...open];
    const ed = ev.target.closest('[data-eedit]'); if (ed) return entryDialog(all.find(x => x.id === ed.dataset.eedit), emps);
    const okB = ev.target.closest('[data-eok]');
    if (okB) { const [id, otd] = okB.dataset.eok.split('|'); await store.setEntryStatus(id, 'approved', null, otd || null); toast(otd === 'approved' ? 'Goedgekeurd, inclusief overuren' : otd === 'rejected' ? 'Goedgekeurd, zonder overuren' : 'Goedgekeurd'); return rerender(); }
    const no = ev.target.closest('[data-eno]');
    if (no) return openDialog('Registratie afkeuren', `<label class="field">Reden<input name="note" placeholder="Bijv. dubbele registratie"></label><div class="dlg-foot"><button type="button" class="btn" data-close>Annuleren</button><button class="btn danger" value="save">Afkeuren</button></div>`, {
      async onSubmit(fd) { await store.setEntryStatus(no.dataset.eno, 'rejected', fd.get('note').trim() || null); toast('Afgekeurd'); rerender(); } });
    if (ev.target.closest('[data-okall]')) {
      const ids = pending.filter(isClean).map(x => x.id);
      if (!await ask(`${ids.length} registratie(s) zonder afwijking goedkeuren?`)) return;
      for (const id of ids) await store.setEntryStatus(id, 'approved');
      toast(`${ids.length} goedgekeurd`); rerender();
    }
  };
}

/* ================= Boot ================= */
async function boot() {
  document.title = CFG.appName;
  try {
    store = DEMO ? demoStore() : await supabaseStore();
  } catch (e) {
    app.innerHTML = `<div class="auth"><div class="auth-card"><h1>Kan niet verbinden</h1><p>${esc(errMsg(e))}</p><button class="btn" onclick="location.reload()">Opnieuw proberen</button></div></div>`;
    return;
  }
  if (!store.demo) {
    let recovery = /type=recovery/.test(START_HASH);
    const invited = /type=invite/.test(START_HASH);
    store.sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY' && !recovery) { recovery = true; renderNewPassword(); } });
    if (/error_description=/.test(START_HASH)) {
      const msg = decodeURIComponent((START_HASH.match(/error_description=([^&]*)/) || [])[1] || '').replace(/\+/g, ' ');
      history.replaceState(null, '', location.pathname);
      return renderAuth('login', `<div class="msg err">De link uit de e-mail werkt niet (meer)${msg ? ': ' + esc(msg) : ''}. Vraag de directie om een nieuwe uitnodiging, of kies "Wachtwoord vergeten?".</div>`);
    }
    if (recovery || invited) { await store.sb.auth.getSession(); return renderNewPassword(invited ? 'invite' : 'recovery'); }
  }
  try { handleSession(await store.init()); } catch (e) { console.error(e); renderAuth('login', `<div class="msg err">${esc(errMsg(e))}</div>`); }
}

window.addEventListener('hashchange', () => { if (store && !S.me && store.demo) renderAuth(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* ignore */ }
}
// Alleen in de demo: haakje voor de automatische tests
if (DEMO) window.__rooster = { S, CFG, get store() { return store; }, agendaDialog, kpiOf };
boot();
})();
