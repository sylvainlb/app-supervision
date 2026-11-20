// @context JSON-LD v1 servi par FAP-LDP — spec front §13.2 (E4 l'enrichira en v2
// côté serveur sans casser le front).

// Lecture d'un champ par NOM LOCAL, quel que soit le préfixe (le back préfixe par
// table : app_buildings:lat, gold_anomaly_candidates:severity, … ; @vocab sinon).
// Les fixtures de démo utilisent parfois le préfixe court (buildings:lat) ou le nom
// nu (lat) : field() couvre les trois formes.
export function field(obj, name) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (obj[name] !== undefined) return obj[name];
  for (const k of Object.keys(obj)) {
    if (k.endsWith(':' + name)) return obj[k];
  }
  return undefined;
}

export function buildContext(podUrl) {
  const base = podUrl.replace(/\/+$/, '');
  return {
    '@vocab': `${base}/`,
    ldp: 'http://www.w3.org/ns/ldp#',
    acl: 'http://www.w3.org/ns/auth/acl#',
    dspace: 'https://w3id.org/dspace/v0.8/',
    tickets: `${base}/ns/app/tickets#`,
    buildings: `${base}/ns/app/buildings#`,
    users: `${base}/ns/app/users#`,
    comments: `${base}/ns/app/comments#`,
  };
}
