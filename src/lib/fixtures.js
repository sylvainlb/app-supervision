// Demo fixtures — sample data when the back does not answer
// (LDP 404/500 or network) ; enabled by default in dev (VITE_FIXTURES != '0').
// The back remains the source of truth: as soon as it answers, real data takes over.
import { config } from '../config.js';

const POD = config.podUrl.replace(/\/+$/, '') || 'http://localhost'; // absolute base required by new URL() under Node (tests)

export const FIXTURES = {
  '/users/': {
    '@id': `${POD}/users/`,
    'ldp:contains': [
      { '@id': `${POD}/users/1`, 'users:webid': `${POD}/users/1`, 'users:name': 'Claire Martin', 'users:email': 'claire.martin@fap.local', 'users:role': 'manager' },
      { '@id': `${POD}/users/2`, 'users:webid': `${POD}/users/2`, 'users:name': ' Karim Aziz', 'users:email': 'karim.aziz@fap.local', 'users:role': 'technician' },
      { '@id': `${POD}/users/3`, 'users:webid': `${POD}/users/3`, 'users:name': 'Sophie Bernard', 'users:email': 'sophie.bernard@fap.local', 'users:role': 'admin' },
    ],
  },
  '/buildings/': {
    '@id': `${POD}/buildings/`,
    'ldp:contains': [
      { '@id': `${POD}/buildings/1`, 'buildings:name': 'HQ — 12 Lilas Street', 'buildings:address': '12 Lilas Street, 69003 Lyon', 'buildings:meter_id': 'M-LYO-001', 'buildings:facis_asset': `${POD}/dsp/catalogue/assets/building-lyon-1`, 'buildings:lat': 45.7640, 'buildings:lon': 4.8357 },
      { '@id': `${POD}/buildings/2`, 'buildings:name': 'North Warehouse', 'buildings:address': '8 North Zone, 69007 Lyon', 'buildings:meter_id': 'M-LYO-002', 'buildings:facis_asset': `${POD}/dsp/catalogue/assets/building-lyon-2`, 'buildings:lat': 45.7840, 'buildings:lon': 4.8200 },
      { '@id': `${POD}/buildings/3`, 'buildings:name': 'South Offices', 'buildings:address': '3 South Avenue, 69002 Lyon', 'buildings:meter_id': 'M-LYO-003', 'buildings:facis_asset': `${POD}/dsp/catalogue/assets/building-lyon-3`, 'buildings:lat': 45.7540, 'buildings:lon': 4.8450 },
      { '@id': `${POD}/buildings/4`, 'buildings:name': 'East Workshop', 'buildings:address': "17 East Quay, 69006 Lyon", 'buildings:meter_id': 'M-LYO-004', 'buildings:facis_asset': `${POD}/dsp/catalogue/assets/building-lyon-4`, 'buildings:lat': 45.7740, 'buildings:lon': 4.8600 },
    ],
  },
  '/gold/anomaly_candidates/': {
    '@id': `${POD}/gold/anomaly_candidates/`,
    'ldp:contains': [
      { '@id': `${POD}/gold/anomaly_candidates/101`, meter_id: 'M-LYO-002', ts: '2026-11-19T21:10:00Z', severity: 'HIGH', type: 'spike' },
      { '@id': `${POD}/gold/anomaly_candidates/102`, meter_id: 'M-LYO-004', ts: '2026-11-19T20:40:00Z', severity: 'MEDIUM', type: 'drift' },
      { '@id': `${POD}/gold/anomaly_candidates/103`, meter_id: 'M-LYO-001', ts: '2026-11-19T19:05:00Z', severity: 'LOW', type: 'drift' },
      { '@id': `${POD}/gold/anomaly_candidates/104`, meter_id: 'M-LYO-003', ts: '2026-11-19T18:30:00Z', severity: 'CRITICAL', type: 'outage' },
    ],
  },
  '/tickets/': {
    '@id': `${POD}/tickets/`,
    'ldp:contains': [
      { '@id': `${POD}/tickets/7`, 'tickets:title': 'Consumption spike, North Warehouse', 'tickets:description': 'Spike detected at 21:10 on M-LYO-002, anomaly 101.', 'tickets:status': 'OPEN', 'tickets:priority': 'HIGH', 'tickets:building_id': `${POD}/buildings/2`, 'tickets:anomaly_ref': `${POD}/gold/anomaly_candidates/101`, 'tickets:created_by': `${POD}/users/1`, 'tickets:assigned_to': `${POD}/users/2`, 'tickets:created_at': '2026-11-19T21:15:00Z', 'tickets:updated_at': '2026-11-19T21:15:00Z' },
      { '@id': `${POD}/tickets/8`, 'tickets:title': 'PV drift, South Offices', 'tickets:description': 'Slow drift detected, anomaly 104.', 'tickets:status': 'IN_PROGRESS', 'tickets:priority': 'CRITICAL', 'tickets:building_id': `${POD}/buildings/3`, 'tickets:anomaly_ref': `${POD}/gold/anomaly_candidates/104`, 'tickets:created_by': `${POD}/users/1`, 'tickets:assigned_to': `${POD}/users/2`, 'tickets:created_at': '2026-11-19T18:35:00Z', 'tickets:updated_at': '2026-11-19T20:00:00Z' },
      { '@id': `${POD}/tickets/9`, 'tickets:title': 'Low anomaly, HQ', 'tickets:description': 'Anomaly 103 (low drift), monitoring.', 'tickets:status': 'RESOLVED', 'tickets:priority': 'LOW', 'tickets:building_id': `${POD}/buildings/1`, 'tickets:anomaly_ref': `${POD}/gold/anomaly_candidates/103`, 'tickets:created_by': `${POD}/users/1`, 'tickets:assigned_to': null, 'tickets:created_at': '2026-11-19T19:10:00Z', 'tickets:updated_at': '2026-11-19T19:40:00Z' },
      { '@id': `${POD}/tickets/10`, 'tickets:title': 'Outage, East Workshop', 'tickets:description': 'Outage on M-LYO-004, resolved.', 'tickets:status': 'CLOSED', 'tickets:priority': 'MEDIUM', 'tickets:building_id': `${POD}/buildings/4`, 'tickets:anomaly_ref': null, 'tickets:created_by': `${POD}/users/3`, 'tickets:assigned_to': `${POD}/users/2`, 'tickets:created_at': '2026-11-18T08:00:00Z', 'tickets:updated_at': '2026-11-19T07:00:00Z' },
    ],
  },
  // App store (app-store-spec.md): feature catalogue + prefs of user 1.
  // The real seed is app-specific (provided via the app's model.json); here a
  // demo covering the app's routes + the /store entry itself.
  '/features/': {
    '@id': `${POD}/features/`,
    'ldp:contains': [
      { '@id': `${POD}/features/building-map` },
      { '@id': `${POD}/features/anomaly-list` },
      { '@id': `${POD}/features/ticket-board` },
      { '@id': `${POD}/features/user-admin` },
      { '@id': `${POD}/features/app-store` },
      { '@id': `${POD}/features/building-detail` },
    ],
  },
  '/features/building-detail': {
    '@id': `${POD}/features/building-detail`, slug: 'building-detail',
    title_i18n: { en: 'Building detail', fr: 'Détail bâtiment' }, description_i18n: { en: 'Record and curves of a building.', fr: 'Fiche et courbes d\'un bâtiment.' },
    icon: 'insights', menu_order: 40, in_menu: true, role_min: 'all', component: 'building-header', route: '/buildings/:id',
    config_schema: { fields: [] }, default_enabled: true,
  },
  '/features/building-map': {
    '@id': `${POD}/features/building-map`, slug: 'building-map',
    title_i18n: { en: 'Dashboard', fr: 'Tableau de bord' }, description_i18n: { en: 'Map of the portfolio and anomaly status.', fr: 'Carte du parc et état des anomalies.' },
    icon: 'dashboard', menu_order: 10, role_min: 'all', component: 'building-map', route: '/',
    config_schema: { fields: [] }, default_enabled: true,
  },
  '/features/anomaly-list': {
    '@id': `${POD}/features/anomaly-list`, slug: 'anomaly-list',
    title_i18n: { en: 'Anomalies', fr: 'Anomalies' }, description_i18n: { en: 'Automatic detections (gold, read-only).', fr: 'Détections automatiques (gold, read-only).' },
    icon: 'warning', menu_order: 20, role_min: 'manager', component: 'anomaly-list', route: '/anomalies',
    config_schema: { fields: [{ key: 'severity_min', label: 'Min severity', type: 'enum', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' }] },
    default_enabled: true,
  },
  '/features/ticket-board': {
    '@id': `${POD}/features/ticket-board`, slug: 'ticket-board',
    title_i18n: { en: 'Tickets', fr: 'Tickets' }, description_i18n: { en: 'Interventions: assignment and status tracking.', fr: 'Interventions : assignation et suivi des statuts.' },
    icon: 'confirmation_number', menu_order: 30, role_min: 'manager', component: 'ticket-board', route: '/tickets',
    config_schema: { fields: [] }, default_enabled: true,
  },
  '/features/user-admin': {
    '@id': `${POD}/features/user-admin`, slug: 'user-admin',
    title_i18n: { en: 'Administration', fr: 'Administration' }, description_i18n: { en: 'Users and roles (admin).', fr: 'Utilisateurs et rôles (admin).' },
    icon: 'admin_panel_settings', menu_order: 90, role_min: 'admin', component: 'user-admin', route: '/admin',
    config_schema: { fields: [] }, default_enabled: true,
  },
  '/features/app-store': {
    '@id': `${POD}/features/app-store`, slug: 'app-store',
    title_i18n: { en: 'App store', fr: 'App store' }, description_i18n: { en: 'Enable/configure features.', fr: 'Activer/configurer les fonctionnalités.' },
    icon: 'storefront', menu_order: 100, in_menu: false, role_min: 'all', component: 'app-store', route: '/store',
    config_schema: { fields: [] }, default_enabled: true,
  },
  '/prefs/1': {
    '@id': `${POD}/prefs/1`,
    prefs: {
      'building-map': { enabled: true, config: {} },
      'anomaly-list': { enabled: true, config: { severity_min: 'LOW' } },
      'ticket-board': { enabled: true, config: {} },
      'user-admin': { enabled: true, config: {} },
      'app-store': { enabled: true, config: {} },
      'building-detail': { enabled: true, config: {} },
    },
  },
  '/tickets/7/comments/': {
    '@id': `${POD}/tickets/7/comments/`,
    'ldp:contains': [
      { '@id': `${POD}/tickets/7/comments/1`, 'comments:ticket_id': `${POD}/tickets/7`, 'comments:author': `${POD}/users/1`, 'comments:text': 'Anomaly confirmed, technician assigned.', 'comments:ts': '2026-11-19T21:16:00Z' },
      { '@id': `${POD}/tickets/7/comments/2`, 'comments:ticket_id': `${POD}/tickets/7`, 'comments:author': `${POD}/users/2`, 'comments:text': 'On site, investigation in progress.', 'comments:ts': '2026-11-19T21:30:00Z' },
    ],
  },
};

// Synthetic response of the /app/query proxy for hourly metrics.
export function fixtureProxyResponse(assetId, from, to) {
  const rows = [];
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  for (let t = start; t <= end; t += 3600e3) {
    const h = new Date(t).getHours();
    const base = 8 + 6 * Math.sin((h - 9) / 24 * 2 * Math.PI); // daily curve
    if (assetId === 'net_grid_hourly') {
      rows.push({ ts_hour: new Date(t).toISOString(), net_grid_kw: Math.round(base * 10) / 10 });
    } else if (assetId === 'pv_performance_hourly') {
      const pv = h >= 7 && h <= 19 ? Math.round(4000 * Math.sin((h - 7) / 12 * Math.PI)) : 0;
      rows.push({ ts_hour: new Date(t).toISOString(), power_w: pv, capacity_factor: pv / 5000 });
    }
  }
  return { assetId, schema: 'gold', table: assetId, columns: Object.keys(rows[0] ?? {}), rows, rowCount: rows.length };
}

// Fixture fallback on sibStore: getData falls back to the fixture if the back does not answer
// (network error or status >= 400); post/patch/delete mutate the fixture in memory.
export function installFixtureFallback(store, { enabled = true } = {}) {
  if (!enabled || !store) return store;
  const data = structuredClone(FIXTURES);
  const orig = {
    getData: store.getData?.bind(store),
    post: store.post?.bind(store),
    put: store.put?.bind(store),
    patch: store.patch?.bind(store),
    delete: store.delete?.bind(store),
  };
  const pathOf = (url) => new URL(url, POD).pathname.replace(/\/+$/, '') + (url.endsWith('/') ? '/' : '');

  store.getData = async (url, ...rest) => {
    try {
      const res = await orig.getData(url, ...rest);
      return res;
    } catch (e) {
      const key = pathOf(url);
      if (key in data) return structuredClone(data[key]);
      if (url.match(/^\/tickets\/\d+$/)) {
        const t = data['/tickets/']['ldp:contains'].find((x) => x['@id'] === `${POD}${key}`);
        if (t) return structuredClone(t);
      }
      throw e;
    }
  };
  store.post = async (url, body, ...rest) => {
    const key = pathOf(url);
    if (key in data && data[key]['ldp:contains']) {
      const id = `${POD}${key}${data[key]['ldp:contains'].length + 1}`;
      data[key]['ldp:contains'].push({ '@id': id, ...body });
      return { '@id': id };
    }
    return orig.post?.(url, body, ...rest);
  };
  store.patch = async (url, body, ...rest) => {
    for (const key of Object.keys(data)) {
      const list = data[key]?.['ldp:contains'];
      if (!Array.isArray(list)) continue;
      const item = list.find((x) => x['@id'] === `${POD}${pathOf(url)}`);
      if (item) { Object.assign(item, body); return item; }
    }
    return orig.patch?.(url, body, ...rest);
  };
  store.delete = async (url, ...rest) => {
    for (const key of Object.keys(data)) {
      const list = data[key]?.['ldp:contains'];
      if (!Array.isArray(list)) continue;
      const i = list.findIndex((x) => x['@id'] === `${POD}${pathOf(url)}`);
      if (i >= 0) { list.splice(i, 1); return {}; }
    }
    return orig.delete?.(url, ...rest);
  };
  return store;
}

// Fixture fallback for fetchAuthn: /app/query → synthetic hourly series; any other
// LDP request (GET /features/, /prefs/<pk>, container resources…) falls back to
// the FIXTURES if the back does not answer (network down or status >= 400, except 401
// which is left to the global refresh/login handler). PATCH applies an
// RFC 7386 merge-patch in memory on the fixture resource.
export function installFixtureProxy(fetchFn, { enabled = true } = {}) {
  if (!enabled) return fetchFn;
  const data = structuredClone(FIXTURES);
  const pathOf = (url) => {
    const u = new URL(String(url), POD);
    return u.pathname.replace(/\/+$/, '') + (String(url).endsWith('/') ? '/' : '');
  };
  const findResource = (path) => {
    if (data[path]) return data[path];
    for (const key of Object.keys(data)) {
      const list = data[key]?.['ldp:contains'];
      if (Array.isArray(list)) {
        const item = list.find((x) => x['@id'] === `${POD}${path}`);
        if (item) return item;
      }
    }
    return null;
  };
  const mergePatch = (target, patch) => { // RFC 7386 recursive
    for (const [k, v] of Object.entries(patch ?? {})) {
      if (v === null) delete target[k];
      else if (v && typeof v === 'object' && !Array.isArray(v) &&
               target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) mergePatch(target[k], v);
      else target[k] = v;
    }
    return target;
  };
  let seq = 0;
  return async (url, init = {}) => {
    const u = String(url);
    if (u === '/app/query' || u.endsWith('/app/query')) {
      try {
        const res = await fetchFn(u, init);
        if (res.ok) return res; // the back answers → source of truth
      } catch { /* network down → fixture */ }
      const { assetId, from, to } = JSON.parse(init.body);
      return { ok: true, status: 200, json: async () => fixtureProxyResponse(assetId, from, to) };
    }
    try {
      const res = await fetchFn(u, init);
      if (res.ok) return res;          // back = source of truth
      if (res.status === 401) return res; // let the global 401 handler (login) through
    } catch { /* network down → fixture */ }
    const path = pathOf(u);
    const method = init.method ?? 'GET';
    if (method === 'GET') {
      const r = findResource(path);
      if (r) return { ok: true, status: 200, headers: { get: (h) => (h === 'etag' ? `"fx${++seq}"` : null) }, json: async () => structuredClone(r) };
    }
    if (method === 'PATCH' && path.match(/^\/prefs\/\d+$/) && data[path]) {
      mergePatch(data[path], JSON.parse(init.body ?? '{}')); // form R1: {"prefs": {…}}
      return { ok: true, status: 200, headers: { get: (h) => (h === 'etag' ? `"fx${++seq}"` : null) }, json: async () => structuredClone(data[path]) };
    }
    return { ok: false, status: 404, headers: { get: () => null }, json: async () => ({ error: 'not found (fixture fallback)' }) };
  };
}
