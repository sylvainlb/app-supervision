// building-map — carte du parc (spec front §7.2). Base : ComponentObjectsHandler → OrbitComponent.
// Data : /buildings/ + croisement conteneur gold publié /gold/anomaly_candidates/.
// Carte Leaflet si window.L (CDN) présent, sinon repli liste cliquable. Clic → requestNavigation.
import { html, css } from 'lit';
import { OrbitComponent } from '../boilerplate/index.js';
import { computeBuildingStates } from './logic.js';

export class BuildingMap extends OrbitComponent {
  static properties = {
    ...OrbitComponent.properties,
    anomalies: { type: Array, attribute: false },
    tickets: { type: Array, attribute: false },
  };

  static styles = css`
    ${OrbitComponent.styles}
    .map { height: 420px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(17,24,39,.08); margin-bottom: 12px; }
    ul.markers { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
    .marker { color: #fff; border-radius: 999px; padding: 6px 14px; font-size: 0.85rem; }
    .marker.st-ok { background: #15803d; }
    .marker.st-anomaly { background: #d97706; }
    .marker.st-high { background: #dc2626; }
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

  // Carte Leaflet si la lib CDN est chargée (index.html), sinon repli liste.
  updated() {
    const L = window.L;
    if (!L) return;
    const states = computeBuildingStates(this.objects, this.anomalies, this.tickets)
      .filter(({ building }) => building.lat != null && building.lon != null);
    const div = this.renderRoot.querySelector('#map');
    if (!div || states.length === 0) return;
    if (!this._map) {
      this._map = L.map(div).setView([states[0].building.lat, states[0].building.lon], 13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this._map);
    }
    this._map.eachLayer((l) => { if (l instanceof L.Marker) this._map.removeLayer(l); });
    for (const { building, state } of states) {
      const marker = L.marker([building.lat, building.lon]).addTo(this._map);
      marker.bindPopup(`${building['buildings:name'] ?? building['@id']} — ${state}`);
      marker.on('click', () => this.navigate('building-detail', building['@id']));
      marker._state = state;
    }
  }

  renderContent() {
    const states = computeBuildingStates(this.objects, this.anomalies, this.tickets);
    return html`
      <div class="map" id="map"></div>
      <ul class="markers">
        ${states.map(({ building, state, anomalies }) => html`
          <li>
            <button class="marker st-${state}"
              title="${anomalies.length} anomalie(s) active(s)"
              @click=${() => this.navigate('building-detail', building['@id'])}>
              ${building['buildings:name'] ?? building['@id']}
            </button>
          </li>`)}
      </ul>`;
  }
}

customElements.define('building-map', BuildingMap);
