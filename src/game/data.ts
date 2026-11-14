import { getLang, translateWavelength } from "./i18n";

export function formatUsd(millions: number): string {
  const val = Number(millions) || 0;
  if (val >= 1000) {
    return `$${(val / 1000).toFixed(2).replace(/\.?0+$/, "")}B`;
  }
  const rounded = val >= 100 ? Math.round(val) : Number(val.toFixed(1));
  return `$${rounded}M`;
}

export function formatUsdDelta(deltaMillions: number): string {
  const sign = deltaMillions >= 0 ? "+" : "-";
  return `${sign}${formatUsd(Math.abs(deltaMillions))}`;
}

export interface LaunchVehicle {
  id: string;
  name: string;
  cost: number;
  payload_max_kg: number;
  reliability: number;
  isp_s?: number;
  desc: string;
}

export interface SpaceBus {
  id: string;
  name: string;
  dry_mass_kg: number;
  power_gen_w: number;
  cost: number;
  radTier?: number;
  desc: string;
}

export interface SpaceInstrument {
  id: string;
  name: string;
  mass_kg: number;
  power_w: number;
  cost: number;
  science_pts: number;
  wavelength: string;
  desc: string;
}

export interface MissionCML {
  id: string;
  cml: string;
  title: string;
  budget_max: number;
  target_science: number;
  required_wavelength: string;
  real_nasa_equivalent: string;
  minigame: string;
  briefing: string;
}

export interface GroundStation {
  id: string;
  name: string;
  band: string;
  cost: number;
  desc: string;
}

export interface PlayerSkin {
  id: string;
  name: string;
  subtitle: string;
  desc: string;
  price: number;
  tierLabel: string;
  mode: string;
  translucentFace: boolean;
  helmet: string;
  helmetHi: string;
  helmetShade: string;
  collar: string;
  skin: string;
  skinShade: string;
  torso: string;
  torsoHi: string;
  torsoShade: string;
  shirt: string;
  accent: string;
  accent2: string;
  pants: string;
  pantsShade: string;
  boots: string;
  badge: string;
  pack: string;
  packShade: string;
  packLed: string;
  visorDeep: string;
  visorMid: string;
  visor: string;
  visorGlint: string;
}

export interface MissionRecord {
  callsign: string;
  mission: string;
  cost: number;
  score: number;
  date: string;
}

export interface SegmentConfig {
  missionId: string;
  vehicleId: string;
  busId: string;
  instrumentIds: string[];
  groundId: string;
}

export type GravityRegime = "earth" | "upper_atm" | "lunar" | "micro";

export interface FlightPhysicsConfig {
  regime: GravityRegime;
  gravityG: number;
  atmDensity: number;
  dragCoeff: number;
  throttlePct: number;
  calibratedForMission?: string;
}

export const GRAVITY_PRESETS: Record<GravityRegime, Omit<FlightPhysicsConfig, "throttlePct" | "calibratedForMission">> = {
  earth: { regime: "earth", gravityG: 1.0, atmDensity: 1.0, dragCoeff: 0.45 },
  upper_atm: { regime: "upper_atm", gravityG: 0.85, atmDensity: 0.25, dragCoeff: 0.30 },
  lunar: { regime: "lunar", gravityG: 0.165, atmDensity: 0.02, dragCoeff: 0.18 },
  micro: { regime: "micro", gravityG: 0.05, atmDensity: 0.0, dragCoeff: 0.15 }
};

export interface MissionNasaPhysicsProfile {
  targetG: number;
  tolG: number;
  targetAtm: number;
  tolAtm: number;
  targetDrag: number;
  tolDrag: number;
  minTwr: number;
  maxQKpaLimit: number;
  initG: number;
  initAtm: number;
  initDrag: number;
  initThrottle: number;
  envPt: string;
  envEn: string;
  notePt: string;
  noteEn: string;
}

