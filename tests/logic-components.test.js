// Tests of the pure component logic (no DOM).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBuildingStates, isAnomalyActive, STATE } from '../components/building-map/logic.js';
import { filterAnomalies, ticketPrefill } from '../components/anomaly-list/logic.js';
import { groupByStatus, compareTickets } from '../components/ticket-board/logic.js';
import { allowedTransitions, transitionPatch, commentPayload } from '../components/ticket-detail/logic.js';
import { selectWindow, metricAccess, metricQuery, buildSeries, formatFreshness, latestTimestamp } from '../components/energy-chart/logic.js';
import { validateUser, userPayload } from '../components/user-admin/logic.js';
import { validateTicket, buildTicketPayload } from '../components/ticket-new/logic.js';
import { queryGold } from '../src/lib/gold-access.js';

test('building-map: green/orange/red states, CLOSED ticket deactivates the anomaly', () => {
  const buildings = [
    { '@id': '/buildings/1', meter_id: 'M1', 'buildings:name': 'B1' },
    { '@id': '/buildings/2', meter_id: 'M2', 'buildings:name': 'B2' },
    { '@id': '/buildings/3', meter_id: 'M3', 'buildings:name': 'B3' },
  ];
  const anomalies = [
    { '@id': '/gold/anomaly_candidates/10', meter_id: 'M1', severity: 'LOW', ts: '2026-11-19T10:00:00Z' },
    { '@id': '/gold/anomaly_candidates/11', meter_id: 'M2', severity: 'HIGH', ts: '2026-11-19T11:00:00Z' },
    { '@id': '/gold/anomaly_candidates/12', meter_id: 'M3', severity: 'LOW', ts: '2026-11-19T12:00:00Z' },
  ];
  const tickets = [{ 'tickets:status': 'CLOSED', 'tickets:anomaly_ref': '/gold/anomaly_candidates/12' }];
  assert.ok(!isAnomalyActive(anomalies[2], tickets));
  const states = computeBuildingStates(buildings, anomalies, tickets);
  assert.equal(states[0].state, STATE.ANOMALY); // orange
  assert.equal(states[1].state, STATE.HIGH); // red
  assert.equal(states[2].state, STATE.OK); // anomaly covered by a CLOSED ticket
});

test('anomaly-list: filters + date desc sort + ticket prefill', () => {
  const anomalies = [
    { '@id': 'a1', meter_id: 'M1', severity: 'LOW', type: 'drift', ts: '2026-11-19T08:00:00Z' },
    { '@id': 'a2', meter_id: 'M2', severity: 'HIGH', type: 'spike', ts: '2026-11-19T09:00:00Z' },
    { '@id': 'a3', meter_id: 'M1', severity: 'HIGH', type: 'drift', ts: '2026-11-19T10:00:00Z' },
  ];
  assert.deepEqual(filterAnomalies(anomalies, { severity: 'HIGH' }).map((a) => a['@id']), ['a3', 'a2']);
  assert.deepEqual(filterAnomalies(anomalies, { building: 'M1' }).map((a) => a['@id']), ['a3', 'a1']);
  assert.deepEqual(filterAnomalies(anomalies, { from: '2026-11-19T09:30:00Z' }).map((a) => a['@id']), ['a3']);
  const prefill = ticketPrefill(anomalies[1]);
  assert.equal(prefill.anomaly_ref, 'a2');
  assert.match(prefill.title, /spike/);
});

