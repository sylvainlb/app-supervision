// §8 conformance (routes) + §13.6 (orbit.json, oidc, pinned versions).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const orbit = JSON.parse(readFileSync(join(root, 'orbit.json'), 'utf8'));

test('§8: the declared routes with roles and components', () => {
  const expected = [
    { name: 'dashboard', path: '/', roles: ['manager'] },
    { name: 'building-detail', path: '/buildings/:id', roles: ['manager'] },
    { name: 'anomalies', path: '/anomalies', roles: ['manager'] },
    { name: 'tickets', path: '/tickets', roles: ['manager'] },
    { name: 'ticket-new', path: '/tickets/new', roles: ['manager'] },
    { name: 'ticket-detail', path: '/tickets/:id', roles: ['manager', 'technician'] },
    { name: 'interventions', path: '/interventions', roles: ['technician'] },
    { name: 'admin', path: '/admin', roles: ['admin'] },
    { name: 'store', path: '/store', roles: ['manager', 'technician', 'admin'] },
  ];
  assert.equal(orbit.routes.length, 21); // 9 packaged + 12 distant (v2, menu:false, components:[])
  for (const exp of expected) {
    const route = orbit.routes.find((r) => r.name === exp.name);
    assert.ok(route, `missing route: ${exp.name}`);
    assert.equal(route.path, exp.path);
    assert.deepEqual(route.roles, exp.roles);
    assert.ok(Array.isArray(route.components) && route.components.length > 0, `missing components for ${exp.name}`);
  }
});

test('§13.6: oidc = fap-light realm + static clientId fap-light-ui (D-7)', () => {
  assert.match(orbit.client.oidc.issuer, /\/auth\/realms\/fap-light$/);
  assert.equal(orbit.client.oidc.clientId, 'fap-light-ui');
  assert.match(orbit.client.url, /^https?:\/\//); // http in local dev (ENV=dev), https in prod
});

test('§13.6: exact pinned npm versions (no ^ nor ~)', () => {
  for (const [pkg, version] of Object.entries(orbit.npm)) {
    assert.ok(!version.startsWith('^') && !version.startsWith('~'), `${pkg}: version not pinned (${version})`);
    assert.match(version, /^\d+\.\d+\.\d+$/, `${pkg}: version not exact semver (${version})`);
  }
});

test('§6: orbit.json declares the custom blox (incl. app-store) + the reused Store blox', () => {
  for (const c of ['building-map', 'energy-chart', 'anomaly-list', 'ticket-board', 'ticket-detail', 'ticket-new', 'user-admin', 'app-store', 'app-menu']) {
    assert.ok(orbit.components[c], `undeclared component: ${c}`);
  }
  for (const b of ['solid-display', 'solid-form', 'solid-ac-checker', 'solid-router']) {
    assert.ok(orbit.components[b], `undeclared Store blox: ${b}`);
  }
});
