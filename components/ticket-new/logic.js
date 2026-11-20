// Logique pure ticket-new — création de ticket (spec front §7.4 pré-remplissage,
// RG-1 : un ticket est toujours rattaché à un bâtiment).
// Écriture POST en clés non préfixées (@vocab du conteneur /tickets/).
import { PRIORITIES, DEFAULT_PRIORITY } from '../../src/lib/transitions.js';

export function validateTicket({ title, building_id } = {}) {
  const errors = [];
  if (!title) errors.push('titre requis');
  if (!building_id) errors.push('building required (RG-1)');
  return errors;
}

// Payload POST /tickets/ — clés non préfixées (le serveur mappe par nom local, @vocab).
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
