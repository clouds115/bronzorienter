"use client";

import React, { useEffect, useState } from "react";
import { X, Sparkles, MapPin, Shield, Activity } from "lucide-react";
import { PokemonApiDetail } from "@/types/sinnoh";

interface PokemonDetailModalProps {
  pokemonId: number | null;
  onClose: () => void;
  onJumpToRoute: (routeId: string) => void;
  initialShowShiny?: boolean;
}

export default function PokemonDetailModal({
  pokemonId,
  onClose,
  onJumpToRoute,
  initialShowShiny = false,
}: PokemonDetailModalProps) {
  const [detail, setDetail] = useState<PokemonApiDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showShiny, setShowShiny] = useState<boolean>(initialShowShiny);

  useEffect(() => {
    setShowShiny(initialShowShiny);
  }, [initialShowShiny]);

  useEffect(() => {
    if (!pokemonId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/pokemon/${pokemonId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pokemonId]);

  if (!pokemonId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/90 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              #{String(pokemonId).padStart(3, "0")}
            </span>
            <h3 className="text-lg font-bold text-white">
              {detail?.name || "Loading Pokémon..."}
            </h3>
            {detail?.types?.map((t) => (
              <span
                key={t}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-200"
              >
                {t}
              </span>
            ))}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[80vh] overflow-y-auto space-y-5">
          {loading || !detail ? (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
              Fetching Pokédex data from PokeAPI...
            </div>
          ) : (
            <>
              {/* Artwork & Normal/Shiny Toggle */}
              <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <div className="relative w-32 h-32 flex items-center justify-center bg-gradient-to-b from-indigo-950/40 to-slate-900 rounded-xl border border-slate-800">
                  <img
                    src={showShiny ? detail.shiny_artwork_url : detail.artwork_url}
                    alt={detail.name}
                    className="w-28 h-28 object-contain drop-shadow-lg"
                  />
                </div>
                <div className="flex-1 space-y-2.5 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      onClick={() => setShowShiny(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        !showShiny
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      Normal Form
                    </button>
                    <button
                      onClick={() => setShowShiny(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                        showShiny
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-800 text-amber-300 hover:bg-slate-700"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Shiny Form
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                      <div className="text-slate-400 text-[10px]">Catch Rate</div>
                      <div className="font-bold text-emerald-400">
                        {detail.catch_rate} / 255
                      </div>
                    </div>
                    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                      <div className="text-slate-400 text-[10px]">Height</div>
                      <div className="font-bold text-slate-200">
                        {detail.height_m ? `${detail.height_m} m` : "—"}
                      </div>
                    </div>
                    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                      <div className="text-slate-400 text-[10px]">Weight</div>
                      <div className="font-bold text-slate-200">
                        {detail.weight_kg ? `${detail.weight_kg} kg` : "—"}
                      </div>
                    </div>
                  </div>

                  {detail.abilities.length > 0 && (
                    <div className="text-xs text-slate-300">
                      <span className="text-slate-400 mr-1.5">Abilities:</span>
                      {detail.abilities.map((a) => (
                        <span
                          key={a.name}
                          className="inline-block mr-1.5 px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px]"
                        >
                          {a.name}
                          {a.is_hidden ? " (Hidden)" : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Base Stats from PokeAPI */}
              {detail.stats.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    Base Stats (PokeAPI)
                  </h4>
                  <div className="space-y-1.5 bg-slate-950/50 border border-slate-800/80 rounded-xl p-3">
                    {detail.stats.map((s) => {
                      const pct = Math.min(100, Math.round((s.base_stat / 160) * 100));
                      return (
                        <div key={s.name} className="flex items-center gap-2 text-xs">
                          <span className="w-16 text-slate-400 font-medium">
                            {s.name}
                          </span>
                          <span className="w-8 text-right font-mono font-bold text-slate-200">
                            {s.base_stat}
                          </span>
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sinnoh Route Locations */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Sinnoh Catch Locations ({detail.sinnoh_locations.length})
                </h4>
                <div className="space-y-1.5">
                  {detail.sinnoh_locations.map((loc, i) => (
                    <div
                      key={`${loc.route_id}-${i}`}
                      className="flex items-center justify-between bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl px-3 py-2 text-xs transition"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          {loc.route_name}
                          {loc.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {loc.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Lv. {loc.levels} • {loc.method.replace("_", " ").toUpperCase()} •{" "}
                          M:{loc.rates.morning}% / D:{loc.rates.day}% / N:{loc.rates.night}%
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onJumpToRoute(loc.route_id);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition"
                      >
                        View on Map
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
