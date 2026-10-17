"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  Sparkles,
  CheckCircle2,
  MapPin,
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
    fill: "rgba(22, 101, 52, 0.85)",
    stroke: "#4ade80",
    badgeBg: "#14532d",
    text: "#bbf7d0",
  },
  water: {
    fill: "rgba(3, 105, 161, 0.85)",
    stroke: "#38bdf8",
    badgeBg: "#0c4a6e",
    text: "#bae6fd",
  },
  cave: {
    fill: "rgba(68, 64, 60, 0.9)",
    stroke: "#a8a29e",
    badgeBg: "#292524",
    text: "#e7e5e4",
  },
  forest: {
    fill: "rgba(6, 78, 59, 0.9)",
    stroke: "#34d399",
    badgeBg: "#064e3b",
    text: "#a7f3d0",
  },
  mountain: {
    fill: "rgba(87, 83, 78, 0.9)",
    stroke: "#fbbf24",
    badgeBg: "#44403c",
    text: "#fde68a",
  },
  snow: {
    fill: "rgba(30, 58, 138, 0.85)",
    stroke: "#93c5fd",
    badgeBg: "#1e3a8a",
    text: "#dbeafe",
  },
  marsh: {
    fill: "rgba(59, 47, 99, 0.88)",
    stroke: "#c084fc",
    badgeBg: "#3b0764",
    text: "#e9d5ff",
  },
  coastal: {
    fill: "rgba(15, 118, 110, 0.85)",
    stroke: "#2dd4bf",
    badgeBg: "#134e4a",
    text: "#99f6e4",
  },
  volcanic: {
    fill: "rgba(127, 29, 29, 0.9)",
    stroke: "#f87171",
    badgeBg: "#7f1d1d",
    text: "#fecaca",
  },
  desert: {
    fill: "rgba(120, 53, 15, 0.88)",
    stroke: "#fb923c",
    badgeBg: "#78350f",
    text: "#fed7aa",
  },
};

