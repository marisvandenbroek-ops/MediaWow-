(() => {
'use strict';

const CFG = Object.assign({ appName: 'Rooster', bedrijf: '', posities: [], diensten: [] }, window.ROOSTER_CONFIG || {});
const DEMO = !(CFG.supabaseUrl && CFG.supabaseAnonKey);
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
const fmtH = h => (Math.round(h * 100) / 100).toLocaleString('nl-NL', { maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
const COLORS = ['#9a5b3f', '#3f7d58', '#3f6a9a', '#8a4f8f', '#b8862b', '#2f8a8a', '#b3485f', '#5b6b2f'];

function toast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.textContent = msg;
  $('#toasts').append(t);
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
  klokken: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><path d="M12 7v3.5l2 1.3"/></svg>',
  mijn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5"/><circle cx="17" cy="9.5" r="2.5"/><path d="M16.5 14.6c2.3.2 4 1.7 4.5 4.4"/></svg>',
  aanvragen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20.5V5a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 19 5v15.5l-3.5-2-3.5 2-3.5-2z"/><path d="M9 9h6M9 12.5h4"/></svg>',
  uren: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/></svg>',
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
    { id: uid(), employee_id: daan.id, type: 'vrij', start_date: D(1), end_date: D(1), note: 'Tentamen', status: 'approved', manager_note: 'Succes!', created_at: now },
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
      in_distance_m: 12 + (i * 7) % 40, out_distance_m: 9 + (i * 11) % 50, flags: [], reason: null, status: old ? 'approved' : 'pending', manager_note: null, edited: false });
  });
  const flagged = T.filter(t => t.status === 'pending')[0];
  if (flagged) Object.assign(flagged, { flags: ['uit_buiten_locatie'], out_distance_m: 1840, reason: 'Na sluiting nog boodschappen weggebracht bij de groothandel' });
  T.push({ id: uid(), employee_id: mariska.id, clock_in: new Date(nowD.getTime() - 95 * 60000).toISOString(), clock_out: null, break_minutes: 0, break_started_at: null, in_distance_m: 18, out_distance_m: null, flags: [], reason: null, status: 'open', manager_note: null, edited: false });
  const settings = { lat: 52.3702, lng: 4.8952, radius_m: 150, allow_override: true, demo: true };
  return { employees: E, shifts: S, requests: R, entries: T, settings };
}

function demoStore() {
  const KEY = 'lilou-rooster-demo-v3';
  let mem = null;
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* ignore */ }
  if (!db || !db.employees) db = demoSeed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ } };
  save();
  try { mem = sessionStorage.getItem(KEY + '-me'); } catch (e) { /* ignore */ }
  const me = () => db.employees.find(e => e.id === mem) || null;
  const isMgr = () => me()?.role === 'manager';
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
      if (e.id) Object.assign(db.employees.find(x => x.id === e.id), e);
      else db.employees.push({ ...e, id: uid(), user_id: 'demo' });
      save();
    },
    async deleteEmployee(id) {
      db.employees = db.employees.filter(e => e.id !== id);
      db.shifts = db.shifts.filter(s => s.employee_id !== id);
      db.requests = db.requests.filter(r => r.employee_id !== id);
      save();
    },
    async shifts(from, to) {
      return clone(db.shifts.filter(s => s.date >= from && s.date <= to && (isMgr() || s.published)))
        .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
    },
    async saveShifts(list) {
      for (const s of list) {
        if (s.id) Object.assign(db.shifts.find(x => x.id === s.id), s);
        else db.shifts.push({ ...s, id: uid() });
      }
      save();
    },
    async deleteShift(id) { db.shifts = db.shifts.filter(s => s.id !== id); save(); },
    async publish(from, to) { db.shifts.forEach(s => { if (s.date >= from && s.date <= to) s.published = true; }); save(); },
    async requests() {
      return clone(db.requests.filter(r => isMgr() || r.employee_id === mem)).sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async saveRequest(r) { db.requests.push({ ...r, id: uid(), status: 'pending', manager_note: null, created_at: new Date().toISOString() }); save(); },
    async decideRequest(id, status, note) { Object.assign(db.requests.find(r => r.id === id), { status, manager_note: note || null, decided_at: new Date().toISOString() }); save(); },
    async deleteRequest(id) { db.requests = db.requests.filter(r => r.id !== id); save(); },
    // --- klokken
    async settings() { return clone(db.settings); },
    async saveSettings(st) { Object.assign(db.settings, st); save(); },
    async entries(from, to) {
      const a = new Date(parse(from)).toISOString(), b = addDays(parse(to), 1).toISOString();
      return clone(db.entries.filter(e => e.clock_in >= a && e.clock_in < b && (isMgr() || e.employee_id === mem))).sort((x, y) => x.clock_in.localeCompare(y.clock_in));
    },
    async openEntries() { return clone(db.entries.filter(e => !e.clock_out && (isMgr() || e.employee_id === mem))); },
    async clock(action, pos, reason) {
      const st = db.settings;
      const open = db.entries.find(e => e.employee_id === mem && !e.clock_out);
      const now = new Date().toISOString();
      let dist = null, flag = null;
      if (action === 'in' || action === 'uit') {
        if (!pos) flag = 'geen_locatie';
        else { dist = Math.round(distanceM(st.lat, st.lng, pos.lat, pos.lng)); if (dist - Math.min(pos.accuracy || 0, 100) > st.radius_m) flag = 'buiten_locatie'; }
        if (flag && (!st.allow_override || !(reason || '').trim())) throw Object.assign(new Error(flag === 'geen_locatie' ? 'Locatie onbekend. Zet locatievoorzieningen aan om te klokken.' : `Je bent ${dist} meter van de werklocatie. Klokken kan alleen op locatie.`), { code: 'LC001' });
      }
      const r = (reason || '').trim() || null;
      if (action === 'in') {
        if (open) throw new Error('Je bent al ingeklokt.');
        db.entries.push({ id: uid(), employee_id: mem, clock_in: now, clock_out: null, break_minutes: 0, break_started_at: null, in_distance_m: dist, out_distance_m: null, flags: flag ? ['in_' + flag] : [], reason: r, status: 'open', manager_note: null, edited: false });
      } else {
        if (!open) throw new Error('Je bent niet ingeklokt.');
        const brk = () => (open.break_started_at ? Math.round((Date.now() - new Date(open.break_started_at)) / 60000) : 0);
        if (action === 'pauze_start') { if (open.break_started_at) throw new Error('Pauze loopt al.'); open.break_started_at = now; }
        else if (action === 'pauze_eind') { if (!open.break_started_at) throw new Error('Er loopt geen pauze.'); open.break_minutes += brk(); open.break_started_at = null; }
        else { open.break_minutes += brk(); open.break_started_at = null; open.clock_out = now; open.out_distance_m = dist; if (flag) open.flags.push('uit_' + flag); if (r) open.reason = [open.reason, r].filter(Boolean).join(' / '); open.status = 'pending'; }
      }
      save();
    },
    async saveEntry(e) {
      if (e.id) Object.assign(db.entries.find(x => x.id === e.id), e, { edited: true });
      else db.entries.push({ id: uid(), break_started_at: null, in_distance_m: null, out_distance_m: null, flags: ['handmatig'], reason: null, ...e, edited: true });
      save();
    },
    async deleteEntry(id) { db.entries = db.entries.filter(e => e.id !== id); save(); },
    async setEntryStatus(id, status, note) { const e = db.entries.find(x => x.id === id); e.status = status; if (note !== undefined) e.manager_note = note; save(); },
  };
}

/* ================= Supabase store ================= */
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Kon ' + src + ' niet laden')); document.head.append(s); });
}

