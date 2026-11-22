// window.appStore — helpers delivered by the package (spec v0.4 §1.3 shared/, §1.9.7/§1.9.9/§1.9.12).
//
//   window.appStore.configure({ getWebid, getRole, podUrl })  // at shell boot
//   window.appStore.mePrefsIri()            // "/prefs/<pk>" extracted from the webid claim (§1.9.12)
//   window.appStore.refresh()               // loads catalogue + prefs (read-after-write)
//   window.appStore.isEnabled(slug)         // synchronous, reads the cache (§1.9.7)
//   window.appStore.patchPrefs(patch)       // R1-form merge-patch PATCH + save event (§1.9.9)
//   window.appStore.installRouteGuard()     // shell route guard (CA-A4)
//   window.appStore.AppStoreGuardMixin(Base) // mixin for route components (CA-A4)
//
// LDP contract (§1.5): GET /features/ + /prefs/<pk>; PATCH /prefs/<pk> as
// RFC 7386 merge-patch with body {"prefs": {…}} (R1 form — the jsonb is NOT
// flattened at the root). dspace:Error errors; ETag/If-Match; 412 → reload.
import {
  parseWebidPk, prefsPath, featureEnabled, featureForPath, prefsPatchBody, prefsColumn, roleAllowed, get as getField,
} from './logic.js';

export class AppStoreConflictError extends Error {
  constructor(message = '412 — prefs modified in the meantime, reloaded') {
    super(message);
    this.name = 'AppStoreConflictError';
    this.status = 412;
  }
}

const state = {
  podUrl: '',
  getWebid: () => window.appSession?.info?.webId ?? window.sibAuth?.info?.webId ?? '',
  getRole: () => window.appRole ?? '',
  catalogue: [],      // resolved members of /features/
  catalogueMissing: false, // GET /features/ → 404: model not deployed server-side
  prefs: null,        // /prefs/<pk> resource (complete JSON-LD object)
  prefsObj: {},       // flattened prefs.prefs jsonb column
  prefsIri: null,     // relative path "/prefs/<pk>"
  etag: null,
  ready: null,        // promesse du 1er refresh
  listeners: new Set(),
};

function fetchAuthn() {
  return window.sibStore?.fetchAuthn ?? fetch.bind(window);
}

async function getJsonMeta(path) {
  const res = await fetchAuthn()(path, { headers: { accept: 'application/ld+json' } });
  if (!res.ok) {
    const err = new Error(`GET ${path} → ${res.status}`);
    err.status = res.status;
    try { err.body = await res.json(); } catch { /* body not JSON */ }
    throw err;
  }
  const data = await res.json();
  return { data, etag: res.headers?.get?.('etag') ?? null };
}

async function resolveMembers(data) {
  const members = data?.['ldp:contains'] ?? (Array.isArray(data) ? data : []);
  return Promise.all(members.map(async (m) => {
    const id = m?.['@id'] ?? m;
    if (typeof id !== 'string') return m;
    if (m && typeof m === 'object' && Object.keys(m).filter((k) => k !== '@id' && k !== '@type').length === 0) {
      try { return (await getJsonMeta(id)).data; } catch { return m; }
    }
    return m;
  }));
}

function emit() {
  for (const cb of state.listeners) {
    try { cb({ catalogue: state.catalogue, prefs: state.prefsObj }); } catch { /* isolated listener */ }
  }
}

