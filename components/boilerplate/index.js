// Boilerplate vendored — hiérarchie spec front §6.2 / doc SIB §6.1 :
// LitElement → ComponentObjectHandler (ressource seule, isType())
//   → ComponentObjectsHandler (liste, hasType()) → OrbitComponent (intégration Orbit).
// Conventions : attendre `orbit-ready` avant init ; data via window.sibStore.getData ;
// cache invalidé à l'écoute de `save` sur document ; navigation via CustomEvent
// 'requestNavigation' ; états async via Task (@lit/task : pending/error/complete).
import { LitElement, html, css } from 'lit';
import { Task } from '@lit/task';

export const sharedStyles = css`    :host { display: block; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #111827; }
    button {
      background: #2563eb; color: #fff; border: 0; border-radius: 8px;
      padding: 7px 14px; font-size: 0.9rem; cursor: pointer;
    }
    button:hover { background: #1e40af; }
    button.secondary { background: #fff; color: #111827; border: 1px solid #d1d5db; }
    button.secondary:hover { background: #f3f4f6; }
    input, select, textarea {
      border: 1px solid #d1d5db; border-radius: 8px; padding: 7px 10px; font-size: 0.9rem;
      font-family: inherit; background: #fff; color: #111827;
    }
    input:focus, select:focus, textarea:focus { outline: 2px solid #93c5fd; border-color: #2563eb; }
    table { border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(17,24,39,.08); }
    th { background: #f9fafb; text-align: left; font-size: 0.8rem; text-transform: uppercase; color: #6b7280; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; font-size: 0.9rem; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 3px rgba(17,24,39,.08); padding: 12px; }
    .badge { display: inline-block; border-radius: 999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 600; color: #fff; background: #6b7280; }
    .sev-LOW, .st-OPEN { background: #6b7280; }
    .sev-MEDIUM, .pri-MEDIUM { background: #d97706; }
    .sev-HIGH, .st-IN_PROGRESS, .pri-HIGH { background: #dc2626; }
    .sev-CRITICAL, .pri-CRITICAL { background: #7f1d1d; }
    .st-RESOLVED { background: #2563eb; }
    .st-CLOSED { background: #15803d; }
    .pending .skeleton { height: 1.2em; border-radius: 6px; background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%); background-size: 200% 100%; animation: pulse 1.2s infinite; }
    @keyframes pulse { to { background-position: -200% 0; } }
    .error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 8px; padding: 10px 14px; }
    .empty { border: 1px dashed #d1d5db; border-radius: 8px; padding: 24px; text-align: center; color: #6b7280; font-style: italic; background: #fff; }
    .toast { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; border-radius: 8px; padding: 10px 14px; margin: 8px 0; }`;

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

  static styles = sharedStyles;

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
      initial: () => html`<div class="pending" role="status"><div class="skeleton"></div></div>`,
      pending: () => html`<div class="pending" role="status"><div class="skeleton"></div></div>`,
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
