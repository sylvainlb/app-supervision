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
import { getJson } from '../components/boilerplate/index.js';
import { field } from './lib/context.js';
import orbit from '../orbit.json';
import '../components/building-map/building-map.js';
import '../components/energy-chart/energy-chart.js';
import '../components/anomaly-list/anomaly-list.js';
import '../components/ticket-board/ticket-board.js';
import '../components/ticket-detail/ticket-detail.js';
import '../components/ticket-new/ticket-new.js';
import '../components/user-admin/user-admin.js';
import '../components/kpi-summary/kpi-summary.js';
import '../components/building-header/building-header.js';
// App store (app-store-spec.md v0.4) : helpers window.appStore + blox <app-menu>/<app-store>.
import { appStore } from '../components/shared/app-store-api.js';
import '../components/app-menu/app-menu.js';
import '../components/app-store/app-store.js';

declare global {
  interface Window {
    // `any` : demo.ts déclare aussi ces globales (any) — TS2717 sinon.
    orbit?: any;
    sibStore?: any;
    appRole?: string;
  }
}

// Session OIDC unique (DPoP). Le login demande « openid offline_access » en dur dans
// oidc-client-ext ; Keycloak 26.4 refuse offline_access pour ce client (not_allowed) →
// on réécrit l'URL d'autorisation pour ne garder que « openid » (un refresh_token est
// de toute façon émis). Via handleRedirect, sans patcher la librairie.
const session = new Session();

function loginRedirect(redirectPath?: string): Promise<never> {
  return session.login({
    oidcIssuer: config.oidcIssuer,
    clientId: config.oidcClientId,
    // URL de retour PROPRE (sans query) : repartir de location.href réinjecterait
    // ?code=…&session_state=… dans redirect_uri → l'URL grossit à chaque boucle et
    // Keycloak finit par la rejeter (> 4000 car. → invalid_redirect_uri).
    // redirectPath (boot) = deep link demandé : la lib ayant pu réécrire l'URL vers
    // l'ancien callback '/', on ne se fie pas à location.pathname ici.
    redirectUrl: window.location.origin + (redirectPath ?? window.location.pathname),
    // Le FAP-LDP valide les tokens via userinfo en « Bearer » (fap-ldp ldp-container.js) :
    // un token DPoP-bound (cnf) est refusé par userinfo → 401. On demande donc un token
    // Bearer (déviation DPoP notée ; le challenge WWW-Authenticate: DPoP reste côté serveur).
    tokenType: 'Bearer',
    handleRedirect: (url: string) => {
      // scope=openid : offline_access est refusé par Keycloak 26.4 pour ce client
      // (not_allowed) ; le vrai nom passe par le claim « name » mappé côté client.
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

// Vrai nom de l'utilisateur, mis en cache : d'abord via l'endpoint userinfo OIDC de
// Keycloak (claims name/given_name — /users/<id> est protégé par ACL, lisible admin
// seulement), repli sur la ressource LDP si userinfo échoue.
const userNameCache = new Map<string, string>();
async function resolveUserName(webid: string): Promise<string> {
  if (userNameCache.has(webid)) return userNameCache.get(webid) ?? '';
  let name = '';
  try {
    const res = await session.fetch(`${config.oidcIssuer}/protocol/openid-connect/userinfo`);
    if (res.ok) {
      const info = (await res.json()) as Record<string, unknown>;
      name = String(
        info.name ??
        [info.given_name, info.family_name].filter(Boolean).join(' ') ??
        info.preferred_username ?? ''
      );
    }
  } catch { /* repli LDP ci-dessous */ }
  if (!name) {
    try {
      const data = await getJson(new URL(webid).pathname); // ex. /users/1
      name = String(field(data, 'name') ?? field(data, 'email') ?? '');
    } catch { /* repli sur le webid */ }
  }
  userNameCache.set(webid, name);
  return name;
}

// Header : utilisateur connecté (nom réel LDP + rôle) + déconnexion.
function renderHeader(): void {
  const user = document.getElementById('user');
  if (user) {
    const webid = session.info.isLoggedIn ? session.info.webId ?? '' : '';
    const role = currentRole();
    user.textContent = webid ? userLabel({ webid, role }) : '';
    if (webid) {
      void resolveUserName(webid).then((name) => {
        if (name) user.textContent = userLabel({ webid, name, role });
      });
    }
  }
  const logout = document.getElementById('logout');
  if (logout && !logout.dataset.wired) {
    logout.dataset.wired = '1';
    logout.addEventListener('click', () => {
      void session.logout().finally(() => window.location.assign(window.location.pathname));
    });
  }
  // App store : outil de configuration du menu, à part des entrées de navigation.
  // Page pleine dans le main (#app) via la route /store — pas de menu latéral.
  const storeBtn = document.getElementById('appstore');
  if (storeBtn && !storeBtn.dataset.wired) {
    storeBtn.dataset.wired = '1';
    storeBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('requestNavigation', { detail: { route: 'store', resource: '/store' } }));
    });
  }
}

// Icônes SVG inline (stroke currentColor) pour les entrées du menu.
const MENU_ICONS: Record<string, string> = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  anomalies: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  tickets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-5z"/><line x1="13" y1="5" x2="13" y2="19" stroke-dasharray="2.5 3"/></svg>',
  interventions: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3 3.7-3.7z"/></svg>',
  admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/></svg>',
  'ticket-new': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
};

