// Logistics PMIS embed · browser regression test (Playwright + Chromium)
//   node test_pmis_embed.js <preview.html> <reference.json> <csv-dir> [<screenshot-dir>]
// Prints one line "RESULT {json}" that run_pmis_tests.py checks.
//   offline : Google not reachable → embedded data; every package must match PACKAGE_READINESS of the ETL
//   pages   : the 4 pages, drill-downs, split package → block → material lines, search, filters, tonnage, dark theme
//   live    : the Google Sheet tabs (gviz CSV, simulated) with one package edited → status follows the sheet
//   phone   : iPhone 13 layout without horizontal scrolling
const { chromium, devices } = require('playwright');
const fs = require('fs');

const [file, refPath, csvDir, shots] = process.argv.slice(2);
const REF = JSON.parse(fs.readFileSync(refPath, 'utf8'));
const OUT = { errors: [] };
if (shots) fs.mkdirSync(shots, { recursive: true });

async function open(ctxOpts, sheet) {
  const b = await chromium.launch(), ctx = await b.newContext(ctxOpts), p = await ctx.newPage();
  p.on('pageerror', (e) => OUT.errors.push('pageerror: ' + String(e).slice(0, 300)));
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) OUT.errors.push('console: ' + m.text().slice(0, 300)); });
  await p.route(/^https?:\/\//, (r) => {
    const m = /docs\.google\.com\/spreadsheets\/d\/[^/]+\/gviz\/tq\?.*sheet=([^&]+).*tqx=out:csv/.exec(r.request().url());
    if (sheet && m && sheet[decodeURIComponent(m[1])] != null) return r.fulfill({ status: 200, contentType: 'text/csv', body: sheet[decodeURIComponent(m[1])] });
    return r.abort();
  });
  await p.goto('file://' + file, { waitUntil: 'load' });
  let f = null;
  for (let i = 0; i < 150 && !f; i++) { f = p.frames().find((x) => x.url() === 'about:srcdoc'); if (!f) await p.waitForTimeout(100); }
  if (!f) throw new Error('dashboard frame not created');
  await f.waitForFunction(() => window.__pmLogistics && window.__pmLogistics.model(), null, { timeout: 20000 });
  return { b, p, f };
}
const shot = async (p, name, full) => { if (shots) await p.screenshot({ path: `${shots}/${name}.png`, fullPage: !!full }); };
const rows = (f, sel) => f.$$eval(sel, (r) => r.length);

