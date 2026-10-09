// Full-page screenshot: node screenshot.mjs <url> [label] [width]
// Saves to "./temporary screenshots/screenshot-N[-label].png" (auto-incremented, never overwritten).
// Uses Playwright if installed, otherwise Puppeteer.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.join(process.cwd(), 'noop.js'));
const [url = 'http://localhost:3000', label, width = '1440'] = process.argv.slice(2);
const dir = path.resolve('temporary screenshots');
fs.mkdirSync(dir, { recursive: true });
const n = fs.readdirSync(dir).map(f => +(/^screenshot-(\d+)/.exec(f)?.[1] ?? 0)).reduce((a, b) => Math.max(a, b), 0) + 1;
const out = path.join(dir, `screenshot-${n}${label ? '-' + label : ''}.png`);
const viewport = { width: Number(width), height: 900 };


// Scroll through the page so scroll-triggered animations and lazy content render.
const autoScroll = async (page) => {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 400));
  });
};

let lib;
try { lib = require('playwright'); } catch {
  try { lib = require('puppeteer'); } catch {
    console.error('Install playwright or puppeteer first (npm i -D playwright).'); process.exit(1);
  }
}

if (lib.chromium) {
  const exe = process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  let browser;
  try { browser = await lib.chromium.launch(exe ? { executablePath: exe } : {}); }
  catch { browser = await lib.chromium.launch(); }
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'networkidle' });
  await autoScroll(page);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
} else {
  const browser = await lib.launch();
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: 'networkidle0' });
  await autoScroll(page);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
}
console.log(out);
