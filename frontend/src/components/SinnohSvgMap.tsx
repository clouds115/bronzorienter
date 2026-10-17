"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  MapPin,
  Eye,
  EyeOff,
} from "lucide-react";
import { SinnohRoute, SinnohCity, ShinySummary } from "@/types/sinnoh";

interface SinnohSvgMapProps {
  routes: SinnohRoute[];
  cities: SinnohCity[];
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
  showShinySprites: boolean;
  shinySummary: ShinySummary | null;
  searchQuery: string;
  caughtPokemonIds: number[];
  shinyCaughtIds: number[];
  zoomToRouteTrigger: number;
}

const TERRAIN_STYLES: Record<
  SinnohRoute["terrain"],
  { fill: string; stroke: string; badgeBg: string; text: string }
> = {
  grassland: {
    fill: "rgba(20, 83, 45, 0.92)",
    stroke: "#4ade80",
    badgeBg: "#14532d",
    text: "#bbf7d0",
  },
  water: {
    fill: "rgba(12, 74, 110, 0.92)",
    stroke: "#38bdf8",
    badgeBg: "#0c4a6e",
    text: "#bae6fd",
  },
  cave: {
    fill: "rgba(41, 37, 36, 0.94)",
    stroke: "#a8a29e",
    badgeBg: "#292524",
    text: "#e7e5e4",
  },
  forest: {
    fill: "rgba(6, 78, 59, 0.94)",
    stroke: "#34d399",
    badgeBg: "#064e3b",
    text: "#a7f3d0",
  },
  mountain: {
    fill: "rgba(68, 64, 60, 0.94)",
    stroke: "#fbbf24",
    badgeBg: "#44403c",
    text: "#fde68a",
  },
  snow: {
    fill: "rgba(30, 58, 138, 0.92)",
    stroke: "#93c5fd",
    badgeBg: "#1e3a8a",
    text: "#dbeafe",
  },
  marsh: {
    fill: "rgba(59, 7, 100, 0.92)",
    stroke: "#c084fc",
    badgeBg: "#3b0764",
    text: "#e9d5ff",
  },
  coastal: {
    fill: "rgba(19, 78, 74, 0.92)",
    stroke: "#2dd4bf",
    badgeBg: "#134e4a",
    text: "#99f6e4",
  },
  volcanic: {
    fill: "rgba(127, 29, 29, 0.94)",
    stroke: "#f87171",
    badgeBg: "#7f1d1d",
    text: "#fecaca",
  },
  desert: {
    fill: "rgba(120, 53, 15, 0.94)",
    stroke: "#fb923c",
    badgeBg: "#78350f",
    text: "#fed7aa",
  },
};

const MAP_WIDTH = 1098;
const MAP_HEIGHT = 900;

