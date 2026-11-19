// Logique pure ticket-board — spec front §7.5.
import { STATUSES, DEFAULT_PRIORITY } from '../../src/lib/transitions.js';

export const PRIORITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function compareTickets(a, b) {
  const pa = PRIORITY_ORDER[a['tickets:priority'] ?? DEFAULT_PRIORITY];
  const pb = PRIORITY_ORDER[b['tickets:priority'] ?? DEFAULT_PRIORITY];
  if (pa !== pb) return pa - pb; // priorité d'abord
  return (b['tickets:created_at'] ?? '').localeCompare(a['tickets:created_at'] ?? ''); // puis date desc
}

// Colonnes par statut avec compteurs ; tri priorité puis date dans chaque colonne.
export function groupByStatus(tickets) {
  const groups = Object.fromEntries(STATUSES.map((s) => [s, []]));
  for (const t of tickets ?? []) {
    const status = t['tickets:status'] ?? 'OPEN';
    (groups[status] ??= []).push(t);
  }
  for (const key of Object.keys(groups)) groups[key].sort(compareTickets);
  return groups;
}
