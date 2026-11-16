import { chromium } from "playwright";

async function main() {
  const base = process.env.BASE ?? "http://localhost:3000";
  const out = process.env.OUT ?? "preview.png";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/preview`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
}

main();
