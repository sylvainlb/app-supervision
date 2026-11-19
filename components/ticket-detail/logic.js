// Logique pure ticket-detail — spec front §7.6 + matrice §13.5.
import { canTransition, validNextStatuses } from '../../src/lib/transitions.js';

// PATCH merge-patch RFC 7386 du changement de statut.
export function transitionPatch(to) {
  return { 'tickets:status': to };
}

// Boutons de transition valides uniquement (RG-2) pour un rôle donné.
export function allowedTransitions(ticket, role, { assigned = false } = {}) {
  const from = ticket?.['tickets:status'];
  return validNextStatuses(from, role, { assigned }).map((to) => ({
    to,
    allowed: canTransition(from, to, role, { assigned }),
    patch: transitionPatch(to),
  }));
}

// Commentaire : POST append sur /tickets/<pk>/comments/ (§7.6).
export function commentPayload(text, webid, now = new Date()) {
  return {
    'comments:text': text,
    'comments:author': webid,
    'comments:ts': now.toISOString(),
  };
}
