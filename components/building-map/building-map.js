// building-map — carte du parc (spec front §7.2). Base : ComponentObjectsHandler → OrbitComponent.
// Data : /buildings/ + croisement conteneur gold publié /gold/anomaly_candidates/ + /tickets/.
// Carte Leaflet si window.L (CDN) présent, sinon repli liste. Clic → détail bâtiment.
// Fix carte « cassée » : la map est créée dans requestAnimationFrame (le conteneur a sa
// taille après le 1er rendu) + invalidateSize() à chaque mise à jour.
import { html, css } from 'lit';
import { OrbitComponent, resolveMembers, getJson } from '../boilerplate/index.js';
import { field } from '../../src/lib/context.js';
import { computeBuildingStates, STATE } from './logic.js';

const STATE_LABEL = {
  [STATE.OK]: { label: 'OK', cls: 'st-ok', desc: 'no active anomaly' },
  [STATE.ANOMALY]: { label: 'Anomaly', cls: 'st-anomaly', desc: 'active anomaly detected' },
  [STATE.HIGH]: { label: 'Critical', cls: 'st-high', desc: 'high-severity anomaly' },
};

export class BuildingMap extends OrbitComponent {
  static properties = {
    ...OrbitComponent.properties,
    anomalies: { type: Array, attribute: false },
    tickets: { type: Array, attribute: false },
  };

