// energy-chart — graphique de consommation (spec front §7.3). Base : ComponentObjectHandler → OrbitComponent.
// Attributs : building (IRI), metric (net_grid_hourly | pv_performance_hourly | agrégat publié),
// window (24h | 7d | 30d). Hourly → proxy POST /app/query (§13.3, C1.9) ; agrégats → conteneur LDP publié.
// Badge de fraîcheur RG-4. Chart.js si disponible (window.Chart), sinon tableau repli.
import { html, css } from 'lit';
import { OrbitComponent, resolveMembers, getJson } from '../boilerplate/index.js';
import { field } from '../../src/lib/context.js';
import { queryGold } from '../../src/lib/gold-access.js';
import { metricAccess, selectWindow, buildSeries, formatFreshness, latestTimestamp, WINDOWS } from './logic.js';

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
    .freshness { font-size: 0.78rem; background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; border-radius: 999px; padding: 3px 10px; }
    canvas { max-height: 320px; background: #fff; border-radius: 8px; box-shadow: var(--shadow); }
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
      // Le proxy renvoie {columns, rows} avec rows = tableaux positionnels → objets.
      const cols = res.columns ?? [];
      this.rows = (res.rows ?? []).map((r) => (Array.isArray(r) ? Object.fromEntries(cols.map((c, i) => [c, r[i]])) : r));
    } else {
      const data = await getJson(access.container);
      const rows = await resolveMembers(data);
      this.rows = this.building
        ? rows.filter((r) => field(r, 'meter_id') === this.building || field(r, 'building') === this.building)
        : rows;
    }
    this._renderChart();
    return this.rows;
  }

  _proxyParams() {
    // assetId = nom du metric (net_grid_hourly…) ; buildProxyRequest fait le mapping
    // vers l'id catalogue DSP (dataset:facis:…) — ne pas mapper deux fois.
    const { from, to } = selectWindow(this.window);
    return { assetId: this.metric, from, to };
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
