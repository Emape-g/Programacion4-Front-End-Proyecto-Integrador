const STORAGE_KEY = 'foodstore_ingredient_units';

export interface IngredientUnitPreference {
  unidad_medida_id: number;
  unidad_simbolo: string;
  precio_unitario?: number;
}

type UnitMap = Record<string, IngredientUnitPreference>;

function readMap(): UnitMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as UnitMap;
  } catch {
    return {};
  }
}

function writeMap(map: UnitMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getIngredientUnitPreference(ingredientId: number | string) {
  return readMap()[String(ingredientId)] ?? null;
}

export function saveIngredientUnitPreference(
  ingredientId: number | string,
  preference: IngredientUnitPreference,
) {
  const map = readMap();
  map[String(ingredientId)] = preference;
  writeMap(map);
}

export function removeIngredientUnitPreference(ingredientId: number | string) {
  const map = readMap();
  delete map[String(ingredientId)];
  writeMap(map);
}
