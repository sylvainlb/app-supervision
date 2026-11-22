// Pure user-admin logic — front spec §7.7.
import { ROLES } from '../../src/lib/transitions.js';

// The entered webid must be a dereferenceable IRI; role ∈ manager|technician|admin.
export function validateUser({ webid, name, email, role } = {}) {
  const errors = [];
  if (!webid || !/^https?:\/\/.+\/.+/.test(webid)) errors.push('webid: dereferenceable IRI required');
  if (!name) errors.push('name required');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('invalid email');
  if (!ROLES.includes(role)) errors.push(`invalid role (${ROLES.join(' | ')})`);
  return errors;
}

// Non-prefixed keys (@vocab of the /users/ container).
export function userPayload({ webid, name, email, role }) {
  return { webid, name, email, role };
}
