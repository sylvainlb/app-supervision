// anomaly-list — liste des anomalies (spec front §7.4). Base : ComponentObjectsHandler → OrbitComponent.
// Data : conteneur gold publié /gold/anomaly_candidates/ (§13.3). Filtres côté client.
// « Créer un ticket » → requestNavigation route ticket-new avec ?anomaly=<@id> (pré-remplit anomaly_ref).
import { html, css } from 'lit';
import { OrbitComponent } from '../boilerplate/index.js';
import { field } from '../../src/lib/context.js';
import { filterAnomalies, ticketPrefill, anomalyTs } from './logic.js';

export class AnomalyList extends OrbitComponent {
  static properties = {
    ...OrbitComponent.properties,
    filterSeverity: { type: String, attribute: false },
    filterBuilding: { type: String, attribute: false },
  };

  static styles = css`
    ${OrbitComponent.styles}
    ul { list-style: none; padding: 0; display: grid; gap: 8px; }
    li.anomaly { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; box-shadow: var(--shadow); }
    li.anomaly .meta { flex: 1; font-size: 0.88rem; color: #334155; }
    .badge.sev-HIGH { background: #dc2626; } .badge.sev-CRITICAL { background: #7f1d1d; }
    .badge.sev-MEDIUM { background: #d97706; } .badge.sev-LOW { background: #6b7280; }
    .empty { color: var(--muted); padding: 12px; }
    .filters { margin-bottom: 10px; }
  `;

  constructor() {
    super();
    this.dataSrc = '/gold/anomaly_candidates/';
    this.filterSeverity = '';
    this.filterBuilding = '';
  }

  renderContent() {
    const rows = filterAnomalies(this.objects, { severity: this.filterSeverity || undefined, building: this.filterBuilding || undefined });
    const severities = [...new Set(this.objects.map((a) => String(field(a, 'severity') ?? '').toUpperCase()).filter(Boolean))];
    return html`
      <div class="filters">
        <select @change=${(e) => { this.filterSeverity = e.target.value; }}>
          <option value="">toutes sévérités</option>
          ${severities.map((s) => html`<option value=${s} ?selected=${s === this.filterSeverity}>${s}</option>`)}
        </select>
      </div>
      ${rows.length === 0 ? html`<div class="empty">Aucune anomalie active — tout est normal.</div>` : html`
      <ul>
        ${rows.map((a) => {
          const sev = String(field(a, 'severity') ?? '').toUpperCase();
          const sevLabel = { HIGH: 'Élevée', CRITICAL: 'Critique', MEDIUM: 'Moyenne', LOW: 'Faible' }[sev] ?? sev;
          return html`
          <li class="anomaly">
            <span class="badge sev-${sev}">${sevLabel}</span>
            <span class="meta">
              <strong>Compteur ${field(a, 'meter_id') ?? '?'}</strong> — détectée le ${String(anomalyTs(a) ?? '').slice(0, 19).replace('T', ' à ')}
              — écart z=${field(a, 'z_score') ?? '?'} (seuil ~3)
              ${field(a, 'active_power_kw') != null ? html`<br>puissance mesurée : ${Math.round(field(a, 'active_power_kw') * 10) / 10} kW` : ''}
            </span>
            <button @click=${() => this._createTicket(a)}>Créer un ticket d'intervention</button>
          </li>`;
        })}
      </ul>`}`;
  }

  _createTicket(anomaly) {
    this.navigate('ticket-new', null, { anomaly: anomaly['@id'], prefill: ticketPrefill(anomaly) });
  }
}

customElements.define('anomaly-list', AnomalyList);
