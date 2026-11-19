// ticket-board — tableau des tickets par statut (spec front §7.5). Base : ComponentObjectsHandler.
// Data : /tickets/ (RLS filtre selon le rôle). Pas de drag & drop en v1 : changement de statut
// dans le détail (PATCH merge-patch). Actions selon clé inline permissions (CA-L11) + solid-ac-checker.
export const tagName = 'ticket-board';

if (typeof window !== 'undefined' && !customElements.get(tagName)) {
  customElements.define(tagName, class TicketBoard extends HTMLElement {});
}