async function supabaseStore() {
  await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
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
    async employees() { return ok(await sb.from('employees').select('*').order('name')); },
    async saveEmployee(e) {
      const { id, ...rest } = e;
      if (id) ok(await sb.from('employees').update(rest).eq('id', id));
      else ok(await sb.from('employees').insert(rest));
    },
    async deleteEmployee(id) { ok(await sb.from('employees').delete().eq('id', id)); },
    async shifts(from, to) {
      return ok(await sb.from('shifts').select('*').gte('date', from).lte('date', to).order('date').order('start_time')).map(fixShift);
    },
    async saveShifts(list) {
      const ins = list.filter(s => !s.id);
      if (ins.length) ok(await sb.from('shifts').insert(ins));
      for (const s of list.filter(s => s.id)) { const { id, ...rest } = s; ok(await sb.from('shifts').update(rest).eq('id', id)); }
    },
    async deleteShift(id) { ok(await sb.from('shifts').delete().eq('id', id)); },
    async publish(from, to) { ok(await sb.from('shifts').update({ published: true }).gte('date', from).lte('date', to).eq('published', false)); },
    async requests() { return ok(await sb.from('requests').select('*').order('created_at', { ascending: false })); },
    async saveRequest(r) { ok(await sb.from('requests').insert(r)); },
    async decideRequest(id, status, note) { ok(await sb.from('requests').update({ status, manager_note: note || null, decided_at: new Date().toISOString() }).eq('id', id)); },
    async deleteRequest(id) { ok(await sb.from('requests').delete().eq('id', id)); },
    // --- klokken
    async settings() { return ok(await sb.from('settings').select('*').eq('id', 1).maybeSingle()) || {}; },
    async saveSettings(st) { ok(await sb.from('settings').update({ lat: st.lat, lng: st.lng, radius_m: st.radius_m, allow_override: st.allow_override, updated_at: new Date().toISOString() }).eq('id', 1)); },
    async entries(from, to) {
      return ok(await sb.from('time_entries').select('*').gte('clock_in', parse(from).toISOString()).lt('clock_in', addDays(parse(to), 1).toISOString()).order('clock_in'));
    },
    async openEntries() { return ok(await sb.from('time_entries').select('*').is('clock_out', null)); },
    async clock(action, pos, reason) {
      ok(await sb.rpc('clock', { p_action: action, p_lat: pos?.lat ?? null, p_lng: pos?.lng ?? null, p_accuracy: pos?.accuracy ?? null, p_reason: reason || null }));
    },
    async saveEntry(e) {
      const { id, ...rest } = e;
      if (id) ok(await sb.from('time_entries').update({ ...rest, edited: true }).eq('id', id));
      else ok(await sb.from('time_entries').insert({ ...rest, flags: ['handmatig'], edited: true }));
    },
    async deleteEntry(id) { ok(await sb.from('time_entries').delete().eq('id', id)); },
    async setEntryStatus(id, status, note) { ok(await sb.from('time_entries').update(note === undefined ? { status } : { status, manager_note: note }).eq('id', id)); },
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
const sortEmps = list => list.sort((a, b) => (a.role === 'manager' ? 0 : 1) - (b.role === 'manager' ? 0 : 1) || a.name.localeCompare(b.name, 'nl'));

/* ================= Dialog ================= */
function openDialog(title, body, { onSubmit, onReady } = {}) {
  const dlg = document.createElement('dialog');
  dlg.className = 'dlg';
  dlg.innerHTML = `<form class="dlg-form" novalidate><header><h2>${esc(title)}</h2><button type="button" class="x" data-close aria-label="Sluiten">×</button></header><div class="dlg-body">${body}</div></form>`;
  document.body.append(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  $$('[data-close]', dlg).forEach(b => (b.onclick = () => dlg.close()));
  const form = $('form', dlg);
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const btn = ev.submitter;
    const action = btn?.value || 'save';
    if (action !== 'delete' && !form.checkValidity()) { form.reportValidity(); return; }
    $$('button', form).forEach(b => (b.disabled = true));
    try {
      const keep = await onSubmit(new FormData(form), action, dlg);
      if (keep !== false) dlg.close();
    } catch (e) {
      if (e !== 'cancel') toast(errMsg(e), 'error');
    } finally {
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
function authPage(card) {
  const top = CFG.logoAuth ? `<div class="auth-brand"><img src="${esc(CFG.logoAuth)}" alt="${esc(CFG.bedrijf)}"><span>Rooster${location.hash === '#directie' ? ' · Directie' : location.hash === '#personeel' ? ' · Personeel' : ''}</span></div>` : '';
  return `<div class="auth"><div class="auth-wrap">${top}<div class="auth-card">${card}</div></div></div>`;
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

function renderNewPassword() {
  app.innerHTML = authPage(`${authLogo()}<h1>Nieuw wachtwoord</h1><p>Kies een nieuw wachtwoord van minimaal 8 tekens.</p>
    <form class="stack" id="pwform"><label class="field">Nieuw wachtwoord<input name="password" type="password" minlength="8" autocomplete="new-password" required></label>
    <button class="btn primary block">Opslaan</button></form>`);
  $('#pwform').onsubmit = async ev => {
    ev.preventDefault();
    try {
      await store.updatePassword(new FormData(ev.target).get('password'));
      history.replaceState(null, '', location.pathname);
      toast('Wachtwoord gewijzigd');
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

async function signOut() { await store.signOut(); S.me = null; renderAuth(); }

function handleSession(r) {
  if (!r) return renderAuth();
  if (r.unlinked) return renderUnlinked(r.email);
  S.me = r.employee;
  S.view = isMgr() ? 'planning' : 'mijn';
  renderShell();
}

/* ================= Shell ================= */
function tabsFor() {
  return isMgr()
    ? [['planning', 'Planning'], ['klokken', 'Klokken'], ['aanvragen', 'Aanvragen'], ['team', 'Team'], ['uren', 'Uren & export']]
    : [['mijn', 'Mijn rooster'], ['planning', 'Teamrooster'], ['aanvragen', 'Aanvragen']];
}

function renderShell() {
  window.scrollTo(0, 0);
  const letter = esc((CFG.bedrijf || CFG.appName).charAt(0));
  app.innerHTML = `
    ${store.demo ? '<div class="demo-banner">Demo-modus<span class="hide-sm"> · gegevens worden alleen in deze browser bewaard</span></div>' : ''}
    <header class="topbar"><div class="topbar-inner">
      <div class="brand">${CFG.logo ? `<div class="stack-brand"><img class="wordmark light" src="${esc(CFG.logo)}" alt="${esc(CFG.bedrijf)}"><img class="wordmark dark" src="${esc(CFG.logoDark || CFG.logo)}" alt="${esc(CFG.bedrijf)}"><div class="sub">Rooster · ${isMgr() ? 'Leiding' : esc(S.me.position || 'Team')}</div></div>` : `<div class="logo">${letter}</div><div><strong>${esc(CFG.appName)}</strong><small>${isMgr() ? 'Leidinggevende' : esc(S.me.position || 'Medewerker')}</small></div>`}</div>
      <nav class="tabs" aria-label="Hoofdmenu">${tabsFor().map(([k, l]) => `<button class="tab" data-tab="${k}">${ICON[k === 'planning' && !isMgr() ? 'team' : k] || ''}<span class="tl">${l}</span><span class="ts">${l === 'Uren & export' ? 'Uren' : l}</span>${k === 'aanvragen' ? '<span class="count hidden" data-count></span>' : ''}</button>`).join('')}</nav>
      <div class="userbox"><div class="who"><strong>${esc(S.me.name)}</strong><small>${esc(S.me.email)}</small></div><button class="btn ghost icon" data-logout title="Uitloggen" aria-label="Uitloggen">${ICON.logout}</button></div>
    </div></header>
    <main id="view"></main>`;
  $$('[data-tab]').forEach(b => (b.onclick = () => go(b.dataset.tab)));
  $('[data-logout]').onclick = signOut;
  go(S.view);
}

async function refreshBadge() {
  if (!isMgr()) return;
  try {
    const reqs = await store.requests();
    S.pending = reqs.filter(r => r.status === 'pending').length;
    const c = $('[data-count]');
    if (c) { c.textContent = S.pending; c.classList.toggle('hidden', !S.pending); }
  } catch (e) { /* ignore */ }
}

async function go(view) {
  clearInterval(S.timer);
  if (S.view !== view) window.scrollTo(0, 0);
  S.view = view;
  $$('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === view));
  const el = $('#view');
  el.onclick = null; el.onchange = null; el.ontouchstart = null; el.ontouchend = null;
  try {
    if (view === 'planning') await viewWeek(el, isMgr());
    else if (view === 'mijn') await viewMine(el);
    else if (view === 'aanvragen') await (isMgr() ? viewRequestsMgr(el) : viewRequestsStaff(el));
    else if (view === 'team') await viewTeam(el);
    else if (view === 'uren') await viewHours(el);
    else if (view === 'klokken') await viewClockMgr(el);
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
  const [emps0, shifts, reqs] = await Promise.all([store.employees(), store.shifts(from, to), store.requests()]);
  const emps = sortEmps(emps0);
  const people = emps.filter(e => e.active !== false || shifts.some(s => s.employee_id === e.id));
  const days = [...Array(7)].map((_, i) => addDays(S.week, i));
  const today = todayIso();
  const concept = shifts.filter(s => !s.published).length;
  const leaves = reqs.filter(r => r.status !== 'rejected' && overlaps(r.start_date, r.end_date, from, to));
  const wl = weekLabel(S.week);
  const byCell = {};
  shifts.forEach(s => (byCell[s.employee_id + s.date] ||= []).push(s));

  const rows = people.map(e => {
    const mine = shifts.filter(s => s.employee_id === e.id);
    const hours = mine.reduce((t, s) => t + shiftHours(s), 0);
    const over = e.contract_hours && hours > Number(e.contract_hours) + 0.01;
    const cells = days.map(d => {
      const ds = iso(d);
      const lv = leaves.filter(r => r.employee_id === e.id && r.start_date <= ds && r.end_date >= ds)
        .map(r => `<span class="leave ${r.status === 'pending' ? 'pending' : ''}" title="${esc(STATUS[r.status])}">${esc(REQ[r.type])}${r.status === 'pending' ? ' ?' : ''}</span>`).join('');
      const chips = (byCell[e.id + ds] || []).map(s => {
        const tag = editable ? 'button' : 'div';
        return `<${tag} class="chip ${s.published ? '' : 'concept'}" style="--c:${esc(e.color || COLORS[0])}" ${editable ? `data-shift="${s.id}"` : ''} title="${s.note ? esc(s.note) : ''}"><b>${hm(s.start_time)}–${hm(s.end_time)}</b><small>${esc(s.position || '')}${s.published ? '' : ' · concept'}</small></${tag}>`;
      }).join('');
      return `<td class="cell ${editable ? 'editable' : ''} ${ds === today ? 'today' : ''}" data-emp="${e.id}" data-date="${ds}">${lv}${chips}${editable ? '<button class="add" data-add aria-label="Dienst toevoegen">+</button>' : ''}</td>`;
    }).join('');
    return `<tr class="${e.id === S.me.id ? 'me' : ''}"><th class="who"><div class="who-inner"><span class="dot" style="background:${esc(e.color || COLORS[0])}"></span><div><strong>${esc(e.name)}</strong><small class="${over ? 'over' : ''}">${fmtH(hours)} u${e.contract_hours && editable ? ` / ${fmtH(Number(e.contract_hours))} u` : ''}${over ? ' · boven contract' : ''}</small></div></div></th>${cells}</tr>`;
  }).join('');

  const foot = days.map(d => {
    const ds = iso(d);
    const list = shifts.filter(s => s.date === ds);
    const h = list.reduce((t, s) => t + shiftHours(s), 0);
    return `<td>${list.length ? `${new Set(list.map(s => s.employee_id)).size} pers · ${fmtH(h)} u` : '—'}</td>`;
  }).join('');
  const totalH = shifts.reduce((t, s) => t + shiftHours(s), 0);
  const mobile = isMobile();
  if (S.dayWeek !== from) { S.dayWeek = from; const ti = days.findIndex(d => iso(d) === today); S.dayI = S.dayNext ?? (ti >= 0 ? ti : 0); }
  S.dayNext = undefined;
  const byId = Object.fromEntries(emps.map(e => [e.id, e]));
  const mobileHTML = () => {
    const di = S.dayI, ds = iso(days[di]);
    const list = shifts.filter(s => s.date === ds).sort((a, b) => hm(a.start_time).localeCompare(hm(b.start_time)) || (byId[a.employee_id]?.name || '').localeCompare(byId[b.employee_id]?.name || ''));
    const lv = leaves.filter(r => r.start_date <= ds && r.end_date >= ds);
    const h = list.reduce((t, s) => t + shiftHours(s), 0);
    const fd = feestdag(ds);
    const strip = days.map((d, i) => { const n = new Set(shifts.filter(s => s.date === iso(d)).map(s => s.employee_id)).size; const mineThere = shifts.some(s => s.date === iso(d) && s.employee_id === S.me.id);
      return `<button class="ds ${i === di ? 'on' : ''} ${iso(d) === today ? 'today' : ''}" data-day="${i}" aria-label="${fmtLong(iso(d))}"><span>${DAG[i]}</span><b>${d.getDate()}</b><i class="${mineThere && !editable ? 'mine' : ''}">${n || ''}</i></button>`; }).join('');
    const items = list.map(s => { const e = byId[s.employee_id] || {}; const me = e.id === S.me.id; const tag = editable ? 'button' : 'div';
      return `<${tag} class="mshift ${s.published ? '' : 'concept'} ${me ? 'me' : ''}" style="--c:${esc(e.color || COLORS[0])}" ${editable ? `data-shift="${s.id}"` : ''}>
        <span class="mtime"><b>${hm(s.start_time)}</b><small>${hm(s.end_time)}</small></span>
        <span class="mwho"><strong>${esc(e.name || '?')}${me ? ' <em>jij</em>' : ''}</strong><small>${esc(s.position || '')}${s.position ? ' · ' : ''}${fmtH(shiftHours(s))} u${s.published ? '' : ' · concept'}${s.note ? ' · ' + esc(s.note) : ''}</small></span>
        ${editable ? '<span class="chev" aria-hidden="true">›</span>' : ''}</${tag}>`; }).join('');
    const leaveHTML = lv.length ? `<div class="mleaves">${lv.map(r => `<span class="leave ${r.status === 'pending' ? 'pending' : ''}">${esc(byId[r.employee_id]?.name || '')} · ${esc(REQ[r.type])}${r.status === 'pending' ? ' (aangevraagd)' : ''}</span>`).join('')}</div>` : '';
    return `<div class="daystrip">${strip}</div>
      <div class="dayhead"><div><h2>${esc(fmtLong(ds).replace(/^./, c => c.toUpperCase()))}</h2>${fd ? `<span class="fdtag">${esc(fd)}</span>` : ''}</div><span>${list.length ? `${new Set(list.map(s => s.employee_id)).size} pers · ${fmtH(h)} u` : ''}</span></div>
      ${leaveHTML}
      <div class="mlist">${items || `<div class="card empty">${editable ? 'Nog niemand ingepland.' : 'Geen diensten op deze dag.'}</div>`}</div>
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
        <button class="btn primary" data-act="publish" ${concept ? '' : 'disabled'}>${concept ? `Publiceer ${concept} dienst${concept > 1 ? 'en' : ''}` : 'Alles gepubliceerd ✓'}</button>
      </div>` : ''}
    </div>
    ${editable && !mobile ? `<div class="legend"><span><i class="l-pub"></i>Gepubliceerd (zichtbaar voor team)</span><span><i class="l-con"></i>Concept (nog niet zichtbaar)</span><span><i class="l-leave"></i>Verlof / niet beschikbaar</span></div>` : ''}
    ${people.length && mobile ? mobileHTML() : ''}
    ${people.length && !mobile ? `<div class="grid-wrap"><table class="grid">
      <thead><tr><th class="who">Medewerker</th>${days.map(d => `<th class="${iso(d) === today ? 'today' : ''}" ${feestdag(iso(d)) ? `title="${esc(feestdag(iso(d)))}"` : ''}>${DAG[dayIdx(d)]}<b>${d.getDate()}</b>${feestdag(iso(d)) ? `<em class="fd">${esc(feestdag(iso(d)))}</em>` : ''}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><th class="who">${fmtH(totalH)} u totaal</th>${foot}</tr></tfoot>
    </table></div>` : people.length ? '' : `<div class="card empty">Nog geen medewerkers. ${editable ? 'Voeg ze toe via <strong>Team</strong>.' : ''}</div>`}
    ${!editable && !shifts.length && people.length ? '<p class="hint" style="margin-top:12px">Voor deze week is nog geen rooster gepubliceerd.</p>' : ''}
  `;

  el.onclick = async ev => {
    const act = ev.target.closest('[data-act]')?.dataset.act;
    if (act === 'prev') { S.week = addDays(S.week, -7); return rerender(); }
    if (act === 'next') { S.week = addDays(S.week, 7); return rerender(); }
    if (act === 'today') { S.week = mondayOf(new Date()); S.dayWeek = null; return rerender(); }
    const dayB = ev.target.closest('[data-day]'); if (dayB) { S.dayI = Number(dayB.dataset.day); return rerender(); }
    if (ev.target.closest('[data-addday]')) {
      const ds = iso(days[S.dayI]);
      const free = people.find(e => e.active !== false && !shifts.some(s => s.employee_id === e.id && s.date === ds)) || people[0];
      const t = CFG.diensten[0] || { start: '09:00', end: '17:00', pauze: 30 };
      return shiftDialog({ employee_id: free.id, date: ds, start_time: t.start, end_time: t.end, break_minutes: t.pauze || 0, position: free.position || '', note: '' }, emps, shifts, leaves);
    }
    if (act === 'publish') {
      if (!await ask(`${concept} dienst(en) publiceren? Het team ziet ze daarna direct in hun rooster.`)) return;
      await store.publish(from, to); toast('Week gepubliceerd'); return rerender();
    }
    if (act === 'copy') return copyWeek(shifts);
    if (act === 'print') { try { window.print(); } catch (e) { toast('Afdrukken is hier niet beschikbaar', 'error'); } return; }
    const chip = ev.target.closest('[data-shift]');
    if (chip) return shiftDialog(shifts.find(s => s.id === chip.dataset.shift), emps, shifts, leaves);
    const cell = ev.target.closest('td.cell.editable');
    if (cell && (ev.target.closest('[data-add]') || ev.target === cell)) {
      const e = emps.find(x => x.id === cell.dataset.emp);
      const t = CFG.diensten[0] || { start: '09:00', end: '17:00', pauze: 30 };
      return shiftDialog({ employee_id: e.id, date: cell.dataset.date, start_time: t.start, end_time: t.end, break_minutes: t.pauze || 0, position: e.position || '', note: '' }, emps, shifts, leaves);
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

async function copyWeek(current) {
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
  if (!await ask(`${list.length} dienst(en) van vorige week kopiëren als concept?`)) return;
  await store.saveShifts(list);
  toast(`${list.length} diensten gekopieerd`);
  rerender();
}

function shiftDialog(s, emps, weekShifts, leaves) {
  const isNew = !s.id;
  const day = parse(s.date);
  const opts = (list, val) => list.map(v => `<option ${v === val ? 'selected' : ''}>${esc(v)}</option>`).join('');
  const posList = [...new Set([...(CFG.posities || []), s.position].filter(Boolean))];
  const body = `
    <label class="field">Medewerker<select name="employee_id" required>${emps.filter(e => e.active !== false || e.id === s.employee_id).map(e => `<option value="${e.id}" ${e.id === s.employee_id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>
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
      const check = () => {
        const emp = f.employee_id.value, date = f.date.value;
        const msgs = [];
        const dates = isNew ? $$('input[name=days]:checked', f).map(c => iso(addDays(mondayOf(parse(date)), Number(c.value)))) : [date];
        dates.forEach(ds => {
          const lv = leaves.find(r => r.employee_id === emp && r.start_date <= ds && r.end_date >= ds);
          if (lv) msgs.push(`${fmtShort(ds)}: ${REQ[lv.type].toLowerCase()} ${lv.status === 'pending' ? 'aangevraagd' : 'goedgekeurd'}`);
          const other = weekShifts.find(x => x.employee_id === emp && x.date === ds && x.id !== s.id);
          if (other) msgs.push(`${fmtShort(ds)}: heeft al een dienst ${hm(other.start_time)}–${hm(other.end_time)}`);
        });
        warn.innerHTML = msgs.length ? '⚠︎ ' + msgs.map(esc).join('<br>') : '';
        warn.classList.toggle('hidden', !msgs.length);
      };
      $$('.tpl', dlg).forEach(b => (b.onclick = () => { f.start_time.value = b.dataset.s; f.end_time.value = b.dataset.e; f.break_minutes.value = b.dataset.p; }));
      f.addEventListener('change', check);
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
        employee_id: fd.get('employee_id'), start_time: fd.get('start_time'), end_time: fd.get('end_time'),
        break_minutes: Number(fd.get('break_minutes')) || 0, position: fd.get('position') || null, note: fd.get('note').trim() || null,
      };
      if (isNew) {
        const m = mondayOf(parse(fd.get('date')));
        const ds = fd.getAll('days');
        const dates = ds.length ? ds.map(i => iso(addDays(m, Number(i)))) : [fd.get('date')];
        await store.saveShifts(dates.map(date => ({ ...base, date, published: false })));
        toast(dates.length > 1 ? `${dates.length} diensten ingepland` : 'Dienst ingepland');
      } else {
        await store.saveShifts([{ ...base, id: s.id, date: fd.get('date') }]);
        toast('Dienst opgeslagen');
      }
      rerender();
    },
  });
}

/* ================= My schedule ================= */
async function viewMine(el) {
  const start = mondayOf(new Date());
  const sel = S.mineWeek || null; // null = komende weken, anders maandag van gekozen week
  const fromD = sel && sel < start ? sel : start;
  const toD = sel && addDays(sel, 6) > addDays(start, 41) ? addDays(sel, 6) : addDays(start, 41);
  const from = iso(fromD), to = iso(toD);
  const [all, reqs, emps] = await Promise.all([store.shifts(from, to), store.requests(), store.employees()]);
  const nameOf = Object.fromEntries(emps.map(e => [e.id, e.name.split(' ')[0]]));
  const withWho = s => { const o = all.filter(x => x.date === s.date && x.employee_id !== S.me.id && x.published).map(x => nameOf[x.employee_id]).filter(Boolean); return [...new Set(o)]; };
  const mine = all.filter(s => s.employee_id === S.me.id && s.published);
  const myLeaves = reqs.filter(r => r.employee_id === S.me.id && r.status === 'approved' && overlaps(r.start_date, r.end_date, from, to));
  const today = todayIso();
  const nowHM = `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
  const next = mine.find(s => s.date > today || (s.date === today && hm(s.end_time) > nowHM) || (s.date === today && mins(s.end_time) <= mins(s.start_time)));
  const clockHTML = await clockCard(mine.find(s => s.date === today));
  let workedHTML = '';
  if (sel) {
    const ents = (await store.entries(iso(sel), iso(addDays(sel, 6)))).filter(x => x.employee_id === S.me.id && x.clock_out);
    if (ents.length) {
      const tot = ents.reduce((t, x) => t + entryHours(x), 0), ok = ents.filter(x => x.status === 'approved').reduce((t, x) => t + entryHours(x), 0);
      workedHTML = `<div class="card pad worked"><div><small>Gewerkt deze week</small><b>${fmtH(tot)} uur</b></div><div><small>Goedgekeurd</small><b>${fmtH(ok)} uur</b></div><div><small>Registraties</small><b>${ents.length}</b></div></div>`;
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
      ws.filter(s => s.date === ds).forEach(s => items.push(`<li class="${ds === today ? 'today' : ''}">${dayHead}<div class="t"><strong>${hm(s.start_time)} – ${hm(s.end_time)}</strong><small>${esc(s.position || '')}${s.break_minutes ? ` · ${s.break_minutes} min pauze` : ''}${s.note ? ` · ${esc(s.note)}` : ''}${fd ? ` · ${esc(fd)}` : ''}</small>${withWho(s).length ? `<small class="with">Met ${esc(withWho(s).join(', '))}</small>` : ''}</div><div class="h">${fmtH(shiftHours(s))} u</div></li>`));
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
      ${mine.length ? '<button class="btn" data-ics>📅 Zet in mijn agenda</button>' : ''}</div>
    ${clockHTML}
    ${next && !sel ? `<div class="hero-next"><div><small>Volgende dienst</small><h2>${esc(fmtLong(next.date))}</h2><p>${hm(next.start_time)} – ${hm(next.end_time)}${next.position ? ' · ' + esc(next.position) : ''}${next.note ? ' · ' + esc(next.note) : ''}</p>${withWho(next).length ? `<p class="with">Met ${esc(withWho(next).join(', '))}</p>` : ''}</div><button class="btn" data-goto="aanvragen">Vrij vragen</button></div>` : ''}
    <div class="filters mine-filter"><button data-mf="all" class="${sel ? '' : 'active'}">Komende weken</button><button data-mf="week" class="${sel ? 'active' : ''}">Per week</button></div>
    ${body}
  `;
  bindClock(el);
  el.onclick = ev => {
    if (clockClicks(ev)) return;
    if (ev.target.closest('[data-ics]')) downloadIcs(mine);
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
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'mijn-rooster.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ================= Requests ================= */
function reqDates(r) {
  const n = daysBetween(r.start_date, r.end_date);
  return r.start_date === r.end_date ? fmtLong(r.start_date) : `${fmtShort(r.start_date)} t/m ${fmtShort(r.end_date)} <span class="muted">(${n} dagen)</span>`;
}

async function viewRequestsStaff(el) {
  const reqs = (await store.requests()).filter(r => r.employee_id === S.me.id);
  const t = todayIso();
  el.innerHTML = `
    <div class="page-head"><div><h1>Aanvragen</h1><p>Vraag vakantie of een vrije dag aan, of geef door wanneer je niet kunt.</p></div></div>
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
          <article class="card req"><div class="req-head"><strong>${esc(REQ[r.type])}</strong><span class="status ${r.status}">${STATUS[r.status]}</span></div>
          <p class="dates">${reqDates(r)}</p>${r.note ? `<p class="note">${esc(r.note)}</p>` : ''}
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
    const d = ev.target.closest('[data-del]');
    if (d && await ask('Deze aanvraag intrekken?')) { await store.deleteRequest(d.dataset.del); toast('Aanvraag ingetrokken'); rerender(); }
  };
}

async function viewRequestsMgr(el) {
  const [reqs, emps] = await Promise.all([store.requests(), store.employees()]);
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
    <div class="page-head"><div><h1>Aanvragen</h1><p>Verlof, vrije dagen en beschikbaarheid van het team.</p></div>
      <div class="filters"><button data-f="pending" class="${S.reqFilter === 'pending' ? 'active' : ''}">Openstaand (${pend.length})</button><button data-f="all" class="${S.reqFilter === 'all' ? 'active' : ''}">Alle</button></div></div>
    ${list.length ? `<div class="reqs">${list.map(r => {
      const e = byId[r.employee_id] || { name: 'Onbekend' };
      const c = conflicts[r.id] || [];
      return `<article class="card req"><div class="req-head"><span class="dot" style="background:${esc(e.color || COLORS[0])};margin:0"></span><strong>${esc(e.name)}</strong><span class="badge">${esc(REQ[r.type])}</span><span class="status ${r.status}">${STATUS[r.status]}</span></div>
        <p class="dates">${reqDates(r)}</p>${r.note ? `<p class="note">“${esc(r.note)}”</p>` : ''}
        ${c.length ? `<p class="conflict">⚠︎ Staat ${c.length}× ingepland in deze periode (${c.map(s => fmtShort(s.date)).join(', ')}).</p>` : ''}
        ${r.manager_note ? `<p class="reply"><strong>Jouw reactie:</strong> ${esc(r.manager_note)}</p>` : ''}
        <div class="req-actions">${r.status === 'pending'
          ? `<button class="btn sm ok" data-ok="${r.id}">Goedkeuren</button><button class="btn sm danger" data-no="${r.id}">Afwijzen</button>`
          : `<button class="btn sm ghost" data-undo="${r.id}">Terugzetten naar openstaand</button>`}</div></article>`;
    }).join('')}</div>` : `<div class="card empty">${S.reqFilter === 'pending' ? 'Geen openstaande aanvragen. 🎉' : 'Nog geen aanvragen.'}</div>`}`;

  el.onclick = async ev => {
    const f = ev.target.closest('[data-f]'); if (f) { S.reqFilter = f.dataset.f; return rerender(); }
    const okB = ev.target.closest('[data-ok]');
    if (okB) {
      const r = reqs.find(x => x.id === okB.dataset.ok);
      const c = conflicts[r.id] || [];
      if (c.length && !await ask(`Let op: deze medewerker staat ${c.length}× ingepland in deze periode. Na goedkeuren kun je die diensten in de planning aanpassen. Doorgaan?`)) return;
      await store.decideRequest(r.id, 'approved', null); toast('Aanvraag goedgekeurd'); return rerender();
    }
    const no = ev.target.closest('[data-no]');
    if (no) {
      return openDialog('Aanvraag afwijzen', `<label class="field">Reden (de medewerker ziet dit)<textarea name="note" placeholder="Bijv. al te veel mensen vrij die week"></textarea></label>
        <div class="dlg-foot"><button type="button" class="btn" data-close>Annuleren</button><button class="btn danger" value="save">Afwijzen</button></div>`, {
        async onSubmit(fd) { await store.decideRequest(no.dataset.no, 'rejected', fd.get('note').trim()); toast('Aanvraag afgewezen'); rerender(); },
      });
    }
    const undo = ev.target.closest('[data-undo]');
    if (undo) { await store.decideRequest(undo.dataset.undo, 'pending', null); rerender(); }
  };
}

/* ================= Team ================= */
async function viewTeam(el) {
  const emps = sortEmps(await store.employees());
  el.innerHTML = `
    <div class="page-head"><div><h1>Team</h1><p>Medewerkers, functies en contracturen.</p></div><button class="btn primary" data-new>+ Medewerker</button></div>
    ${emps.length ? `<div class="card table-wrap"><table class="list">
      <thead><tr><th>Naam</th><th>Functie</th><th class="hide-sm">E-mail</th><th class="hide-sm">Telefoon</th><th class="num">Contract</th><th>Account</th></tr></thead>
      <tbody>${emps.map(e => `<tr class="click ${e.active === false ? 'inactive' : ''}" data-id="${e.id}">
        <td><div class="namecell"><span class="dot" style="background:${esc(e.color || COLORS[0])}"></span>${esc(e.name)}${e.role === 'manager' ? ' <span class="pill">leiding</span>' : ''}</div></td>
        <td>${esc(e.position || '—')}</td><td class="hide-sm">${esc(e.email)}</td><td class="hide-sm">${esc(e.phone || '—')}</td>
        <td class="num">${e.contract_hours ? fmtH(Number(e.contract_hours)) + ' u/wk' : '—'}</td>
        <td>${e.active === false ? '<span class="pill">inactief</span>' : e.user_id ? '<span class="pill ok">actief</span>' : '<span class="pill warn">nog niet geactiveerd</span>'}</td></tr>`).join('')}</tbody>
    </table></div>` : '<div class="card empty">Nog geen medewerkers.</div>'}
    ${store.demo ? '' : '<p class="hint" style="margin-top:14px">Nieuwe medewerkers activeren zelf hun account via <strong>“Eerste keer inloggen”</strong> met het e-mailadres dat je hier invult.</p>'}`;
  el.onclick = ev => {
    if (ev.target.closest('[data-new]')) return employeeDialog({ active: true, role: 'staff', color: COLORS[emps.length % COLORS.length] });
    const tr = ev.target.closest('tr[data-id]');
    if (tr) employeeDialog(emps.find(e => e.id === tr.dataset.id));
  };
}

function employeeDialog(e) {
  const isNew = !e.id;
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
      <label class="field">Contracturen per week<input type="number" name="contract_hours" min="0" step="0.5" value="${e.contract_hours ?? ''}"></label>
    </div>
    <div class="row">
      <label class="field">Rol<select name="role"><option value="staff" ${e.role !== 'manager' ? 'selected' : ''}>Medewerker</option><option value="manager" ${e.role === 'manager' ? 'selected' : ''}>Leidinggevende (mag plannen)</option></select></label>
      <label class="field">Kleur in rooster<input type="color" name="color" value="${esc(e.color || COLORS[0])}"></label>
    </div>
    <label class="check"><input type="checkbox" name="active" ${e.active !== false ? 'checked' : ''}> Actief (uit dienst? Zet dit uit, dan blijft de historie bewaard)</label>
    ${!isNew && !store.demo ? `<div><button type="button" class="btn sm" data-invite>Kopieer uitnodigingsbericht</button></div>` : ''}
    <div class="dlg-foot">
      ${isNew || e.id === S.me.id ? '' : '<button class="btn danger" value="delete" formnovalidate>Verwijderen</button>'}
      <span class="spacer"></span><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">Opslaan</button>
    </div>`, {
    onReady(dlg) {
      const b = $('[data-invite]', dlg);
      if (b) b.onclick = async () => { try { await navigator.clipboard.writeText(invite); toast('Bericht gekopieerd — plak het in WhatsApp of mail'); } catch (x) { prompt('Kopieer dit bericht:', invite); } };
    },
    async onSubmit(fd, action) {
      if (action === 'delete') {
        if (!await ask(`${e.name} definitief verwijderen, inclusief alle diensten en aanvragen? Tip: zet de medewerker liever op inactief.`)) throw 'cancel';
        await store.deleteEmployee(e.id); toast('Medewerker verwijderd'); return rerender();
      }
      if (e.id === S.me.id && fd.get('role') !== 'manager' && !await ask('Je haalt je eigen planrechten weg. Zeker weten?')) throw 'cancel';
      const payload = {
        name: fd.get('name').trim(), email: fd.get('email').trim().toLowerCase(), phone: fd.get('phone').trim() || null,
        position: fd.get('position') || null, contract_hours: fd.get('contract_hours') ? Number(fd.get('contract_hours')) : null,
        role: fd.get('role'), color: fd.get('color'), active: fd.get('active') === 'on',
      };
      if (!isNew) payload.id = e.id;
      await store.saveEmployee(payload);
      if (e.id === S.me.id) Object.assign(S.me, payload);
      toast(isNew ? 'Medewerker toegevoegd' : 'Opgeslagen');
      rerender();
    },
  });
}

/* ================= Feestdagen & toeslag-uren ================= */
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), n = h + l - 7 * m + 114;
  return new Date(y, Math.floor(n / 31) - 1, (n % 31) + 1);
}
const _fd = {};
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
  return _fd[y][ds] || null;
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
function saveFile(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function exportCsv(name, rows) {
  const q = v => { const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? ''); return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  saveFile(name + '.csv', '﻿' + rows.map(r => r.map(q).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
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
  const ents = await store.entries(from, to);
  const done = ents.filter(x => x.clock_out);
  const shifts = S.hsrc === 'gewerkt'
    ? done.filter(x => x.status === 'approved').map(x => entryAsShift(x, matchShift(x, allShifts)))
    : S.onlyPub ? allShifts.filter(s => s.published) : allShifts;
  const entPending = done.filter(x => x.status === 'pending').length;
  const weeks = daysBetween(from, to) / 7;
  const approved = reqs.filter(r => r.status === 'approved');

  const rows = emps.map(e => {
    const mine = shifts.filter(s => s.employee_id === e.id);
    const h = mine.reduce((t, s) => t + shiftHours(s), 0);
    const pauze = mine.reduce((t, s) => t + (Number(s.break_minutes) || 0) / 60, 0);
    const sp = mine.map(splitShift).reduce((a, b) => ({ avond: a.avond + b.avond, nacht: a.nacht + b.nacht, zondag: a.zondag + b.zondag, feestdag: a.feestdag + b.feestdag }), { avond: 0, nacht: 0, zondag: 0, feestdag: 0 });
    const lv = approved.filter(r => r.employee_id === e.id);
    const verlof = lv.filter(r => r.type === 'vakantie' || r.type === 'vrij').reduce((t, r) => t + overlapDays(r, from, to), 0);
    const ziek = lv.filter(r => r.type === 'ziek').reduce((t, r) => t + overlapDays(r, from, to), 0);
    const contract = e.contract_hours ? Number(e.contract_hours) * weeks : null;
    return { e, n: mine.length, h, pauze, ...sp, verlof, ziek, contract, diff: contract != null ? h - contract : null };
  }).filter(r => r.n || r.verlof || r.ziek || r.e.active !== false);
  const T = rows.reduce((t, r) => ({ n: t.n + r.n, h: t.h + r.h, avond: t.avond + r.avond, nacht: t.nacht + r.nacht, zondag: t.zondag + r.zondag, feestdag: t.feestdag + r.feestdag }), { n: 0, h: 0, avond: 0, nacht: 0, zondag: 0, feestdag: 0 });
  const conceptCount = allShifts.filter(s => !s.published).length;
  const fdIn = []; for (let d = new Date(P.from); d <= P.to; d = addDays(d, 1)) { const f = feestdag(iso(d)); if (f) fdIn.push(`${f} (${fmtShort(iso(d))})`); }
  const slug = `${S.hsrc}-${S.pmode}-${from}_${to}`;

  const payroll = () => [
    ['Periode van', 'Periode tot', 'Medewerker', 'E-mail', 'Functie', 'Contract u/week', 'Diensten', 'Gewerkte uren (netto)', 'Pauze (u)', 'Avonduren', 'Nachturen', 'Zondaguren', 'Feestdaguren', 'Vakantie/vrij (dagen)', 'Ziek (dagen)', 'Contracturen periode', 'Verschil t.o.v. contract'],
    ...rows.map(r => [from, to, r.e.name, r.e.email, r.e.position || '', r.e.contract_hours ?? '', r.n, r2(r.h), r2(r.pauze), r2(r.avond), r2(r.nacht), r2(r.zondag), r2(r.feestdag), r.verlof, r.ziek, r.contract != null ? r2(r.contract) : '', r.diff != null ? r2(r.diff) : '']),
  ];
  const detail = () => {
    const byId = Object.fromEntries(emps.map(e => [e.id, e]));
    return [['Datum', 'Dag', 'Medewerker', 'E-mail', 'Functie', 'Begin', 'Eind', 'Pauze (min)', 'Uren (netto)', 'Avond', 'Nacht', 'Zondag', 'Feestdag', 'Status', 'Notitie'],
      ...shifts.map(s => { const e = byId[s.employee_id] || {}; const sp = splitShift(s); return [s.date, DAG[dayIdx(parse(s.date))], e.name, e.email, s.position || '', hm(s.start_time), hm(s.end_time), s.break_minutes || 0, r2(shiftHours(s)), r2(sp.avond), r2(sp.nacht), r2(sp.zondag), r2(sp.feestdag), s.published ? 'gepubliceerd' : 'concept', s.note || '']; })];
  };
  const leave = () => {
    const byId = Object.fromEntries(emps.map(e => [e.id, e]));
    return [['Medewerker', 'Soort', 'Van', 'Tot en met', 'Dagen totaal', 'Dagen in periode', 'Status', 'Toelichting', 'Reactie leidinggevende', 'Aangevraagd op'],
      ...reqs.filter(r => overlaps(r.start_date, r.end_date, from, to)).map(r => [byId[r.employee_id]?.name || '', REQ[r.type], r.start_date, r.end_date, daysBetween(r.start_date, r.end_date), overlapDays(r, from, to), STATUS[r.status], r.note || '', r.manager_note || '', (r.created_at || '').slice(0, 10)])];
  };
  const team = () => [['Naam', 'E-mail', 'Telefoon', 'Functie', 'Rol', 'Contract u/week', 'Actief', 'Account geactiveerd'],
    ...emps.map(e => [e.name, e.email, e.phone || '', e.position || '', e.role === 'manager' ? 'Leidinggevende' : 'Medewerker', e.contract_hours ?? '', e.active === false ? 'nee' : 'ja', e.user_id ? 'ja' : 'nee'])];
  const EXPORTS = {
    payroll: ['Urenoverzicht voor salarisadministratie', 'Per medewerker: gewerkte uren, avond-/nacht-/zondag-/feestdaguren, verlof- en ziektedagen. Dit bestand stuur je naar je salarisverwerker.', payroll, `salaris-${slug}`],
    detail: ['Alle diensten (detail)', 'Elke dienst als losse regel met tijden, pauze en toeslaguren. Handig voor controle of voor je accountant.', detail, `diensten-${slug}`],
    leave: ['Verlof & ziekte', 'Alle aanvragen die in deze periode vallen, met status en reactie.', leave, `verlof-${slug}`],
    klok: ['Klokregistratie', 'Alle in- en uitkloktijden met pauze, afstand tot de zaak, meldingen en status. Bewijs bij vragen over gewerkte uren.', () => {
      const byId = Object.fromEntries(emps.map(e => [e.id, e]));
      return [['Datum', 'Medewerker', 'Gepland', 'In', 'Uit', 'Pauze (min)', 'Gewerkt (u)', 'Afstand in (m)', 'Afstand uit (m)', 'Meldingen', 'Reden medewerker', 'Status', 'Aangepast', 'Notitie directie'],
        ...ents.map(x => { const sh = matchShift(x, allShifts); return [tDate(x.clock_in), byId[x.employee_id]?.name || '', sh ? `${hm(sh.start_time)}-${hm(sh.end_time)}` : '', tHM(x.clock_in), x.clock_out ? tHM(x.clock_out) : '', x.break_minutes || 0, x.clock_out ? r2(entryHours(x)) : '', x.in_distance_m ?? '', x.out_distance_m ?? '', (x.flags || []).map(f => FLAG[f] || f).join(', '), x.reason || '', ESTATUS[x.status], x.edited ? 'ja' : 'nee', x.manager_note || '']; })];
    }, `klokregistratie-${S.pmode}-${from}_${to}`],
    team: ['Medewerkerslijst', 'Contactgegevens, functies en contracturen van het hele team.', team, 'medewerkers'],
  };

  el.innerHTML = `
    <div class="page-head"><div><h1>Uren & export</h1><p>Overzicht per periode en exportbestanden voor salaris en boekhouding.</p></div></div>
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
      <thead><tr><th>Medewerker</th><th class="num">Diensten</th><th class="num">Uren</th><th class="num hide-sm">Avond</th><th class="num hide-sm">Nacht</th><th class="num hide-sm">Zondag</th><th class="num hide-sm">Feestdag</th><th class="num hide-sm">Verlof</th><th class="num hide-sm">Ziek</th><th class="num">t.o.v. contract</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td><div class="namecell"><span class="dot" style="background:${esc(r.e.color || COLORS[0])}"></span>${esc(r.e.name)}</div></td>
        <td class="num">${r.n}</td><td class="num"><strong>${fmtH(r.h)}</strong></td>
        <td class="num hide-sm">${fmtH(r.avond)}</td><td class="num hide-sm">${fmtH(r.nacht)}</td><td class="num hide-sm">${fmtH(r.zondag)}</td><td class="num hide-sm">${fmtH(r.feestdag)}</td>
        <td class="num hide-sm">${r.verlof ? r.verlof + ' d' : '—'}</td><td class="num hide-sm">${r.ziek ? r.ziek + ' d' : '—'}</td>
        <td class="num ${r.diff == null ? '' : r.diff >= 0 ? 'pos' : 'neg'}">${r.diff == null ? '—' : (r.diff > 0 ? '+' : '') + fmtH(r.diff) + ' u'}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Totaal</td><td class="num">${T.n}</td><td class="num">${fmtH(T.h)}</td><td class="num hide-sm">${fmtH(T.avond)}</td><td class="num hide-sm">${fmtH(T.nacht)}</td><td class="num hide-sm">${fmtH(T.zondag)}</td><td class="num hide-sm">${fmtH(T.feestdag)}</td><td class="hide-sm"></td><td class="hide-sm"></td><td></td></tr></tfoot>
    </table></div>
    <h2 style="font-size:21px;margin:28px 0 12px">Exporteren</h2>
    <div class="exports">${Object.entries(EXPORTS).map(([k, [t, d]]) => `<div class="card pad export"><h3>${t}</h3><p class="hint">${d}</p><div class="req-actions"><button class="btn primary sm" data-csv="${k}">⬇︎ Download (Excel/CSV)</button><button class="btn sm" data-copy="${k}">Kopieer tabel</button></div></div>`).join('')}</div>
    <p class="hint" style="margin-top:14px">Uren zijn <strong>${S.hsrc === 'gewerkt' ? 'goedgekeurde gewerkte' : 'geplande'}</strong> uren (netto, na pauze). Toeslaguren zijn bruto (pauze niet afgetrokken), venster instelbaar in <code>config.js</code>: avond ${esc((CFG.toeslagen || {}).avondVan || '20:00')}–${esc((CFG.toeslagen || {}).avondTot || '24:00')}, nacht ${esc((CFG.toeslagen || {}).nachtVan || '00:00')}–${esc((CFG.toeslagen || {}).nachtTot || '06:00')}. CSV-bestanden openen direct in Excel (puntkomma, komma als decimaalteken).</p>`;

  el.onclick = ev => {
    const p = ev.target.closest('[data-p]'); if (p) { S.panchor = shiftPeriod(S.pmode, S.panchor, Number(p.dataset.p)); return rerender(); }
    const m = ev.target.closest('[data-mode]'); if (m) { S.pmode = m.dataset.mode; return rerender(); }
    const sr = ev.target.closest('[data-src]'); if (sr) { S.hsrc = sr.dataset.src; return rerender(); }
    const gt = ev.target.closest('[data-goto]'); if (gt) return go(gt.dataset.goto);
    const c = ev.target.closest('[data-csv]'); if (c) { const x = EXPORTS[c.dataset.csv]; exportCsv(x[3], x[2]()); return toast('Bestand gedownload'); }
    const cp = ev.target.closest('[data-copy]'); if (cp) return copyRows(EXPORTS[cp.dataset.copy][2]());
  };
  el.onchange = ev => { if (ev.target.matches('[data-onlypub]')) { S.onlyPub = ev.target.checked; rerender(); } };
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
const FLAG = { in_buiten_locatie: 'Ingeklokt buiten locatie', uit_buiten_locatie: 'Uitgeklokt buiten locatie', in_geen_locatie: 'Inklokken zonder locatie', uit_geen_locatie: 'Uitklokken zonder locatie', handmatig: 'Handmatig toegevoegd' };
const ESTATUS = { open: 'Aan het werk', pending: 'Te controleren', approved: 'Goedgekeurd', rejected: 'Afgekeurd' };
// Koppel een registratie aan de geplande dienst (zelfde dag, dichtstbijzijnde begintijd)
function matchShift(e, shifts) {
  const ds = tDate(e.clock_in), m = mins(tHM(e.clock_in));
  const c = shifts.filter(s => s.employee_id === e.employee_id && s.date === ds);
  return c.sort((a, b) => Math.abs(mins(a.start_time) - m) - Math.abs(mins(b.start_time) - m))[0] || null;
}
// Registratie omzetten naar 'dienst-vorm' voor urentotalen en toeslagen
const entryAsShift = (e, sh) => ({ id: e.id, employee_id: e.employee_id, date: tDate(e.clock_in), start_time: tHM(e.clock_in), end_time: tHM(e.clock_out), break_minutes: e.break_minutes || 0, position: sh?.position || '', note: e.manager_note || '', published: true });

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
  const noLoc = st.lat == null;
  return `<div class="card clock ${open ? 'is-on' : ''}" data-clockcard>
    <div class="clock-state">${state}</div>
    <div class="clock-btns">${noLoc ? '<p class="hint">De werklocatie is nog niet ingesteld. Vraag de directie om dit te doen.</p>' : btns}</div>
    <p class="hint clock-hint">📍 Bij in- en uitklokken wordt gecontroleerd of je op de werklocatie bent.</p>
    ${store.demo ? `<div class="demo-loc"><span>Demo – doe alsof ik ben:</span><div class="filters"><button data-demoloc="op" class="${S.demoLoc !== 'buiten' ? 'active' : ''}">Op locatie</button><button data-demoloc="buiten" class="${S.demoLoc === 'buiten' ? 'active' : ''}">Thuis</button></div></div>` : ''}
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
  if (needLoc) btn.textContent = 'Locatie bepalen…';
  const pos = needLoc ? await getPosition() : null;
  const done = { in: 'Ingeklokt — fijne dienst!', uit: 'Uitgeklokt — tot de volgende keer!', pauze_start: 'Pauze gestart', pauze_eind: 'Pauze gestopt' };
  try {
    await store.clock(action, pos, null);
    toast(done[action]); rerender();
  } catch (e) {
    btn.disabled = false; btn.textContent = label;
    const st = await store.settings();
    if (e.code === 'LC001' && st.allow_override) {
      openDialog(action === 'in' ? 'Inklokken buiten locatie' : 'Uitklokken buiten locatie', `
        <div class="warnbox">${esc(e.message)}</div>
        <label class="field">Waarom klok je niet op de werklocatie? (de directie ziet dit)<textarea name="reason" required placeholder="Bijv. catering op locatie, inkoop bij de groothandel"></textarea></label>
        <div class="dlg-foot"><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">Toch ${action === 'in' ? 'inklokken' : 'uitklokken'}</button></div>`, {
        async onSubmit(fd) { await store.clock(action, pos, fd.get('reason')); toast(done[action] + ' (gemarkeerd voor controle)'); rerender(); },
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
  openDialog('Werklocatie', `
    <p class="hint">Klokken kan alleen binnen de straal rond dit punt. Tip: sta in de zaak en tik op <strong>Gebruik mijn huidige locatie</strong>.</p>
    <button type="button" class="btn" data-here>📍 Gebruik mijn huidige locatie</button>
    <div class="row keep">
      <label class="field">Breedtegraad<input name="lat" inputmode="decimal" value="${st.lat ?? ''}" required></label>
      <label class="field">Lengtegraad<input name="lng" inputmode="decimal" value="${st.lng ?? ''}" required></label>
    </div>
    <label class="field">Straal in meters (aanbevolen 100–200)<input type="number" name="radius_m" min="25" max="2000" step="25" value="${st.radius_m || 150}" required></label>
    <label class="check"><input type="checkbox" name="allow_override" ${st.allow_override !== false ? 'checked' : ''}> Buiten de straal toch toestaan met een reden (wordt gemarkeerd voor controle)</label>
    <p class="hint" data-maplink>${st.lat != null ? `Controleer op de kaart: <a href="https://www.google.com/maps?q=${st.lat},${st.lng}" target="_blank" rel="noopener">${st.lat}, ${st.lng}</a>` : ''}</p>
    <div class="dlg-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">Opslaan</button></div>`, {
    onReady(dlg) {
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
      const lat = Number(String(fd.get('lat')).replace(',', '.')), lng = Number(String(fd.get('lng')).replace(',', '.'));
      if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error('Ongeldige coördinaten.');
      await store.saveSettings({ lat, lng, radius_m: Number(fd.get('radius_m')), allow_override: fd.get('allow_override') === 'on' });
      toast('Werklocatie opgeslagen'); rerender();
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
    ${e.reason ? `<div class="warnbox">Reden medewerker: ${esc(e.reason)}</div>` : ''}
    <label class="field">Notitie directie<input name="manager_note" value="${esc(e.manager_note || '')}" placeholder="Bijv. vergeten uit te klokken, gecorrigeerd"></label>
    <p class="hint">Laat “Uit” leeg als de medewerker nog aan het werk is. Een eindtijd vóór de begintijd telt als de volgende dag.</p>
    <div class="dlg-foot">${isNew ? '' : '<button class="btn danger" value="delete" formnovalidate>Verwijderen</button>'}<span class="spacer"></span><button type="button" class="btn" data-close>Annuleren</button><button class="btn primary" value="save">Opslaan</button></div>`, {
    async onSubmit(fd, action) {
      if (action === 'delete') { if (!await ask('Deze registratie verwijderen?')) throw 'cancel'; await store.deleteEntry(e.id); toast('Registratie verwijderd'); return rerender(); }
      const d = parse(fd.get('date'));
      const mk = t => { const [h, m] = t.split(':').map(Number); const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
      const cin = mk(fd.get('in'));
      let cout = fd.get('out') ? mk(fd.get('out')) : null;
      if (cout && cout <= cin) cout = new Date(cout.getTime() + 86400000);
      const payload = { clock_in: cin.toISOString(), clock_out: cout ? cout.toISOString() : null, break_minutes: Number(fd.get('break_minutes')) || 0, break_started_at: null, status: cout ? fd.get('status') : 'open', manager_note: fd.get('manager_note').trim() || null };
      if (isNew) payload.employee_id = fd.get('employee_id'); else payload.id = e.id;
      await store.saveEntry(payload); toast('Registratie opgeslagen'); rerender();
    },
  });
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
  const isClean = x => { const sh = matchShift(x, shifts); return !x.flags?.length && sh && Math.abs(entryHours(x) - shiftHours(sh)) <= 0.25; };
  const list = (S.clockFilter === 'check' ? pending : entries.filter(x => x.clock_out)).slice().sort((a, b) => b.clock_in.localeCompare(a.clock_in));

  const entryCard = x => {
    const e = byId[x.employee_id] || { name: '?' };
    const sh = matchShift(x, shifts);
    const h = entryHours(x), diff = sh ? h - shiftHours(sh) : null;
    const flags = (x.flags || []).map(f => `<span class="pill warn">${esc(FLAG[f] || f)}${f.includes('buiten') && (f.startsWith('in') ? x.in_distance_m : x.out_distance_m) ? ` · ${(f.startsWith('in') ? x.in_distance_m : x.out_distance_m)} m` : ''}</span>`).join('');
    return `<article class="card entry">
      <div class="entry-head"><span class="dot" style="background:${esc(e.color || COLORS[0])};margin:0"></span><strong>${esc(e.name)}</strong><span class="muted small">${esc(fmtShort(tDate(x.clock_in)))}</span><span class="status ${x.status === 'approved' ? 'approved' : x.status === 'rejected' ? 'rejected' : 'pending'}">${ESTATUS[x.status]}</span></div>
      <div class="entry-grid">
        <div><small>Gepland</small><b>${sh ? `${hm(sh.start_time)} – ${hm(sh.end_time)}` : '—'}</b><span>${sh ? fmtH(shiftHours(sh)) + ' u' : 'geen dienst'}</span></div>
        <div><small>Gewerkt</small><b>${tHM(x.clock_in)} – ${x.clock_out ? tHM(x.clock_out) : '…'}</b><span>${fmtH(h)} u · ${x.break_minutes || 0} min pauze</span></div>
        <div><small>Verschil</small><b class="${diff == null ? '' : Math.abs(diff) <= 0.25 ? 'pos' : diff > 0 ? 'warnc' : 'neg'}">${diff == null ? '—' : fmtDiff(diff)}</b><span>${diff == null ? '' : Math.abs(diff) <= 0.25 ? 'volgens planning' : diff > 0 ? 'langer gewerkt' : 'korter gewerkt'}</span></div>
      </div>
      ${flags || x.edited ? `<div class="entry-flags">${flags}${x.edited ? '<span class="pill">aangepast</span>' : ''}</div>` : ''}
      ${x.reason ? `<p class="note">“${esc(x.reason)}”</p>` : ''}${x.manager_note ? `<p class="reply"><strong>Notitie:</strong> ${esc(x.manager_note)}</p>` : ''}
      <div class="req-actions">${x.status === 'pending' ? `<button class="btn sm ok" data-eok="${x.id}">Goedkeuren</button>` : ''}<button class="btn sm" data-eedit="${x.id}">Aanpassen</button>${x.status === 'pending' ? `<button class="btn sm danger" data-eno="${x.id}">Afkeuren</button>` : ''}</div>
    </article>`;
  };

  el.innerHTML = `
    <div class="page-head"><div><h1>Klokken</h1><p>Wie is er aan het werk, en gewerkte uren controleren.</p></div>
      <div class="actions"><button class="btn" data-settings>📍 Werklocatie</button><button class="btn" data-newentry>+ Registratie</button></div></div>
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
    const okB = ev.target.closest('[data-eok]'); if (okB) { const x = all.find(y => y.id === okB.dataset.eok); await store.setEntryStatus(x.id, 'approved'); toast('Goedgekeurd'); return rerender(); }
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
    let recovery = /type=recovery/.test(location.hash);
    store.sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') { recovery = true; renderNewPassword(); } });
    if (recovery) { await store.sb.auth.getSession(); return renderNewPassword(); }
  }
  try { handleSession(await store.init()); } catch (e) { console.error(e); renderAuth('login', `<div class="msg err">${esc(errMsg(e))}</div>`); }
}

window.addEventListener('hashchange', () => { if (store && !S.me && store.demo) renderAuth(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* ignore */ }
}
boot();
})();
