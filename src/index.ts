// Bootstrap (spec front §4) : sibStore + sib-auth + mini-routeur standalone.
// Store seul (pose window.sibStore) — PAS le barrel '@startinblox/core' complet :
// celui-ci embarque TinyMCE/Quill qui s'initialisent au import et plantent en module ES
// (document.currentScript == null → toAbsPath(undefined)).
import '@startinblox/core/dist/store.js';
import '@startinblox/oidc'; // enregistre <sib-auth> (restore de session)
// Login OIDC direct avec clientId statique (D-7 : Keycloak ne fait pas de dynamic
// registration — le login de sib-auth-provider en clientName échoue).
import { login as oidcLogin, fetch as fetchAuthnInrupt } from '@inrupt/solid-client-authn-browser';
import './styles.css';
import { config } from './config';
import { installFixtureFallback, installFixtureProxy } from './lib/fixtures.js';
import { matchPath, componentsFor, menuItems, userLabel } from './lib/router.js';
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
function currentRole(_sibAuth: HTMLElement | null): string {
  const w = window as unknown as { appRole?: string };
  return w.appRole ?? 'gestionnaire';
}



// Header : le webId arrive de façon asynchrone (promesse de session sib-auth).
async function renderHeaderAsync(sibAuth: HTMLElement | null): Promise<void> {
  const user = document.getElementById('user');
  if (!user || !sibAuth) return;
  const session = await (sibAuth as unknown as { session?: Promise<{ webId?: string } | null> }).session;
  const webid = session?.webId ?? '';
  user.textContent = webid ? userLabel({ webid }) : '';
}

// Header : utilisateur connecté (claims OIDC) + déconnexion (sib-auth si dispo).
function renderHeader(sibAuth: HTMLElement | null): void {
  renderHeaderAsync(sibAuth);
  const logout = document.getElementById('logout');
  if (logout && !logout.dataset.wired) {
    logout.dataset.wired = '1';
    logout.addEventListener('click', () => {
      const auth = sibAuth as unknown as { logout?: () => void };
      if (auth?.logout) auth.logout();
      else document.dispatchEvent(new CustomEvent('auth-logout'));
    });
  }
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
    getFetch?: () => typeof fetch;
    login?: () => void;
    logout?: () => void;
    session?: Promise<{ webId?: string } | null>;
  }) | null;
  // API @startinblox/oidc@0.16.6 : le provider enfant porte data-authority (issuer)
  // et data-client-name ; <sib-auth auto-login> déclenche la redirection Keycloak.
  const provider = document.querySelector('sib-auth-provider');
  if (provider) {
    provider.setAttribute('data-authority', config.oidcIssuer); // realm Keycloak de la FAP (D-7)
    provider.setAttribute('data-client-name', config.oidcClientId); // client statique fap-light-ui
  }
  if (sibAuth) {
    if (window.sibStore) {
      // §13.7 : fetch authentifié (DPoP) injecté dans sibStore, point d'injection unique.
      // Wrapper résolu à l'appel : <sib-auth> peut s'upgrader après ce main().
      // Repli fixture démo sur /app/query si le back ne répond pas (VITE_FIXTURES != '0').
      const fixturesOn = config.fixtures !== '0';
      // fetch authentifié Inrupt (DPoP) = point d'injection unique dans sibStore (§13.7).
      (window.sibStore as { fetchAuthn?: typeof fetch }).fetchAuthn = installFixtureProxy(
        fetchAuthnInrupt as typeof fetch,
        { enabled: fixturesOn },
      );
      installFixtureFallback(window.sibStore, { enabled: fixturesOn });
      // §3 : à chaque 401 → purge du cache sibStore + redirect login OIDC.
      const store = window.sibStore as unknown as { fetch?: typeof fetch; cache?: { clear?: () => void } };
      if (typeof store.fetch === 'function') {
        const origFetch = store.fetch.bind(store);
        store.fetch = (async (u: string | URL, i?: RequestInit) => {
          const res = await origFetch(u as string, i);
          if (res.status === 401) {
            try { store.cache?.clear?.(); } catch { /* cache déjà vidé */ }
            void oidcLogin({ oidcIssuer: config.oidcIssuer, clientId: config.oidcClientId, redirectUrl: window.location.href });
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
  // Pas de session → redirection login OIDC (clientId statique, D-7).
  const session = await sibAuth?.session ?? null;
  if (!session) {
    await oidcLogin({ oidcIssuer: config.oidcIssuer, clientId: config.oidcClientId, redirectUrl: window.location.href });
  }
  document.dispatchEvent(new CustomEvent('orbit-ready'));
  render();
  renderHeader(sibAuth);
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
  renderHeader(document.querySelector('sib-auth'));
  renderMenu(currentRole(document.querySelector('sib-auth')));
});
window.addEventListener('popstate', () => {
  render();
  renderHeader(document.querySelector('sib-auth'));
  renderMenu(currentRole(document.querySelector('sib-auth')));
});

main();
