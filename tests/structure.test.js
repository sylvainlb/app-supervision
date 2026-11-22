// §4 conformance — front project structure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const CUSTOM_COMPONENTS = ['building-map', 'energy-chart', 'anomaly-list', 'ticket-board', 'ticket-detail', 'user-admin'];

test('§4: required root files', () => {
  for (const f of ['orbit.json', 'package.json', '.gitignore', 'src/index.ts', 'src/config.js']) {
    assert.ok(existsSync(join(root, f)), `missing: ${f}`);
  }
});

test('§4: the 6 custom components exist', () => {
  for (const c of CUSTOM_COMPONENTS) {
    assert.ok(existsSync(join(root, 'components', c, `${c}.js`)), `missing component: ${c}`);
  }
});

test('§4: .gitignore excludes node_modules/ and dist/', () => {
  const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');
  assert.match(gitignore, /node_modules\//);
  assert.match(gitignore, /dist\//);
});

test('§1.4/§13.6: config.js reads POD_URL/OIDC_ISSUER/OIDC_CLIENT_ID, nothing hard-coded', () => {
  const src = readFileSync(join(root, 'src/config.js'), 'utf8');
  for (const env of ['POD_URL', 'OIDC_ISSUER', 'OIDC_CLIENT_ID']) {
    assert.ok(src.includes(env), `config.js must read ${env}`);
  }
  assert.ok(!/https:\/\/[a-z0-9.-]+\//i.test(src.replace(/https:\/\/<pod>/g, '')), 'no hard-coded pod in config.js');
});
