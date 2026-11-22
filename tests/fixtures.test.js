// Demo fixtures: data integrity + fallback behavior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES, fixtureProxyResponse, installFixtureFallback, installFixtureProxy } from '../src/lib/fixtures.js';
import { STATUSES, PRIORITIES } from '../src/lib/transitions.js';

test('integrity: geolocated buildings, tickets attached (RG-1), valid enums', () => {
  const buildings = FIXTURES['/buildings/']['ldp:contains'];
  const tickets = FIXTURES['/tickets/']['ldp:contains'];
  const anomalies = FIXTURES['/gold/anomaly_candidates/']['ldp:contains'];
  assert.ok(buildings.length >= 3);
  for (const b of buildings) {
    assert.ok(typeof b['buildings:lat'] === 'number' && typeof b['buildings:lon'] === 'number', `${b['@id']} geolocated (§13.4)`);
    assert.ok(b['buildings:meter_id']);
  }
  const buildingIds = new Set(buildings.map((b) => b['@id']));
  const meterIds = new Set(buildings.map((b) => b['buildings:meter_id']));
  for (const t of tickets) {
    assert.ok(STATUSES.includes(t['tickets:status']));
    assert.ok(PRIORITIES.includes(t['tickets:priority']));
    assert.ok(buildingIds.has(t['tickets:building_id']), `ticket ${t['@id']} attached to a building (RG-1)`);
  }
  for (const a of anomalies) assert.ok(meterIds.has(a.meter_id), `anomaly ${a['@id']} on a known meter`);
});

test('getData fallback: back down → fixture; back OK → passthrough', async () => {
  const failing = { getData: async () => { throw new Error('network'); } };
  const store = installFixtureFallback(failing, { enabled: true });
  const b = await store.getData('/buildings/');
  assert.ok(b['ldp:contains'].length >= 3);
  const t = await store.getData('/tickets/7'); // ressource seule
  assert.equal(t['tickets:status'], 'OPEN');
  const ok = { getData: async () => ({ real: true }) };
  const store2 = installFixtureFallback(ok, { enabled: true });
  assert.deepEqual(await store2.getData('/buildings/'), { real: true });
  const off = installFixtureFallback({ getData: async () => { throw new Error('network'); } }, { enabled: false });
  await assert.rejects(() => off.getData('/buildings/'));
});

test('mutation fallback: post/patch/delete on the in-memory fixture', async () => {
  const store = installFixtureFallback({ getData: async () => { throw new Error('down'); } }, { enabled: true });
  const before = (await store.getData('/tickets/'))['ldp:contains'].length;
  const created = await store.post('/tickets/', { 'tickets:title': 'Test', 'tickets:building_id': 'https://app.localhost/buildings/1' });
  assert.ok(created['@id']);
  const after = (await store.getData('/tickets/'))['ldp:contains'].length;
  assert.equal(after, before + 1);
  await store.patch(created['@id'], { 'tickets:status': 'IN_PROGRESS' });
  const t = (await store.getData('/tickets/'))['ldp:contains'].find((x) => x['@id'] === created['@id']);
  assert.equal(t['tickets:status'], 'IN_PROGRESS');
  await store.delete(created['@id']);
  assert.equal((await store.getData('/tickets/'))['ldp:contains'].length, before);
});

test('/app/query proxy fallback: back 404 → synthetic hourly series, back OK → passthrough', async () => {
  const notFound = async () => ({ ok: false, status: 404, json: async () => ({}) });
  const fetchMock = installFixtureProxy(notFound, { enabled: true });
  const res = await fetchMock('/app/query', { method: 'POST', body: JSON.stringify({ assetId: 'net_grid_hourly', from: '2026-11-19T00:00:00Z', to: '2026-11-20T00:00:00Z' }) });
  assert.ok(res.ok);
  const body = await res.json();
  assert.equal(body.assetId, 'net_grid_hourly');
  assert.equal(body.rowCount, 25); // 24 h + inclusive bound
  assert.ok(body.rows.every((r) => 'net_grid_kw' in r && 'ts_hour' in r));
  const okFetch = async () => ({ ok: true, status: 200, json: async () => ({ real: true }) });
  const res2 = await installFixtureProxy(okFetch, { enabled: true })('/app/query', { body: '{}' });
  assert.deepEqual(await res2.json(), { real: true });
  // disabled → nothing is touched
  const res3 = await installFixtureProxy(notFound, { enabled: false })('/app/query', { body: '{}' });
  assert.equal(res3.status, 404);
});

test('fixtureProxyResponse: 7d window PV is zero at night', () => {
  const r = fixtureProxyResponse('pv_performance_hourly', '2026-11-19T00:00:00Z', '2026-11-20T00:00:00Z');
  const night = r.rows.find((x) => new Date(x.ts_hour).getUTCHours() === 2);
  const noon = r.rows.find((x) => new Date(x.ts_hour).getUTCHours() === 12);
  assert.equal(night.power_w, 0);
  assert.ok(noon.power_w > 0);
});
