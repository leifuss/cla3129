# CLA3129 Globes - Ptolemy's Geography

This is a simplified version of the globe-project, displaying only Ptolemy's Geography in a vertical orientation (north at the top).

## Features

- Interactive 3D globe based on Ptolemy's *Geography* (2nd century CE)
- Vertical orientation with north at the top
- Ptolemaic climate zones (parallels)
- Notable settlements (*poleis episēmoi*)
- Star catalog visualization
- Celestial sphere with ecliptic

## Usage

To view the globe, simply open `index.html` in a modern web browser. The globe will load automatically.

### Controls

- **Rotate**: Click and drag on the globe
- **Zoom**: Scroll wheel
- **Toggle panel**: Click the ☰ button in the bottom left

### Data Sources

- Star data: Ptolemy's star catalog (*Almagest*)
- Settlements: Notable cities from Ptolemy's *Geography*
- Climate zones: Ptolemaic klimata (latitudinal zones)

## Files

- `index.html` - Main HTML file
- `globe_framework.js` - Core visualization framework
- `config_ptolemy.js` - Configuration for Ptolemy's geography
- `poleis_episemoi.geojson` - Settlement data

## Dependencies

This project uses:
- [Globe.GL](https://globe.gl/) - WebGL globe visualization
- [Three.js](https://threejs.org/) - 3D graphics library (loaded via Globe.GL)

## Notes

The globe is vertically oriented (north at top) to match conventional modern map orientation, unlike some historical presentations which placed south at the top or used other orientations.
