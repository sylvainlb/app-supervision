// Bootstrap (front spec §4): sibStore + OIDC session (DPoP) + standalone mini-router.
// Store only (sets window.sibStore) — NOT the full '@startinblox/core' barrel:
// it bundles TinyMCE/Quill which initialize at import time and crash as ES modules.
import './lib/fetch-bind.js'; // BEFORE any library: bind globalThis.fetch (see the file)
import '@startinblox/core/dist/store.js';
// A SINGLE OIDC library on the front side: @inrupt/solid-client-authn-browser (D-7:
// static clientId — Keycloak does no dynamic registration, sib-auth-provider's
// clientName login fails). <sib-auth> is NOT used: it bundles the same lib twice
// and both fight over the code (invalid_grant loop).
import { Session } from '@inrupt/solid-client-authn-browser';
import './styles.css';
import { config } from './config.js';
import { installFixtureFallback, installFixtureProxy } from './lib/fixtures.js';
import { matchPath, componentsFor, menuItems, userLabel } from './lib/router.js';
import { getJson } from '@facis/app-store/components/boilerplate/index.js';
import { field } from './lib/context.js';
import orbit from '../orbit.json';
// v2: NO business component imported statically — everything goes through the CDN
// (bundle public/features-dist/<slug>.js, SRI checked before import, see render()).
// Only remain packaged: the app store mechanism (<app-menu>/<app-store>/<dynamic-feature>,
// bootstrap) and the boilerplate. In fixtures mode (VITE_FIXTURES=1, no back), the
// business components are loaded on demand in separate chunks (see render()).
import { loadRemoteModule } from '@facis/app-store/components/shared/loader.js';
// App store (app-store-spec.md v0.4) : helpers window.appStore + blox <app-menu>/<app-store>.
import { appStore } from '@facis/app-store/components/shared/app-store-api.js';
import { isDistant, isInstalled, installPatch, declarativeRoutes, get as getField } from '@facis/app-store/components/shared/logic.js';
import '@facis/app-store/components/app-menu/app-menu.js';
import '@facis/app-store/components/app-store/app-store.js';
import '@facis/app-store/components/my-apps/my-apps.js';
import '@facis/app-store/components/dynamic-feature/dynamic-feature.js';
// Workstream 3 — declarative UI editor (packaged like the app-store mechanism): /editor route.
import '@facis/app-ui-editor/src/editor.js';
import '@facis/app-ui-editor/src/canvas.js';
// Workstream 2 — model editor with semantic profile (packaged like app-ui-editor): /model-editor route.
import '@facis/app-model-editor';

declare global {
  interface Window {
    // `any`: demo.ts also declares these globals (any) — TS2717 otherwise.
    orbit?: any;
    sibStore?: any;
    appRole?: string;
  }
}

// Single OIDC session (DPoP). The login requests "openid offline_access" hard-coded in
// oidc-client-ext; Keycloak 26.4 rejects offline_access for this client (not_allowed) →
// we rewrite the authorization URL to keep only "openid" (a refresh_token is
// issued anyway). Via handleRedirect, without patching the library.
const session = new Session();

function loginRedirect(redirectPath?: string): Promise<never> {
  return session.login({
    oidcIssuer: config.oidcIssuer,
    clientId: config.oidcClientId,
    // CLEAN return URL (no query): restarting from location.href would re-inject
    // ?code=…&session_state=… into redirect_uri → the URL grows on each loop and
    // Keycloak ends up rejecting it (> 4000 chars → invalid_redirect_uri).
    // redirectPath (boot) = requested deep link: the lib may have rewritten the URL to
    // the old callback '/', so we do not rely on location.pathname here.
    redirectUrl: window.location.origin + (redirectPath ?? window.location.pathname),
    // FAP-LDP validates tokens via userinfo in "Bearer" (fap-ldp ldp-container.js):
    // a DPoP-bound token (cnf) is rejected by userinfo → 401. So we request a
    // Bearer token (DPoP deviation noted; the WWW-Authenticate: DPoP challenge stays server-side).
    tokenType: 'Bearer',
    handleRedirect: (url: string) => {
      // scope=openid: offline_access is rejected by Keycloak 26.4 for this client
      // (not_allowed); the real name comes from the "name" claim mapped client-side.
      sessionStorage.setItem('app.loginOut', '1'); // callback expected on return
      window.location.assign(url.replace('scope=openid%20offline_access', 'scope=openid'));
    },
  }) as Promise<never>;
}

