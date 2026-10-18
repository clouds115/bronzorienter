"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sun,
  Sunrise,
  Moon,
  Sparkles,
  Search,
  MapPin,
  SlidersHorizontal,
  Check,
  Info,
  Compass,
  Footprints,
  Waves,
  Fish,
  Radar,
  Mountain,
  Star,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ListFilter,
} from "lucide-react";
import SinnohSvgMap from "@/components/SinnohSvgMap";
import PokemonDetailModal from "@/components/PokemonDetailModal";
import {
  MapApiResponse,
  TimeOfDay,
  ShinyHuntMethod,
  SinnohRoute,
  PokemonEncounter,
} from "@/types/sinnoh";

const METHOD_META: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  grass: {
    label: "Tall Grass",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: <Footprints className="w-3.5 h-3.5" />,
  },
  cave: {
    label: "Cave / Mountain",
    color: "bg-stone-500/20 text-stone-300 border-stone-500/30",
    icon: <Mountain className="w-3.5 h-3.5" />,
  },
  surf: {
    label: "Surfing",
    color: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    icon: <Waves className="w-3.5 h-3.5" />,
  },
  old_rod: {
    label: "Old Rod Fishing",
    color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    icon: <Fish className="w-3.5 h-3.5" />,
  },
  good_rod: {
    label: "Good Rod Fishing",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: <Fish className="w-3.5 h-3.5" />,
  },
  super_rod: {
    label: "Super Rod Fishing",
    color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    icon: <Fish className="w-3.5 h-3.5" />,
  },
  poke_radar: {
    label: "Poké Radar",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    icon: <Radar className="w-3.5 h-3.5" />,
  },
  honey_tree: {
    label: "Honey Tree",
    color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    icon: <Star className="w-3.5 h-3.5" />,
  },
  special: {
    label: "Special",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
};

const TYPE_COLORS: Record<string, string> = {
  Normal: "bg-stone-600 text-stone-100",
  Fire: "bg-orange-600 text-orange-50",
  Water: "bg-blue-600 text-blue-50",
  Grass: "bg-emerald-600 text-emerald-50",
  Electric: "bg-amber-500 text-slate-950 font-bold",
  Ice: "bg-cyan-500 text-slate-950 font-bold",
  Fighting: "bg-red-700 text-red-50",
  Poison: "bg-purple-600 text-purple-50",
  Ground: "bg-amber-700 text-amber-50",
  Flying: "bg-indigo-500 text-indigo-50",
  Psychic: "bg-pink-600 text-pink-50",
  Bug: "bg-lime-600 text-lime-50",
  Rock: "bg-yellow-800 text-yellow-100",
  Ghost: "bg-violet-800 text-violet-100",
  Dragon: "bg-indigo-700 text-indigo-50",
  Dark: "bg-neutral-800 text-neutral-200 border border-neutral-600",
  Steel: "bg-slate-500 text-slate-50",
  Fairy: "bg-rose-500 text-rose-50",
};

