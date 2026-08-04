import fs from "fs";
import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage();

await page.goto(
  "https://www.primeleague.gg/de",
  {
    waitUntil: "domcontentloaded",
    timeout: 60000
  }
);

const data = {
  updated: new Date().toISOString(),
  title: await page.title(),
  url: page.url(),
  bodyLength: (await page.textContent("body"))?.length || 0
};

fs.writeFileSync(
  "primeleague.json",
  JSON.stringify(data, null, 2)
);

await browser.close();