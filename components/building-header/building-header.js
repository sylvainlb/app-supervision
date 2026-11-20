// building-header — fiche d'identité du bâtiment en haut de la page /buildings/:id.
import { html, css } from 'lit';
import { OrbitComponent, getJson } from '../boilerplate/index.js';
import { field } from '../../src/lib/context.js';

export class BuildingHeader extends OrbitComponent {
  static styles = css`
    ${OrbitComponent.styles}
    .fiche { background: #fff; border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow); padding: 16px 18px; margin-bottom: 16px; }
    h2 { margin: 0 0 6px; font-size: 1.25rem; }
    .meta { color: var(--muted); font-size: 0.9rem; display: flex; gap: 18px; flex-wrap: wrap; }
  `;

  constructor() {
    super();
    this.dataSrc = '';
  }

  async load() {
    const data = await getJson(this.dataSrc);
    this.object = data;
    return data;
  }

  renderContent() {
    const b = this.object ?? {};
    return html`
      <div class="fiche">
        <h2>${field(b, 'name') ?? this.dataSrc}</h2>
        <div class="meta">
          <span>${field(b, 'address') ?? ''}</span>
          <span>compteur : ${field(b, 'meter_id') ?? '—'}</span>
        </div>
      </div>`;
  }
}

customElements.define('building-header', BuildingHeader);
