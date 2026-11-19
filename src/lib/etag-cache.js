// Concurrence ETag weak + cache — spec front §2 : If-Match (PUT/PATCH) obsolète → 412 ;
// If-None-Match (GET) → 304, servir le cache. Invalidation sur événement `save` (§5).

export class EtagCache {
  #entries = new Map(); // url -> { etag, body }

  store(url, etag, body) {
    if (etag) this.#entries.set(url, { etag, body });
  }

  get(url) {
    return this.#entries.get(url);
  }

  // Purge la ressource et son conteneur (mutation via solid-form → événement save, §5).
  purge(url) {
    this.#entries.delete(url);
    const container = url.replace(/[^/]+\/?$/, '');
    this.#entries.delete(container);
  }

  requestHeaders(url, method) {
    const entry = this.#entries.get(url);
    if (!entry) return {};
    return method === 'GET' ? { 'If-None-Match': entry.etag } : { 'If-Match': entry.etag };
  }

  handleResponse(url, status, etag, body) {
    if (status === 304) return { action: 'serve-cache', body: this.#entries.get(url)?.body };
    if (status === 412) return { action: 'conflict-reload' };
    if (status >= 200 && status < 300) {
      this.store(url, etag, body);
      return { action: 'ok', body };
    }
    return { action: 'error', status };
  }
}
