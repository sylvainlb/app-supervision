// Logique PURE de l'app store (sans DOM, testable en node --test) — spec v0.4 §1.4–§1.9.
// Séparée des composants Lit (pattern logic.js des composants métier).

// ---------------------------------------------------------------------------
// §1.9.12 — <me> : pk extrait du claim webid (https://<pod>/users/<pk>).
// Un webid HORS du pod est interdit en v1 → null.
// Retourne { pk, host } ou null.
export function parseWebidPk(webid, podUrl) {
  if (!webid || typeof webid !== 'string') return null;
  let u;
  try { u = new URL(webid); } catch { return null; }
  if (podUrl) {
    let pod;
    try { pod = new URL(podUrl); } catch { return null; }
    if (u.origin !== pod.origin) return null; // webid hors pod → interdit en v1 (403)
  }
  const m = u.pathname.match(/^\/users\/(\d+)\/?$/);
  if (!m) return null;
  return { pk: m[1], host: u.host };
}

// IRI (path relatif, résolu vers POD_URL par fetchAuthn) des prefs de <me>.
export function prefsPath(webid, podUrl) {
  const p = parseWebidPk(webid, podUrl);
  return p ? `/prefs/${p.pk}` : null;
}

// ---------------------------------------------------------------------------
// §1.9.4a — règle « clé absente dans les prefs = default_enabled ».
// prefsObj = contenu de la colonne jsonb prefs : {"<slug>": {"enabled":…, "config":…}}
export function featureEnabled(prefsObj, feature) {
  if (!feature) return false;
  const slug = get(feature, 'slug');
  const entry = prefsObj?.[slug];
  if (entry && typeof entry.enabled === 'boolean') return entry.enabled;
  return !!get(feature, 'default_enabled');
}

// ---------------------------------------------------------------------------
// Titre localisé §1.9.2 : title_i18n[locale] → fallback fr → fallback slug.
export function titleOf(feature, locale = 'fr') {
  const t = get(feature, 'title_i18n') ?? {};
  return t[locale] ?? t.fr ?? get(feature, 'slug') ?? '';
}

// ---------------------------------------------------------------------------
// §1.6.1 / CA-A1 — entrées du menu : join catalogue × prefs, tri
// (menu_order ASC, slug ASC) (§1.9.1), slugs des prefs inconnus du catalogue
// ignorés (§1.9.4d). routeExists(slug/route) filtre les features dont la route
// n'existe pas dans orbit.json (§1.9.8).
export function menuEntries(catalogue, prefsObj, { locale = 'fr', routeExists, role } = {}) {
  const knownSlugs = new Set((prefsObj ? Object.keys(prefsObj) : []));
  return (catalogue ?? [])
    .filter((f) => !routeExists || routeExists(f))
    // route paramétrée (ex. /buildings/:id) = page de DÉTAIL : atteinte par clic
    // sur un élément, jamais affichée telle quelle dans le menu (sans id → 404).
    .filter((f) => !String(get(f, 'route') ?? '').includes(':'))
    .filter((f) => (get(f, 'in_menu') ?? true) !== false) // in_menu=false → hors menu (outil ex. /store), route toujours gardée
    .filter((f) => roleAllowed(get(f, 'role_min') ?? 'all', role))
    .map((f) => ({
      slug: get(f, 'slug'),
      title: titleOf(f, locale),
      icon: get(f, 'icon') || 'extension',
      route: get(f, 'route'),
      enabled: featureEnabled(prefsObj, f),
      // §1.9.4d : une entrée de prefs sans feature au catalogue est ignorée —
      // on ne rend que les features du catalogue (knownSlugs sert aux tests de
      // non-régression : menuEntries ne produit jamais un slug hors catalogue).
      _known: knownSlugs.has(f.slug) || Object.keys(prefsObj ?? {}).length === 0,
    }))
    .filter((e) => e.enabled)
    .sort((a, b) => {
      const fa = catalogue.find((f) => get(f, 'slug') === a.slug);
      const fb = catalogue.find((f) => get(f, 'slug') === b.slug);
      return ((get(fa, 'menu_order') ?? 0) - (get(fb, 'menu_order') ?? 0)) || a.slug.localeCompare(b.slug);
    });
}

// Lecture d'un champ JSON-LD quel que soit le préfixe (features:role_min, role_min…).
export function get(obj, name) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (obj[name] !== undefined) return obj[name];
  for (const k of Object.keys(obj)) if (k.endsWith(':' + name)) return obj[k];
  return undefined;
}

