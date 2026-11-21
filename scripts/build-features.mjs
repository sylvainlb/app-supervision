// build-features.mjs — v2 : AUCUN composant métier packagé dans l'app, tout passe par
// le CDN (bundle + SRI). Build un bundle ESM par feature de base (slug de route) :
//
//   public/features-dist/<slug>.js      ← bundle self-contained (lit + boilerplate inclus)
//   public/features-dist/manifest.json  ← { slug: { tag, cdn_url, sri (sha384-<b64>), bytes } }
//   ../app-supervision-backend/sql/131_base_features_v2.sql ← UPDATE app.features (colonnes v2)
//
// Le composant « store » (app-store/app-menu) reste packagé : c'est le mécanisme qui
// permet d'installer les autres (bootstrap). Les 12 lots métier sont buildés par
// app-features/scripts/build.mjs (seed 130).
//
// Usage : node scripts/build-features.mjs   (depuis app-supervision/)
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'public/features-dist');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const orbit = JSON.parse(readFileSync(join(ROOT, 'orbit.json'), 'utf8'));

// slug → tags de la route (composants + sections), store exclu (packagé, bootstrap)
const entries = {};
for (const r of orbit.routes) {
  if (r.dynamic || r.name === 'store') continue;
  if (r.name === 'ticket-new' || r.name === 'ticket-detail') continue; // sous-routes de tickets (dans le bundle tickets)
  const comps = [...new Set([...(r.components ?? []), ...(r.sections ?? []).flatMap((s) => s.components ?? [])])];
  entries[r.name] = comps;
}

mkdirSync(OUT, { recursive: true });
const manifest = { package: '@facis/app-supervision', version: pkg.version, features: {} };
const updates = [];

for (const [slug, comps] of Object.entries(entries)) {
  const entry = join(ROOT, 'components/features-entries', slug + '.js');
  const outfile = join(OUT, slug + '.js');
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    minify: false,
    logLevel: 'silent',
    alias: {
      // arbre lit complet (app-store/node_modules) — node_modules local peut être partiel
      lit: join(ROOT, '../app-store/node_modules/lit'),
      '@lit/task': join(ROOT, '../app-store/node_modules/@lit/task'),
      '@lit/reactive-element': join(ROOT, '../app-store/node_modules/@lit/reactive-element'),
      'lit-html': join(ROOT, '../app-store/node_modules/lit-html'),
      'lit-element': join(ROOT, '../app-store/node_modules/lit-element'),
    },
  });
  const bytes = readFileSync(outfile);
  const sri = 'sha384-' + createHash('sha384').update(bytes).digest('base64');
  const tag = comps[0];
  const cdnUrl = `/features-dist/${slug}.js`;
  manifest.features[slug] = { tag, cdn_url: cdnUrl, sri, bytes: bytes.length, components: comps };
  updates.push(
    `UPDATE app.features SET npm_package = '@facis/app-supervision', version = '${pkg.version}', ` +
    `cdn_url = '${cdnUrl}', sri = '${sri}', tag = '${tag}' WHERE slug = '${slug}' AND deleted_at IS NULL;`);
  console.log(`build ${slug} → public/features-dist/${slug}.js (${bytes.length} o, tags: ${comps.join(',')}, ${sri.slice(0, 20)}…)`);
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

const sql = `-- ============================================================================
-- App store v2 — 131_base_features_v2.sql : les features de BASE passent en
-- DISTANTES (CDN + SRI) — plus aucun composant métier packagé dans l'app.
-- Généré par app-supervision/scripts/build-features.mjs (sri = sha384 réelle du
-- bundle public/features-dist/<slug>.js). Le composant store (app-store/app-menu)
-- reste packagé : c'est le mécanisme d'installation (bootstrap).
-- Idempotent — rejoué au boot par deploy-local.sh.
-- ============================================================================

${updates.join('\n')}
`;
const sqlPath = join(ROOT, '../app-supervision-backend/sql/131_base_features_v2.sql');
writeFileSync(sqlPath, sql);
console.log(`seed SQL généré → ${sqlPath} (${updates.length} features)`);
