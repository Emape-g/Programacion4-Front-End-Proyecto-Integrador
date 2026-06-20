import { useQuery } from '@tanstack/react-query';
import { getPedido, getPedidos } from '../api/cliente';

export const pedidoKeys = {
  all: ['pedidos'] as const,
  list: (page: number, size: number, estado?: string) => ['pedidos', 'list', page, size, estado ?? ''] as const,
  detail: (id: number) => ['pedidos', 'detail', id] as const,
};

export function usePedidos(
  page = 1,
  size = 100,
  estado?: string,
  options: { refetchInterval?: number | false } = {},
) {
  return useQuery({
    queryKey: pedidoKeys.list(page, size, estado),
    queryFn: () => getPedidos(page, size, estado),
    refetchInterval: options.refetchInterval,
    refetchOnWindowFocus: true,
  });
}

export function usePedido(id?: number, refetchInterval?: number | false) {
  return useQuery({
    queryKey: pedidoKeys.detail(id ?? 0),
    queryFn: () => getPedido(id as number),
    enabled: Number.isFinite(id),
    refetchInterval,
  });
}
