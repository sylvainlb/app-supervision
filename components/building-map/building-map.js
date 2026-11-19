// building-map — carte du parc (spec front §7.2). Base : ComponentObjectsHandler → OrbitComponent.
// Data : /buildings/ + croisement conteneur gold publié /gold/anomaly_candidates/.
// Carte Leaflet si window.L (CDN) présent, sinon repli liste cliquable. Clic → requestNavigation.
import { html, css } from 'lit';
import { OrbitComponent } from '../boilerplate/index.js';
import { computeBuildingStates, STATE } from './logic.js';

const STATE_COLOR = { [STATE.OK]: 'green', [STATE.ANOMALY]: 'orange', [STATE.HIGH]: 'red' };

export class BuildingMap extends OrbitComponent {
  static properties = {
    ...OrbitComponent.properties,
    anomalies: { type: Array, attribute: false },
    tickets: { type: Array, attribute: false },
  };

  static styles = css`
    ${OrbitComponent.styles}
    .map { height: 400px; }
    ul.markers { list-style: none; padding: 0; }
    .marker { display: inline-block; margin: 4px; padding: 4px 8px; border-radius: 4px; color: #fff; cursor: pointer; }
  `;

  constructor() {
    super();
    this.dataSrc = '/buildings/';
    this.anomalies = [];
    this.tickets = [];
  }

  async load() {
    const [buildings, anomalies, tickets] = await Promise.all([
      window.sibStore.getData(this.dataSrc),
      window.sibStore.getData('/gold/anomaly_candidates/').catch(() => ({ 'ldp:contains': [] })),
      window.sibStore.getData('/tickets/').catch(() => ({ 'ldp:contains': [] })),
    ]);
    this.objects = buildings?.['ldp:contains'] ?? [];
    this.anomalies = anomalies?.['ldp:contains'] ?? [];
    this.tickets = tickets?.['ldp:contains'] ?? [];
    return buildings;
  }

  renderContent() {
    const states = computeBuildingStates(this.objects, this.anomalies, this.tickets);
    return html`
      <div class="map" id="map"></div>
      <ul class="markers">
        ${states.map(({ building, state, anomalies }) => html`
          <li>
            <button class="marker" style="background:${STATE_COLOR[state]}"
              title="${anomalies.length} anomalie(s) active(s)"
              @click=${() => this.navigate('building-detail', building['@id'])}>
              ${building['buildings:name'] ?? building['@id']}
            </button>
          </li>`)}
      </ul>`;
  }
}

customElements.define('building-map', BuildingMap);
