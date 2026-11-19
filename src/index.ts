// Bootstrap (spec front §4) : sibStore + sib-auth + mini-routeur standalone.
// Store seul (pose window.sibStore) — PAS le barrel '@startinblox/core' complet :
// celui-ci embarque TinyMCE/Quill qui s'initialisent au import et plantent en module ES
// (document.currentScript == null → toAbsPath(undefined)).
import '@startinblox/core/dist/store.js';
import '@startinblox/oidc'; // enregistre <sib-auth>
import { config } from './config';
import { matchPath, componentsFor } from './lib/router.js';
import orbit from '../orbit.json';
import '../components/building-map/building-map.js';
import '../components/energy-chart/energy-chart.js';
import '../components/anomaly-list/anomaly-list.js';
import '../components/ticket-board/ticket-board.js';
import '../components/ticket-detail/ticket-detail.js';
import '../components/user-admin/user-admin.js';

declare global {
  interface Window {
    orbit?: { ready?: Promise<void> };
    sibStore?: Record<string, unknown> & { getData: (url: string) => Promise<unknown> };
  }
}

function render(): void {
  const app = document.getElementById('app');
  if (!app) return;
  const m = matchPath(window.location.pathname, orbit.routes);
  const name = m?.name ?? 'dashboard';
  app.replaceChildren();
  for (const tag of componentsFor(name, orbit.routes)) {
    const el = document.createElement(tag) as HTMLElement & { dataSrc?: string; building?: string };
    if (tag === 'ticket-detail') el.dataSrc = window.location.pathname; // /tickets/<pk>
    if (tag === 'energy-chart' && window.location.pathname.startsWith('/buildings/')) {
      el.building = window.location.pathname;
    }
    app.appendChild(el);
  }
}

async function main(): Promise<void> {
  const sibAuth = document.querySelector('sib-auth') as (HTMLElement & {
    fetchAuthn?: typeof fetch;
    issuer?: string;
    clientId?: string;
  }) | null;
  if (sibAuth) {
    sibAuth.issuer = config.oidcIssuer; // realm Keycloak de la FAP (D-7)
    sibAuth.clientId = config.oidcClientId; // client statique fap-light-ui
    if (sibAuth.fetchAuthn && window.sibStore) {
      // §13.7 : fetch authentifié (DPoP) injecté dans sibStore, point d'injection unique
      (window.sibStore as { fetchAuthn?: typeof fetch }).fetchAuthn = sibAuth.fetchAuthn.bind(sibAuth);
    }
  }
  // Sans shell Orbit standalone : on fournit une promesse résolue pour que les
  // composants montés plus tard (navigation) déclenchent leur chargement aussi.
  window.orbit ??= { ready: Promise.resolve() };
  await window.orbit.ready;
  document.dispatchEvent(new CustomEvent('orbit-ready'));
  render();
  console.info(`[app-supervision] pod=${config.podUrl} issuer=${config.oidcIssuer}`);
}

document.addEventListener('requestNavigation', (e) => {
  const d = (e as CustomEvent).detail ?? {};
  const def = orbit.routes.find((r) => r.name === d.route);
  const path = d.resource ?? def?.path ?? '/';
  window.history.pushState({}, '', path);
  render();
});
window.addEventListener('popstate', render);

main();
