// §13.5 conformance — exact status workflow (RG-2 completed).
// The PEP also rejects 409 invalid_transition (decision K / CA-L15); the UI only filters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATUSES, PRIORITIES, DEFAULT_PRIORITY, canCreate, canTransition, validNextStatuses } from '../src/lib/transitions.js';

test('§13.2 : enums', () => {
  assert.deepEqual(STATUSES, ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
  assert.deepEqual(PRIORITIES, ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
  assert.equal(DEFAULT_PRIORITY, 'MEDIUM');
});

test('§13.5: creation = OPEN, manager only', () => {
  assert.ok(canCreate('manager'));
  assert.ok(!canCreate('technician'));
  assert.ok(!canCreate('admin'));
  assert.ok(canTransition(null, 'OPEN', 'manager'));
  assert.ok(!canTransition(null, 'OPEN', 'technician'));
  assert.ok(!canTransition(null, 'IN_PROGRESS', 'manager'));
});

test('§13.5: assigned technician — OPEN→IN_PROGRESS→RESOLVED, never CLOSED', () => {
  assert.ok(canTransition('OPEN', 'IN_PROGRESS', 'technician', { assigned: true }));
  assert.ok(canTransition('IN_PROGRESS', 'RESOLVED', 'technician', { assigned: true }));
  assert.ok(!canTransition('RESOLVED', 'CLOSED', 'technician', { assigned: true }));
  assert.ok(!canTransition('CLOSED', 'OPEN', 'technician', { assigned: true }));
  // unassigned technician: nothing
  assert.ok(!canTransition('OPEN', 'IN_PROGRESS', 'technician', { assigned: false }));
});

test('§13.5: manager — the whole matrix', () => {
  assert.ok(canTransition('OPEN', 'IN_PROGRESS', 'manager'));
  assert.ok(canTransition('IN_PROGRESS', 'RESOLVED', 'manager'));
  assert.ok(canTransition('RESOLVED', 'CLOSED', 'manager')); // closing reserved to the manager
  assert.ok(canTransition('RESOLVED', 'IN_PROGRESS', 'manager')); // reopen
  assert.ok(canTransition('CLOSED', 'OPEN', 'manager')); // reopen
});

test('§13.5: invalid transitions rejected', () => {
  assert.ok(!canTransition('OPEN', 'RESOLVED', 'manager'));
  assert.ok(!canTransition('OPEN', 'CLOSED', 'manager'));
  assert.ok(!canTransition('IN_PROGRESS', 'CLOSED', 'manager'));
  assert.ok(!canTransition('IN_PROGRESS', 'OPEN', 'manager'));
  assert.ok(!canTransition('CLOSED', 'RESOLVED', 'manager'));
  assert.ok(!canTransition('OPEN', 'BOGUS', 'manager'));
});

test('validNextStatuses reflects the matrix', () => {
  assert.deepEqual(validNextStatuses('RESOLVED', 'manager'), ['CLOSED', 'IN_PROGRESS']);
  assert.deepEqual(validNextStatuses('RESOLVED', 'technician', { assigned: true }), []);
  assert.deepEqual(validNextStatuses('OPEN', 'technician', { assigned: true }), ['IN_PROGRESS']);
});
