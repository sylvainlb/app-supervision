// Standalone mini-router (src/lib/router.js) — orbit.json routes §8.
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

test('parameterized routes: detail', () => {
  assert.equal(matchPath('/buildings/42', routes).name, 'building-detail');
  assert.deepEqual(matchPath('/buildings/42', routes).params, ['42']);
  assert.equal(matchPath('/tickets/7', routes).name, 'ticket-detail');
  assert.deepEqual(matchPath('/tickets/7', routes).params, ['7']);
});

test('exact route takes priority over the parameter: /tickets/new ≠ /tickets/:id', () => {
  assert.equal(matchPath('/tickets/new', routes).name, 'ticket-new');
});

test('unknown → null (the bootstrap falls back to the dashboard)', () => {
  assert.equal(matchPath('/nope', routes), null);
});

test('componentsFor follows orbit.json', () => {
  assert.ok(componentsFor('dashboard', routes).includes('building-map'));
  assert.deepEqual(componentsFor('ticket-detail', routes), ['ticket-detail']);
  assert.deepEqual(componentsFor('unknown', routes), []);
});

test('menuItems: labels, no detail routes, visibility per role (§8)', () => {
  const all = menuItems(routes, 'manager');
  assert.ok(!all.some((i) => i.name === 'ticket-detail' || i.name === 'building-detail'), 'no :id routes in the menu');
  const gest = all.filter((i) => i.visible && i.menu !== false).map((i) => i.name);
  assert.deepEqual(gest, ['dashboard', 'anomalies', 'tickets', 'ticket-new']); // /store: menu:false → outside the menu, reached via the header icon
  const tech = menuItems(routes, 'technician').filter((i) => i.visible && i.menu !== false).map((i) => i.name);
  assert.deepEqual(tech, ['interventions']);
  assert.ok(all.some((i) => i.name === 'store' && i.menu === false), 'store (menu:false) outside the menu, reached via the header');
  assert.ok(routes.some((r) => r.name === 'store' && r.path === '/store'), 'the /store route still exists in orbit.json');
  const admin = menuItems(routes, 'admin').filter((i) => i.visible).map((i) => i.name);
  assert.ok(admin.includes('admin') && admin.includes('dashboard'), 'admin sees everything');
  assert.ok(all.every((i) => i.label && i.label.length > 0), 'each entry has a label');
});

test('userLabel: webid + role from the OIDC claims (D-7)', () => {
  assert.equal(userLabel({ webid: 'https://app.localhost/users/1', role: 'manager' }), 'https://app.localhost/users/1 (manager)');
  assert.equal(userLabel({ preferred_username: 'u1' }), 'u1');
  assert.equal(userLabel(null), '');
  assert.equal(userLabel({}), '');
});

test('userLabel: real LDP name takes priority over the webid', () => {
  assert.equal(userLabel({ name: 'Alice Manager', webid: 'http://localhost/users/1', role: 'manager' }), 'Alice Manager (manager)');
  assert.equal(userLabel({ name: 'Karim Aziz' }), 'Karim Aziz');
});
