// energy-chart — graphique de consommation (spec front §7.3). Base : ComponentObjectHandler → OrbitComponent.
// Attributs : building (IRI), metric (net_grid_hourly | pv_performance_hourly | agrégat publié),
// window (24h | 7d | 30d). Hourly → proxy POST /app/query (§13.3, C1.9) ; agrégats → conteneur LDP publié.
// Badge de fraîcheur RG-4. Chart.js si disponible (window.Chart), sinon tableau repli.
import { html, css } from 'lit';
import { OrbitComponent } from '../boilerplate/index.js';
import { queryGold } from '../../src/lib/gold-access.js';
import { metricAccess, metricQuery, buildSeries, formatFreshness, latestTimestamp, WINDOWS } from './logic.js';

export class EnergyChart extends OrbitComponent {
  static properties = {
    ...OrbitComponent.properties,
    building: { type: String },
    metric: { type: String },
    window: { type: String },
    rows: { type: Array, attribute: false },
  };

  static styles = css`
    ${OrbitComponent.styles}
    .toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .toolbar strong { font-size: 1.05rem; }
    .freshness { font-size: 0.78rem; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; border-radius: 999px; padding: 3px 10px; }
    canvas { max-height: 320px; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(17,24,39,.08); }
    table { margin-top: 12px; max-height: 260px; display: block; overflow: auto; }
  `;

  constructor() {
    super();
    this.building = '';
    this.metric = 'net_grid_hourly';
    this.window = '24h';
    this.rows = [];
  }

  async load() {
    const access = metricAccess(this.metric);
    if (access.via === 'proxy') {
      // Ne jamais extraire la méthode (perd le `this`) : wrapper résolu à l'appel.
      const fetchFn = (u, i) => (window.sibStore?.fetchAuthn ?? fetch)(u, i);
      const res = await queryGold(fetchFn, this._proxyParams());
      this.rows = res.rows ?? [];
    } else {
      const data = await window.sibStore.getData(access.container);
      const rows = data?.['ldp:contains'] ?? [];
      this.rows = this.building
        ? rows.filter((r) => r.meter_id === this.building || r.building === this.building)
        : rows;
    }
    this._renderChart();
    return this.rows;
  }

  _proxyParams() {
    const req = metricQuery(this.metric, this.window);
    return JSON.parse(req.body); // {assetId, from, to}
  }

  isEmpty() {
    return this.rows.length === 0;
  }

  async _renderChart() {
    const series = buildSeries(this.rows, this.metric);
    if (window.Chart) {
      const canvas = this.renderRoot.querySelector('canvas');
      if (canvas) new window.Chart(canvas.getContext('2d'), { type: 'line', data: series });
    }
  }

  renderContent() {
    const series = buildSeries(this.rows, this.metric);
    return html`
      <div class="toolbar">
        <strong>${this.metric}</strong>
        <span class="freshness">${formatFreshness(latestTimestamp(this.rows))}</span>
        <select @change=${(e) => { this.window = e.target.value; this.refresh(); }}>
          ${Object.keys(WINDOWS).map((w) => html`<option value=${w} ?selected=${w === this.window}>${w}</option>`)}
        </select>
      </div>
      <canvas></canvas>
      <table>
        <thead><tr><th>ts</th>${series.datasets.map((d) => html`<th>${d.label}</th>`)}</tr></thead>
        <tbody>
          ${series.labels.map((l, i) => html`<tr><td>${l}</td>${series.datasets.map((d) => html`<td>${d.data[i]}</td>`)}</tr>`)}
        </tbody>
      </table>`;
  }
}

customElements.define('energy-chart', EnergyChart);
