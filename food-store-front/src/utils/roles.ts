import type { Usuario } from '../types/store';

export type AppRole = 'ADMIN' | 'CLIENT' | 'PEDIDOS' | 'STOCK';

export function hasAnyRole(user: Usuario | null, roles: AppRole[]) {
  if (!user) return false;
  return roles.some((role) => user.roles?.includes(role));
}

export function isAdminUser(user: Usuario | null) {
  return hasAnyRole(user, ['ADMIN']);
}

export function canManagePedidos(user: Usuario | null) {
  return hasAnyRole(user, ['ADMIN', 'PEDIDOS']);
}

export function canManageCatalog(user: Usuario | null) {
  return hasAnyRole(user, ['ADMIN', 'STOCK']);
}

export function isClientUser(user: Usuario | null) {
  return hasAnyRole(user, ['CLIENT']);
}

export function defaultPathForUser(user: Usuario | null) {
  if (isAdminUser(user)) return '/admin';
  if (canManagePedidos(user)) return '/admin/pedidos';
  if (canManageCatalog(user)) return '/productos';
  if (isClientUser(user)) return '/hacer-pedido';
  return '/hacer-pedido';
}
