// Pure ticket-new logic — ticket creation (front spec §7.4 prefill,
// RG-1: a ticket is always attached to a building).
// POST write with non-prefixed keys (@vocab of the /tickets/ container).
import { PRIORITIES, DEFAULT_PRIORITY } from '../../src/lib/transitions.js';

export function validateTicket({ title, building_id } = {}) {
  const errors = [];
  if (!title) errors.push('title required');
  if (!building_id) errors.push('building required (RG-1)');
  return errors;
}

// POST /tickets/ payload — non-prefixed keys (the server maps by local name, @vocab).
export function buildTicketPayload({ title, description, priority, building_id, anomaly_ref, created_by } = {}) {
  const payload = {
    title,
    description: description ?? '',
    priority: priority ?? DEFAULT_PRIORITY,
    building_id,
    created_by,
    status: 'OPEN',
  };
  if (anomaly_ref) payload.anomaly_ref = anomaly_ref;
  return payload;
}

export { PRIORITIES };
