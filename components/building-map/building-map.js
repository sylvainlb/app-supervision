// building-map — carte du parc (spec front §7.2). Base boilerplate : ComponentObjectsHandler.
// Data : conteneur LDP /buildings/ + croisement conteneur gold publié anomaly_candidates.
// Init après orbit-ready ; data via window.sibStore.getData ; navigation via requestNavigation.
export const tagName = 'building-map';

if (typeof window !== 'undefined' && !customElements.get(tagName)) {
  customElements.define(tagName, class BuildingMap extends HTMLElement {});
}
