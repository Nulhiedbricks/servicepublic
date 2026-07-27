import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { computeEcoIndex, getEcoIndexGrade } from "ecoindex";

const BASE = process.env.BASE_URL;

if (!BASE) {
  console.error("BASE_URL manquant.");
  process.exit(1);
}

const visited = new Set();

const queue = [
  "/",
  "/pages/carte-identite/etape-1.html",
  "/pages/acte-naissance/etape-1.html",
  "/pages/inscription-electorale/etape-1.html",
];

const results = [];

mkdirSync("reports", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

let requests = 0;
let totalSize = 0;

page.on("request", () => {
  requests++;
});

page.on("response", async (response) => {
  try {
    const buffer = await response.body();
    totalSize += buffer.length;
  } catch {
    // Certaines réponses (stream, cache...) n'ont pas de body accessible
  }
});

while (queue.length) {
  const route = queue.shift();

  if (visited.has(route)) continue;

  visited.add(route);

  requests = 0;
  totalSize = 0;

  console.log("Visite :", route);

  try {
    await page.goto(BASE + route, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const links = await page.$$eval("a", (as) =>
      as
        .map((a) => a.getAttribute("href"))
        .filter(Boolean)
    );

    for (const link of links) {
      if (
        link.startsWith("/") &&
        !visited.has(link) &&
        !queue.includes(link)
      ) {
        queue.push(link);
      }
    }

    const dom = await page.evaluate(() =>
      document.querySelectorAll("*").length
    );

    const size = Number((totalSize / 1024).toFixed(2));

    const score = computeEcoIndex(
      dom,
      requests,
      size
    );

    const grade = getEcoIndexGrade(score);

    results.push({
      page: route,
      score,
      grade,
      size,
      requests,
      dom,
    });

    console.log(
      `${route} -> ${score} (${grade}) | ${dom} DOM | ${requests} requêtes | ${size} Ko`
    );

  } catch (err) {
    console.error(
      `Erreur sur ${route} : ${err.message}`
    );
  }
}

await browser.close();

writeFileSync(
  "reports/pages.json",
  JSON.stringify([...visited], null, 2)
);

writeFileSync(
  "reports/results.json",
  JSON.stringify(results, null, 2)
);

if (results.length === 0) {
  console.error("Aucun résultat EcoIndex obtenu.");
  process.exit(1);
}

console.log(
  `${visited.size} page(s) analysée(s).`
);