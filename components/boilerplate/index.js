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
    --brand: #10b981; --brand-light: #34d399; --brand-dark: #059669; --ink: #0f172a; --muted: #64748b;
    --border: #e5eaf0;
    --shadow: 0 1px 2px rgba(15,23,42,.05), 0 6px 18px rgba(15,23,42,.06);
    --shadow-lg: 0 4px 10px rgba(15,23,42,.07), 0 18px 44px rgba(15,23,42,.13);
    display: block; font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #111827; }
    /* Curseur « main » sur tout ce qui est cliquable (y compris <a> sans href :
       le navigateur ne met le pointer que sur les liens avec href). */
    a, button, summary, [role="button"], [data-route], .clickable { cursor: pointer; }
    button {
      background: linear-gradient(135deg, var(--brand-light, #34d399), var(--brand, #10b981)); color: #064e3b; border: 0; border-radius: 10px;
      padding: 8px 16px; font-size: 0.9rem; font-weight: 700; cursor: pointer;
      box-shadow: 0 1px 3px rgba(16,185,129,.35);
      transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
    }
    button:hover { filter: brightness(1.04); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,.45); }
    button:active { transform: translateY(0); }
    button.secondary { background: #fff; color: var(--ink, #0f172a); border: 1px solid var(--border, #e5eaf0); box-shadow: var(--shadow); }
    button.secondary:hover { background: #f3f4f6; box-shadow: var(--shadow-lg); }
    input, select, textarea {
      border: 1px solid var(--border, #e5eaf0); border-radius: 10px; padding: 8px 11px; font-size: 0.9rem;
      font-family: inherit; background: #fbfcfe; color: var(--ink, #0f172a);
      transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
    }
    input:focus, select:focus, textarea:focus {
      outline: none; border-color: var(--brand, #10b981); background: #fff;
      box-shadow: 0 0 0 3px rgba(52,211,153,.28);
    }
    table { border-collapse: separate; border-spacing: 0; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow); border: 1px solid var(--border, #e5eaf0); }
    th { background: #f8fafc; text-align: left; font-size: 0.76rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted, #64748b); }
    th, td { border-bottom: 1px solid var(--border, #e5eaf0); padding: 9px 13px; font-size: 0.9rem; }
    tr:last-child td { border-bottom: 0; }
    tbody tr { transition: background .12s ease; }
    tbody tr:hover { background: #ecfdf5; }
    .card { background: #fff; border: 1px solid var(--border, #e5eaf0); border-radius: 12px; box-shadow: var(--shadow); padding: 12px; transition: box-shadow .15s ease, transform .15s ease; }
    /* Badges « soft » : fond teinté + texte coloré (plus lisibles que le plein uni) */
    .badge { display: inline-block; border-radius: 999px; padding: 3px 11px; font-size: 0.74rem; font-weight: 700; letter-spacing: .02em; color: #475569; background: #f1f5f9; }
    .sev-LOW, .st-OPEN { background: #e2e8f0; color: #475569; }
    .sev-MEDIUM, .pri-MEDIUM, .st-anomaly { background: #fef3c7; color: #b45309; }
    .sev-HIGH, .st-IN_PROGRESS, .pri-HIGH { background: #ffedd5; color: #c2410c; }
    .sev-CRITICAL, .pri-CRITICAL, .st-high { background: #fee2e2; color: #b91c1c; }
    .st-RESOLVED { background: #e0f2fe; color: #0369a1; }
    .st-CLOSED, .st-ok { background: #d1fae5; color: #047857; }
    .pending .skeleton { height: 1.2em; border-radius: 8px; background: linear-gradient(90deg, #e8edf3 25%, #f4f7fa 50%, #e8edf3 75%); background-size: 200% 100%; animation: pulse 1.2s infinite; }
    @keyframes pulse { to { background-position: -200% 0; } }
    .error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 10px; padding: 10px 14px; }
    .empty { border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 28px; text-align: center; color: var(--muted, #64748b); font-style: italic; background: #fff; }
    .toast { background: #fffbeb; border: 1px solid #fde68a; color: #b45309; border-radius: 10px; padding: 10px 14px; margin: 8px 0; box-shadow: var(--shadow); }`;

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
      error: (e) => html`<div class="error" role="alert">error: ${e?.message ?? e}</div>`,
      complete: () => (this.isEmpty()
        ? html`<div class="empty">no items</div>`
        : this.renderContent()),
    });
  }

  // À surcharger : rendu du contenu une fois les données chargées.
  renderContent() {
    return html``;
  }
}
