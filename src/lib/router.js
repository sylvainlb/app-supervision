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
