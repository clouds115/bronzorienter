"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  MapPin,
  Eye,
  EyeOff,
  Building2,
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
const MIN_ZOOM = 1.0;
const MAX_ZOOM = 4.5;

function getLandmarkBadge(routeId: string, name: string): string {
  switch (routeId) {
    case "lake-verity": return "VER";
    case "lake-valor": return "VAL";
    case "lake-acuity": return "ACU";
    case "oreburgh-gate": return "GATE";
    case "valley-windworks": return "WIND";
    case "fuego-ironworks": return "FUEGO";
    case "eterna-forest": return "FOR.";
    case "wayward-cave": return "CAVE";
    case "mt-coronet": return "MTN";
    case "trophy-garden": return "GDN";
    case "great-marsh": return "MARSH";
    case "iron-island": return "IRON";
    case "victory-road": return "VIC.";
    case "stark-mountain": return "STARK";
    default:
      return name.slice(0, 4).toUpperCase();
  }
}

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
  const [isWheelZooming, setIsWheelZooming] = useState<boolean>(false);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(selectedRouteId);
  const [showRoutePins, setShowRoutePins] = useState<boolean>(true);
  const [showCityLabels, setShowCityLabels] = useState<boolean>(true);

  // Clear interaction timeout on unmount
  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    };
  }, []);

  // Sync expanded card when selectedRouteId changes externally (e.g. from search or Jump To dropdown)
  useEffect(() => {
    setExpandedRouteId(selectedRouteId);
  }, [selectedRouteId]);

  // Clamp pan so the user cannot drag the map off into empty space beyond its edges
  const clampPan = useCallback(
    (rawX: number, rawY: number, targetZoom: number) => {
      const el = containerRef.current;
      if (!el) return { x: rawX, y: rawY };

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return { x: rawX, y: rawY };

      const baseScale = Math.min(rect.width / MAP_WIDTH, rect.height / MAP_HEIGHT);
      const renderedW = MAP_WIDTH * baseScale * targetZoom;
      const renderedH = MAP_HEIGHT * baseScale * targetZoom;

      // Small cushion when zoomed in so edge routes remain comfortable to inspect
      const edgeAllowance = targetZoom > 1.05 ? 32 : 0;
      const maxPanX = Math.max(0, (renderedW - rect.width) / 2 + edgeAllowance);
      const maxPanY = Math.max(0, (renderedH - rect.height) / 2 + edgeAllowance);

      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, rawX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, rawY)),
      };
    },
    []
  );

  // Ref to distinguish taps/clicks from pans/drags on touch & mouse
  const didDragRef = useRef<boolean>(false);
  const isMouseDownRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });

  // RAF (requestAnimationFrame) throttled pan updater to ensure smooth 60-120fps with zero redundant renders
  const rafIdRef = useRef<number | null>(null);
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);

  const schedulePan = useCallback((nextPan: { x: number; y: number }) => {
    pendingPanRef.current = nextPan;
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (pendingPanRef.current) {
          setPan(pendingPanRef.current);
          pendingPanRef.current = null;
        }
        rafIdRef.current = null;
      });
    }
  }, []);

  const flushPendingPan = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingPanRef.current) {
      setPan(pendingPanRef.current);
      pendingPanRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Keep refs to current zoom and pan so the native non-passive wheel & touch listeners can zoom toward the cursor/pinch
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Re-clamp pan if window resizes
  useEffect(() => {
    const handleResize = () => {
      setPan((prev) => clampPan(prev.x, prev.y, zoomRef.current));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPan]);

  // Native non-passive wheel, trackpad pinch & mobile/tablet multi-touch listeners
  // Prevents browser page zoom/scroll and enables smooth 1-finger pan and 2-finger pinch-to-zoom!
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
      const newZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Number((oldZoom * (1 + zoomStep)).toFixed(3)))
      );

      if (newZoom === oldZoom) return;

      // Adjust pan so the point under the mouse cursor stays stationary while zooming, then clamp to edges
      const scaleRatio = newZoom / oldZoom;
      const oldPan = panRef.current;
      const newPanX = cursorX - (cursorX - oldPan.x) * scaleRatio;
      const newPanY = cursorY - (cursorY - oldPan.y) * scaleRatio;

      setIsWheelZooming(true);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = setTimeout(() => {
        setIsWheelZooming(false);
      }, 140);

      setZoom(newZoom);
      schedulePan(clampPan(newPanX, newPanY, newZoom));
    };

    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    // Mobile and tablet touch gesture state
    const touchState = {
      mode: null as "pan" | "pinch" | null,
      startX: 0,
      startY: 0,
      panStartX: 0,
      panStartY: 0,
      initialPinchDist: 0,
      initialZoom: 1,
      pinchMidX: 0,
      pinchMidY: 0,
      initialPanX: 0,
      initialPanY: 0,
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchState.mode = "pan";
        touchState.startX = e.touches[0].clientX;
        touchState.startY = e.touches[0].clientY;
        touchState.panStartX = panRef.current.x;
        touchState.panStartY = panRef.current.y;
        didDragRef.current = false;
        // Do not set isDragging(true) yet so taps on pins are not blocked by pointer-events-none!
      } else if (e.touches.length === 2) {
        touchState.mode = "pinch";
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        touchState.initialPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        touchState.initialZoom = zoomRef.current;
        const rect = el.getBoundingClientRect();
        touchState.pinchMidX = (t1.clientX + t2.clientX) / 2 - (rect.left + rect.width / 2);
        touchState.pinchMidY = (t1.clientY + t2.clientY) / 2 - (rect.top + rect.height / 2);
        touchState.initialPanX = panRef.current.x;
        touchState.initialPanY = panRef.current.y;
        didDragRef.current = true;
        setIsDragging(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchState.mode) return;
      e.preventDefault();
      e.stopPropagation();

      if (touchState.mode === "pan" && e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchState.startX;
        const dy = e.touches[0].clientY - touchState.startY;
        if (Math.hypot(dx, dy) > 6) {
          didDragRef.current = true;
          setIsDragging(true);
        }
        schedulePan(clampPan(touchState.panStartX + dx, touchState.panStartY + dy, zoomRef.current));
      } else if (touchState.mode === "pinch" && e.touches.length === 2 && touchState.initialPinchDist > 0) {
        didDragRef.current = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const pinchRatio = currentDist / touchState.initialPinchDist;
        const newZoom = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, Number((touchState.initialZoom * pinchRatio).toFixed(3)))
        );
        const scaleRatio = newZoom / touchState.initialZoom;
        const newPanX = touchState.pinchMidX - (touchState.pinchMidX - touchState.initialPanX) * scaleRatio;
        const newPanY = touchState.pinchMidY - (touchState.pinchMidY - touchState.initialPanY) * scaleRatio;
        setZoom(newZoom);
        schedulePan(clampPan(newPanX, newPanY, newZoom));
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      flushPendingPan();
      if (e.touches.length === 0) {
        touchState.mode = null;
        setIsDragging(false);
      } else if (e.touches.length === 1) {
        touchState.mode = "pan";
        touchState.startX = e.touches[0].clientX;
        touchState.startY = e.touches[0].clientY;
        touchState.panStartX = panRef.current.x;
        touchState.panStartY = panRef.current.y;
      }
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    el.addEventListener("gesturestart", preventGesture, { passive: false });
    el.addEventListener("gesturechange", preventGesture, { passive: false });
    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: false });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener("wheel", handleNativeWheel);
      el.removeEventListener("gesturestart", preventGesture);
      el.removeEventListener("gesturechange", preventGesture);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [clampPan, schedulePan, flushPendingPan]);

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
      setPan(clampPan(dx, dy, targetZoom));
    },
    [clampPan]
  );

  // Trigger zoom when user clicks "Focus Map", selects from search, or double clicks
  useEffect(() => {
    if (zoomToRouteTrigger > 0) {
      const target = routes.find((r) => r.id === selectedRouteId);
      if (target) {
        setExpandedRouteId(target.id);
        focusOnRoute(target, 2.4);
      }
    }
  }, [zoomToRouteTrigger, selectedRouteId, routes, focusOnRoute]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isMouseDownRef.current = true;
    didDragRef.current = false;
    dragStartPosRef.current = { clientX: e.clientX, clientY: e.clientY };
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current) return;
    const moveDist = Math.hypot(
      e.clientX - dragStartPosRef.current.clientX,
      e.clientY - dragStartPosRef.current.clientY
    );
    if (moveDist > 6) {
      didDragRef.current = true;
      if (!isDragging) {
        setIsDragging(true);
      }
      const rawX = e.clientX - dragStart.x;
      const rawY = e.clientY - dragStart.y;
      schedulePan(clampPan(rawX, rawY, zoom));
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    flushPendingPan();
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const applyZoomButton = (delta: number) => {
    const newZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Number((zoom + delta).toFixed(2)))
    );
    setZoom(newZoom);
    setPan((prev) => clampPan(prev.x, prev.y, newZoom));
  };

  const resetCamera = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Memoize search matched IDs to avoid re-searching all encounters on every pan frame
  const searchMatchedIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase().trim();
    const matched = new Set<string>();
    for (const r of routes) {
      if (
        r.name.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        r.encounters.some(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.types.some((t) => t.toLowerCase().includes(q)) ||
            e.badge.toLowerCase().includes(q)
        )
      ) {
        matched.add(r.id);
      }
    }
    return matched;
  }, [routes, searchQuery]);

  // Memoize caught sets for instant O(1) status lookups
  const caughtSet = useMemo(() => new Set(caughtPokemonIds), [caughtPokemonIds]);
  const shinySet = useMemo(() => new Set(shinyCaughtIds), [shinyCaughtIds]);

  const shinyOddsShort =
    shinySummary?.four_patch_odds || shinySummary?.single_patch_odds || "1/4,096";

  // Dynamic pin and city scale so routes, icons, and text remain prominent and easily legible
  const pinScale = Math.max(0.85, Number((1.38 / Math.pow(zoom, 0.4)).toFixed(3)));
  const expandedCardScale = Math.max(0.9, Number((1.25 / Math.pow(zoom, 0.35)).toFixed(3)));
  const cityScale = Math.max(0.85, Number((1.25 / Math.pow(zoom, 0.35)).toFixed(3)));

  // Sort routes so expanded, selected, and hovered routes render on top of everything else (memoized against pan/zoom)
  const sortedRoutes = useMemo(() => {
    return [...routes].sort((a, b) => {
      const score = (r: SinnohRoute) =>
        r.id === expandedRouteId
          ? 4
          : r.id === selectedRouteId
          ? 3
          : r.id === hoveredRouteId
          ? 2
          : searchMatchedIds.has(r.id)
          ? 1
          : 0;
      return score(a) - score(b);
    });
  }, [routes, expandedRouteId, selectedRouteId, hoveredRouteId, searchMatchedIds]);

  const isInteractingActive = isDragging || isWheelZooming;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ touchAction: "none", overscrollBehavior: "none" }}
      className={`relative w-full h-full overflow-hidden select-none bg-[#176f91] ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      {/* Ambient Blurred Map Backdrop so any surrounding aspect-ratio margin blends seamlessly */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <img
          src="/bdsp-town-map.png"
          alt=""
          className="w-full h-full object-cover scale-125 blur-2xl opacity-75 saturate-110"
        />
        <div className="absolute inset-0 bg-slate-950/20" />
      </div>

      {/* Interactive Pan/Zoom SVG Canvas (Hardware Accelerated) */}
      <div
        className={`relative w-full h-full flex items-center justify-center ${
          isInteractingActive ? "" : "transition-transform duration-150 ease-out"
        }`}
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
          transformOrigin: "center center",
          willChange: isInteractingActive ? "transform" : "auto",
          backfaceVisibility: "hidden",
        }}
      >
            <svg
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              className="w-full h-full overflow-visible"
            >
              <defs>
                <filter id="selectedGlow" x="-35%" y="-35%" width="170%" height="170%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#6366f1" floodOpacity="0.95" />
                </filter>
                <filter id="searchGlow" x="-35%" y="-35%" width="170%" height="170%">
                  <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#facc15" floodOpacity="0.95" />
                </filter>

                {/* Feathered edge mask so the map image fades softly with rounded corners into the ocean backdrop */}
                <filter id="edgeFeatherFilter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="9" />
                </filter>
                <mask
                  id="mapEdgeFadeMask"
                  maskUnits="userSpaceOnUse"
                  x="-50"
                  y="-50"
                  width={MAP_WIDTH + 100}
                  height={MAP_HEIGHT + 100}
                >
                  <rect
                    x="-50"
                    y="-50"
                    width={MAP_WIDTH + 100}
                    height={MAP_HEIGHT + 100}
                    fill="black"
                  />
                  <rect
                    x="12"
                    y="12"
                    width={MAP_WIDTH - 24}
                    height={MAP_HEIGHT - 24}
                    rx="26"
                    fill="white"
                    filter="url(#edgeFeatherFilter)"
                  />
                </mask>
              </defs>

              {/* ACTUAL IN-GAME POKÉMON BRILLIANT DIAMOND / SHINING PEARL SINNOH TOWN MAP (Feathered Edges) */}
              <image
                href="/bdsp-town-map.png"
                x="0"
                y="0"
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                preserveAspectRatio="none"
                mask="url(#mapEdgeFadeMask)"
              />

          {/* IN-GAME CITY & TOWN LABELS: FLOATING ALL CAPS CARTOGRAPHIC TYPOGRAPHY WITH DARK SHADING */}
          {showCityLabels &&
            cities.map((city) => (
              <g
                key={city.id}
                transform={`translate(${city.x}, ${city.y}) scale(${cityScale})`}
                className="pointer-events-none select-none"
              >
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={
                    city.size === "league"
                      ? "#fef08a"
                      : city.size === "city"
                      ? "#ffffff"
                      : "#f1f5f9"
                  }
                  stroke="rgba(15, 23, 42, 0.95)"
                  strokeWidth="2.6"
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                  fontSize="7.4"
                  fontWeight="800"
                  letterSpacing="0.08em"
                  opacity="0.82"
                >
                  {city.name.toUpperCase()}
                </text>
              </g>
            ))}

          {/* INTERACTIVE ROUTES & LANDMARKS: DYNAMICALLY SCALED ON ZOOM OUT FOR EFFORTLESS READING */}
          {showRoutePins && (
            <g className={isInteractingActive ? "pointer-events-none" : ""}>
              {sortedRoutes.map((route) => {
              const isSelected = route.id === selectedRouteId;
              const isExpanded = isSelected && expandedRouteId === route.id;
              const isHovered = route.id === hoveredRouteId;
              const isSearchMatch = searchMatchedIds.has(route.id);
              const style = TERRAIN_STYLES[route.terrain] || TERRAIN_STYLES.grassland;

              // Check completion status using pre-memoized Set lookups (O(1))
              const uniqueIds = Array.from(
                new Set(route.encounters.map((e) => e.pokemon_id))
              );
              const allCaught =
                uniqueIds.length > 0 &&
                uniqueIds.every((id) => caughtSet.has(id));
              const anyShinyCaught = uniqueIds.some((id) =>
                shinySet.has(id)
              );

              const isNumberedRoute = route.name.startsWith("Route ");
              const routeNum = isNumberedRoute ? route.name.replace("Route ", "") : "";
              const shortName = route.name
                .replace("Route ", "R")
                .replace("Valley Windworks", "Windworks")
                .replace("Fuego Ironworks", "Fuego")
                .replace("Oreburgh Gate", "Ore. Gate")
                .replace("Wayward Cave", "Wayward")
                .replace("Trophy Garden", "Trophy Gdn")
                .replace("Great Marsh", "Gt. Marsh")
                .replace("Victory Road", "Victory Rd")
                .replace("Stark Mountain", "Stark Mtn")
                .replace("Eterna Forest", "Eterna For.")
                .replace("Ravaged Path", "Ravaged")
                .replace("Oreburgh Mine", "Ore. Mine")
                .replace("Ruins of Alph", "Ruins")
                .replace("Solaceon Ruins", "Sol. Ruins")
                .replace("Sendoff Spring", "Sendoff")
                .replace("Snowpoint Temple", "Snow. Tmpl");

              const iconsToShow = route.preview_pokemon.slice(0, 4);
              const expandedW = 90;
              const expandedH = 52;
              const circleRadius = isHovered || isSearchMatch ? 13.5 : 12;

              return (
                <g
                  key={route.id}
                  transform={`translate(${route.x}, ${route.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (didDragRef.current) return;
                    onSelectRoute(route.id);
                    setExpandedRouteId(route.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onSelectRoute(route.id);
                    setExpandedRouteId(route.id);
                    focusOnRoute(route, 2.4);
                  }}
                  onMouseEnter={() => setHoveredRouteId(route.id)}
                  onMouseLeave={() => setHoveredRouteId(null)}
                  className="cursor-pointer"
                >
                  {/* Exact Route path highlight box on Sinnoh map */}
                  {isExpanded && (
                    <rect
                      x={-route.width / 2}
                      y={-route.height / 2}
                      width={route.width}
                      height={route.height}
                      rx="8"
                      fill="rgba(99, 102, 241, 0.22)"
                      stroke="#818cf8"
                      strokeWidth="1.6"
                      strokeDasharray="3 2"
                    />
                  )}

                  {/* Pin Content: Dynamically Scaled so it remains clear and readable at any zoom level */}
                  <g transform={`scale(${isExpanded ? expandedCardScale : pinScale})`}>
                    {isExpanded ? (
                      /* EXPANDED CARD: ONLY RENDERED FOR THE CLICKED / ACTIVE ROUTE */
                      <g filter="url(#selectedGlow)">
                        {/* Expanded Card Container */}
                        <rect
                          x={-expandedW / 2}
                          y={-expandedH / 2}
                          width={expandedW}
                          height={expandedH}
                          rx="9"
                          fill="rgba(30, 27, 75, 0.96)"
                          stroke={isSearchMatch ? "#facc15" : "#a5b4fc"}
                          strokeWidth="1.8"
                        />

                        {/* Expanded Card Header */}
                        <rect
                          x={-expandedW / 2}
                          y={-expandedH / 2}
                          width={expandedW}
                          height={13}
                          rx="8"
                          fill="#4338ca"
                        />
                        <text
                          x="0"
                          y={-expandedH / 2 + 9.2}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="7.2"
                          fontWeight="800"
                        >
                          {route.name.replace("Route ", "Route ")}
                          {allCaught ? " ✓" : ""}
                          {anyShinyCaught ? " ✨" : ""}
                        </text>

                        {/* Preview Pokémon Sprites & Encounter Rates */}
                        <g transform="translate(0, 1.5)">
                          {iconsToShow.map((poke, idx) => {
                            const count = iconsToShow.length;
                            const spacing = 20;
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
                                  x={-10}
                                  y={-10}
                                  width={20}
                                  height={20}
                                  className="pixelated"
                                />
                                <text
                                  x="0"
                                  y="11.5"
                                  textAnchor="middle"
                                  fill="#f8fafc"
                                  fontSize="5.5"
                                  fontWeight="800"
                                  style={{ textShadow: "0px 1px 2px #000" }}
                                >
                                  {poke.active_rate}%
                                </text>
                              </g>
                            );
                          })}
                        </g>

                        {/* Shiny Odds & Species Count Footer */}
                        <g transform={`translate(0, ${expandedH / 2 - 5})`}>
                          <rect
                            x={-expandedW / 2 + 4}
                            y={-4}
                            width={expandedW - 8}
                            height={8}
                            rx="4"
                            fill="rgba(15, 23, 42, 0.92)"
                          />
                          <text
                            x="0"
                            y="1.6"
                            textAnchor="middle"
                            fill="#fde047"
                            fontSize="5.2"
                            fontWeight="700"
                          >
                            ✨ {shinyOddsShort} • {route.total_species} spp.
                          </text>
                        </g>
                      </g>
                    ) : (
                      /* COLLAPSED DEFAULT: HIGH-PERFORMANCE PIN WITH HARDWARE-FRIENDLY VECTOR SHADOW */
                      <g
                        filter={
                          isSearchMatch
                            ? "url(#searchGlow)"
                            : isSelected
                            ? "url(#selectedGlow)"
                            : undefined
                        }
                      >
                        {/* High-Performance Vector Shadow (Zero filter rasterization overhead!) */}
                        <circle
                          cx="0"
                          cy="2"
                          r={circleRadius}
                          fill="rgba(15, 23, 42, 0.45)"
                          className="pointer-events-none"
                        />

                        {/* Outer Circular Icon Node */}
                        <circle
                          cx="0"
                          cy="0"
                          r={circleRadius}
                          fill={isSelected ? "#3730a3" : style.badgeBg}
                          stroke={
                            isSearchMatch
                              ? "#facc15"
                              : isSelected
                              ? "#a5b4fc"
                              : isHovered
                              ? "#ffffff"
                              : style.stroke
                          }
                          strokeWidth={isSearchMatch || isSelected || isHovered ? 2 : 1.3}
                        />

                        {/* Subtle Inner Ring */}
                        <circle
                          cx="0"
                          cy="0"
                          r={circleRadius - 2.2}
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.2)"
                          strokeWidth="0.6"
                        />

                        {isNumberedRoute ? (
                          /* Numbered Route Name Inside the Round Icon (e.g. R201) */
                          <text
                            x="0"
                            y="2.8"
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="8.2"
                            fontWeight="800"
                            letterSpacing="0.02em"
                          >
                            R{routeNum}
                          </text>
                        ) : (
                          /* Landmark Badge Inside Circle + Clean Floating Label Without Bounding Box */
                          <>
                            <text
                              x="0"
                              y="2.4"
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize={getLandmarkBadge(route.id, route.name).length > 4 ? "5.4" : "6.5"}
                              fontWeight="800"
                              letterSpacing="0.03em"
                            >
                              {getLandmarkBadge(route.id, route.name)}
                            </text>
                            {(() => {
                              const isLabelOnTop =
                                route.label_position === "top" ||
                                route.id === "oreburgh-gate";
                              return (
                                <text
                                  x="0"
                                  y={isLabelOnTop ? -(circleRadius + 4.5) : circleRadius + 8.5}
                                  textAnchor="middle"
                                  fill="#f8fafc"
                                  stroke="rgba(15, 23, 42, 0.95)"
                                  strokeWidth="2.5"
                                  strokeLinejoin="round"
                                  paintOrder="stroke fill"
                                  fontSize="6.6"
                                  fontWeight="800"
                                  letterSpacing="0.02em"
                                  className="pointer-events-none"
                                >
                                  {shortName}
                                </text>
                              );
                            })()}
                          </>
                        )}

                        {/* Small Completion / Shiny Indicator Dot on Circle Rim */}
                        {(allCaught || anyShinyCaught) && (
                          <circle
                            cx={circleRadius * 0.72}
                            cy={-circleRadius * 0.72}
                            r="3.2"
                            fill={anyShinyCaught ? "#facc15" : "#22c55e"}
                            stroke="#0f172a"
                            strokeWidth="0.9"
                          />
                        )}
                      </g>
                    )}
                  </g>
                </g>
              );
            })}
            </g>
          )}
        </svg>
      </div>

      {/* Subtle Inner Viewport Vignette so outer boundaries feel framed and discrete */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_54px_rgba(2,6,23,0.55)]"
      />

      {/* Floating Map Controls (Top-Left) - Compact & Clean Micro-Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-lg p-1 shadow-lg text-slate-300 select-none">
        {/* Zoom Out on Left */}
        <button
          onClick={() => applyZoomButton(-0.35)}
          title="Zoom Out"
          className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono text-indigo-300 font-semibold px-1 min-w-[32px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        {/* Zoom In on Right */}
        <button
          onClick={() => applyZoomButton(0.35)}
          title="Zoom In"
          className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={resetCamera}
          title="Reset View"
          className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-3.5 bg-slate-800 mx-0.5" />

        {/* Zoom to Selected Route */}
        <button
          onClick={() => {
            const target = routes.find((r) => r.id === selectedRouteId);
            if (target) focusOnRoute(target, 2.4);
          }}
          title="Zoom to Selected Route"
          className="p-1.5 rounded hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-200 transition"
        >
          <MapPin className="w-3.5 h-3.5" />
        </button>

        {/* Toggle Route Pins */}
        <button
          onClick={() => setShowRoutePins((v) => !v)}
          title={showRoutePins ? "Hide Route Pins" : "Show Route Pins"}
          className="p-1.5 rounded hover:bg-slate-800 transition"
        >
          {showRoutePins ? (
            <EyeOff className="w-3.5 h-3.5 text-amber-400/90" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-emerald-400/90" />
          )}
        </button>

        {/* Toggle City Labels */}
        <button
          onClick={() => setShowCityLabels((v) => !v)}
          title={showCityLabels ? "Hide City Names" : "Show City Names"}
          className={`p-1.5 rounded transition ${
            showCityLabels
              ? "text-sky-400 hover:text-sky-200 hover:bg-slate-800"
              : "text-slate-500 hover:text-slate-400 hover:bg-slate-800"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
