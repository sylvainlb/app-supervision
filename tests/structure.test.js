// Conformité §4 — structure du projet front.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const CUSTOM_COMPONENTS = ['building-map', 'energy-chart', 'anomaly-list', 'ticket-board', 'ticket-detail', 'user-admin'];

test('§4 : fichiers racine requis', () => {
  for (const f of ['orbit.json', 'package.json', '.gitignore', 'src/index.ts', 'src/config.ts']) {
    assert.ok(existsSync(join(root, f)), `manquant: ${f}`);
  }
});

test('§4 : les 6 composants custom existent', () => {
  for (const c of CUSTOM_COMPONENTS) {
    assert.ok(existsSync(join(root, 'components', c, `${c}.js`)), `composant manquant: ${c}`);
  }
});

test('§4 : .gitignore exclut node_modules/ et dist/', () => {
  const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');
  assert.match(gitignore, /node_modules\//);
  assert.match(gitignore, /dist\//);
});

test('§1.4/§13.6 : config.ts lit POD_URL/OIDC_ISSUER/OIDC_CLIENT_ID, rien en dur', () => {
  const src = readFileSync(join(root, 'src/config.ts'), 'utf8');
  for (const env of ['POD_URL', 'OIDC_ISSUER', 'OIDC_CLIENT_ID']) {
    assert.ok(src.includes(env), `config.ts doit lire ${env}`);
  }
  assert.ok(!/https:\/\/[a-z0-9.-]+\//i.test(src.replace(/https:\/\/<pod>/g, '')), 'pas de pod en dur dans config.ts');
});
