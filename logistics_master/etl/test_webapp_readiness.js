#!/usr/bin/env node
/*
 * End-to-end test of the Logistics Readiness web page (logistics-readiness.html).
 *
 *   node logistics_master/etl/test_webapp_readiness.js [screenshot_dir]
 *
 * - opens the page from file:// with the ETL data file (same as a user double-clicking it)
 * - fails on any console error / page error
 * - recomputes KPIs independently from output/webapp/logistics_readiness_data.json and
 *   compares them with what the page computed, for several filter combinations
 * - opens a package drawer and checks gates, detail blocks and items render
 * - checks the "load data" empty state on a copy of the page without the data file
 * - writes desktop / mobile screenshots
 * Requires Playwright (preinstalled in the Claude Code cloud container).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const PAGE = path.join(ROOT, 'logistics-readiness.html');
const DATA = path.join(ROOT, 'logistics_master', 'output', 'webapp', 'logistics_readiness_data.json');
const SHOTS = process.argv[2] || path.join(os.tmpdir(), 'lr_shots');
fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };
const close = (a, b, tol = 1e-6) => a != null && b != null && Math.abs(a - b) <= tol;

// ---------------------------------------------------------------- independent expectations
const raw = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const cols = raw.packages.cols;
const P = raw.packages.rows.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
function expected(filter) {
  const F = P.filter((p) => Object.entries(filter).every(([k, v]) => p[k] === v));
  const t = F.reduce((s, p) => s + (p.gross_weight_kg || 0) / 1000, 0);
  const byStatus = {};
  raw.status_ref.forEach((s) => { byStatus[s.code] = F.filter((p) => p.readiness_status === s.code).length; });
  const idxC = F.length ? F.reduce((s, p) => s + p.readiness_score, 0) / F.length : null;
  const idxT = t ? F.reduce((s, p) => s + p.readiness_score * (p.gross_weight_kg || 0) / 1000, 0) / t : null;
  return { packages: F.length, tonnage_t: +t.toFixed(3), index_count: idxC, index_tonnage: idxT, by_status: byStatus };
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.googleapis|cdnjs|ERR_|net::/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('file://' + PAGE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.LogisticsReadiness && window.LogisticsReadiness.state.pk.length > 0, null, { timeout: 15000 });

  // ---- numbers vs independent computation
  const cases = [
    [{}, {}],
    [{ batch: 'B5' }, { batch_id: 'B5' }],
    [{ batch: 'B4', category: 'P5' }, { batch_id: 'B4', category: 'P5' }],
    [{ status: 'INSPECTED_MDR_PENDING' }, { readiness_status: 'INSPECTED_MDR_PENDING' }],
  ];
  for (const [uiFilter, dataFilter] of cases) {
    const got = await page.evaluate((f) => {
      const L = window.LogisticsReadiness;
      Object.assign(L.state.filters, { batch: 'ALL', category: 'ALL', system: 'ALL', status: 'ALL', mdr: 'ALL', location: 'ALL', q: '' }, f);
      L.setFilter('q', '');
      return L.summary();
    }, uiFilter);
    const exp = expected(dataFilter);
    const label = JSON.stringify(uiFilter);
    check(got.packages === exp.packages, `${label} packages ${got.packages} == ${exp.packages}`);
    check(close(got.tonnage_t, exp.tonnage_t, 0.001), `${label} tonnage ${got.tonnage_t} == ${exp.tonnage_t}`);
    check(close(got.index_count, exp.index_count, 1e-9) || (got.index_count == null && exp.index_count == null), `${label} readiness index (count) ${got.index_count && got.index_count.toFixed(2)}`);
    check(close(got.index_tonnage, exp.index_tonnage, 1e-9) || (got.index_tonnage == null && exp.index_tonnage == null), `${label} readiness index (tonnage) ${got.index_tonnage && got.index_tonnage.toFixed(2)}`);
    check(JSON.stringify(got.by_status) === JSON.stringify(exp.by_status), `${label} status distribution ${JSON.stringify(got.by_status)}`);
  }

  // ---- DOM shows the filtered count and KPI cards
  await page.evaluate(() => { const L = window.LogisticsReadiness; Object.assign(L.state.filters, { batch: 'ALL', category: 'ALL', status: 'ALL' }); L.setFilter('q', ''); });
  const kpis = await page.$$eval('#kpiRow .db-kpi-card', (els) => els.length);
  check(kpis === 6, `6 KPI cards rendered (${kpis})`);
  const rows = await page.$$eval('#registerTable tbody tr', (els) => els.length);
  check(rows === 25, `register shows first page of 25 rows (${rows})`);
  const gateRows = await page.$$eval('#gateList .gate-row', (els) => els.length);
  check(gateRows === 6, `6 readiness gates rendered (${gateRows})`);
  const curvePts = await page.$$eval('#curveSvg circle', (els) => els.length);
  check(curvePts > 5, `receiving S-curve has ${curvePts} dated points`);
  const actions = await page.$$eval('#actionsGrid .action-card', (els) => els.length);
  check(actions === 6, `6 action cards (${actions})`);

  // ---- UI interaction: chip filter + search
  await page.click('[data-filter="batch"][data-value="B5"]');
  const b5 = await page.evaluate(() => window.LogisticsReadiness.summary().packages);
  check(b5 === expected({ batch_id: 'B5' }).packages, `clicking "Batch 5" chip filters to ${b5}`);
  await page.click('#btnReset');
  await page.fill('#fSearch', 'jljx-4-34');
  await page.waitForTimeout(400);
  const s1 = await page.evaluate(() => window.LogisticsReadiness.summary().packages);
  check(s1 === 1, `search "jljx-4-34" (lower-case) finds the split package (${s1})`);
  await page.click('#btnReset');

  await page.screenshot({ path: path.join(SHOTS, 'desktop_full.png'), fullPage: true });
  await page.locator('#overview').screenshot({ path: path.join(SHOTS, 'desktop_overview.png') });
  await page.locator('#breakdown').screenshot({ path: path.join(SHOTS, 'desktop_breakdown.png') });

  // ---- drawer: split package with sub-packages and items
  const splitId = await page.evaluate(() => window.LogisticsReadiness.state.pk.find((p) => p.split_sub_packages > 0).package_id);
  await page.evaluate((id) => window.LogisticsReadiness.showPackage(id), splitId);
  await page.waitForSelector('#drawer.open');
  const blocks = await page.$$eval('#drawerBody .block-card', (els) => els.length);
  check(blocks === 8, `split package drawer lists parent + 7 sub-package blocks (${blocks})`);
  await page.click('#drawerBody .block-card.child .block-head');
  const itemRows = await page.$$eval('#drawerBody .block-card.child.open tbody tr', (els) => els.length);
  check(itemRows > 0, `expanding a sub-package shows its material items (${itemRows})`);
  const gatesInDrawer = await page.$$eval('#drawerBody .gate-check', (els) => els.length);
  check(gatesInDrawer === 4, `drawer shows 4 gate checks (${gatesInDrawer})`);
  await page.screenshot({ path: path.join(SHOTS, 'desktop_drawer.png') });
  await page.keyboard.press('Escape');

  // ---- mobile layout (no horizontal page scroll)
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
  const m = await mctx.newPage();
  m.on('pageerror', (e) => errors.push('mobile: ' + e));
  await m.goto('file://' + PAGE, { waitUntil: 'load' });
  await m.waitForFunction(() => window.LogisticsReadiness && window.LogisticsReadiness.state.pk.length > 0);
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 1, `mobile: no horizontal page scroll (overflow ${overflow}px)`);
  await m.screenshot({ path: path.join(SHOTS, 'mobile_full.png'), fullPage: true });
  await mctx.close();

  // ---- empty state: copy page + JS without the data file
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lr-empty-'));
  fs.mkdirSync(path.join(tmp, 'assets', 'js'), { recursive: true });
  fs.copyFileSync(PAGE, path.join(tmp, 'logistics-readiness.html'));
  fs.copyFileSync(path.join(ROOT, 'assets', 'js', 'logistics-readiness.js'), path.join(tmp, 'assets', 'js', 'logistics-readiness.js'));
  const e = await ctx.newPage();
  e.on('pageerror', (err) => errors.push('empty: ' + err));
  await e.goto('file://' + path.join(tmp, 'logistics-readiness.html'), { waitUntil: 'load' });
  const emptyShown = await e.$eval('#emptyState', (el) => getComputedStyle(el).display !== 'none');
  const overviewHidden = await e.$eval('#overview', (el) => getComputedStyle(el).display === 'none');
  check(emptyShown && overviewHidden, 'without data file the page shows the "load data" panel only');
  await e.setInputFiles('#fileInput', DATA);
  await e.waitForFunction(() => document.body.classList.contains('has-data'), null, { timeout: 15000 });
  const loaded = await e.evaluate(() => window.LogisticsReadiness.summary().packages);
  check(loaded === P.length, `loading the JSON via the file picker shows all ${loaded} packages`);
  await e.screenshot({ path: path.join(SHOTS, 'empty_then_loaded.png') });

  check(errors.length === 0, `no console / page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(`\nScreenshots: ${SHOTS}`);
  console.log(failures ? `${failures} FAILURE(S)` : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
