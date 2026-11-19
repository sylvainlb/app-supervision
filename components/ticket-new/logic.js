// Logique pure ticket-new — création de ticket (spec front §7.4 pré-remplissage,
// RG-1 : un ticket est toujours rattaché à un bâtiment).
import { PRIORITIES, DEFAULT_PRIORITY } from '../../src/lib/transitions.js';

export function validateTicket({ title, building_id } = {}) {
  const errors = [];
  if (!title) errors.push('titre requis');
  if (!building_id) errors.push('bâtiment requis (RG-1)');
  return errors;
}

// Payload JSON-LD POST /tickets/ — préfixes du @context §13.2.
export function buildTicketPayload({ title, description, priority, building_id, anomaly_ref, created_by } = {}) {
  const payload = {
    'tickets:title': title,
    'tickets:description': description ?? '',
    'tickets:priority': priority ?? DEFAULT_PRIORITY,
    'tickets:building_id': building_id,
    'tickets:created_by': created_by,
  };
  if (anomaly_ref) payload['tickets:anomaly_ref'] = anomaly_ref;
  return payload;
}

export { PRIORITIES };