export default function SinnohMapPage() {
  const [mapData, setMapData] = useState<MapApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("route-201");
  const [zoomToRouteTrigger, setZoomToRouteTrigger] = useState<number>(0);

  // Filters & Shiny Calculator state
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("day");
  const [shinyMethod, setShinyMethod] = useState<ShinyHuntMethod>("wild");
  const [radarChain, setRadarChain] = useState<number>(0);
  const [diglettBonus, setDiglettBonus] = useState<boolean>(false);
  const [masuda, setMasuda] = useState<boolean>(true);
  const [shinyCharm, setShinyCharm] = useState<boolean>(false);
  const [showShinySprites, setShowShinySprites] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [mobileView, setMobileView] = useState<"map" | "details">("map");

  // Search & Method filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  // Modal state for inspecting a specific Pokemon via PokeAPI
  const [modalPokemonId, setModalPokemonId] = useState<number | null>(null);

  // Caught & Shiny Caught Checklist (persisted in localStorage)
  const [caughtIds, setCaughtIds] = useState<number[]>([]);
  const [shinyCaughtIds, setShinyCaughtIds] = useState<number[]>([]);

  useEffect(() => {
    try {
      const savedCaught = localStorage.getItem("bdsp_caught_ids");
      const savedShiny = localStorage.getItem("bdsp_shiny_caught_ids");
      if (savedCaught) setCaughtIds(JSON.parse(savedCaught));
      if (savedShiny) setShinyCaughtIds(JSON.parse(savedShiny));
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleCaught = (id: number) => {
    setCaughtIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem("bdsp_caught_ids", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleShinyCaught = (id: number) => {
    setShinyCaughtIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem("bdsp_shiny_caught_ids", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Fetch map & encounter odds from FastAPI backend whenever parameters change
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      time_of_day: timeOfDay,
      shiny_method: shinyMethod,
      radar_chain: String(radarChain),
      diglett_bonus: String(diglettBonus),
      masuda: String(masuda),
      shiny_charm: String(shinyCharm),
    });

    fetch(`/api/map?${params.toString()}`)
      .then((res) => res.json())
      .then((data: MapApiResponse) => {
        if (!cancelled) {
          setMapData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch map data:", err);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [timeOfDay, shinyMethod, radarChain, diglettBonus, masuda, shinyCharm]);

  const selectedRoute: SinnohRoute | undefined = useMemo(() => {
    if (!mapData) return undefined;
    return (
      mapData.routes.find((r) => r.id === selectedRouteId) || mapData.routes[0]
    );
  }, [mapData, selectedRouteId]);

  const filteredEncounters: PokemonEncounter[] = useMemo(() => {
    if (!selectedRoute) return [];
    return selectedRoute.encounters.filter((enc) => {
      if (methodFilter === "all") return true;
      if (methodFilter === "fishing") {
        return ["old_rod", "good_rod", "super_rod"].includes(enc.method);
      }
      if (methodFilter === "special") {
        return ["special", "honey_tree"].includes(enc.method);
      }
      return enc.method === methodFilter;
    });
  }, [selectedRoute, methodFilter]);

  const searchMatchingRoutes = useMemo(() => {
    if (!mapData || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return mapData.routes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        r.encounters.some(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.types.some((t) => t.toLowerCase().includes(q)) ||
            e.badge.toLowerCase().includes(q)
        )
    );
  }, [mapData, searchQuery]);

  const totalUniqueSpecies = useMemo(() => {
    if (!mapData) return 0;
    const set = new Set<number>();
    mapData.routes.forEach((r) =>
      r.encounters.forEach((e) => set.add(e.pokemon_id))
    );
    return set.size;
  }, [mapData]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b14] text-slate-100 overflow-hidden">
      {/* TOP BAR */}
      <header className="h-14 sm:h-16 shrink-0 bg-slate-900/95 border-b border-slate-800 px-2.5 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-3 z-20">
        {/* Brand Title */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <img
            src="/bronzor.png"
            alt="Bronzor"
            className="w-7 h-7 sm:w-9 sm:h-9 pixelated drop-shadow-md hover:scale-115 hover:rotate-12 transition-transform duration-200 cursor-pointer select-none"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1">
                <span>Bronzorienter</span>
              </h1>
              <span className="hidden md:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Sinnoh BDSP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Interactive Sinnoh Map • Wild Encounters, Time Rates &amp; Shiny Odds
            </p>
          </div>
        </div>

        {/* Search Input with Route Dropdown */}
        <div className="relative flex-1 min-w-0 max-w-[140px] sm:max-w-xs md:max-w-sm">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Pokémon or Route..."
            className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-indigo-500 rounded-xl pl-8 sm:pl-9 pr-7 sm:pr-8 py-1 sm:py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}

          {/* Quick Search Results Popover */}
          {searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50 p-1.5">
              {searchMatchingRoutes.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 text-center">
                  No routes or Pokémon match &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                searchMatchingRoutes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedRouteId(r.id);
                      setZoomToRouteTrigger((c) => c + 1);
                      setSearchQuery("");
                      // On mobile, keep on map so they see the zoomed route
                      setMobileView("map");
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <div className="font-bold text-amber-300">{r.name}</div>
                      <div className="text-[11px] text-slate-400">{r.subtitle}</div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                      Zoom →
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Time of Day + Sprite Toggle + Tracker Summary */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Time of Day Selector */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-0.5 sm:p-1 flex items-center gap-0.5">
            {(
              [
                { id: "morning", label: "Morning", icon: Sunrise, color: "text-amber-300" },
                { id: "day", label: "Day", icon: Sun, color: "text-sky-300" },
                { id: "night", label: "Night", icon: Moon, color: "text-indigo-300" },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const active = timeOfDay === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTimeOfDay(t.id)}
                  title={t.label}
                  className={`px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    active
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? t.color : ""}`} />
                  <span className="hidden lg:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Shiny Sprite Mode Toggle */}
          <button
            onClick={() => setShowShinySprites((s) => !s)}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition ${
              showShinySprites
                ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm shadow-amber-500/20"
                : "bg-slate-950/90 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
            title="Toggle between Normal and Shiny Pokémon icons"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">
              {showShinySprites ? "Shiny" : "Shiny"}
            </span>
          </button>

          {/* Caught & Shiny Checklist Counter */}
          <div className="hidden xl:flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-emerald-400 font-bold">
              ✓ {caughtIds.length}/{totalUniqueSpecies || "—"} Caught
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-300 font-bold">
              ✨ {shinyCaughtIds.length} Shiny
            </span>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE: MAP + INSPECTOR SIDEBAR */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT/CENTER: INTERACTIVE SINNOH SVG MAP */}
        <div
          className={`relative flex-1 h-full border-b lg:border-b-0 lg:border-r border-slate-800 ${
            mobileView === "map" ? "flex flex-col" : "hidden lg:flex flex-col"
          }`}
        >
          {loading || !mapData ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#07111e] text-slate-400 gap-2">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">
                Loading Sinnoh Region Map &amp; Encounter Tables...
              </p>
            </div>
          ) : (
            <SinnohSvgMap
              routes={mapData.routes}
              cities={mapData.cities}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(id) => {
                setSelectedRouteId(id);
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  setMobileView("details");
                }
              }}
              showShinySprites={showShinySprites}
              shinySummary={mapData.shiny_summary}
              searchQuery={searchQuery}
              caughtPokemonIds={caughtIds}
              shinyCaughtIds={shinyCaughtIds}
              zoomToRouteTrigger={zoomToRouteTrigger}
            />
          )}

          {/* Quick Route Jump Strip (Top-Right over map) */}
          {mapData && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-lg px-2 py-1 shadow-lg">
              <span className="text-[10px] font-medium text-slate-400 select-none hidden sm:inline">
                Jump:
              </span>
              <select
                value={selectedRouteId}
                onChange={(e) => {
                  setSelectedRouteId(e.target.value);
                  setZoomToRouteTrigger((c) => c + 1);
                }}
                className="bg-slate-950/90 text-[11px] font-medium text-slate-200 border border-slate-800 rounded px-1.5 py-0.5 outline-none focus:border-indigo-500 max-w-[110px] sm:max-w-[160px] truncate cursor-pointer"
              >
                <optgroup label="Sinnoh Routes">
                  {mapData.routes
                    .filter((r) => r.category === "route")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Lakes, Caves & Landmarks">
                  {mapData.routes
                    .filter((r) => r.category === "landmark")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          )}

          {/* Mobile Floating Route Preview Drawer */}
          {selectedRoute && (
            <div
              onClick={() => setMobileView("details")}
              className="lg:hidden absolute bottom-2 left-2.5 right-2.5 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150 cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white truncate">
                    {selectedRoute.name}
                  </h3>
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {selectedRoute.terrain}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {selectedRoute.preview_pokemon.slice(0, 4).map((p) => (
                    <img
                      key={p.pokemon_id}
                      src={showShinySprites ? p.shiny_sprite_url : p.sprite_url}
                      alt={p.name}
                      className="w-5 h-5 pixelated shrink-0"
                    />
                  ))}
                  <span className="text-[10px] text-slate-400 font-medium ml-1">
                    {selectedRoute.total_species} spp.
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileView("details");
                }}
                className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow flex items-center gap-1 transition"
              >
                <span>View Tables</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR: ROUTE ENCOUNTERS & SHINY ODDS PANEL */}
        <aside
          className={`w-full lg:w-[460px] xl:w-[500px] shrink-0 h-full bg-slate-900/95 flex flex-col overflow-hidden ${
            mobileView === "details" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Mobile Back To Map Header Bar */}
          <div className="lg:hidden bg-slate-950 px-3 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
            <button
              onClick={() => setMobileView("map")}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-indigo-600/15 border border-indigo-500/30 transition"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>← Back to Sinnoh Map</span>
            </button>
            <div className="text-[11px] font-semibold text-slate-400 truncate max-w-[160px]">
              {selectedRoute ? selectedRoute.name : "Route Encounters"}
            </div>
          </div>

          {/* Selected Route Header */}
          {selectedRoute && (
            <div className="p-4 bg-gradient-to-b from-slate-800/80 to-slate-900 border-b border-slate-800 shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-white">
                      {selectedRoute.name}
                    </h2>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {selectedRoute.terrain}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-indigo-300 mt-0.5">
                    {selectedRoute.subtitle}
                  </p>
                </div>

                <button
                  onClick={() => setZoomToRouteTrigger((c) => c + 1)}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow transition"
                >
                  <MapPin className="w-3.5 h-3.5" />                  
                </button>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {selectedRoute.description}
              </p>
            </div>
          )}

          {/* Collapsible BDSP Shiny Odds Calculator */}
          <div className="border-b border-slate-800 bg-slate-950/60 shrink-0">
            <button
              onClick={() => setShowCalculator((prev) => !prev)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-amber-300 hover:bg-slate-800/40 transition"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>Shiny Odds</span>
                {mapData?.shiny_summary && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-mono text-[11px]">
                    ✨ {mapData.shiny_summary.active_odds_label}
                  </span>
                )}
              </span>
              {showCalculator ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showCalculator && mapData?.shiny_summary && (
              <div className="px-4 pb-3.5 pt-1 space-y-3 border-t border-slate-800/80">
                {/* Method selector pills */}
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: "wild", label: "Wild Base" },
                      { id: "poke_radar", label: "Poké Radar" },
                      { id: "underground", label: "Underground" },
                      { id: "masuda_egg", label: "Masuda Egg" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setShinyMethod(m.id);
                        if (m.id === "underground") setDiglettBonus(true);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition ${
                        shinyMethod === m.id
                          ? "bg-amber-500/20 border-amber-400 text-amber-200"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Poke Radar Chain Slider (when Poke Radar selected) */}
                {shinyMethod === "poke_radar" && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold">
                        Poké Radar Chain Length:{" "}
                        <strong className="text-amber-300 font-mono text-sm">
                          {radarChain}
                        </strong>
                      </span>
                      <span className="text-[11px] font-mono text-emerald-300">
                        {mapData.shiny_summary.four_patch_percent}% per 4-patch reset
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={radarChain}
                      onChange={(e) => setRadarChain(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      {[0, 10, 17, 30, 36, 40].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setRadarChain(preset)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                            radarChain === preset
                              ? "bg-amber-400 text-slate-950"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          Chain {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Underground Diglett 40/40 Toggle */}
                {shinyMethod === "underground" && (
                  <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                    <span className="text-slate-300">
                      40/40 Diglett Light Bonus (2/4,096)
                    </span>
                    <input
                      type="checkbox"
                      checked={diglettBonus}
                      onChange={(e) => setDiglettBonus(e.target.checked)}
                      className="w-4 h-4 accent-amber-400 rounded"
                    />
                  </div>
                )}

                {/* Shiny Charm Toggle & BDSP Note */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={shinyCharm}
                      onChange={(e) => setShinyCharm(e.target.checked)}
                      className="w-3.5 h-3.5 accent-indigo-500 rounded"
                    />
                    <span>Have Shiny Charm</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    Single Roll: {mapData.shiny_summary.single_patch_odds} (
                    {mapData.shiny_summary.single_patch_percent}%)
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/70 border border-slate-800/80 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{mapData.shiny_summary.bdsp_note}</span>
                </div>
              </div>
            )}
          </div>

          {/* Encounter Method Filter Tabs */}
          <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0">
            {[
              { id: "all", label: "All Methods" },
              { id: "grass", label: "Grass" },
              { id: "poke_radar", label: "Poké Radar" },
              { id: "surf", label: "Surf" },
              { id: "fishing", label: "Fishing" },
              { id: "cave", label: "Cave" },
              { id: "special", label: "Special / Tree" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMethodFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  methodFilter === tab.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable List of Pokemon Available in Selected Route */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {filteredEncounters.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No Pokémon encounters in this route for the selected method filter.
              </div>
            ) : (
              filteredEncounters.map((enc, idx) => {
                const methodInfo = METHOD_META[enc.method] || METHOD_META.grass;
                const isCaught = caughtIds.includes(enc.pokemon_id);
                const isShinyCaught = shinyCaughtIds.includes(enc.pokemon_id);
                const unavailableNow = enc.active_rate === 0;

                return (
                  <div
                    key={`${enc.pokemon_id}-${enc.method}-${idx}`}
                    className={`rounded-xl border p-3 transition ${
                      unavailableNow
                        ? "bg-slate-950/40 border-slate-800/60 opacity-60"
                        : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Dual or Toggleable Normal / Shiny Sprite Button */}
                      <button
                        onClick={() => setModalPokemonId(enc.pokemon_id)}
                        title="Click for full Pokédex stats & all Sinnoh locations"
                        className="relative w-16 h-16 shrink-0 rounded-xl bg-gradient-to-br from-slate-800/90 to-slate-900 border border-slate-700/70 flex items-center justify-center group overflow-hidden"
                      >
                        <img
                          src={
                            showShinySprites
                              ? enc.shiny_sprite_url
                              : enc.sprite_url
                          }
                          alt={enc.name}
                          className="w-14 h-14 object-contain pixelated group-hover:scale-110 transition-transform"
                        />
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-slate-400">
                          #{enc.pokemon_id}
                        </span>
                      </button>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <button
                            onClick={() => setModalPokemonId(enc.pokemon_id)}
                            className="font-extrabold text-sm text-white hover:text-indigo-300 transition truncate"
                          >
                            {enc.name}
                          </button>
                          {enc.types.map((t) => (
                            <span
                              key={t}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                TYPE_COLORS[t] || "bg-slate-700 text-white"
                              }`}
                            >
                              {t}
                            </span>
                          ))}
                          {enc.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {enc.badge}
                            </span>
                          )}
                        </div>

                        {/* Method & Level Range */}
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${methodInfo.color}`}
                          >
                            {methodInfo.icon}
                            {methodInfo.label}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            Lv. {enc.levels}
                          </span>
                        </div>

                        {/* Morning / Day / Night Mini Breakdown */}
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono">
                          <span
                            className={
                              timeOfDay === "morning"
                                ? "text-amber-300 font-bold"
                                : "text-slate-500"
                            }
                          >
                            🌅{enc.rates.morning}%
                          </span>
                          <span className="text-slate-700">•</span>
                          <span
                            className={
                              timeOfDay === "day"
                                ? "text-sky-300 font-bold"
                                : "text-slate-500"
                            }
                          >
                            ☀️{enc.rates.day}%
                          </span>
                          <span className="text-slate-700">•</span>
                          <span
                            className={
                              timeOfDay === "night"
                                ? "text-indigo-300 font-bold"
                                : "text-slate-500"
                            }
                          >
                            🌙{enc.rates.night}%
                          </span>
                        </div>
                      </div>

                      {/* Caught / Shiny Checklist Buttons */}
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => toggleCaught(enc.pokemon_id)}
                          title="Mark as Caught in Sinnoh"
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition ${
                            isCaught
                              ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          Caught
                        </button>
                        <button
                          onClick={() => toggleShinyCaught(enc.pokemon_id)}
                          title="Mark Shiny Caught"
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition ${
                            isShinyCaught
                              ? "bg-amber-500/25 border-amber-400 text-amber-200"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-300"
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          Shiny
                        </button>
                      </div>
                    </div>

                    {/* ODDS SUMMARY BAR: Normal Odds vs Per-Encounter Shiny vs Combined Target Shiny */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-900/90 rounded-lg py-1 px-2 border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">
                           Normal Odds 
                        </div>
                        <div className="text-xs font-extrabold text-emerald-400 font-mono">
                          {enc.active_rate}%{" "}
                          <span className="text-[10px] font-normal text-slate-400">
                            ({enc.normal_1_in})
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-900/90 rounded-lg py-1 px-2 border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">
                          Shiny Rate
                        </div>
                        <div className="text-xs font-extrabold text-amber-300 font-mono">
                          ✨ {enc.shiny_odds_label}
                        </div>
                      </div>

                      <div
                        className="bg-slate-900/90 rounded-lg py-1 px-2 border border-slate-800/80"
                        title="Combined probability of encountering this specific Pokémon AND it being Shiny in a random encounter"
                      >
                        <div className="text-[10px] text-slate-400">
                          Combined Shiny
                        </div>
                        <div className="text-xs font-extrabold text-indigo-300 font-mono">
                          {enc.combined_shiny_odds}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="lg:hidden shrink-0 h-13 bg-slate-950/95 border-t border-slate-800 grid grid-cols-2 p-1.5 gap-1.5 z-30 select-none">
        <button
          onClick={() => setMobileView("map")}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
            mobileView === "map"
              ? "bg-indigo-600 text-white shadow"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Sinnoh Map</span>
        </button>
        <button
          onClick={() => setMobileView("details")}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
            mobileView === "details"
              ? "bg-indigo-600 text-white shadow"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span className="truncate">{selectedRoute ? selectedRoute.name : "Route Details"}</span>
        </button>
      </nav>

      {/* POKEAPI DETAIL MODAL */}
      <PokemonDetailModal
        pokemonId={modalPokemonId}
        onClose={() => setModalPokemonId(null)}
        onJumpToRoute={(routeId) => {
          setSelectedRouteId(routeId);
          setZoomToRouteTrigger((c) => c + 1);
        }}
        initialShowShiny={showShinySprites}
      />
    </div>
  );
}