test('ticket-board: grouping by status + priority then date desc sort', () => {
  const tickets = [
    { '@id': 't1', 'tickets:status': 'OPEN', 'tickets:priority': 'LOW', 'tickets:created_at': '2026-11-18T10:00:00Z' },
    { '@id': 't2', 'tickets:status': 'OPEN', 'tickets:priority': 'CRITICAL', 'tickets:created_at': '2026-11-17T10:00:00Z' },
    { '@id': 't3', 'tickets:status': 'OPEN', 'tickets:priority': 'HIGH', 'tickets:created_at': '2026-11-19T10:00:00Z' },
    { '@id': 't4', 'tickets:status': 'RESOLVED', 'tickets:priority': 'MEDIUM', 'tickets:created_at': '2026-11-16T10:00:00Z' },
  ];
  const groups = groupByStatus(tickets);
  assert.deepEqual(Object.keys(groups), ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
  assert.deepEqual(groups.OPEN.map((t) => t['@id']), ['t2', 't3', 't1']);
  assert.equal(groups.RESOLVED.length, 1);
  assert.equal(groups.CLOSED.length, 0);
  assert.ok(compareTickets(tickets[1], tickets[0]) < 0);
});

test('ticket-detail: allowed transitions + merge-patch + comment', () => {
  const open = { 'tickets:status': 'OPEN', 'tickets:assigned_to': 'https://pod/users/tech1' };
  const t = allowedTransitions(open, 'technician', { assigned: true });
  assert.deepEqual(t.map((x) => x.to), ['IN_PROGRESS']);
  assert.deepEqual(t[0].patch, { status: 'IN_PROGRESS' });
  assert.deepEqual(transitionPatch('RESOLVED'), { status: 'RESOLVED' });
  assert.equal(allowedTransitions(open, 'technician', { assigned: false }).length, 0);
  assert.deepEqual(allowedTransitions({ 'tickets:status': 'RESOLVED' }, 'manager').map((x) => x.to).sort(), ['CLOSED', 'IN_PROGRESS']);
  const c = commentPayload('OK', 'https://pod/users/tech1', new Date('2026-11-19T12:00:00Z'));
  assert.equal(c.author, 'https://pod/users/tech1');
  assert.equal(c.ts, '2026-11-19T12:00:00.000Z');
});

test('energy-chart: windows, access path, proxy request, signed series, freshness', () => {
  const now = new Date('2026-11-19T12:00:00Z');
  assert.deepEqual(selectWindow('24h', now), { from: '2026-11-18T12:00:00.000Z', to: '2026-11-19T12:00:00.000Z' });
  assert.throws(() => selectWindow('1h', now), /unknown range/);
  assert.deepEqual(metricAccess('net_grid_hourly'), { via: 'proxy' });
  assert.deepEqual(metricAccess('energy_cost_daily'), { via: 'ldp', container: '/gold/energy_cost_daily/' });
  const req = metricQuery('net_grid_hourly', '7d', now);
  assert.equal(req.url, '/app/query');
  assert.equal(JSON.parse(req.body).assetId, 'dataset:facis:net-grid-hourly');
  assert.equal(JSON.parse(req.body).agreement, 'agreement:internal:framework-contract');
  const rows = [
    { ts_hour: '2026-11-19T10:00:00Z', net_grid_kw: 5 },
    { ts_hour: '2026-11-19T11:00:00Z', net_grid_kw: -2 },
  ];
  const series = buildSeries(rows, 'net_grid_hourly');
  assert.deepEqual(series.datasets[0].data, [5, 0]); // positive consumption
  assert.deepEqual(series.datasets[1].data, [0, -2]); // negative injection
  assert.match(formatFreshness('2026-11-19T10:30:00Z'), /data as of \d{2}:\d{2} — refresh ~10 min/);
  assert.equal(latestTimestamp(rows), '2026-11-19T11:00:00Z');
});

test('energy-chart: queryGold calls /app/query and handles 429', async () => {
  const calls = [];
  const fetchFn = async (url, init) => { calls.push([url, init]); return { ok: true, status: 200, json: async () => ({ rows: [] }) }; };
  await queryGold(fetchFn, { assetId: 'net_grid_hourly', from: 'a', to: 'b' });
  assert.equal(calls[0][0], '/app/query');
  assert.deepEqual(JSON.parse(calls[0][1].body), { agreement: 'agreement:internal:framework-contract', assetId: 'dataset:facis:net-grid-hourly', from: 'a', to: 'b' });
  const fetch429 = async () => ({ ok: false, status: 429, json: async () => ({}) });
  await assert.rejects(() => queryGold(fetch429, { assetId: 'net_grid_hourly', from: 'a', to: 'b' }), (e) => e.status === 429);
});

test('ticket-new: RG-1 (building required) + JSON-LD payload with anomaly_ref', () => {
  assert.ok(validateTicket({ title: 'T' }).some((e) => e.includes('building')));
  assert.ok(validateTicket({ building_id: '/buildings/1' }).some((e) => e.includes('title')));
  assert.deepEqual(validateTicket({ title: 'T', building_id: '/buildings/1' }), []);
  const p = buildTicketPayload({
    title: 'Anomaly a2', description: 'd', priority: 'HIGH',
    building_id: '/buildings/2', anomaly_ref: 'a2', created_by: 'https://app.localhost/users/1',
  });
  assert.equal(p.anomaly_ref, 'a2');
  assert.equal(p.priority, 'HIGH');
  assert.equal(p.building_id, '/buildings/2');
  const p2 = buildTicketPayload({ title: 'T', building_id: '/buildings/1' });
  assert.equal('anomaly_ref' in p2, false); // anomaly_ref optional (RG-1)
  assert.equal(p2.priority, 'MEDIUM'); // default §13.2
});

test('user-admin: webid IRI validation + role', () => {
  assert.deepEqual(validateUser({ webid: 'https://pod/users/u1', name: 'U1', email: 'u1@x.io', role: 'admin' }), []);
  assert.ok(validateUser({ webid: 'not-an-iri', name: 'U1', role: 'admin' }).some((e) => e.includes('webid')));
  assert.ok(validateUser({ webid: 'https://pod/users/u1', name: '', role: 'admin' }).some((e) => e.includes('name')));
  assert.ok(validateUser({ webid: 'https://pod/users/u1', name: 'U1', role: 'superadmin' }).some((e) => e.includes('invalid role')));
  assert.deepEqual(userPayload({ webid: 'https://pod/users/u1', name: 'U1', email: 'u1@x.io', role: 'technician' }).role, 'technician');
});

test('kpi-summary: dashboard aggregates', async () => {
  const { computeKpis } = await import('../components/kpi-summary/logic.js');
  const k = computeKpis(
    [{ '@id': 'b1' }, { '@id': 'b2' }],
    [{ '@id': 'a1', severity: 'HIGH' }, { '@id': 'a2', severity: 'LOW' }, { '@id': 'a3', severity: 'HIGH' }],
    [{ status: 'OPEN', anomaly_ref: 'a3' }, { status: 'CLOSED', anomaly_ref: 'a1' }, { status: 'IN_PROGRESS' }],
  );
  // a1 is inactive (linked CLOSED ticket), a3 active but ticket open → active, a2 active
  assert.equal(k.buildings, 2);
  assert.equal(k.anomaliesActive, 2); // a2 + a3 (a1 closed)
  assert.equal(k.anomaliesCritical, 1); // a3 high active
  assert.equal(k.ticketsOpen, 2); // OPEN + IN_PROGRESS
});
