// user-admin — CRUD users/rôles, réservé au rôle admin (spec front §7.7). Base : ComponentObjectsHandler.
// Data : /users/ (ACL/RLS). CRUD via store.post/put/delete ; webid saisi = IRI déréférençable.
export const tagName = 'user-admin';

if (typeof window !== 'undefined' && !customElements.get(tagName)) {
  customElements.define(tagName, class UserAdmin extends HTMLElement {});
}
