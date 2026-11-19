// Workflow exact des statuts — RG-2 complété, spec front §13.5.
// Le PEP FAP-LDP rejette aussi une transition invalide (409 dspace:Error invalid_transition,
// décision K / CA-L15) ; l'UI filtre les boutons mais ne décide jamais seule.

export const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const DEFAULT_PRIORITY = 'MEDIUM';
export const ROLES = ['gestionnaire', 'technicien', 'admin'];

// Matrice §13.5 : depuis → vers → rôles autorisés.
// "technicien" = technicien assigné au ticket (paramètre `assigned`).
const MATRIX = {
  OPEN: { IN_PROGRESS: ['technicien', 'gestionnaire'] },
  IN_PROGRESS: { RESOLVED: ['technicien', 'gestionnaire'] },
  RESOLVED: { CLOSED: ['gestionnaire'], IN_PROGRESS: ['gestionnaire'] },
  CLOSED: { OPEN: ['gestionnaire'] },
};

// Création : uniquement OPEN, par le gestionnaire.
export function canCreate(role) {
  return role === 'gestionnaire';
}

export function canTransition(from, to, role, { assigned = false } = {}) {
  if (!STATUSES.includes(to)) return false;
  if (from === null || from === undefined) return to === 'OPEN' && canCreate(role);
  if (!STATUSES.includes(from)) return false;
  const allowed = MATRIX[from]?.[to];
  if (!allowed) return false;
  if (role === 'technicien') return allowed.includes('technicien') && assigned;
  return allowed.includes(role);
}

export function validNextStatuses(from, role, opts) {
  if (from === null || from === undefined) return canCreate(role) ? ['OPEN'] : [];
  return Object.keys(MATRIX[from] ?? {}).filter((to) => canTransition(from, to, role, opts));
}
