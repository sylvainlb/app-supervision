// Conformité §2 (concurrence ETag weak) + §5 (invalidation sur save).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EtagCache } from '../src/lib/etag-cache.js';

test('§2 : GET avec entrée en cache envoie If-None-Match ; 304 → serve-cache', () => {
  const cache = new EtagCache();
  cache.store('/tickets/482', 'W/"v1"', { title: 't' });
  const headers = cache.requestHeaders('/tickets/482', 'GET');
  assert.deepEqual(headers, { 'If-None-Match': 'W/"v1"' });
  const res = cache.handleResponse('/tickets/482', 304, null, null);
  assert.equal(res.action, 'serve-cache');
  assert.deepEqual(res.body, { title: 't' });
});

test('§2 : PUT/PATCH envoie If-Match ; 412 → conflict-reload (recharger + reproposer)', () => {
  const cache = new EtagCache();
  cache.store('/tickets/482', 'W/"v1"', { title: 't' });
  const headers = cache.requestHeaders('/tickets/482', 'PATCH');
  assert.deepEqual(headers, { 'If-Match': 'W/"v1"' });
  const res = cache.handleResponse('/tickets/482', 412, null, null);
  assert.equal(res.action, 'conflict-reload');
});

test('§2 : 200 met à jour le cache et retourne le body', () => {
  const cache = new EtagCache();
  const res = cache.handleResponse('/tickets/482', 200, 'W/"v2"', { title: 't2' });
  assert.equal(res.action, 'ok');
  assert.equal(cache.get('/tickets/482').etag, 'W/"v2"');
});

test('§5 : purge après save retire la ressource et son conteneur', () => {
  const cache = new EtagCache();
  cache.store('/tickets/482', 'W/"v1"', {});
  cache.store('/tickets/', 'W/"c1"', {});
  cache.purge('/tickets/482');
  assert.equal(cache.get('/tickets/482'), undefined);
  assert.equal(cache.get('/tickets/'), undefined);
});

test('sans entrée en cache : aucun header conditionnel', () => {
  const cache = new EtagCache();
  assert.deepEqual(cache.requestHeaders('/tickets/999', 'GET'), {});
});
