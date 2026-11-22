// §13.3 conformance (gold asset mapping) + §9/C1.9 (proxy POST /app/query) + §13.1 (never any HMAC in the browser).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GOLD_ASSETS, accessPlan, buildProxyRequest } from '../src/lib/gold-access.js';

test('§13.3: definitive LDP vs DSP mapping', () => {
  assert.deepEqual(accessPlan('anomaly_candidates'), { via: 'ldp', container: '/gold/anomaly_candidates/' });
  assert.deepEqual(accessPlan('city_dashboard_summary'), { via: 'ldp', container: '/gold/city_dashboard_summary/' });
  assert.deepEqual(accessPlan('energy_cost_daily'), { via: 'ldp', container: '/gold/energy_cost_daily/' });
  assert.deepEqual(accessPlan('net_grid_hourly'), { via: 'proxy', container: null, datasetId: 'dataset:facis:net-grid-hourly' });
  assert.deepEqual(accessPlan('pv_performance_hourly'), { via: 'proxy', container: null, datasetId: 'dataset:facis:energy-balance-hourly' });
  assert.throws(() => accessPlan('bronze_raw'), /unknown/);
});

test('C1.9: proxy contract = POST /app/query, body {agreement, assetId, from, to}', () => {
  const req = buildProxyRequest({ assetId: 'net_grid_hourly', from: '2026-11-19T00:00:00Z', to: '2026-11-20T00:00:00Z' });
  assert.equal(req.method, 'POST');
  assert.equal(req.url, '/app/query');
  assert.deepEqual(JSON.parse(req.body), {
    agreement: 'agreement:internal:framework-contract',
    assetId: 'dataset:facis:net-grid-hourly',
    from: '2026-11-19T00:00:00Z',
    to: '2026-11-20T00:00:00Z',
  });
});

test('§13.1: the front never calls /dsp/data directly', () => {
  const req = buildProxyRequest({ assetId: 'pv_performance_hourly', from: 'a', to: 'b' });
  assert.notEqual(req.url, '/dsp/data');
  assert.ok(!('X-DSP-Signature' in req.headers), 'no HMAC header in the browser');
});

test('§13.3: an asset published in LDP does not go through the proxy', () => {
  assert.throws(() => buildProxyRequest({ assetId: 'anomaly_candidates', from: 'a', to: 'b' }), /published in an LDP container/);
});

test('C1.9: incomplete body rejected', () => {
  assert.throws(() => buildProxyRequest({ assetId: 'net_grid_hourly', from: 'a' }), /incomplete/);
});

test('§13.3: GOLD_ASSETS covers exactly the 5 gold assets of the functional spec §4.2', () => {
  assert.deepEqual(Object.keys(GOLD_ASSETS).sort(), [
    'anomaly_candidates',
    'city_dashboard_summary',
    'energy_cost_daily',
    'net_grid_hourly',
    'pv_performance_hourly',
  ]);
});
