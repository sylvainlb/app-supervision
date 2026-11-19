// Mini-routeur standalone (src/lib/router.js) — routes d'orbit.json §8.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { matchPath, componentsFor } from '../src/lib/router.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const routes = JSON.parse(readFileSync(join(root, 'orbit.json'), 'utf8')).routes;

test('routes exactes', () => {
  assert.equal(matchPath('/', routes).name, 'dashboard');
  assert.equal(matchPath('/tickets', routes).name, 'tickets');
  assert.equal(matchPath('/tickets/', routes).name, 'tickets');
  assert.equal(matchPath('/anomalies', routes).name, 'anomalies');
  assert.equal(matchPath('/interventions', routes).name, 'interventions');
  assert.equal(matchPath('/admin', routes).name, 'admin');
});

test('routes paramétrées : détail', () => {
  assert.equal(matchPath('/buildings/42', routes).name, 'building-detail');
  assert.deepEqual(matchPath('/buildings/42', routes).params, ['42']);
  assert.equal(matchPath('/tickets/7', routes).name, 'ticket-detail');
  assert.deepEqual(matchPath('/tickets/7', routes).params, ['7']);
});

test('inconnue → null (le bootstrap retombe sur le dashboard)', () => {
  assert.equal(matchPath('/nope', routes), null);
});

test('componentsFor suit orbit.json', () => {
  assert.ok(componentsFor('dashboard', routes).includes('building-map'));
  assert.deepEqual(componentsFor('ticket-detail', routes), ['ticket-detail']);
  assert.deepEqual(componentsFor('inconnu', routes), []);
});
