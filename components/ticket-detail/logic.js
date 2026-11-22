// Pure ticket-detail logic — front spec §7.6 + matrix §13.5.
// Fields read by local name (field); PATCH write with non-prefixed keys (@vocab).
import { canTransition, validNextStatuses } from '../../src/lib/transitions.js';
import { field } from '../../src/lib/context.js';

// RFC 7386 merge-patch of the status change (non-prefixed key → @vocab).
export function transitionPatch(to) {
  return { status: to };
}

// Only valid transition buttons (RG-2) for a given role.
export function allowedTransitions(ticket, role, { assigned = false } = {}) {
  const from = field(ticket, 'status');
  return validNextStatuses(from, role, { assigned }).map((to) => ({
    to,
    allowed: canTransition(from, to, role, { assigned }),
    patch: transitionPatch(to),
  }));
}

// Comment: POST append on /tickets/<pk>/comments/ (§7.6).
export function commentPayload(text, webid, now = new Date()) {
  return {
    text,
    author: webid,
    ts: now.toISOString(),
  };
}
