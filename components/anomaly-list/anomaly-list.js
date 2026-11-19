// anomaly-list — liste des anomalies (spec front §7.4). Base : ComponentObjectsHandler → OrbitComponent.
// Data : conteneur gold publié /gold/anomaly_candidates/ (§13.3). Filtres côté client.
// « Créer un ticket » → requestNavigation route ticket-new avec ?anomaly=<@id> (pré-remplit anomaly_ref).
import { html, css } from 'lit';
import { OrbitComponent } from '../boilerplate/index.js';
import { filterAnomalies, ticketPrefill } from './logic.js';

export class AnomalyList extends OrbitComponent {
  static properties = {
    ...OrbitComponent.properties,
    filterSeverity: { type: String, attribute: false },
    filterBuilding: { type: String, attribute: false },
  };

  static styles = css`
    ${OrbitComponent.styles}
    .sev-LOW { background: #9e9e9e; } .sev-MEDIUM { background: #ff9800; }
    .sev-HIGH { background: #f44336; } .sev-CRITICAL { background: #7b0000; }
    .badge { color: #fff; border-radius: 10px; padding: 1px 8px; font-size: 0.8em; }
    li { margin: 4px 0; }
  `;

  constructor() {
    super();
    this.dataSrc = '/gold/anomaly_candidates/';
    this.filterSeverity = '';
    this.filterBuilding = '';
  }

  renderContent() {
    const rows = filterAnomalies(this.objects, { severity: this.filterSeverity || undefined, building: this.filterBuilding || undefined });
    const severities = [...new Set(this.objects.map((a) => a.severity).filter(Boolean))];
    return html`
      <div>
        <select @change=${(e) => { this.filterSeverity = e.target.value; }}>
          <option value="">toutes sévérités</option>
          ${severities.map((s) => html`<option value=${s} ?selected=${s === this.filterSeverity}>${s}</option>`)}
        </select>
      </div>
      ${rows.length === 0 ? html`<div class="empty">aucune anomalie</div>` : html`
      <ul>
        ${rows.map((a) => html`
          <li>
            <span class="badge sev-${a.severity}">${a.severity}</span>
            ${a.ts} — ${a.meter_id} — ${a.type}
            <button @click=${() => this._createTicket(a)}>Créer un ticket</button>
          </li>`)}
      </ul>`}`;
  }

  _createTicket(anomaly) {
    this.navigate('ticket-new', null, { anomaly: anomaly['@id'], prefill: ticketPrefill(anomaly) });
  }
}

customElements.define('anomaly-list', AnomalyList);
