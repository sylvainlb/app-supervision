// Standalone mini-router (routes come from orbit.json, spec §8).
// In prod Orbit provides the real router; here we mount components into #app.

// path "/buildings/2" → { name: 'building-detail', params: ['2'] }
export function matchPath(pathname, routes) {
  for (const r of routes) {
    if (!r.path.includes(':id')) {
      if (pathname === r.path || pathname === r.path + '/') return { name: r.name, route: r, params: [] };
    }
  }
  for (const r of routes) {
    if (r.path.includes(':id')) {
      const base = r.path.split(':')[0]; // e.g. "/buildings/"
      if (pathname.startsWith(base)) return { name: r.name, route: r, params: [pathname.slice(base.length)] };
    }
  }
  return null;
}

export function componentsFor(name, routes) {
  return routes.find((r) => r.name === name)?.components ?? [];
}

// User label for the header: real name (LDP resource /users/<id>) if known,
// otherwise webid/OIDC claims (D-7).
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

// Side menu: labels + visibility per role (spec §8 — the role drives screen
// assembly, never the access decision).
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

// route visible if the role is allowed on it, or if admin (sees everything).
/**
 * @param {Array<{name:string, path:string, roles?:string[], menu?:boolean}>} routes
 * @param {string} role
 * @returns {Array<{name:string, path:string, label:string, visible:boolean, menu:boolean}>}
 */
export function menuItems(routes, role) {
  return routes
    .filter((r) => r.path === '/' || !r.path.includes(':id')) // not the detail routes in the menu
    .map((r) => ({
      name: r.name,
      path: r.path,
      label: LABELS[r.name] ?? r.name,
      visible: role === 'admin' || (r.roles ?? []).includes(role),
      menu: r.menu !== false, // "tool" route (e.g. /store, menu:false): listed with menu:false, filtered out by the consumer (header)
    }));
}