let lastNav: { route?: string; resource?: string; query?: Record<string, unknown> } = {};

// Current role for the menu (§8: the role drives screen assembly, never the
// access decision — ACL/RLS stays server-side). Overridable via window.appRole.
function currentRole(): string {
  // CANONICAL role = Keycloak 'role' claim (realm values, FR: manager |
  // technician | admin) — the back (RLS, transition matrix) consumes this
  // value, it must never be translated.
  return window.appRole ?? 'manager';
}

// The front side (orbit.json roles, catalogue /features/ role_min, transitions)
// is EN ('manager' | 'technician' | 'admin'). Map the canonical FR role at the
// boundary: everything that COMPARES against orbit.json / the catalogue uses
// menuRole(); everything sent to or coming from the back uses currentRole().
const ROLE_EN: Record<string, string> = { manager: 'manager', technician: 'technician', admin: 'admin' };
function menuRole(): string {
  const r = currentRole();
  return ROLE_EN[r] ?? r; // already EN (window.appRole override) → unchanged
}

// Real user name, cached: first via Keycloak's OIDC userinfo endpoint
// (name/given_name claims — /users/<id> is ACL-protected, readable by admin
// only), fallback to the LDP resource if userinfo fails.
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
  } catch { /* LDP fallback below */ }
  if (!name) {
    try {
      const data = await getJson(new URL(webid).pathname); // e.g. /users/1
      name = String(field(data, 'name') ?? field(data, 'email') ?? '');
    } catch { /* fallback to the webid */ }
  }
  userNameCache.set(webid, name);
  return name;
}

// RP-initiated logout (OIDC): session.logout() only clears the LOCAL storage —
// without calling Keycloak's end_session_endpoint, the SSO cookie stays valid and
// the automatic loginRedirect() at boot would silently re-login via SSO right after.
// So: read the id_token first (session.logout() clears it), clear the local session,
// then redirect to the IdP end_session_endpoint, which revokes the tokens, ends the
// SSO session and sends us back to the app origin (post_logout_redirect_uri — the
// client's post.logout.redirect.uris is '+', i.e. any of its redirectUris).
async function readIdToken(): Promise<string> {
  try {
    const mgr = (session as unknown as {
      clientAuthentication?: { sessionInfoManager?: { get: (id: string) => Promise<{ idToken?: string }> } };
    }).clientAuthentication?.sessionInfoManager;
    const info = await mgr?.get?.(session.info.sessionId);
    return info?.idToken ?? '';
  } catch {
    return '';
  }
}

async function logoutAndRedirect(): Promise<never> {
  const idToken = await readIdToken(); // BEFORE session.logout(): it clears the storage
  try { await session.logout(); } catch { /* local clear already best-effort */ }
  sessionStorage.removeItem('app.loginOut');
  let endSession = `${config.oidcIssuer}/protocol/openid-connect/logout`; // Keycloak standard path
  try {
    const disc = await fetch(`${config.oidcIssuer}/.well-known/openid-configuration`).then((r) => r.json()) as { end_session_endpoint?: string };
    if (disc.end_session_endpoint) endSession = disc.end_session_endpoint;
  } catch { /* fallback above */ }
  const u = new URL(endSession);
  if (idToken) u.searchParams.set('id_token_hint', idToken);
  u.searchParams.set('client_id', config.oidcClientId);
  u.searchParams.set('post_logout_redirect_uri', window.location.origin + '/');
  return window.location.assign(u.toString()) as never;
}

// Header: logged-in user (real LDP name + role) + logout.
// Initials for the header avatar: first 2 letters of the first 2 words
// of the displayed name (without the role in parentheses), e.g. "Claire Martin" → "CM".
function initialsOf(label: string): string {
  const name = label.split('(')[0].trim();
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  const ini = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  return ini || '?';
}

// Dropdown menu of the account block (avatar + name): App store / Log out.
function wireAccountMenu(): void {
  const btn = document.getElementById('account-btn');
  const menu = document.getElementById('account-menu');
  if (!btn || !menu || btn.dataset.wired) return;
  btn.dataset.wired = '1';
  const setOpen = (open: boolean) => {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(menu.hidden);
  });
  // Close on outside click or Escape.
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !menu.contains(e.target as Node)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); }
  });
  menu.addEventListener('click', () => setOpen(false)); // any menu action closes it
}

