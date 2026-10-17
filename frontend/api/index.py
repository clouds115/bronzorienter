import os
import sys
from typing import Dict, Any, Optional
import httpx
from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Ensure current directory is on sys.path for local imports
sys.path.append(os.path.dirname(__file__))

from sinnoh_data import (
    SINNOH_ROUTES,
    SINNOH_CITIES,
    POKEMON_METADATA,
    POKE_RADAR_DENOMINATORS,
    calculate_shiny_odds,
)

app = FastAPI(
    title="Pokémon Brilliant Diamond Interactive Sinnoh Map API",
    description="FastAPI serverless backend for Vercel deployment.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_POKEAPI_CACHE: Dict[int, Dict[str, Any]] = {}


def enrich_encounter_odds(
    encounter: Dict[str, Any],
    time_of_day: str,
    shiny_info: Dict[str, Any],
) -> Dict[str, Any]:
    rate_pct = encounter["rates"].get(time_of_day, encounter["rates"]["day"])
    shiny_prob = shiny_info["active_probability"]
    shiny_denom = shiny_info.get("four_patch_denom") or shiny_info.get("single_patch_denom", 4096)

    combined_prob = (rate_pct / 100.0) * shiny_prob
    combined_denom = round(1.0 / combined_prob) if combined_prob > 0 else None

    return {
        **encounter,
        "active_rate": rate_pct,
        "normal_odds_label": f"{rate_pct}%" if rate_pct > 0 else "0% (Unavailable)",
        "normal_1_in": f"1 / {round(100 / rate_pct, 1):g}" if rate_pct > 0 else "—",
        "shiny_odds_label": f"1 / {shiny_denom:,}",
        "combined_shiny_odds": f"1 / {combined_denom:,}" if combined_denom else "—",
        "combined_shiny_denom": combined_denom,
    }


router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "bdsp-sinnoh-map-api",
        "routes_count": len(SINNOH_ROUTES),
        "cities_count": len(SINNOH_CITIES),
        "unique_pokemon_count": len(POKEMON_METADATA),
    }


@router.get("/map")
async def get_map_data(
    time_of_day: str = Query("day", pattern="^(morning|day|night)$"),
    shiny_method: str = Query("wild", pattern="^(wild|poke_radar|underground|masuda_egg)$"),
    radar_chain: int = Query(0, ge=0, le=40),
    diglett_bonus: bool = Query(False),
    masuda: bool = Query(False),
    shiny_charm: bool = Query(False),
):
    shiny_info = calculate_shiny_odds(
        method=shiny_method,
        radar_chain=radar_chain,
        diglett_bonus=diglett_bonus,
        masuda=masuda,
        shiny_charm=shiny_charm,
    )

    enriched_routes = []
    for route in SINNOH_ROUTES:
        encounters = [
            enrich_encounter_odds(e, time_of_day, shiny_info)
            for e in route["encounters"]
        ]
        seen_ids = []
        preview_pokemon = []
        for enc_item in encounters:
            pid = enc_item["pokemon_id"]
            if pid not in seen_ids:
                seen_ids.append(pid)
                preview_pokemon.append(
                    {
                        "pokemon_id": pid,
                        "name": enc_item["name"],
                        "sprite_url": enc_item["sprite_url"],
                        "shiny_sprite_url": enc_item["shiny_sprite_url"],
                        "active_rate": enc_item["active_rate"],
                        "method": enc_item["method"],
                        "badge": enc_item["badge"],
                    }
                )

        enriched_routes.append(
            {
                **route,
                "encounters": encounters,
                "preview_pokemon": preview_pokemon[:6],
                "total_species": len(seen_ids),
            }
        )

    return {
        "routes": enriched_routes,
        "cities": SINNOH_CITIES,
        "shiny_summary": shiny_info,
        "time_of_day": time_of_day,
    }


