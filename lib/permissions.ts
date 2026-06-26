import { User, UserPermissions } from '@/types';

export function hasPermission(user: User | null, permission: keyof UserPermissions): boolean {
  if (!user) return false;
  if (user.role === 'MASTER') return true;
  return Boolean(user.permissions?.[permission]);
}
