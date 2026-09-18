import { create } from "zustand";
import type { CityId, Gender, OutcomeId } from "./types";
import type { Lang } from "./i18n";

type AtlasState = {
  cityId: CityId;
  outcome: OutcomeId;
  parentPct: number;
  gender: Gender;
  selected: string | null;
  hover: string | null;
  lang: Lang;
  setCity: (id: CityId) => void;
  setOutcome: (o: OutcomeId) => void;
  setParentPct: (n: number) => void;
  setGender: (g: Gender) => void;
  setSelected: (adcode: string | null) => void;
  setHover: (adcode: string | null) => void;
  setLang: (lang: Lang) => void;
};

export const useAtlas = create<AtlasState>((set) => ({
  cityId: "shanghai",
  outcome: "hhIncome",
  parentPct: 25,
  gender: "all",
  selected: null,
  hover: null,
  lang: "zh",
  setCity: (cityId) => set({ cityId, selected: null, hover: null }),
  setOutcome: (outcome) => set({ outcome }),
  setParentPct: (parentPct) => set({ parentPct }),
  setGender: (gender) => set({ gender }),
  setSelected: (selected) => set({ selected }),
  setHover: (hover) => set({ hover }),
  setLang: (lang) => set({ lang }),
}));
