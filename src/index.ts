// Bootstrap (spec front §4) : sibStore + session OIDC (DPoP) + mini-routeur standalone.
// Store seul (pose window.sibStore) — PAS le barrel '@startinblox/core' complet :
// celui-ci embarque TinyMCE/Quill qui s'initialisent au import et plantent en module ES.
import './lib/fetch-bind.js'; // AVANT toute librairie : bind globalThis.fetch (voir le fichier)
import '@startinblox/core/dist/store.js';
// Une SEULE librairie OIDC côté front : @inrupt/solid-client-authn-browser (D-7 :
// clientId statique — Keycloak ne fait pas de dynamic registration, le login de
// sib-auth-provider en clientName échoue). <sib-auth> n'est PAS utilisé : il embarque
// la même lib en double et les deux se disputent le code (invalid_grant en boucle).
import { Session } from '@inrupt/solid-client-authn-browser';
import './styles.css';
import { config } from './config.js';
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
    appRole?: string;
  }
}

// Session OIDC unique (DPoP). Le login demande « openid offline_access » en dur dans
// oidc-client-ext ; Keycloak 26.4 refuse offline_access pour ce client (not_allowed) →
// on réécrit l'URL d'autorisation pour ne garder que « openid » (un refresh_token est
// de toute façon émis). Via handleRedirect, sans patcher la librairie.
const session = new Session();

function loginRedirect(): Promise<never> {
  return session.login({
    oidcIssuer: config.oidcIssuer,
    clientId: config.oidcClientId,
    redirectUrl: window.location.href,
    // Le FAP-LDP valide les tokens via userinfo en « Bearer » (fap-ldp ldp-container.js) :
    // un token DPoP-bound (cnf) est refusé par userinfo → 401. On demande donc un token
    // Bearer (déviation DPoP notée ; le challenge WWW-Authenticate: DPoP reste côté serveur).
    tokenType: 'Bearer',
    handleRedirect: (url: string) => {
      window.location.assign(url.replace('scope=openid%20offline_access', 'scope=openid'));
    },
  }) as Promise<never>;
}

let lastNav: { route?: string; resource?: string; query?: Record<string, unknown> } = {};

// Rôle courant pour le menu (§8 : le rôle pilote l'assemblage des écrans, jamais la
// décision d'accès — l'ACL/RLS reste côté serveur). Overridable via window.appRole.
function currentRole(): string {
  return window.appRole ?? 'gestionnaire';
}

// Header : utilisateur connecté (webId OIDC) + déconnexion.
function renderHeader(): void {
  const user = document.getElementById('user');
  if (user) {
    const webid = session.info.isLoggedIn ? session.info.webId ?? '' : '';
    user.textContent = webid ? userLabel({ webid }) : '';
  }
  const logout = document.getElementById('logout');
  if (logout && !logout.dataset.wired) {
    logout.dataset.wired = '1';
    logout.addEventListener('click', () => {
      void session.logout().finally(() => window.location.assign(window.location.pathname));
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

function renderAll(): void {
  render();
  renderHeader();
  renderMenu(currentRole());
}

async function main(): Promise<void> {
  if (window.sibStore) {
    // §13.7 : fetch authentifié (DPoP) injecté dans sibStore, point d'injection unique.
    // Repli fixture démo si le back ne répond pas (VITE_FIXTURES != '0').
    const fixturesOn = config.fixtures !== '0';
    // Client autonome (servi par vite, pas par le back) : les data-src relatifs
    // ('/buildings/', '/tickets/<pk>', …) sont résolus par sibStore contre location.href —
    // on les réécrit en ABSOLU vers POD_URL pour atteindre le back en cross-origin
    // (CORS géré par le back, /auth par Keycloak via webOrigins).
    const toPod = (u: string | URL): string => {
      const abs = new URL(String(u), window.location.href);
      if (abs.origin !== window.location.origin) return String(u);
      return config.podUrl.replace(/\/+$/, '') + abs.pathname + abs.search + abs.hash;
    };
    const authn = installFixtureProxy(session.fetch.bind(session) as typeof fetch, { enabled: fixturesOn });
    (window.sibStore as { fetchAuthn?: typeof fetch }).fetchAuthn = (async (u: string | URL, i?: RequestInit) =>
      authn(toPod(u), i)) as typeof fetch;
    installFixtureFallback(window.sibStore, { enabled: fixturesOn });
    // §3 : à chaque 401 → purge du cache sibStore + redirect login OIDC.
    const store = window.sibStore as unknown as { fetch?: typeof fetch; cache?: { clear?: () => void } };
    if (typeof store.fetch === 'function') {
      const origFetch = store.fetch.bind(store);
      store.fetch = (async (u: string | URL, i?: RequestInit) => {
        const res = await origFetch(toPod(u), i);
        if (res.status === 401) {
          try { store.cache?.clear?.(); } catch { /* cache déjà vidé */ }
          document.dispatchEvent(new CustomEvent('auth-required'));
          void loginRedirect();
        }
        return res;
      }) as typeof fetch;
    }
  }
  // Sans shell Orbit standalone : promesse résolue pour que les composants montés
  // plus tard (navigation) déclenchent leur chargement aussi.
  window.orbit ??= { ready: Promise.resolve() };
  await window.orbit.ready;
  // Session OIDC D'ABORD (callback ?code=… ou restauration) : les composants ne sont
  // montés qu'une fois la session connue, sinon leurs appels LDP partent en 401.
  try {
    await session.handleIncomingRedirect({ restorePreviousSession: true });
  } catch (err) {
    console.warn('[app-supervision] handleIncomingRedirect en erreur :', err);
  }
  if (!session.info.isLoggedIn) {
    // Pas de session : on rend le shell (jamais de page blanche) puis on redirige.
    document.dispatchEvent(new CustomEvent('orbit-ready'));
    renderAll();
    await loginRedirect(); // navigue vers Keycloak
    return;
  }
  // Le shell est rendu QUOI QU'IL ARRIVE : une erreur ne doit pas laisser une page blanche.
  document.dispatchEvent(new CustomEvent('orbit-ready'));
  renderAll();
  console.info(`[app-supervision] pod=${config.podUrl} issuer=${config.oidcIssuer} webid=${session.info.webId ?? ''}`);
}

document.addEventListener('requestNavigation', (e) => {
  const d = (e as CustomEvent).detail ?? {};
  lastNav = d;
  const def = orbit.routes.find((r) => r.name === d.route);
  let path = d.resource ?? def?.path ?? '/';
  // Les composants passent des IRI absolues du pod (http://localhost/tickets/22) :
  // pushState n'accepte que des chemins same-origin → on ne garde que le pathname.
  try {
    const u = new URL(path, window.location.href);
    if (u.origin === new URL(config.podUrl, window.location.href).origin || u.origin === window.location.origin) {
      path = u.pathname + u.search;
    }
  } catch { /* path relatif ou invalide : inchangé */ }
  window.history.pushState({}, '', path);
  renderAll();
});
window.addEventListener('popstate', () => renderAll());

main().catch((err) => {
  // Dernier filet : jamais de page blanche sans explication.
  console.error('[app-supervision] bootstrap en erreur :', err);
  const app = document.getElementById('app');
  if (app && !app.childElementCount) {
    app.innerHTML = '<p class="error">Erreur au chargement de l’application — voir la console.</p>';
  }
  renderAll();
});