export const MISSION_NASA_PHYSICS: Record<string, MissionNasaPhysicsProfile> = {
  m1_cml1: {
    targetG: 1.0, tolG: 0.12, targetAtm: 1.0, tolAtm: 0.18, targetDrag: 0.45, tolDrag: 0.16,
    minTwr: 1.15, maxQKpaLimit: 42,
    initG: 1.55, initAtm: 1.4, initDrag: 0.9, initThrottle: 80,
    envPt: "Órbita Terrestre Baixa (LEO · 9.81 m/s² · 1.0 ATM)",
    envEn: "Low Earth Orbit (LEO · 9.81 m/s² · 1.0 ATM)",
    notePt: "Norma NASA LEO: gravidade 1.00G e densidade 1.00 ATM com carenagem aerodinâmica (Cd ≤ 0.55).",
    noteEn: "NASA LEO Spec: 1.00G surface gravity, 1.00 ATM air density, streamlined fairing (Cd ≤ 0.55)."
  },
  m2_cml2: {
    targetG: 0.165, tolG: 0.09, targetAtm: 0.0, tolAtm: 0.12, targetDrag: 0.2, tolDrag: 0.16,
    minTwr: 1.12, maxQKpaLimit: 12,
    initG: 1.05, initAtm: 1.0, initDrag: 0.75, initThrottle: 95,
    envPt: "Órbita Lunar (Selênica · 1.62 m/s² · Vácuo)",
    envEn: "Lunar Orbit (Selenic · 1.62 m/s² · Vacuum)",
    notePt: "Dados LRO NASA: Lua possui 0.165G (1.62 m/s²) e exosfera praticamente nula (0.00 ATM).",
    noteEn: "NASA LRO Data: Moon has 0.165G (1.62 m/s²) and near-zero exosphere (0.00 ATM)."
  },
  m3_cml3: {
    targetG: 0.05, tolG: 0.08, targetAtm: 0.0, tolAtm: 0.1, targetDrag: 0.15, tolDrag: 0.15,
    minTwr: 1.1, maxQKpaLimit: 8,
    initG: 0.95, initAtm: 0.8, initDrag: 0.7, initThrottle: 90,
    envPt: "Ponto Lagrange L1 (Micro-G · Vácuo Profundo)",
    envEn: "Lagrange Point L1 (Micro-G · Deep Vacuum)",
    notePt: "Norma SOHO/L1: equilíbrio gravitacional de microgravidade (~0.05G) e vácuo total (0.00 ATM).",
    noteEn: "SOHO/L1 Spec: Microgravity equilibrium (~0.05G) and zero-drag deep vacuum (0.00 ATM)."
  },
  m4_cml4: {
    targetG: 0.05, tolG: 0.08, targetAtm: 0.0, tolAtm: 0.1, targetDrag: 0.2, tolDrag: 0.15,
    minTwr: 1.12, maxQKpaLimit: 10,
    initG: 1.25, initAtm: 1.1, initDrag: 0.85, initThrottle: 85,
    envPt: "Órbita Halo L2 (JWST · Micro-G · Criogênico)",
    envEn: "L2 Halo Orbit (JWST · Micro-G · Cryogenic)",
    notePt: "Norma JWST L2: microgravidade orbital (0.05G) sem atmosfera (0.00 ATM) para manter 40 K.",
    noteEn: "JWST L2 Spec: Orbital microgravity (0.05G) and vacuum (0.00 ATM) to protect optics at 40 K."
  },
  m5_mars: {
    targetG: 0.38, tolG: 0.1, targetAtm: 0.05, tolAtm: 0.12, targetDrag: 0.35, tolDrag: 0.16,
    minTwr: 1.15, maxQKpaLimit: 18,
    initG: 1.15, initAtm: 0.95, initDrag: 0.8, initThrottle: 85,
    envPt: "Atmosfera Marciana (3.72 m/s² · CO₂ Rarefeito)",
    envEn: "Martian Atmosphere (3.72 m/s² · Thin CO₂)",
    notePt: "Dados Perseverance: Marte tem 0.38G (3.72 m/s²) e atmosfera rarefeita de CO₂ (~0.02–0.05 ATM).",
    noteEn: "Perseverance Data: Mars gravity is 0.38G (3.72 m/s²) with thin CO₂ air (~0.02–0.05 ATM)."
  },
  m6_europa: {
    targetG: 0.135, tolG: 0.08, targetAtm: 0.0, tolAtm: 0.1, targetDrag: 0.2, tolDrag: 0.15,
    minTwr: 1.12, maxQKpaLimit: 10,
    initG: 1.35, initAtm: 0.85, initDrag: 0.65, initThrottle: 90,
    envPt: "Órbita de Europa (1.31 m/s² · Exosfera O₂)",
    envEn: "Europa Orbit (1.31 m/s² · O₂ Exosphere)",
    notePt: "Europa Clipper NASA: 0.135G (1.315 m/s²) e atmosfera desprezível (0.00 ATM).",
    noteEn: "NASA Europa Clipper: 0.135G (1.315 m/s²) and negligible surface pressure (0.00 ATM)."
  },
  m7_dart: {
    targetG: 0.05, tolG: 0.08, targetAtm: 0.0, tolAtm: 0.1, targetDrag: 0.15, tolDrag: 0.15,
    minTwr: 1.15, maxQKpaLimit: 8,
    initG: 0.9, initAtm: 0.65, initDrag: 0.7, initThrottle: 80,
    envPt: "Asteroide Dimorphos (Micro-G · Zero Arrasto)",
    envEn: "Asteroid Dimorphos (Micro-G · Zero Drag)",
    notePt: "Defesa Planetária DART: regime de microgravidade (0.05G) e vácuo puro (0.00 ATM).",
    noteEn: "DART Planetary Defense: Microgravity intercept (0.05G) in pure vacuum (0.00 ATM)."
  },
  m8_cassini: {
    targetG: 0.14, tolG: 0.09, targetAtm: 1.45, tolAtm: 0.18, targetDrag: 0.35, tolDrag: 0.16,
    minTwr: 1.15, maxQKpaLimit: 48,
    initG: 1.2, initAtm: 0.15, initDrag: 0.95, initThrottle: 75,
    envPt: "Titã / Saturno (0.14G · Atmosfera Densa 1.45 ATM)",
    envEn: "Titan / Saturn (0.14G · Dense 1.45 ATM N₂)",
    notePt: "Cassini-Huygens: Titã tem apenas 0.14G, mas atmosfera de nitrogênio densa de 1.45 ATM!",
    noteEn: "Cassini-Huygens: Titan has 0.14G gravity yet a dense 1.45 ATM nitrogen atmosphere!"
  },
  m9_parker: {
    targetG: 0.3, tolG: 0.12, targetAtm: 0.05, tolAtm: 0.12, targetDrag: 0.2, tolDrag: 0.15,
    minTwr: 1.2, maxQKpaLimit: 15,
    initG: 1.45, initAtm: 1.1, initDrag: 0.85, initThrottle: 80,
    envPt: "Coroa Solar Interna (Plasma · Baixa Densidade)",
    envEn: "Inner Solar Corona (Plasma · Low Density)",
    notePt: "Parker Solar Probe: alta velocidade exige Cd baixo (≤ 0.30) e densidade coronal ~0.05 ATM.",
    noteEn: "Parker Solar Probe: High delta-v requires low Cd (≤ 0.30) in ~0.05 ATM coronal plasma."
  },
  m10_gateway: {
    targetG: 0.165, tolG: 0.09, targetAtm: 0.0, tolAtm: 0.1, targetDrag: 0.2, tolDrag: 0.15,
    minTwr: 1.15, maxQKpaLimit: 10,
    initG: 1.1, initAtm: 0.9, initDrag: 0.75, initThrottle: 85,
    envPt: "Órbita NRHO Lunar (Artemis Gateway · 0.165G)",
    envEn: "Lunar NRHO Orbit (Artemis Gateway · 0.165G)",
    notePt: "Artemis Gateway NASA: órbita cislunar (0.165G) sem arrasto atmosférico (0.00 ATM).",
    noteEn: "NASA Artemis Gateway: Cislunar NRHO (0.165G) with zero atmospheric drag (0.00 ATM)."
  },
  m11_juno: {
    targetG: 1.85, tolG: 0.22, targetAtm: 0.45, tolAtm: 0.18, targetDrag: 0.3, tolDrag: 0.16,
    minTwr: 1.12, maxQKpaLimit: 55,
    initG: 0.45, initAtm: 1.3, initDrag: 0.95, initThrottle: 75,
    envPt: "Atmosfera Superior de Júpiter (1.85G · 0.45 ATM)",
    envEn: "Jupiter Upper Atmosphere (1.85G · 0.45 ATM)",
    notePt: "Sonda Juno: poço gravitacional extremo (≥ 1.70G) exige empuxo elevado e perfil fino (Cd ~0.30)!",
    noteEn: "Juno Probe: Extreme Jovian gravity (≥ 1.70G) requires high throttle & slim Cd (~0.30)!"
  },
  m12_roman: {
    targetG: 0.05, tolG: 0.08, targetAtm: 0.0, tolAtm: 0.1, targetDrag: 0.15, tolDrag: 0.15,
    minTwr: 1.12, maxQKpaLimit: 8,
    initG: 1.05, initAtm: 0.75, initDrag: 0.65, initThrottle: 80,
    envPt: "Telescópio Roman L2 (Micro-G · Vácuo)",
    envEn: "Roman Telescope L2 (Micro-G · Vacuum)",
    notePt: "Nancy Grace Roman: estabilidade óptica em L2 exige calibração de 0.05G e 0.00 ATM.",
    noteEn: "Nancy Grace Roman: L2 optical stability requires 0.05G microgravity and 0.00 ATM vacuum."
  },
  m13_dragonfly: {
    targetG: 0.14, tolG: 0.09, targetAtm: 1.45, tolAtm: 0.18, targetDrag: 0.5, tolDrag: 0.18,
    minTwr: 1.15, maxQKpaLimit: 52,
    initG: 1.0, initAtm: 0.1, initDrag: 1.05, initThrottle: 70,
    envPt: "Pouso em Titã (0.14G · 1.45 ATM Nitrogênio)",
    envEn: "Titan Descent (0.14G · 1.45 ATM Nitrogen)",
    notePt: "Missão Dragonfly NASA: gravidade 0.14G permite voo sustentado no ar denso de 1.45 ATM de Titã.",
    noteEn: "NASA Dragonfly: 0.14G gravity enables rotorcraft flight in Titan's dense 1.45 ATM air."
  },
  m14_voyager: {
    targetG: 0.05, tolG: 0.08, targetAtm: 0.0, tolAtm: 0.1, targetDrag: 0.15, tolDrag: 0.15,
    minTwr: 1.15, maxQKpaLimit: 8,
    initG: 1.3, initAtm: 0.9, initDrag: 0.8, initThrottle: 75,
    envPt: "Heliopausa Interestelar (Micro-G · Vácuo)",
    envEn: "Interstellar Heliopause (Micro-G · Vacuum)",
    notePt: "Voyager Deep Space: escape interestelar em 0.05G e 0.00 ATM sem arrasto aerodinâmico.",
    noteEn: "Voyager Deep Space: Interstellar escape profile at 0.05G and 0.00 ATM zero drag."
  },
  m15_marsbase: {
    targetG: 0.38, tolG: 0.1, targetAtm: 0.05, tolAtm: 0.12, targetDrag: 0.3, tolDrag: 0.15,
    minTwr: 1.18, maxQKpaLimit: 20,
    initG: 1.45, initAtm: 1.15, initDrag: 0.9, initThrottle: 75,
    envPt: "Base Marte Artemis (0.38G · Pouso Retropropulsivo)",
    envEn: "Artemis Mars Base (0.38G · Retropropulsive)",
    notePt: "Base Marciana: 0.38G (3.72 m/s²) e 0.05 ATM exigem alta razão TWR e arrasto controlado.",
    noteEn: "Mars Base: 0.38G (3.72 m/s²) and 0.05 ATM require strong TWR and controlled Cd."
  }
};

export function getMissionNasaProfile(missionId: string): MissionNasaPhysicsProfile {
  return MISSION_NASA_PHYSICS[missionId] || MISSION_NASA_PHYSICS.m1_cml1;
}

export interface GameProgress {
  version: number;
  callsign: string;
  totalScore: number;
  credits: number;
  unlockedSkins: string[];
  unlockedSuits: string[];
  completedMissions: string[];
  unlockedTrophies: string[];
  records: MissionRecord[];
  skinId: string;
  segmentConfig: SegmentConfig;
  flightPhysics: FlightPhysicsConfig;
}

