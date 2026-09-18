import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Chrome } from "@/components/atlas/Chrome";
import { Controls } from "@/components/atlas/Controls";
import { CITIES, CITY_BY_ID } from "@/lib/atlas/cities";
import { DISTRICTS } from "@/lib/atlas/districts";
import { formatOutcome } from "@/lib/atlas/format";
import { COPY } from "@/lib/atlas/i18n";
import { modelDistrict, neighborhoodQuality, outcomeValue } from "@/lib/atlas/model";
import { useAtlas } from "@/lib/atlas/store";
import type { CityId } from "@/lib/atlas/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rankings")({ component: RankingsPage });

function RankingsPage() {
  const { parentPct, gender, outcome, lang, setCity, setSelected } = useAtlas();
  const t = COPY[lang];
  const [filter, setFilter] = useState<CityId | "all">("all");
  const navigate = useNavigate();

  const rows = useMemo(() => {
    const list = DISTRICTS.filter((d) => filter === "all" || d.cityId === filter).map((d) => {
      const m = modelDistrict(d, parentPct, gender);
      return { d, m, q: neighborhoodQuality(d), v: outcomeValue(m, outcome) };
    });
    list.sort((a, b) => b.v - a.v);
    return list;
  }, [filter, parentPct, gender, outcome]);

  return (
    <Chrome>
      <div className="flex h-full min-h-0 flex-col md:flex-row">
        <aside className="shrink-0 border-b border-line bg-ink-2 p-4 md:h-full md:w-72 md:overflow-y-auto md:border-b-0 md:border-r">
          <h1 className="font-display text-xl text-paper">{t.ranksTitle}</h1>
          <p className="mt-1 mb-4 text-xs text-muted">{t.tagline}</p>
          <Controls compact />
        </aside>
        <div className="min-h-0 flex-1 overflow-auto p-3 md:p-5">
          <div className="mb-3 flex flex-wrap gap-1">
            <Chip active={filter === "all"} onClick={() => setFilter("all")}>
              {lang === "zh" ? "全部" : "All"}
            </Chip>
            {CITIES.map((c) => (
              <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
                {lang === "zh" ? c.nameZh : c.nameEn}
              </Chip>
            ))}
            <a
              href="/data/districts.csv"
              className="ml-auto rounded-sm border border-line px-2 py-1.5 text-xs text-paper-2 hover:bg-paper/8"
            >
              {t.download}
            </a>
          </div>
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-ink text-[11px] tracking-wide text-muted uppercase">
              <tr>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">{lang === "zh" ? "区" : "District"}</th>
                <th className="px-2 py-2">{lang === "zh" ? "城市" : "City"}</th>
                <th className="px-2 py-2">{t.outcomes[outcome]}</th>
                <th className="px-2 py-2">{t.quality}</th>
                <th className="px-2 py-2">{t.source}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const city = CITY_BY_ID[row.d.cityId];
                return (
                  <tr
                    key={row.d.adcode}
                    className="cursor-pointer border-t border-line hover:bg-paper/5"
                    onClick={() => {
                      setCity(row.d.cityId);
                      setSelected(row.d.adcode);
                      void navigate({ to: "/" });
                    }}
                  >
                    <td className="px-2 py-2 tabular-nums text-muted">{i + 1}</td>
                    <td className="px-2 py-2 text-paper">
                      {lang === "zh" ? row.d.nameZh : row.d.nameEn}
                    </td>
                    <td className="px-2 py-2 text-muted">
                      {lang === "zh" ? city.nameZh : city.nameEn}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {formatOutcome(row.v, outcome, row.d.cityId)}
                    </td>
                    <td className="px-2 py-2 tabular-nums">{Math.round(row.q * 100)}</td>
                    <td className="px-2 py-2 text-xs text-muted">{t.sources[row.d.source]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Chrome>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-sm px-2.5 py-1.5 text-xs",
        active ? "bg-paper text-ink" : "bg-paper/6 text-paper-2 hover:bg-paper/10",
      )}
    >
      {children}
    </button>
  );
}
