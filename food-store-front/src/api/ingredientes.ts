import apiClient from './axiosClient';

export interface Ingrediente {
  id: number;
  nombre: string;
  descripcion?: string;
  es_alergeno: boolean;
  created_at: string;
  updated_at: string;
}

export interface IngredientesResponse {
  data: Ingrediente[];
  total: number;
}

type IngredientePayload = Omit<Ingrediente, 'id' | 'created_at' | 'updated_at'>;

export async function getIngredientes(offset = 0, limit = 20): Promise<IngredientesResponse> {
  const res = await apiClient.get<IngredientesResponse>('/ingredientes/', {
    params: { offset, limit },
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