export const nasa_database: {
  launch_segment: LaunchVehicle[];
  space_segment_buses: SpaceBus[];
  space_segment_instruments: SpaceInstrument[];
  missions_cml: MissionCML[];
} = {
  launch_segment: [
    { id: "lv_cubesat", name: "Lançador Orbital Leve (NASA LSP)", cost: 8, payload_max_kg: 300, reliability: 0.92, isp_s: 311, desc: "Lançador leve dedicado (Isp 311s). Ideal para CubeSats econômicos em Órbita Terrestre Baixa (LEO) até 300 kg." },
    { id: "lv_medium", name: "Lançador Médio Reutilizável (NASA LSP)", cost: 68, payload_max_kg: 16800, reliability: 0.98, isp_s: 348, desc: "Veículo orbital reutilizável de alta confiabilidade (Isp 348s, 98% conf.) para sondas lunares e planetárias." },
    { id: "lv_vulcan", name: "Lançador Pesado Criogênico (Estágio Superior)", cost: 120, payload_max_kg: 27200, reliability: 0.96, isp_s: 450, desc: "Estágio superior criogênico de alta energia (Isp 450s) projetado para L1/L2 e órbitas planetárias externas." },
    { id: "lv_heavy", name: "NASA SLS Block 1B (Artemis EUS)", cost: 2200, payload_max_kg: 105000, reliability: 0.96, isp_s: 452, desc: "Foguete superpesado Artemis (~US$ 2,2B/lançamento, Isp 452s, 105 t LEO) para Orion, HLS, Gateway e JWST." }
  ],
  space_segment_buses: [
    { id: "bus_nano", name: "Plataforma CubeSat 6U NASA", dry_mass_kg: 12, power_gen_w: 60, cost: 3, radTier: 1, desc: "Chassi miniaturizado 6U (60 W solar, blindagem LEO). Exige sensores compactos e margem elétrica rigorosa." },
    { id: "bus_orbiter", name: "Orbitador Planetário MRO / LRO", dry_mass_kg: 380, power_gen_w: 1400, cost: 55, radTier: 2, desc: "Plataforma planetária estabilizada em 3 eixos (1.400 W) com controle térmico ativo e blindagem média." },
    { id: "bus_deepspace", name: "Núcleo Espaço Profundo (MMRTG)", dry_mass_kg: 1350, power_gen_w: 3800, cost: 220, radTier: 3, desc: "Núcleo reforçado contra radiação joviana/solar com gerador MMRTG (3.800 W) para Europa, Parker, L2 e Marte." },
    { id: "bus_orion", name: "Nave Orion MPCV & Módulos", dry_mass_kg: 15500, power_gen_w: 11000, cost: 1600, radTier: 3, desc: "Cápsula tripulada Orion e módulo de serviço europeu (~US$ 1,6B, 11.000 W, Nível 3) para Gateway e espaço profundo." },
    { id: "bus_hls", name: "Sistema de Pouso Lunar HLS (Artemis)", dry_mass_kg: 24000, power_gen_w: 14000, cost: 1700, radTier: 3, desc: "Módulo de pouso lunar pesado Artemis HLS (~US$ 1,7B, 14.000 W, Nível 3) para superfície lunar e Base Marte." }
  ],
  space_segment_instruments: [
    { id: "inst_rgb", name: "Câmera Multiespectral (RainCube)", mass_kg: 4, power_w: 14, cost: 2, science_pts: 110, wavelength: "Óptico", desc: "Câmera meteorológica ultracompacta (4 kg, 14 W) para imageamento atmosférico e superfície em LEO." },
    { id: "inst_laser", name: "Altímetro Óptico LOLA / DSOC", mass_kg: 28, power_w: 190, cost: 28, science_pts: 620, wavelength: "Óptico", desc: "Altímetro a laser de precisão e enlace óptico DSOC (28 kg, 190 W) para topografia planetária e alta ciência." },
    { id: "inst_ir", name: "Espectrômetro Infravermelho CRISM", mass_kg: 26, power_w: 150, cost: 16, science_pts: 480, wavelength: "Infravermelho", desc: "Mapeador IR (26 kg, 150 W) que detecta gelo de água, hidroxilas e minerais através de poeira." },
    { id: "inst_mass_spec", name: "Espectrômetro de Massa SAM / MASPEX", mass_kg: 42, power_w: 240, cost: 42, science_pts: 920, wavelength: "Infravermelho", desc: "Cromatógrafo gasoso e analisador de isótopos (42 kg, 240 W) para bioassinaturas em Marte e Titã." },
    { id: "inst_solar", name: "Suíte Heliofísica MAG / SWEPAM", mass_kg: 18, power_w: 85, cost: 12, science_pts: 420, wavelength: "Campo Magnético", desc: "Magnetômetro triaxial em mastro retrátil (18 kg, 85 W) para tempestades solares e plasma em L1." },
    { id: "inst_radar", name: "Radar de Gelo REASON", mass_kg: 95, power_w: 320, cost: 48, science_pts: 900, wavelength: "Campo Magnético", desc: "Arranjo dipolo VHF/HF de penetração profunda (95 kg, 320 W) para sondar oceanos sob Europa e Titã." },
    { id: "inst_jwst", name: "Telescópio Criogênico NIRCam (JWST)", mass_kg: 320, power_w: 920, cost: 120, science_pts: 1650, wavelength: "Infravermelho Profundo", desc: "Óptica segmentada ouro-berílio a 40 K (320 kg, 920 W) para galáxias primordiais e exoplanetas." }
  ],
  missions_cml: [
    {
      id: "m1_cml1",
      cml: "CML 1 · Missão 01",
      title: "Olhos na Terra (CubeSat LEO)",
      budget_max: 32,
      target_science: 100,
      required_wavelength: "Óptico",
      real_nasa_equivalent: "CubeSat MarCO / RainCube",
      minigame: "IGNITION_SEQUENCE",
      briefing: "Construa um CubeSat meteorológico em LEO dentro de $32M e acione os 5 interruptores de ignição na ordem exata."
    },
    {
      id: "m2_cml2",
      cml: "CML 2 · Missão 02",
      title: "Mapeamento Selênico (Órbita Lunar)",
      budget_max: 550,
      target_science: 500,
      required_wavelength: "Infravermelho",
      real_nasa_equivalent: "Lunar Reconnaissance Orbiter (LRO)",
      minigame: "CIRCUIT_PATCH",
      briefing: "Integre o EGS (Pad 39B, $340M) a um orbitador lunar com espectrômetro IR e conecte o barramento elétrico."
    },
    {
      id: "m3_cml3",
      cml: "CML 3 · Missão 03",
      title: "Sentinela Solar (Ponto Lagrange L1)",
      budget_max: 820,
      target_science: 800,
      required_wavelength: "Campo Magnético",
      real_nasa_equivalent: "Sonda SOHO / Sentinelas L1",
      minigame: "CARGO_BALANCE",
      briefing: "Opere via Gateway & DSN ($560M) e distribua pesos nos compartimentos para zerar o torque solar rumo a L1."
    },
    {
      id: "m4_cml4",
      cml: "CML 4 · Missão 04",
      title: "Telescópio Espacial JWST",
      budget_max: 3500,
      target_science: 1900,
      required_wavelength: "Infravermelho Profundo",
      real_nasa_equivalent: "James Webb Space Telescope (JWST)",
      minigame: "THERMAL_MANOMETER",
      briefing: "Combine NASA SLS (~$2.2B) + Núcleo MMRTG + Gateway/DSN ($560M) e calibre a pressão criogênica LHe em L2."
    },
    {
      id: "m5_mars",
      cml: "CML 4 · Missão 05",
      title: "Retorno de Amostras (Mars Sample)",
      budget_max: 980,
      target_science: 1200,
      required_wavelength: "Infravermelho",
      real_nasa_equivalent: "Perseverance / Mars Sample Return",
      minigame: "TERMINAL_DIAGNOSTIC",
      briefing: "Diagnostique 6 falhas de telemetria de Marte no terminal espacial com link Gateway/DSN antes do watchdog."
    },
    {
      id: "m6_europa",
      cml: "CML 4 · Missão 06",
      title: "Oceanos Gelados (Europa Clipper)",
      budget_max: 1250,
      target_science: 1650,
      required_wavelength: "Campo Magnético",
      real_nasa_equivalent: "Sonda Europa Clipper",
      minigame: "BINARY_LOGIC_GATE",
      briefing: "Exige Núcleo Espaço Profundo (MMRTG) e Gateway/DSN. Resolva portas binárias de 4 bits sob radiação joviana."
    },
    {
      id: "m7_dart",
      cml: "CML 4 · Missão 07",
      title: "Defesa Planetária (Impacto DART)",
      budget_max: 950,
      target_science: 1500,
      required_wavelength: "Óptico",
      real_nasa_equivalent: "Missão DART (Dimorphos)",
      minigame: "TRAJECTORY_LOCK",
      briefing: "Trave 4 pulsos consecutivos de interceptação cinética na janela verde estreita contra o asteroide Dimorphos."
    },
    {
      id: "m8_cassini",
      cml: "CML 4 · Missão 08",
      title: "Cassini-Huygens em Titã",
      budget_max: 1100,
      target_science: 1750,
      required_wavelength: "Infravermelho",
      real_nasa_equivalent: "Sonda Cassini & Módulo Huygens",
      minigame: "RING_NAV_CLICK",
      briefing: "Desvie de detritos gelados nos 4 corredores do radar tático dos anéis de Saturno até Titã."
    },
    {
      id: "m9_parker",
      cml: "CML 4 · Missão 09",
      title: "Sonda Solar Parker (Coroa)",
      budget_max: 1300,
      target_science: 1950,
      required_wavelength: "Campo Magnético",
      real_nasa_equivalent: "Parker Solar Probe",
      minigame: "SOLAR_SHIELD_FLUX",
      briefing: "Requer blindagem Nível 3 + Gateway/DSN. Rastreie ondas coronais multi-harmônicas com o modulador magnético."
    },
    {
      id: "m10_gateway",
      cml: "CML 4 · Missão 10",
      title: "Estação Lunar Artemis Gateway",
      budget_max: 4900,
      target_science: 2250,
      required_wavelength: "Campo Magnético",
      real_nasa_equivalent: "Artemis Lunar Gateway",
      minigame: "SPECTROMETER_HARMONIC",
      briefing: "Combine SLS ($2.2B) + Orion ($1.6B) ou HLS ($1.7B) + Gateway/DSN ($560M) e sintonize os 3 canais."
    },
    {
      id: "m11_juno",
      cml: "CML 4 · Missão 11",
      title: "Sonda Juno (Núcleo de Júpiter)",
      budget_max: 1400,
      target_science: 2350,
      required_wavelength: "Campo Magnético",
      real_nasa_equivalent: "Sonda Juno · Júpiter",
      minigame: "COOLANT_MATRIX",
      briefing: "Requer blindagem Nível 3 + Gateway/DSN. Roteie combinações de válvulas contra surtos térmicos em Júpiter."
    },
    {
      id: "m12_roman",
      cml: "CML 4 · Missão 12",
      title: "Telescópio Nancy Grace Roman",
      budget_max: 1500,
      target_science: 2600,
      required_wavelength: "Infravermelho Profundo",
      real_nasa_equivalent: "Nancy Grace Roman Telescope",
      minigame: "GRAVITY_SLINGSHOT",
      briefing: "Dispare 4 queimas aceleradas no arco de periastro do radar orbital para estilingue gravitacional rumo a L2."
    },
    {
      id: "m13_dragonfly",
      cml: "CML 4 · Missão 13",
      title: "Rotorcraft Dragonfly (Titã)",
      budget_max: 1450,
      target_science: 2750,
      required_wavelength: "Infravermelho",
      real_nasa_equivalent: "Missão Dragonfly · Titã",
      minigame: "OPTICAL_RING_LOCK",
      briefing: "Alinhe os 4 espelhos hexagonais desalinhados até 0° para focar o espectrômetro SAM/CRISM em Titã."
    },
    {
      id: "m14_voyager",
      cml: "CML 4 · Missão 14",
      title: "Voyager Interestelar (Heliopausa)",
      budget_max: 1500,
      target_science: 2950,
      required_wavelength: "Campo Magnético",
      real_nasa_equivalent: "Voyager 1 & Disco Dourado",
      minigame: "MORSE_BEACON_SYNC",
      briefing: "Requer blindagem Nível 3 + Gateway/DSN. Decodifique pacotes de farol ponto/traço antes do desvanecimento."
    },
    {
      id: "m15_marsbase",
      cml: "CML 4 · Missão 15",
      title: "Base Orbital Marciana (Comando Final)",
      budget_max: 5200,
      target_science: 3150,
      required_wavelength: "Óptico",
      real_nasa_equivalent: "Mars Base Camp · NASA Deep Space",
      minigame: "CORE_OVERRIDE",
      briefing: "Arquitetura suprema Artemis (SLS + Orion/HLS + Gateway/DSN): desbloqueio binário, corte MECO e retropropulsão."
    }
  ]
};

