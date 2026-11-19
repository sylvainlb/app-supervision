// Boilerplate vendored — hiérarchie spec front §6.2 / doc SIB §6.1 :
// LitElement → ComponentObjectHandler (ressource seule, isType())
//   → ComponentObjectsHandler (liste, hasType()) → OrbitComponent (intégration Orbit).
// Conventions : attendre `orbit-ready` avant init ; data via window.sibStore.getData ;
// cache invalidé à l'écoute de `save` sur document ; navigation via CustomEvent
// 'requestNavigation' ; états async via Task (@lit/task : pending/error/complete).
import { LitElement, html, css } from 'lit';
import { Task } from '@lit/task';

export class ComponentObjectHandler extends LitElement {
  static properties = {
    dataSrc: { type: String, attribute: 'data-src' },
    object: { type: Object, attribute: false },
  };

  constructor() {
    super();
    this.object = null;
  }

  // À surcharger : prédicat sur la ressource chargée.
  isType(_obj) {
    return true;
  }
}

export class ComponentObjectsHandler extends ComponentObjectHandler {
  static properties = {
    ...ComponentObjectHandler.properties,
    objects: { type: Array, attribute: false },
  };

  constructor() {
    super();
    this.objects = [];
  }

  // À surcharger : prédicat sur chaque membre du conteneur.
  hasType(_obj) {
    return true;
  }
}

export class OrbitComponent extends ComponentObjectsHandler {
  static properties = {
    ...ComponentObjectsHandler.properties,
    error: { type: Object, attribute: false },
  };

  static styles = css`
    :host { display: block; font-family: sans-serif; }
    .pending { opacity: 0.6; }
    .error { color: #b00020; }
    .empty { color: #555; font-style: italic; }
  `;

  constructor() {
    super();
    this.error = null;
    this._task = new Task(this, {
      task: async () => this.load(),
      autoRun: false,
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this._onSave = () => this.refresh(); // invalidation cache sur mutation (§5)
    document.addEventListener('save', this._onSave);
    const ready = window.orbit?.ready
      ?? new Promise((resolve) => document.addEventListener('orbit-ready', resolve, { once: true }));
    ready.then(() => this.refresh());
  }

  disconnectedCallback() {
    document.removeEventListener('save', this._onSave);
    super.disconnectedCallback();
  }

  // Hook de chargement — à surcharger. Alimenter this.object / this.objects.
  async load() {
    const data = await window.sibStore.getData(this.dataSrc);
    const members = data?.['ldp:contains'] ?? (Array.isArray(data) ? data : []);
    this.objects = members.filter((m) => this.hasType(m));
    this.object = this.isType(data) ? data : null;
    return data;
  }

  refresh() {
    this._task.run();
  }

  navigate(route, resource = null, query = null) {
    document.dispatchEvent(new CustomEvent('requestNavigation', { detail: { route, resource, query } }));
  }

  // État vide explicite (§7.1) — à surcharger si le composant alimente autre chose que objects/object.
  isEmpty() {
    return this.objects.length === 0 && !this.object;
  }

  render() {
    return this._task.render({
      pending: () => html`<div class="pending" role="status">chargement…</div>`,
      error: (e) => html`<div class="error" role="alert">erreur : ${e?.message ?? e}</div>`,
      complete: () => (this.isEmpty()
        ? html`<div class="empty">aucun élément</div>`
        : this.renderContent()),
    });
  }

  // À surcharger : rendu du contenu une fois les données chargées.
  renderContent() {
    return html``;
  }
}