@router.get("/routes/{route_id}")
async def get_route_detail(
    route_id: str,
    time_of_day: str = Query("day", pattern="^(morning|day|night)$"),
    shiny_method: str = Query("wild", pattern="^(wild|poke_radar|underground|masuda_egg)$"),
    radar_chain: int = Query(0, ge=0, le=40),
    diglett_bonus: bool = Query(False),
    masuda: bool = Query(False),
    shiny_charm: bool = Query(False),
):
    route = next((r for r in SINNOH_ROUTES if r["id"] == route_id), None)
    if not route:
        raise HTTPException(status_code=404, detail=f"Route '{route_id}' not found")

    shiny_info = calculate_shiny_odds(
        method=shiny_method,
        radar_chain=radar_chain,
        diglett_bonus=diglett_bonus,
        masuda=masuda,
        shiny_charm=shiny_charm,
    )

    encounters = [
        enrich_encounter_odds(e, time_of_day, shiny_info)
        for e in route["encounters"]
    ]

    return {
        **route,
        "encounters": encounters,
        "shiny_summary": shiny_info,
        "time_of_day": time_of_day,
    }


@router.get("/shiny-odds")
async def get_shiny_odds_endpoint(
    method: str = Query("wild", pattern="^(wild|poke_radar|underground|masuda_egg)$"),
    radar_chain: int = Query(0, ge=0, le=40),
    diglett_bonus: bool = Query(False),
    masuda: bool = Query(False),
    shiny_charm: bool = Query(False),
):
    current = calculate_shiny_odds(
        method=method,
        radar_chain=radar_chain,
        diglett_bonus=diglett_bonus,
        masuda=masuda,
        shiny_charm=shiny_charm,
    )
    radar_curve = []
    for c, denom in POKE_RADAR_DENOMINATORS.items():
        p1 = 1.0 / denom
        p4 = 1.0 - ((1.0 - p1) ** 4)
        radar_curve.append(
            {
                "chain": c,
                "single_patch_denom": denom,
                "four_patch_denom": round(1.0 / p4),
                "four_patch_percent": round(p4 * 100, 3),
            }
        )
    return {
        "current": current,
        "radar_curve": radar_curve,
    }


@router.get("/pokemon/{pokemon_id}")
async def get_pokemon_details(pokemon_id: int):
    if pokemon_id in _POKEAPI_CACHE:
        return _POKEAPI_CACHE[pokemon_id]

    local_meta = POKEMON_METADATA.get(
        pokemon_id,
        {"name": f"Pokemon #{pokemon_id}", "types": ["Normal"], "catch_rate": 120},
    )

    locations = []
    for route in SINNOH_ROUTES:
        for enc_item in route["encounters"]:
            if enc_item["pokemon_id"] == pokemon_id:
                locations.append(
                    {
                        "route_id": route["id"],
                        "route_name": route["name"],
                        "method": enc_item["method"],
                        "levels": enc_item["levels"],
                        "rates": enc_item["rates"],
                        "badge": enc_item["badge"],
                    }
                )

    result: Dict[str, Any] = {
        "pokemon_id": pokemon_id,
        "name": local_meta["name"],
        "types": local_meta["types"],
        "catch_rate": local_meta["catch_rate"],
        "sprite_url": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{pokemon_id}.png",
        "shiny_sprite_url": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/{pokemon_id}.png",
        "artwork_url": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{pokemon_id}.png",
        "shiny_artwork_url": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/{pokemon_id}.png",
        "sinnoh_locations": locations,
        "stats": [],
        "abilities": [],
        "height_m": None,
        "weight_kg": None,
        "source": "local_fallback",
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"https://pokeapi.co/api/v2/pokemon/{pokemon_id}")
            if resp.status_code == 200:
                data = resp.json()
                result["height_m"] = round(data.get("height", 0) / 10.0, 1)
                result["weight_kg"] = round(data.get("weight", 0) / 10.0, 1)
                result["abilities"] = [
                    {
                        "name": a["ability"]["name"].replace("-", " ").title(),
                        "is_hidden": a.get("is_hidden", False),
                    }
                    for a in data.get("abilities", [])
                ]
                result["stats"] = [
                    {
                        "name": s["stat"]["name"]
                        .replace("special-attack", "Sp. Atk")
                        .replace("special-defense", "Sp. Def")
                        .replace("hp", "HP")
                        .replace("attack", "Atk")
                        .replace("defense", "Def")
                        .replace("speed", "Spd"),
                        "base_stat": s["base_stat"],
                    }
                    for s in data.get("stats", [])
                ]
                result["source"] = "pokeapi_cached"
    except Exception:
        pass

    _POKEAPI_CACHE[pokemon_id] = result
    return result


# Mount router under both "/" and "/api" so Vercel rewrites match regardless of path prefix
app.include_router(router)
app.include_router(router, prefix="/api")
