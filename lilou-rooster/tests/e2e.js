// Browsertests voor de rooster-app (demo-modus). Draai met: node tests/e2e.js
// Start een eigen webserver, doorloopt de belangrijkste stromen als medewerker en directie
// en stopt met een foutcode zodra iets niet klopt.
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
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
    await shared.click('dialog button[value=save]'); await shared.waitForTimeout(300);
    await shared.click('[data-act=publish]'); await shared.click('dialog button[value=save]');
    await shared.waitForSelector('.toast:has-text("per mail")');
    await shared.click('[data-act=today]');
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