(async () => {
  // ---------------- offline: embedded data vs the ETL
  let { b, p, f } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await p.waitForTimeout(800);
  OUT.offline = await f.evaluate((REF) => {
    const R = window.__pmLogistics.model(), ETL = { READY: 'READY_FOR_CONSTRUCTION', PEND: 'INSPECTED_MDR_PENDING', SITE: 'ON_SITE_AWAITING_INSPECTION', AWAIT: 'AWAITING_RECEIVING', BLOCK: 'BLOCKED' };
    const iso = (t) => (t == null ? null : new Date(t).toISOString().slice(0, 10)), d = { st: 0, sc: 0, recv: 0, mdr: 0, loc: 0, lg: 0, act: 0, open: 0, missing: 0 }, ex = [];
    R.pk.forEach((p) => {
      const r = REF.pk[p.id]; if (!r) { d.missing++; return; }
      const bad = [];
      if (ETL[p.st] !== r.st) bad.push('st'); if (Math.abs(p.score - r.sc) > 0.01) bad.push('sc'); if (iso(p.recv) !== r.recv) bad.push('recv');
      if (p.mdr !== r.mdr) bad.push('mdr'); if ((p.loc || null) !== (r.loc || null)) bad.push('loc'); if ((p.lg || null) !== (r.lg || null)) bad.push('lg');
      if (p.act !== r.act) bad.push('act'); if (p.openN !== r.open) bad.push('open');
      bad.forEach((k) => d[k]++); if (bad.length && ex.length < 5) ex.push(p.no + ': ' + bad.join(','));
    });
    return { packages: R.pk.length, expected: Object.keys(REF.pk).length, issues: R.iss.length, mism: R.mism, dataDate: iso(R.dd), diff: d, examples: ex };
  }, REF);
  await shot(p, '01_welcome');
  await f.click('.wel-go'); await p.waitForTimeout(1200); await shot(p, '02_overview', true);
  const P = {};
  P.overviewPanels = await rows(f, '#o-st .stp'); P.insights = await rows(f, '#o-ins .insr'); P.checks = await rows(f, '#o-chk .chkr');
  P.locRows = await rows(f, '#o-loc .lr');
  const locName = await f.$eval('#o-loc .lr .tx', (e) => e.firstChild.textContent);
  await f.click('#o-loc .lr'); await p.waitForTimeout(1200); await shot(p, '02b_location_list', true);
  P.locOpen = { loc: locName, page: await f.evaluate(() => window.__pmLogistics.state.page), rows: await f.evaluate(() => document.querySelectorAll('#p-tbl tbody tr.go').length + 0) };
  P.locButtons = await rows(f, '#p-loc button');
  await f.click('#p-loc [data-v="ALL"]'); await p.waitForTimeout(500);
  await f.click('#pg3 .nav [data-go="1"]'); await p.waitForTimeout(800);
  await f.click('#pg1 .nav [data-go="2"]'); await p.waitForTimeout(1200); await shot(p, '03_receiving', true);
  P.receivingGroups = await rows(f, '#r-tbl tbody tr.go');
  P.chartSvg = await rows(f, '#r-chart svg');
  await f.click('#r-view [data-v="cum"]'); await p.waitForTimeout(600);
  await f.click('#r-tbl tbody tr.go'); await p.waitForTimeout(600); await f.click('#r-tbl tbody tr.go'); await p.waitForTimeout(600);
  P.receivingDrillPackages = await rows(f, '#r-tbl tbody tr.go');
  await f.click('#pg2 .nav [data-go="3"]'); await p.waitForTimeout(1200); await shot(p, '04_packing', true);
  P.packingRows = await rows(f, '#p-tbl tbody tr.go');
  const split = Object.keys(REF.splitBlocks)[0];
  await f.evaluate((id) => window.__pmLogistics.openPackage(id), split); await p.waitForTimeout(1000);
  P.splitBlocks = await rows(f, '#p-tbl tbody tr.go'); P.splitBlocksExpected = REF.splitBlocks[split];
  await f.click('#p-tbl tbody tr.go:nth-child(2)'); await p.waitForTimeout(1500); await shot(p, '05_items', true);
  P.items = await f.evaluate(() => { const s = window.__pmLogistics.state, R = window.__pmLogistics.model(); return { blk: s.blk, n: ((R.items || {})[s.blk] || []).length, loaded: R.itemsN }; });
  P.itemsExpected = REF.items[P.items.blk]; P.itemsTotal = REF.itemsTotal;
  await f.evaluate(() => { window.__pmLogistics.state.pkg = null; });
  P.search = {};
  for (const q of REF.searches) { await f.fill('#p-q', q); await p.waitForTimeout(700); P.search[q] = await rows(f, '#p-tbl tbody tr.go'); }
  await f.fill('#p-q', ''); await p.waitForTimeout(500);
  await f.click('#p-status [data-v="PEND"]'); await p.waitForTimeout(600); P.pendingRows = await rows(f, '#p-tbl tbody tr.go');
  await f.click('#p-status [data-v="ALL"]'); await p.waitForTimeout(400);
  await f.click('#pg3 .nav [data-go="4"]'); await p.waitForTimeout(1200); await shot(p, '06_exceptions', true);
  P.issueTypes = await rows(f, '#x-bars .hbr');
  await f.click('#x-bars .hbr'); await p.waitForTimeout(600); P.issueRowsFiltered = await rows(f, '#x-tbl tbody tr');
  await f.click('#pg4 .nav [data-go="1"]'); await p.waitForTimeout(800);
  await f.click('#pg1 .basisseg [data-v="t"]'); await p.waitForTimeout(800);
  P.tonnage = await f.$$eval('#o-st .stp-big small', (s) => s.map((x) => x.textContent.trim()));
  await p.click('#pmhub .hb-tg'); await p.waitForTimeout(1200);
  P.theme = await f.$eval('#pmis', (e) => e.getAttribute('data-theme')); await shot(p, '07_overview_dark', true);
  OUT.pages = P;
  await b.close();

  // ---------------- live: the Google Sheet (gviz CSV) with one package edited
  if (csvDir) {
    const sheet = {};
    for (const t of ['Packages', 'Detail', 'Items', 'Issues']) sheet[t] = fs.readFileSync(`${csvDir}/${t}.csv`, 'utf8');
    const L = sheet.Packages.split('\n'), H = L[0].slice(1, -1).split('","'), ix = (k) => H.indexOf(k);
    let edited = null;
    for (let k = 1; k < L.length && !edited; k++) {
      const c = L[k].slice(1, -1).split('","');
      if (c[ix('Readiness Status (ETL)')] === 'AWAITING_RECEIVING' && /\(APV\)/.test(c[ix('MDR Status')]) && !c[ix('Site Note')]) {
        c[ix('RFS Material Receiving')] = 'RFS-TEST-001'; c[ix('Inspection Date')] = REF.dataDate; L[k] = '"' + c.join('","') + '"'; edited = c[ix('Package No')];
      }
    }
    sheet.Packages = L.join('\n');
    ({ b, p, f } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, sheet));
    await f.waitForFunction(() => /Updated/.test((document.querySelector('.fresh .ft') || {}).textContent || ''), null, { timeout: 20000 });
    OUT.live = await f.evaluate((no) => {
      const R = window.__pmLogistics.model(), x = R.pk.find((q) => q.no === no);
      return { edited: no, status: x && x.st, etl: x && x.etlSt, mism: R.mism, chip: (document.querySelector('.src') || {}).textContent || '', items: typeof R.itmIn };
    }, edited);
    await b.close();
  }

  // ---------------- phone
  ({ b, p, f } = await open({ ...devices['iPhone 13'] }));
  await p.waitForTimeout(800); await f.click('.wel-go'); await p.waitForTimeout(1200); await shot(p, '08_phone_overview', true);
  const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  OUT.phone = { scrollWidth: w[0], innerWidth: w[1] };
  await b.close();
  console.log('RESULT ' + JSON.stringify(OUT));
})().catch((e) => { console.log('RESULT ' + JSON.stringify({ fatal: String(e).slice(0, 500), errors: OUT.errors })); process.exit(1); });
