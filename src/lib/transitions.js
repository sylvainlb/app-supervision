// Exact status workflow — RG-2 completed, front spec §13.5.
// The FAP-LDP PEP also rejects an invalid transition (409 dspace:Error invalid_transition,
// decision K / CA-L15); the UI filters the buttons but never decides on its own.

export const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const DEFAULT_PRIORITY = 'MEDIUM';
export const ROLES = ['manager', 'technician', 'admin'];

// Matrix §13.5: from → to → allowed roles.
// "technician" = technician assigned to the ticket (parameter `assigned`).
const MATRIX = {
  OPEN: { IN_PROGRESS: ['technician', 'manager'] },
  IN_PROGRESS: { RESOLVED: ['technician', 'manager'] },
  RESOLVED: { CLOSED: ['manager'], IN_PROGRESS: ['manager'] },
  CLOSED: { OPEN: ['manager'] },
};

// Creation: OPEN only, by the manager role.
export function canCreate(role) {
  return role === 'manager';
}

export function canTransition(from, to, role, { assigned = false } = {}) {
  if (!STATUSES.includes(to)) return false;
  if (from === null || from === undefined) return to === 'OPEN' && canCreate(role);
  if (!STATUSES.includes(from)) return false;
  const allowed = MATRIX[from]?.[to];
  if (!allowed) return false;
  if (role === 'technician') return allowed.includes('technician') && assigned;
  return allowed.includes(role);
}

export function validNextStatuses(from, role, opts) {
  if (from === null || from === undefined) return canCreate(role) ? ['OPEN'] : [];
  return Object.keys(MATRIX[from] ?? {}).filter((to) => canTransition(from, to, role, opts));
}
