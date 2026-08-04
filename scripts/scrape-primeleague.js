import fs from "fs";
import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage();

await page.goto(
  "https://www.primeleague.gg/de/coverages/33286-1-liga-summer-split-2026",
  {
    waitUntil: "networkidle",
    timeout: 60000
  }
);

const body = await page.textContent("body");

fs.writeFileSync(
  "primeleague.json",
  JSON.stringify(
    {
      updated: new Date().toISOString(),
      title: await page.title(),
      url: page.url(),
      body
    },
    null,
    2
  )
);

await browser.close();