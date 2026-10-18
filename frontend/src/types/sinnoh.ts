export type TimeOfDay = "morning" | "day" | "night";

export type ShinyHuntMethod = "wild" | "poke_radar" | "underground" | "masuda_egg";

export interface EncounterRates {
  morning: number;
  day: number;
  night: number;
}

export interface PokemonEncounter {
  pokemon_id: number;
  name: string;
  types: string[];
  catch_rate: number;
  method: string;
  levels: string;
  rates: EncounterRates;
  badge: string;
  sprite_url: string;
  shiny_sprite_url: string;
  artwork_url: string;
  active_rate: number;
  normal_odds_label: string;
  normal_1_in: string;
  shiny_odds_label: string;
  combined_shiny_odds: string;
  combined_shiny_denom: number | null;
}

export interface PreviewPokemon {
  pokemon_id: number;
  name: string;
  sprite_url: string;
  shiny_sprite_url: string;
  active_rate: number;
  method: string;
  badge: string;
}

export interface SinnohRoute {
  id: string;
  name: string;
  subtitle: string;
  category: "route" | "landmark";
  terrain: "grassland" | "water" | "cave" | "forest" | "mountain" | "snow" | "marsh" | "coastal" | "volcanic" | "desert";
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
  encounters: PokemonEncounter[];
  preview_pokemon: PreviewPokemon[];
  total_species: number;
  label_position?: "top" | "bottom";
}

export interface SinnohCity {
  id: string;
  name: string;
  x: number;
  y: number;
  size: "town" | "city" | "league";
}

export interface ShinySummary {
  method: ShinyHuntMethod;
  radar_chain?: number;
  rolls?: number;
  single_patch_odds: string;
  single_patch_denom: number;
  single_patch_percent: number;
  four_patch_odds?: string;
  four_patch_denom?: number;
  four_patch_percent?: number;
  active_probability: number;
  active_odds_label: string;
  bdsp_note: string;
}

export interface MapApiResponse {
  routes: SinnohRoute[];
  cities: SinnohCity[];
  shiny_summary: ShinySummary;
  time_of_day: TimeOfDay;
}

export interface PokemonApiDetail {
  pokemon_id: number;
  name: string;
  types: string[];
  catch_rate: number;
  sprite_url: string;
  shiny_sprite_url: string;
  artwork_url: string;
  shiny_artwork_url: string;
  sinnoh_locations: {
    route_id: string;
    route_name: string;
    method: string;
    levels: string;
    rates: EncounterRates;
    badge: string;
  }[];
  stats: { name: string; base_stat: number }[];
  abilities: { name: string; is_hidden: boolean }[];
  height_m: number | null;
  weight_kg: number | null;
  source: string;
}
