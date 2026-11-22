// JSON-LD v1 @context served by FAP-LDP — front spec §13.2 (E4 will enrich it in v2
// server-side without breaking the front).

// Reads a field by LOCAL NAME, whatever the prefix (the back prefixes by
// table: app_buildings:lat, gold_anomaly_candidates:severity, … ; @vocab otherwise).
// The demo fixtures sometimes use the short prefix (buildings:lat) or the bare name
// (lat): field() covers all three forms.
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