export default function SinnohSvgMap({
  routes,
  cities,
  selectedRouteId,
  onSelectRoute,
  showShinySprites,
  shinySummary,
  searchQuery,
  caughtPokemonIds,
  shinyCaughtIds,
  zoomToRouteTrigger,
}: SinnohSvgMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
  const [showAllIcons, setShowAllIcons] = useState<boolean>(true);
  const [showCityLabels, setShowCityLabels] = useState<boolean>(true);

  // Keep refs to current zoom and pan so the native non-passive wheel listener can zoom toward the cursor
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Native non-passive wheel & touchpad pinch-to-zoom listener
  // Prevents browser page zoom when hovering over the map!
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      // Cursor position relative to the center of the map container
      const cursorX = e.clientX - (rect.left + rect.width / 2);
      const cursorY = e.clientY - (rect.top + rect.height / 2);

      // Touchpad pinch-to-zoom sends e.ctrlKey = true with smaller deltaY values
      const zoomStep = e.ctrlKey ? -e.deltaY * 0.015 : -e.deltaY * 0.0022;
      const oldZoom = zoomRef.current;
      const newZoom = Math.min(4.5, Math.max(0.85, Number((oldZoom * (1 + zoomStep)).toFixed(3))));

      if (newZoom === oldZoom) return;

      // Adjust pan so the point under the mouse cursor stays stationary while zooming
      const scaleRatio = newZoom / oldZoom;
      const oldPan = panRef.current;
      const newPanX = cursorX - (cursorX - oldPan.x) * scaleRatio;
      const newPanY = cursorY - (cursorY - oldPan.y) * scaleRatio;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };

    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    el.addEventListener("gesturestart", preventGesture, { passive: false });
    el.addEventListener("gesturechange", preventGesture, { passive: false });

    return () => {
      el.removeEventListener("wheel", handleNativeWheel);
      el.removeEventListener("gesturestart", preventGesture);
      el.removeEventListener("gesturechange", preventGesture);
    };
  }, []);

  const focusOnRoute = useCallback(
    (route: SinnohRoute, targetZoom = 2.4) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scaleX = rect.width / MAP_WIDTH;
      const scaleY = rect.height / MAP_HEIGHT;
      const baseScale = Math.min(scaleX, scaleY);

      const centerX = MAP_WIDTH / 2;
      const centerY = MAP_HEIGHT / 2;
      const dx = (centerX - route.x) * baseScale * targetZoom;
      const dy = (centerY - route.y) * baseScale * targetZoom;

      setZoom(targetZoom);
      setPan({ x: dx, y: dy });
    },
    []
  );

  // Trigger zoom when user clicks "Focus Map", selects from search, or double clicks
  useEffect(() => {
    if (zoomToRouteTrigger > 0) {
      const target = routes.find((r) => r.id === selectedRouteId);
      if (target) {
        focusOnRoute(target, 2.4);
      }
    }
  }, [zoomToRouteTrigger, selectedRouteId, routes, focusOnRoute]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetCamera = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const matchesSearch = (route: SinnohRoute): boolean => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    if (route.name.toLowerCase().includes(q) || route.subtitle.toLowerCase().includes(q)) {
      return true;
    }
    return route.encounters.some(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.types.some((t) => t.toLowerCase().includes(q)) ||
        e.badge.toLowerCase().includes(q)
    );
  };

  const shinyOddsShort =
    shinySummary?.four_patch_odds || shinySummary?.single_patch_odds || "1/4,096";

  // Sort routes so hovered and selected routes render on top of everything else
  const sortedRoutes = [...routes].sort((a, b) => {
    const score = (r: SinnohRoute) =>
      r.id === hoveredRouteId ? 3 : r.id === selectedRouteId ? 2 : matchesSearch(r) ? 1 : 0;
    return score(a) - score(b);
  });

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ touchAction: "none", overscrollBehavior: "none" }}
      className={`relative w-full h-full overflow-hidden select-none bg-[#2398c3] ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      {/* Interactive Pan/Zoom SVG Canvas */}
      <div
        className={`w-full h-full flex items-center justify-center ${
          isDragging ? "" : "transition-transform duration-150 ease-out"
        }`}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="w-full h-full max-w-[1098px] max-h-[900px] overflow-visible"
        >
          <defs>
            <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.65" />
            </filter>
            <filter id="selectedGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#6366f1" floodOpacity="0.9" />
            </filter>
            <filter id="searchGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#facc15" floodOpacity="0.95" />
            </filter>
          </defs>

          {/* ACTUAL IN-GAME POKÉMON BRILLIANT DIAMOND / SHINING PEARL SINNOH TOWN MAP */}
          <image
            href="/bdsp-town-map.png"
            x="0"
            y="0"
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            preserveAspectRatio="none"
          />

          {/* IN-GAME CITY & TOWN LABELS (placed right over the red/blue city blocks on the BDSP map) */}
          {showCityLabels &&
            cities.map((city) => (
              <g
                key={city.id}
                transform={`translate(${city.x}, ${city.y})`}
                className="pointer-events-none"
              >
                <rect
                  x={-city.name.length * 2.8 - 4}
                  y={-7}
                  width={city.name.length * 5.6 + 8}
                  height={13}
                  rx="3.5"
                  fill={
                    city.size === "league"
                      ? "rgba(180, 83, 9, 0.9)"
                      : city.size === "city"
                      ? "rgba(153, 27, 27, 0.88)"
                      : "rgba(30, 58, 138, 0.88)"
                  }
                  stroke="rgba(255, 255, 255, 0.75)"
                  strokeWidth="0.9"
                />
                <text
                  x="0"
                  y="2.2"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="7.5"
                  fontWeight="700"
                >
                  {city.name}
                </text>
              </g>
            ))}

          {/* INTERACTIVE ROUTES & LANDMARKS OVERLAID ON THE EXACT IN-GAME PATHS */}
          {sortedRoutes.map((route) => {
            const isSelected = route.id === selectedRouteId;
            const isHovered = route.id === hoveredRouteId;
            const isSearchMatch = matchesSearch(route);
            const style = TERRAIN_STYLES[route.terrain] || TERRAIN_STYLES.grassland;

            // Show expanded card with odds when zoomed in, hovered, or selected
            const isDetailed = zoom >= 1.55 || isSelected || isHovered;
            const showSprites = showAllIcons || isDetailed || isSearchMatch;

            const iconsToShow = isDetailed
              ? route.preview_pokemon.slice(0, 4)
              : route.preview_pokemon.slice(0, 3);

            // Check completion status
            const uniqueIds = Array.from(
              new Set(route.encounters.map((e) => e.pokemon_id))
            );
            const allCaught =
              uniqueIds.length > 0 &&
              uniqueIds.every((id) => caughtPokemonIds.includes(id));
            const anyShinyCaught = uniqueIds.some((id) =>
              shinyCaughtIds.includes(id)
            );

            const shortName = route.name
              .replace("Route ", "R")
              .replace("Valley Windworks", "Windworks")
              .replace("Fuego Ironworks", "Fuego")
              .replace("Oreburgh Gate", "Ore. Gate")
              .replace("Wayward Cave", "Wayward")
              .replace("Trophy Garden", "Trophy Gdn")
              .replace("Great Marsh", "Gt. Marsh")
              .replace("Victory Road", "Victory Rd")
              .replace("Stark Mountain", "Stark Mtn");

            const cardW = isDetailed ? 84 : showSprites ? 56 : Math.max(34, shortName.length * 5.2 + 8);
            const cardH = isDetailed ? 48 : showSprites ? 30 : 15;

            return (
              <g
                key={route.id}
                transform={`translate(${route.x}, ${route.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectRoute(route.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onSelectRoute(route.id);
                  focusOnRoute(route, 2.4);
                }}
                onMouseEnter={() => setHoveredRouteId(route.id)}
                onMouseLeave={() => setHoveredRouteId(null)}
                className="cursor-pointer"
              >
                {/* Exact In-Game Route Path Highlight Box */}
                <rect
                  x={-route.width / 2}
                  y={-route.height / 2}
                  width={route.width}
                  height={route.height}
                  rx="5"
                  fill={
                    isSelected
                      ? "rgba(99, 102, 241, 0.35)"
                      : isHovered
                      ? "rgba(255, 255, 255, 0.3)"
                      : isSearchMatch
                      ? "rgba(250, 204, 21, 0.4)"
                      : "rgba(255, 255, 255, 0.01)"
                  }
                  stroke={
                    isSearchMatch
                      ? "#facc15"
                      : isSelected
                      ? "#818cf8"
                      : isHovered
                      ? "#ffffff"
                      : "rgba(255, 255, 255, 0.25)"
                  }
                  strokeWidth={isSelected || isHovered || isSearchMatch ? 2.2 : 1}
                  strokeDasharray={isSelected || isHovered ? undefined : "3 2"}
                />

                {/* Route Badge & Pokémon Icons Floating Pill */}
                <g
                  filter={
                    isSearchMatch
                      ? "url(#searchGlow)"
                      : isSelected
                      ? "url(#selectedGlow)"
                      : "url(#cardShadow)"
                  }
                >
                  <rect
                    x={-cardW / 2}
                    y={-cardH / 2}
                    width={cardW}
                    height={cardH}
                    rx="6"
                    fill={isSelected ? "rgba(30, 27, 75, 0.96)" : style.fill}
                    stroke={
                      isSearchMatch
                        ? "#facc15"
                        : isSelected
                        ? "#a5b4fc"
                        : isHovered
                        ? "#ffffff"
                        : style.stroke
                    }
                    strokeWidth={isSelected || isSearchMatch ? 1.8 : 1.1}
                  />

                  {/* Route Title Header */}
                  <rect
                    x={-cardW / 2}
                    y={-cardH / 2}
                    width={cardW}
                    height={showSprites ? 11.5 : cardH}
                    rx={showSprites ? "5" : "6"}
                    fill={isSelected ? "#4338ca" : style.badgeBg}
                  />
                  <text
                    x="0"
                    y={showSprites ? -cardH / 2 + 8.3 : 2.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={isDetailed ? "7.2" : "6.8"}
                    fontWeight="800"
                  >
                    {isDetailed ? route.name.replace("Route ", "R") : shortName}
                    {allCaught ? " ✓" : ""}
                    {anyShinyCaught ? " ✨" : ""}
                  </text>

                  {/* Pokémon Icons inside the Route Pin */}
                  {showSprites && (
                    <g transform={`translate(0, ${isDetailed ? 1 : 4.5})`}>
                      {iconsToShow.map((poke, idx) => {
                        const count = iconsToShow.length;
                        const spacing = isDetailed ? 19 : 15;
                        const offsetX = (idx - (count - 1) / 2) * spacing;
                        return (
                          <g
                            key={poke.pokemon_id}
                            transform={`translate(${offsetX}, 0)`}
                          >
                            <image
                              href={
                                showShinySprites
                                  ? poke.shiny_sprite_url
                                  : poke.sprite_url
                              }
                              x={isDetailed ? -10 : -8.5}
                              y={isDetailed ? -10 : -8.5}
                              width={isDetailed ? 20 : 17}
                              height={isDetailed ? 20 : 17}
                              className="pixelated"
                            />
                            {isDetailed && (
                              <text
                                x="0"
                                y="11"
                                textAnchor="middle"
                                fill="#f8fafc"
                                fontSize="5.5"
                                fontWeight="800"
                                style={{ textShadow: "0px 1px 2px #000" }}
                              >
                                {poke.active_rate}%
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* Shiny Odds Footer when zoomed in or selected */}
                  {isDetailed && (
                    <g transform={`translate(0, ${cardH / 2 - 4.5})`}>
                      <rect
                        x={-cardW / 2 + 4}
                        y={-4}
                        width={cardW - 8}
                        height={7.5}
                        rx="3"
                        fill="rgba(15, 23, 42, 0.9)"
                      />
                      <text
                        x="0"
                        y="1.5"
                        textAnchor="middle"
                        fill="#fde047"
                        fontSize="5"
                        fontWeight="700"
                      >
                        ✨ {shinyOddsShort} • {route.total_species} spp.
                      </text>
                    </g>
                  )}
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Map Controls (Top-Left) */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 flex flex-col gap-1 shadow-xl">
          <button
            onClick={() => setZoom((z) => Math.min(4.5, Number((z + 0.35).toFixed(2))))}
            title="Zoom In"
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-200 transition flex items-center justify-center"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="text-[11px] font-mono text-center text-indigo-300 font-semibold py-0.5 border-y border-slate-800">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={() => setZoom((z) => Math.max(0.85, Number((z - 0.35).toFixed(2))))}
            title="Zoom Out"
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-200 transition flex items-center justify-center"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetCamera}
            title="Reset Full Sinnoh View"
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 transition flex items-center justify-center border-t border-slate-800"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom to Selected Route button */}
        <button
          onClick={() => {
            const target = routes.find((r) => r.id === selectedRouteId);
            if (target) focusOnRoute(target, 2.4);
          }}
          className="bg-indigo-600/95 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg border border-indigo-400/40 flex items-center gap-1.5 backdrop-blur-md transition"
        >
          <MapPin className="w-3.5 h-3.5" />
          Zoom to Route
        </button>

        {/* Toggle Route Icons visibility so user can inspect the raw in-game map clearly */}
        <button
          onClick={() => setShowAllIcons((v) => !v)}
          className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl shadow-lg border border-slate-700/80 flex items-center gap-1.5 backdrop-blur-md transition"
          title="Switch between showing Pokémon icons on all routes vs compact route labels"
        >
          {showAllIcons ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Compact Pins</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Show All Icons</span>
            </>
          )}
        </button>

        {/* Toggle City Labels */}
        <button
          onClick={() => setShowCityLabels((v) => !v)}
          className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-lg border border-slate-700/80 flex items-center gap-1.5 backdrop-blur-md transition"
        >
          <span>{showCityLabels ? "Hide City Names" : "Show City Names"}</span>
        </button>
      </div>

      {/* Floating Legend & Tips (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2.5 shadow-xl max-w-lg">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
          <Compass className="w-3.5 h-3.5 text-indigo-400" />
          <span>Official BDSP In-Game Sinnoh Town Map</span>
        </div>
        <p className="text-[11px] text-slate-300">
          Pinch or scroll on the map to zoom toward your cursor • Drag to pan • Click or double-click any route to inspect its Pokémon &amp; shiny odds.
        </p>
      </div>
    </div>
  );
}