function renderMenu(role: string): void {
  const nav = document.getElementById('menu');
  if (!nav) return;
  // Menu dynamique généré depuis les prefs (app-store-spec §1.6.1) quand le
  // catalogue /features/ est servi par le back ; sinon menu statique de secours.
  if ((window as unknown as { __appStoreOK?: boolean }).__appStoreOK) {
    nav.replaceChildren();
    const el = document.createElement('app-menu');
    el.setAttribute('theme', 'dark');
    nav.appendChild(el);
    return;
  }
  const current = window.location.pathname;
  const links = menuItems(orbit.routes, role)
    .filter((item) => item.visible && item.menu !== false) // menu:false (ex. /store) : hors menu, atteint via le header
    .map((item) => {
      const active = current === item.path ? ' class="active"' : '';
      const icon = MENU_ICONS[item.name] ?? '';
      return `<a data-route="${item.name}" data-path="${item.path}"${active}>${icon}<span class="lbl">${item.label}</span></a>`;
    })
    .join('');
  nav.innerHTML = '<h1>Navigation</h1>' + links;
  nav.querySelectorAll('a[data-route]').forEach((a) => {
    a.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('requestNavigation', {
        detail: { route: a.getAttribute('data-route'), resource: a.getAttribute('data-path') },
      }));
    });
  });
}

function mountInto(parent: HTMLElement, tag: string): void {
  const el = document.createElement(tag) as HTMLElement & { dataSrc?: string; building?: string; anomaly?: string; webid?: string };
  if (tag === 'ticket-detail' || tag === 'building-header') el.dataSrc = window.location.pathname;
  if (tag === 'ticket-new' && lastNav.query?.anomaly) el.anomaly = String(lastNav.query.anomaly);
  if (window.location.pathname.startsWith('/buildings/')) {
    if (tag === 'energy-chart' || tag === 'anomaly-list') el.building = window.location.pathname;
  }
  parent.appendChild(el);
}

// Cible du lien « retour » selon la page de détail courante.
function backTarget(name: string, role: string): { route: string; path: string; label: string } | null {
  if (name === 'building-detail') return { route: 'dashboard', path: '/', label: '← Back to dashboard' };
  if (name === 'ticket-detail') {
    return role === 'technicien'
      ? { route: 'interventions', path: '/interventions', label: '← Back to my interventions' }
      : { route: 'tickets', path: '/tickets', label: '← Back to tickets' };
  }
  if (name === 'ticket-new') return { route: 'tickets', path: '/tickets', label: '← Back to tickets' };
  return null;
}

