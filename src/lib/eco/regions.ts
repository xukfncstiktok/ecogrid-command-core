export type ThreatType = "deforestation" | "emissions" | "drought" | "reefBleaching" | "permafrost";

export type InterventionId =
  | "drone"
  | "grid"
  | "corridor"
  | "cloud"
  | "firebreak"
  | "biochar"
  | "mangrove"
  | "rewild"
  | "solar"
  | "wind"
  | "methane"
  | "storage"
  | "aquifer"
  | "desal"
  | "wetland"
  | "irrigation"
  | "shade"
  | "nursery"
  | "kelp"
  | "alkalinity"
  | "reflector"
  | "thermosyphon"
  | "capture"
  | "satellite";

export interface RegionSeed {
  id: string;
  name: string;
  code: string;
  lat: number;
  lon: number;
  biome: string;
  threat: ThreatType;
  /** Starting biosphere integrity, 0-100 */
  health: number;
  /** Baseline degradation per tick before mitigation */
  pressure: number;
  /** Megatonnes CO2e per year at risk */
  carbonAtRisk: number;
  peopleMillions: number;
  brief: string;
}

export const THREAT_LABEL: Record<ThreatType, string> = {
  deforestation: "Deforestation",
  emissions: "Industrial emissions",
  drought: "Hydrological drought",
  reefBleaching: "Reef bleaching",
  permafrost: "Permafrost thaw",
};

export interface Intervention {
  id: InterventionId;
  name: string;
  tagline: string;
  /** Threats this intervention is designed for — matched deploys are far stronger */
  counters: ThreatType[];
  cost: number;
  cooldown: number;
  power: number;
}

