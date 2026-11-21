// Intégration de l'app store dans app-supervision (app-store-spec.md v0.4) :
// - orbit.json déclare la route /store + les blox app-store/app-menu
// - index.ts configure window.appStore au boot
// - fixtures : catalogue /features/ + prefs /prefs/1 (mode démo sans back)
// - fonctionnel : refresh via repli fixture, menu dynamique, guard CA-A4 (anti-boucle)
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setupDom } from './helpers/dom.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('orbit.json : route /store + composants app-store/app-menu déclarés', () => {
  const orbit = JSON.parse(readFileSync(join(root, 'orbit.json'), 'utf8'));
  const store = orbit.routes.find((r) => r.name === 'store');
  assert.ok(store, 'route store manquante');
  assert.equal(store.path, '/store');
  assert.deepEqual(store.components, ['app-store']);
  assert.ok(orbit.components['app-store']?.includes('components/app-store/app-store.js'));
  assert.ok(orbit.components['app-menu']?.includes('components/app-menu/app-menu.js'));
});

test('index.ts importe l’app-store et configure window.appStore au boot', () => {
  const src = readFileSync(join(root, 'src/index.ts'), 'utf8');
  assert.match(src, /components\/shared\/app-store-api\.js/);
  assert.match(src, /components\/app-menu\/app-menu\.js/);
  assert.match(src, /components\/app-store\/app-store\.js/);
  assert.match(src, /appStore\.configure\(\{/);
  assert.match(src, /getWebid/);
  // menu dynamique monté dans le shell quand le catalogue est servi
  assert.match(src, /createElement\('app-menu'\)/);
});

test('fixtures : catalogue /features/ + prefs /prefs/1 présents (mode démo)', () => {
  const src = readFileSync(join(root, 'src/lib/fixtures.js'), 'utf8');
  assert.match(src, /'\/features\/':/);
  assert.match(src, /'\/prefs\/1':/);
  assert.match(src, /'\/features\/app-store'/); // entrée app-store du catalogue (in_menu: false, hors menu)
});

test('fonctionnel : refresh via repli fixture, menu dynamique trié, guard CA-A4 anti-boucle', async () => {
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
    getRole: () => 'gestionnaire',
  });
  assert.equal(appStore.mePrefsIri(), '/prefs/1');
  await appStore.refresh();

  // catalogue chargé depuis la fixture ; menu = features enabled, tri menu_order
  const slugs = ['building-map', 'anomaly-list', 'ticket-board', 'user-admin', 'app-store', 'building-detail'];
  for (const s of slugs) assert.ok(appStore.getFeature(s), `feature fixture ${s}`);
  const entries = menuEntries(
    slugs.map((s) => appStore.getFeature(s)),
    appStore.getPrefs(),
    { locale: 'fr', role: 'gestionnaire' },
  );
  // tri menu_order + role_min + in_menu + routes paramétrées : user-admin (role_min=admin)
  // filtré pour un gestionnaire, app-store (in_menu=false) hors menu, building-detail
  // (route /buildings/:id) hors menu — page de détail atteinte par clic, pas par le menu
  assert.deepEqual(entries.map((e) => e.slug),
    ['building-map', 'anomaly-list', 'ticket-board']);
  assert.equal(appStore.isEnabled('ticket-board'), true);

  // guard CA-A4 : installer, puis navigation
  appStore.installRouteGuard({ defaultPath: '/' });
  const navs = [];
  // capture : le guard écoute en capture et stopPropagation() — un listener bubble ne verrait pas l'event bloqué
  document.addEventListener('requestNavigation', (e) => navs.push(e.detail?.resource ?? e.detail?.route), true);

  // 1. anti-boucle : '/' (cible de redirect) n'est jamais bloqué → pas de 2e événement
  navs.length = 0;
  const evRoot = new CustomEvent('requestNavigation', { detail: { route: 'dashboard', resource: '/' }, cancelable: true });
  document.dispatchEvent(evRoot);
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(!evRoot.defaultPrevented, '/ non bloqué');
  assert.equal(navs.length, 1, 'un seul événement (le nôtre) : pas de boucle'); // navs[0] = notre propre dispatch

  // 2. feature active : /tickets passe
  navs.length = 0;
  const evOk = new CustomEvent('requestNavigation', { detail: { route: 'tickets', resource: '/tickets' }, cancelable: true });
  document.dispatchEvent(evOk);
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(!evOk.defaultPrevented, '/tickets (enabled) non bloqué');
  assert.equal(navs.length, 1, 'aucun redirect pour une feature active');

  // 3. on désactive ticket-board via PATCH (forme R1, repli fixture) → /tickets bloqué → redirect /
  await appStore.patchPrefs({ 'ticket-board': { enabled: false } });
  assert.equal(appStore.isEnabled('ticket-board'), false);
  navs.length = 0;
  const evKo = new CustomEvent('requestNavigation', { detail: { route: 'tickets', resource: '/tickets' }, cancelable: true });
  document.dispatchEvent(evKo);
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(evKo.defaultPrevented, '/tickets (désactivé) bloqué');
  assert.equal(navs.length, 2, 'notre événement + exactement un redirect');
  assert.ok(navs.includes('/'), 'redirect / émis une seule fois');
});
