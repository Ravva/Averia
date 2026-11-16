import { chromium } from "playwright";

async function main() {
  const base = process.env.BASE ?? "http://localhost:3000";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/preview`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const el = page.locator("section:has-text('Отсутствуют оценки'), .glass-surface:has-text('Отсутствуют оценки')").last();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await el.screenshot({ path: "absent.png" });
  await browser.close();
}

main();
