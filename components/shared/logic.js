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
// body = {"prefs": {…}}. Le merge RFC 7386 est récursif : la config des autres
// features est préservée.
export function togglePatch(slug, enabled) {
  return { [slug]: { enabled: !!enabled } };
}
export function configPatch(slug, config) {
  return { [slug]: { config } };
}
export function prefsPatchBody(patch) {
  return { prefs: patch };
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
