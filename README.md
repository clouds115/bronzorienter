# Bronzorienter - Pokémon Brilliant Diamond: Interactive Sinnoh Route Map

An interactive **Next.js + FastAPI** web application for exploring the Sinnoh region in **Pokémon Brilliant Diamond**.

## Features
- **Interactive Stylized SVG Map of Sinnoh**:
  - Smooth scroll-wheel zoom, drag-to-pan, double-click route focus, and topological road/waterway network across West Sinnoh, Mt. Coronet, East Sinnoh, Snowpoint, and the post-game Battle Zone.
  - Dynamic Route Cards on the map that reveal catchable Pokémon icons, active encounter percentages, and live shiny odds directly on the map as you zoom in.
- **Time-of-Day & Method Breakdown**:
  - Switch between **Morning**, **Day**, and **Night** to see exact Brilliant Diamond encounter rate shifts (such as night-only Murkrow in Eterna Forest or Zubat/Gastly spawns).
  - Filter by **Walking/Grass**, **Poké Radar**, **Surfing**, **Old/Good/Super Rod Fishing**, **Cave/Mountain**, and **Honey Trees / Static** encounters.
- **Exact BDSP Shiny Odds Calculator**:
  - Supports **Wild Base (`1/4,096`)**, **Poké Radar Chains (`0–40` slider up to `1/99` per patch / `3.98%` per 4-patch reset)**, **Grand Underground (`40/40` Diglett bonus `1/2,048`)**, and **Masuda Method Breeding (`1/512` with Shiny Charm)**.
  - Computes **Combined Target Shiny Odds** (`Encounter Rate % × Shiny Probability`) for every Pokémon on a route.
- **Live PokeAPI Inspector & Checklist Tracker**:
  - Click any Pokémon to view Normal vs. Shiny official artwork, Base Stats fetched & cached from PokeAPI, Catch Rate, and every Sinnoh route where it can be caught.
  - Mark Pokémon as **Caught** (`✓`) or **Shiny Caught** (`✨`), saved automatically in `localStorage`.

## Quick Start

### Option 1: One-Command PowerShell Launcher
```powershell
.\start-dev.ps1
```

### Option 2: Run Backend & Frontend Separately
1. **Start the FastAPI Backend (`http://127.0.0.1:8000`)**:
   ```powershell
   cd backend
   pip install -r requirements.txt
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
2. **Start the Next.js Frontend (`http://localhost:3000`)**:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
