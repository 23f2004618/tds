import { chromium } from 'playwright';

const seeds = [86,87,88,89,90,91,92,93,94,95];
const urls = seeds.map(s => `https://sanand0.github.io/tdsdata/js_table/?seed=${s}`);

function extractNumbersFromText(txt) {
  // Match integers and decimals, with optional commas and signs
  const re = /[-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?|[-+]?\d+(?:\.\d+)?/g;
  const matches = txt.match(re) || [];
  return matches.map(m => Number(m.replace(/,/g, ''))).filter(v => !Number.isNaN(v));
}

async function sumTablesOnPage(page) {
  // Wait for at least one table to appear; tables are generated dynamically
  await page.waitForSelector('table', { timeout: 15000 });
  // Get all table text content
  const tableTexts = await page.$$eval('table', nodes => nodes.map(n => n.innerText));
  let sum = 0;
  for (const t of tableTexts) {
    const nums = (t.match(/[-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?|[-+]?\d+(?:\.\d+)?/g) || [])
      .map(m => Number(m.replace(/,/g, '')))
      .filter(v => !Number.isNaN(v));
    sum += nums.reduce((a,b) => a + b, 0);
  }
  return sum;
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  let grandTotal = 0;

  for (const url of urls) {
    console.log(`Visiting: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    // In case scripts populate tables after DOMContentLoaded, give a small buffer
    await page.waitForTimeout(500);
    const subtotal = await sumTablesOnPage(page);
    console.log(`Subtotal for ${url}: ${subtotal}`);
    grandTotal += subtotal;
  }

  console.log(`GRAND TOTAL: ${grandTotal}`);
  await browser.close();

  // Ensure non-zero exit so logs always show even in CI artifacts
  process.exit(0);
}

main().catch(err => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