export const GROUND_SEGMENT_STATIONS: GroundStation[] = [
  {
    id: "gs_nen",
    name: "Near Space Network (NSN · LEO / CubeSat)",
    band: "Banda S / Banda X ($12M)",
    cost: 12,
    desc: "Segmento econômico ($12M) para rastreio LEO de CubeSats. Alcance insuficiente para operações lunares Artemis."
  },
  {
    id: "gs_egs",
    name: "Exploration Ground Systems (EGS · Pad 39B)",
    band: "Operações de Solo / Lunar ($340M)",
    cost: 340,
    desc: "Infraestrutura de solo KSC / Pad 39B e telemetria cislunar (~$340M). Obrigatória para operações lunares."
  },
  {
    id: "gs_dsn",
    name: "Artemis Gateway & DSN (70m Deep Space)",
    band: "Banda Ka / Enlace Óptico ($560M)",
    cost: 560,
    desc: "Suporte Artemis Gateway e rede DSN de 70m (~$560M). Obrigatória para L1/L2, Gateway e espaço profundo."
  }
];

export const CAREER_RANKS = [
  { minScore: 0, title: "Estagiário de Telemetria" },
  { minScore: 600, title: "Engenheiro de Propulsão" },
  { minScore: 2200, title: "Especialista de Carga Útil" },
  { minScore: 5500, title: "Arquiteto de Sistemas CML" },
  { minScore: 12000, title: "Diretor de Voo NASA" },
  { minScore: 26000, title: "Comandante Supremo Artemis" }
];

export const PLAYER_SKINS: PlayerSkin[] = [
  {
    id: "chief",
    name: "Astronauta Chefe NASA",
    subtitle: "Traje Pressurizado & Visor Translúcido",
    desc: "Traje espacial padrão de comando NASA com capacete bolha arredondado, visor azul profundo translúcido, placas peitorais e patch oficial.",
    price: 0,
    tierLabel: "TRAJE PADRÃO · GRÁTIS",
    mode: "helmet",
    translucentFace: true,
    helmet: "#f1f5f9", helmetHi: "#ffffff", helmetShade: "#94a3b8", collar: "#ea580c",
    skin: "#eab892", skinShade: "#c78b62",
    torso: "#e2e8f0", torsoHi: "#ffffff", torsoShade: "#94a3b8", shirt: "#334155",
    accent: "#f97316", accent2: "#0284c7",
    pants: "#cbd5e1", pantsShade: "#64748b", boots: "#1e293b", badge: "#facc15",
    pack: "#475569", packShade: "#1e293b", packLed: "#38bdf8",
    visorDeep: "#082f49", visorMid: "#0369a1", visor: "#0ea5e9", visorGlint: "#e0f2fe"
  },
  {
    id: "aces",
    name: "Piloto ACES (Laranja NASA)",
    subtitle: "Macacão Laranja Pressurizado",
    desc: "Traje oficial de ascensão e reentrada da NASA em laranja de alta visibilidade com ombreiras escuras e visor azul translúcido.",
    price: 2400,
    tierLabel: "CLASSE DE ASCENSÃO",
    mode: "helmet",
    translucentFace: true,
    helmet: "#f8fafc", helmetHi: "#ffffff", helmetShade: "#94a3b8", collar: "#1e293b",
    skin: "#eab892", skinShade: "#c78b62",
    torso: "#ea580c", torsoHi: "#fb923c", torsoShade: "#9a3412", shirt: "#1e293b",
    accent: "#38bdf8", accent2: "#facc15",
    pants: "#c2410c", pantsShade: "#7c2d12", boots: "#0f172a", badge: "#38bdf8",
    pack: "#334155", packShade: "#0f172a", packLed: "#38bdf8",
    visorDeep: "#0c4a6e", visorMid: "#0284c7", visor: "#38bdf8", visorGlint: "#e0f2fe"
  },
  {
    id: "tactical",
    name: "Operador Tático Retrô",
    subtitle: "Blindagem Grafite & Visor Neon",
    desc: "Equipamento pesado industrial em grafite escuro com tanque de oxigênio âmbar, ombreiras blindadas e visor verde fosforescente.",
    price: 6800,
    tierLabel: "ENGENHARIA PESADA",
    mode: "helmet",
    translucentFace: true,
    helmet: "#334155", helmetHi: "#64748b", helmetShade: "#0f172a", collar: "#f59e0b",
    skin: "#eab892", skinShade: "#c78b62",
    torso: "#1e293b", torsoHi: "#475569", torsoShade: "#090d14", shirt: "#0f172a",
    accent: "#33ff66", accent2: "#f97316",
    pants: "#1e293b", pantsShade: "#090d14", boots: "#020617", badge: "#33ff66",
    pack: "#b45309", packShade: "#78350f", packLed: "#33ff66",
    visorDeep: "#052e16", visorMid: "#15803d", visor: "#22c55e", visorGlint: "#bbf7d0"
  },
  {
    id: "eva",
    name: "Especialista EVA (Traje Lunar)",
    subtitle: "EMU Branco & Viseira Dourada",
    desc: "Armadura extraveicular para caminhadas espaciais com mochila PLSS dupla, ombreiras reforçadas e visor solar banhado a ouro.",
    price: 16500,
    tierLabel: "EDIÇÃO DEEP SPACE",
    mode: "helmet",
    translucentFace: false,
    helmet: "#f8fafc", helmetHi: "#ffffff", helmetShade: "#94a3b8", collar: "#0284c7",
    skin: "#eab892", skinShade: "#c78b62",
    torso: "#f1f5f9", torsoHi: "#ffffff", torsoShade: "#94a3b8", shirt: "#475569",
    accent: "#ef4444", accent2: "#f59e0b",
    pants: "#cbd5e1", pantsShade: "#64748b", boots: "#334155", badge: "#ef4444",
    pack: "#64748b", packShade: "#334155", packLed: "#fbbf24",
    visorDeep: "#78350f", visorMid: "#b45309", visor: "#f59e0b", visorGlint: "#fef08a"
  },
  {
    id: "artemis_xemu",
    name: "Comandante Artemis xEMU",
    subtitle: "Exploração Polar Lunar · Ciano & Titânio",
    desc: "Traje de superfície Artemis xEMU com juntas rotativas de alta mobilidade, listras azul-espacial NASA e visor ciano anti-radiação.",
    price: 28000,
    tierLabel: "PROGRAMA ARTEMIS",
    mode: "helmet",
    translucentFace: true,
    helmet: "#f8fafc", helmetHi: "#ffffff", helmetShade: "#94a3b8", collar: "#0b3d91",
    skin: "#eab892", skinShade: "#c78b62",
    torso: "#f1f5f9", torsoHi: "#ffffff", torsoShade: "#64748b", shirt: "#0b3d91",
    accent: "#38bdf8", accent2: "#fc3d21",
    pants: "#e2e8f0", pantsShade: "#475569", boots: "#0b3d91", badge: "#38bdf8",
    pack: "#1e3a8a", packShade: "#0f172a", packLed: "#38bdf8",
    visorDeep: "#083344", visorMid: "#0284c7", visor: "#22d3ee", visorGlint: "#ecfeff"
  },
  {
    id: "deep_exp",
    name: "Traje Experimental Espaço Profundo",
    subtitle: "Blindagem Obsidiana & Dourado RTG",
    desc: "Protótipo experimental de comando supremo com revestimento anti-radiação em titânio negro, linhas douradas e telemetria integrada.",
    price: 45000,
    tierLabel: "PROTÓTIPO SUPREMO",
    mode: "helmet",
    translucentFace: false,
    helmet: "#1e293b", helmetHi: "#475569", helmetShade: "#090d14", collar: "#fbbf24",
    skin: "#eab892", skinShade: "#c78b62",
    torso: "#0f172a", torsoHi: "#334155", torsoShade: "#020617", shirt: "#1e293b",
    accent: "#fbbf24", accent2: "#c084fc",
    pants: "#0f172a", pantsShade: "#020617", boots: "#78350f", badge: "#fbbf24",
    pack: "#312e81", packShade: "#1e1b4b", packLed: "#fbbf24",
    visorDeep: "#451a03", visorMid: "#d97706", visor: "#fbbf24", visorGlint: "#fef9c3"
  }
];

