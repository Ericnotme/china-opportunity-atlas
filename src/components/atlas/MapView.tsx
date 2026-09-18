import { useEffect, useMemo, useRef } from "react";
import type { Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import { CITY_BY_ID } from "@/lib/atlas/cities";
import { outcomeColor, relativeScale } from "@/lib/atlas/colors";
import { DISTRICTS, districtsInCity } from "@/lib/atlas/districts";
import { formatOutcome } from "@/lib/atlas/format";
import { COPY } from "@/lib/atlas/i18n";
import { modelDistrict, outcomeValue } from "@/lib/atlas/model";
import { useAtlas } from "@/lib/atlas/store";
import type { District } from "@/lib/atlas/types";

type DistrictGeo = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { adcode: string; name: string };
    geometry: { type: string; coordinates: unknown };
  }>;
};

function extendBounds(bounds: { extend: (c: [number, number]) => void }, coords: unknown): void {
  if (!Array.isArray(coords) || coords.length === 0) return;
  if (typeof coords[0] === "number") {
    bounds.extend(coords as [number, number]);
    return;
  }
  for (const c of coords) extendBounds(bounds, c);
}

export function MapView() {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loaded = useRef(false);
  const {
    cityId,
    outcome,
    parentPct,
    gender,
    selected,
    hover,
    lang,
    setHover,
    setSelected,
  } = useAtlas();
  const t = COPY[lang];

  const modeled = useMemo(() => {
    const map = new Map<string, ReturnType<typeof modelDistrict>>();
    for (const d of DISTRICTS) map.set(d.adcode, modelDistrict(d, parentPct, gender));
    return map;
  }, [parentPct, gender]);

  const colorBy = useMemo(() => {
    const scale = relativeScale(
      DISTRICTS.map((d) => outcomeValue(modeled.get(d.adcode)!, outcome)),
    );
    const out: Record<string, string> = {};
    for (const d of DISTRICTS) {
      out[d.adcode] = outcomeColor(scale(outcomeValue(modeled.get(d.adcode)!, outcome)));
    }
    return out;
  }, [modeled, outcome]);

  const colorByRef = useRef(colorBy);
  colorByRef.current = colorBy;
  const setHoverRef = useRef(setHover);
  setHoverRef.current = setHover;
  const setSelectedRef = useRef(setSelected);
  setSelectedRef.current = setSelected;

  useEffect(() => {
    if (!host.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (cancelled || !host.current) return;
      const map = new maplibregl.Map({
        container: host.current,
        style: {
          version: 8,
          sources: {},
          layers: [
            {
              id: "bg",
              type: "background",
              paint: { "background-color": "#111310" },
            },
          ],
        },
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        fadeDuration: 0,
      });
      map.touchZoomRotate.disableRotation();
      mapRef.current = map;

      const pick = (e: MapLayerMouseEvent) => {
        const feats = map.queryRenderedFeatures(e.point, { layers: ["district-fill"] });
        return feats[0]?.properties?.adcode as string | undefined;
      };
      map.on("mousemove", "district-fill", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const ad = pick(e);
        if (ad) setHoverRef.current(ad);
      });
      map.on("mouseleave", "district-fill", () => {
        map.getCanvas().style.cursor = "";
        setHoverRef.current(null);
      });
      map.on("click", "district-fill", (e) => {
        const ad = pick(e);
        if (ad) setSelectedRef.current(ad);
      });
      map.on("load", () => {
        loaded.current = true;
        map.resize();
      });
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      loaded.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const loadCity = async () => {
      const maplibregl = await import("maplibre-gl");
      const res = await fetch(CITY_BY_ID[cityId].geo);
      const geo = (await res.json()) as DistrictGeo;
      if (map.getLayer("district-hi")) map.removeLayer("district-hi");
      if (map.getLayer("district-line")) map.removeLayer("district-line");
      if (map.getLayer("district-fill")) map.removeLayer("district-fill");
      if (map.getSource("districts")) map.removeSource("districts");

      map.addSource("districts", {
        type: "geojson",
        data: geo,
        promoteId: "adcode",
      });
      const match: unknown[] = ["match", ["get", "adcode"]];
      for (const [ad, col] of Object.entries(colorByRef.current)) match.push(ad, col);
      match.push("#5a5048");
      map.addLayer({
        id: "district-fill",
        type: "fill",
        source: "districts",
        paint: { "fill-color": match as never, "fill-opacity": 0.94 },
      });
      map.addLayer({
        id: "district-line",
        type: "line",
        source: "districts",
        paint: { "line-color": "#111310", "line-width": 1.05 },
      });
      map.addLayer({
        id: "district-hi",
        type: "line",
        source: "districts",
        paint: {
          "line-color": "#eeeae2",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "active"], false],
            2.6,
            ["boolean", ["feature-state", "hover"], false],
            1.7,
            0,
          ],
        },
      });

      const bounds = new maplibregl.LngLatBounds();
      for (const f of geo.features) extendBounds(bounds, f.geometry.coordinates);
      const fit = () => {
        map.resize();
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, {
            padding: { top: 28, bottom: 28, left: 28, right: 28 },
            duration: 0,
            maxZoom: 12.8,
            linear: true,
          });
        }
      };
      fit();
      map.once("idle", fit);
    };

    if (loaded.current && map.isStyleLoaded()) {
      void loadCity();
    } else {
      map.once("load", () => void loadCity());
    }
  }, [cityId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("district-fill")) return;
    const match: unknown[] = ["match", ["get", "adcode"]];
    for (const [ad, col] of Object.entries(colorBy)) match.push(ad, col);
    match.push("#5a5048");
    map.setPaintProperty("district-fill", "fill-color", match as never);
  }, [colorBy]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource("districts")) return;
    for (const d of districtsInCity(cityId)) {
      try {
        map.setFeatureState(
          { source: "districts", id: d.adcode },
          { hover: hover === d.adcode, active: selected === d.adcode },
        );
      } catch {
        /* source may have swapped */
      }
    }
  }, [hover, selected, cityId]);

  const tipDistrict: District | undefined = hover
    ? DISTRICTS.find((d) => d.adcode === hover)
    : undefined;
  const tipModel = tipDistrict ? modeled.get(tipDistrict.adcode) : undefined;

  return (
    <div className="relative h-full min-h-0 w-full">
      <div ref={host} className="h-full w-full" />
      {tipDistrict && tipModel && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-line bg-ink-2/92 px-3 py-2 text-xs shadow-lg backdrop-blur-sm md:left-auto md:right-3">
          <div className="font-display text-sm text-paper">
            {lang === "zh" ? tipDistrict.nameZh : tipDistrict.nameEn}
          </div>
          <div className="mt-0.5 tabular-nums text-paper-2">
            {formatOutcome(outcomeValue(tipModel, outcome), outcome, cityId)}
          </div>
          <div className="text-[11px] text-muted">{t.outcomes[outcome]}</div>
        </div>
      )}
    </div>
  );
}
