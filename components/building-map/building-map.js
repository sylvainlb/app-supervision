// building-map — carte du parc (spec front §7.2). Base : ComponentObjectsHandler → OrbitComponent.
// Data : /buildings/ + croisement conteneur gold publié /gold/anomaly_candidates/.
// Carte Leaflet si window.L (CDN) présent, sinon repli liste cliquable. Clic → requestNavigation.
import { html, css } from 'lit';
import { OrbitComponent, resolveMembers, getJson } from '../boilerplate/index.js';
import { field } from '../../src/lib/context.js';
import { computeBuildingStates } from './logic.js';

export class BuildingMap extends OrbitComponent {
  static properties = {
    ...OrbitComponent.properties,
    anomalies: { type: Array, attribute: false },
    tickets: { type: Array, attribute: false },
  };

  static styles = css`
    ${OrbitComponent.styles}
    .map { height: 420px; border-radius: 8px; overflow: hidden; box-shadow: var(--shadow); margin-bottom: 12px; }
    ul.markers { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
    .marker { color: #fff; border-radius: 999px; padding: 6px 14px; font-size: 0.85rem; }
    .marker.st-ok { background: #059669; }
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
      getJson(this.dataSrc),
      getJson('/gold/anomaly_candidates/').catch(() => ({ 'ldp:contains': [] })),
      getJson('/tickets/').catch(() => ({ 'ldp:contains': [] })),
    ]);
    this.objects = await resolveMembers(buildings);
    this.anomalies = await resolveMembers(anomalies);
    this.tickets = await resolveMembers(tickets);
    return buildings;
  }

  // Carte Leaflet si la lib CDN est chargée (index.html), sinon repli liste.
  updated() {
    const L = window.L;
    if (!L) return;
    const states = computeBuildingStates(this.objects, this.anomalies, this.tickets)
      .filter(({ building }) => typeof field(building, 'lat') === 'number' && typeof field(building, 'lon') === 'number');
    const div = this.renderRoot.querySelector('#map');
    if (!div || states.length === 0) return;
    if (!this._map) {
      this._map = L.map(div).setView([field(states[0].building, 'lat'), field(states[0].building, 'lon')], 13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this._map);
    }
    this._map.eachLayer((l) => { if (l instanceof L.Marker) this._map.removeLayer(l); });
    for (const { building, state } of states) {
      const marker = L.marker([field(building, 'lat'), field(building, 'lon')]).addTo(this._map);
      marker.bindPopup(`${field(building, 'name') ?? building['@id']} — ${state}`);
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
              ${field(building, 'name') ?? building['@id']}
            </button>
          </li>`)}
      </ul>`;
  }
}

customElements.define('building-map', BuildingMap);
