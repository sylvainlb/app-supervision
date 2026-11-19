// Contrat FAP-LDP v1 — codes à gérer côté front (spec front §2 tableau + §10).
// Le serveur décide (ACL/RLS/contrat DSP), le front réagit aux codes.

export const STATUS_ACTIONS = {
  401: 'redirect-login', // purge cache sibStore + redirect login OIDC (§3)
  403: 'forbidden', // masquer/désactiver l'action (solid-ac-checker)
  404: 'not-found',
  412: 'conflict-reload', // If-Match obsolète → recharger la ressource et reproposer
  304: 'serve-cache', // If-None-Match → servir le cache ETag
  429: 'backoff', // rate limit (DSP/proxy) → backoff + message
};

export function actionForStatus(status) {
  if (Object.hasOwn(STATUS_ACTIONS, status)) return STATUS_ACTIONS[status];
  if (status >= 200 && status < 300) return 'ok';
  return 'error';
}

// POST conteneur → 201 + Location: /<container>/<pk> (§2)
export function locationFrom201(headers) {
  return headers.get('Location');
}

// Erreurs serveur = JSON-LD dspace:Error (même format que le data plane DSP) (§2, §10)
export function parseDspaceError(body) {
  const err = body?.['dspace:Error'] ?? body;
  if (!err || typeof err !== 'object') return { code: 'unknown', messages: [] };
  return {
    code: err.code ?? 'unknown',
    messages: Array.isArray(err.messages) ? err.messages : [String(err.messages ?? '')],
  };
}
