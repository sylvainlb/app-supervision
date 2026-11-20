// Fixtures de démonstration — données exemple quand le back ne répond pas
// (LDP 404/500 ou réseau) ; activées par défaut en dev (VITE_FIXTURES != '0').
// Le back reste la source de vérité : dès qu'il répond, les vraies données passent.
import { config } from '../config.js';

const POD = config.podUrl.replace(/\/+$/, '') || 'http://localhost'; // base absolue requise par new URL() sous Node (tests)

export const FIXTURES = {
  '/users/': {
    '@id': `${POD}/users/`,
    'ldp:contains': [
      { '@id': `${POD}/users/1`, 'users:webid': `${POD}/users/1`, 'users:name': 'Claire Martin', 'users:email': 'claire.martin@fap.local', 'users:role': 'gestionnaire' },
      { '@id': `${POD}/users/2`, 'users:webid': `${POD}/users/2`, 'users:name': ' Karim Aziz', 'users:email': 'karim.aziz@fap.local', 'users:role': 'technicien' },
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
  '/tickets/7/comments/': {
    '@id': `${POD}/tickets/7/comments/`,
    'ldp:contains': [
      { '@id': `${POD}/tickets/7/comments/1`, 'comments:ticket_id': `${POD}/tickets/7`, 'comments:author': `${POD}/users/1`, 'comments:text': 'Anomaly confirmed, technician assigned.', 'comments:ts': '2026-11-19T21:16:00Z' },
      { '@id': `${POD}/tickets/7/comments/2`, 'comments:ticket_id': `${POD}/tickets/7`, 'comments:author': `${POD}/users/2`, 'comments:text': 'On site, investigation in progress.', 'comments:ts': '2026-11-19T21:30:00Z' },
    ],
  },
};

// Réponse synthétique du proxy /app/query pour les métriques horaires.
export function fixtureProxyResponse(assetId, from, to) {
  const rows = [];
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  for (let t = start; t <= end; t += 3600e3) {
    const h = new Date(t).getHours();
    const base = 8 + 6 * Math.sin((h - 9) / 24 * 2 * Math.PI); // courbe journalière
    if (assetId === 'net_grid_hourly') {
      rows.push({ ts_hour: new Date(t).toISOString(), net_grid_kw: Math.round(base * 10) / 10 });
    } else if (assetId === 'pv_performance_hourly') {
      const pv = h >= 7 && h <= 19 ? Math.round(4000 * Math.sin((h - 7) / 12 * Math.PI)) : 0;
      rows.push({ ts_hour: new Date(t).toISOString(), power_w: pv, capacity_factor: pv / 5000 });
    }
  }
  return { assetId, schema: 'gold', table: assetId, columns: Object.keys(rows[0] ?? {}), rows, rowCount: rows.length };
}

// Repli fixture sur sibStore : getData retombe sur la fixture si le back ne répond pas
// (erreur réseau ou statut >= 400) ; post/patch/delete mutent la fixture en mémoire.
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

// Repli fixture pour le proxy /app/query (fetchAuthn) : renvoie des séries horaires synth.
export function installFixtureProxy(fetchFn, { enabled = true } = {}) {
  if (!enabled) return fetchFn;
  return async (url, init) => {
    if (url === '/app/query' || url.endsWith('/app/query')) {
      try {
        const res = await fetchFn(url, init);
        if (res.ok) return res; // le back répond → source de vérité
      } catch { /* réseau coupé → fixture */ }
      const { assetId, from, to } = JSON.parse(init.body);
      return { ok: true, status: 200, json: async () => fixtureProxyResponse(assetId, from, to) };
    }
    return fetchFn(url, init);
  };
}
