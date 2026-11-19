// Conformité §13.3 (mapping assets gold) + §9/C1.9 (proxy POST /app/query) + §13.1 (jamais de HMAC navigateur).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GOLD_ASSETS, accessPlan, buildProxyRequest } from '../src/lib/gold-access.js';

test('§13.3 : mapping définitif LDP vs DSP', () => {
  assert.deepEqual(accessPlan('anomaly_candidates'), { via: 'ldp', container: '/gold/anomaly_candidates/' });
  assert.deepEqual(accessPlan('city_dashboard_summary'), { via: 'ldp', container: '/gold/city_dashboard_summary/' });
  assert.deepEqual(accessPlan('energy_cost_daily'), { via: 'ldp', container: '/gold/energy_cost_daily/' });
  assert.deepEqual(accessPlan('net_grid_hourly'), { via: 'proxy', container: null });
  assert.deepEqual(accessPlan('pv_performance_hourly'), { via: 'proxy', container: null });
  assert.throws(() => accessPlan('bronze_raw'), /inconnu/);
});

test('C1.9 : contrat proxy = POST /app/query, body {assetId, from, to}', () => {
  const req = buildProxyRequest({ assetId: 'net_grid_hourly', from: '2026-11-19T00:00:00Z', to: '2026-11-20T00:00:00Z' });
  assert.equal(req.method, 'POST');
  assert.equal(req.url, '/app/query');
  assert.deepEqual(JSON.parse(req.body), {
    assetId: 'net_grid_hourly',
    from: '2026-11-19T00:00:00Z',
    to: '2026-11-20T00:00:00Z',
  });
});

test('§13.1 : le front n appelle jamais /dsp/data directement', () => {
  const req = buildProxyRequest({ assetId: 'pv_performance_hourly', from: 'a', to: 'b' });
  assert.notEqual(req.url, '/dsp/data');
  assert.ok(!('X-DSP-Signature' in req.headers), 'aucun header HMAC côté navigateur');
});

test('§13.3 : un asset publié en LDP ne passe pas par le proxy', () => {
  assert.throws(() => buildProxyRequest({ assetId: 'anomaly_candidates', from: 'a', to: 'b' }), /publié en conteneur LDP/);
});

test('C1.9 : body incomplet rejeté', () => {
  assert.throws(() => buildProxyRequest({ assetId: 'net_grid_hourly', from: 'a' }), /incomplet/);
});

test('§13.3 : GOLD_ASSETS couvre exactement les 5 assets gold de la spec fonctionnelle §4.2', () => {
  assert.deepEqual(Object.keys(GOLD_ASSETS).sort(), [
    'anomaly_candidates',
    'city_dashboard_summary',
    'energy_cost_daily',
    'net_grid_hourly',
    'pv_performance_hourly',
  ]);
});
