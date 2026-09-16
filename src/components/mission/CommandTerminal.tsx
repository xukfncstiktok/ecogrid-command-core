import { useEffect, useRef, useState } from "react";
import { ChevronDown, TerminalSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { INTERVENTIONS, THREAT_LABEL, type InterventionId } from "@/lib/eco/regions";
import { statusOf, type RegionState } from "@/lib/eco/mission";

type Line = { id: number; kind: "in" | "out" | "err" | "ok"; text: string };

const PLAN_ALIASES: Record<string, InterventionId> = {
  swarm: "drone",
  drone: "drone",
  reforest: "drone",
  grid: "grid",
  smartgrid: "grid",
  corridor: "corridor",
  lock: "corridor",
  cloud: "cloud",
  seed: "cloud",
  seeding: "cloud",
};

const HELP = [
  "deploy <swarm|grid|corridor|cloud> <sector_id>   deploy a countermeasure",
  "status --global                                  global integrity readout",
  "status <sector_id>                               single sector readout",
  "override --auto=true|false                       autonomous AI command override",
  "focus <sector_id>                                select a sector",
  "sectors                                          list sector ids",
  "clear                                            wipe terminal + telemetry buffer",
  "help                                             this list",
];

export interface TerminalApi {
  regions: RegionState[];
  health: number;
  auto: boolean;
  credits: number;
  criticals: number;
  deployAt: (plan: InterventionId, regionId: string) => void;
  setAuto: (v: boolean) => void;
  select: (id: string) => void;
  log: (text: string, level?: "info" | "good" | "warn" | "crit", source?: string) => void;
  clearLog: () => void;
}

export function CommandTerminal(api: TerminalApi) {
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { id: 0, kind: "out", text: "EcoGrid shell v2.1 — type `help` for commands." },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [hIndex, setHIndex] = useState(-1);
  const seq = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines, open]);

  const push = (kind: Line["kind"], text: string) =>
    setLines((l) => [...l, { id: seq.current++, kind, text }].slice(-120));

  const findRegion = (token?: string) => {
    if (!token) return undefined;
    const t = token.toLowerCase();
    return api.regions.find(
      (r) => r.id.toLowerCase() === t || r.code.toLowerCase() === t || r.name.toLowerCase() === t,
    );
  };

  const run = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    push("in", cmd);
    setHistory((h) => [cmd, ...h].slice(0, 40));
    setHIndex(-1);
    const parts = cmd.split(/\s+/);
    const head = (parts[0] ?? "").toLowerCase();
    const args = parts.slice(1);

    switch (head) {
      case "help":
        HELP.forEach((h) => push("out", h));
        return;
      case "clear":
        setLines([]);
        api.clearLog();
        return;
      case "sectors":
        api.regions.forEach((r) =>
          push("out", `${r.id.padEnd(10)} ${r.code.padEnd(8)} ${r.name} · ${r.health.toFixed(0)}%`),
        );
        return;
      case "focus": {
        const r = findRegion(args[0]);
        if (!r) return push("err", `unknown sector: ${args[0] ?? "<none>"}`);
        api.select(r.id);
        return push("ok", `focus → ${r.name} (${r.code})`);
      }
      case "override": {
        const flag = args.join(" ").toLowerCase();
        const m = /--auto\s*=\s*(true|false|on|off)/.exec(flag);
        if (!m) return push("err", "usage: override --auto=true|false");
        const on = m[1] === "true" || m[1] === "on";
        api.setAuto(on);
        return push("ok", `auto-ai command override ${on ? "ENGAGED" : "RELEASED"}`);
      }
      case "status": {
        if (args[0] === "--global" || args.length === 0) {
          push("ok", `global integrity ....... ${api.health.toFixed(1)}%  [${statusOf(api.health)}]`);
          push("out", `grid credits ........... ${api.credits.toFixed(0)}`);
          push("out", `critical sectors ....... ${api.criticals}`);
          push("out", `auto-ai override ....... ${api.auto ? "engaged" : "standby"}`);
          api.log(`Global status query — integrity ${api.health.toFixed(1)}%.`, "info", "CLI");
          return;
        }
        const r = findRegion(args[0]);
        if (!r) return push("err", `unknown sector: ${args[0]}`);
        push(
          "ok",
          `${r.code} ${r.name} · integrity ${r.health.toFixed(1)}% · ${THREAT_LABEL[r.threat]} · coverage ${(r.mitigation * 100).toFixed(0)}% · alerts ${r.alerts}`,
        );
        return;
      }
      case "deploy": {
        const planKey = (args[0] ?? "").toLowerCase();
        const planId = PLAN_ALIASES[planKey];
        if (!planId)
          return push("err", `unknown countermeasure: ${args[0] ?? "<none>"} (swarm|grid|corridor|cloud)`);
        const r = findRegion(args[1]);
        if (!r) return push("err", `unknown sector: ${args[1] ?? "<none>"}`);
        const plan = INTERVENTIONS.find((i) => i.id === planId)!;
        if (api.credits < plan.cost)
          return push("err", `insufficient credits: ${plan.cost} required, ${api.credits.toFixed(0)} available`);
        api.deployAt(planId, r.id);
        return push("ok", `${plan.name} → ${r.name} (${r.code}) · −${plan.cost} cr`);
      }
      default:
        push("err", `command not found: ${head} — try \`help\``);
    }
  };

  return (
    <div className="panel overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 border-b border-border/70 px-4 py-2 text-left transition-colors hover:bg-surface-2/50"
      >
        <TerminalSquare className="size-3.5 text-accent" />
        <span className="label-mono text-foreground/70">Command terminal</span>
        <span className="numeric ml-auto text-[0.65rem] text-muted-foreground">
          {api.auto ? "auto-ai engaged" : "manual"}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="p-3" onClick={() => inputRef.current?.focus()}>
          <div className="numeric max-h-44 space-y-0.5 overflow-y-auto pr-1 text-[0.72rem] leading-relaxed">
            {lines.map((l) => (
              <p
                key={l.id}
                className={cn(
                  "whitespace-pre-wrap break-words",
                  l.kind === "in" && "text-accent",
                  l.kind === "out" && "text-muted-foreground",
                  l.kind === "ok" && "text-primary",
                  l.kind === "err" && "text-crit",
                )}
              >
                {l.kind === "in" ? "› " : "  "}
                {l.text}
              </p>
            ))}
            <div ref={endRef} />
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-surface-2/50 px-3 py-2">
            <span className="numeric text-[0.72rem] text-primary">ecogrid@orbit:~$</span>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  run(value);
                  setValue("");
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const i = Math.min(history.length - 1, hIndex + 1);
                  if (i >= 0) {
                    setHIndex(i);
                    setValue(history[i] ?? "");
                  }
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const i = hIndex - 1;
                  setHIndex(i);
                  setValue(i >= 0 ? (history[i] ?? "") : "");
                }
              }}
              spellCheck={false}
              placeholder="deploy swarm amazon"
              aria-label="Command input"
              className="numeric flex-1 bg-transparent text-[0.75rem] text-foreground outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default CommandTerminal;
