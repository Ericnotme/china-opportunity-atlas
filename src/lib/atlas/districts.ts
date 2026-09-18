import raw from "./districts.json";
import type { CityId, District } from "./types";

export const DISTRICTS: District[] = raw as District[];

export const DISTRICT_BY_ADCODE: Record<string, District> = Object.fromEntries(
  DISTRICTS.map((d) => [d.adcode, d]),
);

export function districtsInCity(cityId: CityId): District[] {
  return DISTRICTS.filter((d) => d.cityId === cityId);
}