export const appStore = {
  /** To call at shell boot: webid/role come from the host app's OIDC session. */
  configure({ getWebid, getRole, podUrl } = {}) {
    if (getWebid) state.getWebid = getWebid;
    if (getRole) state.getRole = getRole;
    if (podUrl) state.podUrl = podUrl;
    state.prefsIri = prefsPath(state.getWebid(), state.podUrl);
    return state.prefsIri;
  },

  /** §1.9.12 — "/prefs/<pk>" extracted from the webid claim; webid outside pod → null (forbidden in v1). */
  mePrefsIri() {
    if (!state.prefsIri) state.prefsIri = prefsPath(state.getWebid(), state.podUrl);
    return state.prefsIri;
  },

  isAdmin() {
    return state.getRole() === 'admin';
  },

  /** Current role (OIDC claim), passed to menuEntries for role_min filtering (§1.4.1). */
  getRole() {
    return state.getRole?.() ?? null;
  },

  /** GET /features/ → 404: app-store model not deployed server-side. */
  isCatalogueMissing() {
    return state.catalogueMissing;
  },

  /** Pod URL configured at boot (configure({podUrl})) — absolute proxy calls (CORS handled by the back). */
  getPodUrl() {
    return state.podUrl;
  },

  /** Loads (or reloads) catalogue + prefs. Read-after-write: after each PATCH. */
  async refresh() {
    const iri = this.mePrefsIri();
    const jobs = [getJsonMeta('/features/')
      .then(async (r) => { state.catalogue = await resolveMembers(r.data); state.catalogueMissing = false; })
      .catch((e) => {
        // Catalogue absent (sql/010–012 or model.json not applied): explicit state,
        // not a crash — <app-store> renders a procedure panel (see tck).
        if (e.status === 404) { state.catalogueMissing = true; state.catalogue = []; return; }
        throw e;
      })];
    if (iri) {
      jobs.push(getJsonMeta(iri).then((r) => {
        state.prefs = r.data;
        // defensive copy: new reference on each refresh → guaranteed lit re-render
        // even if the source returns the same in-place mutated object (test mock, cache…)
        state.prefsObj = { ...prefsColumn(r.data) }; // serialized key: prefs / prefs:prefs / app_prefs:prefs…
        state.etag = r.etag;
      }));
    }
    await Promise.all(jobs);
    emit();
  },

  /** Promise of the first load (for components mounted before boot). */
  whenReady() {
    if (!state.ready) state.ready = this.refresh().catch(() => {});
    return state.ready;
  },

  onChange(cb) {
    state.listeners.add(cb);
    return () => state.listeners.delete(cb);
  },

  getFeature(slug) {
    return state.catalogue.find((f) => getField(f, 'slug') === slug) ?? null;
  },

  getCatalogue() {
    return state.catalogue;
  },

  /** v2 — catalogue feature whose Orbit route matches the requested path (§2.2.7). */
  getFeatureByRoute(pathname) {
    return featureForPath(state.catalogue, pathname);
  },

  getPrefs() {
    return state.prefsObj;
  },

  /** §1.9.7 — synchronous, reads the cache. Absent key = default_enabled (§1.9.4a). */
  isEnabled(slug) {
    const f = this.getFeature(slug);
    if (!f) return false; // unknown feature → disabled (guard §1.9.7)
    return featureEnabled(state.prefsObj, f);
  },

  /**
   * §1.5 + §1.9.9 — merge-patch PATCH on /prefs/<pk>, R1-form body:
   * {"prefs": {"<slug>": {"enabled": false}}} (recursive RFC 7386 merge).
   * Success → read-after-write (refresh) + `save` event with the prefs' @id.
   * 412 → prefs reloaded + AppStoreConflictError.
   */
  async patchPrefs(patch) {
    const iri = this.mePrefsIri();
    if (!iri) throw new Error('appStore: webid unresolved (configure({getWebid}) at boot)');
    const headers = {
      'content-type': 'application/merge-patch+json',
      accept: 'application/ld+json',
    };
    if (state.etag) headers['if-match'] = state.etag;
    const res = await fetchAuthn()(iri, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(prefsPatchBody(patch, state.prefsObj)), // read-modify-write: complete object (§1.5)
    });
    if (res.status === 412) {
      await this.refresh(); // §1.9.9: reload the prefs
      throw new AppStoreConflictError();
    }
    if (!res.ok) {
      const err = new Error(`PATCH ${iri} → ${res.status}`);
      err.status = res.status;
      try { err.body = await res.json(); } catch { /* body not JSON */ }
      throw err;
    }
    const data = await res.json().catch(() => null);
    if (data) state.prefsObj = { ...prefsColumn(data) };     // immediate read-after-write (CA-A2) — defensive copy (lit re-render)
    if (data?.['@id']) state.prefs = data;
    state.etag = res.headers?.get?.('etag') ?? state.etag;
    emit();
    // §1.9.9 — sibStore.patch() does not emit save: manual dispatch for <app-menu>
    // (PubSub subscription on the IRI + boilerplate's save listener).
    document.dispatchEvent(new CustomEvent('save', {
      detail: { resource: { '@id': state.prefs?.['@id'] ?? iri } },
    }));
    return data;
  },

  /**
   * §1.9.7 / CA-A4 — shell route guard: intercepts requestNavigation
   * (capture) + navigate, finds the feature by route, and redirects to
   * defaultPath if the feature is disabled or unknown.
   */
  installRouteGuard({ defaultPath = '/' } = {}) {
    const check = (pathname, ev) => {
      // Anti-loop: never block the redirect target itself.
      if (!pathname || pathname.split('?')[0] === defaultPath) return true;
      const f = featureForPath(state.catalogue, pathname);
      const slug = f ? (f.slug ?? getField(f, 'slug')) : null;
      // §1.4.1: role_min filters menu + guard (UX); security stays server-side ACL/PDP.
      const roleOk = f ? roleAllowed(getField(f, 'role_min') ?? 'all', state.getRole()) : true;
      if (f && slug && (!roleOk || !this.isEnabled(slug))) {
        if (ev) { ev.preventDefault(); ev.stopPropagation(); }
        document.dispatchEvent(new CustomEvent('requestNavigation', {
          detail: { route: null, resource: defaultPath },
        }));
        return false;
      }
      return true;
    };
    const onNav = (e) => {
      const d = e.detail ?? {};
      let path = typeof d.resource === 'string' && d.resource.startsWith('/') ? d.resource : null;
      if (!path && d.route && Array.isArray(window.orbit?.routes)) {
        path = window.orbit.routes.find((r) => r.name === d.route)?.path ?? null;
      }
      if (path) check(path, e);
    };
    document.addEventListener('requestNavigation', onNav, true); // capture: before the router
    document.addEventListener('navigate', () => check(window.location.pathname), true);
    // Current route at load time:
    this.whenReady().then(() => check(window.location.pathname));
    return () => document.removeEventListener('requestNavigation', onNav, true);
  },

  /**
   * §1.9.7 — mixin for route components: the `feature-slug` attribute says
   * which feature owns the route; if it is disabled → redirect `/`.
   */
  AppStoreGuardMixin(Base) {
    return class extends Base {
      static properties = { ...(Base.properties ?? {}), featureSlug: { type: String, attribute: 'feature-slug' } };
      connectedCallback() {
        super.connectedCallback?.();
        appStore.whenReady().then(() => {
          if (this.featureSlug && !appStore.isEnabled(this.featureSlug)) {
            document.dispatchEvent(new CustomEvent('requestNavigation', { detail: { resource: '/' } }));
          }
        });
      }
    };
  },
};

// Sets window.appStore (idempotent).
if (typeof window !== 'undefined') {
  window.appStore = window.appStore ?? appStore;
}
export default appStore;
