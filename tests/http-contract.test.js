// Conformité §2 (contrat FAP-LDP) + §10 (gestion des erreurs/états).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionForStatus, locationFrom201, parseDspaceError } from '../src/lib/http-contract.js';

test('§2 : codes à gérer côté front', () => {
  assert.equal(actionForStatus(401), 'redirect-login');
  assert.equal(actionForStatus(403), 'forbidden');
  assert.equal(actionForStatus(404), 'not-found');
  assert.equal(actionForStatus(412), 'conflict-reload');
  assert.equal(actionForStatus(304), 'serve-cache');
  assert.equal(actionForStatus(429), 'backoff');
});

test('§2 : 2xx = ok, le reste = error', () => {
  assert.equal(actionForStatus(200), 'ok');
  assert.equal(actionForStatus(201), 'ok');
  assert.equal(actionForStatus(500), 'error');
});

test('§2 : POST conteneur → 201 + Location', () => {
  const headers = new Headers({ Location: '/tickets/482' });
  assert.equal(locationFrom201(headers), '/tickets/482');
});

test('§2/§10 : erreur JSON-LD dspace:Error → code + messages extraits', () => {
  const body = { 'dspace:Error': { code: 'invalid_transition', messages: ['RESOLVED -> CLOSED réservé au gestionnaire'] } };
  assert.deepEqual(parseDspaceError(body), {
    code: 'invalid_transition',
    messages: ['RESOLVED -> CLOSED réservé au gestionnaire'],
  });
  assert.deepEqual(parseDspaceError(null), { code: 'unknown', messages: [] });
});
