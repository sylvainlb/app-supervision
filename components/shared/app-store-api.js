// window.appStore — helpers livrés par le package (spec v0.4 §1.3 shared/, §1.9.7/§1.9.9/§1.9.12).
//
//   window.appStore.configure({ getWebid, getRole, podUrl })  // au boot du shell
//   window.appStore.mePrefsIri()            // "/prefs/<pk>" extrait du claim webid (§1.9.12)
//   window.appStore.refresh()               // charge catalogue + prefs (read-after-write)
//   window.appStore.isEnabled(slug)         // synchrone, lit le cache (§1.9.7)
//   window.appStore.patchPrefs(patch)       // PATCH merge-patch forme R1 + événement save (§1.9.9)
//   window.appStore.installRouteGuard()     // guard de route du shell (CA-A4)
//   window.appStore.AppStoreGuardMixin(Base) // mixin pour les composants de route (CA-A4)
//
// Contrat LDP (§1.5) : GET /features/ + /prefs/<pk> ; PATCH /prefs/<pk> en
// merge-patch RFC 7386 avec body {"prefs": {…}} (forme R1 — le jsonb n'est PAS
// aplati à la racine). Erreurs dspace:Error ; ETag/If-Match ; 412 → recharger.
import {
  parseWebidPk, prefsPath, featureEnabled, featureForPath, prefsPatchBody, prefsColumn, roleAllowed, get as getField,
} from './logic.js';

export class AppStoreConflictError extends Error {
  constructor(message = '412 — prefs modifiées entre-temps, rechargées') {
    super(message);
    this.name = 'AppStoreConflictError';
    this.status = 412;
  }
}

const state = {
  podUrl: '',
  getWebid: () => window.appSession?.info?.webId ?? window.sibAuth?.info?.webId ?? '',
  getRole: () => window.appRole ?? '',
  catalogue: [],      // membres résolus de /features/
  catalogueMissing: false, // GET /features/ → 404 : modèle non déployé côté serveur
  prefs: null,        // ressource /prefs/<pk> (objet JSON-LD complet)
  prefsObj: {},       // colonne jsonb aplatie prefs.prefs
  prefsIri: null,     // path relatif "/prefs/<pk>"
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
    try { err.body = await res.json(); } catch { /* body pas JSON */ }
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
    try { cb({ catalogue: state.catalogue, prefs: state.prefsObj }); } catch { /* listener isolé */ }
  }
}

