import { chromium } from "playwright";

const FN = `() => {
  const out = [];
  const main = document.querySelector("main");
  const push = (label, el) => {
    if (!el) { out.push({ label, missing: true }); return; }
    const r = el.getBoundingClientRect();
    out.push({ label, left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top + window.scrollY), bottom: Math.round(r.bottom + window.scrollY), h: Math.round(r.height) });
  };
  const cards = [...main.querySelectorAll(".glass-surface")];
  cards.forEach((c, i) => {
    const h = c.querySelector("h3,h2");
    push("card:" + (h ? h.textContent.slice(0,30) : i), c);
  });
  const h2s = [...main.querySelectorAll("h2")];
  h2s.forEach(h => push("h2:" + h.textContent.slice(0,30), h));
  const tables = [...main.querySelectorAll("table")];
  tables.forEach(t => push("table", t));
  return out;
}`;

async function main() {
  const base = process.env.BASE ?? "http://localhost:3000";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/preview`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const rows = (await page.evaluate(`(${FN})()`)) as any[];
  for (const r of rows) console.log(JSON.stringify(r));
  await browser.close();
}

main();
