import {
  nasa_database,
  GROUND_SEGMENT_STATIONS,
  PLAYER_SKINS,
  getSkin,
  audio,
  stateManager,
  progress,
  config,
  missionManager,
  getMission,
  getVehicle,
  getBaseLevel,
  getRank,
  getNextRank,
  computeMetrics,
  formatUsd,
  formatUsdDelta,
  flightPhysics,
  computeFlightPhysics,
  renderPixelPortrait,
  type GravityRegime,
  type SegmentConfig
} from "./data";
import {
  CommandCenter,
  drawPixelEngineer24x32,
  type StationDef
} from "./commandCenter";
import {
  TelemetryLaunchRenderer,
  TelemetryTrophyRenderer,
  TelemetryWorkbenchPreviewRenderer
} from "./ps1Renderers";
import {
  mgState,
  initMinigameHooks,
  startMissionMinigame,
  minigameAction,
  updateMissionMinigame,
  finishMissionMinigameAndEvaluate,
  inspectItemOnCRT,
  cleanupCRT,
  type InspectableItem
} from "./minigames";
import {
  getLang,
  onLangChange,
  getLocVehicle,
  getLocBus,
  getLocInstrument,
  getLocGround,
  getLocMission,
  getLocRankTitle,
  getLocSkin,
  t
} from "./i18n";

