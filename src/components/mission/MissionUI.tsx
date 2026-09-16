import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Battery,
  Cpu,
  Gauge,
  Leaf,
  Pause,
  Play,
  RotateCcw,
  Satellite,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INTERVENTIONS, THREAT_LABEL, type InterventionId } from "@/lib/eco/regions";
import { statusOf, type MissionEvent, type RegionState, type Status } from "@/lib/eco/mission";

/* ------------------------------------------------------------------ atoms */

export function Panel({
  title,
  right,
  className,
  bodyClass,
  children,
}: {
  title: string;
  right?: ReactNode;
  className?: string;
  bodyClass?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("panel flex min-h-0 flex-col", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
        <h2 className="label-mono text-foreground/70">{title}</h2>
        {right}
      </header>
      <div className={cn("min-h-0 flex-1 p-4", bodyClass)}>{children}</div>
    </section>
  );
}

const statusStyles: Record<Status, string> = {
  stable: "text-primary",
  strained: "text-warn",
  critical: "text-crit",
};

const statusDot: Record<Status, string> = {
  stable: "bg-primary",
  strained: "bg-warn",
  critical: "bg-crit",
};

export function Meter({
  value,
  tone = "bio",
  className,
}: {
  value: number;
  tone?: "bio" | "signal" | "warn" | "crit";
  className?: string;
}) {
  const bar = {
    bio: "bg-primary",
    signal: "bg-accent",
    warn: "bg-warn",
    crit: "bg-crit",
  }[tone];
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-surface-2", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", bar)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- header */

export function MissionHeader({
  clock,
  running,
  onToggle,
  onReset,
  health,
}: {
  clock: string;
  running: boolean;
  onToggle: () => void;
  onReset: () => void;
  health: number;
}) {
  const status = statusOf(health);
  return (
    <header className="panel flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="relative flex size-9 items-center justify-center rounded-md bg-surface-2">
          <Leaf className="size-4 text-primary" />
          <span className="absolute inset-0 rounded-md ring-1 ring-primary/30" />
        </span>
        <div>
          <h1 className="font-display text-sm font-bold tracking-[0.22em] text-foreground">
            ECOGRID<span className="text-primary">·</span>AI
          </h1>
          <p className="label-mono mt-0.5">Planetary biosphere command</p>
        </div>
      </div>

      <div className="hidden h-8 w-px bg-border md:block" />

      <div className="flex items-center gap-2">
        <span className={cn("size-1.5 rounded-full animate-eco-pulse", statusDot[status])} />
        <span className="label-mono">Grid status</span>
        <span className={cn("numeric text-xs font-bold uppercase", statusStyles[status])}>
          {running ? status : "paused"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="label-mono">MET</span>
        <span className="numeric text-xs text-foreground/80">{clock}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onToggle}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {running ? "Hold sim" : "Resume"}
        </button>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent"
        >
          <RotateCcw className="size-3.5" />
          Restart
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------- telemetry */

export function StatTile({
  label,
  value,
  unit,
  sub,
  tone = "bio",
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: "bio" | "signal" | "warn" | "crit";
  icon: typeof Leaf;
}) {
  const color = {
    bio: "text-primary",
    signal: "text-accent",
    warn: "text-warn",
    crit: "text-crit",
  }[tone];
  return (
    <div className="rounded-md border border-border/70 bg-surface-2/40 p-3">
      <div className="flex items-center justify-between">
        <span className="label-mono">{label}</span>
        <Icon className={cn("size-3.5", color)} />
      </div>
      <p className="numeric mt-2 text-2xl font-semibold leading-none text-foreground">
        {value}
        {unit && <span className="ml-1 text-xs text-muted-foreground">{unit}</span>}
      </p>
      {sub && <p className="mt-1.5 text-[0.7rem] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Sparkline({
  data,
  tone = "bio",
}: {
  data: { t: number; health: number }[];
  tone?: "bio" | "signal";
}) {
  if (data.length < 2) {
    return <div className="h-16 rounded-md border border-dashed border-border/70" />;
  }
  const w = 240;
  const h = 56;
  const vals = data.map((d) => d.health);
  const min = Math.min(...vals) - 2;
  const max = Math.max(...vals) + 2;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d.health - min) / Math.max(1, max - min)) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const stroke = tone === "bio" ? "var(--bio)" : "var(--signal)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" preserveAspectRatio="none">
      <polyline
        points={`0,${h} ${pts.join(" ")} ${w},${h}`}
        fill={stroke}
        opacity="0.1"
        stroke="none"
      />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ------------------------------------------------------------ region list */

export function RegionList({
  regions,
  selected,
  onSelect,
}: {
  regions: RegionState[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const sorted = [...regions].sort((a, b) => a.health - b.health);
  return (
    <ul className="h-full space-y-1 overflow-y-auto pr-1">
      {sorted.map((r) => {
        const s = statusOf(r.health);
        const active = r.id === selected;
        return (
          <li key={r.id}>
            <button
              onClick={() => onSelect(r.id)}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-left transition-colors",
                active
                  ? "border-accent/50 bg-accent/10"
                  : "border-transparent hover:border-border hover:bg-surface-2/50",
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("size-1.5 shrink-0 rounded-full", statusDot[s])} />
                <span className="truncate text-xs font-medium text-foreground">{r.name}</span>
                <span className={cn("numeric ml-auto text-xs", statusStyles[s])}>
                  {r.health.toFixed(0)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 pl-3.5">
                <Meter
                  value={r.health}
                  tone={s === "stable" ? "bio" : s === "strained" ? "warn" : "crit"}
                />
                {r.mitigation > 0.05 && (
                  <span className="label-mono shrink-0 text-primary">
                    {(r.mitigation * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* --------------------------------------------------------------- dossier */

export function RegionDossier({ region }: { region: RegionState }) {
  const s = statusOf(region.health);
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-mono">{region.code} · {region.biome}</p>
          <h3 className="font-display text-xl font-semibold text-foreground">{region.name}</h3>
        </div>
        <span
          className={cn(
            "numeric rounded-md border px-2 py-1 text-[0.65rem] font-bold uppercase tracking-widest",
            s === "stable" && "border-primary/40 text-primary",
            s === "strained" && "border-warn/40 text-warn",
            s === "critical" && "border-crit/40 text-crit",
          )}
        >
          {s}
        </span>
      </div>

      <p className="text-[0.8rem] leading-relaxed text-muted-foreground">{region.brief}</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { l: "Integrity", v: `${region.health.toFixed(0)}%` },
          { l: "Threat", v: THREAT_LABEL[region.threat] },
          { l: "Carbon at risk", v: `${region.carbonAtRisk} Mt` },
          { l: "People", v: `${region.peopleMillions}M` },
        ].map((x) => (
          <div key={x.l} className="rounded-md bg-surface-2/50 px-2.5 py-2">
            <p className="label-mono">{x.l}</p>
            <p className="numeric mt-1 truncate text-xs text-foreground">{x.v}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label-mono">Active mitigation coverage</span>
          <span className="numeric text-xs text-primary">
            {(region.mitigation * 100).toFixed(0)}%
          </span>
        </div>
        <Meter value={region.mitigation * 100} tone="bio" />
        <p className="mt-2 text-[0.7rem] text-muted-foreground">
          {region.secured.toFixed(1)} Mt CO₂e secured in this region so far.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- command deck */

export function CommandDeck({
  credits,
  maxCredits,
  cooldowns,
  regionThreat,
  onDeploy,
}: {
  credits: number;
  maxCredits: number;
  cooldowns: Record<InterventionId, number>;
  regionThreat: RegionState["threat"];
  onDeploy: (id: InterventionId) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Battery className="size-3.5 text-accent" />
        <span className="label-mono">Grid credits</span>
        <span className="numeric text-xs text-foreground">
          {credits.toFixed(0)}/{maxCredits}
        </span>
        <div className="flex-1">
          <Meter value={(credits / maxCredits) * 100} tone="signal" />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {INTERVENTIONS.map((plan) => {
          const cd = cooldowns[plan.id];
          const matched = plan.counters.includes(regionThreat);
          const affordable = credits >= plan.cost;
          const disabled = cd > 0 || !affordable;
          return (
            <button
              key={plan.id}
              onClick={() => onDeploy(plan.id)}
              disabled={disabled}
              className={cn(
                "group relative overflow-hidden rounded-md border p-3 text-left transition-all",
                matched && !disabled
                  ? "border-primary/50 bg-primary/10 hover:bg-primary/15 glow-bio"
                  : "border-border bg-surface-2/40 hover:border-accent/40",
                disabled && "cursor-not-allowed opacity-45",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{plan.name}</span>
                {matched && (
                  <span className="label-mono text-primary">match</span>
                )}
              </div>
              <p className="mt-1 text-[0.7rem] leading-snug text-muted-foreground">
                {plan.tagline}
              </p>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="numeric text-[0.65rem] text-accent">{plan.cost} cr</span>
                <span className="numeric text-[0.65rem] text-muted-foreground">
                  {cd > 0 ? `cooldown ${cd}s` : "ready"}
                </span>
              </div>
              {cd > 0 && (
                <span
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-accent/70 transition-[width] duration-1000"
                  style={{ width: `${(cd / plan.cooldown) * 100}%` }}
                />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[0.7rem] text-muted-foreground">
        Countermeasures matched to a region's dominant threat deliver roughly 3× the yield. Mismatched
        deploys still burn credits.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- feed */

const feedTone: Record<MissionEvent["level"], string> = {
  info: "text-muted-foreground",
  good: "text-primary",
  warn: "text-warn",
  crit: "text-crit",
};

export function EventFeed({ events }: { events: MissionEvent[] }) {
  return (
    <ul className="h-full space-y-1.5 overflow-y-auto pr-1">
      {events.map((e) => (
        <li key={e.id} className="animate-eco-rise text-[0.72rem] leading-snug">
          <span className="numeric mr-2 text-[0.65rem] text-muted-foreground/70">
            T+{String(e.tick).padStart(3, "0")}
          </span>
          <span className="numeric mr-2 text-[0.65rem] text-accent/80">{e.source}</span>
          <span className={feedTone[e.level]}>{e.text}</span>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------- advisory */

export function Advisory({
  targetName,
  planName,
  reason,
  onJump,
}: {
  targetName: string;
  planName: string;
  reason: string;
  onJump: () => void;
}) {
  return (
    <div className="rounded-md border border-accent/30 bg-accent/5 p-3">
      <div className="flex items-center gap-2">
        <Cpu className="size-3.5 text-accent" />
        <span className="label-mono text-accent">Advisor recommendation</span>
      </div>
      <p className="mt-2 text-[0.78rem] leading-relaxed text-foreground/90">
        Prioritise <span className="font-semibold text-accent">{targetName}</span> with{" "}
        <span className="font-semibold text-primary">{planName}</span>. {reason}
      </p>
      <button
        onClick={onJump}
        className="mt-2.5 inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-accent underline-offset-4 hover:underline"
      >
        <Target className="size-3" />
        Focus this region
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ boot splash */

export function BootSplash() {
  const [done, setDone] = useState(false);
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPct((p) => Math.min(100, p + 7 + Math.random() * 12)), 90);
    const t = setTimeout(() => setDone(true), 1500);
    return () => {
      clearInterval(id);
      clearTimeout(t);
    };
  }, []);
  if (done) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500">
      <div className="flex items-center gap-2">
        <Satellite className="size-4 animate-eco-pulse text-primary" />
        <span className="label-mono text-foreground/80">Linking sentinel constellation</span>
      </div>
      <div className="mt-4 h-0.5 w-56 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full bg-primary transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export const Icons = { Activity, AlertTriangle, Gauge, Leaf, Sparkles, Satellite };
