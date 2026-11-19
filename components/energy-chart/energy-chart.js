// energy-chart — graphique de consommation (spec front §7.3). Base : ComponentObjectHandler.
// net_grid_hourly / pv_performance_hourly : NON publiés en LDP (§13.3) → proxy POST /app/query
// via buildProxyRequest (src/lib/gold-access.js). Agrégats journaliers : conteneurs gold publiés.
// Graphique : Chart.js (version épinglée §13.6). Fraîcheur affichée (RG-4). États @lit/task.
export const tagName = 'energy-chart';

if (typeof window !== 'undefined' && !customElements.get(tagName)) {
  customElements.define(tagName, class EnergyChart extends HTMLElement {});
}