function render(): void {
  const app = document.getElementById('app');
  if (!app) return;
  const m = matchPath(window.location.pathname, orbit.routes);
  const route = m?.route;
  const name = m?.name ?? 'dashboard';
  app.replaceChildren();
  // App store non déployé côté back (GET /features/ → 404) : panneau explicite
  // au lieu du composant, qui sinon afficherait une erreur sèche.
  if (name === 'store' && !(window as unknown as { __appStoreOK?: boolean }).__appStoreOK) {
    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = "App store indisponible : GET /features/ → 404 côté serveur. Intégrer app-store/model/app-store.model.json au model.json de l'app (boot) + sql/012_backfill_prefs.sql (rôle admin) + seed 101_seed_demo.sql, ou lancer en démo avec VITE_FIXTURES=1.";
    app.appendChild(p);
    return;
  }
  // Pages de détail (chemin avec paramètre) : lien « retour » vers la liste d'origine.
  if (route?.path.includes(':')) {
    const back = backTarget(name, currentRole());
    if (back) {
      const a = document.createElement('a');
      a.className = 'back-link';
      a.textContent = back.label;
      a.dataset.route = back.route;
      a.dataset.path = back.path;
      app.appendChild(a);
    }
  }
  // Route avec sections titrées (ex. tableau de bord) : <section><h2>…</h2>composants</section>
  if (route?.sections?.length) {
    for (const section of route.sections) {
      const sec = document.createElement('section');
      sec.className = 'dash-section';
      const h = document.createElement('h2');
      h.textContent = section.title;
      sec.appendChild(h);
      if (section.hint) {
        const p = document.createElement('p');
        p.className = 'sec-hint';
        p.textContent = section.hint;
        sec.appendChild(p);
      }
      for (const tag of section.components) mountInto(sec, tag);
      app.appendChild(sec);
    }
    return;
  }
  for (const tag of componentsFor(name, orbit.routes)) mountInto(app, tag);
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
  // On mémorise l'URL de boot : restorePreviousSession réécrit l'URL vers l'URL de
  // redirect mémorisée (ex. « / ») via replaceState — il faut restaurer le deep link
  // demandé (ex. /store, /tickets/22) quand on n'était PAS sur un callback ?code=….
  const bootUrl = window.location.pathname + window.location.search;
  const wasCallback = new URLSearchParams(window.location.search).has('code');
  try {
    await session.handleIncomingRedirect({ restorePreviousSession: true });
  } catch (err) {
    console.warn('[app-supervision] handleIncomingRedirect en erreur :', err);
  }
  // La lib peut récrire l'URL (replaceState vers l'URL de callback mémorisée) un tick
  // APRÈS la résolution de sa promesse : on attend, puis on restaure le deep link demandé.
  if (!wasCallback) {
    await new Promise((r) => setTimeout(r, 150));
    if (window.location.pathname + window.location.search !== bootUrl) {
      window.history.replaceState({}, '', bootUrl);
    }
  }
  if (!session.info.isLoggedIn) {
    // Pas de session : on rend le shell (jamais de page blanche) puis on redirige.
    document.dispatchEvent(new CustomEvent('orbit-ready'));
    renderAll();
    await loginRedirect(wasCallback ? undefined : bootUrl); // navigue vers Keycloak
    return;
  }
  // App store : helpers configurés avec la session (§1.9.12 — webid → /prefs/<pk>),
  // puis catalogue + prefs chargées. Si /features/ n'est pas servi (app-store non
  // déployé côté back), __appStoreOK=false → menu statique de secours.
  appStore.configure({
    podUrl: config.podUrl,
    getWebid: () => session.info.webId ?? '',
    getRole: () => currentRole(),
  });
  (window as unknown as { __appStoreOK?: boolean }).__appStoreOK =
    await appStore.refresh().then(() => true).catch(() => false);
  // Le shell est rendu QUOI QU'IL ARRIVE : une erreur ne doit pas laisser une page blanche.
  document.dispatchEvent(new CustomEvent('orbit-ready'));
  renderAll();
  console.info(`[app-supervision] pod=${config.podUrl} issuer=${config.oidcIssuer} webid=${session.info.webId ?? ''} appStore=${(window as unknown as { __appStoreOK?: boolean }).__appStoreOK}`);
}

// Clic sur un lien « retour » (rendu dans #app) → même navigation que le menu.
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest?.('a.back-link') as HTMLElement | null;
  if (!a) return;
  e.preventDefault();
  document.dispatchEvent(new CustomEvent('requestNavigation', {
    detail: { route: a.dataset.route, resource: a.dataset.path },
  }));
});

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
    app.innerHTML = '<p class="error">Error loading the application — see the console.</p>';
  }
  renderAll();
});
