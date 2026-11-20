// Logique pure ticket-board — spec front §7.5.
// Champs lus par nom local (field) : app_tickets:status, app_tickets:priority…
import { STATUSES, DEFAULT_PRIORITY } from '../../src/lib/transitions.js';
import { field } from '../../src/lib/context.js';

export const PRIORITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function compareTickets(a, b) {
  const pa = PRIORITY_ORDER[field(a, 'priority') ?? DEFAULT_PRIORITY];
  const pb = PRIORITY_ORDER[field(b, 'priority') ?? DEFAULT_PRIORITY];
  if (pa !== pb) return pa - pb; // priorité d'abord
  return (field(b, 'created_at') ?? '').localeCompare(field(a, 'created_at') ?? ''); // puis date desc
}

// Colonnes par statut avec compteurs ; tri priorité puis date dans chaque colonne.
export function groupByStatus(tickets) {
  const groups = Object.fromEntries(STATUSES.map((s) => [s, []]));
  for (const t of tickets ?? []) {
    if (t == null) continue;
    const status = field(t, 'status') ?? 'OPEN';
    (groups[status] ??= []).push(t);
  }
  for (const key of Object.keys(groups)) groups[key].sort(compareTickets);
  return groups;
}
