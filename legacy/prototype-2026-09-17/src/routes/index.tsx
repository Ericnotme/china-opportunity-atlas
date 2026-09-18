import { createFileRoute } from "@tanstack/react-router";
import { Chrome } from "@/components/atlas/Chrome";
import { Controls, Legend, MobileControls } from "@/components/atlas/Controls";
import { DistrictPanel, MobileDistrictSheet } from "@/components/atlas/DistrictPanel";
import { MapView } from "@/components/atlas/MapView";
import { COPY } from "@/lib/atlas/i18n";
import { useAtlas } from "@/lib/atlas/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const lang = useAtlas((s) => s.lang);
  const t = COPY[lang];

  return (
    <Chrome>
      <div className="flex h-full min-h-0">
        <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-ink-2 p-4 md:flex">
          <p className="text-xs leading-relaxed text-muted">{t.tagline}</p>
          <Controls />
          <div className="mt-auto space-y-3">
            <Legend />
            <p className="text-[10px] leading-relaxed text-faint">{t.modeled}</p>
          </div>
        </aside>

        <div className="relative min-h-0 min-w-0 flex-1">
          <MapView />
          <div className="absolute inset-x-0 top-0 z-10 border-b border-line bg-ink/92 p-2 backdrop-blur-sm md:hidden">
            <MobileControls />
            <div className="mt-2 px-1">
              <Legend />
            </div>
          </div>
          <MobileDistrictSheet />
        </div>

        <aside className="atlas-desktop-panel">
          <DistrictPanel />
        </aside>
      </div>
    </Chrome>
  );
}
