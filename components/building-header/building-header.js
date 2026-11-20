// building-header — fiche d'identité du bâtiment en haut de la page /buildings/:id.
import { html, css } from 'lit';
import { OrbitComponent, getJson } from '../boilerplate/index.js';
import { field } from '../../src/lib/context.js';

export class BuildingHeader extends OrbitComponent {
  static styles = css`
    ${OrbitComponent.styles}
    .fiche {
      position: relative; overflow: hidden;
      background: linear-gradient(120deg, #ffffff 60%, #f0fdfa);
      border: 1px solid var(--border); border-radius: var(--radius, 14px);
      box-shadow: var(--shadow); padding: 18px 22px; margin-bottom: 18px;
    }
    .fiche::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 5px; background: linear-gradient(180deg, #14b8a6, #0f766e); }
    h2 { margin: 0 0 8px; font-size: 1.35rem; font-weight: 700; }
    .meta { color: var(--muted); font-size: 0.9rem; display: flex; gap: 10px; flex-wrap: wrap; }
    .meta span { background: #f1f5f9; border: 1px solid var(--border); border-radius: 999px; padding: 4px 12px; }
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
          <span>meter: ${field(b, 'meter_id') ?? '—'}</span>
        </div>
      </div>`;
  }
}

customElements.define('building-header', BuildingHeader);
