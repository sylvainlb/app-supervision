// Logique pure ticket-detail — spec front §7.6 + matrice §13.5.
// Champs lus par nom local (field) ; écriture PATCH en clés non préfixées (@vocab).
import { canTransition, validNextStatuses } from '../../src/lib/transitions.js';
import { field } from '../../src/lib/context.js';

// PATCH merge-patch RFC 7386 du changement de statut (clé non préfixée → @vocab).
export function transitionPatch(to) {
  return { status: to };
}

// Boutons de transition valides uniquement (RG-2) pour un rôle donné.
export function allowedTransitions(ticket, role, { assigned = false } = {}) {
  const from = field(ticket, 'status');
  return validNextStatuses(from, role, { assigned }).map((to) => ({
    to,
    allowed: canTransition(from, to, role, { assigned }),
    patch: transitionPatch(to),
  }));
}

// Commentaire : POST append sur /tickets/<pk>/comments/ (§7.6).
export function commentPayload(text, webid, now = new Date()) {
  return {
    text,
    author: webid,
    ts: now.toISOString(),
  };
}
