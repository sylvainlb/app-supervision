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
    .filters { margin-bottom: 12px; }
    ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    li { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 3px rgba(17,24,39,.08); padding: 10px 14px; }
    li .meta { flex: 1; color: #374151; font-size: 0.9rem; }
    li button { margin-left: auto; }
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
      <div class="filters">
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
            <span class="meta">${a.ts} — ${a.meter_id} — ${a.type}</span>
            <button @click=${() => this._createTicket(a)}>Créer un ticket</button>
          </li>`)}
      </ul>`}`;
  }

  _createTicket(anomaly) {
    this.navigate('ticket-new', null, { anomaly: anomaly['@id'], prefill: ticketPrefill(anomaly) });
  }
}

customElements.define('anomaly-list', AnomalyList);