// ---------------------------------------------------------------------------
// §1.4.1 — role_min : 'all' | 'technicien' | 'gestionnaire' | 'admin'.
// Correspondance EXACTE (comme les "roles" des routes d'orbit.json) :
// visible si role_min == 'all', ou role_min == rôle de l'utilisateur, ou admin.
// (Filtrage menu + guard uniquement — la sécurité reste côté ACL/PDP.)
export function roleAllowed(roleMin, role) {
  if (!roleMin || roleMin === 'all') return true;
  if (role === 'admin') return true;
  return roleMin === role;
}

// ---------------------------------------------------------------------------
// §1.9.6 — méta-schéma config_schema :
// {"fields": [{"key","label","type":"string"|"number"|"boolean"|"enum"|"object"|"array",
//              "default"?,"options"? (enum),"items"? (array),"required"?}]}
export function configDefaults(schema) {
  const out = {};
  for (const f of schema?.fields ?? []) {
    if (f.default !== undefined) out[f.key] = f.default;
  }
  return out;
}

// §1.9.11 — badge « configuré » : config non vide ET différent des defaults
// (comparaison JSON).
export function isConfigured(config, schema) {
  if (!config || typeof config !== 'object' || Object.keys(config).length === 0) return false;
  return JSON.stringify(config) !== JSON.stringify(configDefaults(schema));
}

// ---------------------------------------------------------------------------
// Forme R1 des PATCH (§1.5) : le jsonb prefs n'est PAS aplati à la racine —
// body = {"prefs": {…}}.
export function togglePatch(slug, enabled) {
  return { [slug]: { enabled: !!enabled } };
}
export function configPatch(slug, config) {
  return { [slug]: { config } };
}

/**
 * Extrait la colonne jsonb `prefs` d'une ressource JSON-LD, quel que soit le
 * préfixe de sérialisation du serveur (`prefs`, `prefs:prefs`, `app_prefs:prefs`…).
 */
export function prefsColumn(data) {
  if (!data || typeof data !== 'object') return {};
  for (const k of Object.keys(data)) {
    if (k === 'prefs' || k.endsWith(':prefs')) {
      if (data[k] && typeof data[k] === 'object' && !Array.isArray(data[k])) return data[k];
    }
  }
  return {};
}

/**
 * Body PATCH forme R1 : {"prefs": {…}}. Constat sur le serveur live (21/11) : le PEP
 * REMPLACE la colonne jsonb `prefs` entière (pas de merge profond serveur) →
 * read-modify-write : on fusionne le patch avec l'état courant (merge par slug, pour
 * préserver `config` quand on ne touche qu'à `enabled`) et on envoie l'objet complet,
 * protégé par If-Match → 412 en cas de conflit (§1.9.9).
 */
export function prefsPatchBody(patch, current = {}) {
  const merged = { ...current };
  for (const [slug, val] of Object.entries(patch ?? {})) {
    merged[slug] = { ...(current?.[slug] ?? {}), ...(val ?? {}) };
  }
  return { prefs: merged };
}