export function getSkin(skinId: string): PlayerSkin {
  return PLAYER_SKINS.find(s => s.id === skinId) || PLAYER_SKINS[0];
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  enabled = true;
  lastStepAt = 0;
  lastTypeAt = 0;

  ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  setEnabled(flag: boolean) {
    this.enabled = Boolean(flag);
    if (!this.enabled && this.ctx && this.ctx.state === "running") {
      this.ctx.suspend().catch(() => {});
    } else if (this.enabled && this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  tone(freq: number, dur = 0.08, type: OscillatorType = "square", vol = 0.045, slide: number | null = null) {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(25, slide), now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  }

  step() {
    const now = performance.now();
    if (now - this.lastStepAt < 200) return;
    this.lastStepAt = now;
    this.tone(110 + Math.random() * 25, 0.035, "triangle", 0.025, 55);
  }

  typeClick() {
    const now = performance.now();
    if (now - this.lastTypeAt < 38) return;
    this.lastTypeAt = now;
    this.tone(920 + Math.random() * 140, 0.015, "square", 0.012);
  }

  uiSelect() {
    this.tone(540, 0.045, "square", 0.032, 720);
  }

  stationOpen() {
    this.tone(360, 0.05, "triangle", 0.045, 540);
    window.setTimeout(() => this.tone(720, 0.07, "triangle", 0.04), 50);
  }

  countdown(final = false) {
    this.tone(final ? 1046 : 660, final ? 0.25 : 0.1, "square", 0.05);
  }

  rumble(dur = 0.8) {
    const ctx = this.ensure();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 180;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);
    src.start();
  }

  success() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      window.setTimeout(() => this.tone(f, 0.16, "triangle", 0.05), i * 85);
    });
  }

  alarm() {
    this.tone(300, 0.14, "sawtooth", 0.05, 200);
    window.setTimeout(() => this.tone(220, 0.18, "sawtooth", 0.05, 150), 150);
  }

  dispose() {
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export class StateManager {
  storageKey: string;
  state: GameProgress;

  constructor(storageKey = "ad_stars_v2") {
    this.storageKey = storageKey;
    this.state = this.load();
  }

  defaultState(): GameProgress {
    return {
      version: 2,
      callsign: "ENG-SILVA",
      totalScore: 0,
      credits: 0,
      unlockedSkins: ["chief"],
      unlockedSuits: ["chief"],
      completedMissions: [],
      unlockedTrophies: [],
      records: [],
      skinId: "chief",
      segmentConfig: {
        missionId: "m1_cml1",
        vehicleId: "lv_cubesat",
        busId: "bus_nano",
        instrumentIds: ["inst_rgb"],
        groundId: "gs_nen"
      },
      flightPhysics: {
        regime: "earth",
        gravityG: MISSION_NASA_PHYSICS.m1_cml1.initG,
        atmDensity: MISSION_NASA_PHYSICS.m1_cml1.initAtm,
        dragCoeff: MISSION_NASA_PHYSICS.m1_cml1.initDrag,
        throttlePct: MISSION_NASA_PHYSICS.m1_cml1.initThrottle,
        calibratedForMission: "m1_cml1"
      }
    };
  }

  sanitize(raw: Record<string, unknown> | null): GameProgress {
    const def = this.defaultState();
    if (!raw || typeof raw !== "object") return def;

    const validMissionIds = new Set(nasa_database.missions_cml.map(m => m.id));
    const validVehicleIds = new Set(nasa_database.launch_segment.map(v => v.id));
    const validBusIds = new Set(nasa_database.space_segment_buses.map(b => b.id));
    const validInstIds = new Set(nasa_database.space_segment_instruments.map(i => i.id));
    const validGroundIds = new Set(GROUND_SEGMENT_STATIONS.map(g => g.id));
    const validSkinIds = new Set(PLAYER_SKINS.map(s => s.id));

    const completed = Array.isArray(raw.completedMissions)
      ? [...new Set((raw.completedMissions as string[]).filter(id => validMissionIds.has(id)))]
      : [];
    const trophies = Array.isArray(raw.unlockedTrophies)
      ? [...new Set([...completed, ...(raw.unlockedTrophies as string[]).filter(id => validMissionIds.has(id))])]
      : [...completed];
    const rawSkins = Array.isArray(raw.unlockedSkins)
      ? (raw.unlockedSkins as string[])
      : Array.isArray(raw.unlockedSuits)
        ? (raw.unlockedSuits as string[])
        : [];
    const unlockedSkins = [...new Set(["chief", ...rawSkins.filter(id => validSkinIds.has(id))])];
    const activeSkin = typeof raw.skinId === "string" && validSkinIds.has(raw.skinId) && unlockedSkins.includes(raw.skinId)
      ? raw.skinId
      : def.skinId;

    const seg = raw.segmentConfig && typeof raw.segmentConfig === "object" ? (raw.segmentConfig as Partial<SegmentConfig>) : {};
    const insts = Array.isArray(seg.instrumentIds)
      ? [...new Set(seg.instrumentIds.filter(id => validInstIds.has(id)))]
      : [];

    const fp = raw.flightPhysics && typeof raw.flightPhysics === "object" ? (raw.flightPhysics as Partial<FlightPhysicsConfig>) : {};
    const validRegime = (r: unknown): r is GravityRegime => r === "earth" || r === "upper_atm" || r === "lunar" || r === "micro";

    const resolvedMissionId = seg.missionId && validMissionIds.has(seg.missionId) ? seg.missionId : def.segmentConfig.missionId;
    const hasCalibTag = typeof fp.calibratedForMission === "string" && validMissionIds.has(fp.calibratedForMission);
    const misSeed = getMissionNasaProfile(resolvedMissionId);

    return {
      version: 2,
      callsign: typeof raw.callsign === "string" && raw.callsign.trim() ? raw.callsign.trim().slice(0, 16).toUpperCase() : def.callsign,
      totalScore: Math.max(0, Number(raw.totalScore) || 0),
      credits: Math.max(0, Math.round(Number(raw.credits) || 0)),
      unlockedSkins,
      unlockedSuits: unlockedSkins,
      completedMissions: completed,
      unlockedTrophies: trophies,
      records: Array.isArray(raw.records) ? (raw.records as MissionRecord[]).slice(0, 12) : [],
      skinId: activeSkin,
      segmentConfig: {
        missionId: resolvedMissionId,
        vehicleId: seg.vehicleId && validVehicleIds.has(seg.vehicleId) ? seg.vehicleId : def.segmentConfig.vehicleId,
        busId: seg.busId && validBusIds.has(seg.busId) ? seg.busId : def.segmentConfig.busId,
        instrumentIds: insts.length > 0 ? insts : [...def.segmentConfig.instrumentIds],
        groundId: seg.groundId && validGroundIds.has(seg.groundId) ? seg.groundId : def.segmentConfig.groundId
      },
      flightPhysics: hasCalibTag
        ? {
            regime: validRegime(fp.regime) ? fp.regime : def.flightPhysics.regime,
            gravityG: Math.max(0.05, Math.min(2.0, Number(fp.gravityG) || def.flightPhysics.gravityG)),
            atmDensity: Math.max(0, Math.min(1.5, fp.atmDensity !== undefined ? Number(fp.atmDensity) : def.flightPhysics.atmDensity)),
            dragCoeff: Math.max(0.15, Math.min(1.2, Number(fp.dragCoeff) || def.flightPhysics.dragCoeff)),
            throttlePct: Math.max(60, Math.min(150, Number(fp.throttlePct) || def.flightPhysics.throttlePct)),
            calibratedForMission: fp.calibratedForMission
          }
        : {
            regime: misSeed.targetG <= 0.2 ? "earth" : "upper_atm",
            gravityG: misSeed.initG,
            atmDensity: misSeed.initAtm,
            dragCoeff: misSeed.initDrag,
            throttlePct: misSeed.initThrottle,
            calibratedForMission: resolvedMissionId
          }
    };
  }

  load(): GameProgress {
    try {
      const raw = localStorage.getItem(this.storageKey) || localStorage.getItem("projeto_ad_estrelas_v2");
      if (raw) return this.sanitize(JSON.parse(raw));
    } catch { /* ignore storage errors */ }
    return this.defaultState();
  }

  save() {
    try {
      this.state.unlockedSuits = this.state.unlockedSkins;
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch { /* ignore storage errors */ }
  }

  get progress() { return this.state; }
  get config() { return this.state.segmentConfig; }
  get physics() { return this.state.flightPhysics; }

  seedMisalignedPhysicsForMission(missionId: string) {
    const prof = getMissionNasaProfile(missionId);
    this.state.flightPhysics.regime = prof.targetG <= 0.08 ? "earth" : prof.targetG <= 0.2 ? "earth" : "upper_atm";
    this.state.flightPhysics.gravityG = prof.initG;
    this.state.flightPhysics.atmDensity = prof.initAtm;
    this.state.flightPhysics.dragCoeff = prof.initDrag;
    this.state.flightPhysics.throttlePct = prof.initThrottle;
    this.state.flightPhysics.calibratedForMission = missionId;
    this.save();
  }

  setSegmentField<K extends keyof SegmentConfig>(field: K, value: SegmentConfig[K]) {
    this.state.segmentConfig[field] = value;
    if (field === "missionId" && typeof value === "string") {
      this.seedMisalignedPhysicsForMission(value);
    } else {
      this.save();
    }
  }

  setPhysicsField<K extends keyof FlightPhysicsConfig>(field: K, value: FlightPhysicsConfig[K]) {
    this.state.flightPhysics[field] = value;
    this.state.flightPhysics.calibratedForMission = this.state.segmentConfig.missionId;
    this.save();
  }

  applyPhysicsPreset(regime: GravityRegime) {
    const preset = GRAVITY_PRESETS[regime];
    this.state.flightPhysics.regime = preset.regime;
    this.state.flightPhysics.gravityG = preset.gravityG;
    this.state.flightPhysics.atmDensity = preset.atmDensity;
    this.state.flightPhysics.dragCoeff = preset.dragCoeff;
    this.state.flightPhysics.calibratedForMission = this.state.segmentConfig.missionId;
    this.save();
  }

  hasTrophy(missionId: string) {
    return this.state.unlockedTrophies.includes(missionId) || this.state.completedMissions.includes(missionId);
  }

  hasSuit(skinId: string) {
    return this.state.unlockedSkins.includes(skinId) || getSkin(skinId).price === 0;
  }

  purchaseSuit(skinId: string, cost: number) {
    const cleanCost = Math.max(0, Math.round(Number(cost) || 0));
    if (this.hasSuit(skinId)) {
      this.state.skinId = skinId;
      this.save();
      return true;
    }
    if (this.state.credits < cleanCost) return false;
    this.state.credits -= cleanCost;
    this.state.unlockedSkins.push(skinId);
    this.state.unlockedSuits = this.state.unlockedSkins;
    this.state.skinId = skinId;
    this.save();
    return true;
  }

  unlockMissionAndTrophy(missionId: string, recordEntry: MissionRecord, pointsEarned: number, creditsEarned = 0) {
    this.state.totalScore += pointsEarned;
    this.state.credits += Math.max(0, Math.round(Number(creditsEarned) || 0));
    if (!this.state.completedMissions.includes(missionId)) {
      this.state.completedMissions.push(missionId);
    }
    if (!this.state.unlockedTrophies.includes(missionId)) {
      this.state.unlockedTrophies.push(missionId);
    }
    this.state.records.push(recordEntry);
    this.state.records.sort((a, b) => b.score - a.score);
    this.state.records = this.state.records.slice(0, 12);
    this.save();
  }

  clearRecords() {
    this.state.records = [];
    this.save();
  }
}

export class MissionManager {
  stateMgr: StateManager;

  constructor(stateMgr: StateManager) {
    this.stateMgr = stateMgr;
  }

  getMission() {
    const id = this.stateMgr.config.missionId;
    return nasa_database.missions_cml.find(m => m.id === id) || nasa_database.missions_cml[0];
  }

  getVehicle() {
    const id = this.stateMgr.config.vehicleId;
    return nasa_database.launch_segment.find(v => v.id === id) || nasa_database.launch_segment[0];
  }

  getBus() {
    const id = this.stateMgr.config.busId;
    return nasa_database.space_segment_buses.find(b => b.id === id) || nasa_database.space_segment_buses[0];
  }

  getInstruments() {
    const ids = this.stateMgr.config.instrumentIds;
    return nasa_database.space_segment_instruments.filter(i => ids.includes(i.id));
  }

  getGround() {
    const id = this.stateMgr.config.groundId;
    return GROUND_SEGMENT_STATIONS.find(g => g.id === id) || GROUND_SEGMENT_STATIONS[0];
  }

  getBaseLevel() {
    const n = this.stateMgr.progress.completedMissions.length;
    if (n >= 3 || this.stateMgr.progress.totalScore >= 2600) return 3;
    if (n >= 1 || this.stateMgr.progress.totalScore >= 300) return 2;
    return 1;
  }

  isSupremeCommand() {
    return this.stateMgr.progress.completedMissions.length >= 11 ||
      this.stateMgr.progress.completedMissions.includes("m15_marsbase");
  }

  getRank(score = this.stateMgr.progress.totalScore) {
    let cur = CAREER_RANKS[0];
    for (const r of CAREER_RANKS) if (score >= r.minScore) cur = r;
    return cur;
  }

  getNextRank(score = this.stateMgr.progress.totalScore) {
    return CAREER_RANKS.find(r => score < r.minScore) || null;
  }

  getConfigSignature() {
    const c = this.stateMgr.config;
    return `${c.missionId}|${c.vehicleId}|${c.busId}|${c.instrumentIds.slice().sort().join(",")}|${c.groundId}`;
  }

  computeMetrics(override?: Partial<SegmentConfig>) {
    const cfg = { ...this.stateMgr.config, ...(override || {}) };
    const mission = nasa_database.missions_cml.find(m => m.id === cfg.missionId) || this.getMission();
    const vehicle = nasa_database.launch_segment.find(v => v.id === cfg.vehicleId) || this.getVehicle();
    const bus = nasa_database.space_segment_buses.find(b => b.id === cfg.busId) || this.getBus();
    const insts = nasa_database.space_segment_instruments.filter(i => cfg.instrumentIds.includes(i.id));
    const ground = GROUND_SEGMENT_STATIONS.find(g => g.id === cfg.groundId) || this.getGround();

    const instCost = insts.reduce((s, i) => s + i.cost, 0);
    const instMass = insts.reduce((s, i) => s + i.mass_kg, 0);
    const instPower = insts.reduce((s, i) => s + i.power_w, 0);
    const totalScience = insts.reduce((s, i) => s + i.science_pts, 0);

    const totalCost = vehicle.cost + bus.cost + instCost + ground.cost;
    const totalMass = bus.dry_mass_kg + instMass;
    const netPower = bus.power_gen_w - instPower;
    const hasRequiredWave = insts.some(i => i.wavelength === mission.required_wavelength);

    const requiresLunar = mission.id === "m2_cml2";
    const requiresDsn = mission.id !== "m1_cml1" && mission.id !== "m2_cml2";
    const highRadMissions = new Set(["m4_cml4", "m6_europa", "m9_parker", "m10_gateway", "m11_juno", "m14_voyager", "m15_marsbase"]);
    const requiredRadTier = highRadMissions.has(mission.id) ? 3 : requiresDsn ? 2 : 1;
    const busRadTier = bus.radTier || (bus.id === "bus_nano" ? 1 : bus.id === "bus_orbiter" ? 2 : 3);

    const deepSpaceOk =
      mission.id === "m4_cml4"
        ? vehicle.id === "lv_heavy" && (bus.id === "bus_deepspace" || bus.id === "bus_orion" || bus.id === "bus_hls")
        : mission.id === "m10_gateway" || mission.id === "m15_marsbase"
          ? vehicle.id === "lv_heavy" && (bus.id === "bus_orion" || bus.id === "bus_hls")
          : true;

    const dsnOk = requiresDsn
      ? ground.id === "gs_dsn"
      : requiresLunar
        ? ground.id === "gs_egs" || ground.id === "gs_dsn"
        : true;

    const checks = {
      budgetOk: totalCost <= mission.budget_max,
      massOk: totalMass <= vehicle.payload_max_kg,
      powerOk: netPower >= 0,
      scienceOk: totalScience >= mission.target_science && insts.length > 0,
      waveOk: hasRequiredWave,
      dsnOk,
      radiationOk: busRadTier >= requiredRadTier,
      deepSpaceOk
    };

    const reasons: string[] = [];
    const isEn = getLang() === "en";
    if (!checks.budgetOk) {
      reasons.push(
        isEn
          ? `Budget exceeded (${formatUsd(totalCost)} > ${formatUsd(mission.budget_max)}).`
          : `Orçamento excedido (${formatUsd(totalCost)} > ${formatUsd(mission.budget_max)}).`
      );
    }
    if (!checks.massOk) {
      reasons.push(
        isEn
          ? `Mass (${totalMass.toLocaleString("en-US")} kg) exceeds launcher limit (${vehicle.payload_max_kg.toLocaleString("en-US")} kg).`
          : `Massa (${totalMass.toLocaleString("pt-BR")} kg) excede limite do veículo (${vehicle.payload_max_kg.toLocaleString("pt-BR")} kg).`
      );
    }
    if (!checks.powerOk) {
      reasons.push(
        isEn
          ? `Power deficit (${netPower} W). Select a larger Spacecraft/Bus.`
          : `Déficit elétrico (${netPower} W). Escolha uma Nave/Bus maior.`
      );
    }
    if (!checks.scienceOk) {
      reasons.push(
        isEn
          ? `Insufficient science (${totalScience} < ${mission.target_science} pts). Add more sensors.`
          : `Ciência insuficiente (${totalScience} < ${mission.target_science} pts). Combine mais sensores.`
      );
    }
    if (!checks.waveOk) {
      const bandLabel = translateWavelength(mission.required_wavelength);
      reasons.push(
        isEn
          ? `Missing "${bandLabel}" band sensor.`
          : `Falta sensor de banda "${bandLabel}".`
      );
    }
    if (!checks.dsnOk) {
      reasons.push(
        requiresLunar
          ? isEn
            ? `Lunar orbit requires Exploration Ground Systems (EGS · Pad 39B) or Gateway/DSN.`
            : `Órbita lunar exige Exploration Ground Systems (EGS · Pad 39B) ou Gateway/DSN.`
          : isEn
            ? `L1/L2 & interplanetary tracking requires Artemis Gateway & DSN (70m).`
            : `Rastreio L1/L2 e espaço profundo exige Artemis Gateway & DSN (70m).`
      );
    }
    if (!checks.radiationOk) {
      reasons.push(
        requiredRadTier >= 3
          ? isEn
            ? `Severe radiation environment requires MMRTG Core, Orion, or HLS (Tier 3).`
            : `Radiação severa exige Núcleo MMRTG, Orion ou HLS (Blindagem Nível 3).`
          : isEn
            ? `Deep-space orbit requires at least Planetary Orbiter Bus (Tier 2).`
            : `Órbita planetária exige no mínimo Orbitador Planetário (Blindagem Nível 2).`
      );
    }
    if (!checks.deepSpaceOk) {
      reasons.push(
        mission.id === "m4_cml4"
          ? isEn
            ? `JWST L2 requires NASA SLS Block 1B (~$2.2B) + Tier 3 Deep Space Core.`
            : `JWST L2 exige NASA SLS Block 1B (~$2.2B) + Núcleo Espaço Profundo Nível 3.`
          : isEn
            ? `Artemis/Mars architecture requires NASA SLS Block 1B (~$2.2B) + Orion ($1.6B) or HLS ($1.7B).`
            : `Arquitetura Artemis/Marte exige NASA SLS Block 1B (~$2.2B) + Orion ($1.6B) ou HLS ($1.7B).`
      );
    }

    const totalChecks = Object.values(checks);
    const passedCount = totalChecks.filter(Boolean).length;
    const isGo = passedCount === totalChecks.length;
    const viabilityPct = Math.round((passedCount / totalChecks.length) * 100);
    const totalCostSplit = {
      launch: vehicle.cost,
      bus: bus.cost,
      instruments: instCost,
      ground: ground.cost
    };
    return {
      mission,
      vehicle,
      bus,
      insts,
      ground,
      totalCost,
      totalCostSplit,
      totalMass,
      instPower,
      netPower,
      totalScience,
      checks,
      reasons,
      isGo,
      viabilityPct,
      requiredRadTier
    };
  }

  computeFlightPhysics() {
    const m = this.computeMetrics();
    const p = this.stateMgr.physics;
    const nasaProfile = getMissionNasaProfile(m.mission.id);
    const specMap: Record<string, { baseMassKg: number; baseThrustKN: number; areaM2: number }> = {
      lv_cubesat: { baseMassKg: 12500, baseThrustKN: 220, areaM2: 1.4 },
      lv_medium: { baseMassKg: 145000, baseThrustKN: 2550, areaM2: 9.6 },
      lv_vulcan: { baseMassKg: 265000, baseThrustKN: 4950, areaM2: 14.5 },
      lv_heavy: { baseMassKg: 620000, baseThrustKN: 10800, areaM2: 46.0 }
    };
    const spec = specMap[m.vehicle.id] || specMap.lv_medium;
    const wetMassKg = spec.baseMassKg + m.totalMass;
    const gMs2 = p.gravityG * 9.80665;
    const apparentWeightKN = (wetMassKg * gMs2) / 1000;
    const calibratedThrustKN = spec.baseThrustKN * (p.throttlePct / 100);
    const airRho = p.atmDensity * 1.225;

    const simTraj = (gVal: number, atmVal: number, dragVal: number, throtVal: number) => {
      const gLoc = gVal * 9.80665;
      const rho0 = atmVal * 1.225;
      const thrustN = spec.baseThrustKN * (throtVal / 100) * 1000;
      const wKN = (wetMassKg * gLoc) / 1000;
      const dt = 0.85;
      let altKm = 0;
      let downrangeKm = 0;
      let velMs = 0;
      let peakDragKN = 0;
      let peakQPa = 0;
      const pts: { t: number; downrange: number; alt: number }[] = [{ t: 0, downrange: 0, alt: 0 }];

      for (let step = 1; step <= 14; step++) {
        const t = step * dt;
        const rhoLocal = rho0 * Math.exp(-altKm / 14);
        const qPa = 0.5 * rhoLocal * velMs * velMs;
        if (qPa > peakQPa) peakQPa = qPa;
        const dragN = qPa * dragVal * spec.areaM2;
        const dragKN = dragN / 1000;
        if (dragKN > peakDragKN) peakDragKN = dragKN;

        const massNow = wetMassKg * Math.max(0.32, 1 - (step / 14) * 0.58 * (throtVal / 100));
        const netForceN = thrustN - massNow * gLoc - dragN;
        const accel = netForceN / massNow;
        velMs = Math.max(0, velMs + accel * dt);

        const pitchRad = Math.min(1.18, (step / 14) * (thrustN / 1000 > wKN ? 0.92 : 0.35));
        altKm = Math.max(0, altKm + (velMs * Math.cos(pitchRad) * dt) / 1000);
        downrangeKm += (velMs * Math.sin(pitchRad) * dt) / 1000;
        pts.push({ t, downrange: downrangeKm, alt: altKm });
      }
      return { pts, peakDragKN, peakQPa, finalAltKm: altKm, finalVelMs: velMs };
    };

    const live = simTraj(p.gravityG, p.atmDensity, p.dragCoeff, p.throttlePct);
    const refThrottle = Math.max(100, Math.min(145, Math.round(nasaProfile.targetG * 100 + 10)));
    const ref = simTraj(nasaProfile.targetG, nasaProfile.targetAtm, nasaProfile.targetDrag, refThrottle);

    const dragPeakKN = live.peakDragKN;
    const maxQPa = live.peakQPa;
    const maxQKpa = maxQPa / 1000;
    const requiredThrustKN = apparentWeightKN * nasaProfile.minTwr + dragPeakKN * 0.45;
    const twr = calibratedThrustKN / Math.max(0.5, apparentWeightKN);
    const maxQStress = dragPeakKN / Math.max(1, spec.baseThrustKN * 0.14);
    const highMaxQ = maxQStress > 1.25 || maxQKpa > nasaProfile.maxQKpaLimit;
    const twrOk = twr >= nasaProfile.minTwr && calibratedThrustKN >= requiredThrustKN * 0.92;
    const apogeeKm = Math.round(live.finalAltKm * (twrOk ? 1.85 : 0.45) + (live.finalVelMs * live.finalVelMs) / Math.max(4, 2 * gMs2 * 1000));
    const fuelBurnMult = (p.throttlePct / 100) * (1 + maxQStress * 0.16);
    const accelFactor = Math.max(0.35, Math.min(2.2, (twr - 0.5) * 0.85));

    // NASA Scientific Alignment Scores (with slider-step snap tolerance so 100% is cleanly achievable)
    const rawDiffG = Math.max(0, Math.abs(p.gravityG - nasaProfile.targetG) - 0.025);
    const rawDiffAtm = Math.max(0, Math.abs(p.atmDensity - nasaProfile.targetAtm) - 0.03);
    const rawDiffDrag = Math.max(0, Math.abs(p.dragCoeff - nasaProfile.targetDrag) - 0.03);
    const errG = rawDiffG / Math.max(0.08, nasaProfile.tolG);
    const errAtm = rawDiffAtm / Math.max(0.1, nasaProfile.tolAtm);
    const errDrag = rawDiffDrag / Math.max(0.14, nasaProfile.tolDrag);

    const gOk = Math.abs(p.gravityG - nasaProfile.targetG) / Math.max(0.08, nasaProfile.tolG) <= 1.25;
    const atmOk = Math.abs(p.atmDensity - nasaProfile.targetAtm) / Math.max(0.1, nasaProfile.tolAtm) <= 1.25;
    const dragOk = Math.abs(p.dragCoeff - nasaProfile.targetDrag) / Math.max(0.14, nasaProfile.tolDrag) <= 1.35;

    const gScore = Math.max(0, 1 - errG * 0.36);
    const atmScore = Math.max(0, 1 - errAtm * 0.36);
    const dragScore = Math.max(0, 1 - errDrag * 0.25);
    const twrScore = twrOk
      ? (highMaxQ ? 0.85 : Math.min(1, 0.86 + (twr - nasaProfile.minTwr) * 0.95))
      : Math.max(0, (twr / nasaProfile.minTwr) * 0.55);

    const rawStability = (gScore * 0.38 + atmScore * 0.32 + dragScore * 0.15 + twrScore * 0.15) * 100;
    const stabilityPct = Math.round(Math.max(0, Math.min(100, rawStability)));
    const nasaCalibratedOk = twrOk && stabilityPct >= 76 && gOk && atmOk;
    const stabilityZone: "ideal" | "drift" | "danger" = nasaCalibratedOk
      ? "ideal"
      : stabilityPct >= 52 && twrOk
        ? "drift"
        : "danger";
    const deltaVKms = Number((live.finalVelMs / 1000).toFixed(2));

    return {
      wetMassKg,
      gMs2,
      airRho,
      apparentWeightKN,
      calibratedThrustKN,
      requiredThrustKN,
      dragPeakKN,
      maxQKpa,
      twr,
      maxQStress,
      highMaxQ,
      twrOk,
      apogeeKm,
      deltaVKms,
      fuelBurnMult,
      accelFactor,
      trajectory: live.pts,
      refTrajectory: ref.pts,
      nasaProfile,
      gOk,
      atmOk,
      dragOk,
      stabilityPct,
      stabilityZone,
      nasaCalibratedOk
    };
  }

  calculateScore(
    metrics: ReturnType<MissionManager["computeMetrics"]>,
    bonusPct: number,
    stabilityPctOverride?: number
  ) {
    const multMap: Record<string, number> = {
      m1_cml1: 1.2, m2_cml2: 1.5, m3_cml3: 1.9, m4_cml4: 2.5, m5_mars: 2.2,
      m6_europa: 2.5, m7_dart: 2.4, m8_cassini: 2.6, m9_parker: 2.8, m10_gateway: 3.1,
      m11_juno: 3.3, m12_roman: 3.5, m13_dragonfly: 3.7, m14_voyager: 4.0, m15_marsbase: 4.5
    };
    const mult = multMap[metrics.mission.id] || 2.5;
    const savedRatio = Math.max(0, metrics.mission.budget_max - metrics.totalCost) / Math.max(1, metrics.mission.budget_max);
    const eff = 1 + savedRatio * 0.75;
    const stabilityPct = stabilityPctOverride ?? this.computeFlightPhysics().stabilityPct;
    const nasaMult = 1 + Math.max(0, (stabilityPct - 70) / 30) * 0.4 + (stabilityPct >= 98 ? 0.1 : 0);
    const mgMult = 1 + Math.max(0, bonusPct) / 100;
    const score = Math.round(metrics.totalScience * mult * eff * nasaMult * mgMult);
    return { mult, eff, nasaMult, stabilityPct, mgMult, score };
  }

  calculateCredits(
    missionId: string,
    bonusPct: number,
    alreadyCompleted = false,
    savedRatio = 0,
    stabilityPct = 75
  ) {
    const baseMap: Record<string, number> = {
      m1_cml1: 1200,
      m2_cml2: 2400,
      m3_cml3: 3600,
      m4_cml4: 4800,
      m5_mars: 5800,
      m6_europa: 6800,
      m7_dart: 7800,
      m8_cassini: 8800,
      m9_parker: 9800,
      m10_gateway: 10800,
      m11_juno: 11800,
      m12_roman: 12800,
      m13_dragonfly: 13600,
      m14_voyager: 14400,
      m15_marsbase: 15000
    };
    const base = baseMap[missionId] || 1200;
    const clampedBonus = Math.max(0, Math.min(75, Number(bonusPct) || 0));
    const minigameMult = 1 + clampedBonus / 100;
    const nasaCreditMult = 1 + Math.max(0, (stabilityPct - 75) / 25) * 0.35;
    const budgetCreditMult = 1 + Math.max(0, Math.min(0.6, savedRatio)) * 0.4;
    const replayMult = alreadyCompleted ? 0.25 : 1.0;
    const creditsEarned = Math.round(base * minigameMult * nasaCreditMult * budgetCreditMult * replayMult);
    return { base, clampedBonus, minigameMult, nasaCreditMult, budgetCreditMult, replayMult, creditsEarned };
  }
}

export const audio = new AudioEngine();
export const stateManager = new StateManager("ad_stars_v2");
export const progress = stateManager.progress;
export const config = stateManager.config;
export const flightPhysics = stateManager.physics;
export const missionManager = new MissionManager(stateManager);

export const getMission = () => missionManager.getMission();
export const getVehicle = () => missionManager.getVehicle();
export const getBus = () => missionManager.getBus();
export const getInstruments = () => missionManager.getInstruments();
export const getGround = () => missionManager.getGround();
export const getBaseLevel = () => missionManager.getBaseLevel();
export const getRank = (s?: number) => missionManager.getRank(s);
export const getNextRank = (s?: number) => missionManager.getNextRank(s);
export const computeMetrics = (override?: Partial<SegmentConfig>) => missionManager.computeMetrics(override);
export const computeFlightPhysics = () => missionManager.computeFlightPhysics();

export function renderPixelPortrait(canvasId: string, role: "commander" | "sagan" | "beatriz") {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const W = 48, H = 48;

  const ambTint = role === "beatriz" ? "rgba(51, 255, 102, 0.14)" : role === "commander" ? "rgba(56, 189, 248, 0.16)" : "rgba(245, 158, 11, 0.15)";
  const rimCol = role === "beatriz" ? "#33ff66" : role === "commander" ? "#38bdf8" : "#fbbf24";

  ctx.fillStyle = "#080c14";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#101826";
  ctx.fillRect(3, 3, W - 6, H - 6);
  const bgGrad = ctx.createRadialGradient(14, 14, 2, 24, 24, 28);
  bgGrad.addColorStop(0, ambTint);
  bgGrad.addColorStop(1, "rgba(6, 9, 16, 0)");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(3, 3, W - 6, H - 6);
  ctx.fillStyle = "#1b283d";
  ctx.fillRect(4, 4, W - 8, 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);

  let p: Record<string, unknown>;
  if (role === "commander") {
    const sk = getSkin(progress.skinId);
    p = {
      suit: sk.torso, suitShade: sk.torsoShade, collar: sk.collar || sk.shirt, accent: sk.accent || "#f97316",
      skin: sk.skin || "#eab892", skinShadow: sk.skinShade || "#c78b62", hair: "#4b2e1b",
      visor: sk.mode === "helmet", translucentFace: sk.translucentFace,
      helmetColor: sk.helmet || "#f1f5f9", helmetHi: sk.helmetHi || "#ffffff", helmetShade: sk.helmetShade || "#94a3b8",
      visorDeep: sk.visorDeep || "#082f49", visorMid: sk.visorMid || "#0369a1", visorColor: sk.visor || "#0ea5e9",
      visorGlint: sk.visorGlint || "#e0f2fe", badgeColor: sk.badge || "#facc15"
    };
  } else {
    const palettes = {
      sagan: { suit: "#1e293b", suitShade: "#0f172a", collar: "#f59e0b", accent: "#38bdf8", skin: "#e2b48d", skinShadow: "#b9845c", hair: "#cbd5e1", glasses: true, badgeColor: "#ef4444" },
      beatriz: { suit: "#065f46", suitShade: "#064e3b", collar: "#fbbf24", accent: "#33ff66", skin: "#d99e73", skinShadow: "#a96e46", hair: "#291810", headset: true, badgeColor: "#33ff66" }
    };
    p = palettes[role] || palettes.sagan;
  }

  ctx.fillStyle = p.suit as string;
  ctx.fillRect(8, 32, 32, 16);
  ctx.fillRect(10, 31, 28, 17);
  ctx.fillStyle = p.suitShade as string;
  ctx.fillRect(30, 33, 10, 15);
  ctx.fillStyle = p.accent as string;
  ctx.fillRect(8, 34, 4, 2);
  ctx.fillRect(36, 34, 4, 2);
  ctx.fillStyle = p.collar as string;
  ctx.fillRect(15, 30, 18, 5);
  ctx.fillStyle = "#334155";
  ctx.fillRect(19, 36, 10, 9);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(20, 37, 8, 7);
  ctx.fillStyle = "#ef4444"; ctx.fillRect(21, 38, 2, 2);
  ctx.fillStyle = "#33ff66"; ctx.fillRect(25, 38, 2, 2);
  ctx.fillStyle = "#38bdf8"; ctx.fillRect(21, 41, 6, 2);
  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(11, 38, 5, 5);
  ctx.fillStyle = (p.badgeColor as string) || "#ef4444";
  ctx.fillRect(12, 40, 4, 1);

  if (p.visor) {
    ctx.fillStyle = p.helmetColor as string;
    ctx.fillRect(13, 6, 22, 24);
    ctx.fillRect(11, 9, 26, 18);
    ctx.fillRect(10, 12, 28, 12);
    ctx.fillStyle = p.helmetHi as string;
    ctx.fillRect(14, 7, 14, 3);
    ctx.fillRect(12, 10, 3, 6);
    ctx.fillStyle = p.helmetShade as string;
    ctx.fillRect(31, 10, 6, 17);
    ctx.fillRect(13, 27, 22, 3);
    ctx.fillRect(14, 12, 20, 13);
    ctx.fillStyle = p.visorDeep as string;
    ctx.fillRect(15, 13, 18, 11);
    ctx.fillStyle = p.visorMid as string;
    ctx.fillRect(15, 15, 17, 7);
    ctx.fillStyle = p.visorColor as string;
    ctx.fillRect(16, 17, 14, 4);
    if (p.translucentFace) {
      ctx.fillStyle = "rgba(255, 225, 200, 0.22)";
      ctx.fillRect(18, 16, 11, 6);
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.fillRect(19, 18, 2, 2);
      ctx.fillRect(26, 18, 2, 2);
    }
    ctx.fillStyle = p.visorGlint as string;
    ctx.fillRect(16, 14, 6, 2);
    ctx.fillRect(16, 16, 2, 3);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(17, 14, 3, 1);
    ctx.fillRect(28, 20, 3, 2);
  } else {
    ctx.fillStyle = p.skinShadow as string;
    ctx.fillRect(20, 27, 8, 5);
    ctx.fillStyle = p.skin as string;
    ctx.fillRect(15, 11, 18, 17);
    ctx.fillStyle = p.skinShadow as string;
    ctx.fillRect(29, 12, 4, 16);
    ctx.fillRect(16, 25, 16, 3);
    ctx.fillStyle = p.hair as string;
    ctx.fillRect(14, 7, 20, 7);
    ctx.fillRect(13, 11, 4, 7);
    ctx.fillRect(31, 11, 4, 7);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(18, 18, 3, 3);
    ctx.fillRect(26, 18, 3, 3);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(18, 18, 1, 1);
    ctx.fillRect(26, 18, 1, 1);
    if (p.glasses) {
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.strokeRect(16.5, 16.5, 6, 5);
      ctx.strokeRect(24.5, 16.5, 6, 5);
    }
    ctx.fillStyle = "#8a5036";
    ctx.fillRect(21, 24, 6, 1);
  }
  if (p.headset) {
    ctx.fillStyle = "#33ff66";
    ctx.fillRect(12, 16, 3, 6);
    ctx.fillRect(13, 22, 6, 1);
  }

  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = rimCol;
  ctx.fillRect(8, 32, 1, 14);
  if (p.visor) {
    ctx.fillRect(11, 10, 1, 16);
    ctx.fillRect(14, 7, 10, 1);
  } else {
    ctx.fillRect(15, 11, 1, 15);
    ctx.fillRect(15, 7, 8, 1);
  }
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = rimCol;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
