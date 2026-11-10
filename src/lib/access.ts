export const ROLES = ['ADMIN', 'MANAGER', 'EDITOR', 'PUBLISHER'] as const;
export type Role = typeof ROLES[number];
export interface AccessUser {
  id: string;
  role: string;
  siteIds: string[];
}
export const isKnownRole = (role: string): role is Role => ROLES.some(value => value === role);
export const canManageSite = (role: string) => role === 'ADMIN' || role === 'MANAGER';
export const canPublish = (role: string) => canManageSite(role) || role === 'PUBLISHER';
export const canAccessSite = (user: AccessUser, siteId: string) =>
  isKnownRole(user.role) && (user.role === 'ADMIN' || user.siteIds.includes(siteId));
export const canEditContent = (role: string, status: string) =>
  status !== 'IN_REVIEW' && (canPublish(role) || (role === 'EDITOR' && status === 'DRAFT'));
