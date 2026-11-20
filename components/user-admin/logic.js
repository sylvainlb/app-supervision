// Logique pure user-admin — spec front §7.7.
import { ROLES } from '../../src/lib/transitions.js';

// Le webid saisi doit être une IRI déréférençable ; rôle ∈ gestionnaire|technicien|admin.
export function validateUser({ webid, name, email, role } = {}) {
  const errors = [];
  if (!webid || !/^https?:\/\/.+\/.+/.test(webid)) errors.push('webid : IRI déréférençable requise');
  if (!name) errors.push('name requis');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('email invalide');
  if (!ROLES.includes(role)) errors.push(`rôle invalide (${ROLES.join(' | ')})`);
  return errors;
}

// Clés non préfixées (@vocab du conteneur /users/).
export function userPayload({ webid, name, email, role }) {
  return { webid, name, email, role };
}
