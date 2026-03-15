# RavenClaw-lite: Development Brief

## Overview

Build a simplified, read-only Leaflet-based web interface for a classroom exercise in CLA3129 Week 10. The tool helps students estimate the length of the lost first segment of the Peutinger Map by comparing its surviving place-name density (per parchment sheet) with the Ravenna Cosmography's littoral itinerary, which preserves locations from the missing area.

This tool lives in the `leifuss/cla3129` repo (GitHub Pages site at `leifuss.github.io/cla3129/`). It draws data and assets from the `leifuss/ravenclaw` repo but is a standalone, simplified interface purpose-built for a single classroom exercise.

## Pedagogical Context

Students need to:
1. See the surviving Peutinger Map's toponyms plotted on a geographic map, with the TP itself visible as a base image so they can identify which sheet each location falls on
2. See the Ravenna Cosmography's littoral (coastal) itinerary, which continues westward into the area covered by the lost first segment
3. Count TP locations per parchment sheet (students identify sheets visually from the TP base image)
4. Count Ravenna Cosmography littoral locations that fall in the "missing" area (west of the surviving map)
5. Use those figures to estimate how many sheets are missing, and therefore where Rome sat on the complete map

The key finding: Rome is approximately central on the complete map, which has implications for the map's design and purpose.

## Data Sources (from `leifuss/ravenclaw`)

Copy or reference these files from the ravenclaw repo:

| File | Purpose | Notes |
|------|---------|-------|
| `rc_littoral.csv` | Ravenna Cosmography Book 5 littoral itinerary (14 coastal stages) | Primary data for the "missing section" count |
| `ravenclaw.csv` | Full RC database with TP-Online match flags | Needed to determine which RC littoral places also appear on the TP |
| `ku_tp_toponyms.geojson` | All Peutinger Map place names with coordinates | Use the full set, no filtering needed |
| `ku_tp_coastline.geojson` | Peutinger Map coastline geometry | For visual context |
| `littoral_sequence.geojson` | Spatial geometry for the littoral itinerary | For drawing the coastal circuit on the map |
| `original_size_wgs84.geojson` | Georeferenced Peutinger Map extent | Use this to position a TP base image overlay on the Leaflet map |

In addition, a **raster image of the Peutinger Map** is needed as a Leaflet image overlay so that students can see the parchment sheets and visually identify which sheet each toponym falls on. The full ravenclaw tool uses ArcGIS for this; for the Leaflet version, a JPEG or PNG of the TP can be positioned using `L.imageOverlay()` with bounds derived from `original_size_wgs84.geojson`. Check whether Rathmann's ArcGIS tile layer (https://www.arcgis.com/apps/mapviewer/index.html?webmap=6354474772a14968a5a201ad3926ee8f) can be consumed as a tile layer, or whether a static image export is needed. The TP image should be semi-transparent so the geographic base map shows through.

**Important**: Check the actual field names in these files. The `ravenclaw.csv` likely has columns indicating whether each place has a TP-Online match (the README describes green = both TP-Online and Pleiades, orange = TP-Online only, blue = Pleiades only, red = neither). The `rc_littoral.csv` has the 14-stage littoral circuit from Book 5.

## Interface Design

### Layout

A single-page Leaflet application with:

1. **Map panel** (main area): Geographic map showing the Mediterranean, with the TP image overlay and location markers
2. **Sidebar/panel** (right or bottom): Instructions, legend, and the RC littoral "missing" count

### Map Layers

All layers should be togglable via a layer control.

**Base map**: Use the DARE tiles (Digital Atlas of the Roman Empire) as in the existing cla3129 tools, or OpenStreetMap as fallback.

**Layer 1: Peutinger Map Image Overlay** (on by default, semi-transparent ~40-50% opacity)
- A georeferenced image of the Peutinger Map, positioned using `L.imageOverlay()` with bounds from `original_size_wgs84.geojson`.
- This is how students identify parchment sheets: they can see the sheet joins on the image itself. The 11 surviving sheets have visible boundaries on the physical map.
- Provide an opacity slider so students can fade the TP image in and out against the geographic base map.

**Layer 2: TP Toponyms** (on by default)
- Plot ALL Peutinger Map toponyms from `ku_tp_toponyms.geojson` as small circle markers.
- Single colour (e.g., dark red) is fine since sheet identification is done visually from the TP image overlay, not from marker colour.
- Popup on click: show toponym name and any other available metadata from the GeoJSON properties.

**Layer 3: Ravenna Cosmography Littoral Itinerary** (on by default)
- Plot the RC littoral places from `rc_littoral.csv`, connected in sequence.
- Use a different symbol (e.g., crosses or triangles vs. circles for TP).
- **Distinguish two categories visually**:
  - Places that also appear on the surviving Peutinger Map (matched): one style (e.g., filled)
  - Places that do NOT appear on the surviving TP (unmatched / "missing area" candidates): another style (e.g., hollow or highlighted)
- Use the 14-stage structure from Book 5 to label or colour the stages.
- Popup on click: show toponym name, stage number, whether it matches a TP location.

**Layer 4: Peutinger Map Coastline** (on by default, subtle)
- Draw the TP coastline geometry from `ku_tp_coastline.geojson` as a subtle background line to give spatial context.

### Sidebar: Information Panel

A simple panel showing:

1. **Brief instructions**: What the exercise is and what students should count.
2. **RC Littoral "Missing" Count**: The number of RC littoral places west of the surviving TP (i.e., in the missing section). This can be pre-computed and displayed since it's the same for everyone. Students need this number for their calculation.
3. **Legend**: Explaining the marker symbols (TP toponyms vs. RC littoral matched vs. RC littoral unmatched).

