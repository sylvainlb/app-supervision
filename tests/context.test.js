// Conformité §13.2 — @context JSON-LD v1 servi par FAP-LDP.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContext } from '../src/lib/context.js';

test('§13.2 : préfixes exacts du contexte embarqué', () => {
  const ctx = buildContext('https://pod.example');
  assert.equal(ctx['@vocab'], 'https://pod.example/');
  assert.equal(ctx.ldp, 'http://www.w3.org/ns/ldp#');
  assert.equal(ctx.acl, 'http://www.w3.org/ns/auth/acl#');
  assert.equal(ctx.dspace, 'https://w3id.org/dspace/v0.8/');
  assert.equal(ctx.tickets, 'https://pod.example/ns/app/tickets#');
  assert.equal(ctx.buildings, 'https://pod.example/ns/app/buildings#');
  assert.equal(ctx.users, 'https://pod.example/ns/app/users#');
  assert.equal(ctx.comments, 'https://pod.example/ns/app/comments#');
});

test('§13.2 : slash final du pod normalisé', () => {
  const ctx = buildContext('https://pod.example/');
  assert.equal(ctx.tickets, 'https://pod.example/ns/app/tickets#');
});