export function mountGame(): () => void {
  let base2D: CommandCenter | null = null;
  let visor3D: TelemetryLaunchRenderer | null = null;
  let trophy3D: TelemetryTrophyRenderer | null = null;
  let preview3D: TelemetryWorkbenchPreviewRenderer | null = null;
  let currentStation: string | null = null;
  let selectedTrophyId = "m1_cml1";
  let disposed = false;
  let lastInspected: { kind: string; item: InspectableItem } | null = null;
  let workbenchHoverOverride: Partial<SegmentConfig> | null = null;
  let impactRafId = 0;
  let pendingImpactData: { cur: ReturnType<typeof computeMetrics>; preview: ReturnType<typeof computeMetrics> } | null = null;
  let physicsRafId = 0;

  const modalState: { open: boolean; openTimer: number | null; closeTimer: number | null } = {
    open: false,
    openTimer: null,
    closeTimer: null
  };

  function isModalOpen(): boolean {
    return modalState.open || modalState.openTimer !== null;
  }

  function ensurePreview3D(): TelemetryWorkbenchPreviewRenderer | null {
    if (preview3D || disposed) return preview3D;
    const previewCanvas = document.getElementById("preview-3d-canvas") as HTMLCanvasElement | null;
    if (!previewCanvas) return null;
    preview3D = new TelemetryWorkbenchPreviewRenderer(previewCanvas);
    const target = lastInspected || { kind: "Launch Segment", item: getVehicle() };
    lastInspected = target;
    preview3D.setItem(target.kind, target.item.id, config.missionId);
    const previewTag = document.getElementById("preview-3d-tag");
    const mNum = config.missionId.match(/m(\d+)/)?.[1]?.padStart(2, "0") || "01";
    if (previewTag) previewTag.textContent = `M${mNum} · ${target.item.id.toUpperCase()}`;
    return preview3D;
  }

  function inspectAndTrack(kind: string, item: InspectableItem | undefined) {
    if (!item) return;
    lastInspected = { kind, item };
    inspectItemOnCRT(kind, item);
  }

  function scheduleWorkbenchImpactCanvas(
    cur: ReturnType<typeof computeMetrics>,
    preview: ReturnType<typeof computeMetrics>
  ) {
    pendingImpactData = { cur, preview };
    if (impactRafId) return;
    impactRafId = requestAnimationFrame(() => {
      impactRafId = 0;
      if (disposed || !pendingImpactData) return;
      renderWorkbenchImpactCanvas(pendingImpactData.cur, pendingImpactData.preview);
    });
  }

  function renderWorkbenchImpactCanvas(
    cur: ReturnType<typeof computeMetrics>,
    preview: ReturnType<typeof computeMetrics>
  ) {
    const cvs = document.getElementById("wb-impact-canvas") as HTMLCanvasElement | null;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const W = cvs.width;
    const H = cvs.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#040c18";
    ctx.fillRect(0, 0, W, H);

    // Subtle telemetry grid
    ctx.strokeStyle = "#0f223a";
    ctx.lineWidth = 1;
    for (let x = 80; x < W; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H - 20);
      ctx.stroke();
    }

    const isHover = workbenchHoverOverride !== null;
    const rows = [
      {
        label: t("wbImpactBudget"),
        curVal: cur.totalCost,
        prevVal: preview.totalCost,
        limit: cur.mission.budget_max,
        ok: preview.checks.budgetOk,
        higherIsBetter: false,
        isUsd: true,
        unit: "",
        dec: 1
      },
      {
        label: t("wbImpactMass"),
        curVal: cur.totalMass,
        prevVal: preview.totalMass,
        limit: preview.vehicle.payload_max_kg,
        ok: preview.checks.massOk,
        higherIsBetter: false,
        isUsd: false,
        unit: "kg",
        dec: 0
      },
      {
        label: t("wbImpactPower"),
        curVal: cur.instPower,
        prevVal: preview.instPower,
        limit: preview.bus.power_gen_w,
        ok: preview.checks.powerOk,
        higherIsBetter: false,
        isUsd: false,
        unit: "W",
        dec: 0
      },
      {
        label: t("wbImpactScience"),
        curVal: cur.totalScience,
        prevVal: preview.totalScience,
        limit: cur.mission.target_science,
        ok: preview.checks.scienceOk,
        higherIsBetter: true,
        isUsd: false,
        unit: "p",
        dec: 0
      }
    ];

    const barX = 72;
    const barW = 192;
    const scaleMax = 1.25; // 100% target line sits at 80% of bar width

    rows.forEach((row, idx) => {
      const y = 7 + idx * 22;
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "left";
      ctx.fillText(row.label, 6, y + 10);

      // Bar slot
      ctx.fillStyle = "#0a1628";
      ctx.fillRect(barX, y + 2, barW, 11);
      ctx.strokeStyle = "#1e3a5f";
      ctx.strokeRect(barX, y + 2, barW, 11);

      const curRatio = Math.max(0, Math.min(scaleMax, row.curVal / Math.max(1, row.limit)));
      const prevRatio = Math.max(0, Math.min(scaleMax, row.prevVal / Math.max(1, row.limit)));

      // Base current fill
      const baseColor = row.higherIsBetter
        ? cur.totalScience >= row.limit
          ? "#10b981"
          : "#38bdf8"
        : row.curVal <= row.limit
          ? "#10b981"
          : "#f43f5e";
      ctx.fillStyle = isHover ? "rgba(148,163,184,0.35)" : baseColor;
      ctx.fillRect(barX + 1, y + 3, Math.round(((barW - 2) * curRatio) / scaleMax), 9);

      // Hover what-if ghost overlay
      if (isHover) {
        const pvColor = row.ok ? "#34d399" : "#fb7185";
        ctx.fillStyle = pvColor;
        ctx.fillRect(barX + 1, y + 5, Math.round(((barW - 2) * prevRatio) / scaleMax), 5);
      }

      // 100% nominal threshold tick
      const threshX = barX + Math.round(((barW - 2) * 1.0) / scaleMax);
      ctx.strokeStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(threshX, y);
      ctx.lineTo(threshX, y + 15);
      ctx.stroke();

      // Right value / delta readout
      const delta = row.prevVal - row.curVal;
      ctx.textAlign = "right";
      if (isHover && Math.abs(delta) > 0.05) {
        const sign = delta > 0 ? "+" : "-";
        const good = row.higherIsBetter ? delta > 0 : delta < 0;
        ctx.fillStyle = good ? "#34d399" : "#fbbf24";
        const deltaTxt = row.isUsd ? formatUsdDelta(delta) : `${sign}${Math.abs(delta).toFixed(row.dec)}${row.unit}`;
        ctx.fillText(deltaTxt, W - 6, y + 10);
      } else {
        ctx.fillStyle = row.ok ? "#cbd5e1" : "#fda4af";
        const valTxt = row.isUsd ? formatUsd(row.prevVal) : `${row.prevVal.toFixed(row.dec)}${row.unit}`;
        ctx.fillText(valTxt, W - 6, y + 10);
      }
    });

    // Bottom subsystem status bar (Rad Tier, Ground Link, Architecture, GO)
    const footY = 96;
    ctx.fillStyle = "#071324";
    ctx.fillRect(0, footY, W, H - footY);
    ctx.strokeStyle = "#1e3a5f";
    ctx.beginPath();
    ctx.moveTo(0, footY);
    ctx.lineTo(W, footY);
    ctx.stroke();

    const active = isHover ? preview : cur;
    const busTier = active.bus.radTier || (active.bus.id === "bus_deepspace" || active.bus.id === "bus_orion" || active.bus.id === "bus_hls" ? 3 : active.bus.id === "bus_orbiter" ? 2 : 1);
    const drawBadge = (x: number, text: string, ok: boolean) => {
      ctx.fillStyle = ok ? "#064e3b" : "#4c0519";
      ctx.fillRect(x, footY + 3, 82, 14);
      ctx.strokeStyle = ok ? "#34d399" : "#fb7185";
      ctx.strokeRect(x, footY + 3, 82, 14);
      ctx.fillStyle = ok ? "#a7f3d0" : "#fecdd3";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(text, x + 41, footY + 13);
    };

    const groundTag =
      active.ground.id === "gs_dsn"
        ? "GATEWAY+DSN"
        : active.ground.id === "gs_egs"
          ? "EGS 39B"
          : "NSN LEO";

    drawBadge(6, `RAD T${busTier}/T${active.requiredRadTier}`, active.checks.radiationOk);
    drawBadge(94, groundTag, active.checks.dsnOk);
    drawBadge(182, active.checks.waveOk ? "BAND OK" : "BAND NO", active.checks.waveOk);
    drawBadge(272, active.isGo ? "STATUS: GO" : `${active.viabilityPct}% HOLD`, active.isGo);
  }

  function updatePromptUI(st: StationDef | null) {
    const el = document.getElementById("station-prompt");
    const labelEl = document.getElementById("station-prompt-label");
    if (!el || !labelEl) return;
    if (!st || isModalOpen()) {
      el.classList.remove("is-visible");
      return;
    }
    labelEl.textContent = st.label;
    el.classList.add("is-visible");
  }

  function getLocale(): string {
    return getLang() === "en" ? "en-US" : "pt-BR";
  }

  function updateHUD() {
    const m = computeMetrics();
    const locMission = getLocMission(m.mission);
    const lvl = getBaseLevel();
    const rank = getRank(progress.totalScore);
    const locale = getLocale();

    const missionNameEl = document.getElementById("hud-mission-name");
    if (missionNameEl) missionNameEl.textContent = `${locMission.cml.split(" - ")[0]} · ${locMission.title}`;

    const costEl = document.getElementById("hud-cost");
    if (costEl) {
      costEl.textContent = formatUsd(m.totalCost);
      costEl.className = m.checks.budgetOk ? "text-emerald-400" : "text-rose-400";
    }
    const budgetMaxEl = document.getElementById("hud-budget-max");
    if (budgetMaxEl) budgetMaxEl.textContent = formatUsd(m.mission.budget_max);

    const massEl = document.getElementById("hud-mass");
    if (massEl) {
      massEl.textContent = `${m.totalMass} kg`;
      massEl.className = m.checks.massOk ? "text-slate-200" : "text-rose-400";
    }

    const pEl = document.getElementById("hud-power");
    if (pEl) {
      pEl.textContent = `${m.netPower >= 0 ? "+" : ""}${m.netPower} W`;
      pEl.className = m.checks.powerOk ? "text-emerald-400" : "text-rose-400";
    }

    const sEl = document.getElementById("hud-science");
    if (sEl) {
      sEl.textContent = `${m.totalScience} pts`;
      sEl.className = m.checks.scienceOk ? "text-cyan-300" : "text-rose-400";
    }

    const rankEl = document.getElementById("hud-rank");
    if (rankEl) rankEl.textContent = getLocRankTitle(rank.title);

    const supreme = missionManager.isSupremeCommand();
    const baseLevelEl = document.getElementById("hud-base-level");
    if (baseLevelEl) baseLevelEl.textContent = supreme ? t("baseSupremo") : `${t("baseLvlPrefix")} ${lvl}`;

    const creditsEl = document.getElementById("hud-credits");
    if (creditsEl) creditsEl.textContent = `$${progress.credits.toLocaleString(locale)}`;

    const scoreTotalEl = document.getElementById("hud-score-total");
    if (scoreTotalEl) scoreTotalEl.textContent = `${progress.totalScore.toLocaleString(locale)} pts`;

    const evoEl = document.getElementById("base-evolution-desc");
    if (evoEl) {
      evoEl.textContent =
        supreme ? t("evoSupreme") :
        lvl === 1 ? t("evo1") :
        lvl === 2 ? t("evo2") :
        t("evo3");
    }
  }

  function renderQuestsPanel() {
    const grid = document.getElementById("quests-grid");
    const countEl = document.getElementById("quest-completed-count");
    if (!grid) return;
    const locale = getLocale();
    if (countEl) {
      countEl.textContent = `${progress.completedMissions.length} / ${nasa_database.missions_cml.length}`;
    }
    grid.innerHTML = nasa_database.missions_cml.map((rawM) => {
      const m = getLocMission(rawM);
      const active = config.missionId === m.id;
      const done = progress.completedMissions.includes(m.id);
      const creditInfo = missionManager.calculateCredits(m.id, 0, done);
      return `
        <div class="pixel-panel-dark p-4 flex flex-col justify-between gap-3 ${active ? "border-amber-400" : ""}">
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-amber-300 font-bold">${m.cml}</span>
              <span class="${done ? "text-emerald-400" : "text-slate-400"}">${done ? t("completed") : t("available")}</span>
            </div>
            <h4 class="font-pixel text-xs text-white leading-relaxed">${m.title}</h4>
            <div class="flex items-center justify-between gap-2 text-xs">
              <span class="text-cyan-300 truncate">${t("nasaRef")} ${m.real_nasa_equivalent}</span>
              <span class="font-mono tabular-nums text-amber-300 font-bold shrink-0">+$${creditInfo.creditsEarned.toLocaleString(locale)}${done ? " (25%)" : ""}</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">${m.briefing}</p>
          </div>
          <div class="pt-3 border-t border-slate-800 space-y-3">
            <div class="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
              <div><div class="text-slate-400">${t("budgetShort")}</div><div class="text-white font-bold">${formatUsd(m.budget_max)}</div></div>
              <div><div class="text-slate-400">${t("minScienceShort")}</div><div class="text-white font-bold">${m.target_science} pts</div></div>
              <div><div class="text-slate-400">${t("bandShort")}</div><div class="text-emerald-300 truncate">${m.required_wavelength}</div></div>
            </div>
            <button type="button" data-select-mission="${m.id}" class="pixel-btn w-full py-2 px-3 font-pixel text-[9px] ${active ? "bg-amber-400 text-black" : "bg-hull-800 text-slate-200"}">
              ${active ? t("selectedGoWb") : t("activateMission")}
            </button>
          </div>
        </div>`;
    }).join("");
  }

  function updateWorkbenchMetersOnly() {
    const m = computeMetrics();
    const hoverM = workbenchHoverOverride ? computeMetrics(workbenchHoverOverride) : m;
    const locMission = getLocMission(m.mission);
    const locale = getLocale();

    const hoverBadge = document.getElementById("wb-hover-delta");
    if (hoverBadge) {
      if (workbenchHoverOverride) {
        hoverBadge.classList.remove("hidden");
        hoverBadge.textContent = t("wbHoverPreviewTag");
      } else {
        hoverBadge.classList.add("hidden");
      }
    }

    const wbShort = document.getElementById("wb-mission-short");
    if (wbShort) wbShort.textContent = `${locMission.cml.split(" - ")[0]} · ${locMission.title}`;
    const stEl = document.getElementById("wb-overall-status");
    if (stEl) {
      stEl.textContent = m.isGo ? t("approved") : t("pending");
      stEl.className = `font-pixel text-[10px] ${m.isGo ? "text-emerald-400" : "text-rose-400"}`;
    }

    const viabPctEl = document.getElementById("wb-viability-pct");
    if (viabPctEl) {
      viabPctEl.textContent = `${hoverM.viabilityPct}%`;
      viabPctEl.className = `font-bold ${hoverM.isGo ? "text-emerald-400" : hoverM.viabilityPct >= 75 ? "text-amber-300" : "text-rose-400"}`;
    }
    const viabBar = document.getElementById("wb-viability-bar");
    if (viabBar) {
      viabBar.style.width = `${Math.max(5, hoverM.viabilityPct)}%`;
      viabBar.className = `h-full transition-all duration-150 ${hoverM.isGo ? "bg-emerald-400" : hoverM.viabilityPct >= 75 ? "bg-amber-400" : "bg-rose-500"}`;
    }

    const wbBudgetVal = document.getElementById("wb-budget-val");
    if (wbBudgetVal) wbBudgetVal.textContent = `${formatUsd(m.totalCost)} / ${formatUsd(m.mission.budget_max)}`;
    const bBar = document.getElementById("wb-budget-bar");
    if (bBar) {
      bBar.style.width = `${Math.min(100, (m.totalCost / m.mission.budget_max) * 100)}%`;
      bBar.className = `h-full ${m.checks.budgetOk ? "bg-emerald-400" : "bg-rose-500"}`;
    }

    const split = hoverM.totalCostSplit;
    const splitSum = Math.max(0.01, hoverM.totalCost);
    const setSplit = (barId: string, lblId: string, val: number) => {
      const bar = document.getElementById(barId);
      const lbl = document.getElementById(lblId);
      if (bar) bar.style.width = `${((val / splitSum) * 100).toFixed(1)}%`;
      if (lbl) lbl.textContent = formatUsd(val);
    };
    setSplit("wb-split-launch-bar", "wb-split-launch", split.launch);
    setSplit("wb-split-bus-bar", "wb-split-bus", split.bus);
    setSplit("wb-split-inst-bar", "wb-split-inst", split.instruments);
    setSplit("wb-split-ground-bar", "wb-split-ground", split.ground);

    const wbMassVal = document.getElementById("wb-mass-val");
    if (wbMassVal) wbMassVal.textContent = `${m.totalMass} / ${m.vehicle.payload_max_kg.toLocaleString(locale)} kg`;
    const mBar = document.getElementById("wb-mass-bar");
    if (mBar) {
      mBar.style.width = `${Math.max(4, Math.min(100, (m.totalMass / m.vehicle.payload_max_kg) * 100))}%`;
      mBar.className = `h-full ${m.checks.massOk ? "bg-emerald-400" : "bg-rose-500"}`;
    }

    const wbPowerVal = document.getElementById("wb-power-val");
    if (wbPowerVal) wbPowerVal.textContent = `${m.instPower} W / ${m.bus.power_gen_w} W`;
    const pBar = document.getElementById("wb-power-bar");
    if (pBar) {
      pBar.style.width = `${Math.max(4, Math.min(100, (m.instPower / m.bus.power_gen_w) * 100))}%`;
      pBar.className = `h-full ${m.checks.powerOk ? "bg-emerald-400" : "bg-rose-500"}`;
    }

    const sciEl = document.getElementById("wb-science-val");
    if (sciEl) {
      sciEl.textContent = `${m.totalScience} / ${m.mission.target_science} pts`;
      sciEl.className = m.checks.scienceOk ? "text-emerald-400" : "text-rose-400";
    }

    const waveEl = document.getElementById("wb-wave-val");
    if (waveEl) {
      waveEl.textContent = `${locMission.required_wavelength} (${m.checks.waveOk ? t("ok") : t("missing")})`;
      waveEl.className = m.checks.waveOk ? "text-emerald-400" : "text-rose-400";
    }

    const groundEl = document.getElementById("wb-ground-val");
    if (groundEl) {
      const locG = getLocGround(m.ground);
      const gsTag =
        locG.id === "gs_dsn"
          ? "Gateway + DSN"
          : locG.id === "gs_egs"
            ? "EGS · Pad 39B"
            : "NSN · LEO";
      groundEl.textContent = `${gsTag} (${formatUsd(m.ground.cost)})`;
      groundEl.className = m.checks.dsnOk ? "text-cyan-300" : "text-rose-400";
    }

    const warn = document.getElementById("wb-warnings");
    if (warn) {
      if (m.reasons.length) {
        warn.classList.remove("hidden");
        warn.innerHTML = m.reasons.map((r) => `<div>• ${r}</div>`).join("");
      } else {
        warn.classList.add("hidden");
        warn.innerHTML = "";
      }
    }

    scheduleWorkbenchImpactCanvas(m, hoverM);
  }

  function renderWorkbenchPanel() {
    const m = computeMetrics();
    const locMission = getLocMission(m.mission);
    const locale = getLocale();

    const lvEl = document.getElementById("list-launch-segment");
    const busEl = document.getElementById("list-space-buses");
    const instEl = document.getElementById("list-space-instruments");
    const gsEl = document.getElementById("list-ground-segment");
    const userCard = document.getElementById("user-segment-card");
    if (!lvEl || !busEl || !instEl || !gsEl || !userCard) return;

    lvEl.innerHTML = nasa_database.launch_segment.map((rawV) => {
      const v = getLocVehicle(rawV);
      const active = config.vehicleId === v.id;
      return `
        <button type="button" data-lv="${v.id}" class="w-full text-left p-2.5 border-2 transition-colors flex items-center justify-between gap-3 ${active ? "bg-hull-800 border-amber-400" : "bg-hull-900 border-slate-800 hover:border-slate-500"}">
          <div class="min-w-0">
            <div class="text-sm font-bold text-white truncate">${v.name}</div>
            <div class="text-xs text-slate-400 font-mono tabular-nums">${t("payloadLabel")} ${v.payload_max_kg.toLocaleString(locale)} kg · ${t("wbIspLabel")} ${v.isp_s || 348}s · ${t("relLabel")} ${(v.reliability * 100).toFixed(0)}%</div>
          </div>
          <div class="font-mono tabular-nums text-sm font-bold text-amber-300 shrink-0">${formatUsd(v.cost)}</div>
        </button>`;
    }).join("");

    busEl.innerHTML = nasa_database.space_segment_buses.map((rawB) => {
      const b = getLocBus(rawB);
      const active = config.busId === b.id;
      const tier = b.radTier || (b.id === "bus_deepspace" || b.id === "bus_orion" || b.id === "bus_hls" ? 3 : b.id === "bus_orbiter" ? 2 : 1);
      const tierOk = tier >= m.requiredRadTier;
      return `
        <button type="button" data-bus="${b.id}" class="w-full text-left p-2.5 border-2 transition-colors flex items-center justify-between gap-3 ${active ? "bg-hull-800 border-amber-400" : "bg-hull-900 border-slate-800 hover:border-slate-500"}">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-white truncate">${b.name}</span>
              <span class="font-mono text-[10px] px-1 border shrink-0 ${tierOk ? "border-emerald-500/60 text-emerald-300 bg-emerald-950/40" : "border-rose-500/60 text-rose-300 bg-rose-950/40"}">RAD T${tier}</span>
            </div>
            <div class="text-xs text-slate-400 font-mono tabular-nums">${t("dryMassLabel")} ${b.dry_mass_kg.toLocaleString(locale)} kg · ${t("energyLabel")} ${b.power_gen_w.toLocaleString(locale)} W</div>
          </div>
          <div class="font-mono tabular-nums text-sm font-bold text-amber-300 shrink-0">${formatUsd(b.cost)}</div>
        </button>`;
    }).join("");

    instEl.innerHTML = nasa_database.space_segment_instruments.map((rawInst) => {
      const inst = getLocInstrument(rawInst);
      const active = config.instrumentIds.includes(inst.id);
      return `
        <button type="button" data-inst="${inst.id}" class="w-full text-left p-2.5 border-2 transition-colors flex items-center justify-between gap-3 ${active ? "bg-emerald-950/40 border-emerald-400" : "bg-hull-900 border-slate-800 hover:border-slate-500"}">
          <div class="min-w-0">
            <div class="text-sm font-bold text-white truncate">${active ? "[✓] " : "[ ] "}${inst.name}</div>
            <div class="text-xs text-slate-400 font-mono tabular-nums">${inst.mass_kg} kg · ${inst.power_w} W · +${inst.science_pts} pts · ${inst.wavelength}</div>
          </div>
          <div class="font-mono tabular-nums text-sm font-bold text-emerald-300 shrink-0">${formatUsd(inst.cost)}</div>
        </button>`;
    }).join("");

    gsEl.innerHTML = GROUND_SEGMENT_STATIONS.map((rawG) => {
      const g = getLocGround(rawG);
      const active = config.groundId === g.id;
      return `
        <button type="button" data-gs="${g.id}" class="w-full text-left p-2 border ${active ? "bg-hull-800 border-cyan-400 text-white" : "bg-hull-900 border-slate-800 text-slate-300 hover:border-slate-500"} text-xs">
          <div class="flex items-center justify-between gap-2">
            <span class="font-bold truncate">${g.name}</span>
            <span class="font-mono text-amber-300 shrink-0">${formatUsd(g.cost)} ${t("wbCostOpsLabel")}</span>
          </div>
          <div class="text-cyan-300 text-[11px]">${g.band}</div>
        </button>`;
    }).join("");

    userCard.innerHTML = `
      <div class="font-bold text-amber-300">${locMission.title}</div>
      <div>${t("scienceGoal")} <span class="text-white">${locMission.target_science} pts</span></div>
      <div>${t("requiredBandGoal")} <span class="text-emerald-300">${locMission.required_wavelength}</span></div>
      <div>${t("protocolGoal")} <span class="text-cyan-300">${locMission.minigame}</span></div>
    `;

    updateWorkbenchMetersOnly();
  }

  function appendFlightLog(msg: string) {
    const log = document.getElementById("flight-log");
    if (!log) return;
    const d = document.createElement("div");
    d.textContent = `> ${msg}`;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  function drawForceArrow(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    label: string,
    align: "left" | "right" = "left"
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 3) return;
    const ang = Math.atan2(dy, dx);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const head = 5;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang - 0.55), y2 - head * Math.sin(ang - 0.55));
    ctx.lineTo(x2 - head * Math.cos(ang + 0.55), y2 - head * Math.sin(ang + 0.55));
    ctx.closePath();
    ctx.fill();

    ctx.font = "bold 8px monospace";
    ctx.textAlign = align;
    ctx.fillText(label, align === "left" ? x2 + 4 : x2 - 4, y2 + 3);
  }

  function schedulePhysicsRender() {
    if (physicsRafId) return;
    physicsRafId = requestAnimationFrame(() => {
      physicsRafId = 0;
      if (disposed) return;
      renderPhysicsSimulator();
      updateLaunchControlsUI();
      syncFlightTelemetry();
    });
  }

  function renderPhysicsSimulator() {
    const phys = computeFlightPhysics();
    const prof = phys.nasaProfile;
    const isEn = getLang() === "en";
    const inFlight = Boolean(visor3D && visor3D.flight.phase !== "PAD");

    const simCard = document.getElementById("phys-sim-card");
    if (simCard) {
      simCard.className = `pixel-panel-dark p-3.5 space-y-2.5 transition-colors ${
        phys.stabilityZone === "danger"
          ? "phys-unstable-frame border-rose-500"
          : phys.stabilityZone === "drift"
            ? "border-amber-400/80"
            : "border-emerald-500/80"
      }`;
    }

    const reseedBtn = document.getElementById("btn-phys-reseed") as HTMLButtonElement | null;
    if (reseedBtn) reseedBtn.disabled = inFlight;

    const envEl = document.getElementById("phys-nasa-env");
    const noteEl = document.getElementById("phys-nasa-note");
    if (envEl) envEl.textContent = isEn ? prof.envEn : prof.envPt;
    if (noteEl) noteEl.textContent = isEn ? prof.noteEn : prof.notePt;

    const stabPctEl = document.getElementById("phys-stability-pct");
    const stabBarEl = document.getElementById("phys-stability-bar");
    if (stabPctEl) {
      stabPctEl.textContent = `${phys.stabilityPct}%`;
      stabPctEl.className =
        phys.stabilityZone === "ideal"
          ? "text-emerald-300"
          : phys.stabilityZone === "drift"
            ? "text-amber-300"
            : "text-rose-400";
    }
    if (stabBarEl) {
      stabBarEl.style.width = `${Math.max(4, phys.stabilityPct)}%`;
      stabBarEl.className = `h-full transition-all duration-150 ${
        phys.stabilityZone === "ideal"
          ? "bg-emerald-400"
          : phys.stabilityZone === "drift"
            ? "bg-amber-400"
            : "bg-rose-500"
      }`;
    }

    const gravInput = document.getElementById("phys-gravity") as HTMLInputElement | null;
    const atmInput = document.getElementById("phys-atm") as HTMLInputElement | null;
    const dragInput = document.getElementById("phys-drag") as HTMLInputElement | null;
    const throtInput = document.getElementById("phys-throttle") as HTMLInputElement | null;

    if (gravInput) {
      gravInput.value = flightPhysics.gravityG.toFixed(2);
      gravInput.disabled = inFlight;
    }
    if (atmInput) {
      atmInput.value = flightPhysics.atmDensity.toFixed(2);
      atmInput.disabled = inFlight;
    }
    if (dragInput) {
      dragInput.value = flightPhysics.dragCoeff.toFixed(2);
      dragInput.disabled = inFlight;
    }
    if (throtInput) {
      throtInput.value = String(Math.round(flightPhysics.throttlePct));
      throtInput.disabled = inFlight;
    }

    // Visual NASA target zone bars on each slider track
    const setZoneBar = (elId: string, minVal: number, maxVal: number, tgt: number, tol: number, ok: boolean) => {
      const z = document.getElementById(elId);
      if (!z) return;
      const span = maxVal - minVal;
      const leftPct = Math.max(0, Math.min(92, ((tgt - tol - minVal) / span) * 100));
      const rightPct = Math.max(leftPct + 6, Math.min(100, ((tgt + tol - minVal) / span) * 100));
      z.style.left = `${leftPct.toFixed(1)}%`;
      z.style.width = `${Math.max(6, rightPct - leftPct).toFixed(1)}%`;
      z.className = `absolute inset-y-0 ${ok ? "bg-emerald-400" : "bg-amber-400/80"}`;
    };
    setZoneBar("phys-g-zone", 0.05, 2.0, prof.targetG, prof.tolG, phys.gOk);
    setZoneBar("phys-atm-zone", 0, 1.5, prof.targetAtm, prof.tolAtm, phys.atmOk);
    setZoneBar("phys-drag-zone", 0.15, 1.2, prof.targetDrag, prof.tolDrag, phys.dragOk);

    const gTgtEl = document.getElementById("phys-g-target");
    const atmTgtEl = document.getElementById("phys-atm-target");
    const dragTgtEl = document.getElementById("phys-drag-target");
    if (gTgtEl) gTgtEl.textContent = `${t("physTargetTag")} ${prof.targetG.toFixed(2)}G`;
    if (atmTgtEl) atmTgtEl.textContent = `${t("physTargetTag")} ${prof.targetAtm.toFixed(2)}`;
    if (dragTgtEl) dragTgtEl.textContent = `${t("physTargetTag")} ${prof.targetDrag.toFixed(2)}`;

    document.querySelectorAll<HTMLButtonElement>("[data-phys-preset]").forEach((btn) => {
      const preset = btn.getAttribute("data-phys-preset");
      const active = preset === flightPhysics.regime;
      btn.disabled = inFlight;
      btn.className = `phys-preset-btn pixel-btn py-1.5 px-2 font-pixel text-[8px] ${
        active ? "bg-cyan-400 text-black" : "bg-hull-800 text-slate-200"
      } ${inFlight ? "opacity-50 cursor-not-allowed" : ""}`;
    });

    const gravValEl = document.getElementById("phys-gravity-val");
    const atmValEl = document.getElementById("phys-atm-val");
    const dragValEl = document.getElementById("phys-drag-val");
    const throtValEl = document.getElementById("phys-throttle-val");
    if (gravValEl) {
      gravValEl.textContent = `${flightPhysics.gravityG.toFixed(2)} G (${phys.gMs2.toFixed(1)} m/s²)`;
      gravValEl.className = `font-bold ${phys.gOk ? "text-emerald-300" : "text-rose-400"}`;
    }
    if (atmValEl) {
      atmValEl.textContent = `${flightPhysics.atmDensity.toFixed(2)} ATM`;
      atmValEl.className = `font-bold ${phys.atmOk ? "text-emerald-300" : "text-rose-400"}`;
    }
    if (dragValEl) {
      dragValEl.textContent = `${flightPhysics.dragCoeff.toFixed(2)} Cd`;
      dragValEl.className = `font-bold ${phys.dragOk ? "text-emerald-300" : "text-amber-300"}`;
    }
    if (throtValEl) throtValEl.textContent = `${Math.round(flightPhysics.throttlePct)}%`;

    const weightEl = document.getElementById("phys-weight-val");
    const reqEl = document.getElementById("phys-req-val");
    const thrustEl = document.getElementById("phys-thrust-val");
    const twrEl = document.getElementById("phys-twr-val");
    const dragPeakEl = document.getElementById("phys-dragpeak-val");
    const apogeeEl = document.getElementById("phys-apogee-val");

    if (weightEl) weightEl.textContent = `${Math.round(phys.apparentWeightKN)} kN`;
    if (reqEl) reqEl.textContent = `${Math.round(phys.requiredThrustKN)} kN`;
    if (thrustEl) {
      thrustEl.textContent = `${Math.round(phys.calibratedThrustKN)} kN`;
      thrustEl.className = `font-bold ${phys.twrOk ? "text-emerald-300" : "text-rose-400"}`;
    }
    if (twrEl) {
      twrEl.textContent = phys.twr.toFixed(2);
      twrEl.className = `font-bold ${
        phys.twr >= prof.minTwr ? "text-emerald-300" : phys.twr >= 1.0 ? "text-amber-300" : "text-rose-400"
      }`;
    }
    if (dragPeakEl) {
      dragPeakEl.textContent = `${phys.maxQKpa.toFixed(1)} kPa`;
      dragPeakEl.className = `font-bold ${phys.highMaxQ ? "text-rose-400" : "text-cyan-300"}`;
    }
    if (apogeeEl) apogeeEl.textContent = `${phys.deltaVKms.toFixed(1)}km/s · ${phys.apogeeKm}km`;

    const statusBadge = document.getElementById("phys-status-badge");
    if (statusBadge) {
      if (phys.stabilityZone === "ideal") {
        statusBadge.textContent = t("physStableIdeal");
        statusBadge.className =
          "font-pixel text-[8px] px-2 py-0.5 border border-emerald-500/70 bg-emerald-950/60 text-emerald-300";
      } else if (phys.stabilityZone === "drift") {
        statusBadge.textContent = t("physStableDrift");
        statusBadge.className =
          "font-pixel text-[8px] px-2 py-0.5 border border-amber-400/70 bg-amber-950/60 text-amber-300";
      } else {
        statusBadge.textContent = t("physStableDanger");
        statusBadge.className =
          "font-pixel text-[8px] px-2 py-0.5 border border-rose-500/80 bg-rose-950/70 text-rose-300 mg-pulse-urgent";
      }
    }

    const canvas = document.getElementById("physics-traj-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Space & atmospheric density gradient band
    ctx.fillStyle = "#040c18";
    ctx.fillRect(0, 0, W, H);
    const atmAlpha = Math.min(0.56, flightPhysics.atmDensity * 0.35);
    if (atmAlpha > 0.01) {
      const atmGrad = ctx.createLinearGradient(0, H, 0, 12);
      atmGrad.addColorStop(0, `rgba(56, 189, 248, ${atmAlpha.toFixed(2)})`);
      atmGrad.addColorStop(0.55, `rgba(30, 64, 175, ${(atmAlpha * 0.45).toFixed(2)})`);
      atmGrad.addColorStop(1, "rgba(4, 12, 24, 0)");
      ctx.fillStyle = atmGrad;
      ctx.fillRect(0, 0, W, H);
    }

    // Telemetry grid
    ctx.strokeStyle = "rgba(51, 68, 96, 0.45)";
    ctx.lineWidth = 1;
    for (let x = 24; x < W; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 20; y < H; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Ground line
    const padX = 24;
    const padY = H - 16;
    ctx.fillStyle = "#16253b";
    ctx.fillRect(0, padY, W, H - padY);
    ctx.fillStyle = "#334460";
    ctx.fillRect(padX - 8, padY - 3, 16, 4);

    // Shared scaling across NASA reference corridor & player's live curve
    const pts = phys.trajectory;
    const refPts = phys.refTrajectory;
    const maxDownrange = Math.max(25, ...pts.map((pt) => pt.downrange), ...refPts.map((pt) => pt.downrange));
    const maxAlt = Math.max(12, ...pts.map((pt) => pt.alt), ...refPts.map((pt) => pt.alt));
    const plotW = W - 122;
    const plotH = H - 34;

    const mapPt = (pt: { downrange: number; alt: number }) => ({
      x: padX + (pt.downrange / maxDownrange) * plotW,
      y: padY - (pt.alt / maxAlt) * plotH
    });

    // NASA Nominal Reference Corridor (dashed cyan/emerald)
    ctx.strokeStyle = "rgba(34, 211, 238, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    refPts.forEach((pt, idx) => {
      const p = mapPt(pt);
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Player Live Simulated Trajectory (red=danger, amber=drift, emerald=ideal)
    const curveColor =
      phys.stabilityZone === "ideal"
        ? "#34d399"
        : phys.stabilityZone === "drift"
          ? "#fbbf24"
          : "#fb7185";
    ctx.strokeStyle = curveColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    pts.forEach((pt, idx) => {
      const p = mapPt(pt);
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    pts.forEach((pt, idx) => {
      if (idx % 2 !== 0 && idx !== pts.length - 1) return;
      const p = mapPt(pt);
      ctx.fillStyle = idx === pts.length - 1 ? "#ffffff" : curveColor;
      ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
    });

    // Top-left stability readout inside canvas
    ctx.fillStyle = "rgba(4, 10, 22, 0.8)";
    ctx.fillRect(6, 6, 86, 16);
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = curveColor;
    ctx.fillText(`NASA: ${phys.stabilityPct}%`, 10, 17);

    // Free-body Force Vector Inset (right side)
    const boxX = W - 92;
    const boxY = 8;
    const boxW = 84;
    const boxH = H - 18;
    ctx.fillStyle = "rgba(4, 10, 22, 0.88)";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = curveColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1);

    const cx = boxX + 26;
    const cy = boxY + Math.round(boxH * 0.54);
    const refScale = Math.max(1, phys.calibratedThrustKN, phys.apparentWeightKN, phys.dragPeakKN);
    const maxVec = 38;
    const thrustLen = Math.max(8, Math.min(maxVec, (phys.calibratedThrustKN / refScale) * maxVec));
    const weightLen = Math.max(5, Math.min(maxVec, (phys.apparentWeightKN / refScale) * maxVec));
    const dragLen = Math.min(28, (phys.dragPeakKN / refScale) * maxVec);

    // Max-Q thermal shock arc if drag is excessive
    if (phys.highMaxQ) {
      ctx.strokeStyle = "rgba(251, 113, 133, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy - 10, 11, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }

    // Rocket sprite in vector inset
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(cx - 3, cy - 8, 6, 16);
    ctx.fillStyle = "#fc3d21";
    ctx.fillRect(cx - 2, cy - 12, 4, 4);

    drawForceArrow(
      ctx,
      cx,
      cy - 12,
      cx,
      cy - 12 - thrustLen,
      phys.twrOk ? "#34d399" : "#fbbf24",
      t("physVectorThrust"),
      "left"
    );
    drawForceArrow(
      ctx,
      cx,
      cy + 8,
      cx,
      cy + 8 + weightLen,
      "#fb7185",
      t("physVectorWeight"),
      "left"
    );
    if (dragLen >= 3) {
      drawForceArrow(
        ctx,
        cx + 4,
        cy,
        cx + 4 + dragLen,
        cy + Math.min(12, dragLen * 0.4),
        "#38bdf8",
        t("physVectorDrag"),
        "left"
      );
    }
  }

  function updateLaunchControlsUI() {
    const m = computeMetrics();
    const phys = computeFlightPhysics();
    const locMission = getLocMission(m.mission);
    const badgeEl = document.getElementById("launch-mission-badge");
    const mgNameEl = document.getElementById("launch-minigame-name");
    const checklistEl = document.getElementById("launch-checklist");
    if (badgeEl) badgeEl.textContent = locMission.title;
    if (mgNameEl) mgNameEl.textContent = locMission.minigame;

    const physicsOk = phys.twrOk && phys.nasaCalibratedOk;
    const checks = [
      { label: t("checkBudget"), ok: m.checks.budgetOk, val: formatUsd(m.totalCost), wide: false },
      { label: t("checkMass"), ok: m.checks.massOk, val: `${m.totalMass} kg`, wide: false },
      { label: t("checkPower"), ok: m.checks.powerOk, val: `${m.netPower >= 0 ? "+" : ""}${m.netPower} W`, wide: false },
      { label: t("checkSciBand"), ok: m.checks.scienceOk && m.checks.waveOk && m.checks.deepSpaceOk, val: `${m.totalScience} pts`, wide: false },
      { label: t("checkPhysics"), ok: physicsOk, val: `NASA ${phys.stabilityPct}% · TWR ${phys.twr.toFixed(2)}`, wide: true }
    ];
    if (checklistEl) {
      checklistEl.innerHTML = checks.map((c) => `
        <div class="p-2 border ${c.wide ? "col-span-2" : ""} ${c.ok ? "bg-hull-900 border-emerald-500/40 text-emerald-300" : "bg-rose-950/40 border-rose-500/60 text-rose-300"}">
          <div class="flex justify-between"><span>${c.label}</span><b>${c.ok ? "GO" : "NO-GO"}</b></div>
          <div class="text-slate-300 mt-0.5">${c.val}</div>
        </div>`).join("");
    }

    const canLaunch = m.isGo && physicsOk;
    const ph = visor3D ? visor3D.flight.phase : "PAD";
    const btn = document.getElementById("btn-start-launch") as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = !canLaunch || ph !== "PAD";
      btn.textContent = !m.isGo
        ? t("pendingReqs")
        : !phys.twrOk
          ? t("physNoGoThrust")
          : !phys.nasaCalibratedOk
            ? t("physNoGoCalib")
            : ph === "PAD"
              ? t("startLaunch")
              : ph === "ORBIT"
                ? t("inOrbitBtn")
                : t("inFlightBtn");
    }
  }

  let telDomCache: {
    alt: HTMLElement | null;
    vel: HTMLElement | null;
    g: HTMLElement | null;
    time: HTMLElement | null;
    phase: HTMLElement | null;
    fuel: HTMLElement | null;
    fuelBar: HTMLElement | null;
    bonus: HTMLElement | null;
  } | null = null;
  const telPrev = { alt: "", vel: "", g: "", time: "", phase: "", fuel: "", fuelBar: "", bonus: "" };

  function syncFlightTelemetry() {
    if (!visor3D || currentStation !== "launch") return;
    if (!telDomCache) {
      telDomCache = {
        alt: document.getElementById("tel-alt"),
        vel: document.getElementById("tel-vel"),
        g: document.getElementById("tel-g"),
        time: document.getElementById("tel-time"),
        phase: document.getElementById("tel-phase"),
        fuel: document.getElementById("tel-fuel"),
        fuelBar: document.getElementById("tel-fuel-bar"),
        bonus: document.getElementById("flight-bonus-tag")
      };
    }
    const f = visor3D.flight;
    const nextAlt = f.alt.toFixed(1);
    const nextVel = f.vel.toFixed(2);
    const nextG = f.g.toFixed(1);
    const nextTime = f.t.toFixed(1).padStart(4, "0");
    const names: Record<string, string> = {
      PAD: t("phasePad"),
      COUNTDOWN: `T-${Math.max(1, Math.ceil(f.countdown))}`,
      ASCENT: t("phaseAscent"),
      ORBIT: t("phaseOrbit"),
      FAILED: t("phaseFailed")
    };
    const nextPhase = names[f.phase] || f.phase;
    const fuelPct = Math.round(f.fuel);
    const nextFuel = `${fuelPct}%`;
    const nextFuelBar = `${f.fuel.toFixed(1)}%`;
    const nextBonus = `${t("bonusTag")} +${f.bonusPct}%`;

    if (telDomCache.alt && nextAlt !== telPrev.alt) { telPrev.alt = nextAlt; telDomCache.alt.textContent = nextAlt; }
    if (telDomCache.vel && nextVel !== telPrev.vel) { telPrev.vel = nextVel; telDomCache.vel.textContent = nextVel; }
    if (telDomCache.g && nextG !== telPrev.g) { telPrev.g = nextG; telDomCache.g.textContent = nextG; }
    if (telDomCache.time && nextTime !== telPrev.time) { telPrev.time = nextTime; telDomCache.time.textContent = nextTime; }
    if (telDomCache.phase && nextPhase !== telPrev.phase) { telPrev.phase = nextPhase; telDomCache.phase.textContent = nextPhase; }
    if (telDomCache.fuel && nextFuel !== telPrev.fuel) { telPrev.fuel = nextFuel; telDomCache.fuel.textContent = nextFuel; }
    if (telDomCache.fuelBar && nextFuelBar !== telPrev.fuelBar) { telPrev.fuelBar = nextFuelBar; telDomCache.fuelBar.style.width = nextFuelBar; }
    if (telDomCache.bonus && nextBonus !== telPrev.bonus) { telPrev.bonus = nextBonus; telDomCache.bonus.textContent = nextBonus; }
  }

  function completeMissionSuccess(bonusPct: number, mgErrors = 0) {
    const m = computeMetrics();
    const phys = computeFlightPhysics();
    const locMission = getLocMission(m.mission);
    const isEn = getLang() === "en";
    const locale = getLocale();
    const savedRatio = Math.max(0, m.mission.budget_max - m.totalCost) / Math.max(1, m.mission.budget_max);
    const { mult, eff, nasaMult, stabilityPct, score } = missionManager.calculateScore(m, bonusPct, phys.stabilityPct);
    const alreadyCompleted = progress.completedMissions.includes(m.mission.id);
    const { creditsEarned, replayMult } = missionManager.calculateCredits(
      m.mission.id,
      bonusPct,
      alreadyCompleted,
      savedRatio,
      phys.stabilityPct
    );

    const prevLvl = getBaseLevel();
    stateManager.unlockMissionAndTrophy(
      m.mission.id,
      {
        callsign: progress.callsign || "ENG-SILVA",
        mission: m.mission.cml.split(" - ")[0],
        cost: m.totalCost,
        score,
        date: new Date().toLocaleDateString(locale)
      },
      score,
      creditsEarned
    );

    const newLvl = getBaseLevel();
    const replayTag = alreadyCompleted ? ` (${t("replayTag")} 25%)` : "";
    appendFlightLog(
      isEn
        ? `ORBIT ACHIEVED! +${score} pts · +$${creditsEarned.toLocaleString(locale)} NASA Credits${replayTag}.`
        : `ÓRBITA ALCANÇADA! +${score} pts · +$${creditsEarned.toLocaleString(locale)} Créditos NASA${replayTag}.`
    );
    if (!alreadyCompleted) {
      appendFlightLog(
        isEn
          ? "BASE UPGRADED: New scientific artifact installed in the Command Center!"
          : "BASE ATUALIZADA: Novo artefato científico instalado no Centro de Controle!"
      );
    }
    if (newLvl > prevLvl) {
      appendFlightLog(
        isEn
          ? `BASE EVOLUTION: Command Center upgraded to Level ${newLvl}!`
          : `EVOLUÇÃO DA BASE: Centro de Comando atualizado para Nível ${newLvl}!`
      );
    }

    const card = document.getElementById("debrief-card");
    const titleEl = document.getElementById("debrief-title");
    const creditsEl = document.getElementById("debrief-credits");
    const scoreEl = document.getElementById("debrief-score");
    const summaryEl = document.getElementById("debrief-summary");
    const breakdownEl = document.getElementById("debrief-breakdown");

    if (card) {
      card.classList.remove("hidden", "border-rose-500");
      card.classList.add("border-emerald-400");
    }
    if (titleEl) {
      titleEl.textContent = t("orbitSuccessTitle");
      titleEl.className = "font-pixel text-[11px] text-emerald-400";
    }
    if (creditsEl) creditsEl.textContent = `+$${creditsEarned.toLocaleString(locale)}`;
    if (scoreEl) scoreEl.textContent = `+${score} pts`;
    if (summaryEl) {
      summaryEl.textContent = isEn
        ? `${locMission.title} completed (${locMission.real_nasa_equivalent}). 3D trophy & base environmental module unlocked!`
        : `${locMission.title} concluída (${locMission.real_nasa_equivalent}). Troféu 3D & módulo ambiental na base desbloqueados!`;
    }
    if (breakdownEl) {
      const mgNote = mgErrors === 0 && bonusPct >= 65 ? ` (${t("flawlessTag")})` : "";
      breakdownEl.innerHTML = `
        <div>${t("statScience")}: <b class="text-white">${m.totalScience}</b></div>
        <div>${t("statCmlMult")}: <b class="text-white">${mult.toFixed(1)}x</b></div>
        <div>${t("statBudgetEff")}: <b class="text-emerald-400">${eff.toFixed(2)}x</b></div>
        <div>${t("statNasaPrecision")}: <b class="${stabilityPct >= 98 ? "text-emerald-300" : "text-cyan-300"}">${stabilityPct}% (${nasaMult.toFixed(2)}x)</b></div>
        <div>${t("statMinigame")}: <b class="text-amber-300">+${bonusPct}%${mgNote}</b></div>
        <div>${t("statSubsidy")}: <b class="text-amber-300">+$${creditsEarned.toLocaleString(locale)}</b></div>
        <div class="col-span-2">${t("statRate")}: <b class="${alreadyCompleted ? "text-slate-300" : "text-cyan-300"}">${alreadyCompleted ? `${t("replayTag")} (${Math.round(replayMult * 100)}%)` : t("newMissionTag")}</b></div>`;
    }

    base2D?.triggerCelebration();
    updateHUD();
    renderPhysicsSimulator();
    updateLaunchControlsUI();
  }

  function completeMissionFailure(reason: string) {
    const isEn = getLang() === "en";
    appendFlightLog(`${isEn ? "FAILURE" : "FALHA"}: ${reason}`);
    const card = document.getElementById("debrief-card");
    const titleEl = document.getElementById("debrief-title");
    const creditsEl = document.getElementById("debrief-credits");
    const scoreEl = document.getElementById("debrief-score");
    const summaryEl = document.getElementById("debrief-summary");
    const breakdownEl = document.getElementById("debrief-breakdown");

    if (card) {
      card.classList.remove("hidden", "border-emerald-400");
      card.classList.add("border-rose-500");
    }
    if (titleEl) {
      titleEl.textContent = t("missionAbortedTitle");
      titleEl.className = "font-pixel text-[11px] text-rose-400";
    }
    if (creditsEl) creditsEl.textContent = "+$0";
    if (scoreEl) scoreEl.textContent = "0 pts";
    if (summaryEl) summaryEl.textContent = reason;
    if (breakdownEl) breakdownEl.innerHTML = "";
    renderPhysicsSimulator();
    updateLaunchControlsUI();
  }

  function updateTrophyView() {
    const unlocked = stateManager.hasTrophy(selectedTrophyId);
    document.getElementById("trophy-locked-overlay")?.classList.toggle("hidden", unlocked);
    if (trophy3D) trophy3D.setTrophy(selectedTrophyId);
  }

  function renderRankingPanel() {
    const rank = getRank(progress.totalScore);
    const next = getNextRank(progress.totalScore);
    const lvl = getBaseLevel();
    const locale = getLocale();
    const rankTitleEl = document.getElementById("rank-current-title");
    if (rankTitleEl) rankTitleEl.textContent = getLocRankTitle(rank.title);
    const callsignInput = document.getElementById("input-callsign") as HTMLInputElement | null;
    if (callsignInput) callsignInput.value = progress.callsign;

    const progLabelEl = document.getElementById("rank-progress-label");
    const ptsLabelEl = document.getElementById("rank-points-label");
    const progBarEl = document.getElementById("rank-progress-bar");

    if (next) {
      const pct = Math.min(100, Math.round((progress.totalScore / next.minScore) * 100));
      if (progLabelEl) progLabelEl.textContent = `${t("nextRankPrefix")} ${getLocRankTitle(next.title)}`;
      if (ptsLabelEl) ptsLabelEl.textContent = `${progress.totalScore.toLocaleString(locale)} / ${next.minScore.toLocaleString(locale)} pts`;
      if (progBarEl) progBarEl.style.width = `${pct}%`;
    } else {
      if (progLabelEl) progLabelEl.textContent = t("maxRankReached");
      if (ptsLabelEl) ptsLabelEl.textContent = `${progress.totalScore.toLocaleString(locale)} pts`;
      if (progBarEl) progBarEl.style.width = "100%";
    }

    const t2 = document.getElementById("base-tier-2");
    const t3 = document.getElementById("base-tier-3");
    if (t2) t2.className = `p-2 bg-hull-900 border ${lvl >= 2 ? "border-emerald-400 opacity-100" : "border-slate-700 opacity-50"}`;
    if (t3) t3.className = `p-2 bg-hull-900 border ${lvl >= 3 ? "border-cyan-400 opacity-100" : "border-slate-700 opacity-50"}`;

    const tbody = document.getElementById("leaderboard-body");
    if (tbody) {
      tbody.innerHTML = progress.records.length === 0
        ? `<tr><td colspan="5" class="py-6 text-center text-slate-500">${t("noRecords")}</td></tr>`
        : progress.records.map((r, i) => `
          <tr class="hover:bg-hull-800/60">
            <td class="py-2 px-3 text-amber-300 font-bold">${i + 1}</td>
            <td class="py-2 px-3 text-white">${r.callsign}</td>
            <td class="py-2 px-3 text-cyan-300">${r.mission}</td>
            <td class="py-2 px-3 text-right">${formatUsd(Number(r.cost))}</td>
            <td class="py-2 px-3 text-right text-emerald-400 font-bold">${Number(r.score).toLocaleString(locale)}</td>
          </tr>`).join("");
    }

    const unlockedCount = nasa_database.missions_cml.filter((m) => stateManager.hasTrophy(m.id)).length;
    const countLabel = document.getElementById("trophy-count-label");
    if (countLabel) countLabel.textContent = `${unlockedCount} / ${nasa_database.missions_cml.length}`;

    const list = document.getElementById("trophy-selector-list");
    if (list) {
      list.innerHTML = nasa_database.missions_cml.map((rawM) => {
        const m = getLocMission(rawM);
        const unlocked = stateManager.hasTrophy(m.id);
        const active = selectedTrophyId === m.id;
        return `
          <button type="button" data-trophy="${m.id}" class="p-2 border-2 text-left ${active ? "bg-hull-800 border-amber-400" : "bg-hull-900 border-slate-700 hover:border-slate-500"}">
            <div class="text-[11px] font-mono ${unlocked ? "text-emerald-400" : "text-slate-500"}">${unlocked ? t("unlocked") : t("locked")}</div>
            <div class="text-xs font-bold text-white truncate">${m.real_nasa_equivalent}</div>
          </button>`;
      }).join("");
    }
    updateTrophyView();
  }

  function renderWardrobePanel() {
    const locale = getLocale();
    const activeSkin = getLocSkin(getSkin(progress.skinId));
    const activeEl = document.getElementById("wardrobe-active-name");
    if (activeEl) activeEl.textContent = activeSkin.name;
    const creditsEl = document.getElementById("wardrobe-credits");
    if (creditsEl) creditsEl.textContent = `$${progress.credits.toLocaleString(locale)}`;

    const grid = document.getElementById("wardrobe-grid");
    if (!grid) return;

    grid.innerHTML = PLAYER_SKINS.map((rawSk) => {
      const sk = getLocSkin(rawSk);
      const owned = stateManager.hasSuit(sk.id);
      const equipped = progress.skinId === sk.id;
      const canAfford = progress.credits >= sk.price;
      const priceBadge = sk.price === 0
        ? `<span class="text-emerald-300 font-bold">${t("freeTag")}</span>`
        : owned
          ? `<span class="text-emerald-300 font-bold">${t("ownedTag")}</span>`
          : `<span class="${canAfford ? "text-amber-300" : "text-rose-400"} font-bold">$${sk.price.toLocaleString(locale)}</span>`;

      const btnClass = equipped
        ? "bg-purple-400 text-black"
        : owned
          ? "bg-hull-800 text-slate-200 hover:border-purple-400"
          : canAfford
            ? "bg-amber-400 text-black font-bold"
            : "bg-slate-900 text-slate-500 opacity-65 cursor-not-allowed";

      const btnLabel = equipped
        ? t("equippedSuitBtn")
        : owned
          ? t("equipSuitBtn")
          : canAfford
            ? `${t("buySuitBtn")} ($${sk.price.toLocaleString(locale)})`
            : `${t("lockedSuitBtn")} ($${sk.price.toLocaleString(locale)})`;

      return `
        <div class="pixel-panel-dark p-4 flex flex-col justify-between gap-3 ${equipped ? "border-purple-400" : owned ? "border-slate-600" : "border-slate-800"}">
          <div class="space-y-3">
            <div class="flex items-center justify-between text-[10px] font-mono">
              <span class="text-slate-400">${sk.tierLabel || "NASA SUIT"}</span>
              ${priceBadge}
            </div>
            <div class="relative flex items-center justify-center bg-[#060910] border-2 border-[#26334a] py-3">
              <canvas data-skin-preview="${sk.id}" width="64" height="72" class="pixelated block ${owned ? "" : "opacity-60"}"></canvas>
              ${!owned ? `<span class="absolute bottom-1.5 right-2 font-mono text-[10px] px-1.5 py-0.5 bg-black/80 border border-slate-700 text-amber-300">$${sk.price.toLocaleString(locale)}</span>` : ""}
            </div>
            <div>
              <h4 class="font-pixel text-[10px] text-white leading-relaxed">${sk.name}</h4>
              <div class="text-xs text-purple-300 mt-0.5">${sk.subtitle}</div>
              <p class="text-xs text-slate-300 leading-relaxed mt-2">${sk.desc}</p>
            </div>
          </div>
          <button type="button" data-suit-action="${sk.id}" ${!owned && !canAfford ? "disabled" : ""} class="pixel-btn w-full py-2 px-3 font-pixel text-[9px] ${btnClass}">
            ${btnLabel}
          </button>
        </div>`;
    }).join("");

    grid.querySelectorAll<HTMLCanvasElement>("[data-skin-preview]").forEach((cv) => {
      const sk = getSkin(cv.getAttribute("data-skin-preview") || "nasa_white");
      const pctx = cv.getContext("2d");
      if (!pctx) return;
      pctx.imageSmoothingEnabled = false;
      pctx.clearRect(0, 0, cv.width, cv.height);
      drawPixelEngineer24x32(pctx, 32, 66, "down", 0, false, 0.5, sk, 2);
    });
  }

  const hubScheduler = {
    rafId: 0,
    lastTime: performance.now(),
    running: false,
    resume() {
      if (disposed || document.hidden || this.running) return;
      this.running = true;
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame((now) => this.tick(now));
    },
    pause() {
      this.running = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
      }
    },
    tick(now: number) {
      if (disposed || !this.running || document.hidden) {
        this.pause();
        return;
      }
      const dt = Math.min(0.05, Math.max(0.0001, (now - this.lastTime) / 1000));
      this.lastTime = now;

      const flightActive = currentStation === "launch" && visor3D &&
        (visor3D.flight.phase === "COUNTDOWN" || visor3D.flight.phase === "ASCENT");
      const modalSettled = modalState.open && base2D && !base2D.cam.tweenActive;

      if (!modalSettled && base2D) {
        base2D.update(dt);
        base2D.draw();
      }
      if (flightActive) {
        syncFlightTelemetry();
      }

      if (modalSettled && !flightActive) {
        this.pause();
        return;
      }
      this.rafId = requestAnimationFrame((tm) => this.tick(tm));
    }
  };

  function updateModalHeader(id: string) {
    const isEn = getLang() === "en";
    const titles: Record<string, [string, string]> = isEn
      ? {
          quests: ["QUEST BOARD (CML 1–4 · 15 MISSIONS)", "Official NASA Campaign"],
          workbench: ["ENGINEERING WORKBENCH", "4 Mission Segments & CRT Terminal"],
          launch: ["3D LAUNCH PLATFORM", "320×240 Telemetry Visor & Flight Minigame"],
          ranking: ["TROPHY HALL & LEADERBOARD", "Local History and 3D Miniatures"],
          wardrobe: ["SUIT LOCKER (SKINS)", "Space Engineer Customization"]
        }
      : {
          quests: ["MURAL DE QUESTS (CML 1–4 · 15 MISSÕES)", "Campanha Oficial NASA"],
          workbench: ["BANCADA DE ENGENHARIA", "4 Segmentos de Missão & Terminal CRT"],
          launch: ["PLATAFORMA DE LANÇAMENTO 3D", "Visor Telemetria 320×240 & Minigame de Voo"],
          ranking: ["SALA DE TROFÉUS & RANKING", "Histórico Local e Miniaturas 3D"],
          wardrobe: ["ARMÁRIO DE TRAJES (SKINS)", "Personalização do Engenheiro Espacial"]
        };
    const modalTitleEl = document.getElementById("modal-title");
    const modalSubtitleEl = document.getElementById("modal-subtitle");
    if (modalTitleEl && titles[id]) modalTitleEl.textContent = titles[id][0];
    if (modalSubtitleEl && titles[id]) modalSubtitleEl.textContent = titles[id][1];
  }

  const STATION_TAB_ORDER = ["quests", "workbench", "launch", "ranking", "wardrobe"];

  function applyStationPanel(id: string) {
    if (disposed) return;
    const prevStation = currentStation;
    const prevIdx = prevStation ? STATION_TAB_ORDER.indexOf(prevStation) : -1;
    const nextIdx = STATION_TAB_ORDER.indexOf(id);
    const enterClass = prevIdx !== -1 && nextIdx !== -1 && nextIdx < prevIdx ? "panel-enter-left" : "panel-enter-right";

    currentStation = id;
    document.querySelectorAll(".station-panel").forEach((p) => {
      p.classList.add("hidden");
      p.classList.remove("panel-enter", "panel-enter-right", "panel-enter-left");
    });
    const activePanel = document.getElementById(`panel-${id}`) as HTMLElement | null;
    if (activePanel) {
      activePanel.classList.remove("hidden");
      requestAnimationFrame(() => {
        if (!disposed && currentStation === id) activePanel.classList.add(enterClass);
      });
    }

    updateModalHeader(id);

    document.querySelectorAll(".station-tab").forEach((tab) => {
      const act = tab.getAttribute("data-switch-station") === id;
      tab.className = `station-tab pixel-btn px-2.5 py-1.5 font-pixel text-[9px] whitespace-nowrap shrink-0 ${act ? "bg-amber-400 text-black station-tab-active" : "bg-hull-800 text-slate-300"}`;
    });

    if (visor3D) visor3D.stop();
    if (trophy3D) trophy3D.stop();
    if (preview3D) preview3D.stop();

    if (id === "quests") {
      renderQuestsPanel();
    } else if (id === "workbench") {
      workbenchHoverOverride = null;
      const pv = ensurePreview3D();
      renderWorkbenchPanel();
      if (lastInspected) {
        inspectItemOnCRT(lastInspected.kind, lastInspected.item);
      } else {
        inspectAndTrack("Launch Segment", getVehicle());
      }
      pv?.start();
    } else if (id === "launch") {
      if (!modalState.open || currentStation !== "launch") return;
      const visorCanvas = document.getElementById("visor-3d-canvas") as HTMLCanvasElement | null;
      if (!visorCanvas) return;

      const sig = missionManager.getConfigSignature();
      if (!visor3D) {
        visor3D = new TelemetryLaunchRenderer(visorCanvas, {
          appendFlightLog,
          startMissionMinigame,
          updateMissionMinigame,
          finishMissionMinigameAndEvaluate,
          updateLaunchControlsUI
        });
      } else if (visor3D.configSignature !== sig || visor3D.flight.phase === "PAD") {
        const configChanged = visor3D.configSignature !== sig;
        visor3D.rebuild();
        if (configChanged) {
          const logEl = document.getElementById("flight-log");
          if (logEl) logEl.innerHTML = `<div>&gt; ${t("padSyncedLog")}</div>`;
        }
      }

      const camLabels = [t("camChase"), t("camPanorama"), t("camPayload")];
      const camLabelEl = document.getElementById("visor-camera-label");
      const wobbleBtnEl = document.getElementById("btn-wobble-toggle");
      if (camLabelEl) camLabelEl.textContent = camLabels[visor3D.cameraMode] || camLabels[0];
      if (wobbleBtnEl) wobbleBtnEl.textContent = `WOBBLE: ${visor3D.pipe.wobbleEnabled ? "ON" : "OFF"}`;

      if (visor3D.flight.phase === "PAD") {
        document.getElementById("debrief-card")?.classList.add("hidden");
        document.getElementById("minigame-hud")?.classList.add("hidden");
      }
      renderPhysicsSimulator();
      updateLaunchControlsUI();
      syncFlightTelemetry();
      visor3D.start();
      hubScheduler.resume();
    } else if (id === "ranking") {
      if (!modalState.open || currentStation !== "ranking") return;
      const trophyCanvas = document.getElementById("trophy-3d-canvas") as HTMLCanvasElement | null;
      if (!trophy3D && trophyCanvas) {
        trophy3D = new TelemetryTrophyRenderer(trophyCanvas);
      }
      renderRankingPanel();
      trophy3D?.start();
    } else if (id === "wardrobe") {
      renderWardrobePanel();
    }
  }

  function openStation(id: string) {
    if (disposed) return;
    if (modalState.closeTimer !== null) {
      clearTimeout(modalState.closeTimer);
      modalState.closeTimer = null;
    }
    if (modalState.openTimer !== null) {
      clearTimeout(modalState.openTimer);
      modalState.openTimer = null;
    }

    base2D?.clearInputState();
    audio.stationOpen();
    base2D?.focusStation(id);
    hubScheduler.resume();

    const overlay = document.getElementById("station-overlay");
    if (!overlay) return;
    if (modalState.open) {
      applyStationPanel(id);
      return;
    }

    updatePromptUI(null);
    modalState.openTimer = window.setTimeout(() => {
      modalState.openTimer = null;
      if (disposed) return;
      modalState.open = true;
      overlay.classList.remove("hidden");
      applyStationPanel(id);
      requestAnimationFrame(() => {
        overlay.classList.add("is-open");
      });
    }, 140);
  }

  function closeModal() {
    if (modalState.openTimer !== null) {
      clearTimeout(modalState.openTimer);
      modalState.openTimer = null;
    }
    if (modalState.closeTimer !== null) {
      clearTimeout(modalState.closeTimer);
      modalState.closeTimer = null;
    }

    modalState.open = false;
    currentStation = null;
    mgState.active = false;
    if (base2D) {
      base2D.clearInputState();
      base2D.clearCameraFocus();
    }
    hubScheduler.resume();

    const overlay = document.getElementById("station-overlay");
    if (overlay) {
      overlay.classList.remove("is-open");
      modalState.closeTimer = window.setTimeout(() => {
        modalState.closeTimer = null;
        if (!modalState.open) {
          overlay.classList.add("hidden");
          if (visor3D) visor3D.stop();
          if (trophy3D) trophy3D.stop();
          if (preview3D) preview3D.stop();
        }
      }, 210);
    }
  }

  // Initialize Minigame hooks
  initMinigameHooks({
    appendFlightLog,
    getVisor3D: () => visor3D,
    completeMissionSuccess,
    completeMissionFailure,
    syncFlightTelemetry,
    onInspectItem: (kind, itemId, missionId) => preview3D?.setItem(kind, itemId, missionId)
  });

  // Render NPC & Commander portraits
  renderPixelPortrait("portrait-quests", "sagan");
  renderPixelPortrait("portrait-workbench", "beatriz");
  renderPixelPortrait("portrait-commander", "commander");

  // Seed initial flight log so React re-renders never overwrite it
  const initialLogEl = document.getElementById("flight-log");
  if (initialLogEl && initialLogEl.children.length === 0) {
    initialLogEl.innerHTML = `<div>&gt; ${t("padReadyLog")}</div>`;
  }

  // Lazy-initialize Workbench 3D CRT preview on first Workbench open (avoids dual WebGL startup cost)
  const initialVehicle = getVehicle();
  lastInspected = { kind: "Launch Segment", item: initialVehicle };
  const initialPreviewTag = document.getElementById("preview-3d-tag");
  const initialMNum = config.missionId.match(/m(\d+)/)?.[1]?.padStart(2, "0") || "01";
  if (initialPreviewTag) initialPreviewTag.textContent = `M${initialMNum} · ${initialVehicle.id.toUpperCase()}`;

  const baseCanvas = document.getElementById("base-canvas") as HTMLCanvasElement | null;
  const baseOverlay = document.getElementById("base-html-overlay");
  if (baseCanvas) {
    base2D = new CommandCenter(
      baseCanvas,
      baseOverlay,
      openStation,
      isModalOpen,
      updatePromptUI
    );
  }
  updateHUD();
  hubScheduler.resume();

  const cleanupListeners: (() => void)[] = [];
  const listen = <T extends EventTarget>(
    target: T | null,
    type: string,
    handler: EventListenerOrEventListenerObject
  ) => {
    if (!target) return;
    target.addEventListener(type, handler);
    cleanupListeners.push(() => target.removeEventListener(type, handler));
  };

  // Subscribe to dynamic language changes (PT <-> EN)
  cleanupListeners.push(
    onLangChange(() => {
      if (disposed) return;
      base2D?.refreshLanguage();
      updateHUD();
      updatePromptUI(base2D?.nearStation ?? null);

      const logEl = document.getElementById("flight-log");
      if (logEl && logEl.children.length <= 1 && (!visor3D || visor3D.flight.phase === "PAD")) {
        logEl.innerHTML = `<div>&gt; ${t("padReadyLog")}</div>`;
      }

      if (currentStation) {
        updateModalHeader(currentStation);
        if (currentStation === "quests") {
          renderQuestsPanel();
        } else if (currentStation === "workbench") {
          renderWorkbenchPanel();
          if (lastInspected) inspectItemOnCRT(lastInspected.kind, lastInspected.item);
        } else if (currentStation === "launch") {
          renderPhysicsSimulator();
          updateLaunchControlsUI();
          syncFlightTelemetry();
          if (visor3D) {
            const camLabels = [t("camChase"), t("camPanorama"), t("camPayload")];
            const camLabelEl = document.getElementById("visor-camera-label");
            if (camLabelEl) camLabelEl.textContent = camLabels[visor3D.cameraMode] || camLabels[0];
          }
        } else if (currentStation === "ranking") {
          renderRankingPanel();
        } else if (currentStation === "wardrobe") {
          renderWardrobePanel();
        }
      }
    })
  );

  listen(document, "visibilitychange", () => {
    if (document.hidden) {
      base2D?.clearInputState();
      hubScheduler.pause();
    } else {
      hubScheduler.resume();
    }
  });

  document.querySelectorAll("[data-nav]").forEach((b) => {
    listen(b, "click", () => {
      const navTarget = b.getAttribute("data-nav");
      if (!navTarget) return;
      if (navTarget === "hub") closeModal();
      else openStation(navTarget);
    });
  });

  document.querySelectorAll("[data-open-station], [data-switch-station]").forEach((b) => {
    listen(b, "click", () => {
      const target = b.getAttribute("data-open-station") || b.getAttribute("data-switch-station");
      if (target) openStation(target);
    });
  });

  listen(document.getElementById("btn-quick-launch"), "click", () => openStation("launch"));
  listen(document.getElementById("btn-go-to-launch"), "click", () => openStation("launch"));
  listen(document.getElementById("btn-close-modal"), "click", closeModal);
  listen(document.getElementById("station-prompt-btn"), "click", () => {
    if (base2D?.nearStation) openStation(base2D.nearStation.id);
  });

  listen(document.getElementById("btn-start-launch"), "click", () => {
    const p = computeFlightPhysics();
    if (!visor3D || !computeMetrics().isGo || !p.twrOk || !p.nasaCalibratedOk) return;
    document.getElementById("debrief-card")?.classList.add("hidden");
    const logEl = document.getElementById("flight-log");
    if (logEl) logEl.innerHTML = "";
    visor3D.rebuild();
    visor3D.flight.phase = "COUNTDOWN";
    visor3D.flight.countdown = 3.0;
    audio.countdown(false);
    appendFlightLog(`${t("launchAuth")} ${getLocMission(getMission()).title}.`);
    renderPhysicsSimulator();
    updateLaunchControlsUI();
    syncFlightTelemetry();
    hubScheduler.resume();
  });

  listen(document.getElementById("btn-reset-pad"), "click", () => {
    if (!visor3D) return;
    mgState.active = false;
    document.getElementById("minigame-hud")?.classList.add("hidden");
    visor3D.rebuild();
    document.getElementById("debrief-card")?.classList.add("hidden");
    const logEl = document.getElementById("flight-log");
    if (logEl) logEl.innerHTML = `<div>&gt; ${t("padResetLog")}</div>`;
    renderPhysicsSimulator();
    updateLaunchControlsUI();
    syncFlightTelemetry();
  });

  listen(document.getElementById("btn-phys-reseed"), "click", () => {
    if (visor3D && visor3D.flight.phase !== "PAD") return;
    stateManager.seedMisalignedPhysicsForMission(config.missionId);
    if (visor3D && visor3D.flight.phase === "PAD") visor3D.resetPad();
    audio.alarm();
    renderPhysicsSimulator();
    updateLaunchControlsUI();
    syncFlightTelemetry();
  });

  document.querySelectorAll<HTMLButtonElement>("[data-phys-preset]").forEach((btn) => {
    listen(btn, "click", () => {
      if (visor3D && visor3D.flight.phase !== "PAD") return;
      const preset = btn.getAttribute("data-phys-preset") as GravityRegime | null;
      if (!preset) return;
      stateManager.applyPhysicsPreset(preset);
      if (visor3D && visor3D.flight.phase === "PAD") visor3D.resetPad();
      audio.uiSelect();
      renderPhysicsSimulator();
      updateLaunchControlsUI();
      syncFlightTelemetry();
    });
  });

  // Single delegated handlers for dynamic quest, workbench, trophy & suit grids (zero leak / fast 60 FPS re-renders)
  listen(document.getElementById("quests-grid"), "click", (ev) => {
    const btn = (ev.target as HTMLElement | null)?.closest("[data-select-mission]");
    const mid = btn?.getAttribute("data-select-mission");
    if (!mid) return;
    const same = config.missionId === mid;
    workbenchHoverOverride = null;
    stateManager.setSegmentField("missionId", mid);
    audio.uiSelect();
    updateHUD();
    renderQuestsPanel();
    if (same) openStation("workbench");
  });

  const handleWbClearHover = () => {
    if (workbenchHoverOverride !== null) {
      workbenchHoverOverride = null;
      updateWorkbenchMetersOnly();
    }
  };
  let lastHoveredWbId = "";
  const setupWbContainer = (
    elId: string,
    attr: string,
    kind: string,
    getItem: (id: string) => InspectableItem | undefined,
    onHoverOverride: (id: string) => Partial<SegmentConfig>,
    onCommit: (id: string) => void
  ) => {
    const container = document.getElementById(elId);
    if (!container) return;
    listen(container, "pointerover", (ev) => {
      const btn = (ev.target as HTMLElement | null)?.closest(`[${attr}]`);
      const id = btn?.getAttribute(attr);
      if (!id) return;
      const hoverKey = `${attr}:${id}`;
      if (hoverKey === lastHoveredWbId) return;
      lastHoveredWbId = hoverKey;
      const item = getItem(id);
      if (!item) return;
      workbenchHoverOverride = onHoverOverride(id);
      inspectAndTrack(kind, item);
      updateWorkbenchMetersOnly();
    });
    listen(container, "mouseleave", () => {
      lastHoveredWbId = "";
      handleWbClearHover();
    });
    listen(container, "click", (ev) => {
      const btn = (ev.target as HTMLElement | null)?.closest(`[${attr}]`);
      const id = btn?.getAttribute(attr);
      if (!id) return;
      const item = getItem(id);
      if (!item) return;
      workbenchHoverOverride = null;
      onCommit(id);
      audio.uiSelect();
      inspectAndTrack(kind, item);
      renderWorkbenchPanel();
      updateHUD();
    });
  };

  setupWbContainer(
    "list-launch-segment",
    "data-lv",
    "Launch Segment",
    (id) => nasa_database.launch_segment.find((x) => x.id === id),
    (id) => ({ vehicleId: id }),
    (id) => stateManager.setSegmentField("vehicleId", id)
  );
  setupWbContainer(
    "list-space-buses",
    "data-bus",
    "Space Bus",
    (id) => nasa_database.space_segment_buses.find((x) => x.id === id),
    (id) => ({ busId: id }),
    (id) => stateManager.setSegmentField("busId", id)
  );
  setupWbContainer(
    "list-space-instruments",
    "data-inst",
    "Instrumento",
    (id) => nasa_database.space_segment_instruments.find((x) => x.id === id),
    (id) => ({
      instrumentIds: config.instrumentIds.includes(id)
        ? (config.instrumentIds.length > 1 ? config.instrumentIds.filter((x) => x !== id) : config.instrumentIds)
        : [...config.instrumentIds, id]
    }),
    (id) => {
      const nextInsts = config.instrumentIds.includes(id)
        ? (config.instrumentIds.length > 1 ? config.instrumentIds.filter((x) => x !== id) : config.instrumentIds)
        : [...config.instrumentIds, id];
      stateManager.setSegmentField("instrumentIds", nextInsts);
    }
  );
  setupWbContainer(
    "list-ground-segment",
    "data-gs",
    "Ground Segment",
    (id) => GROUND_SEGMENT_STATIONS.find((x) => x.id === id),
    (id) => ({ groundId: id }),
    (id) => stateManager.setSegmentField("groundId", id)
  );

  listen(document.getElementById("trophy-selector-list"), "click", (ev) => {
    const btn = (ev.target as HTMLElement | null)?.closest("[data-trophy]");
    const tid = btn?.getAttribute("data-trophy");
    if (!tid) return;
    selectedTrophyId = tid;
    audio.uiSelect();
    updateTrophyView();
    renderRankingPanel();
  });

  listen(document.getElementById("wardrobe-grid"), "click", (ev) => {
    const btn = (ev.target as HTMLElement | null)?.closest("[data-suit-action]");
    const skinId = btn?.getAttribute("data-suit-action");
    if (!skinId) return;
    const sk = getSkin(skinId);
    if (stateManager.hasSuit(skinId)) {
      progress.skinId = skinId;
      stateManager.save();
      audio.uiSelect();
    } else if (stateManager.purchaseSuit(skinId, sk.price)) {
      audio.success();
    } else {
      audio.alarm();
      return;
    }
    renderPixelPortrait("portrait-commander", "commander");
    updateHUD();
    renderWardrobePanel();
  });

  const bindPhysicsSlider = (
    id: string,
    field: "gravityG" | "atmDensity" | "dragCoeff" | "throttlePct"
  ) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    listen(el, "input", () => {
      if (!el || (visor3D && visor3D.flight.phase !== "PAD")) return;
      stateManager.setPhysicsField(field, Number(el.value));
      if (visor3D && visor3D.flight.phase === "PAD") visor3D.resetPad();
      schedulePhysicsRender();
    });
  };
  bindPhysicsSlider("phys-gravity", "gravityG");
  bindPhysicsSlider("phys-atm", "atmDensity");
  bindPhysicsSlider("phys-drag", "dragCoeff");
  bindPhysicsSlider("phys-throttle", "throttlePct");

  listen(document.getElementById("btn-cam-orbit"), "click", () => {
    if (!visor3D) return;
    visor3D.cameraMode = (visor3D.cameraMode + 1) % 3;
    const labels = [t("camChase"), t("camPanorama"), t("camPayload")];
    const lblEl = document.getElementById("visor-camera-label");
    if (lblEl) lblEl.textContent = labels[visor3D.cameraMode];
    audio.uiSelect();
  });

  listen(document.getElementById("btn-wobble-toggle"), "click", (e) => {
    if (!visor3D) return;
    visor3D.pipe.wobbleEnabled = !visor3D.pipe.wobbleEnabled;
    const btn = e.currentTarget as HTMLElement | null;
    if (btn) btn.textContent = `WOBBLE: ${visor3D.pipe.wobbleEnabled ? "ON" : "OFF"}`;
    audio.uiSelect();
  });

  listen(window, "keydown", (ev) => {
    const e = ev as KeyboardEvent;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
    if (e.key === "Escape" && isModalOpen()) {
      closeModal();
      return;
    }
    if (currentStation === "launch" && mgState.active) {
      const k = e.key.toLowerCase();
      if (e.code === "Space") { e.preventDefault(); minigameAction("space", 1); }
      else if (k === "a" || e.key === "ArrowLeft") { e.preventDefault(); minigameAction("left", -1); }
      else if (k === "d" || e.key === "ArrowRight") { e.preventDefault(); minigameAction("right", 1); }
      else if (k === "w" || e.key === "ArrowUp") { e.preventDefault(); minigameAction("up", -1); }
      else if (k === "s" || e.key === "ArrowDown") { e.preventDefault(); minigameAction("down", 1); }
      else if (k === "z") { e.preventDefault(); minigameAction("dot", 1); }
      else if (k === "x") { e.preventDefault(); minigameAction("dash", 1); }
      else if (k >= "1" && k <= "5") { minigameAction("num", Number(k)); }
    }
  });

  listen(document.getElementById("input-callsign"), "input", (ev) => {
    const input = ev.target as HTMLInputElement;
    progress.callsign = (input.value || "ENG-SILVA").trim().slice(0, 16).toUpperCase() || "ENG-SILVA";
    stateManager.save();
  });

  listen(document.getElementById("btn-clear-records"), "click", () => {
    stateManager.clearRecords();
    renderRankingPanel();
  });

  document.querySelectorAll("[data-dpad]").forEach((b) => {
    const d = b.getAttribute("data-dpad");
    if (!d) return;
    if (d === "interact") {
      listen(b, "click", () => {
        if (base2D?.nearStation) openStation(base2D.nearStation.id);
      });
    } else {
      listen(b, "pointerdown", () => base2D?.setVirtualKey(d, true));
      listen(b, "pointerup", () => base2D?.setVirtualKey(d, false));
      listen(b, "pointerleave", () => base2D?.setVirtualKey(d, false));
      listen(b, "pointercancel", () => base2D?.setVirtualKey(d, false));
    }
  });

  return () => {
    disposed = true;
    hubScheduler.pause();
    if (impactRafId) cancelAnimationFrame(impactRafId);
    if (physicsRafId) cancelAnimationFrame(physicsRafId);
    cleanupCRT();
    if (modalState.openTimer !== null) clearTimeout(modalState.openTimer);
    if (modalState.closeTimer !== null) clearTimeout(modalState.closeTimer);
    cleanupListeners.forEach((fn) => fn());
    base2D?.dispose();
    visor3D?.dispose();
    trophy3D?.dispose();
    preview3D?.dispose();
    audio.dispose();
  };
}
