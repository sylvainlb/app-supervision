// Conformité §13.5 — workflow exact des statuts (RG-2 complété).
// Le PEP rejette aussi 409 invalid_transition (décision K / CA-L15) ; l'UI ne fait que filtrer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATUSES, PRIORITIES, DEFAULT_PRIORITY, canCreate, canTransition, validNextStatuses } from '../src/lib/transitions.js';

test('§13.2 : enums', () => {
  assert.deepEqual(STATUSES, ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
  assert.deepEqual(PRIORITIES, ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
  assert.equal(DEFAULT_PRIORITY, 'MEDIUM');
});

test('§13.5 : création = OPEN, gestionnaire seul', () => {
  assert.ok(canCreate('gestionnaire'));
  assert.ok(!canCreate('technicien'));
  assert.ok(!canCreate('admin'));
  assert.ok(canTransition(null, 'OPEN', 'gestionnaire'));
  assert.ok(!canTransition(null, 'OPEN', 'technicien'));
  assert.ok(!canTransition(null, 'IN_PROGRESS', 'gestionnaire'));
});

test('§13.5 : technicien assigné — OPEN→IN_PROGRESS→RESOLVED, jamais CLOSED', () => {
  assert.ok(canTransition('OPEN', 'IN_PROGRESS', 'technicien', { assigned: true }));
  assert.ok(canTransition('IN_PROGRESS', 'RESOLVED', 'technicien', { assigned: true }));
  assert.ok(!canTransition('RESOLVED', 'CLOSED', 'technicien', { assigned: true }));
  assert.ok(!canTransition('CLOSED', 'OPEN', 'technicien', { assigned: true }));
  // technicien non assigné : rien
  assert.ok(!canTransition('OPEN', 'IN_PROGRESS', 'technicien', { assigned: false }));
});

test('§13.5 : gestionnaire — toute la matrice', () => {
  assert.ok(canTransition('OPEN', 'IN_PROGRESS', 'gestionnaire'));
  assert.ok(canTransition('IN_PROGRESS', 'RESOLVED', 'gestionnaire'));
  assert.ok(canTransition('RESOLVED', 'CLOSED', 'gestionnaire')); // clôture réservée au gestionnaire
  assert.ok(canTransition('RESOLVED', 'IN_PROGRESS', 'gestionnaire')); // réouverture
  assert.ok(canTransition('CLOSED', 'OPEN', 'gestionnaire')); // réouverture
});

test('§13.5 : transitions invalides rejetées', () => {
  assert.ok(!canTransition('OPEN', 'RESOLVED', 'gestionnaire'));
  assert.ok(!canTransition('OPEN', 'CLOSED', 'gestionnaire'));
  assert.ok(!canTransition('IN_PROGRESS', 'CLOSED', 'gestionnaire'));
  assert.ok(!canTransition('IN_PROGRESS', 'OPEN', 'gestionnaire'));
  assert.ok(!canTransition('CLOSED', 'RESOLVED', 'gestionnaire'));
  assert.ok(!canTransition('OPEN', 'BOGUS', 'gestionnaire'));
});

test('validNextStatuses reflète la matrice', () => {
  assert.deepEqual(validNextStatuses('RESOLVED', 'gestionnaire'), ['CLOSED', 'IN_PROGRESS']);
  assert.deepEqual(validNextStatuses('RESOLVED', 'technicien', { assigned: true }), []);
  assert.deepEqual(validNextStatuses('OPEN', 'technicien', { assigned: true }), ['IN_PROGRESS']);
});
