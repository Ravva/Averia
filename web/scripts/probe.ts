import { chromium } from "playwright";

const FN = `() => {
  const main = document.querySelector("main");
  const out = [];
  let prev = null;
  for (const c of main.children) {
    const r = c.getBoundingClientRect();
    const h3 = c.querySelector("h3");
    const h2 = c.querySelector("h2");
    const label = (h3 && h3.textContent) || (h2 && h2.textContent) || "(hero)";
    const gap = prev === null ? null : Math.round(r.top - prev);
    out.push({ label: label.slice(0, 36), top: Math.round(r.top), h: Math.round(r.height), gapAbove: gap, cls: (c.className||"").toString().slice(0,50) });
    prev = r.bottom;
  }
  // inner gaps of the two-card grid
  const grid = main.querySelector(".gap-4");
  if (grid) {
    const cards = [...grid.children].map(c => { const r = c.getBoundingClientRect(); return { t: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) }; });
    out.push({ label: "[2-col grid]", cards });
  }
  return out;
}`;

async function main() {
  const base = process.env.BASE ?? "http://localhost:3000";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/preview`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const rows = (await page.evaluate(`(${FN})()`)) as any[];
  for (const r of rows) {
    if (r.cards) { console.log(JSON.stringify(r, null, 1)); continue; }
    console.log(`gapAbove=${String(r.gapAbove).padStart(4)}  h=${String(r.h).padStart(4)}  "${r.label}"  ${r.cls}`);
  }
  await browser.close();
}

main();
