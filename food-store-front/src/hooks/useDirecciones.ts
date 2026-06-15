import { useQuery } from '@tanstack/react-query';
import { getMisDirecciones } from '../api/cliente';

export function useDirecciones(enabled = true) {
  return useQuery({
    queryKey: ['mis-direcciones'],
    queryFn: getMisDirecciones,
    enabled,
  });
}