  static styles = css`
    ${OrbitComponent.styles}
    .map { height: 400px; border-radius: var(--radius, 14px); overflow: hidden; box-shadow: var(--shadow-lg); background: #aad3df; border: 1px solid var(--border); }
    /* Pastille bâtiment sur la carte (divIcon Leaflet) */
    .bmk { background: transparent; border: none; }
    .bmk-dot {
      display: block; width: 26px; height: 26px; border-radius: 50%;
      border: 3px solid #fff; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.55);
      position: relative;
    }
    /* Halo pulsant sur les états critiques */
    .bmk-dot.st-high::after, .bmk-dot.st-anomaly::after {
      content: ""; position: absolute; inset: -3px; border-radius: 50%;
      border: 2px solid currentColor; opacity: 0; animation: bmk-pulse 1.8s ease-out infinite;
    }
    .bmk-dot.st-high::after { color: #dc2626; }
    .bmk-dot.st-anomaly::after { color: #d97706; }
    @keyframes bmk-pulse {
      0% { transform: scale(0.7); opacity: 0.9; }
      100% { transform: scale(2.1); opacity: 0; }
    }
    .leaflet-container { background: #aad3df; font-family: inherit; } /* tuiles OSM manquantes → fond neutre, pas de blanc cassé */
    .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: var(--shadow-lg); }
    .legend { display: flex; gap: 10px; flex-wrap: wrap; font-size: 0.82rem; color: var(--muted); margin: 12px 2px 14px; }
    .legend > span {
      display: inline-flex; align-items: center; gap: 7px; background: #fff;
      border: 1px solid var(--border); border-radius: 999px; padding: 5px 12px; box-shadow: var(--shadow);
    }
    .legend .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
    .legend .hint { margin-left: auto; background: transparent; border: 0; box-shadow: none; font-style: italic; }
    ul.markers { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 12px; }
    .marker {
      display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;
      background: #fff; color: var(--ink); border: 1px solid var(--border); border-left: 4px solid #9ca3af;
      border-radius: 12px; padding: 12px 14px; cursor: pointer; font-size: 0.9rem;
      box-shadow: var(--shadow); transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
    }
    .marker:hover { background: #ecfdf5; transform: translateY(-2px); box-shadow: var(--shadow-lg); }
    .marker .dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 0 3px rgba(15,23,42,.06); }
    .marker.st-ok { border-left-color: #059669; } .marker.st-ok .dot { background: #059669; }
    .marker.st-anomaly { border-left-color: #d97706; } .marker.st-anomaly .dot { background: #d97706; }
    .marker.st-high { border-left-color: #dc2626; } .marker.st-high .dot { background: #dc2626; }
    .marker .name { font-weight: 600; }
    .marker .sub { display: block; font-size: 0.78rem; color: var(--muted); font-weight: 400; margin-top: 1px; }
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

  // Injecte leaflet.css DANS le shadow root et résout quand il est appliqué.
  _leafletCssReady() {
    if (this._cssPromise) return this._cssPromise;
    let link = this.renderRoot.querySelector('link[data-leaflet-css]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.dataset.leafletCss = '1';
      this.renderRoot.prepend(link);
    }
    this._cssPromise = new Promise((resolve) => {
      if (link.sheet) return resolve(); // déjà chargé
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => resolve(), { once: true }); // on tente quand même
      setTimeout(() => resolve(), 4000); // filet de sécurité
    });
    return this._cssPromise;
  }

  // Carte Leaflet si la lib CDN est chargée (index.html), sinon repli liste.
  updated() {
    const L = window.L;
    if (!L) return;
    // Marqueur = pastille colorée selon l'état (même code couleur que la légende/liste) :
    // bien visible sur la carte, contrairement à l'icône Leaflet par défaut trop petite.
    const STATE_COLOR = { [STATE.OK]: '#059669', [STATE.ANOMALY]: '#d97706', [STATE.HIGH]: '#dc2626' };
    const states = computeBuildingStates(this.objects, this.anomalies, this.tickets)
      .filter(({ building }) => typeof field(building, 'lat') === 'number' && typeof field(building, 'lon') === 'number');
    const div = this.renderRoot.querySelector('#map');
    if (!div || states.length === 0) return;
    // La map doit être créée APRÈS le 1er rendu (taille du conteneur connue) ET après
    // le chargement du CSS Leaflet dans le shadow root (les styles du document ne
    // pénètrent pas le shadow DOM : sans ça, les tuiles n'ont aucun positionnement →
    // « carte cassée »), puis re-mesurée à chaque update.
    requestAnimationFrame(async () => {
      await this._leafletCssReady();
      if (!this._map) {
        this._map = L.map(div, { scrollWheelZoom: false }).setView(
          [field(states[0].building, 'lat'), field(states[0].building, 'lon')], 13);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(this._map);
        this._markers = L.featureGroup().addTo(this._map);
      }
      this._map.invalidateSize();
      // Le conteneur peut encore changer de taille après le 1er rendu (polices, layout) :
      // re-mesurer après peinture, sinon les tuiles restent décalées sur une partie de la carte.
      setTimeout(() => this._map?.invalidateSize(), 250);
      this._markers.clearLayers();
      for (const { building, state } of states) {
        const s = STATE_LABEL[state] ?? STATE_LABEL[STATE.OK];
        const color = STATE_COLOR[state] ?? STATE_COLOR[STATE.OK];
        const name = field(building, 'name') ?? building['@id'];
        const icon = L.divIcon({
          className: 'bmk',
          html: `<span class="bmk-dot ${s.cls}" style="background:${color};color:${color}"></span>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          popupAnchor: [0, -14],
        });
        const marker = L.marker([field(building, 'lat'), field(building, 'lon')], { icon, title: name }).addTo(this._markers);
        marker.bindPopup(`<strong>${name}</strong><br>${s.label} — ${s.desc}`);
        marker.bindTooltip(name, { direction: 'top', offset: [0, -12] });
        marker.on('click', () => this.navigate('building-detail', building['@id']));
      }
      if (this._markers.getLayers().length) this._map.fitBounds(this._markers.getBounds().pad(0.2));
    });
  }

  renderContent() {
    const states = computeBuildingStates(this.objects, this.anomalies, this.tickets);
    return html`
      <div class="map" id="map"></div>
      <div class="legend">
        ${Object.values(STATE_LABEL).map((s) => html`
          <span><span class="dot" style="background:${s.cls === 'st-ok' ? '#059669' : s.cls === 'st-anomaly' ? '#d97706' : '#dc2626'}"></span>${s.label} : ${s.desc}</span>`)}
        <span class="hint">Click a building to see its details</span>
      </div>
      <ul class="markers">
        ${states.map(({ building, state, anomalies }) => {
          const s = STATE_LABEL[state] ?? STATE_LABEL[STATE.OK];
          return html`
          <li>
            <button class="marker ${s.cls}"
              title="${anomalies.length} active anomaly(s)"
              @click=${() => this.navigate('building-detail', building['@id'])}>
              <span class="dot"></span>
              <span><span class="name">${field(building, 'name') ?? building['@id']}</span>
              <span class="sub">${s.label} · ${anomalies.length} anomaly(s) · ${field(building, 'meter_id') ?? ''}</span></span>
            </button>
          </li>`;
        })}
      </ul>`;
  }
}

customElements.define('building-map', BuildingMap);
