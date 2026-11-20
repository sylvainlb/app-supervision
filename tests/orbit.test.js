// Conformité §8 (routes) + §13.6 (orbit.json, oidc, versions épinglées).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const orbit = JSON.parse(readFileSync(join(root, 'orbit.json'), 'utf8'));

test('§8 : les 6 routes déclarées avec rôles et composants', () => {
  const expected = [
    { name: 'dashboard', path: '/', roles: ['gestionnaire'] },
    { name: 'building-detail', path: '/buildings/:id', roles: ['gestionnaire'] },
    { name: 'anomalies', path: '/anomalies', roles: ['gestionnaire'] },
    { name: 'tickets', path: '/tickets', roles: ['gestionnaire'] },
    { name: 'ticket-new', path: '/tickets/new', roles: ['gestionnaire'] },
    { name: 'ticket-detail', path: '/tickets/:id', roles: ['gestionnaire', 'technicien'] },
    { name: 'interventions', path: '/interventions', roles: ['technicien'] },
    { name: 'admin', path: '/admin', roles: ['admin'] },
    { name: 'store', path: '/store', roles: ['gestionnaire', 'technicien', 'admin'] },
  ];
  assert.equal(orbit.routes.length, 9);
  for (const exp of expected) {
    const route = orbit.routes.find((r) => r.name === exp.name);
    assert.ok(route, `route manquante: ${exp.name}`);
    assert.equal(route.path, exp.path);
    assert.deepEqual(route.roles, exp.roles);
    assert.ok(Array.isArray(route.components) && route.components.length > 0, `composants manquants pour ${exp.name}`);
  }
});

test('§13.6 : oidc = realm fap-light + clientId statique fap-light-ui (D-7)', () => {
  assert.match(orbit.client.oidc.issuer, /\/auth\/realms\/fap-light$/);
  assert.equal(orbit.client.oidc.clientId, 'fap-light-ui');
  assert.match(orbit.client.url, /^https?:\/\//); // http en dev local (ENV=dev), https en prod
});

test('§13.6 : versions npm épinglées exactes (pas de ^ ni ~)', () => {
  for (const [pkg, version] of Object.entries(orbit.npm)) {
    assert.ok(!version.startsWith('^') && !version.startsWith('~'), `${pkg}: version non épinglée (${version})`);
    assert.match(version, /^\d+\.\d+\.\d+$/, `${pkg}: version non sémver exacte (${version})`);
  }
});

test('§6 : orbit.json déclare les blox custom (dont app-store) + les blox du Store réutilisés', () => {
  for (const c of ['building-map', 'energy-chart', 'anomaly-list', 'ticket-board', 'ticket-detail', 'ticket-new', 'user-admin', 'app-store', 'app-menu']) {
    assert.ok(orbit.components[c], `composant non déclaré: ${c}`);
  }
  for (const b of ['solid-display', 'solid-form', 'solid-ac-checker', 'solid-router']) {
    assert.ok(orbit.components[b], `blox Store non déclaré: ${b}`);
  }
});
