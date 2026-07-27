import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";

const MIN_SCORE = Number(process.env.ECOINDEX_MIN_SCORE ?? 75);

const results = JSON.parse(
  readFileSync("reports/results.json", "utf-8")
);

const average =
  results.reduce((s, r) => s + r.score, 0) / results.length;


// --- Rapport HTML lisible pour un humain ---
let html = `<html>
<head>
<meta charset="utf-8">
<title>Rapport EcoIndex</title>
</head>
<body>

<h1>Rapport EcoIndex</h1>

<h2>Moyenne : ${average.toFixed(2)}</h2>

<table border="1">
<tr>
<th>Page</th>
<th>Score</th>
<th>Note</th>
<th>Poids (Ko)</th>
<th>Requêtes</th>
</tr>

${results
    .map(
      (r) =>
        `<tr>
        <td>${r.page}</td>
        <td>${r.score}</td>
        <td>${r.grade}</td>
        <td>${r.size}</td>
        <td>${r.requests}</td>
      </tr>`
    )
    .join("\n")}

</table>

</body>
</html>`;

writeFileSync(
  "reports/index.html",
  html
);


// --- Historique ---
const historyDir = "eco-metrics";
const historyPath = `${historyDir}/history-ecoindex.json`;

mkdirSync(historyDir, {
  recursive: true,
});

const history = existsSync(historyPath)
  ? JSON.parse(readFileSync(historyPath, "utf-8"))
  : [];

history.push({
  date: new Date().toISOString(),
  commit: process.env.GITHUB_SHA?.slice(0, 7) ?? "local",
  average: Number(average.toFixed(2)),
  pages: results.map((r) => ({
    page: r.page,
    score: r.score,
    grade: r.grade,
  })),
});

writeFileSync(
  historyPath,
  JSON.stringify(history, null, 2)
);


// --- Porte de qualité ---
const failed = results.find(
  (r) => r.score < MIN_SCORE
);

if (failed) {
  console.error(
    `Score EcoIndex trop bas sur ${failed.page} : ${failed.score} < ${MIN_SCORE}`
  );
  process.exit(1);
}

console.log(
  `Moyenne EcoIndex : ${average.toFixed(2)} (seuil : ${MIN_SCORE})`
);