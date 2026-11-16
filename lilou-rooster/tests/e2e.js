// Browsertests voor de rooster-app (demo-modus). Draai met: node tests/e2e.js
// Start een eigen webserver, doorloopt de belangrijkste stromen als medewerker en directie
// en stopt met een foutcode zodra iets niet klopt.
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  // Tests draaien altijd in demo-modus: nooit tegen de echte database
  if (p.endsWith('config.js')) {
    res.writeHead(200, { 'content-type': 'text/javascript' });
    return res.end(fs.readFileSync(p, 'utf8').replace(/supabaseUrl: '[^']*'/, "supabaseUrl: ''").replace(/supabaseAnonKey: '[^']*'/, "supabaseAnonKey: ''"));
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

let passed = 0;
const errors = [];
const pages = [];
const SHOTS = process.env.E2E_SHOTS;   // map voor schermafbeeldingen bij fouten (optioneel)
async function test(name, fn) {
  if (process.env.ONLY && !process.env.ONLY.split('|').some(o => name.includes(o))) return;
  try { await fn(); passed++; console.log('  ok  ' + name); }
  catch (e) {
    console.log('  FOUT ' + name + '\n       ' + e.message.split('\n')[0]); process.exitCode = 1;
    if (SHOTS) for (const [i, p] of pages.entries()) await p.screenshot({ path: path.join(SHOTS, `fout-${passed}-${i}.png`) }).catch(() => {});
    // open vensters sluiten zodat volgende tests niet blokkeren
    for (const p of pages) await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())).catch(() => {});
  }
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const watch = p => { p.on('pageerror', e => errors.push(e.message)); pages.push(p); return p; };
  const fresh = async (page, hash) => { await page.goto(URL + hash); await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await page.reload(); await page.waitForSelector('[data-demo]'); };
  // tabblad openen; op de telefoon staan sommige tabbladen onder 'Meer'
  const tab = async (page, t) => { const b = await page.$(`[data-tab=${t}]`); if (b && await b.isVisible()) return b.click(); await page.click('[data-more]'); await page.click(`dialog.moresheet [data-mgo=${t}]`); };
  const login = async (page, name) => { await page.click(`[data-demo]:has-text("${name}")`); await page.waitForSelector('#view > *', { state: 'attached' }); await page.waitForTimeout(200); };
  const logout = async (page, hash) => { await page.click('[data-logout]'); await page.goto(URL + hash); await page.waitForSelector('[data-demo]'); };
  const noViewError = async page => assert.ok(!(await page.$('#view .msg.err')), 'foutmelding op de pagina: ' + (await page.$eval('#view .msg.err', e => e.textContent).catch(() => '')));
  const demoDb = page => page.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('lilou-rooster-demo-')); return { k, db: JSON.parse(localStorage.getItem(k)) }; });
  const setDemoDb = (page, fn, arg) => page.evaluate(([src, a]) => {
    const k = Object.keys(localStorage).find(x => x.startsWith('lilou-rooster-demo-')); const db = JSON.parse(localStorage.getItem(k));
    new Function('db', 'a', src)(db, a); localStorage.setItem(k, JSON.stringify(db));
  }, [fn, arg]);
  const pad = n => String(n).padStart(2, '0');

  console.log('Inloggen');
  const desk = watch(await browser.newPage({ viewport: { width: 1360, height: 900 } }));
  await test('directielink toont alleen directie', async () => {
    await fresh(desk, '#directie');
    const names = await desk.$$eval('[data-demo]', x => x.map(b => b.textContent));
    assert.ok(names.length === 2 && names.every(n => /leidinggevende/.test(n)), names.join(','));
  });
  await test('personeelslink toont alleen medewerkers', async () => {
    await fresh(desk, '#personeel');
    const names = await desk.$$eval('[data-demo]', x => x.map(b => b.textContent));
    assert.ok(names.length >= 4 && names.every(n => !/leidinggevende/.test(n)), names.join(','));
  });

  await test('inlogscherm schuift niet zijwaarts op smalle telefoons (320–390 px)', async () => {
    for (const w of [320, 375, 390]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 760 }, isMobile: true, hasTouch: true });
      const p = await ctx.newPage();
      for (const h of ['#directie', '#personeel', '']) {
        await p.goto(URL + h); await p.waitForSelector('[data-demo]');
        const bad = await p.evaluate(() => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll('.auth *')].filter(el => el.getBoundingClientRect().right > W + 1).map(el => el.className).slice(0, 3); });
        assert.deepStrictEqual(bad, [], `${w}px ${h || 'alles'}: te breed: ${bad.join(', ')}`);
      }
      await ctx.close();
    }
  });

  await test('invulvelden op de telefoon minimaal 16px (anders zoomt de iPhone in en schuift het beeld)', async () => {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] }); const p = watch(await ctx.newPage());
    await fresh(p, '#personeel'); await login(p, 'Sanne');
    const small = [];
    for (const t of ['mijn', 'diensten', 'beschikbaar', 'aanvragen']) {
      await tab(p, t); await p.waitForTimeout(150);
      small.push(...await p.$$eval('input:not([type=checkbox]):not([type=radio]), select, textarea', els => els.filter(e => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => (e.name || e.className || e.tagName))));
    }
    await ctx.close();
    assert.deepStrictEqual([...new Set(small)], [], 'te kleine invulvelden');
  });

  console.log('Alle schermen laden');
  await test('directie: alle tabbladen zonder fouten', async () => {
    await fresh(desk, '#directie'); await login(desk, 'Mark');
    for (const t of ['planning', 'klokken', 'aanvragen', 'team', 'uren']) { await tab(desk, t); await desk.waitForTimeout(150); await noViewError(desk); }
    for (const rt of ['verlof', 'ruilen', 'open', 'beschikbaar']) { await tab(desk, 'aanvragen'); await desk.click(`[data-rt=${rt}]`); await desk.waitForTimeout(150); await noViewError(desk); }
  });
  const mob = watch(await (await browser.newContext({ ...devices['iPhone 13'] })).newPage());
  await test('medewerker (mobiel): alle tabbladen zonder fouten en zonder horizontaal scrollen', async () => {
    await fresh(mob, '#personeel'); await login(mob, 'Sanne');
    for (const t of ['mijn', 'planning', 'diensten', 'beschikbaar', 'aanvragen']) {
      await tab(mob, t); await mob.waitForTimeout(150); await noViewError(mob);
      assert.ok(await mob.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontaal scrollen op ' + t);
    }
  });

  console.log('Klokken');
  await test('inklokken via wifi, uitklokken via gps', async () => {
    await tab(mob, 'mijn'); await mob.click('[data-demoloc=wifi]'); await mob.click('[data-clock=in]'); await mob.waitForSelector('[data-clock=uit]');
    await mob.click('[data-demoloc=op]'); await mob.waitForSelector('[data-clock=uit]'); await mob.click('[data-clock=uit]');
    // na het einde van de demodienst vraagt de app terecht naar overuren: 'Nee' is al gekozen
    await mob.waitForSelector('[data-clock=in], dialog[open]:has-text("Heb je langer gewerkt")');
    if (await mob.$('dialog[open]:has-text("Heb je langer gewerkt")')) await mob.click('dialog[open] button[value=save]');
    await mob.waitForSelector('[data-clock=in]');
  });
  await test('thuis inklokken vraagt om een reden', async () => {
    await mob.click('[data-demoloc=buiten]'); await mob.waitForSelector('[data-clock=in]'); await mob.click('[data-clock=in]');
    await mob.waitForSelector('dialog textarea[name=reason]'); await mob.click('dialog [data-close]');
  });
  await test('na einde dienst uitklokken vraagt naar overuren; telt mee tot einde dienst', async () => {
    await setDemoDb(mob, `
      const e = db.employees.find(x => x.name.startsWith('Sanne')); const now = new Date(), st = new Date(now - 150*60000), en = new Date(now - 30*60000);
      const p = n => String(n).padStart(2,'0'), hm = d => p(d.getHours())+':'+p(d.getMinutes()), ds = st.getFullYear()+'-'+p(st.getMonth()+1)+'-'+p(st.getDate());
      db.shifts = db.shifts.filter(s => !(s.employee_id === e.id && s.date === ds));
      db.shifts.push({ id: 't-shift', employee_id: e.id, date: ds, start_time: hm(st), end_time: hm(en), break_minutes: 0, position: 'Bediening', note: '', published: true });
      db.entries = db.entries.filter(x => !(x.employee_id === e.id && !x.clock_out));
      db.entries.push({ id: 't-entry', employee_id: e.id, clock_in: new Date(now - 160*60000).toISOString(), clock_out: null, break_minutes: 0, break_started_at: null, flags: [], status: 'open', edited: false });`);
    await mob.reload(); await mob.waitForSelector('[data-clock=uit]'); await mob.click('[data-demoloc=wifi]'); await mob.waitForSelector('[data-clock=uit]');
    await mob.click('[data-clock=uit]'); await mob.waitForSelector('.otchoice'); await mob.click('dialog button[value=save]'); await mob.waitForSelector('[data-clock=in]');
    const { db } = await demoDb(mob); const x = db.entries.find(e => e.id === 't-entry');
    assert.ok(x.clock_out && !x.overtime_status, 'geen overuren-aanvraag bij "nee"');
  });
  await test('vergeten uit te klokken: automatisch uitgeklokt + melding', async () => {
    await setDemoDb(mob, `
      const e = db.employees.find(x => x.name.startsWith('Sanne')); const now = new Date(), st = new Date(now - 300*60000), en = new Date(now - 120*60000);
      const p = n => String(n).padStart(2,'0'), hm = d => p(d.getHours())+':'+p(d.getMinutes()), ds = st.getFullYear()+'-'+p(st.getMonth()+1)+'-'+p(st.getDate());
      db.shifts = db.shifts.filter(s => s.id !== 't-shift'); db.entries = db.entries.filter(x => x.id !== 't-entry');
      db.shifts.push({ id: 't-shift2', employee_id: e.id, date: ds, start_time: hm(st), end_time: hm(en), break_minutes: 0, position: 'Bediening', note: '', published: true });
      db.entries.push({ id: 't-entry2', employee_id: e.id, clock_in: st.toISOString(), clock_out: null, break_minutes: 0, break_started_at: null, flags: [], status: 'open', edited: false });`);
    await mob.reload(); await mob.waitForSelector('[data-clockcard]');
    const { db } = await demoDb(mob); const x = db.entries.find(e => e.id === 't-entry2');
    assert.ok(x.clock_out && x.flags.includes('auto_uit'), 'niet automatisch uitgeklokt');
    assert.ok(db.notifications.some(n => n.title === 'Automatisch uitgeklokt'), 'geen melding');
  });

  console.log('Ruilen, open diensten, beschikbaarheid');
  await test('lopend ruilverzoek: dienst niet opnieuw te kiezen; dubbelklik maakt één verzoek', async () => {
    // zorg dat Daan altijd een komende dienst heeft, welke dag of tijd het ook is
    await setDemoDb(mob, `const d = db.employees.find(e => e.name.startsWith('Daan')); const t = new Date(Date.now() + 2 * 864e5);
      db.shifts.push({ id: 'test-daan-' + Date.now(), employee_id: d.id, date: t.toISOString().slice(0, 10), start_time: '17:00', end_time: '23:00', break_minutes: 30, position: 'Bar', note: '', published: true });`);
    await mob.reload(); await mob.waitForSelector('[data-clockcard], [data-demo]');
    await logout(mob, '#personeel'); await login(mob, 'Daan');
    await tab(mob, 'diensten'); await mob.click('[data-newswap]'); await mob.waitForSelector('dialog [name=shift_id]');
    const disabled = await mob.$$eval('dialog [name=shift_id] option[disabled]', o => o.length);
    assert.ok(disabled >= 1, 'bezette dienst niet uitgeschakeld');
    const before = (await demoDb(mob)).db.swaps.length;
    await mob.dblclick('dialog button[value=save]'); await mob.waitForTimeout(400);
    assert.strictEqual((await demoDb(mob)).db.swaps.length, before + 1);
  });
  await test('aanmelden voor open dienst', async () => {
    await logout(mob, '#personeel'); await login(mob, 'Noor');
    await tab(mob, 'diensten'); await mob.click('[data-apply] >> nth=0'); await mob.waitForSelector('[data-withdraw]');
  });
  await test('beschikbaarheid opslaan', async () => {
    await tab(mob, 'beschikbaar'); await mob.click('[data-fill=hele_dag]'); await mob.click('#avform button.primary'); await mob.waitForTimeout(200);
    assert.match(await mob.textContent('.avfoot .hint'), /7 van 7/);
  });
  await test('verlof aanvragen', async () => {
    await tab(mob, 'aanvragen');
    await mob.click('#reqform button'); await mob.waitForTimeout(200);
    assert.ok(!(await mob.$('[data-del]')), 'zonder datum mag er geen aanvraag verstuurd worden');
    const d = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    await mob.fill('#reqform [name=start_date]', d); await mob.fill('#reqform [name=end_date]', d);
    await mob.click('#reqform button'); await mob.waitForTimeout(200);
    assert.ok(await mob.$('[data-del]'));
  });
  await test('ziek melden via de knop "Ik ben ziek"', async () => {
    await tab(mob, 'mijn'); await mob.click('[data-sick]'); await mob.waitForSelector('dialog .warnbox:has-text("Eerst bellen")');
    const before = (await demoDb(mob)).db.requests.filter(r => r.type === 'ziek').length;
    await mob.click('dialog button[value=save]'); await mob.waitForSelector('.toast:has-text("Ziekmelding verstuurd")');
    const { db } = await demoDb(mob);
    assert.strictEqual(db.requests.filter(r => r.type === 'ziek').length, before + 1);
    assert.ok(db.notifications.some(n => /Ziekmelding/.test(n.title || '') && /ziek gemeld/.test(n.body || '')), 'directie krijgt geen duidelijke ziekmelding');
  });

  console.log('Directie');
  const shared = watch(await browser.newPage({ viewport: { width: 1360, height: 900 } }));
  await test('ruil goedkeuren past rooster aan', async () => {
    await fresh(shared, '#personeel'); await login(shared, 'Sanne');
    await tab(shared, 'diensten'); await shared.click('[data-accept] >> nth=0'); await shared.click('dialog button[value=save]'); await shared.waitForTimeout(200);
    await logout(shared, '#directie'); await login(shared, 'Mariska');
    await tab(shared, 'aanvragen'); await shared.click('[data-rt=ruilen]'); await shared.waitForSelector('[data-swok]');
    const { db: before } = await demoDb(shared); const w = before.swaps.find(x => x.status === 'accepted');
    await shared.click('[data-swok]'); await shared.waitForTimeout(300);
    const { db } = await demoDb(shared);
    assert.strictEqual(db.shifts.find(s => s.id === w.shift_id).employee_id, w.taken_by);
  });
  await test('verlof goedkeuren schrijft uren af van het saldo', async () => {
    await shared.click('[data-rt=verlof]'); await shared.click('article.req:has-text("Vakantie") [data-ok]'); await shared.waitForSelector('dialog [name=hours]');
    const hours = Number(await shared.inputValue('dialog [name=hours]')); assert.ok(hours > 0, 'geen urenvoorstel');
    await shared.click('dialog button[value=save]'); await shared.waitForTimeout(300);
    const { db } = await demoDb(shared); assert.ok(db.requests.some(r => r.status === 'approved' && Number(r.leave_hours) === hours));
  });
  await test('verlof goedkeuren met ingeplande dienst: wordt een open dienst', async () => {
    const ds = await shared.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 30); const p = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); });
    await setDemoDb(shared, `const e = db.employees.find(x => x.name === 'Mehmet Yilmaz');
      db.shifts.push({ id: 'vk1', employee_id: e.id, date: a, start_time: '12:00', end_time: '20:00', break_minutes: 30, position: 'Keuken', note: '', published: true });
      db.requests.push({ id: 'rq-vk1', employee_id: e.id, type: 'vrij', start_date: a, end_date: a, note: '', status: 'pending', created_at: new Date().toISOString() });`, ds);
    await shared.reload(); await shared.waitForSelector('[data-tab=aanvragen]'); await tab(shared, 'aanvragen');
    await shared.click('[data-rt=verlof]'); await shared.click('[data-ok="rq-vk1"]'); await shared.waitForSelector('dialog [name=conflict][value=open]');
    assert.ok(await shared.isChecked('dialog [name=conflict][value=open]'), 'open dienst is niet de standaardkeuze');
    await shared.click('dialog button[value=save]'); await shared.waitForSelector('.toast:has-text("open dienst")');
    const { db } = await demoDb(shared);
    assert.equal(db.shifts.find(s => s.id === 'vk1').employee_id, null, 'dienst is niet open gemaakt');
    assert.equal(db.requests.find(r => r.id === 'rq-vk1').status, 'approved');
  });
  await test('Arbeidstijdenwet: nachtdienst van 17-jarige gemarkeerd', async () => {
    await tab(shared, 'planning'); await shared.waitForSelector('table.grid');
    const t = await shared.$eval('.chip.atw', e => e.title); assert.match(t, /17-jarigen/);
  });
  await test('loonkosten in uren en export per functie', async () => {
    await tab(shared, 'uren'); await shared.waitForSelector('.exports');
    assert.match(await shared.textContent('table.list tfoot'), /€/);
    const rows = await shared.evaluate(() => document.querySelector('[data-csv=kosten]') !== null); assert.ok(rows);
  });
  await test('export levert een echt CSV-bestand op (urenoverzicht en loonkosten)', async () => {
    const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1360, height: 900 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark'); await tab(p, 'uren'); await p.waitForSelector('.exports');
    for (const [k, header] of [['payroll', 'Gewerkte uren (netto)'], ['kosten', 'Kostenplaats (functie)'], ['klok', 'Telt mee (u)']]) {
      const [dl] = await Promise.all([p.waitForEvent('download'), p.click(`[data-csv=${k}]`)]);
      const txt = fs.readFileSync(await dl.path(), 'utf8');
      assert.ok(txt.includes(header), `${k}: kolom "${header}" ontbreekt`);
      assert.ok(txt.split('\n').length > 1, `${k}: geen regels`);
    }
    await ctx.close();
  });
  await test('in een voorbeeldweergave (zoals de demo) geen valse download-melding, wel een voorbeeld', async () => {
    const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    await p.setContent(`<iframe src="${URL}#directie" sandbox="allow-scripts allow-same-origin allow-forms allow-modals" style="width:1360px;height:950px;border:0"></iframe>`);
    let downloaded = false; p.on('download', () => (downloaded = true));
    const f = await (await p.waitForSelector('iframe')).contentFrame();
    await f.waitForSelector('[data-demo]'); await f.click('[data-demo]:has-text("Mark")'); await f.waitForSelector('#view > *', { state: 'attached' });
    await tab(f, 'uren'); await f.waitForSelector('.exports'); await f.click('[data-csv=payroll]');
    await f.waitForSelector('dialog .exportprev');
    assert.ok(!(await f.$('.toast:has-text("gedownload")')), 'valse melding "gedownload"');
    assert.ok(!downloaded);
    await p.close();
  });
  await test('klokregistratie aanpassen komt in de geschiedenis', async () => {
    // zorg voor een afgeronde registratie van vandaag (op maandagochtend is er anders nog niets)
    await setDemoDb(shared, `const e = db.employees.find(x => x.name.startsWith('Sanne')); const now = Date.now();
      db.entries.push({ id: 't-clk', employee_id: e.id, clock_in: new Date(now - 3 * 3600e3).toISOString(), clock_out: new Date(now - 2 * 3600e3).toISOString(), break_minutes: 0, break_started_at: null, flags: [], status: 'pending', edited: false });`);
    await shared.reload(); await shared.waitForSelector('[data-tab=klokken]');
    await tab(shared, 'klokken'); await shared.click('[data-cf=all]');
    for (let i = 0; i < 2 && !(await shared.waitForSelector('article.entry [data-eedit]', { timeout: 1500 }).catch(() => null)); i++) { await shared.click('[data-act=prev]'); }
    await shared.click('article.entry [data-eedit] >> nth=0');
    await shared.waitForSelector('dialog [name=break_minutes]'); await shared.fill('dialog [name=manager_note]', 'Testnotitie'); await shared.click('dialog button[value=save]'); await shared.waitForTimeout(200);
    await shared.click('article.entry:has-text("Testnotitie") [data-eedit]'); await shared.click('dialog [data-history] summary'); await shared.waitForSelector('dialog .auditlist');
    assert.match(await shared.textContent('dialog .auditlist'), /Testnotitie/);
  });
  await test('nieuwe medewerker: uitnodiging wordt meteen verstuurd en status zichtbaar', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await tab(shared, 'team'); await shared.click('[data-new]'); await shared.waitForSelector('dialog [name=send_invite]');
    assert.ok(await shared.isChecked('dialog [name=send_invite]'), 'vinkje uitnodigen staat niet standaard aan');
    await shared.fill('dialog [name=name]', 'Lisa de Jong'); await shared.fill('dialog [name=email]', 'lisa@voorbeeld.nl');
    await shared.click('dialog button[value=save]'); await shared.waitForTimeout(300);
    assert.match(await shared.textContent('tr:has-text("Lisa de Jong")'), /uitgenodigd/);
    await shared.click('tr:has-text("Lisa de Jong")'); await shared.waitForSelector('dialog [data-sendinvite]');
    assert.match(await shared.textContent('dialog [data-sendinvite]'), /opnieuw/);
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  });
  await test('publiceren meldt dat medewerkers hun rooster per mail krijgen', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await tab(shared, 'planning'); await shared.click('[data-act=next]'); await shared.waitForTimeout(200);
    await shared.click('td.cell.editable >> nth=0'); await shared.waitForSelector('dialog [name=start_time]');
    await shared.click('dialog button[value=save]');
    // na inplannen vraagt de app meteen of de week gepubliceerd moet worden
    await shared.waitForSelector('dialog[open]:has-text("Nu publiceren?")'); await shared.click('dialog[open] button[value=save]');
    await shared.waitForSelector('.toast:has-text("per mail")');
    await shared.click('[data-act=today]');
  });
  await test('alles publiceren: concepten in meerdere weken in één keer', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await tab(shared, 'planning'); await shared.click('[data-act=today]');
    for (const wk of [2, 3]) {
      await setDemoDb(shared, `const m=new Date(); m.setDate(m.getDate()-((m.getDay()+6)%7)+7*a); const p=x=>String(x).padStart(2,'0'); const d=m.getFullYear()+'-'+p(m.getMonth()+1)+'-'+p(m.getDate());
        db.shifts.push({ id: 'pa'+a, employee_id: db.employees[2].id, date: d, start_time: '12:00', end_time: '18:00', break_minutes: 0, position: 'Bediening', note: '', published: false });`, wk);
    }
    await shared.reload(); await shared.waitForSelector('[data-tab=planning]'); await tab(shared, 'planning');
    await shared.waitForSelector('[data-act=publishall]'); await shared.click('[data-act=publishall]'); await shared.click('dialog[open] button[value=save]');
    await shared.waitForSelector('.toast:has-text("gepubliceerd")');
    const left = await shared.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('lilou-rooster-demo-')); return JSON.parse(localStorage.getItem(k)).shifts.filter(s => s.id.startsWith('pa') && !s.published).length; });
    assert.equal(left, 0);
    assert.ok(!(await shared.$('[data-act=publishall]')), 'balk verdwijnt na publiceren');
  });
  await test('instellingen: functie en snelkeuze-dienst toevoegen werkt door in het inplanvenster', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await shared.click('[data-gosettings]'); await shared.waitForSelector('[data-posadd]'); await shared.evaluate(() => document.querySelectorAll('details.setsec').forEach(d => (d.open = true)));
    await shared.fill('[data-posadd] [name=pos]', 'Runner'); await shared.click('[data-posadd] button'); await shared.waitForSelector('.posrow:has-text("Runner")');
    await shared.click('[data-tpladd]'); await shared.fill('.tplrow >> nth=-1 >> [name=label]', 'Brunch'); await shared.fill('.tplrow >> nth=-1 >> [name=start]', '10:00'); await shared.fill('.tplrow >> nth=-1 >> [name=end]', '15:00');
    await shared.click('[data-tplform] button.primary'); await shared.waitForSelector('.toast:has-text("Snelkeuze")');
    await tab(shared, 'planning'); await shared.click('td.cell.editable >> nth=0'); await shared.waitForSelector('dialog [name=position]');
    assert.ok((await shared.$$eval('dialog [name=position] option', o => o.map(x => x.textContent))).includes('Runner'), 'nieuwe functie staat niet in de lijst');
    await shared.waitForSelector('dialog .tpl:has-text("Brunch")');
    await shared.click('dialog .tpl:has-text("Brunch")'); assert.equal(await shared.inputValue('dialog [name=start_time]'), '10:00');
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  });
  await test('bezetting: norm per weekdag en gasten tonen tekort per functie', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await shared.click('[data-gosettings]'); await shared.waitForSelector('[data-staffform]'); await shared.evaluate(() => document.querySelectorAll('details.setsec').forEach(d => (d.open = true)));
    for (let wd = 0; wd < 7; wd++) await shared.fill(`[data-staff="${wd}"][data-pos="Afwas"]`, '1');
    await shared.fill('[data-ratio="Bediening"]', '20');
    await shared.click('[data-staffform] button.primary'); await shared.waitForSelector('.toast:has-text("Bezetting opgeslagen")');
    await tab(shared, 'planning'); await shared.waitForSelector('.covrow');
    assert.ok(await shared.$('.covrow .covp.short:has-text("Afwas 0/1")'), 'tekort afwas niet zichtbaar');
    await shared.fill('.covrow [data-guests] >> nth=0', '100'); await shared.press('.covrow [data-guests] >> nth=0', 'Tab');
    await shared.waitForSelector('.covrow .covp:has-text("/5")');
  });
  await test('gesloten dag: zichtbaar in de planning en waarschuwing bij een dienst', async () => {
    await shared.click('[data-gosettings]'); await shared.waitForSelector('[data-dayform]'); await shared.evaluate(() => document.querySelectorAll('details.setsec').forEach(d => (d.open = true)));
    const ds = await shared.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 2); const p = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); });
    await shared.click('[data-dayadd]'); await shared.fill('.spdrow >> nth=-1 >> [name=date]', ds); await shared.fill('.spdrow >> nth=-1 >> [name=label]', 'Personeelsuitje');
    await shared.click('[data-dayform] button.primary'); await shared.waitForSelector('.toast:has-text("Dagen opgeslagen")');
    await tab(shared, 'planning'); await shared.click('[data-act=today]'); await shared.waitForSelector('.covp.closed:has-text("Personeelsuitje")');
    await setDemoDb(shared, `const e = db.employees.find(x => x.name === 'Lisa de Jong') || db.employees[2]; db.shifts.push({ id: 'dicht1', employee_id: e.id, date: a, start_time: '12:00', end_time: '18:00', break_minutes: 0, position: 'Bediening', note: '', published: false });`, ds);
    await shared.reload(); await shared.waitForSelector('[data-tab=planning]'); await tab(shared, 'planning');
    await shared.waitForSelector('[data-shift="dicht1"].atw');
    assert.match(await shared.getAttribute('[data-shift="dicht1"]', 'title'), /gesloten/);
  });
  await test('hele week gesloten: één keer instellen, melding in planning en rooster van iedereen', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    await p.click('[data-gosettings]'); await p.waitForSelector('[data-periodform]', { state: 'attached' }); await p.evaluate(() => document.querySelectorAll('details.setsec').forEach(d => (d.open = true)));
    const ds = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 23); const q = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + q(d.getMonth() + 1) + '-' + q(d.getDate()); });
    await p.fill('[name=pfrom]', ds); await p.click('[data-pweek]'); await p.fill('[name=plabel]', 'Zomervakantie');
    await p.click('[data-periodform] button.primary'); await p.waitForSelector('.toast:has-text("gesloten gezet")');
    let { db } = await demoDb(p);
    const closed = db.settings.special_days.filter(d => d.label === 'Zomervakantie');
    assert.strictEqual(closed.length, 7, 'niet 7 dagen gesloten');
    assert.strictEqual(new Date(closed[0].date + 'T12:00').getDay(), 1, 'week begint niet op maandag');
    await p.waitForSelector('.spdrange:has-text("Zomervakantie")');
    await tab(p, 'planning'); await p.click('[data-act=today]');
    for (let i = 0; i < 4 && !(await p.$('.closedbar:has-text("Zomervakantie")')); i++) { await p.click('[data-act=next]'); await p.waitForTimeout(250); }
    await p.waitForSelector('.closedbar:has-text("Zomervakantie")');
    if (await p.$('th.closedday')) assert.strictEqual(await p.$$eval('th.closedday', x => x.length), 7);
    const s2 = watch(await ctx.newPage()); await s2.setViewportSize({ width: 390, height: 844 });
    await s2.goto(URL + '#personeel'); await s2.waitForSelector('[data-demo]'); await login(s2, 'Sanne');
    await s2.waitForSelector('.closednote:has-text("Zomervakantie")');   // startscherm: melding gesloten
    await s2.click('[data-allweeks]');
    for (let i = 0; i < 6 && !(await s2.$('.daylist li.weekclosed:has-text("Zomervakantie")')); i++) { await s2.click('[data-w="1"]'); await s2.waitForTimeout(200); }
    await s2.waitForSelector('.daylist li.weekclosed:has-text("Zomervakantie")');
    await tab(s2, 'planning'); await s2.click('[data-act=today]');
    for (let i = 0; i < 4 && !(await s2.$('.closedbar:has-text("Zomervakantie")')); i++) { await s2.click('[data-act=next]'); await s2.waitForTimeout(250); }
    await s2.waitForSelector('.closedbar:has-text("Zomervakantie")');
    // periode weer weghalen
    await p.click('[data-gosettings]'); await p.waitForSelector('.spdrange', { state: 'attached' }); await p.evaluate(() => document.querySelectorAll('details.setsec').forEach(d => (d.open = true)));
    await p.click('.spdrange:has-text("Zomervakantie") [data-spddel]'); await p.click('[data-dayform] button.primary'); await p.waitForSelector('.toast:has-text("Dagen opgeslagen")');
    ({ db } = await demoDb(p));
    assert.ok(!db.settings.special_days.some(d => d.label === 'Zomervakantie'), 'periode niet verwijderd');
    await ctx.close(); pages.splice(pages.indexOf(p), 1); pages.splice(pages.indexOf(s2), 1);
  });
  await test('contracttype oproep: waarschuwing bij oproep korter dan 3 uur', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await tab(shared, 'team'); await shared.click('tr:has-text("Eva Smit")'); await shared.waitForSelector('dialog [name=contract_type]');
    await shared.selectOption('dialog [name=contract_type]', 'oproep');
    assert.ok(await shared.isHidden('dialog [data-minrow]'), 'minimum-veld hoort verborgen bij oproep');
    await shared.click('dialog button[value=save]'); await shared.waitForSelector('tr:has-text("Eva Smit"):has-text("Oproep")');
    const ds = await shared.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 14); const p = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); });
    await setDemoDb(shared, `const e = db.employees.find(x => x.name === 'Eva Smit'); db.shifts.push({ id: 'kort1', employee_id: e.id, date: a, start_time: '12:00', end_time: '14:00', break_minutes: 0, position: 'Bediening', note: '', published: false });`, ds);
    await shared.reload(); await shared.waitForSelector('[data-tab=planning]'); await tab(shared, 'planning');
    await shared.click('[data-act=next]'); await shared.click('[data-act=next]');
    await shared.waitForSelector('[data-shift="kort1"].atw');
    assert.match(await shared.getAttribute('[data-shift="kort1"]', 'title'), /minimaal 3 uur/);
  });
  await test('shiftleader: plant en publiceert, maar ziet geen lonen, team of uren', async () => {
    await setDemoDb(shared, `db.employees.find(x => x.name === 'Daan Jansen').role = 'planner';`);
    const p = watch(await browser.newPage({ viewport: { width: 1360, height: 900 } }));
    await p.goto(URL + '#personeel'); await p.waitForSelector('[data-demo]');
    await p.evaluate(s => localStorage.setItem(s.k, JSON.stringify(s.db)), await demoDb(shared));
    await p.reload(); await p.waitForSelector('[data-demo]'); await login(p, 'Daan');
    const tabs = await p.$$eval('[data-tab]', a => a.map(x => x.dataset.tab));
    assert.ok(!tabs.includes('uren') && !tabs.includes('team') && !tabs.includes('klokken'), 'shiftleader ziet directietabs: ' + tabs.join(','));
    assert.ok(!(await p.$('[data-gosettings]')), 'shiftleader ziet instellingen');
    await tab(p, 'planning'); await p.waitForSelector('[data-act=publish], .pubstate');
    assert.ok(!(await p.$('.cost')), 'shiftleader ziet loonkosten');
    await p.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('lijstweergave en meerdere diensten tegelijk verwijderen', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await tab(shared, 'planning'); await shared.click('[data-act=today]');
    await shared.click('[data-pv=list]'); await shared.waitForSelector('.pday .prow');
    const before = (await demoDb(shared)).db.shifts.length;
    await shared.click('[data-selmode]'); await shared.waitForSelector('.selbar');
    const ids = await shared.$$eval('.prow[data-shift]', a => a.slice(0, 2).map(x => x.dataset.shift));
    for (const id of ids) await shared.click(`.prow[data-shift="${id}"]`);
    assert.match(await shared.textContent('[data-selcount]'), /^2 geselecteerd/);
    await shared.click('[data-seldel]'); await shared.click('dialog[open] button[value=save]');
    await shared.waitForSelector('.toast:has-text("2 diensten verwijderd")');
    const after = (await demoDb(shared)).db;
    assert.equal(after.shifts.length, before - 2); assert.ok(!after.shifts.some(s => ids.includes(s.id)));
    assert.ok(!(await shared.$('.selbar')), 'selecteermodus blijft aan na verwijderen');
    await shared.click('[data-pv=grid]'); await shared.waitForSelector('table.grid');
  });
  await test('uit dienst zetten: komende diensten worden open diensten', async () => {
    const ds = await shared.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 9); const p = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); });
    await setDemoDb(shared, `const e = db.employees.find(x => x.name === 'Lisa de Jong'); db.shifts.push({ id: 'uit1', employee_id: e.id, date: a, start_time: '12:00', end_time: '18:00', break_minutes: 0, position: 'Bediening', note: '', published: true });`, ds);
    await shared.reload(); await shared.waitForSelector('[data-tab=team]'); await tab(shared, 'team');
    await shared.click('tr:has-text("Lisa de Jong")'); await shared.waitForSelector('dialog [name=active]');
    await shared.uncheck('dialog [name=active]'); await shared.click('dialog button[value=save]');
    await shared.waitForSelector('dialog[open] [name=conflict][value=open]'); await shared.click('dialog[open] button[value=save]');
    await shared.waitForSelector('.toast:has-text("open dienst")');
    assert.equal((await demoDb(shared)).db.shifts.find(s => s.id === 'uit1').employee_id, null);
  });
  await test('nieuwe dienst: andere datum kiezen wordt ook echt opgeslagen', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await tab(shared, 'planning'); await shared.click('[data-act=today]'); await shared.click('[data-pv=grid]').catch(() => {});
    await shared.click('[data-act=next]'); await shared.click('[data-act=next]'); await shared.click('[data-act=next]');
    await shared.click('td.cell.editable >> nth=-1', { position: { x: 20, y: 40 } }); await shared.waitForSelector('dialog [name=date]');
    const d0 = await shared.inputValue('dialog [name=date]');
    const p = x => String(x).padStart(2, '0'); const dt = new Date(d0 + 'T12:00:00'); dt.setDate(dt.getDate() + (dt.getDay() === 0 ? -1 : 1));
    const d1 = dt.getFullYear() + '-' + p(dt.getMonth() + 1) + '-' + p(dt.getDate());
    await shared.fill('dialog [name=date]', d1); await shared.dispatchEvent('dialog [name=date]', 'change');
    const before = (await demoDb(shared)).db.shifts.length;
    await shared.click('dialog button[value=save]');
    if (await shared.waitForSelector('dialog[open]:has-text("vrije dag")', { timeout: 1000 }).catch(() => null)) await shared.click('dialog[open]:has-text("vrije dag") button[value=save]');
    await shared.waitForTimeout(400);
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    const after = (await demoDb(shared)).db.shifts;
    assert.equal(after.length, before + 1, 'niet precies één dienst toegevoegd');
    assert.equal(after[after.length - 1].date, d1, 'dienst staat op de oude datum');
  });
  await test('kopieer vorige week slaat uit dienst en goedgekeurd verlof over', async () => {
    await setDemoDb(shared, `const m=new Date(); m.setDate(m.getDate()-((m.getDay()+6)%7)+7*5); const p=x=>String(x).padStart(2,'0'); const f=d=>d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
      const d1=f(m), m2=new Date(m); m2.setDate(m2.getDate()+8); const d2=f(m2);
      const ina = db.employees.find(x => x.name === 'Lisa de Jong'); ina.active = false;
      const eva = db.employees.find(x => x.name === 'Eva Smit');
      db.shifts = db.shifts.filter(s => !(s.date >= d1 && s.date <= f(new Date(m.getTime()+13*864e5))));
      db.shifts.push({ id: 'kp1', employee_id: ina.id, date: d1, start_time: '12:00', end_time: '18:00', break_minutes: 0, position: '', note: '', published: true });
      const d3=new Date(m); d3.setDate(d3.getDate()+1);
      db.shifts.push({ id: 'kp2', employee_id: eva.id, date: f(d3), start_time: '12:00', end_time: '18:00', break_minutes: 0, position: '', note: '', published: true });
      db.requests.push({ id: 'kp-lv', employee_id: eva.id, type: 'vakantie', start_date: d2, end_date: d2, status: 'approved', created_at: new Date().toISOString() });`);
    await shared.reload(); await shared.waitForSelector('[data-tab=planning]'); await tab(shared, 'planning'); await shared.click('[data-act=today]');
    for (let i = 0; i < 6; i++) await shared.click('[data-act=next]');
    await shared.click('[data-act=copy]');
    const msg = await shared.waitForSelector('.toast, dialog[open]');
    const txt = await msg.textContent();
    assert.match(txt, /overgeslagen/, 'geen melding over overgeslagen diensten: ' + txt);
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  });
  await test('shiftleader ziet concepten en kan publiceren (demo gelijk aan database)', async () => {
    await setDemoDb(shared, `const d = db.employees.find(x => x.name === 'Daan Jansen'); d.role = 'planner'; d.active = true;`);
    const p = watch(await browser.newPage({ viewport: { width: 1360, height: 900 } }));
    await p.goto(URL + '#personeel'); await p.waitForSelector('[data-demo]');
    await p.evaluate(s => localStorage.setItem(s.k, JSON.stringify(s.db)), await demoDb(shared));
    await p.reload(); await p.waitForSelector('[data-demo]'); await login(p, 'Daan');
    await tab(p, 'planning'); await p.waitForSelector('table.grid');
    const total = (await demoDb(p)).db.shifts.filter(s => !s.published).length;
    if (total) assert.ok((await p.$$('.chip.concept')).length > 0 || await p.$('[data-act=publishall]'), 'shiftleader ziet geen concepten');
    await p.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('overzicht: kerngetallen, omzet invullen kleurt de kosten tegen het doel', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await tab(shared, 'overzicht'); await shared.waitForSelector('.dhome');
    await shared.click('.hhead [data-dcijfers]'); await shared.waitForSelector('.kpis .kpi');
    assert.equal(await shared.$$eval('.kpis .kpi', a => a.length), 4);
    const first = await shared.$$eval('[data-revf]', a => a[a.length - 1].dataset.revf);   // zondag: nog geen werkelijke omzet
    await shared.fill(`[data-revf="${first}"]`, '100'); await shared.press(`[data-revf="${first}"]`, 'Tab');
    await shared.waitForTimeout(400);
    const db = (await demoDb(shared)).db;
    assert.equal(db.revenue[first].forecast, 100, 'omzet niet opgeslagen');
    // lage omzet → kosten % ver boven het doel → rood (als er die dag kosten zijn)
    const cls = await shared.$eval(`[data-revf="${first}"]`, i => i.closest('tr').querySelector('.kp').className);
    assert.ok(cls.includes('bad'), 'kosten ver boven doel horen rood te zijn: ' + cls);
  });
  await test('planning: omzetregel alleen voor de directie', async () => {
    await tab(shared, 'planning'); await shared.click('[data-act=today]'); await shared.click('[data-pv=grid]').catch(() => {});
    await shared.waitForSelector('tr.moneyrow [data-rev]');
    const p = watch(await browser.newPage({ viewport: { width: 1360, height: 900 } }));
    await p.goto(URL + '#personeel'); await p.waitForSelector('[data-demo]');
    await p.evaluate(s => localStorage.setItem(s.k, JSON.stringify(s.db)), await demoDb(shared));
    await p.reload(); await p.waitForSelector('[data-demo]'); await login(p, 'Daan');   // shiftleader (eerder ingesteld)
    await tab(p, 'planning'); await p.waitForSelector('table.grid');
    assert.ok(!(await p.$('tr.moneyrow')), 'shiftleader ziet omzet');
    assert.ok(!(await p.$('[data-tab=overzicht]')), 'shiftleader ziet het overzicht');
    await p.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('inplannen: je ziet direct wat de dienst kost', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await tab(shared, 'planning'); await shared.click('[data-act=today]');
    await shared.click('tr:has-text("Sanne Bakker") td.cell.editable >> nth=0', { position: { x: 20, y: 40 } }); await shared.waitForSelector('dialog [data-cost]:not(.hidden)');
    assert.match(await shared.textContent('dialog [data-cost]'), /kost ± € \d/);
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  });
  await test('agenda koppelen: links voor iPhone (webcal) en Google, met persoonlijke sleutel', async () => {
    const html = await shared.evaluate(() => {
      const { S, CFG, store, agendaDialog } = window.__rooster;
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      const keep = [store.demo, CFG.supabaseUrl, S.me.calendar_token];
      store.demo = false; CFG.supabaseUrl = 'https://voorbeeld.supabase.co'; S.me.calendar_token = '11111111-2222-3333-4444-555555555555';
      agendaDialog([]);
      const d = document.querySelector('dialog[open]'); const out = d.innerHTML; d.close();
      [store.demo, CFG.supabaseUrl, S.me.calendar_token] = keep;
      return out;
    });
    assert.ok(html.includes('webcal://voorbeeld.supabase.co/functions/v1/agenda?t=11111111-2222-3333-4444-555555555555'), 'geen webcal-link');
    assert.ok(html.includes('calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fvoorbeeld.supabase.co'), 'geen Google-link');
  });
  await test('prikbord: directie plaatst, medewerker leest, directie ziet wie het gelezen heeft', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await tab(shared, 'overzicht'); await shared.click('[data-annnew]'); await shared.waitForSelector('dialog [name=title]');
    await shared.fill('dialog [name=title]', 'Proeverij donderdag'); await shared.fill('dialog [name=body]', 'Om 15:00 in de keuken');
    await shared.click('dialog button[value=save]'); await shared.waitForSelector('.dhome .hrow:has-text("Proeverij donderdag")');
    assert.match(await shared.textContent('.dhome .hrow:has-text("Proeverij donderdag")'), /gelezen door 0 van \d+/);
    await shared.click('.dhome .hrow:has-text("Proeverij donderdag")');
    assert.match(await shared.textContent('dialog .annall .ann:has-text("Proeverij donderdag") [data-annreads]'), /Gelezen door 0 van \d+/);
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    const p = watch(await browser.newPage({ viewport: { width: 390, height: 844 } }));
    await p.goto(URL + '#personeel'); await p.waitForSelector('[data-demo]');
    await p.evaluate(s => localStorage.setItem(s.k, JSON.stringify(s.db)), await demoDb(shared));
    await p.reload(); await p.waitForSelector('[data-demo]'); await login(p, 'Sanne');
    await p.waitForSelector('.board .ann.unread:has-text("Proeverij donderdag")');
    await p.click('.board .ann:has-text("Proeverij donderdag") [data-annread]');
    await p.waitForSelector('.toast:has-text("Gelezen")');
    await p.waitForSelector('.board .ann.unread:has-text("Proeverij donderdag")', { state: 'detached', timeout: 5000 });
    // gelezen = niet weg: ingeklapt nog op het prikbord, openklappen toont de inhoud
    await p.click('.board .pinitem summary:has-text("Proeverij donderdag")');
    await p.waitForSelector('.board .pinitem[open] .ann:has-text("Om 15:00 in de keuken")');
    const { db } = await demoDb(p);
    const ann = db.announcements.find(a => a.title === 'Proeverij donderdag');
    assert.ok(db.annReads.some(r => r.announcement_id === ann.id), 'gelezen niet opgeslagen');
    assert.ok(db.notifications.some(n => n.title === '📣 Proeverij donderdag'), 'geen melding naar het team');
    await p.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('kosten per uur telt alleen uren met een uurloon', async () => {
    const r = await shared.evaluate(() => {
      const { kpiOf } = window.__rooster;
      const sh = (e) => ({ employee_id: e, date: '2026-11-17', start_time: '12:00', end_time: '20:00', break_minutes: 0 });
      return kpiOf([sh('a'), sh('b')], { a: { hourly_wage: 15 } }, { pct_vakantiegeld: 8, pct_werkgever: 25 }, 0);
    });
    assert.equal(r.hours, 16); assert.equal(r.noWage, 1);
    assert.ok(Math.abs(r.perHour - r.cost / 8) < 0.001, 'kosten per uur rekent met uren zonder loon');
  });
  await test('afdrukken: geen loonkosten of omzet op het geprinte rooster', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await tab(shared, 'planning'); await shared.click('[data-pv=grid]').catch(() => {}); await shared.waitForSelector('tr.moneyrow');
    await shared.emulateMedia({ media: 'print' });
    const vis = await shared.evaluate(() => [...document.querySelectorAll('.moneyrow, .cost, .viewbar')].some(e => getComputedStyle(e).display !== 'none'));
    await shared.emulateMedia({ media: 'screen' });
    assert.ok(!vis, 'vertrouwelijke kosten zichtbaar in de afdruk');
  });
  await test('prikbord: lange link maakt de pagina op de telefoon niet breder', async () => {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    await p.click('[data-annnew]'); await p.fill('dialog [name=title]', 'Menukaart online'); await p.fill('dialog [name=body]', 'Zie https://www.lilou-ede.nl/' + 'menukaart-najaar-'.repeat(8) + 'definitief.pdf');
    await p.click('dialog button[value=save]'); await p.waitForSelector('.dhome .hrow:has-text("Menukaart online")');
    await p.click('.dhome .hrow:has-text("Menukaart online")'); await p.waitForSelector('dialog .annall .ann:has-text("Menukaart online") a[href^="https://www.lilou-ede.nl/"]');
    assert.ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'pagina wordt breder dan het scherm');
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('alle komende diensten van één medewerker in één keer verwijderen, met één melding', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    // een jaar vooruit plannen voor Eva
    await setDemoDb(p, `const e = db.employees.find(x => x.name.startsWith('Eva')); const p2 = n => String(n).padStart(2, '0');
      for (let i = 1; i <= 120; i++) { const d = new Date(Date.now() + i * 3 * 864e5); db.shifts.push({ id: 'jaar-' + i, employee_id: e.id, date: d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()), start_time: '12:00', end_time: '18:00', break_minutes: 0, position: 'Bediening', note: '', published: true }); }
      db.notifications = [];`);
    await p.reload(); await p.waitForSelector('[data-tab=team]');
    await tab(p, 'team'); await p.click('tr:has-text("Eva") >> nth=0'); await p.waitForSelector('dialog [data-futshifts]');
    await p.click('dialog [data-futshifts]'); await p.waitForSelector('dialog:has-text("Komende diensten van Eva") .warnbox');
    assert.match(await p.textContent('dialog:has-text("Komende diensten van Eva") .warnbox'), /en nog \d+ meer/);
    await p.check('dialog:has-text("Komende diensten van Eva") input[name=conflict][value=delete]');
    await p.click('dialog:has-text("Komende diensten van Eva") button[value=save]');
    await p.click('dialog:has-text("Weet je het zeker") button[value=save]');
    await p.waitForSelector('.toast:has-text("verwijderd")');
    const { db } = await demoDb(p);
    const eva = db.employees.find(x => x.name.startsWith('Eva'));
    assert.strictEqual(db.shifts.filter(x => x.employee_id === eva.id && x.date >= new Date().toISOString().slice(0, 10) && x.id.startsWith('jaar-')).length, 0, 'diensten staan er nog');
    assert.strictEqual(db.notifications.filter(n => n.employee_id === eva.id).length, 1, 'Eva krijgt meer dan één melding');
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('diensten per persoon: alle weken zien, selecteren en open zetten', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    await setDemoDb(p, `const e = db.employees.find(x => x.name.startsWith('Noor')); const p2 = n => String(n).padStart(2, '0');
      for (let i = 1; i <= 30; i++) { const d = new Date(Date.now() + i * 2 * 864e5); db.shifts.push({ id: 'noor-' + i, employee_id: e.id, date: d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()), start_time: '14:00', end_time: '22:00', break_minutes: 0, position: 'Keuken', note: '', published: true }); }
      db.notifications = [];`);
    await p.reload(); await p.waitForSelector('[data-tab=planning]');
    await tab(p, 'planning'); await p.waitForSelector('[data-planmore]');   // telefoon: via 'Meer'
    await p.click('[data-planmore]'); await p.click('dialog [data-more=personpick]'); await p.click('dialog [data-pick]:has-text("Noor")');
    await p.waitForSelector('dialog:has-text("Diensten van Noor") .psweek');
    assert.ok((await p.$$('dialog .psweek')).length >= 8, 'niet alle weken zichtbaar');
    const n = (await p.$$('dialog input[name=ids]:not(:disabled)')).length; assert.ok(n >= 30, 'te weinig diensten: ' + n);
    await p.check('dialog [data-psall]');
    assert.match(await p.textContent('dialog [data-pscount]'), new RegExp(n + ' geselecteerd'));
    await p.click('dialog button[value=open]'); await p.click('dialog:has-text("Weet je het zeker") button[value=save]');
    await p.waitForSelector('.toast:has-text("open gezet")');
    const { db } = await demoDb(p); const e = db.employees.find(x => x.name.startsWith('Noor'));
    assert.strictEqual(db.shifts.filter(x => x.id.startsWith('noor-') && x.employee_id).length, 0, 'diensten niet open gezet');
    assert.strictEqual(db.notifications.filter(x => x.employee_id === e.id).length, 1, 'Noor krijgt meer dan één melding');
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('lijsten: medewerker vinkt af, directie ziet wie en hoe laat; te warme koeling geeft melding', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#personeel'); await login(p, 'Sanne');
    await p.click('[data-golists]'); await p.waitForSelector('details.lcard[open] [data-tick]');
    const first = (await p.textContent('details.lcard[open] .lrow .lbl')).trim();
    await p.click('details.lcard[open] button[data-tick] >> nth=0');
    await p.waitForSelector('details.lcard[open] .lrow.done .who:has-text("Sanne")');
    // het open-dicht blijft staan na het afvinken
    assert.ok(await p.$('details.lcard[open]'), 'lijst klapte dicht na het afvinken');
    await p.click('details.lcard:has-text("Temperaturen opening") summary');
    await p.fill('details.lcard:has-text("Temperaturen opening") .tform input >> nth=0', '9,5');
    await p.click('details.lcard:has-text("Temperaturen opening") .tform button.primary >> nth=0');
    // buiten de norm: eerst invullen wat je gedaan hebt
    await p.waitForSelector('dialog:has-text("Buiten de norm") [name=note]');
    await p.fill('dialog [name=note]', 'Deur stond open, dichtgedaan');
    await p.click('dialog:has-text("Buiten de norm") button[value=save]');
    await p.waitForSelector('details.lcard:has-text("Temperaturen opening") .lrow.flag .tnote:has-text("Deur stond open")');
    // medewerker kan een afwijkende meting niet zelf weghalen
    assert.ok(!(await p.$('details.lcard:has-text("Temperaturen opening") .lrow.flag [data-untick]')), 'afwijkende meting kan zelf weggehaald worden');
    // vriezer met min-teken via de ±-knop
    await p.click('details.lcard:has-text("Temperaturen opening") .lrow:has-text("V1") [data-neg]');
    await p.type('details.lcard:has-text("Temperaturen opening") .lrow:has-text("V1") input', '20');
    await p.click('details.lcard:has-text("Temperaturen opening") .lrow:has-text("V1") button.primary');
    await p.waitForSelector('details.lcard:has-text("Temperaturen opening") .lrow:has-text("V1") .tval:has-text("-20")');
    let { db } = await demoDb(p);
    const mark = db.employees.find(e => e.name.startsWith('Mark'));
    assert.ok(db.notifications.some(n => n.employee_id === mark.id && /Temperatuur te hoog/.test(n.title)), 'directie kreeg geen temperatuurmelding');
    const sanne = db.employees.find(e => e.name.startsWith('Sanne'));
    assert.ok(db.ticks.every(t => t.employee_id === sanne.id && t.at), 'vinkje zonder naam of tijd');
    // melding maken
    await p.click('[data-newlog=melding]'); await p.fill('dialog [name=tekst]', 'Vaatwasser lekt'); await p.click('dialog button[value=save]');
    await p.waitForSelector('.logrow:has-text("Vaatwasser lekt")');
    // directie: zelfde opslag, ziet naam bij het vinkje en kan de melding afhandelen
    await logout(p, '#directie'); await login(p, 'Mark'); await tab(p, 'lijsten');
    await p.click(`details.lcard:has-text("Opening bediening") summary`);
    await p.waitForSelector('details.lcard[open]:has-text("Opening bediening") .lrow.done .who:has-text("Sanne")');
    assert.ok((await p.textContent('details.lcard[open]:has-text("Opening bediening") .lrow.done')).includes(first.slice(0, 15)), 'verkeerd onderdeel afgevinkt');
    await p.waitForSelector('[data-lstats] td:has-text("Sanne")');
    await p.click('[data-lopen] [data-resolve]'); await p.fill('dialog [name=r]', 'Monteur gebeld'); await p.click('dialog button[value=save]');
    await p.waitForSelector('.logrow:has-text("Afgehandeld door Mark")');
    ({ db } = await demoDb(p));
    assert.ok(db.logs[0].resolved_by === mark.id, 'afhandeling niet op naam');
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('lijsten: directie past een lijst aan in Instellingen', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    await p.click('[data-gosettings]'); await p.click('details.setsec:has([data-ledit]) summary'); await p.click('[data-ledit]:has-text("Opening bar")');
    await p.waitForSelector('dialog [name=items]');
    const v = await p.inputValue('dialog [name=items]');
    await p.fill('dialog [name=items]', v + '\nMuntblaadjes klaar');
    await p.click('dialog button[value=save]'); await p.waitForSelector('.toast:has-text("Lijst opgeslagen")');
    const { db } = await demoDb(p); const l = db.checklists.find(x => x.name === 'Opening bar');
    assert.ok(l.items.some(it => it.label === 'Muntblaadjes klaar'), 'onderdeel niet toegevoegd');
    assert.strictEqual(l.items[0].id, 'i1', 'bestaande onderdelen kregen een nieuw id (vinkjes zouden verdwijnen)');
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('mijn uren: medewerker ziet eigen gewerkte uren per week', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#personeel'); await login(p, 'Sanne');
    await p.click('[data-gohours]'); await p.waitForSelector('.mhsum');
    const { db } = await demoDb(p); const sanne = db.employees.find(e => e.name.startsWith('Sanne'));
    const mine = db.entries.filter(e => e.employee_id === sanne.id && e.clock_out && e.clock_in.slice(0, 7) === new Date().toISOString().slice(0, 7)).length;
    if (mine) await p.waitForSelector('.mhrow');
    assert.ok(!(await p.$$eval('.mhrow', r => r.length)) || mine, 'uren van een ander zichtbaar');
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('beschikbaarheid: vaste week herhalen vult alleen lege dagen in de komende 4 weken', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#personeel'); await login(p, 'Noor');
    await tab(p, 'beschikbaar'); await p.click('[data-fill=hele_dag]');
    await p.click('#avform button[value=repeat]'); await p.waitForSelector('.toast:has-text("komende 4 weken")');
    const { db } = await demoDb(p); const noor = db.employees.find(e => e.name.startsWith('Noor'));
    const days = new Set(db.availability.filter(a => a.employee_id === noor.id).map(a => a.date));
    assert.ok(days.size >= 35, 'niet 5 weken ingevuld: ' + days.size);
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('afspraken: medewerker leest en tekent in de app, directie ziet wie en laat opnieuw tekenen', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#personeel'); await login(p, 'Sanne');
    await p.click('[data-nood]'); await p.waitForSelector('dialog .nood[href="tel:112"]');
    await p.click('dialog[open] [data-close]');
    await p.waitForSelector('.rulesbanner'); await p.click('[data-rulesread]');
    await p.waitForSelector('dialog.rulesview iframe');
    const fr = await (await p.$('dialog.rulesview iframe')).contentFrame(); await fr.waitForSelector('#allergenen');
    assert.ok(await fr.evaluate(() => document.documentElement.classList.contains('framed') && getComputedStyle(document.querySelector('.back')).display === 'none'), 'terug-link zichtbaar in de app');
    await p.click('[data-rulesok]'); await p.waitForSelector('.toast:has-text("akkoord")');
    await p.waitForSelector('.rulesbanner', { state: 'detached' });
    let { db } = await demoDb(p); const sanne = db.employees.find(e => e.name.startsWith('Sanne'));
    assert.ok(db.rulesAcks.some(r => r.employee_id === sanne.id && r.version === 1), 'tekenen niet opgeslagen');
    const m = watch(await ctx.newPage()); await m.goto(URL + '#directie'); await m.waitForSelector('[data-demo]'); await login(m, 'Mark');
    await m.click('[data-goto2=afspraken]'); await m.waitForSelector('dialog .acklist li:has-text("Sanne")');
    await m.click('dialog [data-rulesbump]'); await m.click('dialog[open]:last-of-type button[value=save]');
    await m.waitForSelector('.toast:has-text("opnieuw te tekenen")');
    ({ db } = await demoDb(m));
    assert.strictEqual(db.settings.rules_version, 2);
    assert.ok(db.notifications.some(n => n.employee_id === sanne.id && n.title.includes('Afspraken bijgewerkt')), 'geen melding naar het team');
    assert.ok(!db.notifications.some(n => db.employees.find(e => e.id === n.employee_id)?.role === 'manager' && n.title.includes('Afspraken bijgewerkt')), 'directie kreeg melding');
    await p.reload(); await p.waitForSelector('[data-demo], #view > *', { state: 'attached' });
    if (await p.$('[data-demo]')) await login(p, 'Sanne');
    await p.waitForSelector('.rulesbanner:has-text("bijgewerkt")');
    await ctx.close(); pages.splice(pages.indexOf(p), 1); pages.splice(pages.indexOf(m), 1);
  });
  await test('planning: vegen gaat naar de volgende week (lijstweergave, telefoon)', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    await tab(p, 'planning'); await p.click('[data-pv=list]'); await p.waitForSelector('.pday');
    const before = await p.textContent('.weeknav .label strong');
    await p.evaluate(() => { const t = document.querySelector('.pday'), v = document.getElementById('view');
      const mk = x => new Touch({ identifier: 1, target: t, clientX: x, clientY: 400 });
      v.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(320)], changedTouches: [mk(320)], bubbles: true }));
      v.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mk(80)], bubbles: true })); });
    await p.waitForFunction(b => document.querySelector('.weeknav .label strong')?.textContent !== b, before);
    const after = await p.textContent('.weeknav .label strong');
    assert.strictEqual(Number(after.replace(/\D/g, '')), Number(before.replace(/\D/g, '')) % 53 + 1, `${before} -> ${after}`);
    await p.click('[data-pv=grid]');
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('planning telefoon: vegen over de dagenbalk = andere week, over de diensten = andere dag', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    await tab(p, 'planning'); await p.click('[data-pv=grid]'); await p.waitForSelector('.daystrip');
    const swipe = sel => p.evaluate(sel => { const t = document.querySelector(sel), v = document.getElementById('view');
      const mk = x => new Touch({ identifier: 1, target: t, clientX: x, clientY: 200 });
      t.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(320)], changedTouches: [mk(320)], bubbles: true }));
      t.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mk(80)], bubbles: true })); }, sel);
    const wk = () => p.textContent('.weeknav .label strong'), day = () => p.textContent('.dayhead h2');
    const w0 = await wk(), d0 = await day();
    await swipe('.daystrip'); await p.waitForFunction(w => document.querySelector('.weeknav .label strong')?.textContent !== w, w0);
    assert.notStrictEqual(await wk(), w0, 'week niet gewisseld');
    const w1 = await wk(), d1 = await day();
    await swipe('.mlist, .dayhead'); await p.waitForFunction(d => document.querySelector('.dayhead h2')?.textContent !== d, d1);
    assert.strictEqual(await wk(), w1, 'vegen over diensten mag de week niet wisselen (behalve op zondag)');
    const w2 = await wk(), d2 = await day(); await p.click('[data-wk="1"]'); await p.waitForFunction(w => document.querySelector('.weeknav .label strong')?.textContent !== w, w2);
    assert.strictEqual((await day()).split(' ')[0], d2.split(' ')[0], 'pijltje: niet dezelfde weekdag');
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('dienst op een vrije dag: vraagt eerst, en waarschuwing in de planning', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    const ds = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 9); const q = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + q(d.getMonth() + 1) + '-' + q(d.getDate()); });
    await setDemoDb(p, `const e = db.employees.find(x => x.name.startsWith('Noor')); db.shifts = db.shifts.filter(s => !(s.employee_id === e.id && s.date === a)); db.availability = db.availability.filter(v => !(v.employee_id === e.id && v.date === a)); db.availability.push({ id: 'nv1', employee_id: e.id, date: a, kind: 'niet', note: 'tandarts' });`, ds);
    await p.reload(); await p.waitForSelector('[data-tab=planning]');
    await tab(p, 'planning'); await p.click('[data-act=next]'); await p.waitForTimeout(300);
    const noor = (await demoDb(p)).db.employees.find(x => x.name.startsWith('Noor'));
    await p.click(`td.cell.editable[data-emp="${noor.id}"][data-date="${ds}"]`, { position: { x: 20, y: 40 } }); await p.waitForSelector('dialog [name=start_time]');
    await p.click('dialog button[value=save]');
    await p.waitForSelector('dialog[open]:has-text("vrije dag")');
    await p.click('dialog[open]:has-text("vrije dag") button[value=save]');
    await p.waitForSelector('.toast:has-text("ingepland")');
    await p.click('dialog[open]:has-text("Nu publiceren") .dlg-foot button[data-close]').catch(() => {});
    const sh = (await demoDb(p)).db.shifts.find(x => x.employee_id === noor.id && x.date === ds);
    assert.ok(sh, 'dienst niet opgeslagen na "Toch inplannen"');
    await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await tab(p, 'overzicht'); await tab(p, 'planning'); await p.click('[data-act=today]'); await p.click('[data-act=next]');
    await p.waitForSelector(`[data-shift="${sh.id}"].atw`, { state: 'attached' });
    assert.match(await p.getAttribute(`[data-shift="${sh.id}"]`, 'title'), /niet beschikbaar/);
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('lijsten: directie past een schoonmaaklijst aan vanuit het tabblad Lijsten', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    await tab(p, 'lijsten'); await p.click('[data-lmanage]');
    await p.click('dialog [data-lpick]:has-text("Weekschoonmaak")'); await p.waitForSelector('dialog[open]:has-text("Lijst bewerken")');
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('ziek: standaard tot je je beter meldt (niet alleen vandaag)', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#personeel'); await login(p, 'Noor');
    await p.click('[data-sick]'); await p.waitForSelector('dialog [name=open_end]:checked');
    await p.click('dialog button[value=save]'); await p.waitForSelector('.sickbanner');
    const { db } = await demoDb(p); const noor = db.employees.find(e => e.name.startsWith('Noor'));
    const r = db.requests.filter(x => x.employee_id === noor.id && x.type === 'ziek').pop();
    assert.ok(r && r.open_end === true && r.end_date === r.start_date, 'ziekmelding niet open: ' + JSON.stringify(r && [r.start_date, r.end_date, r.open_end]));
    // ook morgen nog ziek gemeld: de demo schuift de einddatum door zoals de server
    await setDemoDb(p, `const r = db.requests.filter(x => x.type === 'ziek').pop(); const d = new Date(Date.now() - 864e5); const q = n => String(n).padStart(2, '0'); r.start_date = r.end_date = d.getFullYear() + '-' + q(d.getMonth() + 1) + '-' + q(d.getDate());`);
    await p.reload(); await p.waitForSelector('[data-demo], #view > *', { state: 'attached' }); if (await p.$('[data-demo]')) await login(p, 'Noor');
    await p.waitForSelector('.sickbanner');
    // weer beter: de melding verdwijnt meteen, ook als de ziekmelding vandaag begon
    await setDemoDb(p, `const r = db.requests.filter(x => x.type === 'ziek').pop(); const d = new Date(); const q = n => String(n).padStart(2, '0'); r.start_date = r.end_date = d.getFullYear() + '-' + q(d.getMonth() + 1) + '-' + q(d.getDate()); r.open_end = true;`);
    await p.reload(); await p.waitForSelector('[data-demo], #view > *', { state: 'attached' }); if (await p.$('[data-demo]')) await login(p, 'Noor');
    await p.click('.sickbanner:has-text("ziek gemeld") [data-better]'); await p.click('dialog[open]:has-text("Ben je weer beter") button[value=save]');
    await p.waitForSelector('.toast:has-text("weer beter")');
    await p.waitForSelector('.sickbanner:has-text("ziek gemeld")', { state: 'detached', timeout: 8000 });
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('lijsten: shiftleader van dienst krijgt een herinnering als de sluitingslijst niet af is', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    await setDemoDb(p, `
      const pad = n => String(n).padStart(2, '0'), hm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
      const now = new Date(), bd = new Date(now - 5 * 3600e3), ds = bd.getFullYear() + '-' + pad(bd.getMonth() + 1) + '-' + pad(bd.getDate());
      const mark = db.employees.find(e => e.name.startsWith('Mark'));
      db.shifts = db.shifts.filter(x => x.date !== ds);
      db.shifts.push({ id: 'lr1', employee_id: mark.id, date: ds, start_time: hm(new Date(now - 2 * 3600e3)), end_time: hm(new Date(+now + 20 * 60e3)), position: 'Bediening', published: true, break_minutes: 0 });
      db.requests = db.requests.filter(r => r.employee_id !== mark.id);
      db.notifications = []; db.reminders = {};`);
    await p.reload(); await p.waitForSelector('#view > *', { state: 'attached' }).catch(() => {});
    if (await p.$('[data-demo]')) await login(p, 'Mark');
    await p.waitForTimeout(800);
    const { db } = await demoDb(p);
    const mark = db.employees.find(e => e.name.startsWith('Mark'));
    const mine = db.notifications.filter(n => n.employee_id === mark.id && /lijsten nog niet af/.test(n.title));
    assert.ok(mine.some(n => n.title === 'Sluitingslijsten nog niet af' && /Sluiting bediening \(0 van \d+\)/.test(n.body)), 'geen herinnering sluiting: ' + JSON.stringify(mine));
    assert.ok(!mine.some(n => /Sluiting keuken/.test(n.body)), 'keuken werkt vandaag niet, toch in de herinnering');
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('overzicht: directie keurt een vrije dag goed vanaf het startscherm (Ja-knop)', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark'); await p.waitForSelector('.dhome');
    const { db } = await demoDb(p);
    const r = db.requests.find(x => x.status === 'pending' && (x.type === 'vrij' || x.type === 'vakantie'));
    assert.ok(r, 'geen openstaande verlofaanvraag in de demo');
    const name = db.employees.find(e => e.id === r.employee_id).name.split(' ')[0];
    if (!(await p.$(`[data-hok="${r.id}"]`))) await p.click('[data-hall]');
    await p.click(`[data-hok="${r.id}"]`); await p.waitForSelector('dialog:has-text("Verlof goedkeuren")');
    await p.click('dialog button[value=save]'); await p.waitForSelector('.toast:has-text("Verlof goedgekeurd")');
    await p.waitForSelector(`[data-hok="${r.id}"]`, { state: 'detached' });
    assert.equal((await demoDb(p)).db.requests.find(x => x.id === r.id).status, 'approved', name + ': aanvraag niet goedgekeurd');
    // Cijfers-pagina en weer terug
    await p.click('.hhead [data-dcijfers]'); await p.waitForSelector('[data-revf]');
    await p.click('[data-dhome]'); await p.waitForSelector('.dhome');
    assert.ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'startscherm breder dan de telefoon');
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('profiel: nieuwe medewerker maakt profiel af, telefoonlijst en noodcontact voor de leiding', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#personeel'); await login(p, 'Sanne');
    await setDemoDb(p, `const s = db.employees.find(e => e.name.startsWith('Sanne')); db.profiles ||= {}; db.profiles[s.id] = { employee_id: s.id, emergency: [], share_phone: false };`);
    await p.reload(); if (await p.$('[data-demo]')) await login(p, 'Sanne');
    await p.waitForSelector('dialog:has-text("Maak je profiel af")');
    await p.fill('dialog [name=phone]', 'abc'); await p.fill('dialog [name=birth_date]', '2001-04-12'); await p.selectOption('dialog [name=shirt_size]', 'M');
    await p.click('dialog button[value=save]'); await p.waitForSelector('dialog .dlgerr:has-text("telefoonnummer")');
    await p.fill('dialog [name=phone]', '06 1234 5678'); await p.fill('dialog [name=ice_name0]', 'Anna'); await p.fill('dialog [name=ice_rel0]', 'moeder'); await p.fill('dialog [name=ice_phone0]', '06 9999 0000');
    await p.check('dialog [name=share_phone]'); await p.click('dialog button[value=save]'); await p.waitForSelector('.toast:has-text("profiel is klaar")');
    // telefoonlijst via Meer
    await p.click('[data-more]'); await p.click('dialog.moresheet [data-mphones]'); await p.waitForSelector('dialog .phonelist li:has-text("Sanne") a[href^="https://wa.me/31612345678"]');
    await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    // directie ziet het noodcontact bij Noodnummers
    const m = watch(await ctx.newPage()); await m.goto(URL + '#directie'); await m.waitForSelector('[data-demo]'); await login(m, 'Mark');
    await m.waitForSelector('.dhome'); await m.click('.hlinks [data-nood]'); await m.waitForSelector('dialog [data-icesel]');
    const sid = (await demoDb(m)).db.employees.find(e => e.name.startsWith('Sanne')).id;
    await m.selectOption('dialog [data-icesel]', sid); await m.waitForSelector('dialog [data-iceout] a:has-text("Anna")');
    await ctx.close(); pages.splice(pages.indexOf(p), 1); pages.splice(pages.indexOf(m), 1);
  });
  await test('rechten per functie: Bar mag plannen en ziet keukenlijsten; uitzondering per persoon', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    await p.click('[data-gosettings]'); await p.waitForSelector('.posrow', { state: 'attached' });
    await p.evaluate(() => { document.querySelector('details.setsec[data-k="1"]').open = true; });
    await p.click('.posrow:has-text("Bar") [data-posrights]'); await p.waitForSelector('dialog:has-text("Rechten: Bar")');
    await p.check('dialog [name=lists][value="Keuken"]'); await p.check('dialog [name=level][value="shiftleader"]'); await p.click('dialog button[value=save]');
    await p.waitForSelector('.posrow:has-text("Bar"):has-text("Shiftleader")');
    let db = (await demoDb(p)).db;
    assert.equal(db.employees.find(e => e.name.startsWith('Daan')).role, 'planner', 'Daan (Bar) is geen shiftleader geworden');
    // Daan logt in: planning als shiftleader, keukenlijsten zichtbaar
    const d = watch(await ctx.newPage()); await d.goto(URL + '#personeel'); await d.waitForSelector('[data-demo]'); await login(d, 'Daan');
    await d.waitForSelector('[data-tab="planning"]'); await d.click('[data-tab="lijsten"]'); await d.waitForSelector('.lcard');
    assert.ok(await d.$('.lcard:has-text("keuken")') || await d.$('.lcard:has-text("Keuken")'), 'Daan ziet geen keukenlijst');
    // uitzondering: Daan nooit plannen
    await p.click('[data-tab="team"]'); await p.click('tr:has-text("Daan")'); await p.waitForSelector('dialog [name=plan_mode]');
    await p.selectOption('dialog [name=plan_mode]', 'nee'); await p.click('dialog button[value=save]'); await p.waitForTimeout(400);
    db = (await demoDb(p)).db;
    const daan = db.employees.find(e => e.name.startsWith('Daan'));
    assert.ok(daan.role === 'staff' && daan.plan_mode === 'nee', 'uitzondering Nooit werkt niet: ' + daan.role + '/' + daan.plan_mode);
    await ctx.close(); pages.splice(pages.indexOf(p), 1); pages.splice(pages.indexOf(d), 1);
  });
  await test('kaarten: directie uploadt de menukaart, medewerker opent hem in de app', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    await tab(p, 'kaarten'); await p.click('[data-kadd]');
    const pdf = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 400]/Contents 4 0 R/Resources<<>>>>endobj\n4 0 obj<</Length 33>>stream\n0.57 0.15 0.03 rg 20 20 260 360 re f\nendstream endobj\ntrailer<</Root 1 0 R>>\n%%EOF';
    assert.strictEqual(await p.$$eval('.kcard', x => x.length), 4, 'de vier standaardkaarten staan er niet');
    await p.fill('dialog [name=title]', 'Testkaart'); await p.setInputFiles('dialog [name=file]', { name: 'menu.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) });
    await p.click('dialog button[value=save]'); await p.waitForSelector('.kcard:has-text("Testkaart")');
    // directie zet zelf een gerecht in een categorie
    await p.click('.kcard:has-text("Menukaart") [data-kopen]'); await p.waitForSelector('dialog.menulist[open] .ml-item', { timeout: 15000 });
    await p.click('dialog.menulist [data-mledit]'); await p.click('dialog.menulist [data-mladd]');
    const hoofdK = await p.$eval('dialog.dlg[open] [name=sec]', s => [...s.options].find(o => o.text === 'Hoofd').value);
    await p.selectOption('dialog.dlg[open] [name=sec]', hoofdK);
    await p.fill('dialog.dlg[open] [name=name]', 'Testgerecht met kreeft'); await p.fill('dialog.dlg[open] [name=lines]', 'Bisque · venkel');
    await p.fill('dialog.dlg[open] [name=price]', '38'); await p.fill('dialog.dlg[open] [name=allergens]', 'schaaldieren');
    await p.click('dialog.dlg[open] button[value=save]'); await p.waitForSelector('dialog.menulist .ml-ed:has-text("Testgerecht met kreeft")');
    // nieuwe categorie
    await p.click('dialog.menulist [data-mladd]'); await p.selectOption('dialog.dlg[open] [name=sec]', '__new');
    await p.fill('dialog.dlg[open] [name=newsec]', 'Dessert'); await p.fill('dialog.dlg[open] [name=name]', 'Tarte tatin');
    await p.click('dialog.dlg[open] button[value=save]'); await p.waitForSelector('dialog.menulist [data-mlsec]:text-is("Dessert")');
    // weghalen
    await p.click('dialog.menulist .ml-ed:has-text("Tarte tatin")'); await p.click('dialog.dlg[open] button[value=delete]');
    await p.click('dialog.dlg[open]:has-text("Weet je het zeker") button[value=save]');
    await p.waitForSelector('dialog.menulist [data-mlsec]:text-is("Dessert")', { state: 'detached' });
    await p.click('dialog.menulist [data-mlclose]'); await p.waitForSelector('dialog.menulist', { state: 'detached' });
    const s2 = watch(await ctx.newPage()); await s2.setViewportSize({ width: 390, height: 844 });
    await s2.goto(URL + '#personeel'); await s2.waitForSelector('[data-demo]'); await login(s2, 'Sanne');
    await s2.click('[data-gokaarten]'); await s2.click('.kcard:has-text("Testkaart") [data-kopen]');
    await s2.waitForSelector('dialog.viewer[open] canvas.viewer-page', { timeout: 15000 });
    await s2.click('dialog.viewer [data-vclose]'); await s2.waitForSelector('dialog.viewer', { state: 'detached' });
    await s2.click('.kcard:has-text("Menukaart") [data-kopen]');   // standaardkaart uit de map kaarten/: als lijst met filter
    await s2.waitForSelector('dialog.menulist[open] .ml-item', { timeout: 15000 });
    const all = await s2.$$eval('.ml-item', x => x.length);
    const txt = await s2.$eval('dialog.menulist .ml-body', e => e.innerText);
    assert.ok(/Kreeft & langoustine/.test(txt), 'ligatuur ft valt weg (Kree)');
    assert.ok(/4 gangen[\s\S]{0,40}€ 79/.test(txt) && !/Allergie of dieetwens/.test(txt), 'menuprijzen per aantal gangen kloppen niet');
    await s2.click('dialog.menulist [data-mlsec]:text-is("Hoofd")');
    const hoofd = await s2.$$eval('.ml-item', x => x.length);
    assert.ok(hoofd > 0 && hoofd < all, `filter Hoofd werkt niet (${hoofd} van ${all})`);
    assert.deepStrictEqual(await s2.$$eval('.ml-sec', x => x.map(e => e.textContent)), ['Hoofd'], 'andere kopjes zichtbaar bij filter');
    const kreeft = await s2.$eval('.ml-item:has-text("Testgerecht met kreeft")', e => e.textContent);
    assert.ok(/€ 38/.test(kreeft) && /schaaldieren/.test(kreeft), 'medewerker ziet het nieuwe gerecht niet goed: ' + kreeft);
    assert.ok(!(await s2.$('dialog.menulist [data-mledit]')), 'medewerker kan de kaart bewerken');
    await s2.click('dialog.menulist [data-mlsec]:text-is("Alles")'); await s2.fill('dialog.menulist [data-mlq]', 'zzzgeenzzz');
    await s2.waitForSelector('dialog.menulist .hint:has-text("Niets gevonden")');
    await s2.click('dialog.menulist [data-mlclose]'); await s2.waitForSelector('dialog.menulist', { state: 'detached' });
    await s2.click('.kcard:has-text("Wijnkaart") [data-kopen]');
    await s2.waitForSelector('dialog.menulist[open] .ml-price:has-text("Glas €")', { timeout: 15000 });
    assert.ok(!(await s2.$('dialog.menulist [data-mlpdf]')), 'knop Als kaart hoort weg te zijn');
    assert.ok(!(await s2.$('[data-kadd]')), 'medewerker kan kaarten toevoegen');
    await ctx.close(); pages.splice(pages.indexOf(p), 1); pages.splice(pages.indexOf(s2), 1);
  });
  await test('telefoon: geen enkel scherm loopt rechts van het scherm af', async () => {
    // elk element binnen #view moet binnen de schermbreedte blijven (behalve in bewust scrollende tabellen)
    const outside = p => p.evaluate(() => { const W = document.documentElement.clientWidth, out = [];
      document.querySelectorAll('#view *').forEach(e => { if (e.closest('.table-wrap')) return; const r = e.getBoundingClientRect(); if (r.width && r.right > W + 1) out.push(e.tagName + '.' + String(e.className).slice(0, 30)); });
      return out.slice(0, 3); });
    for (const [who, hash, tabs] of [['Mark', '#directie', ['overzicht', 'planning', 'klokken', 'lijsten', 'aanvragen', 'team', 'uren', 'instellingen']], ['Sanne', '#personeel', ['mijn', 'planning', 'diensten', 'beschikbaar', 'aanvragen']]]) {
      const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } }); const p = watch(await ctx.newPage());
      await fresh(p, hash); await login(p, who);
      for (const t of tabs) {
        if (t === 'instellingen') { await p.click('[data-gosettings]'); await p.waitForSelector('details.setsec'); await p.evaluate(() => document.querySelectorAll('details.setsec').forEach(d => (d.open = true))); } else await tab(p, t);
        await p.waitForTimeout(350);
        const o = await outside(p); assert.deepStrictEqual(o, [], `${who} › ${t} is te breed: ${o.join(', ')}`);
      }
      await ctx.close(); pages.splice(pages.indexOf(p), 1);
    }
  });
  await test('bijlage (pdf) opent in de app zelf, niet in een los tabblad', async () => {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    // klein maar geldig pdf-bestand met één pagina
    const pdf = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 400]/Contents 4 0 R/Resources<<>>>>endobj\n4 0 obj<</Length 33>>stream\n0.57 0.15 0.03 rg 20 20 260 360 re f\nendstream endobj\ntrailer<</Root 1 0 R>>\n%%EOF';
    await p.click('[data-annnew]'); await p.fill('dialog [name=title]', 'Wijnkaart');
    await p.setInputFiles('dialog [name=file]', { name: 'wijnkaart.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) });
    await p.click('dialog button[value=save]'); await p.waitForSelector('.dhome .hrow:has-text("Wijnkaart")');
    await p.click('.dhome .hrow:has-text("Wijnkaart")'); await p.waitForSelector('dialog .annall .ann:has-text("Wijnkaart") [data-annview]');
    const before = ctx.pages().length;
    await p.click('dialog .annall .ann:has-text("Wijnkaart") [data-annview]');
    await p.waitForSelector('dialog.viewer[open] canvas.viewer-page', { timeout: 15000 });
    assert.strictEqual(ctx.pages().length, before, 'er ging een los tabblad open');
    const painted = await p.waitForFunction(() => { const c = document.querySelector('canvas.viewer-page'); if (!c || !c.width) return false; const d = c.getContext('2d').getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data; return d[0] > 100 && d[1] < 80; }, null, { timeout: 10000 }).then(() => true, () => false);
    assert.ok(painted, 'pdf-pagina is niet getekend');
    await p.click('dialog.viewer [data-vclose]'); await p.waitForSelector('dialog.viewer', { state: 'detached' });
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('iPhone: medewerkervenster scrolt binnen het venster tot de knoppen', async () => {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    await tab(p, 'team'); await p.click('tr:has-text("Sanne") >> nth=0'); await p.waitForSelector('dialog[open]');
    const r = await p.evaluate(() => {
      const d = document.querySelector('dialog[open]'); const cs = getComputedStyle(d);
      return { oy: cs.overflowY, fits: d.getBoundingClientRect().bottom <= innerHeight + 1, htmlOv: getComputedStyle(document.documentElement).overflow };
    });
    assert.equal(r.oy, 'auto'); assert.ok(r.fits, 'venster valt buiten het scherm'); assert.equal(r.htmlOv, 'hidden');
    await p.locator('dialog[open] button[value=save]').scrollIntoViewIfNeeded();
    assert.ok(await p.locator('dialog[open] button[value=save]').isVisible());
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('foutmelding verschijnt in het venster', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await tab(shared, 'team'); await shared.click('[data-new]');
    await shared.fill('dialog [name=name]', 'Test'); await shared.fill('dialog [name=email]', 'sanne@voorbeeld.nl'); await shared.click('dialog button[value=save]');
    await shared.waitForSelector('dialog .dlgerr');
  });

  await test('dagrapport: shiftleader vult in, directie leest het met de cijfers', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#personeel'); await login(p, 'Daan');
    await setDemoDb(p, `const d = db.employees.find(x => x.name.startsWith('Daan')); d.role = 'planner'; d.plan_mode = 'ja';
      const b = new Date(Date.now() - 5 * 3600e3), bd = b.getFullYear() + '-' + String(b.getMonth() + 1).padStart(2, '0') + '-' + String(b.getDate()).padStart(2, '0');
      db.shifts.push({ id: 'rep-1', employee_id: d.id, date: bd, start_time: '00:00', end_time: '23:59', break_minutes: 0, position: 'Bar', note: '', published: true });`);
    await p.reload(); await p.waitForSelector('#view > *', { state: 'attached' }); await p.waitForTimeout(400);
    await tab(p, 'mijn');
    await p.waitForSelector('[data-drepnew]'); await p.click('[data-drepnew]'); await p.waitForSelector('dialog textarea[name=notes]');
    await p.click('dialog .busyopt:has-text("Druk")'); await p.fill('dialog textarea[name=notes]', 'Terras vol, keuken liep goed.'); await p.fill('dialog input[name=sold_out]', 'Tarte tatin');
    await p.click('dialog button[value=save]'); await p.waitForSelector('.toast:has-text("Dagrapport verstuurd")');
    const { db } = await demoDb(p);
    const r = Object.values(db.dayreports)[0];
    assert.ok(r && r.busy === 'druk' && /Terras vol/.test(r.notes) && r.sold_out === 'Tarte tatin', 'dagrapport niet opgeslagen');
    assert.ok(db.notifications.some(n => /^Dagrapport/.test(n.title) && n.view === 'overzicht:rapport'), 'directie krijgt geen melding');
    const m = watch(await ctx.newPage()); await m.setViewportSize({ width: 1280, height: 900 });
    await m.goto(URL + '#directie'); await m.waitForSelector('[data-demo]'); await login(m, 'Mark');
    await m.waitForSelector('[data-dreps]'); await m.click('[data-dreps]'); await m.click('dialog [data-drep]');
    await m.waitForSelector('dialog .reptxt:has-text("Terras vol")');
    assert.ok(await m.$('dialog .minikpis.static'), 'cijfers ontbreken in het dagrapport');
    await ctx.close();
  });
  await test('diploma: toevoegen in team, planning waarschuwt zonder SVH, melding bij verlopen', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    await tab(p, 'team'); await p.click('tr:has-text("Sanne")'); await p.waitForSelector('dialog [data-certadd]');
    await p.selectOption('dialog [data-certkind]', 'svh');
    const soon = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10);
    await p.fill('dialog [data-certexp]', soon); await p.click('dialog [data-certadd]');
    await p.waitForSelector('dialog .certlist li:has-text("Sociale Hygiëne")');
    let { db } = await demoDb(p);
    assert.strictEqual(db.certs.length, 1, 'diploma niet opgeslagen');
    await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    // een dag waarop Sanne niet werkt maar een ander wel: planning laat 'Geen SVH' zien
    await setDemoDb(p, `const s = db.employees.find(x => x.name.startsWith('Sanne')); const o = db.employees.find(x => x.name.startsWith('Noor'));
      const d = new Date(Date.now() + 864e5), ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      db.shifts = db.shifts.filter(x => x.date !== ds); db.shifts.push({ id: 'svh-1', employee_id: o.id, date: ds, start_time: '12:00', end_time: '20:00', break_minutes: 0, position: 'Keuken', note: '', published: true });`);
    await p.reload(); await p.waitForSelector('#view > *', { state: 'attached' }); await p.waitForTimeout(400);
    ({ db } = await demoDb(p));
    assert.ok(db.notifications.some(n => /verloopt binnenkort/.test(n.title)), 'medewerker krijgt geen melding voor het verlopen');
    assert.ok(db.notifications.some(n => /^Diploma verloopt: Sanne/.test(n.title)), 'directie krijgt geen melding voor het verlopen');
    await tab(p, 'planning'); await p.click('[data-act=today]');
    let found = await p.$('.covp:has-text("Geen SVH")');
    if (!found) { await p.click('[data-act=next]'); found = await p.waitForSelector('.covp:has-text("Geen SVH")'); }
    assert.ok(found, 'planning waarschuwt niet');
    await ctx.close();
  });
  await test('niet ingeklokt: melding aan de leiding en de medewerker', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    await setDemoDb(p, `const e = db.employees.find(x => x.name.startsWith('Eva')); const st = new Date(Date.now() - 20 * 60000), en = new Date(Date.now() + 3 * 3600e3);
      const f = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'), t = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      db.entries = db.entries.filter(x => x.employee_id !== e.id); db.requests = db.requests.filter(x => x.employee_id !== e.id); db.notifications = [];
      db.shifts.push({ id: 'late-1', employee_id: e.id, date: f(st), start_time: t(st), end_time: t(en) > t(st) ? t(en) : '23:59', break_minutes: 0, position: 'Bediening', note: '', published: true });`);
    await p.reload(); await p.waitForSelector('#view > *', { state: 'attached' }); await p.waitForTimeout(400);
    const { db } = await demoDb(p);
    assert.ok(db.notifications.some(n => n.title === 'Eva is nog niet ingeklokt'), 'leiding krijgt geen melding');
    assert.ok(db.notifications.some(n => n.title === 'Je bent nog niet ingeklokt'), 'medewerker krijgt geen melding');
    const before = db.notifications.length; await p.reload(); await p.waitForSelector('#view > *', { state: 'attached' }); await p.waitForTimeout(400);
    assert.strictEqual((await demoDb(p)).db.notifications.filter(n => /nog niet ingeklokt/.test(n.title)).length, db.notifications.filter(n => /nog niet ingeklokt/.test(n.title)).length, 'melding dubbel');
    await ctx.close();
  });
  await test('beschikbaarheid: nogmaals tikken maakt de dag leeg, opmerking op verzoek', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#personeel'); await login(p, 'Sanne'); await tab(p, 'beschikbaar');
    await p.click('.avrow:first-child .av-avond span'); assert.ok(await p.isChecked('.avrow:first-child .av-avond input'));
    await p.click('.avrow:first-child .av-avond span'); assert.ok(await p.isChecked('.avrow:first-child .av-leeg input'), 'nogmaals tikken maakt niet leeg');
    assert.ok(!(await p.isVisible('.avrow:first-child .avnote')), 'opmerking staat al open');
    await p.click('.avrow:first-child [data-addnote]'); assert.ok(await p.isVisible('.avrow:first-child .avnote'));
    await ctx.close();
  });
  await test('verlof: kosten in uren zichtbaar voor versturen', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#personeel'); await login(p, 'Sanne'); await tab(p, 'aanvragen');
    const a = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), b = new Date(Date.now() + 34 * 864e5).toISOString().slice(0, 10);
    await p.fill('#reqform [name=start_date]', a); await p.dispatchEvent('#reqform [name=start_date]', 'change');
    await p.fill('#reqform [name=end_date]', b); await p.dispatchEvent('#reqform [name=end_date]', 'change');
    await p.waitForSelector('[data-cost]:has-text("5 dagen")');
    await ctx.close();
  });
  await test('geen JavaScript-fouten', async () => assert.deepStrictEqual(errors, []));
  await browser.close(); server.close();
  console.log(`\n${passed} tests geslaagd${process.exitCode ? ', maar er zijn FOUTEN' : ''}`);
})().catch(e => { console.error(e); process.exit(1); });
