// Component tests (happy-dom, mocked window.sibStore) — boilerplate §6.2 conventions:
// init after orbit-ready, data via sibStore.getData, navigation via requestNavigation,
// invalidation on save event, pending/complete states.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, mockSibStore, mount } from './helpers/dom.js';

let window;
before(async () => {
  window = setupDom();
  await import('../components/building-map/building-map.js');
  await import('../components/anomaly-list/anomaly-list.js');
  await import('../components/ticket-board/ticket-board.js');
  await import('../components/ticket-detail/ticket-detail.js');
  await import('../components/ticket-new/ticket-new.js');
  await import('../components/energy-chart/energy-chart.js');
  await import('../components/user-admin/user-admin.js');
});

test('building-map: renders colored markers and navigates on click', async () => {
  mockSibStore(window, {
    '/buildings/': { 'ldp:contains': [
      { '@id': '/buildings/1', meter_id: 'M1', 'buildings:name': 'Alpha' },
      { '@id': '/buildings/2', meter_id: 'M2', 'buildings:name': 'Beta' },
    ] },
    '/gold/anomaly_candidates/': { 'ldp:contains': [
      { '@id': 'a1', meter_id: 'M2', severity: 'HIGH', ts: '2026-11-19T10:00:00Z' },
    ] },
    '/tickets/': { 'ldp:contains': [] },
  });
  const events = [];
  document.addEventListener('requestNavigation', (e) => events.push(e.detail));
  const el = await mount('building-map');
  const markers = el.shadowRoot.querySelectorAll('.marker');
  assert.equal(markers.length, 2);
  assert.match(markers[0].className, /st-ok/);
  assert.match(markers[1].className, /st-high/);
  markers[1].click();
  assert.deepEqual(events[0], { route: 'building-detail', resource: '/buildings/2', query: null });
});

test('anomaly-list: severity filter, empty state, "Create intervention ticket" button → requestNavigation ?anomaly=', async () => {
  mockSibStore(window, {
    '/gold/anomaly_candidates/': { 'ldp:contains': [
      { '@id': 'a1', meter_id: 'M1', severity: 'LOW', type: 'drift', ts: '2026-11-19T08:00:00Z' },
      { '@id': 'a2', meter_id: 'M2', severity: 'HIGH', type: 'spike', ts: '2026-11-19T09:00:00Z' },
    ] },
  });
  const events = [];
  document.addEventListener('requestNavigation', (e) => events.push(e.detail));
  const el = await mount('anomaly-list');
  assert.equal(el.shadowRoot.querySelectorAll('li').length, 2);
  el.filterSeverity = 'HIGH';
  await el.updateComplete;
  const items = el.shadowRoot.querySelectorAll('li');
  assert.equal(items.length, 1);
  items[0].querySelector('button').click();
  assert.equal(events.at(-1).route, 'ticket-new');
  assert.equal(events.at(-1).query.anomaly, 'a2');
  assert.equal(events.at(-1).query.prefill.anomaly_ref, 'a2');
  el.filterSeverity = 'CRITICAL';
  await el.updateComplete;
  assert.match(el.shadowRoot.querySelector('.empty').textContent, /No active anomaly/);
});

test('ticket-board: columns per status with counters, click → detail', async () => {
  mockSibStore(window, {
    '/tickets/': { 'ldp:contains': [
      { '@id': '/tickets/1', 'tickets:status': 'OPEN', 'tickets:priority': 'HIGH', 'tickets:title': 'T1', 'tickets:created_at': '2026-11-19T10:00:00Z' },
      { '@id': '/tickets/2', 'tickets:status': 'OPEN', 'tickets:priority': 'LOW', 'tickets:title': 'T2', 'tickets:created_at': '2026-11-19T11:00:00Z' },
      { '@id': '/tickets/3', 'tickets:status': 'CLOSED', 'tickets:priority': 'MEDIUM', 'tickets:title': 'T3', 'tickets:created_at': '2026-11-18T10:00:00Z' },
    ] },
  });
  const events = [];
  document.addEventListener('requestNavigation', (e) => events.push(e.detail));
  const el = await mount('ticket-board');
  const cols = el.shadowRoot.querySelectorAll('.column');
  assert.equal(cols.length, 4);
  assert.equal(cols[0].querySelector('.count').textContent, '2');
  assert.equal(cols[3].querySelector('.count').textContent, '1');
  cols[0].querySelector('.card').click();
  assert.deepEqual(events.at(-1), { route: 'ticket-detail', resource: '/tickets/1', query: null });
});