// Topological connections between Sinnoh locations for visual road/sea lines
const ROAD_CONNECTIONS: [number, number, number, number, "land" | "sea"][] = [
  // Twinleaf -> Sandgem -> Jubilife
  [195, 835, 232, 815, "land"],
  [232, 815, 150, 790, "land"],
  [232, 815, 270, 790, "land"],
  [270, 790, 270, 690, "land"],
  // Sandgem -> Route 219 -> 220 -> 221
  [270, 790, 270, 845, "sea"],
  [270, 845, 318, 875, "sea"],
  [318, 875, 395, 875, "sea"],
  // Jubilife -> Canalave (Route 218)
  [270, 690, 192, 690, "sea"],
  [192, 690, 115, 690, "sea"],
  // Canalave -> Iron Island
  [115, 690, 145, 465, "sea"],
  // Jubilife -> Oreburgh (Route 203 & Gate)
  [270, 690, 420, 690, "land"],
  // Jubilife -> Floaroma (Route 204)
  [270, 690, 270, 545, "land"],
  // Floaroma -> Fuego Ironworks & Route 205 -> Eterna Forest -> Eterna City
  [270, 545, 270, 470, "sea"],
  [270, 545, 345, 545, "land"],
  [270, 545, 318, 495, "land"],
  [318, 495, 335, 430, "land"],
  [335, 430, 420, 430, "land"],
  // Eterna -> Route 206 (Cycling Road) -> Oreburgh -> Route 207 -> Mt. Coronet
  [420, 430, 420, 690, "land"],
  [420, 545, 456, 575, "land"],
  [420, 690, 468, 655, "land"],
  [468, 655, 500, 560, "land"],
  // Eterna -> Route 211 -> Celestic Town
  [420, 430, 585, 430, "land"],
  // Mt. Coronet -> Route 208 -> Hearthome City
  [500, 605, 570, 605, "land"],
  // Hearthome -> Route 209 -> Solaceon -> Route 210 -> Celestic
  [570, 605, 645, 585, "land"],
  [645, 585, 690, 535, "land"],
  [690, 535, 690, 455, "land"],
  [690, 455, 585, 430, "land"],
  // Solaceon -> Route 215 -> Veilstone
  [690, 535, 758, 485, "land"],
  [758, 485, 825, 485, "land"],
  // Hearthome -> Trophy Garden -> Route 212 -> Pastoria
  [570, 605, 570, 665, "land"],
  [570, 665, 595, 720, "land"],
  [595, 720, 745, 740, "land"],
  // Pastoria -> Route 213 -> Lake Valor -> Route 214 -> Veilstone
  [745, 740, 815, 735, "land"],
  [815, 735, 855, 655, "land"],
  [855, 655, 850, 565, "land"],
  [850, 565, 825, 485, "land"],
  // Lake Valor -> Route 222 -> Sunyshore -> Route 223 -> Victory Road -> Pokemon League -> Route 224
  [855, 655, 918, 685, "land"],
  [918, 685, 980, 685, "land"],
  [980, 685, 970, 545, "sea"],
  [970, 545, 965, 445, "sea"],
  [965, 445, 965, 395, "land"],
  [965, 445, 1035, 370, "land"],
  // Mt. Coronet North -> Route 216 -> Route 217 -> Lake Acuity & Snowpoint
  [500, 430, 465, 300, "land"],
  [465, 300, 465, 215, "land"],
  [465, 215, 455, 115, "land"],
  [455, 115, 510, 115, "land"],
  // Battle Zone: Fight Area -> 225 -> Survival -> 226 -> 227 -> Stark Mountain -> 228 -> 229 -> Resort -> 230
  [775, 280, 775, 215, "land"],
  [775, 215, 845, 175, "land"],
  [845, 175, 895, 175, "land"],
  [895, 175, 910, 120, "land"],
  [910, 120, 910, 65, "land"],
  [895, 175, 965, 215, "land"],
  [965, 215, 910, 265, "land"],
  [910, 265, 955, 295, "land"],
  [910, 265, 842, 265, "sea"],
  [842, 265, 775, 280, "sea"],
];

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
  const [zoom, setZoom] = useState<number>(1.05);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);

  const focusOnRoute = useCallback(
    (route: SinnohRoute, targetZoom = 2.2) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Map viewBox is 1200 x 1000
      const scaleX = rect.width / 1200;
      const scaleY = rect.height / 1000;
      const baseScale = Math.min(scaleX, scaleY);

      const centerX = 600;
      const centerY = 500;
      const dx = (centerX - route.x) * baseScale * targetZoom;
      const dy = (centerY - route.y) * baseScale * targetZoom;

      setZoom(targetZoom);
      setPan({ x: dx, y: dy });
    },
    []
  );

  // Trigger zoom when user clicks "Zoom to Route" or double clicks
  useEffect(() => {
    if (zoomToRouteTrigger > 0) {
      const target = routes.find((r) => r.id === selectedRouteId);
      if (target) {
        focusOnRoute(target, 2.35);
      }
    }
  }, [zoomToRouteTrigger, selectedRouteId, routes, focusOnRoute]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom((prev) => Math.min(3.5, Math.max(0.75, Number((prev + delta).toFixed(2)))));
  };

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
    setZoom(1.05);
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

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative w-full h-full overflow-hidden select-none bg-[#07111e] ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      {/* Subtle radial ocean glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(14, 116, 144, 0.18) 0%, rgba(7, 17, 30, 0.95) 80%)",
        }}
      />

      {/* Interactive Pan/Zoom SVG Canvas */}
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-150 ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <svg
          viewBox="0 0 1200 1000"
          className="w-full h-full max-w-[1200px] max-h-[1000px] overflow-visible"
        >
          <defs>
            <pattern
              id="oceanGrid"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke="rgba(56, 189, 248, 0.06)"
                strokeWidth="1"
              />
            </pattern>
            <linearGradient id="sinnohLand" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#132a23" />
              <stop offset="50%" stopColor="#162e26" />
              <stop offset="100%" stopColor="#0f231d" />
            </linearGradient>
            <linearGradient id="snowLand" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="70%" stopColor="#172e42" />
              <stop offset="100%" stopColor="#132a23" />
            </linearGradient>
            <linearGradient id="coronetSpine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3f3a34" />
              <stop offset="100%" stopColor="#262320" />
            </linearGradient>
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.6" />
            </filter>
            <filter id="searchGlow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#facc15" floodOpacity="0.85" />
            </filter>
          </defs>

          {/* Ocean Grid */}
          <rect x="-400" y="-400" width="2000" height="1800" fill="url(#oceanGrid)" />

          {/* SINNOH MAINLAND SILHOUETTE */}
          <path
            d="M 90 650 L 90 740 L 140 870 L 245 875 L 305 910 L 455 910 L 475 830 L 475 735 L 540 735 L 580 790 L 790 795 L 910 770 L 1025 730 L 1030 630 L 980 510 L 1010 430 L 1085 385 L 1065 325 L 930 355 L 885 435 L 780 435 L 660 390 L 585 350 L 560 220 L 565 75 L 415 75 L 415 240 L 400 365 L 290 395 L 225 460 L 225 630 Z"
            fill="url(#sinnohLand)"
            stroke="rgba(74, 222, 128, 0.28)"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* NORTHERN SNOWY PENINSULA OVERLAY (Routes 216, 217, Lake Acuity, Snowpoint) */}
          <path
            d="M 415 75 L 565 75 L 560 220 L 575 345 L 405 345 L 415 240 Z"
            fill="url(#snowLand)"
            stroke="rgba(147, 197, 253, 0.3)"
            strokeWidth="2"
          />

          {/* MT. CORONET CENTRAL MOUNTAIN RANGE SPINE */}
          <path
            d="M 465 350 L 545 350 L 565 490 L 545 685 L 455 710 L 445 550 Z"
            fill="url(#coronetSpine)"
            stroke="rgba(251, 191, 36, 0.25)"
            strokeWidth="2"
            strokeDasharray="6 4"
          />

          {/* NORTHEAST BATTLE ZONE ISLAND (Fight, Survival, Resort, Stark Mtn) */}
          <path
            d="M 735 295 L 735 185 L 820 135 L 865 40 L 975 40 L 1015 165 L 1015 320 L 895 335 L 795 320 Z"
            fill="url(#sinnohLand)"
            stroke="rgba(251, 146, 60, 0.32)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* OFFSHORE IRON ISLAND */}
          <path
            d="M 105 435 L 185 435 L 195 505 L 110 505 Z"
            fill="#1e293b"
            stroke="rgba(148, 163, 184, 0.4)"
            strokeWidth="2"
            rx="12"
          />

          {/* REGION WATERMARKS */}
          <text
            x="220"
            y="340"
            fill="rgba(148, 163, 184, 0.18)"
            fontSize="22"
            fontWeight="800"
            letterSpacing="6"
          >
            SINNOH REGION
          </text>
          <text
            x="805"
            y="35"
            fill="rgba(251, 146, 60, 0.25)"
            fontSize="13"
            fontWeight="700"
            letterSpacing="3"
          >
            BATTLE ZONE
          </text>

          {/* ROAD & SEA CONNECTIONS */}
          {ROAD_CONNECTIONS.map(([x1, y1, x2, y2, kind], idx) => (
            <line
              key={idx}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={
                kind === "sea"
                  ? "rgba(56, 189, 248, 0.35)"
                  : "rgba(148, 163, 184, 0.35)"
              }
              strokeWidth={kind === "sea" ? 4 : 5}
              strokeDasharray={kind === "sea" ? "6 5" : undefined}
              strokeLinecap="round"
            />
          ))}

          {/* REFERENCE CITIES & TOWNS */}
          {cities.map((city) => (
            <g
              key={city.id}
              transform={`translate(${city.x}, ${city.y})`}
              className="pointer-events-none"
            >
              {city.size === "league" ? (
                <polygon
                  points="0,-10 9,0 0,10 -9,0"
                  fill="#f59e0b"
                  stroke="#fef3c7"
                  strokeWidth="2"
                />
              ) : (
                <rect
                  x={city.size === "city" ? -8 : -6}
                  y={city.size === "city" ? -8 : -6}
                  width={city.size === "city" ? 16 : 12}
                  height={city.size === "city" ? 16 : 12}
                  rx="3"
                  fill={city.size === "city" ? "#ef4444" : "#3b82f6"}
                  stroke="#f8fafc"
                  strokeWidth="1.5"
                />
              )}
              <text
                x="0"
                y={city.size === "city" ? -12 : -10}
                textAnchor="middle"
                fill="rgba(226, 232, 240, 0.78)"
                fontSize="9.5"
                fontWeight="600"
                style={{ textShadow: "0px 1px 3px rgba(0,0,0,0.95)" }}
              >
                {city.name}
              </text>
            </g>
          ))}

          {/* INTERACTIVE ROUTES & LANDMARKS */}
          {routes.map((route) => {
            const isSelected = route.id === selectedRouteId;
            const isHovered = route.id === hoveredRouteId;
            const isSearchMatch = matchesSearch(route);
            const style = TERRAIN_STYLES[route.terrain] || TERRAIN_STYLES.grassland;

            // Show more Pokemon icons and live odds directly on the map as user zooms in or selects a route
            const isExpandedOnMap = zoom >= 1.45 || isSelected || isHovered;
            const iconsToShow = isExpandedOnMap
              ? route.preview_pokemon.slice(0, 4)
              : route.preview_pokemon.slice(0, 3);

            const boxW = isExpandedOnMap ? Math.max(route.width, 96) : Math.max(route.width, 64);
            const boxH = isExpandedOnMap ? Math.max(route.height, 56) : Math.max(route.height, 38);

            // Check if all species on this route have been caught
            const uniqueIds = Array.from(
              new Set(route.encounters.map((e) => e.pokemon_id))
            );
            const allCaught =
              uniqueIds.length > 0 &&
              uniqueIds.every((id) => caughtPokemonIds.includes(id));
            const anyShinyCaught = uniqueIds.some((id) =>
              shinyCaughtIds.includes(id)
            );

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
                  focusOnRoute(route, 2.35);
                }}
                onMouseEnter={() => setHoveredRouteId(route.id)}
                onMouseLeave={() => setHoveredRouteId(null)}
                className="cursor-pointer transition-all duration-150"
                filter={
                  isSearchMatch
                    ? "url(#searchGlow)"
                    : isSelected
                    ? "url(#routeGlow)"
                    : undefined
                }
              >
                {/* Pulsing ring if selected or matched by search */}
                {(isSelected || isSearchMatch) && (
                  <rect
                    x={-boxW / 2 - 4}
                    y={-boxH / 2 - 4}
                    width={boxW + 8}
                    height={boxH + 8}
                    rx="10"
                    fill="none"
                    stroke={isSearchMatch ? "#facc15" : "#818cf8"}
                    strokeWidth="2.5"
                    strokeDasharray={isSearchMatch ? "4 2" : undefined}
                  />
                )}

                {/* Route Node Card Background */}
                <rect
                  x={-boxW / 2}
                  y={-boxH / 2}
                  width={boxW}
                  height={boxH}
                  rx="8"
                  fill={isSelected ? "rgba(30, 27, 75, 0.95)" : style.fill}
                  stroke={
                    isSearchMatch
                      ? "#facc15"
                      : isSelected
                      ? "#a5b4fc"
                      : isHovered
                      ? "#ffffff"
                      : style.stroke
                  }
                  strokeWidth={isSelected || isSearchMatch ? 2.2 : 1.4}
                />

                {/* Route Title Banner */}
                <rect
                  x={-boxW / 2}
                  y={-boxH / 2}
                  width={boxW}
                  height={14}
                  rx="7"
                  fill={isSelected ? "#4338ca" : style.badgeBg}
                />
                <text
                  x="0"
                  y={-boxH / 2 + 10}
                  textAnchor="middle"
                  fill={isSelected ? "#ffffff" : style.text}
                  fontSize="8.5"
                  fontWeight="700"
                >
                  {route.name.replace("Route ", "R")}
                  {allCaught ? " ✓" : ""}
                  {anyShinyCaught ? " ✨" : ""}
                </text>

                {/* Pokemon Sprites inside the Route Node */}
                <g transform={`translate(0, ${isExpandedOnMap ? 2 : 5})`}>
                  {iconsToShow.map((poke, idx) => {
                    const count = iconsToShow.length;
                    const spacing = isExpandedOnMap ? 22 : 17;
                    const offsetX = (idx - (count - 1) / 2) * spacing;
                    return (
                      <g key={poke.pokemon_id} transform={`translate(${offsetX}, 0)`}>
                        <image
                          href={
                            showShinySprites
                              ? poke.shiny_sprite_url
                              : poke.sprite_url
                          }
                          x={-12}
                          y={-12}
                          width={24}
                          height={24}
                          className="pixelated"
                        />
                        {/* Show individual encounter % when zoomed in or selected */}
                        {isExpandedOnMap && (
                          <text
                            x="0"
                            y="13"
                            textAnchor="middle"
                            fill="#e2e8f0"
                            fontSize="6.2"
                            fontWeight="700"
                            style={{ textShadow: "0px 1px 2px #000" }}
                          >
                            {poke.active_rate}%
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* When zoomed in or selected, show Shiny Odds pill at bottom of route node */}
                {isExpandedOnMap && (
                  <g transform={`translate(0, ${boxH / 2 - 5})`}>
                    <rect
                      x={-boxW / 2 + 6}
                      y={-5}
                      width={boxW - 12}
                      height={9}
                      rx="4"
                      fill="rgba(15, 23, 42, 0.85)"
                    />
                    <text
                      x="0"
                      y="1.8"
                      textAnchor="middle"
                      fill="#fde047"
                      fontSize="5.8"
                      fontWeight="700"
                    >
                      ✨ {shinyOddsShort} • {route.total_species} spp.
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Map Controls (Top-Left) */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 flex flex-col gap-1 shadow-xl">
          <button
            onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.35).toFixed(2))))}
            title="Zoom In"
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-200 transition flex items-center justify-center"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="text-[11px] font-mono text-center text-indigo-300 font-semibold py-0.5 border-y border-slate-800">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.35).toFixed(2))))}
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
            if (target) focusOnRoute(target, 2.35);
          }}
          className="bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg border border-indigo-400/40 flex items-center gap-1.5 backdrop-blur-md transition"
        >
          <MapPin className="w-3.5 h-3.5" />
          Zoom to Route
        </button>
      </div>

      {/* Floating Legend & Tips (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2.5 shadow-xl max-w-md">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1.5">
          <Compass className="w-3.5 h-3.5 text-indigo-400" />
          <span>Sinnoh Navigation & Map Legend</span>
          <span className="text-[11px] text-slate-400 font-normal ml-auto">
            Scroll to zoom • Drag to pan • Double-click route to focus
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 border border-emerald-400 inline-block" />
            Grass Route
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-700 border border-sky-400 inline-block" />
            Sea / Lake
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-stone-700 border border-amber-400 inline-block" />
            Mt. Coronet / Cave
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-900 border border-blue-300 inline-block" />
            Snowpoint
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500 border border-white inline-block" />
            Major City
          </span>
        </div>
      </div>
    </div>
  );
}
