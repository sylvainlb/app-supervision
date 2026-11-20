// Boilerplate vendored — hiérarchie spec front §6.2 / doc SIB §6.1 :
// LitElement → ComponentObjectHandler (ressource seule, isType())
//   → ComponentObjectsHandler (liste, hasType()) → OrbitComponent (intégration Orbit).
// Conventions : attendre `orbit-ready` avant init ; data via window.sibStore.getData ;
// cache invalidé à l'écoute de `save` sur document ; navigation via CustomEvent
// 'requestNavigation' ; états async via Task (@lit/task : pending/error/complete).
import { LitElement, html, css } from 'lit';
import { Task } from '@lit/task';

// Lecture JSON-LD BRUTE via le fetch authentifié injecté dans sibStore (§13.7 :
// point d'injection unique window.sibStore.fetchAuthn — DPoP/Bearer + réécriture
// absolue vers POD_URL + repli fixtures faits dans index.ts).
// On n'utilise PAS sibStore.getData() ici : il renvoie des proxies CustomGetter dont
// les champs ne sont lisibles qu'en async via get(path) — illisible pour nos blox custom.
export async function getJson(url) {
  const fetchFn = window.sibStore?.fetchAuthn ?? fetch;
  const res = await fetchFn(url, { headers: { accept: 'application/ld+json' } });
  if (!res.ok) {
    const err = new Error(`GET ${url} → ${res.status}`);
    err.status = res.status;
    try { err.body = await res.json(); } catch { /* body pas JSON */ }
    throw err;
  }
  return res.json();
}

// Résout les membres d'un conteneur LDP (qui ne liste que des @id) en ressources
// complètes via getJson(@id). Membres déjà complets (fixtures) inchangés.
export async function resolveMembers(data) {
  const members = data?.['ldp:contains'] ?? (Array.isArray(data) ? data : []);
  return Promise.all(members.map(async (m) => {
    if (m && typeof m === 'object' && m['@id'] && Object.keys(m).filter((k) => k !== '@id' && k !== '@type').length === 0) {
      try { return await getJson(m['@id']); } catch { return m; }
    }
    return m;
  }));
}

export const sharedStyles = css`    :host {
    --brand: #0d9488; --brand-dark: #115e59; --ink: #0f172a; --muted: #64748b;
    --border: #e2e8f0; --shadow: 0 1px 2px rgba(15,23,42,.06), 0 4px 14px rgba(15,23,42,.05);
    display: block; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #111827; }
    button {
      background: var(--brand, #0d9488); color: #fff; border: 0; border-radius: 8px;
      padding: 7px 14px; font-size: 0.9rem; cursor: pointer;
    }
    button:hover { background: var(--brand-dark, #115e59); }
    button.secondary { background: #fff; color: var(--ink, #0f172a); border: 1px solid var(--border, #e2e8f0); }
    button.secondary:hover { background: #f3f4f6; }
    input, select, textarea {
      border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 7px 10px; font-size: 0.9rem;
      font-family: inherit; background: #fff; color: var(--ink, #0f172a);
    }
    input:focus, select:focus, textarea:focus { outline: 2px solid #5eead4; border-color: var(--brand, #0d9488); }
    table { border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: var(--shadow, 0 1px 2px rgba(15,23,42,.06)); }
    th { background: #f8fafc; text-align: left; font-size: 0.8rem; text-transform: uppercase; color: var(--muted, #64748b); }
    th, td { border: 1px solid var(--border, #e2e8f0); padding: 8px 12px; font-size: 0.9rem; }
    .card { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; box-shadow: var(--shadow, 0 1px 2px rgba(15,23,42,.06)); padding: 12px; }
    .badge { display: inline-block; border-radius: 999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 600; color: #fff; background: #6b7280; }
    .sev-LOW, .st-OPEN { background: #64748b; }
    .sev-MEDIUM, .pri-MEDIUM { background: #d97706; }
    .sev-HIGH, .st-IN_PROGRESS, .pri-HIGH { background: #ea580c; }
    .sev-CRITICAL, .pri-CRITICAL { background: #b91c1c; }
    .st-RESOLVED { background: #0284c7; }
    .st-CLOSED, .st-ok { background: #059669; } .st-anomaly { background: #d97706; } .st-high { background: #dc2626; }
    .pending .skeleton { height: 1.2em; border-radius: 6px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: pulse 1.2s infinite; }
    @keyframes pulse { to { background-position: -200% 0; } }
    .error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 8px; padding: 10px 14px; }
    .empty { border: 1px dashed #cbd5e1; border-radius: 8px; padding: 24px; text-align: center; color: var(--muted, #64748b); font-style: italic; background: #fff; }
    .toast { background: #fffbeb; border: 1px solid #fde68a; color: #b45309; border-radius: 8px; padding: 10px 14px; margin: 8px 0; }`;

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
    const data = await getJson(this.dataSrc);
    const resolved = await resolveMembers(data);
    this.objects = resolved.filter((m) => this.hasType(m));
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
