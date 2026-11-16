import { chromium } from "playwright";

async function main() {
  const base = process.env.BASE ?? "http://localhost:3000";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/preview`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const txt = await page.evaluate(() => {
    const card = [...document.querySelectorAll(".glass-surface")].find(c => c.textContent?.includes("Отсутствуют оценки")) as HTMLElement | undefined;
    return card ? card.innerText : "(not found)";
  });
  console.log("---- ABSENT CARD ----");
  console.log(txt);
  console.log("---- SEARCH 'кубик' ----");
  const body = await page.evaluate(() => document.body.innerText);
  console.log(body.includes("кубик") ? "FOUND" : "not found");
  console.log(body.includes("ученик без оценок") ? "FOUND 'ученик без оценок'" : "no 'ученик без оценок'");
  console.log(body.includes("пропуск") ? "FOUND 'пропуск'" : "no 'пропуск'");
  await browser.close();
}

main();