function renderHeader(): void {
  const user = document.getElementById('user');
  const avatar = document.getElementById('avatar');
  if (user) {
    const webid = session.info.isLoggedIn ? session.info.webId ?? '' : '';
    const role = menuRole(); // EN display (the FR claim remains the canonical value)
    const label = webid ? userLabel({ webid, role }) : '';
    user.textContent = label;
    if (avatar) avatar.textContent = initialsOf(label);
    if (webid) {
      void resolveUserName(webid).then((name) => {
        if (name) {
          user.textContent = userLabel({ webid, name, role });
          if (avatar) avatar.textContent = initialsOf(userLabel({ webid, name, role }));
        }
      });
    }
  }
  wireAccountMenu();
  const logout = document.getElementById('logout');
  if (logout && !logout.dataset.wired) {
    logout.dataset.wired = '1';
    logout.addEventListener('click', () => {
      void logoutAndRedirect();
    });
  }
  // App store: menu configuration tool, separate from the navigation entries.
  // Full page in the main (#app) via the /store route — no side menu.
  const storeBtn = document.getElementById('appstore');
  if (storeBtn && !storeBtn.dataset.wired) {
    storeBtn.dataset.wired = '1';
    storeBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('requestNavigation', { detail: { route: 'store', resource: '/store' } }));
    });
  }
  // My apps: hub listing the published components (UI + AI) in /components/,
  // with creation (UI editor / AI editor) and modification (deep links
  // /editor?component=… , /ai-editor?component=…). The editors remain deep
  // routes; the "My apps" entry point is the list, not the editor.
  const appsBtn = document.getElementById('uieditor');
  if (appsBtn && !appsBtn.dataset.wired) {
    appsBtn.dataset.wired = '1';
    appsBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('requestNavigation', { detail: { route: 'my-apps', resource: '/my-apps' } }));
    });
  }
  // Model registry: read-only registry view (GET /shapes/ index + published contracts),
  // route open to every authenticated role (orbit.json model-registry).
  const registryBtn = document.getElementById('modelregistry');
  if (registryBtn && !registryBtn.dataset.wired) {
    registryBtn.dataset.wired = '1';
    registryBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('requestNavigation', { detail: { route: 'model-registry', resource: '/model-registry' } }));
    });
  }
}

// Inline SVG icons (stroke currentColor) for the menu entries.
const MENU_ICONS: Record<string, string> = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  anomalies: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  tickets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-5z"/><line x1="13" y1="5" x2="13" y2="19" stroke-dasharray="2.5 3"/></svg>',
  interventions: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3 3.7-3.7z"/></svg>',
  admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/></svg>',
  'ui-editor': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><line x1="17.5" y1="14" x2="17.5" y2="21"/><line x1="14" y1="17.5" x2="21" y2="17.5"/></svg>',
  'ticket-new': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
};

function renderMenu(role: string): void {
  const nav = document.getElementById('menu');
  if (!nav) return;
  // Dynamic menu generated from the prefs (app-store-spec §1.6.1) when the
  // /features/ catalogue is served by the back; otherwise static fallback menu.
  if ((window as unknown as { __appStoreOK?: boolean }).__appStoreOK) {
    nav.replaceChildren();
    const el = document.createElement('app-menu');
    nav.appendChild(el);
    return;
  }
  const current = window.location.pathname;
  const links = menuItems(orbit.routes, role)
    .filter((item) => item.visible && item.menu !== false) // menu:false (e.g. /store): not in the menu, reached via the header
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
  // Prefer constructing via the registry: for some names document.createElement(tag)
  // returns an unupgraded element in certain engines; new Ctor() is the spec-compliant
  // way to instantiate an autonomous custom element.
  const Ctor = customElements.get(tag);
  const el = (Ctor ? new Ctor() : document.createElement(tag)) as HTMLElement & { dataSrc?: string; building?: string; anomaly?: string; webid?: string; role?: string };
  if (tag === 'ticket-detail' || tag === 'building-header') el.dataSrc = window.location.pathname;
  if (tag === 'ticket-detail') el.role = menuRole(); // transitions matrix is EN (src/lib/transitions.js)
  if (tag === 'ticket-new' && lastNav.query?.anomaly) el.anomaly = String(lastNav.query.anomaly);
  if (window.location.pathname.startsWith('/buildings/')) {
    if (tag === 'energy-chart' || tag === 'anomaly-list') el.building = window.location.pathname;
  }
  parent.appendChild(el);
}

