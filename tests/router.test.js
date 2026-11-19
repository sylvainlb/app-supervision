// Mini-routeur standalone (src/lib/router.js) — routes d'orbit.json §8.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { matchPath, componentsFor, menuItems, userLabel } from '../src/lib/router.js';

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

test('route exacte prioritaire sur le paramètre : /tickets/new ≠ /tickets/:id', () => {
  assert.equal(matchPath('/tickets/new', routes).name, 'ticket-new');
});

test('inconnue → null (le bootstrap retombe sur le dashboard)', () => {
  assert.equal(matchPath('/nope', routes), null);
});

test('componentsFor suit orbit.json', () => {
  assert.ok(componentsFor('dashboard', routes).includes('building-map'));
  assert.deepEqual(componentsFor('ticket-detail', routes), ['ticket-detail']);
  assert.deepEqual(componentsFor('inconnu', routes), []);
});

test('menuItems : libellés FR, pas de routes de détail, visibilité par rôle (§8)', () => {
  const all = menuItems(routes, 'gestionnaire');
  assert.ok(!all.some((i) => i.name === 'ticket-detail' || i.name === 'building-detail'), 'pas de routes :id dans le menu');
  const gest = all.filter((i) => i.visible).map((i) => i.name);
  assert.deepEqual(gest, ['dashboard', 'anomalies', 'tickets', 'ticket-new']);
  const tech = menuItems(routes, 'technicien').filter((i) => i.visible).map((i) => i.name);
  assert.deepEqual(tech, ['interventions']);
  const admin = menuItems(routes, 'admin').filter((i) => i.visible).map((i) => i.name);
  assert.ok(admin.includes('admin') && admin.includes('dashboard'), 'admin voit tout');
  assert.ok(all.every((i) => i.label && i.label.length > 0), 'chaque entrée a un libellé');
});

test('userLabel : webid + rôle depuis les claims OIDC (D-7)', () => {
  assert.equal(userLabel({ webid: 'https://app.localhost/users/1', role: 'gestionnaire' }), 'https://app.localhost/users/1 (gestionnaire)');
  assert.equal(userLabel({ preferred_username: 'u1' }), 'u1');
  assert.equal(userLabel(null), '');
  assert.equal(userLabel({}), '');
});