test('ticket-detail: assigned technician sees IN_PROGRESS (not CLOSED), PATCH merge-patch, 412 → toast', async () => {
  const calls = mockSibStore(window, {
    '/tickets/7': { '@id': '/tickets/7', 'tickets:status': 'OPEN', 'tickets:title': 'Leak', 'tickets:assigned_to': 'https://pod/users/tech1' },
    '/tickets/7/comments/': { 'ldp:contains': [{ 'comments:text': 'seen', 'comments:author': 'a', 'comments:ts': '2026-11-19T10:00:00Z' }] },
  });
  const el = await mount('ticket-detail', { dataSrc: '/tickets/7', role: 'technician', webid: 'https://pod/users/tech1' });
  let buttons = [...el.shadowRoot.querySelectorAll('.actions button')].map((b) => b.textContent);
  assert.deepEqual(buttons, ['IN_PROGRESS']);
  el.shadowRoot.querySelector('.actions button').click();
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(calls.find((c) => c[0] === 'patch'), ['patch', '/tickets/7', { status: 'IN_PROGRESS' }]);
  // 412 → toast + reload
  window.sibStore.patch = async () => { const e = new Error('conflict'); e.status = 412; throw e; };
  el._changeStatus('IN_PROGRESS');
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  assert.match(el.toast, /modified in the meantime/);
});

test('energy-chart: hourly metric → POST /app/query via fetchAuthn, freshness badge, windows', async () => {
  const calls = [];
  mockSibStore(window, {});
  window.sibStore.fetchAuthn = async (url, init) => {
    calls.push([url, JSON.parse(init.body)]);
    return { ok: true, status: 200, json: async () => ({ rows: [
      { ts_hour: '2026-11-19T10:00:00Z', net_grid_kw: 5 },
      { ts_hour: '2026-11-19T11:00:00Z', net_grid_kw: -2 },
    ] }) };
  };
  const el = await mount('energy-chart', { metric: 'net_grid_hourly', window: '24h' });
  assert.equal(calls[0][0], '/app/query');
  assert.equal(calls[0][1].assetId, 'dataset:facis:net-grid-hourly');
  assert.match(el.shadowRoot.querySelector('.freshness').textContent, /refresh ~10 min/);
  const rows = el.shadowRoot.querySelectorAll('tbody tr');
  assert.equal(rows.length, 2);
  // the 7d window changes the body
  el.window = '7d';
  await el.load();
  const last = calls.at(-1)[1];
  assert.ok(new Date(last.to) - new Date(last.from) === 7 * 24 * 3600e3);
});

test('user-admin: webid validation, POST create, DELETE remove', async () => {
  const calls = mockSibStore(window, {
    '/users/': { 'ldp:contains': [{ '@id': '/users/1', 'users:webid': 'https://pod/users/u1', 'users:name': 'U1', 'users:role': 'admin' }] },
  });
  const el = await mount('user-admin');
  assert.equal(el.shadowRoot.querySelectorAll('tbody tr').length, 1);
  el.form = { webid: 'not-an-iri', name: 'X', email: '', role: 'admin' };
  await el._submit();
  assert.ok(el.errors.some((e) => e.includes('webid')));
  assert.ok(!calls.some((c) => c[0] === 'post'));
  el.form = { webid: 'https://pod/users/u2', name: 'U2', email: 'u2@x.io', role: 'technician' };
  await el._submit();
  const post = calls.find((c) => c[0] === 'post');
  assert.equal(post[1], '/users/');
  assert.equal(post[2].role, 'technician');
  el._remove({ '@id': '/users/1' });
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(calls.some((c) => c[0] === 'delete' && c[1] === '/users/1'));
});

test('ticket-new: anomaly prefill, RG-1 validation, POST /tickets/ then navigation', async () => {
  const calls = mockSibStore(window, {
    '/buildings/': { 'ldp:contains': [{ '@id': '/buildings/1', 'buildings:name': 'Alpha' }] },
  });
  const events = [];
  document.addEventListener('requestNavigation', (e) => events.push(e.detail));
  const el = await mount('ticket-new', { anomaly: 'a2', webid: 'https://app.localhost/users/1' });
  assert.match(el.shadowRoot.querySelector('p').textContent, /a2/);
  // without building → RG-1 error, no POST
  el.form = { title: 'Anomaly a2', description: '', priority: 'MEDIUM', building_id: '' };
  await el._submit();
  assert.ok(el.errors.some((e) => e.includes('building')));
  assert.ok(!calls.some((c) => c[0] === 'post'));
  // with building → POST with anomaly_ref
  el.form = { ...el.form, building_id: '/buildings/1' };
  await el._submit();
  const post = calls.find((c) => c[0] === 'post');
  assert.equal(post[1], '/tickets/');
  assert.equal(post[2].anomaly_ref, 'a2');
  assert.equal(post[2].created_by, 'https://app.localhost/users/1');
  assert.equal(events.at(-1).route, 'tickets');
});

test('§5 convention: save event on document triggers a refresh (re-fetch)', async () => {
  const calls = mockSibStore(window, { '/tickets/': { 'ldp:contains': [] } });
  const el = await mount('ticket-board');
  const before = calls.filter((c) => c[0] === 'get' && c[1] === '/tickets/').length;
  document.dispatchEvent(new CustomEvent('save', { detail: { resource: { '@id': '/tickets/' } } }));
  await new Promise((r) => setTimeout(r, 0));
  const after = calls.filter((c) => c[0] === 'get' && c[1] === '/tickets/').length;
  assert.ok(after > before, 'save must invalidate the cache and reload');
});
