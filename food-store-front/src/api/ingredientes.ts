import apiClient from './axiosClient';

export interface Ingrediente {
  id: number;
  nombre: string;
  descripcion?: string;
  stock_cantidad: number;
  es_alergeno: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IngredientesResponse {
  data: Ingrediente[];
  total: number;
}

export interface IngredientePayload {
  nombre: string;
  descripcion?: string;
  stock_cantidad: number;
  es_alergeno: boolean;
}

export interface IngredientesFiltros {
  offset?: number;
  limit?: number;
  nombre?: string;
  orden?: 'asc' | 'desc';
}

export async function getIngredientes(filtros: IngredientesFiltros = {}): Promise<IngredientesResponse> {
  const { offset = 0, limit = 20, nombre, orden = 'desc' } = filtros;
  const res = await apiClient.get<IngredientesResponse>('/ingredientes/', {
    params: { offset, limit, ...(nombre ? { nombre } : {}), orden },
  });
  return res.data;
}

export async function createIngrediente(data: IngredientePayload): Promise<Ingrediente> {
  const res = await apiClient.post<Ingrediente>('/ingredientes/', data);
  return res.data;
}

export async function updateIngrediente(id: number, data: Partial<IngredientePayload>): Promise<Ingrediente> {
  const res = await apiClient.patch<Ingrediente>(`/ingredientes/${id}`, data);
  return res.data;
}

export async function deleteIngrediente(id: number): Promise<void> {
  await apiClient.delete(`/ingredientes/${id}`);
}

export async function activarIngrediente(id: number): Promise<Ingrediente> {
  const res = await apiClient.patch<Ingrediente>(`/ingredientes/${id}/activar`);
  return res.data;
}
