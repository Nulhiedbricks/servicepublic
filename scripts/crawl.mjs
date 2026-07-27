import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL;
if (!BASE) {
  console.error("BASE_URL manquant.");
  process.exit(1);
}

const visited = new Set();
const queue = ["/"];

const browser = await chromium.launch();
const page = await browser.newPage();

while (queue.length) {
  const route = queue.shift();
  if (visited.has(route)) continue;
  visited.add(route);

  console.log("Visite :", route);
  await page.goto(BASE + route);

  const links = await page.$$eval("a", (as) =>
    as.map((a) => a.getAttribute("href"))
  );

  for (const link of links) {
    // On ne garde que les liens internes non déjà connus, pour éviter
    // de repartir en boucle sur des ancres ou des liens externes.
    if (link && link.startsWith("/") && !visited.has(link)) {
      queue.push(link);
    }
  }
}

await browser.close();

mkdirSync("reports", { recursive: true });
writeFileSync("reports/pages.json", JSON.stringify([...visited], null, 2));
console.log(`${visited.size} page(s) découverte(s).`);
