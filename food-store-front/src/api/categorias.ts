import apiClient from './axiosClient';

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string | null;
  padre_id?: number | null;
  imagen_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoriasResponse {
  data: Categoria[];
  total: number;
}

export interface CategoriaPayload {
  nombre: string;
  descripcion?: string | null;
  padre_id?: number | null;
  imagen_url?: string | null;
}

export interface CategoriasFiltros {
  offset?: number;
  limit?: number;
  nombre?: string;
  orden?: 'asc' | 'desc';
}

export async function getCategorias(filtros: CategoriasFiltros = {}): Promise<CategoriasResponse> {
  const { offset = 0, limit = 20, nombre, orden = 'desc' } = filtros;
  const res = await apiClient.get<CategoriasResponse>('/categorias/', {
    params: { offset, limit, ...(nombre ? { nombre } : {}), orden },
  });
  return res.data;
}

export async function getCategoria(id: number): Promise<Categoria> {
  const res = await apiClient.get<Categoria>(`/categorias/${id}`);
  return res.data;
}

export async function createCategoria(data: CategoriaPayload): Promise<Categoria> {
  const res = await apiClient.post<Categoria>('/categorias/', data);
  return res.data;
}

export async function updateCategoria(id: number, data: Partial<CategoriaPayload>): Promise<Categoria> {
  const res = await apiClient.patch<Categoria>(`/categorias/${id}`, data);
  return res.data;
}

export async function deleteCategoria(id: number): Promise<void> {
  await apiClient.delete(`/categorias/${id}`);
}