export const appStore = {
  /** À appeler au boot du shell : webid/rôle viennent de la session OIDC de l'app hôte. */
  configure({ getWebid, getRole, podUrl } = {}) {
    if (getWebid) state.getWebid = getWebid;
    if (getRole) state.getRole = getRole;
    if (podUrl) state.podUrl = podUrl;
    state.prefsIri = prefsPath(state.getWebid(), state.podUrl);
    return state.prefsIri;
  },

  /** §1.9.12 — "/prefs/<pk>" extrait du claim webid ; webid hors pod → null (interdit en v1). */
  mePrefsIri() {
    if (!state.prefsIri) state.prefsIri = prefsPath(state.getWebid(), state.podUrl);
    return state.prefsIri;
  },

  isAdmin() {
    return state.getRole() === 'admin';
  },

  /** Rôle courant (claim OIDC), passé à menuEntries pour le filtrage role_min (§1.4.1). */
  getRole() {
    return state.getRole?.() ?? null;
  },

  /** GET /features/ → 404 : modèle app-store non déployé côté serveur. */
  isCatalogueMissing() {
    return state.catalogueMissing;
  },

  /** URL du pod configurée au boot (configure({podUrl})) — appels proxy absolus (CORS géré back). */
  getPodUrl() {
    return state.podUrl;
  },

  /** Charge (ou recharge) catalogue + prefs. Read-after-write : après chaque PATCH. */
  async refresh() {
    const iri = this.mePrefsIri();
    const jobs = [getJsonMeta('/features/')
      .then(async (r) => { state.catalogue = await resolveMembers(r.data); state.catalogueMissing = false; })
      .catch((e) => {
        // Catalogue absent (sql/010–012 ou model.json non appliqué) : état explicite,
        // pas un crash — <app-store> rend un panneau de procédure (voir tck).
        if (e.status === 404) { state.catalogueMissing = true; state.catalogue = []; return; }
        throw e;
      })];
    if (iri) {
      jobs.push(getJsonMeta(iri).then((r) => {
        state.prefs = r.data;
        state.prefsObj = prefsColumn(r.data); // clé sérialisée : prefs / prefs:prefs / app_prefs:prefs…
        state.etag = r.etag;
      }));
    }
    await Promise.all(jobs);
    emit();
  },

  /** Promesse du premier chargement (pour les composants montés avant le boot). */
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

  getPrefs() {
    return state.prefsObj;
  },

  /** §1.9.7 — synchrone, lit le cache. Clé absente = default_enabled (§1.9.4a). */
  isEnabled(slug) {
    const f = this.getFeature(slug);
    if (!f) return false; // feature inconnue → désactivée (guard §1.9.7)
    return featureEnabled(state.prefsObj, f);
  },

  /**
   * §1.5 + §1.9.9 — PATCH merge-patch sur /prefs/<pk>, body forme R1 :
   * {"prefs": {"<slug>": {"enabled": false}}}. Le PEP remplace la colonne jsonb
   * `prefs` (pas de merge profond serveur) : read-modify-write, on envoie l'objet
   * prefs complet fusionné avec l'état courant, protégé par If-Match (412 →
   * rechargement + AppStoreConflictError). Succès → read-after-write + `save`.
   */
  async patchPrefs(patch) {
    const iri = this.mePrefsIri();
    if (!iri) throw new Error('appStore: webid non résolu (configure({getWebid}) au boot)');
    const headers = {
      'content-type': 'application/merge-patch+json',
      accept: 'application/ld+json',
    };
    if (state.etag) headers['if-match'] = state.etag;
    const res = await fetchAuthn()(iri, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(prefsPatchBody(patch, state.prefsObj)),
    });
    if (res.status === 412) {
      await this.refresh(); // §1.9.9 : recharger les prefs
      throw new AppStoreConflictError();
    }
    if (!res.ok) {
      const err = new Error(`PATCH ${iri} → ${res.status}`);
      err.status = res.status;
      try { err.body = await res.json(); } catch { /* body pas JSON */ }
      throw err;
    }
    const data = await res.json().catch(() => null);
    if (data) state.prefsObj = prefsColumn(data);          // read-after-write immédiat (CA-A2)
    if (data?.['@id']) state.prefs = data;
    state.etag = res.headers?.get?.('etag') ?? state.etag;
    emit();
    // §1.9.9 — sibStore.patch() n'émet pas save : dispatch manuel pour <app-menu>
    // (abonnement PubSub sur l'IRI + écoute save du boilerplate).
    document.dispatchEvent(new CustomEvent('save', {
      detail: { resource: { '@id': state.prefs?.['@id'] ?? iri } },
    }));
    return data;
  },

  /**
   * §1.9.7 / CA-A4 — guard de route du shell : intercepte requestNavigation
   * (capture) + navigate, retrouve la feature par route, et redirige vers
   * defaultPath si la feature est désactivée ou inconnue.
   */
  installRouteGuard({ defaultPath = '/' } = {}) {
    const check = (pathname, ev) => {
      // Anti-boucle : ne jamais bloquer la cible de redirect elle-même.
      if (!pathname || pathname.split('?')[0] === defaultPath) return true;
      const f = featureForPath(state.catalogue, pathname);
      const slug = f ? (f.slug ?? getField(f, 'slug')) : null;
      // §1.4.1 : role_min filtre menu + guard (UX) ; la sécurité reste ACL/PDP côté serveur.
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
    document.addEventListener('requestNavigation', onNav, true); // capture : avant le routeur
    document.addEventListener('navigate', () => check(window.location.pathname), true);
    // Route courante au chargement :
    this.whenReady().then(() => check(window.location.pathname));
    return () => document.removeEventListener('requestNavigation', onNav, true);
  },

  /**
   * §1.9.7 — mixin pour les composants de route : l'attribut `feature-slug` dit
   * quelle feature gère la route ; si elle est désactivée → redirect `/`.
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

// Pose window.appStore (idempotent).
if (typeof window !== 'undefined') {
  window.appStore = window.appStore ?? appStore;
}
export default appStore;
