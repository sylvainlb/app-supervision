// Mini-routeur standalone (les routes viennent d'orbit.json, spec §8).
// En prod Orbit fournit le vrai routeur ; ici on monte les composants dans #app.

// path "/buildings/2" → { name: 'building-detail', params: ['2'] }
export function matchPath(pathname, routes) {
  for (const r of routes) {
    if (!r.path.includes(':id')) {
      if (pathname === r.path || pathname === r.path + '/') return { name: r.name, route: r, params: [] };
    }
  }
  for (const r of routes) {
    if (r.path.includes(':id')) {
      const base = r.path.split(':')[0]; // ex. "/buildings/"
      if (pathname.startsWith(base)) return { name: r.name, route: r, params: [pathname.slice(base.length)] };
    }
  }
  return null;
}

export function componentsFor(name, routes) {
  return routes.find((r) => r.name === name)?.components ?? [];
}

// Libellé utilisateur pour le header : vrai nom (ressource LDP /users/<id>) si connu,
// sinon webid/claims OIDC (D-7).
/**
 * @param {{name?:string, webid?:string, preferred_username?:string, role?:string}|null|undefined} claims
 * @returns {string}
 */
export function userLabel(claims) {
  if (!claims) return '';
  const name = claims.name ?? claims.webid ?? claims.preferred_username ?? '';
  const role = claims.role ?? '';
  return role ? `${name} (${role})` : name;
}

// Menu latéral : libellés FR + visibilité par rôle (spec §8 — le rôle pilote
// l'assemblage des écrans, jamais la décision d'accès).
export const LABELS = {
  dashboard: 'Dashboard',
  'building-detail': 'Building',
  anomalies: 'Detected anomalies',
  tickets: 'Intervention tickets',
  'ticket-new': 'New ticket',
  'ticket-detail': 'Ticket',
  interventions: 'My interventions',
  admin: 'Administration',
  store: 'App store',
};

// route visible si le rôle y est autorisé, ou si admin (voit tout).
/**
 * @param {Array<{name:string, path:string, roles?:string[]}>} routes
 * @param {string} role
 * @returns {Array<{name:string, path:string, label:string, visible:boolean}>}
 */
export function menuItems(routes, role) {
  return routes
    .filter((r) => r.path === '/' || !r.path.includes(':id')) // pas les routes de détail dans le menu
    .map((r) => ({
      name: r.name,
      path: r.path,
      label: LABELS[r.name] ?? r.name,
      visible: role === 'admin' || (r.roles ?? []).includes(role),
    }));
}
