// §2 conformance (FAP-LDP contract) + §10 (error/state handling).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionForStatus, locationFrom201, parseDspaceError } from '../src/lib/http-contract.js';

test('§2: status codes to handle on the front side', () => {
  assert.equal(actionForStatus(401), 'redirect-login');
  assert.equal(actionForStatus(403), 'forbidden');
  assert.equal(actionForStatus(404), 'not-found');
  assert.equal(actionForStatus(412), 'conflict-reload');
  assert.equal(actionForStatus(304), 'serve-cache');
  assert.equal(actionForStatus(429), 'backoff');
});

test('§2: 2xx = ok, anything else = error', () => {
  assert.equal(actionForStatus(200), 'ok');
  assert.equal(actionForStatus(201), 'ok');
  assert.equal(actionForStatus(500), 'error');
});

test('§2: POST container → 201 + Location', () => {
  const headers = new Headers({ Location: '/tickets/482' });
  assert.equal(locationFrom201(headers), '/tickets/482');
});

test('§2/§10: JSON-LD dspace:Error → code + messages extracted', () => {
  const body = { 'dspace:Error': { code: 'invalid_transition', messages: ['RESOLVED -> CLOSED reserved to the manager'] } };
  assert.deepEqual(parseDspaceError(body), {
    code: 'invalid_transition',
    messages: ['RESOLVED -> CLOSED reserved to the manager'],
  });
  assert.deepEqual(parseDspaceError(null), { code: 'unknown', messages: [] });
});
