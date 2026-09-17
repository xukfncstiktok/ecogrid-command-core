import { createFileRoute } from "@tanstack/react-router";
import { EarthGlobe } from "@/components/globe/EarthGlobe";
import { CommandTerminal } from "@/components/mission/CommandTerminal";
import {
  Advisory,
  BootSplash,
  CommandDeck,
  EventFeed,
  Icons,
  MissionHeader,
  Panel,
  RegionDossier,
  RegionList,
  Sparkline,
  StatTile,
} from "@/components/mission/MissionUI";
import { THREAT_LABEL } from "@/lib/eco/regions";
import { missionClock, statusOf, useMission } from "@/lib/eco/mission";

const title = "EcoGrid AI — Planetary Biosphere Command";
const description =
  "Live mission control for Earth's biosphere: track 12 sentinel regions on a 3D globe and deploy countermeasures against deforestation, drought, reef bleaching and permafrost thaw.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const {
    state,
    selected,
    health,
    trend,
    projection,
    advisory,
    criticals,
    covered,
    select,
    deploy,
    deployAt,
    setAuto,
    log,
    clearLog,
    toggle,
    reset,
  } = useMission();

  const status = statusOf(health);

  return (
    <>
      <BootSplash />
      <main className="grid-lines min-h-screen p-3 lg:p-4">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3">
          <MissionHeader
            clock={missionClock(state.tick)}
            running={state.running}
            onToggle={toggle}
            onReset={reset}
            health={health}
            auto={state.auto}
            onAutoChange={setAuto}
          />

          <div className="grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
            {/* left rail */}
            <div className="flex min-h-0 flex-col gap-3">
              <Panel
                title="Sentinel regions"
                right={
                  <span className="numeric text-[0.65rem] text-muted-foreground">
                    {covered}/{state.regions.length} covered
                  </span>
                }
                className="xl:h-[420px]"
                bodyClass="p-2"
              >
                <RegionList regions={state.regions} selected={state.selected} onSelect={select} />
              </Panel>

              <Panel
                title="Biosphere trend"
                right={
                  <span
                    className={`numeric text-[0.65rem] ${trend > 0.05 ? "text-primary" : "text-crit"}`}
                  >
                    {trend > 0.05 ? "▲ stabilising" : "▼ degrading"} {trend >= 0 ? "+" : ""}
                    {trend.toFixed(2)}/t
                  </span>
                }
              >
                <Sparkline data={state.history} projection={projection} trend={trend} />
                <div className="mt-3 flex items-center justify-between">
                  <span className="label-mono">Global integrity</span>
                  <span
                    className={`numeric text-sm font-semibold ${trend > 0.05 ? "text-primary" : "text-foreground"}`}
                  >
                    {health.toFixed(1)}%
                  </span>
                </div>
              </Panel>
            </div>

            {/* globe */}
            <Panel
              title="Orbital view · sentinel constellation"
              right={
                <span className="label-mono">
                  {criticals > 0 ? `${criticals} critical` : "nominal"}
                </span>
              }
              bodyClass="p-0"
              className="scanline relative overflow-hidden"
            >
              <div className="h-[46vh] min-h-[320px] w-full xl:h-[560px]">
                <EarthGlobe
                  regions={state.regions}
                  selected={state.selected}
                  onSelect={select}
                  strike={state.strike}
                />
              </div>
              <div className="pointer-events-none absolute bottom-3 left-4 flex flex-wrap items-center gap-4">
                {(
                  [
                    ["Stable", "bg-primary"],
                    ["Strained", "bg-warn"],
                    ["Critical", "bg-crit"],
                  ] as const
                ).map(([l, c]) => (
                  <span key={l} className="flex items-center gap-1.5">
                    <span className={`size-1.5 rounded-full ${c}`} />
                    <span className="label-mono">{l}</span>
                  </span>
                ))}
              </div>
            </Panel>

            {/* right rail */}
            <div className="flex min-h-0 flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  label="Integrity"
                  value={health.toFixed(1)}
                  unit="%"
                  sub={`Grid ${status}`}
                  tone={status === "stable" ? "bio" : status === "strained" ? "warn" : "crit"}
                  icon={Icons.Gauge}
                />
                <StatTile
                  label="Carbon secured"
                  value={state.carbonSecured.toFixed(1)}
                  unit="Mt"
                  sub="CO₂e kept in place"
                  tone="bio"
                  icon={Icons.Leaf}
                />
                <StatTile
                  label="Deployments"
                  value={String(state.deployments)}
                  sub={`${state.matched} matched to threat`}
                  tone="signal"
                  icon={Icons.Sparkles}
                />
                <StatTile
                  label="Critical zones"
                  value={String(criticals)}
                  sub={`${covered} under active cover`}
                  tone={criticals ? "crit" : "bio"}
                  icon={Icons.AlertTriangle}
                />
              </div>

              <Advisory
                targetName={advisory.target.name}
                planName={advisory.plan.name}
                reason={`${THREAT_LABEL[advisory.target.threat]} is driving the steepest loss there, with ${advisory.target.carbonAtRisk} Mt CO₂e exposed.`}
                onJump={() => select(advisory.target.id)}
              />

              <Panel
                title="Telemetry feed"
                right={<Icons.Activity className="size-3.5 text-accent" />}
                className="h-[218px]"
                bodyClass="p-3"
              >
                <EventFeed events={state.events} />
              </Panel>
            </div>
          </div>

          {/* bottom: dossier + command deck */}
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <Panel title="Region dossier">
              <RegionDossier region={selected} />
            </Panel>
            <Panel
              title="Command deck"
              right={<Icons.Satellite className="size-3.5 text-primary" />}
            >
              <CommandDeck
                credits={state.credits}
                maxCredits={state.maxCredits}
                cooldowns={state.cooldowns}
                regionThreat={selected.threat}
                onDeploy={deploy}
              />
            </Panel>
          </div>

          <CommandTerminal
            regions={state.regions}
            health={health}
            auto={state.auto}
            credits={state.credits}
            criticals={criticals}
            deployAt={deployAt}
            setAuto={setAuto}
            select={select}
            log={log}
            clearLog={clearLog}
          />

          <footer className="label-mono px-1 pb-2 text-center">
            EcoGrid AI · simulated telemetry · built for planetary response drills
          </footer>
        </div>
      </main>
    </>
  );
}
