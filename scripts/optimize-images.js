#!/usr/bin/env node
/**
 * optimize-images.js
 * ------------------------------------------------------------
 * Script d'optimisation d'images pour l'écoconception numérique.
 * - Redimensionnement (une ou plusieurs tailles)
 * - Conversion multi-format (png, webp, avif)
 * - Compression maximale (lossless ou quality-based selon le format)
 * - Suppression des métadonnées (EXIF, ICC...) par défaut
 *
 * Dépendance : sharp (binding natif libvips, très performant en batch)
 *
 * Usage :
 *   node optimize-images.js --input ./images --output ./dist \
 *     --formats webp,avif --sizes 400x,800x,1200x --quality 80 --max-compression
 *
 * Options :
 *   --input, -i          Dossier ou liste de fichiers séparés par des virgules (obligatoire)
 *   --output, -o         Dossier de sortie (def: ./optimized)
 *   --formats, -f        Liste de formats séparés par des virgules parmi: png,webp,avif
 *                        (def: même format que le fichier source)
 *   --sizes, -s          Liste de tailles séparées par des virgules, format LxH
 *                        Exemples: 300x400  |  800x  (largeur seule, hauteur auto)
 *                                  x600     (hauteur seule, largeur auto)
 *                                  orig     (conserve la taille d'origine)
 *                        (def: orig)
 *   --fit                Mode de redimensionnement: inside|cover|contain|fill (def: inside)
 *                        Ignoré si --keep-ratio est actif (voir ci-dessous).
 *   --keep-ratio          Force la conservation du ratio d'origine, même si --sizes
 *                        fournit une largeur ET une hauteur (pas de recadrage/déformation).
 *                        Actif par défaut. Utiliser --no-keep-ratio pour le désactiver
 *                        et laisser --fit gérer librement (cover/contain/fill peuvent
 *                        recadrer ou déformer l'image).
 *   --keep-metadata       Conserve les métadonnées (EXIF, profils ICC, GPS...).
 *                        Par défaut, elles sont supprimées (plus frugal, moins de poids
 *                        et pas de données personnelles embarquées type géolocalisation).
 *   --quality, -q         Qualité 1-100 pour webp/avif (def: 80)
 *   --max-compression, -m Pousse tous les réglages au maximum de compression (plus lent)
 *   --help, -h            Affiche cette aide
 * ------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SUPPORTED_INPUT_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.tiff', '.gif'];
const SUPPORTED_OUTPUT_FORMATS = ['png', 'webp', 'avif'];

// ---------------------------------------------------------------
// Parsing des arguments CLI (volontairement sans dépendance externe
// type commander/yargs, dans un souci de frugalité)
// ---------------------------------------------------------------
function printHelp() {
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n/, ''));
}

function parseArgs(argv) {
  const args = {
    input: null,
    output: './optimized',
    formats: null,
    sizes: ['orig'],
    fit: 'inside',
    keepRatio: true,
    keepMetadata: false,
    quality: 80,
    maxCompression: false,
  };

  const aliasMap = {
    '-i': '--input', '-o': '--output', '-f': '--formats',
    '-s': '--sizes', '-q': '--quality', '-m': '--max-compression',
    '-h': '--help',
  };

  const list = [...argv];
  for (let idx = 0; idx < list.length; idx++) {
    let token = list[idx];
    if (aliasMap[token]) token = aliasMap[token];

    switch (token) {
      case '--help':
        printHelp();
        process.exit(0);
        break;
      case '--input':
        args.input = list[++idx];
        break;
      case '--output':
        args.output = list[++idx];
        break;
      case '--formats':
        args.formats = list[++idx].split(',').map((f) => f.trim().toLowerCase());
        break;
      case '--sizes':
        args.sizes = list[++idx].split(',').map((s) => s.trim().toLowerCase());
        break;
      case '--fit':
        args.fit = list[++idx];
        break;
      case '--keep-ratio':
        args.keepRatio = true;
        break;
      case '--no-keep-ratio':
        args.keepRatio = false;
        break;
      case '--keep-metadata':
        args.keepMetadata = true;
        break;
      case '--quality':
        args.quality = parseInt(list[++idx], 10);
        break;
      case '--max-compression':
        args.maxCompression = true;
        break;
      default:
        console.warn(`Option inconnue ignorée: ${token}`);
    }
  }

  if (!args.input) {
    console.error('Erreur : --input est obligatoire (dossier ou liste de fichiers).');
    printHelp();
    process.exit(1);
  }

  if (args.formats) {
    for (const f of args.formats) {
      if (!SUPPORTED_OUTPUT_FORMATS.includes(f)) {
        console.error(`Format non supporté: "${f}". Formats valides: ${SUPPORTED_OUTPUT_FORMATS.join(', ')}`);
        process.exit(1);
      }
    }
  }

  return args;
}

// ---------------------------------------------------------------
// Résolution de la liste de fichiers d'entrée
// ---------------------------------------------------------------
function resolveInputFiles(input) {
  const files = [];

  // Cas 1 : liste de fichiers séparés par des virgules
  if (input.includes(',')) {
    for (const p of input.split(',')) {
      const trimmed = p.trim();
      if (fs.existsSync(trimmed) && fs.statSync(trimmed).isFile()) {
        files.push(path.resolve(trimmed));
      } else {
        console.warn(`Fichier introuvable, ignoré: ${trimmed}`);
      }
    }
    return files;
  }

  const stat = fs.existsSync(input) ? fs.statSync(input) : null;
  if (!stat) {
    console.error(`Chemin introuvable: ${input}`);
    process.exit(1);
  }

  // Cas 2 : un seul fichier
  if (stat.isFile()) {
    files.push(path.resolve(input));
    return files;
  }

  // Cas 3 : un dossier -> scan récursif
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // walk(full); /: RECURSIVE
      } else if (SUPPORTED_INPUT_EXT.includes(path.extname(entry.name).toLowerCase())) {
        files.push(path.resolve(full));
      }
    }
  };
  walk(input);
  return files;
}

// ---------------------------------------------------------------
// Parsing d'une taille "300x400", "800x", "x600", "orig"
// ---------------------------------------------------------------
function parseSize(sizeStr) {
  if (sizeStr === 'orig') return { label: 'orig', width: null, height: null };

  const match = sizeStr.match(/^(\d+)?x(\d+)?$/);
  if (!match || (!match[1] && !match[2])) {
    console.warn(`Taille invalide ignorée: "${sizeStr}" (format attendu: LxH, Lx, xH ou orig)`);
    return null;
  }
  const width = match[1] ? parseInt(match[1], 10) : null;
  const height = match[2] ? parseInt(match[2], 10) : null;
  const label = `${width || ''}x${height || ''}`;
  return { label, width, height };
}

// ---------------------------------------------------------------
// Réglages de compression maximale par format
// ---------------------------------------------------------------
function buildFormatOptions(format, quality, maxCompression) {
  switch (format) {
    case 'png':
      return {
        compressionLevel: 9, // max lossless (0-9)
        palette: true, // quantification -> PNG-8 quand c'est pertinent visuellement
        effort: maxCompression ? 10 : 7, // 1-10, plus haut = plus lent mais plus petit
      };
    case 'webp':
      return {
        quality,
        effort: maxCompression ? 6 : 4, // 0-6, max = 6
        smartSubsample: true,
      };
    case 'avif':
      return {
        quality,
        effort: maxCompression ? 9 : 4, // 0-9, max = 9 (bien plus lent, bien plus petit)
        chromaSubsampling: '4:2:0',
      };
    default:
      return {};
  }
}

// ---------------------------------------------------------------
// Traitement d'un fichier : pour chaque taille x chaque format
// ---------------------------------------------------------------
async function processFile(filePath, args, stats) {
  const baseName = path.basename(filePath, path.extname(filePath));
  const sourceExt = path.extname(filePath).slice(1).toLowerCase();
  const formats = args.formats || [sourceExt === 'jpg' ? 'jpeg' : sourceExt];
  const originalSizeBytes = fs.statSync(filePath).size;

  for (const sizeStr of args.sizes) {
    const size = parseSize(sizeStr);
    if (!size) continue;

    for (const format of formats) {
      try {
        let pipeline = sharp(filePath).rotate(); // .rotate() sans argument = auto-orient selon EXIF puis strip

        if (size.width || size.height) {
          // Si keepRatio est actif : on force fit=inside, qui redimensionne SANS jamais
          // déformer ni recadrer, même si largeur ET hauteur sont fournies (l'image
          // est simplement contenue dans la boîte demandée en conservant ses proportions).
          // Si keepRatio est désactivé (--no-keep-ratio), on respecte --fit tel quel
          // (cover = recadre, fill = déforme, contain = ajoute des marges).
          pipeline = pipeline.resize({
            width: size.width || null,
            height: size.height || null,
            fit: args.keepRatio ? 'inside' : args.fit,
            withoutEnlargement: true, // ne jamais agrandir : sobriété
          });
        }

        const formatOptions = buildFormatOptions(format, args.quality, args.maxCompression);
        pipeline = pipeline.toFormat(format, formatOptions);

        // Gestion des métadonnées : par défaut, sharp les supprime déjà (comportement
        // implicite quand withMetadata() n'est pas appelé). On le rend explicite ici,
        // et on ne les conserve que si l'utilisateur le demande via --keep-metadata
        // (utile pour garder une orientation EXIF spécifique ou un profil ICC couleur).
        if (args.keepMetadata) {
          pipeline = pipeline.withMetadata();
        }

        const suffix = size.label === 'orig' ? '' : `_${size.label}`;
        const outExt = format === 'jpeg' ? 'jpg' : format;
        // const outPath = path.join(args.output, `${baseName}${suffix}.${outExt}`);
        const outPath = path.join(args.output, `${baseName}.${outExt}`);

        const outputInfo = await pipeline.toFile(outPath);

        stats.push({
          input: path.basename(filePath),
          output: path.basename(outPath),
          originalSizeBytes,
          newSizeBytes: outputInfo.size,
          width: outputInfo.width,
          height: outputInfo.height,
        });
      } catch (err) {
        console.error(`Échec sur ${filePath} [${format}, ${sizeStr}]: ${err.message}`);
      }
    }
  }
}

// ---------------------------------------------------------------
// Résumé final
// ---------------------------------------------------------------
function printSummary(stats) {
  if (stats.length === 0) {
    console.log('\nAucun fichier généré.');
    return;
  }

  console.log('\n--- Résumé ---');
  let totalOriginal = 0;
  let totalNew = 0;
  const seenOriginals = new Set();

  for (const s of stats) {
    const reduction = (100 * (1 - s.newSizeBytes / s.originalSizeBytes)).toFixed(1);
    console.log(
      `${s.input} -> ${s.output} | ${s.width}x${s.height} | ` +
      `${(s.originalSizeBytes / 1024).toFixed(1)} Ko -> ${(s.newSizeBytes / 1024).toFixed(1)} Ko (-${reduction}%)`
    );
    totalNew += s.newSizeBytes;
    // On ne compte l'original qu'une fois par fichier source pour le total, sinon
    // on le compterait en double si plusieurs variantes sont générées.
    if (!seenOriginals.has(s.input)) {
      totalOriginal += s.originalSizeBytes;
      seenOriginals.add(s.input);
    }
  }

  console.log('----------------');
  console.log(`Fichiers sources : ${seenOriginals.size}`);
  console.log(`Variantes générées : ${stats.length}`);
  console.log(`Poids total des sorties : ${(totalNew / 1024).toFixed(1)} Ko`);
  console.log(`Poids total des sources (1x) : ${(totalOriginal / 1024).toFixed(1)} Ko`);
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const files = resolveInputFiles(args.input);

  if (files.length === 0) {
    console.error('Aucune image trouvée en entrée.');
    process.exit(1);
  }

  fs.mkdirSync(args.output, { recursive: true });

  console.log(`Fichiers détectés : ${files.length}`);
  console.log(`Formats de sortie : ${args.formats ? args.formats.join(', ') : '(même format que la source)'}`);
  console.log(`Tailles : ${args.sizes.join(', ')}`);
  console.log(`Conserver le ratio : ${args.keepRatio ? 'oui' : `non (fit=${args.fit})`}`);
  console.log(`Conserver les métadonnées : ${args.keepMetadata ? 'oui' : 'non (supprimées)'}`);
  console.log(`Compression maximale : ${args.maxCompression ? 'oui' : 'non'}\n`);

  const stats = [];
  for (const file of files) {
    await processFile(file, args, stats);
  }

  printSummary(stats);
}

main().catch((err) => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
