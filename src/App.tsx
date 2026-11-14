/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { mountGame } from "./game/controller";
import { audio, progress, stateManager } from "./game/data";
import { getLang, onLangChange, setLang, t, type Language } from "./game/i18n";

export default function App() {
  const [lang, setLangState] = useState<Language>(getLang);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [sfxOn, setSfxOn] = useState(audio.enabled);
  const [callsign, setCallsign] = useState(progress.callsign);

  useEffect(() => {
    document.documentElement.lang = getLang() === "pt" ? "pt-BR" : "en";
    const unsubLang = onLangChange((next) => setLangState(next));
    const cleanup = mountGame();
    return () => {
      unsubLang();
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [settingsOpen]);

  const handleToggleSfx = () => {
    const next = !audio.enabled;
    audio.setEnabled(next);
    setSfxOn(next);
    if (next) audio.uiSelect();
  };

  const handleSelectLang = (next: Language) => {
    setLang(next);
    audio.uiSelect();
  };

  const handleCallsignChange = (val: string) => {
    const sanitized = val.slice(0, 16).toUpperCase();
    setCallsign(sanitized);
    progress.callsign = sanitized.trim() || "ENG-SILVA";
    stateManager.save();
    const panelInput = document.getElementById("input-callsign") as HTMLInputElement | null;
    if (panelInput && panelInput.value !== sanitized) {
      panelInput.value = sanitized;
    }
  };

  return (
    <>
      <div id="crt-tube-shell" className="crt-tube-shell">
        {/* Top Navigation Bar (NASA Space Operations Console Header) */}
        <header className="w-full border-b-2 border-[#4b648a] bg-[#0b3d91]/90 shadow-[inset_0_-2px_0_rgba(252,61,33,0.85)] px-4 lg:px-6 h-16 flex items-center justify-between gap-6 shrink-0 z-30">
          {/* Zone 1: Single-element Brand Wordmark */}
          <a
            href="#top"
            id="brand-home-btn"
            className="font-pixel text-xs sm:text-sm tracking-tight text-white whitespace-nowrap shrink-0 hover:text-amber-300 transition-colors"
          >
            {t("brand")}
          </a>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden xl:flex items-center gap-6 text-[11px] font-pixel text-slate-200">
            <button
              type="button"
              data-nav="hub"
              className="nav-link text-amber-300 border-b-2 border-[#fc3d21] pb-1 whitespace-nowrap shrink-0"
            >
              {t("navHub")}
            </button>
            <button
              type="button"
              data-nav="quests"
              className="nav-link hover:text-white pb-1 border-b-2 border-transparent whitespace-nowrap shrink-0"
            >
              {t("navQuests")}
            </button>
            <button
              type="button"
              data-nav="workbench"
              className="nav-link hover:text-white pb-1 border-b-2 border-transparent whitespace-nowrap shrink-0"
            >
              {t("navWorkbench")}
            </button>
            <button
              type="button"
              data-nav="launch"
              className="nav-link hover:text-white pb-1 border-b-2 border-transparent whitespace-nowrap shrink-0"
            >
              {t("navConsole")}
            </button>
            <button
              type="button"
              data-nav="ranking"
              className="nav-link hover:text-white pb-1 border-b-2 border-transparent whitespace-nowrap shrink-0"
            >
              {t("navTrophies")}
            </button>
          </nav>

          {/* Zone 3: Settings, Audio & Quick Launch */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              id="btn-open-settings"
              onClick={() => {
                setSfxOn(audio.enabled);
                setCallsign(progress.callsign);
                setSettingsOpen(true);
                audio.uiSelect();
              }}
              className="pixel-btn px-2.5 sm:px-3 py-2 text-[10px] font-pixel bg-hull-800 text-cyan-200 whitespace-nowrap shrink-0"
            >
              {t("settingsBtn")}
            </button>
            <button
              type="button"
              id="btn-audio-toggle"
              onClick={handleToggleSfx}
              className="pixel-btn px-2.5 sm:px-3 py-2 text-[10px] font-pixel bg-hull-800 text-slate-100 whitespace-nowrap shrink-0"
            >
              {t(sfxOn ? "sfxOn" : "sfxOff")}
            </button>
            <button
              type="button"
              id="btn-quick-launch"
              className="pixel-btn px-3 sm:px-3.5 py-2 text-[10px] font-pixel bg-[#fc3d21] text-white whitespace-nowrap shrink-0"
            >
              {t("navConsole")}
            </button>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col max-w-[1440px] w-full mx-auto px-3 sm:px-5 py-4 pb-24 sm:pb-20 gap-4">
          {/* Top Mission Telemetry Strip (4 NASA Segments Summary) */}
          <section
            aria-label={t("telemetryAria")}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 pixel-panel p-3"
          >
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-xs text-slate-400">{t("userSegmentActive")}</span>
              <span id="hud-mission-name" className="text-sm font-bold text-amber-300 truncate mt-0.5">
                CML 1
              </span>
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-xs text-slate-400">{t("budgetPayload")}</span>
              <div className="font-mono tabular-nums text-sm mt-0.5 truncate">
                <span id="hud-cost" className="text-emerald-400">$25M</span>
                <span className="text-slate-500"> / </span>
                <span id="hud-budget-max" className="text-slate-300">$32M</span>
                <span className="text-slate-600 mx-1">·</span>
                <span id="hud-mass" className="text-slate-200">8 kg</span>
              </div>
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-xs text-slate-400">{t("powerScience")}</span>
              <div className="font-mono tabular-nums text-sm mt-0.5 truncate">
                <span id="hud-power" className="text-emerald-400">+20 W</span>
                <span className="text-slate-600 mx-1">·</span>
                <span id="hud-science" className="text-cyan-300">100 pts</span>
              </div>
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-xs text-slate-400">{t("careerSpaceBase")}</span>
              <div className="text-sm mt-0.5 flex items-center gap-2 truncate">
                <span id="hud-rank" className="text-white truncate"></span>
                <span className="text-slate-600">·</span>
                <span id="hud-base-level" className="text-amber-400 shrink-0 font-bold"></span>
              </div>
            </div>
          </section>

          {/* Primary Focal Stage: 2.5D NASA Command Hub Console */}
          <section id="stage-hub" className="flex-1 flex flex-col gap-3">
            <div className="pixel-panel overflow-hidden flex flex-col">
              <div className="nasa-console-stripe w-full"></div>
              {/* Stage Title Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b-2 border-[#3c567e] bg-[#0d244d]">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-pixel text-[11px] text-white whitespace-nowrap">
                    {t("commandCenterTitle")}
                  </span>
                  <span className="text-slate-400 hidden sm:inline">·</span>
                  <span id="base-evolution-desc" className="text-xs text-amber-300 truncate"></span>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono text-slate-200 shrink-0">
                  <span className="hidden md:inline">{t("controlsMove")}</span>
                  <span className="hidden md:inline text-slate-400">·</span>
                  <span className="hidden lg:inline">{t("controlsInteract")}</span>
                  <span className="hidden lg:inline text-slate-400">·</span>
                  <span
                    id="hud-credits"
                    className="tabular-nums px-2 py-0.5 bg-[#061024] border border-amber-400/60 text-amber-300 font-bold"
                  >
                    $0
                  </span>
                  <span id="hud-score-total" className="tabular-nums text-emerald-300 font-bold">
                    0 pts
                  </span>
                </div>
              </div>

              {/* 2.5D NASA Command Module Canvas + Vignette + Crisp HTML Label Overlay */}
              <div className="relative w-full bg-[#061024] flex items-center justify-center overflow-hidden py-1.5 px-1.5">
                <div className="relative w-full max-w-[995px] aspect-[16/9] border-2 border-[#4b648a] shadow-[inset_0_0_24px_rgba(14,165,233,0.22)]">
                  <canvas
                    id="base-canvas"
                    width={960}
                    height={540}
                    className="w-full h-full block pixelated cursor-crosshair"
                  ></canvas>
                  {/* Subtle Spatial Corner Vignette */}
                  <div className="stage-vignette pointer-events-none absolute inset-0 z-[5]"></div>
                  {/* Crisp HTML/CSS Overlay for Zero-Blur Labels, Signs & NPC Emotion Bubbles */}
                  <div
                    id="base-html-overlay"
                    className="pointer-events-none absolute inset-0 overflow-hidden z-10"
                  ></div>

                  {/* Proximity Interaction Prompt */}
                  <div
                    id="station-prompt"
                    className="prompt-pill absolute bottom-3 left-1/2 pixel-panel px-4 py-2 flex items-center gap-3 z-20"
                  >
                    <span className="font-pixel text-[10px] px-2 py-1 bg-amber-400 text-black">E</span>
                    <span id="station-prompt-label" className="text-sm font-bold text-white whitespace-nowrap">
                      {t("openStation")}
                    </span>
                    <button
                      type="button"
                      id="station-prompt-btn"
                      className="pixel-btn px-3 py-1.5 text-[10px] font-pixel bg-emerald-400 text-black whitespace-nowrap shrink-0"
                    >
                      {t("accessBtn")}
                    </button>
                  </div>

                  {/* Touch / Mobile D-Pad */}
                  <div className="md:hidden absolute bottom-3 left-3 grid grid-cols-3 gap-1 w-28 h-28 z-20 opacity-90">
                    <div></div>
                    <button
                      type="button"
                      data-dpad="up"
                      className="pixel-btn bg-hull-800 text-white text-xs flex items-center justify-center"
                    >
                      ▲
                    </button>
                    <div></div>
                    <button
                      type="button"
                      data-dpad="left"
                      className="pixel-btn bg-hull-800 text-white text-xs flex items-center justify-center"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      data-dpad="interact"
                      className="pixel-btn bg-amber-400 text-black font-pixel text-[9px] flex items-center justify-center"
                    >
                      E
                    </button>
                    <button
                      type="button"
                      data-dpad="right"
                      className="pixel-btn bg-hull-800 text-white text-xs flex items-center justify-center"
                    >
                      ▶
                    </button>
                    <div></div>
                    <button
                      type="button"
                      data-dpad="down"
                      className="pixel-btn bg-hull-800 text-white text-xs flex items-center justify-center"
                    >
                      ▼
                    </button>
                    <div></div>
                  </div>
                </div>
              </div>

              {/* 5 Physical Stations Quick-Access Bar */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 border-t-2 border-[#3a5582] divide-y md:divide-y-0 md:divide-x-2 divide-[#2a426b] bg-[#0a1936]">
                <button
                  type="button"
                  data-open-station="quests"
                  className="px-3.5 py-2.5 text-left hover:bg-hull-800 transition-colors flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-amber-400">{t("station01Tag")}</div>
                    <div className="font-pixel text-[9px] text-white group-hover:text-amber-300 mt-1 truncate">
                      {t("station01Title")}
                    </div>
                  </div>
                  <span className="font-pixel text-[9px] text-slate-500 group-hover:text-amber-300 shrink-0">&gt;</span>
                </button>
                <button
                  type="button"
                  data-open-station="workbench"
                  className="px-3.5 py-2.5 text-left hover:bg-hull-800 transition-colors flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-emerald-400">{t("station02Tag")}</div>
                    <div className="font-pixel text-[9px] text-white group-hover:text-emerald-300 mt-1 truncate">
                      {t("station02Title")}
                    </div>
                  </div>
                  <span className="font-pixel text-[9px] text-slate-500 group-hover:text-emerald-300 shrink-0">&gt;</span>
                </button>
                <button
                  type="button"
                  data-open-station="launch"
                  className="px-3.5 py-2.5 text-left hover:bg-hull-800 transition-colors flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-cyan-400">{t("station03Tag")}</div>
                    <div className="font-pixel text-[9px] text-white group-hover:text-cyan-300 mt-1 truncate">
                      {t("station03Title")}
                    </div>
                  </div>
                  <span className="font-pixel text-[9px] text-slate-500 group-hover:text-cyan-300 shrink-0">&gt;</span>
                </button>
                <button
                  type="button"
                  data-open-station="ranking"
                  className="px-3.5 py-2.5 text-left hover:bg-hull-800 transition-colors flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-amber-300">{t("station04Tag")}</div>
                    <div className="font-pixel text-[9px] text-white group-hover:text-amber-200 mt-1 truncate">
                      {t("station04Title")}
                    </div>
                  </div>
                  <span className="font-pixel text-[9px] text-slate-500 group-hover:text-amber-200 shrink-0">&gt;</span>
                </button>
                <button
                  type="button"
                  data-open-station="wardrobe"
                  className="col-span-2 md:col-span-1 px-3.5 py-2.5 text-left hover:bg-hull-800 transition-colors flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-purple-300">{t("station05Tag")}</div>
                    <div className="font-pixel text-[9px] text-white group-hover:text-purple-200 mt-1 truncate">
                      {t("station05Title")}
                    </div>
                  </div>
                  <span className="font-pixel text-[9px] text-slate-500 group-hover:text-purple-200 shrink-0">&gt;</span>
                </button>
              </div>
            </div>
          </section>

          {/* Station Modal Overlay (Integrated Holographic NASA Console) */}
          <div
            id="station-overlay"
            className="hidden modal-backdrop fixed inset-0 z-40 bg-[#040c1d]/86 flex items-center justify-center p-2 sm:p-5"
          >
            <div className="modal-dialog w-full max-w-6xl max-h-[94vh] pixel-panel flex flex-col overflow-hidden">
              <div className="nasa-console-stripe w-full shrink-0"></div>
              {/* Modal Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b-2 border-[#4b648a] bg-[#0e254e] shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <h2 id="modal-title" className="font-pixel text-xs sm:text-sm text-white truncate"></h2>
                  <span className="text-slate-400 hidden md:inline">·</span>
                  <span id="modal-subtitle" className="text-xs text-cyan-200 hidden md:inline truncate">
                    NASA Space Apps Challenge 2026
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 overflow-x-auto">
                  <button
                    type="button"
                    data-switch-station="quests"
                    className="station-tab pixel-btn px-2.5 py-1.5 font-pixel text-[9px] whitespace-nowrap shrink-0"
                  >
                    {t("tabQuests")}
                  </button>
                  <button
                    type="button"
                    data-switch-station="workbench"
                    className="station-tab pixel-btn px-2.5 py-1.5 font-pixel text-[9px] whitespace-nowrap shrink-0"
                  >
                    {t("tabWorkbench")}
                  </button>
                  <button
                    type="button"
                    data-switch-station="launch"
                    className="station-tab pixel-btn px-2.5 py-1.5 font-pixel text-[9px] whitespace-nowrap shrink-0"
                  >
                    {t("tabConsole")}
                  </button>
                  <button
                    type="button"
                    data-switch-station="ranking"
                    className="station-tab pixel-btn px-2.5 py-1.5 font-pixel text-[9px] whitespace-nowrap shrink-0"
                  >
                    {t("tabTrophies")}
                  </button>
                  <button
                    type="button"
                    data-switch-station="wardrobe"
                    className="station-tab pixel-btn px-2.5 py-1.5 font-pixel text-[9px] whitespace-nowrap shrink-0"
                  >
                    {t("tabSuits")}
                  </button>
                  <button
                    type="button"
                    id="btn-close-modal"
                    className="pixel-btn ml-1 px-3 py-1.5 font-pixel text-[9px] bg-[#fc3d21] text-white whitespace-nowrap shrink-0"
                  >
                    {t("exitEsc")}
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 pb-24 bg-hull-900">
                {/* PANEL 1: QUEST BOARD (CML 1–4) */}
                <div id="panel-quests" className="station-panel hidden space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pixel-panel-dark p-4">
                    <div className="flex items-center gap-4">
                      <canvas
                        id="portrait-quests"
                        width={48}
                        height={48}
                        className="w-14 h-14 pixelated border-2 border-[#334460] bg-[#090d14] shrink-0"
                      ></canvas>
                      <div>
                        <h3 className="font-pixel text-xs sm:text-sm text-white">
                          {t("questsHeader")}
                        </h3>
                        <p className="text-sm text-slate-300 mt-1.5 max-w-2xl">
                          {t("questsQuote")}
                        </p>
                      </div>
                    </div>
                    <div className="font-pixel text-[11px] text-amber-300 shrink-0">
                      {t("completedLabel")} <span id="quest-completed-count">0 / 15</span>
                    </div>
                  </div>

                  <div id="quests-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
                </div>

                {/* PANEL 2: ENGINEERING WORKBENCH (4 NASA SEGMENTS + GREEN CRT TECH SPEC) */}
                <div id="panel-workbench" className="station-panel hidden grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left 7 Cols: The 4 NASA Mission Segments */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Segment 1: Launch Segment */}
                    <section className="pixel-panel-dark p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h3 className="font-pixel text-[10px] text-amber-400">
                          {t("seg1Title")}
                        </h3>
                        <span className="text-xs text-slate-400">{t("seg1Hint")}</span>
                      </div>
                      <div id="list-launch-segment" className="grid grid-cols-1 gap-2"></div>
                    </section>

                    {/* Segment 2A: Space Segment (Bus) */}
                    <section className="pixel-panel-dark p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h3 className="font-pixel text-[10px] text-amber-400">
                          {t("seg2aTitle")}
                        </h3>
                        <span className="text-xs text-slate-400">{t("seg2aHint")}</span>
                      </div>
                      <div id="list-space-buses" className="grid grid-cols-1 gap-2"></div>
                    </section>

                    {/* Segment 2B: Space Segment (Instruments) */}
                    <section className="pixel-panel-dark p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h3 className="font-pixel text-[10px] text-emerald-400">
                          {t("seg2bTitle")}
                        </h3>
                        <span className="text-xs text-slate-400">{t("seg2bHint")}</span>
                      </div>
                      <div id="list-space-instruments" className="grid grid-cols-1 gap-2"></div>
                    </section>

                    {/* Segment 3 & 4: Ground Segment + User Segment */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="pixel-panel-dark p-3 space-y-2">
                        <h3 className="font-pixel text-[10px] text-cyan-300">{t("seg3Title")}</h3>
                        <div id="list-ground-segment" className="space-y-1.5"></div>
                      </div>
                      <div className="pixel-panel-dark p-3 space-y-2">
                        <h3 className="font-pixel text-[10px] text-amber-300">{t("seg4Title")}</h3>
                        <div id="user-segment-card" className="text-xs space-y-1 text-slate-300"></div>
                      </div>
                    </section>
                  </div>

                  {/* Right 5 Cols: Green Phosphor CRT 3D Preview + Tech Spec Monitor + Trade-Study Matrix */}
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    <div className="crt-green p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-[#176e2e] pb-2 text-xs crt-glow z-10">
                        <span className="font-pixel text-[9px] flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 bg-[#33ff66] animate-pulse shrink-0"></span>
                          <span>{t("crtTechSpec")}</span>
                        </span>
                        <span id="crt-code-id" className="font-mono">SYS-ONLINE</span>
                      </div>

                      {/* Embedded Green-Phosphor 3D Holographic Item Preview */}
                      <div className="relative w-full max-w-[304px] mx-auto aspect-[4/3] bg-[#030d06] border-2 border-[#176e2e] overflow-hidden visor-scanlines z-10">
                        <canvas
                          id="preview-3d-canvas"
                          width={320}
                          height={240}
                          className="w-full h-full pixelated block cursor-grab active:cursor-grabbing"
                        ></canvas>
                        <div className="absolute top-1.5 right-1.5 font-mono text-[9px] text-[#33ff66] bg-[#030d06]/85 px-1.5 py-0.5 border border-[#176e2e] pointer-events-none z-10 crt-glow">
                          <span id="preview-3d-tag">M01 · LV_CUBESAT</span>
                        </div>
                        <div className="absolute bottom-1.5 left-1.5 font-mono text-[9px] text-[#33ff66]/85 bg-[#030d06]/70 px-1 pointer-events-none z-10 crt-glow">
                          {t("previewDrag")}
                        </div>
                      </div>

                      <pre
                        id="crt-output"
                        className="font-mono text-xs leading-relaxed whitespace-pre-wrap crt-glow overflow-y-auto max-h-[190px] pt-2 border-t border-[#176e2e]/70 z-10"
                      ></pre>
                    </div>

                    {/* Real-Time Trade Studies & Engineering Validation */}
                    <div className="pixel-panel-dark p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2.5">
                          <canvas
                            id="portrait-workbench"
                            width={48}
                            height={48}
                            className="w-10 h-10 pixelated border border-[#334460] bg-[#090d14] shrink-0"
                          ></canvas>
                          <div>
                            <div className="font-pixel text-[10px] text-white">{t("sysBalance")}</div>
                            <div id="wb-mission-short" className="text-xs text-amber-300">CML 1</div>
                          </div>
                        </div>
                        <span id="wb-overall-status" className="font-pixel text-[10px] text-emerald-400">
                          {t("approved")}
                        </span>
                      </div>

                      {/* Mission Viability Progress Meter */}
                      <div className="bg-hull-950/70 border border-slate-800 px-2.5 py-1.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                          <span className="text-cyan-300 font-bold tracking-wide">{t("wbViabilityLabel")}</span>
                          <span id="wb-viability-pct" className="text-emerald-400 font-bold">100%</span>
                        </div>
                        <div className="w-full h-2 bg-hull-950 border border-slate-800">
                          <div
                            id="wb-viability-bar"
                            className="h-full bg-emerald-400 transition-all duration-150"
                            style={{ width: "100%" }}
                          ></div>
                        </div>
                      </div>

                      {/* Tactical Impact Matrix & Hover Comparison Visor */}
                      <div className="bg-hull-950/60 border border-slate-800 p-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                          <span className="text-slate-300 font-bold uppercase tracking-wider">{t("wbImpactTitle")}</span>
                          <span id="wb-hover-delta" className="hidden text-amber-300 font-bold truncate">
                            {t("wbHoverPreviewTag")}
                          </span>
                        </div>
                        <canvas
                          id="wb-impact-canvas"
                          width={360}
                          height={116}
                          className="w-full aspect-[360/116] bg-[#040c18] border border-[#2b3952] block pixelated"
                        ></canvas>
                      </div>

                      <div className="space-y-2.5 text-xs font-mono tabular-nums">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-slate-400">{t("totalBudget")}</span>
                            <span id="wb-budget-val"></span>
                          </div>
                          <div className="w-full h-2 bg-hull-950 border border-slate-800">
                            <div
                              id="wb-budget-bar"
                              className="h-full bg-emerald-400 transition-all duration-150"
                              style={{ width: "50%" }}
                            ></div>
                          </div>
                          {/* Artemis Program 4-Segment Cost Split */}
                          <div id="wb-cost-split" className="mt-1.5 space-y-1">
                            <div className="w-full h-1.5 bg-hull-950 border border-slate-800 flex overflow-hidden">
                              <div id="wb-split-launch-bar" className="h-full bg-amber-400" style={{ width: "25%" }}></div>
                              <div id="wb-split-bus-bar" className="h-full bg-cyan-400" style={{ width: "25%" }}></div>
                              <div id="wb-split-inst-bar" className="h-full bg-emerald-400" style={{ width: "25%" }}></div>
                              <div id="wb-split-ground-bar" className="h-full bg-violet-400" style={{ width: "25%" }}></div>
                            </div>
                            <div className="grid grid-cols-4 gap-1 text-[10px] font-mono tabular-nums">
                              <div className="truncate"><span className="text-amber-300">■ {t("wbSegLaunch")}</span> <span id="wb-split-launch" className="text-slate-300">$0M</span></div>
                              <div className="truncate"><span className="text-cyan-300">■ {t("wbSegBus")}</span> <span id="wb-split-bus" className="text-slate-300">$0M</span></div>
                              <div className="truncate"><span className="text-emerald-300">■ {t("wbSegInst")}</span> <span id="wb-split-inst" className="text-slate-300">$0M</span></div>
                              <div className="truncate"><span className="text-violet-300">■ {t("wbSegGround")}</span> <span id="wb-split-ground" className="text-slate-300">$0M</span></div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-slate-400">{t("payloadVsLauncher")}</span>
                            <span id="wb-mass-val"></span>
                          </div>
                          <div className="w-full h-2 bg-hull-950 border border-slate-800">
                            <div
                              id="wb-mass-bar"
                              className="h-full bg-emerald-400 transition-all duration-150"
                              style={{ width: "20%" }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-slate-400">{t("powerDrawVsGen")}</span>
                            <span id="wb-power-val"></span>
                          </div>
                          <div className="w-full h-2 bg-hull-950 border border-slate-800">
                            <div
                              id="wb-power-bar"
                              className="h-full bg-emerald-400 transition-all duration-150"
                              style={{ width: "40%" }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-800">
                          <span className="text-slate-400">{t("totalScience")}</span>
                          <span id="wb-science-val"></span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{t("requiredBand")}</span>
                          <span id="wb-wave-val"></span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{t("wbGroundSegmentCost")}</span>
                          <span id="wb-ground-val"></span>
                        </div>
                      </div>

                      <div
                        id="wb-warnings"
                        className="text-xs text-rose-300 space-y-1 hidden pt-2 border-t border-slate-800"
                      ></div>

                      <button
                        type="button"
                        id="btn-go-to-launch"
                        className="pixel-btn w-full py-3 px-4 bg-amber-400 text-black font-pixel text-[10px]"
                      >
                        {t("goToPadBtn")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* PANEL 3: LAUNCH PLATFORM & 320x240 3D TELEMETRY VISOR + MISSION MINIGAMES */}
                <div id="panel-launch" className="station-panel hidden grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left 7 Cols: Embedded 320x240 3D Telemetry Visor */}
                  <div className="lg:col-span-7 flex flex-col gap-3">
                    <div className="pixel-panel-dark p-3">
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                        <span className="font-pixel text-[9px] text-cyan-300">{t("visorTitle")}</span>
                        <span id="visor-camera-label">{t("camPlatform")}</span>
                      </div>

                      <div className="relative w-full aspect-[4/3] bg-black border-2 border-[#2b3952] overflow-hidden visor-scanlines">
                        <canvas
                          id="visor-3d-canvas"
                          width={320}
                          height={240}
                          className="w-full h-full pixelated block"
                        ></canvas>

                        {/* Corner Telemetry Overlay */}
                        <div className="absolute top-2 left-2 font-mono tabular-nums text-xs leading-tight text-emerald-300 bg-black/75 border border-emerald-500/30 px-2.5 py-1.5 pointer-events-none z-10">
                          <div>
                            {t("altLabel")} <span id="tel-alt">0.0</span> km
                          </div>
                          <div>
                            {t("velLabel")} <span id="tel-vel">0.00</span> km/s
                          </div>
                          <div>
                            {t("accelLabel")} <span id="tel-g">1.0</span> G
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 font-mono tabular-nums text-xs leading-tight text-amber-300 bg-black/75 border border-amber-500/30 px-2.5 py-1.5 text-right pointer-events-none z-10">
                          <div id="tel-phase">{t("phasePad")}</div>
                          <div>
                            T+ <span id="tel-time">00.0</span> s
                          </div>
                        </div>

                        {/* Active Mission Minigame HUD Dock (Prominent Dynamic CRT Stage) */}
                        <div
                          id="minigame-hud"
                          className="hidden hud-slide absolute inset-x-2 bottom-2 top-[19%] flex flex-col justify-between bg-[#050b16]/94 border-2 border-amber-400 p-2.5 sm:p-3 z-20 overflow-hidden shadow-[0_0_26px_rgba(251,191,36,0.32)]"
                        >
                          {/* Particle Spark & Impact Flash Canvas Overlay */}
                          <canvas
                            id="mg-fx-canvas"
                            width={480}
                            height={240}
                            className="pointer-events-none absolute inset-0 w-full h-full z-30"
                          ></canvas>

                          {/* Urgency Header + Blinking LEDs + Countdown */}
                          <div className="relative z-10 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span id="mg-led-l" className="inline-block w-2.5 h-2.5 bg-amber-400 border border-black mg-blink-led shrink-0"></span>
                                <span id="mg-title" className="font-pixel text-[8px] sm:text-[9px] text-amber-300 truncate">
                                  MINIGAME
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums text-xs">
                                <span id="mg-clock" className="px-1.5 py-0.5 bg-rose-950/80 border border-rose-500/70 text-rose-300 font-bold">
                                  T-12.0s
                                </span>
                                <span id="mg-status" className="text-emerald-300 font-bold">
                                  {t("syncLabel")} 0%
                                </span>
                                <span id="mg-led-r" className="inline-block w-2.5 h-2.5 bg-emerald-400 border border-black mg-blink-led shrink-0"></span>
                              </div>
                            </div>

                            {/* Regressive Urgency Progress Bar */}
                            <div className="w-full h-2 bg-hull-950 border border-slate-700 overflow-hidden">
                              <div
                                id="mg-timer-bar"
                                className="h-full bg-cyan-400 transition-colors duration-150"
                                style={{ width: "100%" }}
                              ></div>
                            </div>

                            {/* Clear Quick-Action Directive Callout */}
                            <div
                              id="mg-callout"
                              className="px-2 py-1 bg-amber-400/15 border border-amber-400/60 font-pixel text-[8px] text-amber-200 tracking-wide truncate"
                            >
                              ACTION READY
                            </div>
                          </div>

                          {/* Spacious Interactive Minigame Theater */}
                          <div id="mg-body" className="relative z-10 flex-1 flex flex-col justify-center gap-2 min-h-0 pt-1"></div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            id="btn-cam-orbit"
                            className="pixel-btn px-2.5 py-1.5 bg-hull-800 text-slate-200 font-pixel text-[9px]"
                          >
                            {t("switchCam")}
                          </button>
                          <button
                            type="button"
                            id="btn-wobble-toggle"
                            className="pixel-btn px-2.5 py-1.5 bg-hull-800 text-slate-200 font-pixel text-[9px]"
                          >
                            WOBBLE: ON
                          </button>
                        </div>
                        <span className="text-slate-400 font-mono">
                          {t("visorFooter")}
                        </span>
                      </div>
                    </div>

                    {/* Simulador de Gravidade & Atmosfera Interativa (Baseada em Dados NASA) */}
                    <div id="phys-sim-card" className="pixel-panel-dark p-3.5 space-y-2.5 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                        <h3 className="font-pixel text-[9px] sm:text-[10px] text-cyan-300">
                          {t("physSimTitle")}
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            id="btn-phys-reseed"
                            className="pixel-btn px-2 py-0.5 bg-hull-800 text-slate-300 font-pixel text-[7px]"
                          >
                            {t("physReseedBtn")}
                          </button>
                          <span
                            id="phys-status-badge"
                            className="font-pixel text-[8px] px-2 py-0.5 border border-rose-500/70 bg-rose-950/60 text-rose-300"
                          >
                            {t("physStableDanger")}
                          </span>
                        </div>
                      </div>

                      {/* NASA Mission Target Profile & Live Stability Meter */}
                      <div className="bg-hull-950 border border-slate-800 p-2 space-y-1.5 text-xs font-mono">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span id="phys-nasa-env" className="text-cyan-300 font-bold truncate">
                            NASA LEO
                          </span>
                          <span className="tabular-nums text-[11px] text-slate-300">
                            {t("physStabilityLabel")}: <b id="phys-stability-pct" className="text-rose-400">0%</b>
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#030712] border border-slate-700 overflow-hidden">
                          <div
                            id="phys-stability-bar"
                            className="h-full bg-rose-500 transition-all duration-150"
                            style={{ width: "25%" }}
                          ></div>
                        </div>
                        <div id="phys-nasa-note" className="text-[11px] text-slate-400 leading-snug"></div>
                      </div>

                      {/* Environment Presets */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          data-phys-preset="earth"
                          className="phys-preset-btn pixel-btn py-1.5 px-2 font-pixel text-[8px] bg-hull-800 text-slate-200"
                        >
                          {t("physPresetEarth")}
                        </button>
                        <button
                          type="button"
                          data-phys-preset="upper_atm"
                          className="phys-preset-btn pixel-btn py-1.5 px-2 font-pixel text-[8px] bg-hull-800 text-slate-200"
                        >
                          {t("physPresetUpper")}
                        </button>
                        <button
                          type="button"
                          data-phys-preset="lunar"
                          className="phys-preset-btn pixel-btn py-1.5 px-2 font-pixel text-[8px] bg-hull-800 text-slate-200"
                        >
                          {t("physPresetLunar")}
                        </button>
                        <button
                          type="button"
                          data-phys-preset="micro"
                          className="phys-preset-btn pixel-btn py-1.5 px-2 font-pixel text-[8px] bg-hull-800 text-slate-200"
                        >
                          {t("physPresetMicro")}
                        </button>
                      </div>

                      {/* Sliders with Visual NASA Target Brackets + Trajectory Canvas */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-6 space-y-2 text-xs font-mono tabular-nums">
                          <div>
                            <div className="flex justify-between text-slate-300 mb-0.5 text-[11px]">
                              <label htmlFor="phys-gravity">{t("physGravityLabel")}</label>
                              <span>
                                <span id="phys-g-target" className="text-emerald-400/80 text-[10px] mr-1.5"></span>
                                <b id="phys-gravity-val" className="text-amber-300">1.00 G</b>
                              </span>
                            </div>
                            <div className="relative">
                              <div className="h-1 w-full bg-hull-950 border border-slate-800 relative mb-0.5">
                                <div id="phys-g-zone" className="absolute inset-y-0 bg-emerald-400/75" style={{ left: "45%", width: "12%" }}></div>
                              </div>
                              <input
                                id="phys-gravity"
                                type="range"
                                min="0.05"
                                max="2.0"
                                step="0.05"
                                defaultValue="1.0"
                                className="w-full accent-amber-400 cursor-pointer"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-slate-300 mb-0.5 text-[11px]">
                              <label htmlFor="phys-atm">{t("physAtmLabel")}</label>
                              <span>
                                <span id="phys-atm-target" className="text-emerald-400/80 text-[10px] mr-1.5"></span>
                                <b id="phys-atm-val" className="text-cyan-300">1.00 ATM</b>
                              </span>
                            </div>
                            <div className="relative">
                              <div className="h-1 w-full bg-hull-950 border border-slate-800 relative mb-0.5">
                                <div id="phys-atm-zone" className="absolute inset-y-0 bg-emerald-400/75" style={{ left: "60%", width: "15%" }}></div>
                              </div>
                              <input
                                id="phys-atm"
                                type="range"
                                min="0"
                                max="1.5"
                                step="0.05"
                                defaultValue="1.0"
                                className="w-full accent-cyan-400 cursor-pointer"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-slate-300 mb-0.5 text-[11px]">
                              <label htmlFor="phys-drag">{t("physDragLabel")}</label>
                              <span>
                                <span id="phys-drag-target" className="text-emerald-400/80 text-[10px] mr-1.5"></span>
                                <b id="phys-drag-val" className="text-emerald-300">0.45 Cd</b>
                              </span>
                            </div>
                            <div className="relative">
                              <div className="h-1 w-full bg-hull-950 border border-slate-800 relative mb-0.5">
                                <div id="phys-drag-zone" className="absolute inset-y-0 bg-emerald-400/75" style={{ left: "25%", width: "22%" }}></div>
                              </div>
                              <input
                                id="phys-drag"
                                type="range"
                                min="0.15"
                                max="1.2"
                                step="0.05"
                                defaultValue="0.45"
                                className="w-full accent-emerald-400 cursor-pointer"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-slate-300 mb-0.5 text-[11px]">
                              <label htmlFor="phys-throttle">{t("physThrottleLabel")}</label>
                              <span id="phys-throttle-val" className="text-amber-300 font-bold">
                                100%
                              </span>
                            </div>
                            <input
                              id="phys-throttle"
                              type="range"
                              min="60"
                              max="150"
                              step="5"
                              defaultValue="100"
                              className="w-full accent-amber-400 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6 space-y-1">
                          <canvas
                            id="physics-traj-canvas"
                            width={300}
                            height={156}
                            className="w-full aspect-[2/1] bg-[#040c18] border border-[#2b3952] block pixelated"
                          ></canvas>
                          <div className="text-[10px] font-mono text-slate-400 text-center">
                            {t("physTrajCaption")} · <span className="text-cyan-300">{t("physRefTrajLegend")}</span>
                          </div>
                        </div>
                      </div>

                      {/* 6-Cell Calibrated Telemetry Strip */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-2 border-t border-slate-800 text-[11px] font-mono tabular-nums">
                        <div className="p-1.5 bg-hull-950 border border-slate-800">
                          <div className="text-slate-400 text-[10px] truncate">{t("physWeightLabel")}</div>
                          <div id="phys-weight-val" className="text-rose-300 font-bold">0 kN</div>
                        </div>
                        <div className="p-1.5 bg-hull-950 border border-slate-800">
                          <div className="text-slate-400 text-[10px] truncate">{t("physThrustReqLabel")}</div>
                          <div id="phys-req-val" className="text-amber-300 font-bold">0 kN</div>
                        </div>
                        <div className="p-1.5 bg-hull-950 border border-slate-800">
                          <div className="text-slate-400 text-[10px] truncate">{t("physThrustAvailLabel")}</div>
                          <div id="phys-thrust-val" className="text-emerald-300 font-bold">0 kN</div>
                        </div>
                        <div className="p-1.5 bg-hull-950 border border-slate-800">
                          <div className="text-slate-400 text-[10px] truncate">{t("physTwrLabel")}</div>
                          <div id="phys-twr-val" className="text-emerald-300 font-bold">1.00</div>
                        </div>
                        <div className="p-1.5 bg-hull-950 border border-slate-800">
                          <div className="text-slate-400 text-[10px] truncate">{t("physDragPeakLabel")}</div>
                          <div id="phys-dragpeak-val" className="text-cyan-300 font-bold">0 kN</div>
                        </div>
                        <div className="p-1.5 bg-hull-950 border border-slate-800">
                          <div className="text-slate-400 text-[10px] truncate">{t("physDeltaVLabel")} / {t("physApogeeLabel")}</div>
                          <div id="phys-apogee-val" className="text-white font-bold">0 km</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right 5 Cols: Flight Director Console & Debrief */}
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    <div className="pixel-panel-dark p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                        <h3 className="font-pixel text-[10px] text-white">{t("flightDirector")}</h3>
                        <span id="launch-mission-badge" className="text-xs font-mono text-amber-300">
                          CML 1
                        </span>
                      </div>

                      <div id="launch-checklist" className="grid grid-cols-2 gap-2 text-xs font-mono"></div>

                      <div className="space-y-2 pt-2 border-t border-slate-800 text-xs font-mono tabular-nums">
                        <div className="flex justify-between text-slate-400">
                          <span>{t("stagePropellant")}</span>
                          <span id="tel-fuel">100%</span>
                        </div>
                        <div className="w-full h-2.5 bg-hull-950 border border-slate-700">
                          <div
                            id="tel-fuel-bar"
                            className="h-full bg-amber-400 transition-all duration-100"
                            style={{ width: "100%" }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-slate-400 pt-1">
                          <span>{t("missionProtocol")}</span>
                          <span id="launch-minigame-name" className="text-cyan-300">
                            VALVE_PRESSURE
                          </span>
                        </div>
                      </div>

                      <div className="pt-1 flex gap-2">
                        <button
                          type="button"
                          id="btn-start-launch"
                          className="pixel-btn flex-1 py-2.5 px-3 bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 text-black font-pixel text-[10px]"
                        >
                          {t("startLaunch")}
                        </button>
                        <button
                          type="button"
                          id="btn-reset-pad"
                          className="pixel-btn px-3 py-2.5 bg-hull-800 text-slate-200 font-pixel text-[10px]"
                        >
                          {t("resetBtn")}
                        </button>
                      </div>
                    </div>

                    {/* Amber CRT Telemetry Log */}
                    <div className="crt-amber p-3 flex-1 min-h-[145px] flex flex-col">
                      <div className="flex items-center justify-between text-xs border-b border-amber-500/30 pb-1.5 mb-2">
                        <span className="font-pixel text-[9px]">{t("telemetryLog")}</span>
                        <span id="flight-bonus-tag" className="font-mono">
                          {t("bonusTag")} +0%
                        </span>
                      </div>
                      <div id="flight-log" className="font-mono text-xs space-y-1 overflow-y-auto max-h-[125px] z-10"></div>
                    </div>

                    {/* Debrief Result Card */}
                    <div id="debrief-card" className="hidden hud-slide pixel-panel-dark p-4 space-y-2 border-emerald-400">
                      <div className="flex items-center justify-between gap-2">
                        <h4 id="debrief-title" className="font-pixel text-[11px] text-emerald-400">
                          {t("orbitSuccessTitle")}
                        </h4>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            id="debrief-credits"
                            className="font-mono tabular-nums text-sm font-bold px-2 py-0.5 bg-amber-400/15 border border-amber-400/60 text-amber-300"
                          >
                            +$0
                          </span>
                          <span id="debrief-score" className="font-mono tabular-nums text-lg font-bold text-emerald-300">
                            +0 pts
                          </span>
                        </div>
                      </div>
                      <p id="debrief-summary" className="text-xs text-slate-200 leading-relaxed"></p>
                      <div
                        id="debrief-breakdown"
                        className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono tabular-nums text-slate-400 pt-1 border-t border-slate-800"
                      ></div>
                    </div>
                  </div>
                </div>

                {/* PANEL 4: TROPHY HALL & LEADERBOARD */}
                <div id="panel-ranking" className="station-panel hidden grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="pixel-panel-dark p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <canvas
                            id="portrait-commander"
                            width={48}
                            height={48}
                            className="w-12 h-12 pixelated border-2 border-amber-400/70 bg-[#090d14] shrink-0"
                          ></canvas>
                          <div>
                            <div className="text-xs text-slate-400">{t("careerRankLabel")}</div>
                            <h3 id="rank-current-title" className="font-pixel text-xs sm:text-sm text-amber-300 mt-1"></h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label htmlFor="input-callsign" className="text-xs text-slate-400">
                            {t("callsignLabel")}
                          </label>
                          <input
                            id="input-callsign"
                            type="text"
                            maxLength={16}
                            defaultValue={callsign}
                            className="bg-hull-950 border-2 border-[#334460] px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-amber-400 w-32"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-mono tabular-nums text-slate-300">
                          <span id="rank-progress-label"></span>
                          <span id="rank-points-label">0 / 400 pts</span>
                        </div>
                        <div className="w-full h-2.5 bg-hull-950 border border-slate-700">
                          <div
                            id="rank-progress-bar"
                            className="h-full bg-amber-400 transition-all duration-300"
                            style={{ width: "0%" }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
                        <div className="p-2 bg-hull-900 border border-slate-700">
                          <div className="text-slate-400">{t("baseLvl1")}</div>
                          <div className="font-bold text-white mt-0.5">{t("baseLvl1Name")}</div>
                        </div>
                        <div id="base-tier-2" className="p-2 bg-hull-900 border border-slate-700 opacity-50">
                          <div className="text-slate-400">{t("baseLvl2")}</div>
                          <div className="font-bold text-white mt-0.5">{t("baseLvl2Req")}</div>
                        </div>
                        <div id="base-tier-3" className="p-2 bg-hull-900 border border-slate-700 opacity-50">
                          <div className="text-slate-400">{t("baseLvl3")}</div>
                          <div className="font-bold text-white mt-0.5">{t("baseLvl3Req")}</div>
                        </div>
                      </div>
                    </div>

                    <div className="pixel-panel-dark overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                        <h4 className="font-pixel text-[10px] text-white">{t("historyTitle")}</h4>
                        <button type="button" id="btn-clear-records" className="text-xs text-slate-400 hover:text-rose-400">
                          {t("clearBtn")}
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono tabular-nums">
                          <thead className="bg-hull-950 text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="py-2 px-3">#</th>
                              <th className="py-2 px-3">{t("tblCallsign")}</th>
                              <th className="py-2 px-3">{t("tblMission")}</th>
                              <th className="py-2 px-3 text-right">{t("tblCost")}</th>
                              <th className="py-2 px-3 text-right">{t("tblScore")}</th>
                            </tr>
                          </thead>
                          <tbody id="leaderboard-body" className="divide-y divide-slate-800/80 text-slate-200"></tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Right 5 Cols: Interactive 3D Trophy Turntable */}
                  <div className="lg:col-span-5 flex flex-col gap-3">
                    <div className="pixel-panel-dark p-3">
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                        <span className="font-pixel text-[9px] text-amber-300">{t("trophyHallTitle")}</span>
                        <span id="trophy-count-label">0 / 15</span>
                      </div>
                      <div className="relative w-full aspect-[4/3] bg-black border-2 border-[#2b3952] overflow-hidden visor-scanlines">
                        <canvas
                          id="trophy-3d-canvas"
                          width={320}
                          height={240}
                          className="w-full h-full pixelated block"
                        ></canvas>
                        <div
                          id="trophy-locked-overlay"
                          className="hidden absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center z-10"
                        >
                          <div className="font-pixel text-[10px] text-slate-300">{t("trophyLocked")}</div>
                          <div className="text-xs text-slate-400 mt-2">
                            {t("trophyLockedDesc")}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div id="trophy-selector-list" className="grid grid-cols-2 gap-2"></div>
                  </div>
                </div>

                {/* PANEL 5: WARDROBE / SUIT LOCKER & NASA CREDITS SHOP */}
                <div id="panel-wardrobe" className="station-panel hidden space-y-5">
                  <div className="pixel-panel-dark p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-pixel text-xs sm:text-sm text-purple-300">{t("wardrobeTitle")}</h3>
                      <p className="text-sm text-slate-300 mt-1">
                        {t("wardrobeDesc")}
                      </p>
                    </div>
                    <div className="flex flex-col sm:items-end gap-1 text-xs font-mono shrink-0">
                      <div className="px-2.5 py-1 bg-[#060910] border border-amber-400/70 text-amber-300">
                        {t("creditsLabel")}{" "}
                        <b id="wardrobe-credits" className="tabular-nums">
                          $0
                        </b>
                      </div>
                      <div className="text-emerald-300">
                        {t("equippedLabel")} <b id="wardrobe-active-name"></b>
                      </div>
                    </div>
                  </div>
                  <div id="wardrobe-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom-Left Dedicated Corner Language Switcher (1-click PT / EN) */}
      <aside
        id="lang-corner-switcher"
        aria-label={t("settingsLangLabel")}
        className="fixed bottom-3 left-3 z-50 crt-green px-2 py-1.5 flex items-center gap-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.75)]"
      >
        <span className="font-pixel text-[8px] crt-glow z-10 pr-1 border-r border-[#176e2e]">
          {t("langCornerTitle")}
        </span>
        <button
          type="button"
          onClick={() => handleSelectLang("pt")}
          aria-pressed={lang === "pt"}
          className={`z-10 px-2 py-0.5 font-pixel text-[8px] border transition-colors cursor-pointer ${
            lang === "pt"
              ? "bg-[#33ff66] text-[#041208] border-[#33ff66]"
              : "bg-[#041409] text-[#33ff66]/80 border-[#176e2e] hover:text-[#33ff66]"
          }`}
        >
          PT
        </button>
        <button
          type="button"
          onClick={() => handleSelectLang("en")}
          aria-pressed={lang === "en"}
          className={`z-10 px-2 py-0.5 font-pixel text-[8px] border transition-colors cursor-pointer ${
            lang === "en"
              ? "bg-[#33ff66] text-[#041208] border-[#33ff66]"
              : "bg-[#041409] text-[#33ff66]/80 border-[#176e2e] hover:text-[#33ff66]"
          }`}
        >
          EN
        </button>
      </aside>

      {/* Settings Modal */}
      {settingsOpen && (
        <div
          id="settings-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSettingsOpen(false);
          }}
          className="fixed inset-0 z-[60] bg-[#040c1d]/82 flex items-center justify-center p-4 settings-backdrop-enter"
        >
          <div className="pixel-panel w-full max-w-md overflow-hidden settings-dialog-enter">
            <div className="nasa-console-stripe w-full"></div>
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#4b648a] bg-[#0e254e]">
              <h2 className="font-pixel text-xs text-white">{t("settingsTitle")}</h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="pixel-btn px-2.5 py-1 bg-[#fc3d21] text-white font-pixel text-[9px]"
              >
                X
              </button>
            </div>
            <div className="p-4 bg-hull-900 space-y-4 text-xs">
              {/* Language Setting */}
              <div className="space-y-1.5">
                <div className="text-slate-300 font-bold">{t("settingsLangLabel")}</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectLang("pt")}
                    className={`pixel-btn py-2 px-3 font-pixel text-[9px] ${
                      lang === "pt" ? "bg-emerald-400 text-black" : "bg-hull-800 text-slate-200"
                    }`}
                  >
                    PT · PORTUGUÊS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectLang("en")}
                    className={`pixel-btn py-2 px-3 font-pixel text-[9px] ${
                      lang === "en" ? "bg-emerald-400 text-black" : "bg-hull-800 text-slate-200"
                    }`}
                  >
                    EN · ENGLISH
                  </button>
                </div>
              </div>

              {/* SFX Toggle */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <span className="text-slate-300 font-bold">{t("settingsSfxLabel")}</span>
                <button
                  type="button"
                  onClick={handleToggleSfx}
                  className={`pixel-btn px-3 py-1.5 font-pixel text-[9px] ${
                    sfxOn ? "bg-emerald-400 text-black" : "bg-hull-800 text-slate-300"
                  }`}
                >
                  {t(sfxOn ? "on" : "off")}
                </button>
              </div>

              {/* CRT Toggle */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <span className="text-slate-300 font-bold">{t("settingsCrtLabel")}</span>
                <button
                  type="button"
                  onClick={() => {
                    setCrtEnabled((v) => !v);
                    audio.uiSelect();
                  }}
                  className={`pixel-btn px-3 py-1.5 font-pixel text-[9px] ${
                    crtEnabled ? "bg-emerald-400 text-black" : "bg-hull-800 text-slate-300"
                  }`}
                >
                  {t(crtEnabled ? "on" : "off")}
                </button>
              </div>

              {/* Callsign Input */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label htmlFor="settings-callsign" className="block text-slate-300 font-bold">
                  {t("settingsCallsignLabel")}
                </label>
                <input
                  id="settings-callsign"
                  type="text"
                  maxLength={16}
                  value={callsign}
                  onChange={(e) => handleCallsignChange(e.target.value)}
                  className="w-full bg-hull-950 border-2 border-[#334460] px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="pixel-btn w-full py-2.5 bg-amber-400 text-black font-pixel text-[10px]"
                >
                  {t("settingsClose")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Retro CRT Scanlines Post-Processing Layer */}
      <div
        id="global-crt-overlay"
        className={`global-crt-overlay${crtEnabled ? "" : " hidden"}`}
        aria-hidden="true"
      ></div>
    </>
  );
}
