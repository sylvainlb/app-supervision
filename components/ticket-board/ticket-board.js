// ticket-board — tableau des tickets par statut (spec front §7.5). Base : ComponentObjectsHandler → OrbitComponent.
// Data : /tickets/ (RLS filtre selon le rôle). Colonnes par statut + compteurs ; tri priorité/date (§7.5).
// Pas de drag & drop en v1 ; clic carte → route détail.
import { html, css } from 'lit';
import { OrbitComponent } from '../boilerplate/index.js';
import { groupByStatus } from './logic.js';

export class TicketBoard extends OrbitComponent {
  static styles = css`
    ${OrbitComponent.styles}
    .board { display: flex; gap: 12px; }
    .column { flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 8px; }
    .card { border: 1px solid #ccc; border-radius: 4px; margin: 6px 0; padding: 6px; cursor: pointer; }
    .count { font-weight: bold; }
  `;

  constructor() {
    super();
    this.dataSrc = '/tickets/';
  }

  renderContent() {
    const groups = groupByStatus(this.objects);
    return html`
      <div class="board">
        ${Object.entries(groups).map(([status, tickets]) => html`
          <section class="column" data-status=${status}>
            <h3>${status} <span class="count">${tickets.length}</span></h3>
            ${tickets.map((t) => html`
              <div class="card" @click=${() => this.navigate('ticket-detail', t['@id'])}>
                <strong>${t['tickets:title']}</strong><br>
                priorité ${t['tickets:priority'] ?? 'MEDIUM'} · ${t['tickets:created_at'] ?? ''}
              </div>`)}
          </section>`)}
      </div>`;
  }
}

customElements.define('ticket-board', TicketBoard);
