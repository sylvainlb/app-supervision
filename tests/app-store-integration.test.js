// App store integration in app-supervision (app-store-spec.md v0.4):
// - orbit.json declares the /store route + the app-store/app-menu blox
// - index.ts configures window.appStore at boot
// - fixtures: /features/ catalogue + /prefs/1 prefs (demo mode without back)
// - functional: refresh via fixture fallback, dynamic menu, CA-A4 guard (anti-loop)
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setupDom } from './helpers/dom.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('orbit.json: /store route + app-store/app-menu components declared', () => {
  const orbit = JSON.parse(readFileSync(join(root, 'orbit.json'), 'utf8'));
  const store = orbit.routes.find((r) => r.name === 'store');
  assert.ok(store, 'missing store route');
  assert.equal(store.path, '/store');
  assert.deepEqual(store.components, ['app-store']);
  assert.ok(orbit.components['app-store']?.includes('components/app-store/app-store.js'));
  assert.ok(orbit.components['app-menu']?.includes('components/app-menu/app-menu.js'));
});

test('index.ts imports the app-store and configures window.appStore at boot', () => {
  const src = readFileSync(join(root, 'src/index.ts'), 'utf8');
  assert.match(src, /components\/shared\/app-store-api\.js/);
  assert.match(src, /components\/app-menu\/app-menu\.js/);
  assert.match(src, /components\/app-store\/app-store\.js/);
  assert.match(src, /appStore\.configure\(\{/);
  assert.match(src, /getWebid/);
  // dynamic menu mounted in the shell when the catalogue is served
  assert.match(src, /createElement\('app-menu'\)/);
});

test('fixtures: /features/ catalogue + /prefs/1 prefs present (demo mode)', () => {
  const src = readFileSync(join(root, 'src/lib/fixtures.js'), 'utf8');
  assert.match(src, /'\/features\/':/);
  assert.match(src, /'\/prefs\/1':/);
  assert.match(src, /'\/features\/app-store'/); // app-store catalogue entry (in_menu: false, outside the menu)
});

test('functional: refresh via fixture fallback, sorted dynamic menu, CA-A4 anti-loop guard', async () => {
  const window = setupDom();
  window.orbit = { ready: Promise.resolve(), routes: [
    { name: 'dashboard', path: '/' },
    { name: 'anomalies', path: '/anomalies' },
    { name: 'tickets', path: '/tickets' },
    { name: 'admin', path: '/admin' },
    { name: 'store', path: '/store' },
  ] };
  const { installFixtureProxy } = await import('../src/lib/fixtures.js');
  const fetchFail = async () => { throw new Error('network down (test)'); };
  window.sibStore = { fetchAuthn: installFixtureProxy(fetchFail, { enabled: true }) };

  const { appStore } = await import('../components/shared/app-store-api.js');
  const { menuEntries } = await import('../components/shared/logic.js');
  appStore.configure({
    podUrl: 'http://localhost',
    getWebid: () => 'http://localhost/users/1',
    getRole: () => 'manager',
  });
  assert.equal(appStore.mePrefsIri(), '/prefs/1');
  await appStore.refresh();

  // catalogue loaded from the fixture; menu = enabled features, sorted by menu_order
  const slugs = ['building-map', 'anomaly-list', 'ticket-board', 'user-admin', 'app-store', 'building-detail'];
  for (const s of slugs) assert.ok(appStore.getFeature(s), `feature fixture ${s}`);
  const entries = menuEntries(
    slugs.map((s) => appStore.getFeature(s)),
    appStore.getPrefs(),
    { locale: 'fr', role: 'manager' },
  );
  // menu_order + role_min + in_menu + parameterized routes sort: user-admin (role_min=admin)
  // filtered out for a manager, app-store (in_menu=false) outside the menu, building-detail
  // (route /buildings/:id) outside the menu — detail page reached by click, not by the menu
  assert.deepEqual(entries.map((e) => e.slug),
    ['building-map', 'anomaly-list', 'ticket-board']);
  assert.equal(appStore.isEnabled('ticket-board'), true);

  // CA-A4 guard: install, then navigate
  appStore.installRouteGuard({ defaultPath: '/' });
  const navs = [];
  // capture: the guard listens in capture phase and stopPropagation() — a bubble listener would not see the blocked event
  document.addEventListener('requestNavigation', (e) => navs.push(e.detail?.resource ?? e.detail?.route), true);

  // 1. anti-loop: '/' (redirect target) is never blocked → no 2nd event
  navs.length = 0;
  const evRoot = new CustomEvent('requestNavigation', { detail: { route: 'dashboard', resource: '/' }, cancelable: true });
  document.dispatchEvent(evRoot);
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(!evRoot.defaultPrevented, '/ not blocked');
  assert.equal(navs.length, 1, 'a single event (ours): no loop'); // navs[0] = our own dispatch

  // 2. enabled feature: /tickets goes through
  navs.length = 0;
  const evOk = new CustomEvent('requestNavigation', { detail: { route: 'tickets', resource: '/tickets' }, cancelable: true });
  document.dispatchEvent(evOk);
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(!evOk.defaultPrevented, '/tickets (enabled) not blocked');
  assert.equal(navs.length, 1, 'no redirect for an enabled feature');

  // 3. we disable ticket-board via PATCH (R1 form, fixture fallback) → /tickets blocked → redirect /
  await appStore.patchPrefs({ 'ticket-board': { enabled: false } });
  assert.equal(appStore.isEnabled('ticket-board'), false);
  navs.length = 0;
  const evKo = new CustomEvent('requestNavigation', { detail: { route: 'tickets', resource: '/tickets' }, cancelable: true });
  document.dispatchEvent(evKo);
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(evKo.defaultPrevented, '/tickets (disabled) blocked');
  assert.equal(navs.length, 2, 'our event + exactly one redirect');
  assert.ok(navs.includes('/'), 'redirect / emitted exactly once');
});

test('loader: tag already registered → no re-import (no "already defined")', async () => {
  const { loadRemoteModule } = await import('../components/shared/loader.js');
  // simulates an already-defined custom element (e.g. the dashboard bundle embeds anomaly-list)
  const registry = new Map([['anomaly-list', class {}]]);
  const g = globalThis.customElements;
  globalThis.customElements = { get: (t) => registry.get(t) };
  try {
    let imported = 0;
    const res = await loadRemoteModule(
      { cdnUrl: '/features-dist/anomalies.js', sri: 'sha384-AAAA', tag: 'anomaly-list' },
      { fetchFn: async () => { throw new Error('fetch must not be called'); }, importFn: async () => { imported++; return {}; } },
    );
    assert.equal(imported, 0, 'no import if the tag is already registered');
    assert.equal(res.alreadyRegistered, true);
  } finally {
    globalThis.customElements = g;
  }
});
