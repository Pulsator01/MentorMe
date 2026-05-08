/**
 * Legacy accounts may carry role === 'student'. Treat them as founders for
 * all workspace access and navigation decisions.
 */
export function normalizeWorkspaceRole(role) {
  return role === 'student' ? 'founder' : role
}
