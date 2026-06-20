import { useQuery } from '@tanstack/react-query';
import { getProductosCliente } from '../api/cliente';

export const productoKeys = {
  all: ['productos'] as const,
  list: (params: object) => ['productos', 'list', params] as const,
};

export function useProductos(
  params: Parameters<typeof getProductosCliente>[0] = {},
  options: { refetchInterval?: number | false } = {},
) {
  return useQuery({
    queryKey: productoKeys.list(params),
    queryFn: () => getProductosCliente(params),
    staleTime: 30_000,
    refetchInterval: options.refetchInterval,
    refetchOnWindowFocus: true,
  });
}