// ---------------------------------------------------------------------------
// Guard de route (§1.9.7 / CA-A4) : retrouve la feature dont la route Orbit
// correspond au path demandé. match exact, ou prefix si la route a un :param
// (ex. route "/buildings/:id", path "/buildings/42").
export function featureForPath(catalogue, pathname) {
  if (!pathname) return null;
  const path = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  for (const f of catalogue ?? []) {
    const route = get(f, 'route');
    if (!route) continue;
    const r = route.replace(/\/+$/, '') || '/';
    if (r === path) return f;
  }
  for (const f of catalogue ?? []) {
    const route = get(f, 'route');
    if (!route || !route.includes(':')) continue;
    const base = route.split(':')[0].replace(/\/+$/, '');
    if (base && (path === base || path.startsWith(base + '/'))) return f;
  }
  // 3e passe : préfixe simple (sous-route d'une feature, ex. /tickets/new → feature tickets)
  for (const f of catalogue ?? []) {
    const route = get(f, 'route');
    if (!route || route.includes(':')) continue;
    const base = route.replace(/\/+$/, '') || '/';
    if (base !== '/' && path.startsWith(base + '/')) return f;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Formulaire de config (validation front v1, §1.9.6 / CA-A3).

// Normalise une valeur saisie selon le type du champ.
export function normalizeFieldValue(fieldDef, raw) {
  switch (fieldDef.type) {
    case 'number': {
      if (raw === '' || raw === null || raw === undefined) return undefined;
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    }
    case 'boolean':
      return !!raw;
    case 'enum':
      return fieldDef.options?.includes(raw) ? raw : undefined;
    case 'array':
      // saisie texte : une valeur par ligne (ou JSON array)
      if (Array.isArray(raw)) return raw.map(String);
      if (typeof raw === 'string') {
        const s = raw.trim();
        if (s.startsWith('[')) {
          try { const a = JSON.parse(s); return Array.isArray(a) ? a.map(String) : undefined; } catch { return undefined; }
        }
        return s ? s.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean) : [];
      }
      return undefined;
    case 'object':
      if (typeof raw === 'object' && raw !== null) return raw;
      if (typeof raw === 'string' && raw.trim().startsWith('{')) {
        try { return JSON.parse(raw); } catch { return undefined; }
      }
      return undefined;
    case 'string':
    default:
      return raw === '' || raw === null || raw === undefined ? undefined : String(raw);
  }
}

// Valide un objet config contre le schéma → { ok, errors: {key: message} }.
export function validateConfig(schema, values) {
  const errors = {};
  const fields = schema?.fields ?? [];
  for (const f of fields) {
    const v = values?.[f.key];
    if (f.required && (v === undefined || v === null || v === '')) {
      errors[f.key] = 'required';
      continue;
    }
    if (v === undefined) continue;
    if (f.type === 'enum' && f.options && !f.options.includes(v)) errors[f.key] = 'not_in_options';
    if (f.type === 'number' && typeof v !== 'number') errors[f.key] = 'not_a_number';
    if (f.type === 'boolean' && typeof v !== 'boolean') errors[f.key] = 'not_a_boolean';
    if (f.type === 'array' && !Array.isArray(v)) errors[f.key] = 'not_an_array';
    if (f.type === 'object' && (typeof v !== 'object' || v === null || Array.isArray(v))) errors[f.key] = 'not_an_object';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

// ---------------------------------------------------------------------------
// Partie 2 (v2) — features distantes : helpers purs.

// Une feature est « distante » si le catalogue v2 porte cdn_url + tag
// (colonnes 020_features_v2.sql) ; sinon elle est packagée au build (v1).
export function isDistant(feature) {
  return !!(get(feature, 'cdn_url') && get(feature, 'tag'));
}

// Entrée prefs d'une feature (jsonb prefs.<slug>) : {enabled, config, installed_version?, installed_sri?}.
export function installedEntry(prefsObj, slug) {
  return prefsObj?.[slug] ?? {};
}

// CA-A5 : une feature packagée est toujours « installée » (présente au build) ;
// une feature distante ne l'est que si installed_version + installed_sri sont posés.
export function isInstalled(feature, prefsObj) {
  if (!isDistant(feature)) return true;
  const e = installedEntry(prefsObj, get(feature, 'slug'));
  return !!(e.installed_version && e.installed_sri);
}

// Comparaison de versions "x.y.z" (entiers pointés) : -1 / 0 / 1.
export function compareVersions(a, b) {
  const pa = String(a ?? '0').split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b ?? '0').split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

// CA-A6 : le catalogue annonce une version > installed_version → upgrade proposé
// (re-vérification du nouveau sri à l'upgrade, §2.2.5).
export function upgradeAvailable(feature, prefsObj) {
  if (!isDistant(feature)) return false;
  const e = installedEntry(prefsObj, get(feature, 'slug'));
  const v = get(feature, 'version');
  return !!(v && e.installed_version && compareVersions(v, e.installed_version) > 0);
}

// Patch d'installation (forme R1 §1.5) : active la feature ET enregistre la
// version réellement chargée (audit front ; l'audit serveur est dans dsp.audit via E11).
export function installPatch(slug, version, sri) {
  return { [slug]: { enabled: true, installed_version: version, installed_sri: sri } };
}

// Patch de désinstallation (§2.2.4) : désactive + nullifie installed_* (les clés
// null sont supprimées par le merge-patch RFC 7386 / l'objet complet envoyé).
export function uninstallPatch(slug) {
  return { [slug]: { enabled: false, installed_version: null, installed_sri: null } };
}
