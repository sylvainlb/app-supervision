// ticket-detail — détail ticket, commentaires, assignation, statuts (spec front §7.6).
// Base : ComponentObjectHandler. Data : /tickets/<pk> + /tickets/<pk>/comments/.
// Transitions de statut : matrice §13.5 (src/lib/transitions.js) → PATCH {"tickets:status": ...} ;
// 412 → recharger + toast « modifié entre-temps ».
export const tagName = 'ticket-detail';

if (typeof window !== 'undefined' && !customElements.get(tagName)) {
  customElements.define(tagName, class TicketDetail extends HTMLElement {});
}
