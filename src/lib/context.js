// @context JSON-LD v1 servi par FAP-LDP — spec front §13.2 (E4 l'enrichira en v2
// côté serveur sans casser le front).

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
