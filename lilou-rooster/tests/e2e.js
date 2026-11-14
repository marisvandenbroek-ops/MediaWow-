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
      await p.click(`[data-tab=${t}]`); await p.waitForTimeout(150);
      small.push(...await p.$$eval('input:not([type=checkbox]):not([type=radio]), select, textarea', els => els.filter(e => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => (e.name || e.className || e.tagName))));
    }
    await ctx.close();
    assert.deepStrictEqual([...new Set(small)], [], 'te kleine invulvelden');
  });

  console.log('Alle schermen laden');
  await test('directie: alle tabbladen zonder fouten', async () => {
    await fresh(desk, '#directie'); await login(desk, 'Mark');
    for (const t of ['planning', 'klokken', 'aanvragen', 'team', 'uren']) { await desk.click(`[data-tab=${t}]`); await desk.waitForTimeout(150); await noViewError(desk); }
    for (const rt of ['verlof', 'ruilen', 'open', 'beschikbaar']) { await desk.click('[data-tab=aanvragen]'); await desk.click(`[data-rt=${rt}]`); await desk.waitForTimeout(150); await noViewError(desk); }
  });
  const mob = watch(await (await browser.newContext({ ...devices['iPhone 13'] })).newPage());
  await test('medewerker (mobiel): alle tabbladen zonder fouten en zonder horizontaal scrollen', async () => {
    await fresh(mob, '#personeel'); await login(mob, 'Sanne');
    for (const t of ['mijn', 'planning', 'diensten', 'beschikbaar', 'aanvragen']) {
      await mob.click(`[data-tab=${t}]`); await mob.waitForTimeout(150); await noViewError(mob);
      assert.ok(await mob.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontaal scrollen op ' + t);
    }
  });

  console.log('Klokken');
  await test('inklokken via wifi, uitklokken via gps', async () => {
    await mob.click('[data-tab=mijn]'); await mob.click('[data-demoloc=wifi]'); await mob.click('[data-clock=in]'); await mob.waitForSelector('[data-clock=uit]');
    await mob.click('[data-demoloc=op]'); await mob.waitForSelector('[data-clock=uit]'); await mob.click('[data-clock=uit]'); await mob.waitForSelector('[data-clock=in]');
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
    await mob.click('[data-tab=diensten]'); await mob.click('[data-newswap]'); await mob.waitForSelector('dialog [name=shift_id]');
    const disabled = await mob.$$eval('dialog [name=shift_id] option[disabled]', o => o.length);
    assert.ok(disabled >= 1, 'bezette dienst niet uitgeschakeld');
    const before = (await demoDb(mob)).db.swaps.length;
    await mob.dblclick('dialog button[value=save]'); await mob.waitForTimeout(400);
    assert.strictEqual((await demoDb(mob)).db.swaps.length, before + 1);
  });
  await test('aanmelden voor open dienst', async () => {
    await logout(mob, '#personeel'); await login(mob, 'Noor');
    await mob.click('[data-tab=diensten]'); await mob.click('[data-apply] >> nth=0'); await mob.waitForSelector('[data-withdraw]');
  });
  await test('beschikbaarheid opslaan', async () => {
    await mob.click('[data-tab=beschikbaar]'); await mob.click('[data-fill=hele_dag]'); await mob.click('#avform button.primary'); await mob.waitForTimeout(200);
    assert.match(await mob.textContent('.avfoot .hint'), /7 van 7/);
  });
  await test('verlof aanvragen', async () => {
    await mob.click('[data-tab=aanvragen]'); await mob.click('#reqform button'); await mob.waitForTimeout(200);
    assert.ok(await mob.$('[data-del]'));
  });
  await test('ziek melden via de knop "Ik ben ziek"', async () => {
    await mob.click('[data-tab=mijn]'); await mob.click('[data-sick]'); await mob.waitForSelector('dialog .warnbox:has-text("Eerst bellen")');
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
    await shared.click('[data-tab=diensten]'); await shared.click('[data-accept] >> nth=0'); await shared.click('dialog button[value=save]'); await shared.waitForTimeout(200);
    await logout(shared, '#directie'); await login(shared, 'Mariska');
    await shared.click('[data-tab=aanvragen]'); await shared.click('[data-rt=ruilen]'); await shared.waitForSelector('[data-swok]');
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
    await shared.reload(); await shared.waitForSelector('[data-tab=aanvragen]'); await shared.click('[data-tab=aanvragen]');
    await shared.click('[data-rt=verlof]'); await shared.click('[data-ok="rq-vk1"]'); await shared.waitForSelector('dialog [name=conflict][value=open]');
    assert.ok(await shared.isChecked('dialog [name=conflict][value=open]'), 'open dienst is niet de standaardkeuze');
    await shared.click('dialog button[value=save]'); await shared.waitForSelector('.toast:has-text("open dienst")');
    const { db } = await demoDb(shared);
    assert.equal(db.shifts.find(s => s.id === 'vk1').employee_id, null, 'dienst is niet open gemaakt');
    assert.equal(db.requests.find(r => r.id === 'rq-vk1').status, 'approved');
  });
  await test('Arbeidstijdenwet: nachtdienst van 17-jarige gemarkeerd', async () => {
    await shared.click('[data-tab=planning]'); await shared.waitForSelector('table.grid');
    const t = await shared.$eval('.chip.atw', e => e.title); assert.match(t, /17-jarigen/);
  });
  await test('loonkosten in uren en export per functie', async () => {
    await shared.click('[data-tab=uren]'); await shared.waitForSelector('.exports');
    assert.match(await shared.textContent('table.list tfoot'), /€/);
    const rows = await shared.evaluate(() => document.querySelector('[data-csv=kosten]') !== null); assert.ok(rows);
  });
  await test('export levert een echt CSV-bestand op (urenoverzicht en loonkosten)', async () => {
    const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1360, height: 900 } }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark'); await p.click('[data-tab=uren]'); await p.waitForSelector('.exports');
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
    await f.click('[data-tab=uren]'); await f.waitForSelector('.exports'); await f.click('[data-csv=payroll]');
    await f.waitForSelector('dialog .exportprev');
    assert.ok(!(await f.$('.toast:has-text("gedownload")')), 'valse melding "gedownload"');
    assert.ok(!downloaded);
    await p.close();
  });
  await test('klokregistratie aanpassen komt in de geschiedenis', async () => {
    await shared.click('[data-tab=klokken]'); await shared.click('[data-cf=all]'); await shared.click('article.entry [data-eedit] >> nth=0');
    await shared.waitForSelector('dialog [name=break_minutes]'); await shared.fill('dialog [name=manager_note]', 'Testnotitie'); await shared.click('dialog button[value=save]'); await shared.waitForTimeout(200);
    await shared.click('article.entry:has-text("Testnotitie") [data-eedit]'); await shared.click('dialog [data-history] summary'); await shared.waitForSelector('dialog .auditlist');
    assert.match(await shared.textContent('dialog .auditlist'), /Testnotitie/);
  });
  await test('nieuwe medewerker: uitnodiging wordt meteen verstuurd en status zichtbaar', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await shared.click('[data-tab=team]'); await shared.click('[data-new]'); await shared.waitForSelector('dialog [name=send_invite]');
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
    await shared.click('[data-tab=planning]'); await shared.click('[data-act=next]'); await shared.waitForTimeout(200);
    await shared.click('td.cell.editable >> nth=0'); await shared.waitForSelector('dialog [name=start_time]');
    await shared.click('dialog button[value=save]');
    // na inplannen vraagt de app meteen of de week gepubliceerd moet worden
    await shared.waitForSelector('dialog[open]:has-text("Nu publiceren?")'); await shared.click('dialog[open] button[value=save]');
    await shared.waitForSelector('.toast:has-text("per mail")');
    await shared.click('[data-act=today]');
  });
  await test('alles publiceren: concepten in meerdere weken in één keer', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await shared.click('[data-tab=planning]'); await shared.click('[data-act=today]');
    for (const wk of [2, 3]) {
      await setDemoDb(shared, `const m=new Date(); m.setDate(m.getDate()-((m.getDay()+6)%7)+7*a); const p=x=>String(x).padStart(2,'0'); const d=m.getFullYear()+'-'+p(m.getMonth()+1)+'-'+p(m.getDate());
        db.shifts.push({ id: 'pa'+a, employee_id: db.employees[2].id, date: d, start_time: '12:00', end_time: '18:00', break_minutes: 0, position: 'Bediening', note: '', published: false });`, wk);
    }
    await shared.reload(); await shared.waitForSelector('[data-tab=planning]'); await shared.click('[data-tab=planning]');
    await shared.waitForSelector('[data-act=publishall]'); await shared.click('[data-act=publishall]'); await shared.click('dialog[open] button[value=save]');
    await shared.waitForSelector('.toast:has-text("gepubliceerd")');
    const left = await shared.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('lilou-rooster-demo-')); return JSON.parse(localStorage.getItem(k)).shifts.filter(s => s.id.startsWith('pa') && !s.published).length; });
    assert.equal(left, 0);
    assert.ok(!(await shared.$('[data-act=publishall]')), 'balk verdwijnt na publiceren');
  });
  await test('instellingen: functie en snelkeuze-dienst toevoegen werkt door in het inplanvenster', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await shared.click('[data-gosettings]'); await shared.waitForSelector('[data-posadd]');
    await shared.fill('[data-posadd] [name=pos]', 'Runner'); await shared.click('[data-posadd] button'); await shared.waitForSelector('.poslist:has-text("Runner")');
    await shared.click('[data-tpladd]'); await shared.fill('.tplrow >> nth=-1 >> [name=label]', 'Brunch'); await shared.fill('.tplrow >> nth=-1 >> [name=start]', '10:00'); await shared.fill('.tplrow >> nth=-1 >> [name=end]', '15:00');
    await shared.click('[data-tplform] button.primary'); await shared.waitForSelector('.toast:has-text("Snelkeuze")');
    await shared.click('[data-tab=planning]'); await shared.click('td.cell.editable >> nth=0'); await shared.waitForSelector('dialog [name=position]');
    assert.ok((await shared.$$eval('dialog [name=position] option', o => o.map(x => x.textContent))).includes('Runner'), 'nieuwe functie staat niet in de lijst');
    await shared.waitForSelector('dialog .tpl:has-text("Brunch")');
    await shared.click('dialog .tpl:has-text("Brunch")'); assert.equal(await shared.inputValue('dialog [name=start_time]'), '10:00');
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  });
  await test('bezetting: norm per weekdag en gasten tonen tekort per functie', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await shared.click('[data-gosettings]'); await shared.waitForSelector('[data-staffform]');
    for (let wd = 0; wd < 7; wd++) await shared.fill(`[data-staff="${wd}"][data-pos="Afwas"]`, '1');
    await shared.fill('[data-ratio="Bediening"]', '20');
    await shared.click('[data-staffform] button.primary'); await shared.waitForSelector('.toast:has-text("Bezetting opgeslagen")');
    await shared.click('[data-tab=planning]'); await shared.waitForSelector('.covrow');
    assert.ok(await shared.$('.covrow .covp.short:has-text("Afwas 0/1")'), 'tekort afwas niet zichtbaar');
    await shared.fill('.covrow [data-guests] >> nth=0', '100'); await shared.press('.covrow [data-guests] >> nth=0', 'Tab');
    await shared.waitForSelector('.covrow .covp:has-text("/5")');
  });
  await test('gesloten dag: zichtbaar in de planning en waarschuwing bij een dienst', async () => {
    await shared.click('[data-gosettings]'); await shared.waitForSelector('[data-dayform]');
    const ds = await shared.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 2); const p = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); });
    await shared.click('[data-dayadd]'); await shared.fill('.spdrow >> nth=-1 >> [name=date]', ds); await shared.fill('.spdrow >> nth=-1 >> [name=label]', 'Personeelsuitje');
    await shared.click('[data-dayform] button.primary'); await shared.waitForSelector('.toast:has-text("Dagen opgeslagen")');
    await shared.click('[data-tab=planning]'); await shared.click('[data-act=today]'); await shared.waitForSelector('.covp.closed:has-text("Personeelsuitje")');
    await setDemoDb(shared, `const e = db.employees.find(x => x.name === 'Lisa de Jong') || db.employees[2]; db.shifts.push({ id: 'dicht1', employee_id: e.id, date: a, start_time: '12:00', end_time: '18:00', break_minutes: 0, position: 'Bediening', note: '', published: false });`, ds);
    await shared.reload(); await shared.waitForSelector('[data-tab=planning]'); await shared.click('[data-tab=planning]');
    await shared.waitForSelector('[data-shift="dicht1"].atw');
    assert.match(await shared.getAttribute('[data-shift="dicht1"]', 'title'), /gesloten/);
  });
  await test('contracttype oproep: waarschuwing bij oproep korter dan 3 uur', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await shared.click('[data-tab=team]'); await shared.click('tr:has-text("Eva Smit")'); await shared.waitForSelector('dialog [name=contract_type]');
    await shared.selectOption('dialog [name=contract_type]', 'oproep');
    assert.ok(await shared.isHidden('dialog [data-minrow]'), 'minimum-veld hoort verborgen bij oproep');
    await shared.click('dialog button[value=save]'); await shared.waitForSelector('tr:has-text("Eva Smit"):has-text("Oproep")');
    const ds = await shared.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 14); const p = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); });
    await setDemoDb(shared, `const e = db.employees.find(x => x.name === 'Eva Smit'); db.shifts.push({ id: 'kort1', employee_id: e.id, date: a, start_time: '12:00', end_time: '14:00', break_minutes: 0, position: 'Bediening', note: '', published: false });`, ds);
    await shared.reload(); await shared.waitForSelector('[data-tab=planning]'); await shared.click('[data-tab=planning]');
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
    await p.click('[data-tab=planning]'); await p.waitForSelector('[data-act=publish]');
    assert.ok(!(await p.$('.cost')), 'shiftleader ziet loonkosten');
    await p.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('lijstweergave en meerdere diensten tegelijk verwijderen', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await shared.click('[data-tab=planning]'); await shared.click('[data-act=today]');
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
    await shared.reload(); await shared.waitForSelector('[data-tab=team]'); await shared.click('[data-tab=team]');
    await shared.click('tr:has-text("Lisa de Jong")'); await shared.waitForSelector('dialog [name=active]');
    await shared.uncheck('dialog [name=active]'); await shared.click('dialog button[value=save]');
    await shared.waitForSelector('dialog[open] [name=conflict][value=open]'); await shared.click('dialog[open] button[value=save]');
    await shared.waitForSelector('.toast:has-text("open dienst")');
    assert.equal((await demoDb(shared)).db.shifts.find(s => s.id === 'uit1').employee_id, null);
  });
  await test('nieuwe dienst: andere datum kiezen wordt ook echt opgeslagen', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await shared.click('[data-tab=planning]'); await shared.click('[data-act=today]'); await shared.click('[data-pv=grid]').catch(() => {});
    await shared.click('[data-act=next]'); await shared.click('[data-act=next]'); await shared.click('[data-act=next]');
    await shared.click('td.cell.editable >> nth=-1', { position: { x: 20, y: 40 } }); await shared.waitForSelector('dialog [name=date]');
    const d0 = await shared.inputValue('dialog [name=date]');
    const p = x => String(x).padStart(2, '0'); const dt = new Date(d0 + 'T12:00:00'); dt.setDate(dt.getDate() + (dt.getDay() === 0 ? -1 : 1));
    const d1 = dt.getFullYear() + '-' + p(dt.getMonth() + 1) + '-' + p(dt.getDate());
    await shared.fill('dialog [name=date]', d1); await shared.dispatchEvent('dialog [name=date]', 'change');
    const before = (await demoDb(shared)).db.shifts.length;
    await shared.click('dialog button[value=save]'); await shared.waitForTimeout(400);
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
    await shared.reload(); await shared.waitForSelector('[data-tab=planning]'); await shared.click('[data-tab=planning]'); await shared.click('[data-act=today]');
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
    await p.click('[data-tab=planning]'); await p.waitForSelector('table.grid');
    const total = (await demoDb(p)).db.shifts.filter(s => !s.published).length;
    if (total) assert.ok((await p.$$('.chip.concept')).length > 0 || await p.$('[data-act=publishall]'), 'shiftleader ziet geen concepten');
    await p.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('overzicht: kerngetallen, omzet invullen kleurt de kosten tegen het doel', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await shared.click('[data-tab=overzicht]'); await shared.waitForSelector('.kpis .kpi');
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
    await shared.click('[data-tab=planning]'); await shared.click('[data-act=today]'); await shared.click('[data-pv=grid]').catch(() => {});
    await shared.waitForSelector('tr.moneyrow [data-rev]');
    const p = watch(await browser.newPage({ viewport: { width: 1360, height: 900 } }));
    await p.goto(URL + '#personeel'); await p.waitForSelector('[data-demo]');
    await p.evaluate(s => localStorage.setItem(s.k, JSON.stringify(s.db)), await demoDb(shared));
    await p.reload(); await p.waitForSelector('[data-demo]'); await login(p, 'Daan');   // shiftleader (eerder ingesteld)
    await p.click('[data-tab=planning]'); await p.waitForSelector('table.grid');
    assert.ok(!(await p.$('tr.moneyrow')), 'shiftleader ziet omzet');
    assert.ok(!(await p.$('[data-tab=overzicht]')), 'shiftleader ziet het overzicht');
    await p.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('inplannen: je ziet direct wat de dienst kost', async () => {
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await shared.click('[data-tab=planning]'); await shared.click('[data-act=today]');
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
    await shared.click('[data-tab=overzicht]'); await shared.click('[data-annnew]'); await shared.waitForSelector('dialog [name=title]');
    await shared.fill('dialog [name=title]', 'Proeverij donderdag'); await shared.fill('dialog [name=body]', 'Om 15:00 in de keuken');
    await shared.click('dialog button[value=save]'); await shared.waitForSelector('.annlist .ann:has-text("Proeverij donderdag")');
    assert.match(await shared.textContent('.annlist .ann:has-text("Proeverij donderdag") [data-annreads]'), /Gelezen door 0 van \d+/);
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
    await shared.click('[data-tab=planning]'); await shared.click('[data-pv=grid]').catch(() => {}); await shared.waitForSelector('tr.moneyrow');
    await shared.emulateMedia({ media: 'print' });
    const vis = await shared.evaluate(() => [...document.querySelectorAll('.moneyrow, .cost, .viewbar')].some(e => getComputedStyle(e).display !== 'none'));
    await shared.emulateMedia({ media: 'screen' });
    assert.ok(!vis, 'vertrouwelijke kosten zichtbaar in de afdruk');
  });
  await test('prikbord: lange link maakt de pagina op de telefoon niet breder', async () => {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] }); const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    await p.click('[data-annnew]'); await p.fill('dialog [name=title]', 'Menukaart online'); await p.fill('dialog [name=body]', 'Zie https://www.lilou-ede.nl/' + 'menukaart-najaar-'.repeat(8) + 'definitief.pdf');
    await p.click('dialog button[value=save]'); await p.waitForSelector('.annlist .ann:has-text("Menukaart online") a[href^="https://www.lilou-ede.nl/"]');
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
    await p.click('[data-tab=team]'); await p.click('tr:has-text("Eva") >> nth=0'); await p.waitForSelector('dialog [data-futshifts]');
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
    await p.click('[data-tab=planning]'); await p.waitForSelector('[data-personpick]');
    await p.click('[data-personpick]'); await p.click('dialog [data-pick]:has-text("Noor")');
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
  await test('telefoon: geen enkel scherm loopt rechts van het scherm af', async () => {
    // elk element binnen #view moet binnen de schermbreedte blijven (behalve in bewust scrollende tabellen)
    const outside = p => p.evaluate(() => { const W = document.documentElement.clientWidth, out = [];
      document.querySelectorAll('#view *').forEach(e => { if (e.closest('.table-wrap')) return; const r = e.getBoundingClientRect(); if (r.width && r.right > W + 1) out.push(e.tagName + '.' + String(e.className).slice(0, 30)); });
      return out.slice(0, 3); });
    for (const [who, hash, tabs] of [['Mark', '#directie', ['overzicht', 'planning', 'klokken', 'aanvragen', 'team', 'uren', 'instellingen']], ['Sanne', '#personeel', ['mijn', 'planning', 'diensten', 'beschikbaar', 'aanvragen']]]) {
      const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } }); const p = watch(await ctx.newPage());
      await fresh(p, hash); await login(p, who);
      for (const t of tabs) {
        if (t === 'instellingen') await p.click('[data-gosettings]'); else await p.click(`[data-tab=${t}]`);
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
    await p.click('dialog button[value=save]'); await p.waitForSelector('.annlist .ann:has-text("Wijnkaart") [data-annview]');
    const before = ctx.pages().length;
    await p.click('.annlist .ann:has-text("Wijnkaart") [data-annview]');
    await p.waitForSelector('dialog.viewer[open] canvas.viewer-page', { timeout: 15000 });
    assert.strictEqual(ctx.pages().length, before, 'er ging een los tabblad open');
    const painted = await p.evaluate(() => { const c = document.querySelector('canvas.viewer-page'); const d = c.getContext('2d').getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data; return d[0] > 100 && d[1] < 80; });
    assert.ok(painted, 'pdf-pagina is niet getekend');
    await p.click('dialog.viewer [data-vclose]'); await p.waitForSelector('dialog.viewer', { state: 'detached' });
    await ctx.close(); pages.splice(pages.indexOf(p), 1);
  });
  await test('iPhone: medewerkervenster scrolt binnen het venster tot de knoppen', async () => {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const p = watch(await ctx.newPage());
    await fresh(p, '#directie'); await login(p, 'Mark');
    await p.click('[data-tab=team]'); await p.click('tr:has-text("Sanne") >> nth=0'); await p.waitForSelector('dialog[open]');
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
    await shared.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await shared.click('[data-tab=team]'); await shared.click('[data-new]');
    await shared.fill('dialog [name=name]', 'Test'); await shared.fill('dialog [name=email]', 'sanne@voorbeeld.nl'); await shared.click('dialog button[value=save]');
    await shared.waitForSelector('dialog .dlgerr');
  });

  await test('geen JavaScript-fouten', async () => assert.deepStrictEqual(errors, []));
  await browser.close(); server.close();
  console.log(`\n${passed} tests geslaagd${process.exitCode ? ', maar er zijn FOUTEN' : ''}`);
})().catch(e => { console.error(e); process.exit(1); });