// Target of the "back" link depending on the current detail page.
function backTarget(name: string, role: string): { route: string; path: string; label: string } | null {
  if (name === 'building-detail') return { route: 'dashboard', path: '/', label: '← Back to dashboard' };
  if (name === 'ticket-detail') {
    return role === 'technician'
      ? { route: 'interventions', path: '/interventions', label: '← Back to my interventions' }
      : { route: 'tickets', path: '/tickets', label: '← Back to tickets' };
  }
  if (name === 'ticket-new') return { route: 'tickets', path: '/tickets', label: '← Back to tickets' };
  return null;
}

async function render(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;
  const m = matchPath(window.location.pathname, orbit.routes);
  const route = m?.route;
  const name = m?.name ?? 'dashboard';
  app.replaceChildren();
  // App store not deployed server-side (GET /features/ → 404): explicit panel
  // instead of the component, which would otherwise show a bare error.
  if (name === 'store' && !(window as unknown as { __appStoreOK?: boolean }).__appStoreOK) {
    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = "App store unavailable: GET /features/ → 404 server-side. Add app-store/model/app-store.model.json to the app's model.json (applied at boot) + run sql/012_backfill_prefs.sql (admin role) + seed 101_seed_demo.sql, or run the demo with VITE_FIXTURES=1.";
    app.appendChild(p);
    return;
  }
  // Detail pages (path with a parameter): "back" link to the originating list.
  if (route?.path.includes(':')) {
    const back = backTarget(name, menuRole());
    if (back) {
      const a = document.createElement('a');
      a.className = 'back-link';
      a.textContent = back.label;
      a.dataset.route = back.route;
      a.dataset.path = back.path;
      app.appendChild(a);
    }
  }
  // v2 — NO packaged component: if the route matches a distant feature
  // (cdn_url + sri in the catalogue), we first load its CDN bundle (SRI checked before
  // import, CA-A5), then mount as usual. The guard (§1.9.7) has already redirected if the
  // feature is disabled.
  const feat = (window as unknown as { __appStoreOK?: boolean }).__appStoreOK
    ? appStore.getFeatureByRoute(window.location.pathname)
    : null;
  if (feat && isDistant(feat)) {
    const slug = String(getField(feat, 'slug') ?? '');
    const tags = componentsFor(name, orbit.routes);
    if (tags.length === 0 && !route?.sections?.length) {
      // batch with no components declared in orbit.json → on-the-fly mount via <dynamic-feature>
      const host = document.createElement('dynamic-feature');
      host.setAttribute('slug', slug);
      app.appendChild(host);
      return;
    }
    // the route declares its tags: preload the bundle (SRI) then standard mount
    const ph = document.createElement('p');
    ph.className = 'loading';
    ph.textContent = `Loading ${slug}…`;
    app.appendChild(ph);
    try {
      await loadRemoteModule({
        cdnUrl: String(getField(feat, 'cdn_url') ?? ''),
        sri: String(getField(feat, 'sri') ?? ''),
        tag: String(getField(feat, 'tag') ?? tags[0] ?? ''),
      });
    } catch (e) {
      app.replaceChildren();
      const p = document.createElement('p');
      p.className = 'error';
      p.textContent = `Cannot load feature ${slug}: ${(e as Error).message}`;
      app.appendChild(p);
      return;
    }
    ph.remove(); // remove the "Loading…" placeholder without touching the back link
    // bundle loaded + SRI checked → record the installation in the prefs (§2.2.3:
    // installed_version / installed_sri) so the "installed vX" badge is true
    if (!isInstalled(feat, appStore.getPrefs())) {
      appStore.patchPrefs(installPatch(slug, String(getField(feat, 'version') ?? ''), String(getField(feat, 'sri') ?? '')))
        .catch(() => {}); // 412 → reloaded on next refresh, not blocking
    }
  } else if (!(window as unknown as { __appStoreOK?: boolean }).__appStoreOK) {
    // demo mode without back (VITE_FIXTURES=1): components loaded on demand (separate chunks)
    await Promise.all([
      import('../components/building-map/building-map.js'),
      import('../components/energy-chart/energy-chart.js'),
      import('../components/anomaly-list/anomaly-list.js'),
      import('../components/ticket-board/ticket-board.js'),
      import('../components/ticket-detail/ticket-detail.js'),
      import('../components/ticket-new/ticket-new.js'),
      import('../components/user-admin/user-admin.js'),
      import('../components/kpi-summary/kpi-summary.js'),
      import('../components/building-header/building-header.js'),
    ]);
  }
  // Route with titled sections (e.g. dashboard): <section><h2>…</h2>components</section>
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
  void render();
  renderHeader();
  renderMenu(menuRole());
}

