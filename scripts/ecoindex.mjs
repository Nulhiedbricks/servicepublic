import { readFileSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL;
if (!BASE) {
  console.error("BASE_URL manquant.");
  process.exit(1);
}

const pages = JSON.parse(readFileSync("reports/pages.json", "utf-8"));
const results = [];

for (const page of pages) {
  const url = BASE + page;
  const apiUrl = `https://ecoindex.fr/api/?url=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();

    results.push({
      page,
      score: data.score,
      grade: data.grade,
      size: data.size,
      requests: data.requests,
      dom: data.dom,
    });

    console.log(`${page} -> score ${data.score} (${data.grade})`);
  } catch (err) {
    console.error(`Échec de mesure pour ${page} : ${err.message}`);
  }

  // Petite pause pour rester correct vis-à-vis de l'API publique.
  await new Promise((r) => setTimeout(r, 500));
}

writeFileSync("reports/results.json", JSON.stringify(results, null, 2));

if (results.length === 0) {
  console.error("Aucun résultat EcoIndex obtenu.");
  process.exit(1);
}