Do NOT pre-compute TP locations per sheet. Students count these themselves by looking at the TP image overlay, identifying the sheet boundaries, and counting the markers that fall within each sheet. This is the interpretive work: deciding where sheets begin and end, and how to handle locations near boundaries. Different groups may get slightly different counts, which is the point.

The tool provides the raw data; students do the counting and arithmetic on a paper worksheet.

### Interaction

- **Click** on any location for a popup with name, source (TP/RC/both), and any available metadata (littoral stage number for RC places).
- **Opacity slider** for the TP image overlay, so students can fade between the TP view and the geographic base map.
- **Layer toggles** for each layer.
- Keep it simple. No search, no hierarchical browsing, no sidebar directory. This is a counting tool, not an exploration platform.

## Technical Requirements

- **Framework**: Leaflet (consistent with the existing cla3129 tools: `antonine-itineraries/` and `web-viz/`). Do NOT use ArcGIS Maps SDK (that's the full ravenclaw tool).
- **Hosting**: Static HTML/JS/CSS, deployed via GitHub Pages at `leifuss.github.io/cla3129/ravenclaw-lite/` (or similar path within the cla3129 repo).
- **Data loading**: Load CSV and GeoJSON files directly (fetch from local paths). Keep all data files in the tool's directory or a `data/` subdirectory.
- **Dependencies**: Leaflet CDN. Optionally PapaParse for CSV parsing. Minimise dependencies.
- **Mobile**: Not required. This will be used on laptops in a seminar room.
- **Browser**: Modern browsers (Chrome, Firefox, Safari, Edge). No IE support needed.

## Styling

- Match the general aesthetic of the existing cla3129 tools (clean, functional, academic).
- The full ravenclaw tool uses a "classical Roman" theme (Cinzel/Crimson Text fonts, parchment colours). The lite version can be simpler but should feel like part of the same family. A muted parchment background for the sidebar would be enough.
- The most important visual distinction is between TP toponyms, RC littoral matched, and RC littoral unmatched. Use clearly differentiated symbols and colours for these three categories.

## What NOT to Build

This is explicitly a simplified interface. Do not replicate:
- The full ravenclaw dual-map (Peutinger + modern) synced view
- The hierarchical Book/Region/List/Place directory browser
- The place details sidebar panel
- The search functionality
- The Schnetz PDF links
- The multiple symbology modes
- The internal (non-coastal) itinerary data
- The Antonine Itinerary overlay
- The Roman provinces/dioceses boundaries

## File Structure

```
cla3129/
  ravenclaw-lite/
    index.html          # Single-page application
    style.css           # Styles (or inline)
    app.js              # Main application logic
    data/
      rc_littoral.csv           # From ravenclaw repo
      ravenclaw.csv             # From ravenclaw repo (for TP match flags)
      ku_tp_toponyms.geojson    # From ravenclaw repo (all TP toponyms)
      ku_tp_coastline.geojson   # From ravenclaw repo
      littoral_sequence.geojson # From ravenclaw repo
      original_size_wgs84.geojson # From ravenclaw repo (TP image bounds)
      tp_image.jpg              # Peutinger Map image for overlay (see notes)
    README.md           # Brief description and data attribution
```

## Data Preparation Notes

1. **TP Toponyms**: Use the full `ku_tp_toponyms.geojson` as-is. No filtering or subsetting needed.

2. **TP Base Image**: A raster image of the Peutinger Map is needed for the `L.imageOverlay()`. Options:
   - Check whether the ArcGIS tile service behind Rathmann's online TP viewer (https://www.arcgis.com/apps/mapviewer/index.html?webmap=6354474772a14968a5a201ad3926ee8f) can be consumed as an XYZ/WMTS tile layer in Leaflet. If so, that's the cleanest solution.
   - Otherwise, export or source a static image of the TP. The Wikimedia Commons high-resolution image of the Peutinger Map would work. Position it using bounds from `original_size_wgs84.geojson`.
   - The image needs to be large enough that parchment sheet boundaries are visible when zoomed in, but not so large that it kills load times. A JPEG at ~4000-6000px wide should be sufficient.

3. **Identifying the "missing" RC littoral locations**: These are RC Book 5 littoral places whose geographic position (from Pleiades coordinates in the data) falls west of the surviving TP's westernmost extent. The `ravenclaw.csv` should have a column indicating TP-Online match status. Cross-reference `rc_littoral.csv` against `ravenclaw.csv` to determine which littoral places have TP matches and which don't.

4. **Matching RC and TP names**: The ravenclaw project has already done this alignment work. The `ravenclaw.csv` database includes TP-Online match information. Use this existing alignment rather than attempting fuzzy name matching from scratch.

5. **Sheet identification**: Students identify sheets visually from the TP image overlay. There is no segment number field in the data that needs to be computed or assigned programmatically. The parchment sheet joins are visible on the TP image itself.

## Attribution

Include in the README and in a small footer/about section:
- Data from the RavenC:LAW project (Isaksen 2025)
- Peutinger Map digitisation: TP-Online, KU Eichstätt-Ingolstadt
- Place coordinates: Pleiades
- Base map: DARE

## Priority

This is needed for a seminar session. Functionality over polish. A working tool with correct counts is more valuable than a beautiful tool with incorrect data. Verify the counts manually against the full ravenclaw interface before deploying.
