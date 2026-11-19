// anomaly-list — liste des anomalies (spec front §7.4). Base : ComponentObjectsHandler.
// Data : conteneur gold publié /gold/anomaly_candidates/ (§13.3).
// « Créer un ticket » → requestNavigation vers ticket-new avec ?anomaly=<@id> (pré-remplit anomaly_ref).
export const tagName = 'anomaly-list';

if (typeof window !== 'undefined' && !customElements.get(tagName)) {
  customElements.define(tagName, class AnomalyList extends HTMLElement {});
}
