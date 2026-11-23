// v0.5 — two-stage store: boot route merge uses declarativeRoutes() on the host copy of
// logic.js; the code stage (orbit.json) is never modified (CA-A8, app-store-spec v0.5 §1.4.3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeclarative, isInstalled, declarativeRoutes } from '@facis/app-store/components/shared/logic.js';

const orbit = JSON.parse(readFileSync(new URL('../orbit.json', import.meta.url), 'utf8'));

const CODE = { slug: 'tickets', stage: 'code', cdn_url: 'https://cdn/x.js', tag: 'ticket-board', route: '/tickets', role_min: 'manager', default_enabled: true };
const DECL = { slug: 'tickets-view', stage: 'declarative', document_iri: 'https://pod.test/components/t/1', sri: 'h', route: '/tickets-view', role_min: 'all', default_enabled: false, in_menu: true };

test('declarativeRoutes merges only installed declarative rows; code-stage routes stay in orbit.json', () => {
  const routes = declarativeRoutes([CODE, DECL], { 'tickets-view': { enabled: true, installed_version: DECL.document_iri, installed_sri: 'h' } });
  assert.deepEqual(routes, [{ name: 'tickets-view', path: '/tickets-view', roles: ['all'], menu: true, dynamic: true }]);
  assert.equal(declarativeRoutes([CODE, DECL], {}).length, 0);
  // merge simulation (as in src/index.ts): no duplicate of an orbit.json path, code routes untouched
  const known = new Set(orbit.routes.map((r) => r.path));
  const before = orbit.routes.length;
  for (const r of routes) if (r.path && !known.has(r.path)) { orbit.routes.push(r); known.add(r.path); }
  assert.equal(orbit.routes.length, before + 1);
  assert.ok(orbit.routes.some((r) => r.path === '/tickets')); // code route still there
});

test('isInstalled: declarative requires recorded hash; distant code unchanged; packaged always', () => {
  assert.equal(isInstalled(DECL, {}), false);
  assert.equal(isInstalled(DECL, { 'tickets-view': { installed_version: 'x', installed_sri: 'h' } }), true);
  assert.equal(isInstalled(CODE, {}), false);
  assert.equal(isInstalled(CODE, { tickets: { installed_version: '1', installed_sri: 's' } }), true);
  assert.equal(isInstalled({ slug: 'x' }, {}), true);
  assert.equal(isDeclarative(DECL), true);
  assert.equal(isDeclarative(CODE), false);
});