export const INTERVENTIONS: Intervention[] = [
  {
    id: "drone",
    name: "Reforest Swarm",
    tagline: "Seed-pod drones replant degraded canopy",
    counters: ["deforestation", "permafrost"],
    cost: 24,
    cooldown: 9,
    power: 14,
  },
  {
    id: "grid",
    name: "Smart Grid Shift",
    tagline: "Reroute load to renewables, curb flaring",
    counters: ["emissions"],
    cost: 30,
    cooldown: 11,
    power: 16,
  },
  {
    id: "corridor",
    name: "Corridor Lock",
    tagline: "Satellite-enforced protection perimeter",
    counters: ["reefBleaching", "deforestation"],
    cost: 20,
    cooldown: 8,
    power: 12,
  },
  {
    id: "cloud",
    name: "Cloud Seeding",
    tagline: "Aerosol seeding restores rainfall cycles",
    counters: ["drought", "reefBleaching"],
    cost: 26,
    cooldown: 10,
    power: 13,
  },
  {
    id: "firebreak",
    name: "Firebreak Mesh",
    tagline: "Autonomous cutters isolate advancing fire fronts",
    counters: ["deforestation", "drought"],
    cost: 18,
    cooldown: 7,
    power: 11,
  },
  {
    id: "biochar",
    name: "Biochar Kilns",
    tagline: "Lock waste biomass into stable soil carbon",
    counters: ["deforestation", "emissions"],
    cost: 22,
    cooldown: 8,
    power: 12,
  },
  {
    id: "mangrove",
    name: "Mangrove Shield",
    tagline: "Restore living coastal storm barriers",
    counters: ["reefBleaching", "deforestation"],
    cost: 21,
    cooldown: 8,
    power: 13,
  },
  {
    id: "rewild",
    name: "Rewilding Convoy",
    tagline: "Reconnect habitat and restore keystone species",
    counters: ["deforestation", "drought"],
    cost: 25,
    cooldown: 10,
    power: 15,
  },
  {
    id: "solar",
    name: "Solar Bloom",
    tagline: "Deploy modular photovoltaic fields",
    counters: ["emissions"],
    cost: 23,
    cooldown: 8,
    power: 14,
  },
  {
    id: "wind",
    name: "Wind Array",
    tagline: "Raise high-output distributed turbines",
    counters: ["emissions"],
    cost: 24,
    cooldown: 9,
    power: 15,
  },
  {
    id: "methane",
    name: "Methane Seal",
    tagline: "Locate and cap high-volume fugitive plumes",
    counters: ["emissions", "permafrost"],
    cost: 19,
    cooldown: 7,
    power: 12,
  },
  {
    id: "storage",
    name: "Storage Pulse",
    tagline: "Buffer renewable power across peak demand",
    counters: ["emissions"],
    cost: 28,
    cooldown: 10,
    power: 16,
  },
  {
    id: "aquifer",
    name: "Aquifer Recharge",
    tagline: "Route seasonal flow into depleted groundwater",
    counters: ["drought"],
    cost: 22,
    cooldown: 8,
    power: 14,
  },
  {
    id: "desal",
    name: "Solar Desal",
    tagline: "Produce freshwater with zero-carbon heat",
    counters: ["drought"],
    cost: 29,
    cooldown: 11,
    power: 17,
  },
  {
    id: "wetland",
    name: "Wetland Restore",
    tagline: "Rebuild natural water retention basins",
    counters: ["drought", "deforestation"],
    cost: 20,
    cooldown: 8,
    power: 13,
  },
  {
    id: "irrigation",
    name: "Precision Irrigation",
    tagline: "Target roots with sensor-guided water delivery",
    counters: ["drought"],
    cost: 17,
    cooldown: 6,
    power: 10,
  },
  {
    id: "shade",
    name: "Reef Shade Fleet",
    tagline: "Surface canopies reduce peak thermal stress",
    counters: ["reefBleaching"],
    cost: 24,
    cooldown: 9,
    power: 15,
  },
  {
    id: "nursery",
    name: "Coral Nursery",
    tagline: "Seed heat-tolerant coral colonies at scale",
    counters: ["reefBleaching"],
    cost: 26,
    cooldown: 10,
    power: 16,
  },
  {
    id: "kelp",
    name: "Kelp Forest",
    tagline: "Anchor marine habitat and coastal carbon sinks",
    counters: ["reefBleaching", "emissions"],
    cost: 18,
    cooldown: 7,
    power: 12,
  },
  {
    id: "alkalinity",
    name: "Ocean Buffer",
    tagline: "Restore local carbonate chemistry balance",
    counters: ["reefBleaching", "emissions"],
    cost: 30,
    cooldown: 12,
    power: 18,
  },
  {
    id: "reflector",
    name: "Albedo Mesh",
    tagline: "Increase surface reflectivity over thaw zones",
    counters: ["permafrost"],
    cost: 21,
    cooldown: 8,
    power: 13,
  },
  {
    id: "thermosyphon",
    name: "Thermosyphon Field",
    tagline: "Draw heat from vulnerable frozen ground",
    counters: ["permafrost"],
    cost: 27,
    cooldown: 10,
    power: 17,
  },
  {
    id: "capture",
    name: "Carbon Capture Hub",
    tagline: "Mineralize concentrated industrial carbon",
    counters: ["emissions", "permafrost"],
    cost: 32,
    cooldown: 12,
    power: 19,
  },
  {
    id: "satellite",
    name: "Sentinel Uplink",
    tagline: "Retask orbital sensors for precision response",
    counters: ["deforestation", "emissions", "drought", "reefBleaching", "permafrost"],
    cost: 16,
    cooldown: 6,
    power: 9,
  },
];