async function main(): Promise<void> {
  if (window.sibStore) {
    // §13.7: authenticated fetch (DPoP) injected into sibStore, single injection point.
    // Demo fixture fallback if the back does not answer (VITE_FIXTURES != '0').
    const fixturesOn = config.fixtures !== '0';
    // Self-contained client (served by vite, not by the back): relative data-src
    // ('/buildings/', '/tickets/<pk>', …) are resolved by sibStore against location.href —
    // we rewrite them ABSOLUTE to POD_URL to reach the back cross-origin
    // (CORS handled by the back, /auth by Keycloak via webOrigins).
    const toPod = (u: string | URL): string => {
      const abs = new URL(String(u), window.location.href);
      if (abs.origin !== window.location.origin) return String(u);
      return config.podUrl.replace(/\/+$/, '') + abs.pathname + abs.search + abs.hash;
    };
    const authn = installFixtureProxy(session.fetch.bind(session) as typeof fetch, { enabled: fixturesOn });
    (window.sibStore as { fetchAuthn?: typeof fetch }).fetchAuthn = (async (u: string | URL, i?: RequestInit) =>
      authn(toPod(u), i)) as typeof fetch;
    installFixtureFallback(window.sibStore, { enabled: fixturesOn });
    // §3: on each 401 → purge the sibStore cache + OIDC login redirect.
    const store = window.sibStore as unknown as { fetch?: typeof fetch; cache?: { clear?: () => void } };
    if (typeof store.fetch === 'function') {
      const origFetch = store.fetch.bind(store);
      store.fetch = (async (u: string | URL, i?: RequestInit) => {
        const res = await origFetch(toPod(u), i);
        if (res.status === 401) {
          try { store.cache?.clear?.(); } catch { /* cache already cleared */ }
          document.dispatchEvent(new CustomEvent('auth-required'));
          void loginRedirect();
        }
        return res;
      }) as typeof fetch;
    }
  }
  // Without the standalone Orbit shell: resolved promise so that components mounted
  // later (navigation) also trigger their loading.
  window.orbit ??= { ready: Promise.resolve() };
  await window.orbit.ready;
  // OIDC session FIRST (?code=… callback or restore): components are mounted only once
  // the session is known, otherwise their LDP calls would go out as 401.
  // We remember the boot URL: restorePreviousSession rewrites the URL to the remembered
  // redirect URL (e.g. "/") via replaceState — we must restore the requested deep link
  // (e.g. /store, /tickets/22) when we were NOT on a ?code=… callback.
  // Deep link after reload: the OIDC lib (restorePreviousSession) may navigate
  // back to the remembered callback URL (?session_state&iss) instead of the requested URL.
  // 1) We remember the requested path on each boot; if we boot on a callback URL
  //    without a code, we restore the remembered path.
  const stripAuthParams = (u: string) => {
    const url = new URL(u, window.location.origin);
    for (const p of ['code', 'state', 'session_state', 'iss']) url.searchParams.delete(p);
    return url.pathname + url.search;
  };
  const q = new URLSearchParams(window.location.search);
  // FRESH callback (we just went to Keycloak): let the lib exchange the code.
  // Otherwise, if the URL contains auth leftovers (consumed code / session_state / iss) —
  // the lib restorePreviousSession navigates back to the old callback — we restore the deep link.
  const loginOut = sessionStorage.getItem('app.loginOut') === '1';
  if (q.has('code') && loginOut) {
    sessionStorage.removeItem('app.loginOut');
  } else if (q.has('code') || q.has('session_state') || q.has('iss')) {
    const remembered = sessionStorage.getItem('app.bootPath');
    const target = remembered ? stripAuthParams(remembered) : '/';
    if (stripAuthParams(window.location.pathname + window.location.search) !== target) {
      window.history.replaceState({}, '', target);
    }
  }
  const bootUrl = stripAuthParams(window.location.pathname + window.location.search);
  sessionStorage.setItem('app.bootPath', bootUrl);
  const wasCallback = new URLSearchParams(window.location.search).has('code');
  // 2) The lib may also rewrite the URL via replaceState (even a tick after its promise):
  //    we intercept to clean the auth params and keep the requested deep link.
  const origReplaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = (data, unused, url) => {
    if (url == null) return origReplaceState(data, unused, url);
    const u = new URL(String(url), window.location.origin);
    for (const p of ['code', 'state', 'session_state', 'iss']) u.searchParams.delete(p);
    const boot = new URL(bootUrl, window.location.origin);
    const target = wasCallback ? u.pathname + u.search : boot.pathname + boot.search;
    return origReplaceState(data, unused, target);
  };
  try {
    await session.handleIncomingRedirect({ restorePreviousSession: true });
  } catch (err) {
    consumptionle.warn('[app-supervision] handleIncomingRedirect error:', err);
  }
  // Safety net if the lib rewrote the URL without going through replaceState.
  if (!wasCallback) {
    await new Promise((r) => setTimeout(r, 150));
    if (window.location.pathname + window.location.search !== bootUrl) {
      origReplaceState({}, '', bootUrl);
    }
  }
  if (!session.info.isLoggedIn) {
    // No session: we render the shell (never a blank page) then redirect.
    document.dispatchEvent(new CustomEvent('orbit-ready'));
    renderAll();
    await loginRedirect(wasCallback ? undefined : bootUrl); // redirect to Keycloak
    return;
  }
  // App store: helpers configured with the session (§1.9.12 — webid → /prefs/<pk>),
  // then catalogue + prefs loaded. If /features/ is not served (app-store not
  // deployed server-side), __appStoreOK=false → static fallback menu.
  appStore.configure({
    podUrl: config.podUrl,
    getWebid: () => session.info.webId ?? '',
    getRole: () => menuRole(),
  });
  (window as unknown as { __appStoreOK?: boolean }).__appStoreOK =
    await appStore.refresh().then(() => true).catch(() => false);
  // v0.5 two-stage store (app-store-spec v0.5 §1.4.3): merge the routes of INSTALLED
  // declarative features into the shell route table at boot. orbit.json stays untouched
  // for the code stage (CA-A8); guards + <dynamic-feature> mounting apply unchanged.
  if ((window as unknown as { __appStoreOK?: boolean }).__appStoreOK) {
    const extra = declarativeRoutes(appStore.getCatalogue(), appStore.getPrefs());
    const known = new Set(orbit.routes.map((r: { path: string }) => r.path));
    for (const r of extra) {
      if (r.path && !known.has(r.path)) {
        orbit.routes.push(r);
        known.add(r.path);
        const worbit = window.orbit as { routes?: unknown[] } | undefined;
        if (worbit && Array.isArray(worbit.routes) && !worbit.routes.some((x) => (x as { path: string }).path === r.path)) {
          worbit.routes.push(r);
        }
      }
    }
  }
  // The shell is rendered NO MATTER WHAT: an error must not leave a blank page.
  document.dispatchEvent(new CustomEvent('orbit-ready'));
  renderAll();
  consumptionle.info(`[app-supervision] pod=${config.podUrl} issuer=${config.oidcIssuer} webid=${session.info.webId ?? ''} appStore=${(window as unknown as { __appStoreOK?: boolean }).__appStoreOK}`);
}

// Click on a "back" link (rendered in #app) → same navigation as the menu.
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
  // Components pass absolute pod IRIs (http://localhost/tickets/22):
  // pushState only accepts same-origin paths → we keep only the pathname.
  try {
    const u = new URL(path, window.location.href);
    if (u.origin === new URL(config.podUrl, window.location.href).origin || u.origin === window.location.origin) {
      path = u.pathname + u.search;
    }
  } catch { /* relative or invalid path: unchanged */ }
  window.history.pushState({}, '', path);
  renderAll();
});
window.addEventListener('popstate', () => renderAll());

main().catch((err) => {
  // Last resort: never a blank page without an explanation.
  consumptionle.error('[app-supervision] bootstrap error:', err);
  const app = document.getElementById('app');
  if (app && !app.childElementCount) {
    app.innerHTML = '<p class="error">Error loading the application — see the consumptionle.</p>';
  }
  renderAll();
});
