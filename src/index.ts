// Bootstrap (spec front §4) : sibStore + sib-auth + mini-routeur standalone.
// Store seul (pose window.sibStore) — PAS le barrel '@startinblox/core' complet :
// celui-ci embarque TinyMCE/Quill qui s'initialisent au import et plantent en module ES
// (document.currentScript == null → toAbsPath(undefined)).
import '@startinblox/core/dist/store.js';
import '@startinblox/oidc'; // enregistre <sib-auth>
import { config } from './config';
import { matchPath, componentsFor, menuItems } from './lib/router.js';
import orbit from '../orbit.json';
import '../components/building-map/building-map.js';
import '../components/energy-chart/energy-chart.js';
import '../components/anomaly-list/anomaly-list.js';
import '../components/ticket-board/ticket-board.js';
import '../components/ticket-detail/ticket-detail.js';
import '../components/ticket-new/ticket-new.js';
import '../components/user-admin/user-admin.js';

declare global {
  interface Window {
    orbit?: { ready?: Promise<void> };
    sibStore?: Record<string, unknown> & { getData: (url: string) => Promise<unknown> };
  }
}

let lastNav: { route?: string; resource?: string; query?: Record<string, unknown> } = {};

// Rôle courant pour le menu (§8 : le rôle pilote l'assemblage des écrans, jamais
// la décision d'accès — l'ACL/RLS reste côté serveur). Lu depuis les claims OIDC
// de <sib-auth> si disponibles, sinon 'gestionnaire' (dev), overridable via window.appRole.
function currentRole(sibAuth: HTMLElement | null): string {
  const w = window as unknown as { appRole?: string };
  if (w.appRole) return w.appRole;
  const claims = (sibAuth as unknown as { session?: { tokenParsed?: { role?: string } }; claims?: { role?: string } });
  return claims?.session?.tokenParsed?.role ?? claims?.claims?.role ?? 'gestionnaire';
}

function renderMenu(role: string): void {
  const nav = document.getElementById('menu');
  if (!nav) return;
  const current = window.location.pathname;
  const links = menuItems(orbit.routes, role)
    .filter((item) => item.visible)
    .map((item) => {
      const active = current === item.path ? ' class="active"' : '';
      return `<a data-route="${item.name}" data-path="${item.path}"${active}>${item.label}</a>`;
    })
    .join('');
  nav.innerHTML = '<h1>Supervision énergétique</h1>' + links;
  nav.querySelectorAll('a[data-route]').forEach((a) => {
    a.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('requestNavigation', {
        detail: { route: a.getAttribute('data-route'), resource: a.getAttribute('data-path') },
      }));
    });
  });
}

function render(): void {
  const app = document.getElementById('app');
  if (!app) return;
  const m = matchPath(window.location.pathname, orbit.routes);
  const name = m?.name ?? 'dashboard';
  app.replaceChildren();
  for (const tag of componentsFor(name, orbit.routes)) {
    const el = document.createElement(tag) as HTMLElement & { dataSrc?: string; building?: string; anomaly?: string; webid?: string };
    if (tag === 'ticket-detail') el.dataSrc = window.location.pathname; // /tickets/<pk>
    if (tag === 'ticket-new' && lastNav.query?.anomaly) el.anomaly = String(lastNav.query.anomaly);
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
    if (window.sibStore) {
      // §13.7 : fetch authentifié (DPoP) injecté dans sibStore, point d'injection unique.
      // Wrapper résolu à l'appel : <sib-auth> peut s'upgrader après ce main().
      (window.sibStore as { fetchAuthn?: typeof fetch }).fetchAuthn = ((u: string, i?: RequestInit) =>
        sibAuth?.fetchAuthn ? sibAuth.fetchAuthn(u, i) : fetch(u, i)) as typeof fetch;
      // §3 : à chaque 401 → purge du cache sibStore + redirect login OIDC.
      const store = window.sibStore as unknown as { fetch?: typeof fetch; cache?: { clear?: () => void } };
      if (typeof store.fetch === 'function') {
        const origFetch = store.fetch.bind(store);
        store.fetch = (async (u: string | URL, i?: RequestInit) => {
          const res = await origFetch(u as string, i);
          if (res.status === 401) {
            try { store.cache?.clear?.(); } catch { /* cache déjà vidé */ }
            (sibAuth as unknown as { login?: () => void })?.login?.();
            document.dispatchEvent(new CustomEvent('auth-required'));
          }
          return res;
        }) as typeof fetch;
      }
    }
  }
  // Sans shell Orbit standalone : on fournit une promesse résolue pour que les
  // composants montés plus tard (navigation) déclenchent leur chargement aussi.
  window.orbit ??= { ready: Promise.resolve() };
  await window.orbit.ready;
  document.dispatchEvent(new CustomEvent('orbit-ready'));
  render();
  renderMenu(currentRole(sibAuth));
  console.info(`[app-supervision] pod=${config.podUrl} issuer=${config.oidcIssuer}`);
}

document.addEventListener('requestNavigation', (e) => {
  const d = (e as CustomEvent).detail ?? {};
  lastNav = d;
  const def = orbit.routes.find((r) => r.name === d.route);
  const path = d.resource ?? def?.path ?? '/';
  window.history.pushState({}, '', path);
  render();
  renderMenu(currentRole(document.querySelector('sib-auth')));
});
window.addEventListener('popstate', () => {
  render();
  renderMenu(currentRole(document.querySelector('sib-auth')));
});

main();
