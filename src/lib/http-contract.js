// FAP-LDP v1 contract — status codes to handle on the front side (front spec §2 table + §10).
// The server decides (ACL/RLS/DSP contract), the front reacts to the codes.

export const STATUS_ACTIONS = {
  401: 'redirect-login', // purge sibStore cache + OIDC login redirect (§3)
  403: 'forbidden', // hide/disable the action (solid-ac-checker)
  404: 'not-found',
  412: 'conflict-reload', // stale If-Match → reload the resource and re-prompt
  304: 'serve-cache', // If-None-Match → serve the ETag cache
  429: 'backoff', // rate limit (DSP/proxy) → backoff + message
};

export function actionForStatus(status) {
  if (Object.hasOwn(STATUS_ACTIONS, status)) return STATUS_ACTIONS[status];
  if (status >= 200 && status < 300) return 'ok';
  return 'error';
}

// POST container → 201 + Location: /<container>/<pk> (§2)
export function locationFrom201(headers) {
  return headers.get('Location');
}

// Server errors = JSON-LD dspace:Error (same format as the DSP data plane) (§2, §10)
export function parseDspaceError(body) {
  const err = body?.['dspace:Error'] ?? body;
  if (!err || typeof err !== 'object') return { code: 'unknown', messages: [] };
  return {
    code: err.code ?? 'unknown',
    messages: Array.isArray(err.messages) ? err.messages : [String(err.messages ?? '')],
  };
}