export const REGION_SEEDS: RegionSeed[] = [
  {
    id: "amazon",
    name: "Amazon Basin",
    code: "AMZ-01",
    lat: -3.4,
    lon: -62.2,
    biome: "Tropical rainforest",
    threat: "deforestation",
    health: 61,
    pressure: 0.85,
    carbonAtRisk: 76,
    peopleMillions: 34,
    brief:
      "Illegal logging fronts are advancing along the BR-319 corridor. Canopy loss is compounding into a self-drying feedback loop.",
  },
  {
    id: "congo",
    name: "Congo Basin",
    code: "CGO-04",
    lat: -0.8,
    lon: 22.6,
    biome: "Tropical rainforest",
    threat: "deforestation",
    health: 72,
    pressure: 0.6,
    carbonAtRisk: 58,
    peopleMillions: 27,
    brief:
      "Peatland margins are drying at the forest edge. Every hectare lost releases centuries of stored carbon.",
  },
  {
    id: "borneo",
    name: "Borneo Peatlands",
    code: "BRN-09",
    lat: 0.5,
    lon: 114.0,
    biome: "Peat swamp forest",
    threat: "deforestation",
    health: 54,
    pressure: 0.95,
    carbonAtRisk: 49,
    peopleMillions: 21,
    brief: "Drainage canals have lowered the water table. Fire risk index is at seasonal maximum.",
  },
  {
    id: "reef",
    name: "Great Barrier Reef",
    code: "GBR-02",
    lat: -18.3,
    lon: 147.7,
    biome: "Coral reef",
    threat: "reefBleaching",
    health: 48,
    pressure: 1.05,
    carbonAtRisk: 18,
    peopleMillions: 6,
    brief:
      "Sea surface anomaly of +1.8 °C sustained for 21 days. Thermal stress is past the bleaching threshold.",
  },
  {
    id: "sahel",
    name: "Sahel Belt",
    code: "SHL-07",
    lat: 14.5,
    lon: 5.4,
    biome: "Semi-arid savanna",
    threat: "drought",
    health: 43,
    pressure: 1.1,
    carbonAtRisk: 22,
    peopleMillions: 89,
    brief:
      "Three failed rainy seasons. Aquifer recharge has stalled and the Great Green Wall front is losing ground.",
  },
  {
    id: "indus",
    name: "Indus Valley",
    code: "IND-05",
    lat: 27.8,
    lon: 70.4,
    biome: "Irrigated floodplain",
    threat: "drought",
    health: 57,
    pressure: 0.8,
    carbonAtRisk: 31,
    peopleMillions: 124,
    brief:
      "Glacier-fed flow is down 22% year on year while irrigation demand climbs through the dry season.",
  },
  {
    id: "ruhr",
    name: "Ruhr Industrial Belt",
    code: "RUH-11",
    lat: 51.5,
    lon: 7.2,
    biome: "Urban industrial",
    threat: "emissions",
    health: 64,
    pressure: 0.75,
    carbonAtRisk: 64,
    peopleMillions: 12,
    brief:
      "Peak-load generation is falling back to fossil baseload every evening. Methane flaring detected at four nodes.",
  },
  {
    id: "yangtze",
    name: "Yangtze Delta",
    code: "YZD-03",
    lat: 31.2,
    lon: 121.5,
    biome: "Megacity delta",
    threat: "emissions",
    health: 59,
    pressure: 0.9,
    carbonAtRisk: 88,
    peopleMillions: 156,
    brief:
      "Industrial cluster emissions exceed the regional cap. Coastal subsidence amplifies every degree of warming.",
  },
  {
    id: "siberia",
    name: "Siberian Permafrost",
    code: "SIB-08",
    lat: 66.4,
    lon: 112.6,
    biome: "Boreal permafrost",
    threat: "permafrost",
    health: 51,
    pressure: 1.0,
    carbonAtRisk: 102,
    peopleMillions: 3,
    brief:
      "Active layer depth up 40 cm. Thaw slumps are venting methane faster than the models predicted.",
  },
  {
    id: "alaska",
    name: "Alaskan Tundra",
    code: "ALK-06",
    lat: 67.5,
    lon: -153.0,
    biome: "Arctic tundra",
    threat: "permafrost",
    health: 66,
    pressure: 0.7,
    carbonAtRisk: 47,
    peopleMillions: 1,
    brief: "Shrub encroachment is lowering albedo, accelerating local warming above the Arctic mean.",
  },
  {
    id: "californ",
    name: "California Sierra",
    code: "CAS-12",
    lat: 38.5,
    lon: -120.2,
    biome: "Montane conifer",
    threat: "drought",
    health: 55,
    pressure: 0.88,
    carbonAtRisk: 29,
    peopleMillions: 18,
    brief: "Snowpack at 38% of median. Fuel moisture is critically low across the western slope.",
  },
  {
    id: "coral-tri",
    name: "Coral Triangle",
    code: "CTR-10",
    lat: -2.0,
    lon: 128.0,
    biome: "Marine biodiversity core",
    threat: "reefBleaching",
    health: 62,
    pressure: 0.78,
    carbonAtRisk: 24,
    peopleMillions: 41,
    brief:
      "The most biodiverse marine system on Earth is recording its fourth consecutive warm-water anomaly.",
  },
];
