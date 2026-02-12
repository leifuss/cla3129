// Globe Framework - Core functionality for historical globe visualizations
// Combines Ptolemy's star catalogue with historical maps

import * as THREE from '//unpkg.com/three/build/three.module.js';

export class GlobeFramework {
  constructor(containerId, config) {
    this.containerId = containerId;
    this.config = config;
    this.globe = null;
    this.sData = [];
    this.sunData = [];
    this.settlements = [];
    this.settlementLookup = new Map(); // Store full settlement data by name
    this.eclipticPoints = [];
    this.eclipticLine = null;
    this.gData = [];
    this.lData = [];
    this.sunLight = null;

    // High contrast zodiacal constellation colors
    this.ZODIAC_COLORS = {
      'Aries': 0xFF0000,       // Pure Red
      'Taurus': 0x00FFFF,      // Cyan
      'Gemini': 0x00FF80,      // Spring Green
      'Cancer': 0xFF00FF,      // Magenta
      'Leo': 0xFF8000,         // Orange
      'Virgo': 0x80FF00,       // Yellow-Green
      'Libra': 0xFF0080,       // Pink
      'Scorpius': 0x8000FF,    // Purple
      'Sagittarius': 0x0080FF, // Blue
      'Capricornus': 0x40E0D0, // Turquoise
      'Aquarius': 0x0000FF,    // Pure Blue
      'Pisces': 0xFF8080       // Light Red
    };

    this.GLOBE_RADIUS = 100;

    // Get celestial altitudes from config, or use defaults
    this.STAR_ALT = config.celestialAltitudes?.stars || 0.7;
    this.SUN_ALT = config.celestialAltitudes?.sun || 0.65;
    this.ECLIPTIC_ALT = config.celestialAltitudes?.ecliptic || 0.7;
  }

  // Function to convert ecliptic coordinates to equatorial
  eclipticToEquatorial(eclLon, eclLat) {
    const epsilon = 23.4392811 * Math.PI / 180;
    const lambda = eclLon * Math.PI / 180;
    const beta = eclLat * Math.PI / 180;

    const ra = Math.atan2(
      Math.sin(lambda) * Math.cos(epsilon) - Math.tan(beta) * Math.sin(epsilon),
      Math.cos(lambda)
    ) * 180 / Math.PI;

    const dec = Math.asin(
      Math.sin(beta) * Math.cos(epsilon) +
      Math.cos(beta) * Math.sin(epsilon) * Math.sin(lambda)
    ) * 180 / Math.PI;

    return { ra: ra < 0 ? ra + 360 : ra, dec };
  }

  // Create map overlay
  createMapOverlay(radius, phistart, philength, northern_lat, southern_lat, source_raster) {
    const widthsegs = 50;
    const heightsegs = 50;
    const phistartRad = phistart;
    const philengthRad = philength * Math.PI;
    const thetastart = Math.PI / 180 * (90 - northern_lat);
    const thetalength = Math.PI / 180 * (northern_lat + southern_lat);

    const geom = new THREE.SphereGeometry(radius, widthsegs, heightsegs, phistartRad, philengthRad, thetastart, thetalength);
    const texture = new THREE.TextureLoader().load(source_raster);
    const material = new THREE.MeshLambertMaterial(); // Changed to Lambert to respond to lighting
    material.map = texture;
    material.color.setRGB(1.0, 1.0, 1.0); // Normal color (no boost to avoid bleaching with lighting)
    texture.anisotropy = 16;
    return new THREE.Mesh(geom, material);
  }

  // Add parallel
  addParallel(lat, color, width, name) {
    this.gData.push({
      coords: [[lat, 0], [lat, 90], [lat, 180], [lat, 270], [lat, 360]],
      color: color,
      width: width
    });
    this.lData.push({
      lat: lat,
      lng: -90,
      text: name,
      size: 1,
      color: 'darkred',
      rotation: '0'
    });
  }

  // Add meridian
  addMeridian(lng, color, width, name) {
    const adjustedLng = lng - 90;
    this.gData.push({
      coords: [[-90, adjustedLng], [-45, adjustedLng], [0, adjustedLng], [45, adjustedLng], [90, adjustedLng]],
      color: color,
      width: width
    });
    this.lData.push({
      lat: 0,
      lng: adjustedLng,
      text: name,
      size: 1,
      color: 'darkred',
      rotation: '-90'
    });
  }

  // Populate map data from config
  async populateMapData() {
    // Add parallels
    this.config.parallels.forEach(p => {
      this.addParallel(p.lat, p.color, p.width, p.name);
    });

    // Add meridians
    this.config.meridians.forEach(m => {
      this.addMeridian(m.lng, m.color, m.width, m.name);
    });

    // Load and add GeoJSON data if specified
    if (this.config.geoJsonFiles) {
      for (const geoJsonFile of this.config.geoJsonFiles) {
        await this.loadGeoJson(geoJsonFile.path, geoJsonFile.color, geoJsonFile.width, geoJsonFile.filter);
      }
    }

    // Load and add CSV settlements data if specified
    if (this.config.csvFiles) {
      for (const csvFile of this.config.csvFiles) {
        await this.loadCSV(csvFile.path, csvFile.color, csvFile.radius, csvFile.altitude);
      }
    }

    // Load and add GeoJSON point data if specified
    if (this.config.geoJsonPointFiles) {
      for (const geoJsonFile of this.config.geoJsonPointFiles) {
        await this.loadGeoJsonPoints(geoJsonFile.path, geoJsonFile.color, geoJsonFile.radius, geoJsonFile.altitude);
      }
    }
  }

  // Parse a CSV line handling quoted fields and commas
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Push the last field
    result.push(current.trim());

    return result;
  }

  // Load GeoJSON file and add features as paths
  async loadGeoJson(path, color, width, filter) {
    try {
      const response = await fetch(path);
      const geoJson = await response.json();

      // Process each feature
      geoJson.features.forEach(feature => {
        // Apply filter if specified
        if (filter) {
          let matches = true;
          for (const [key, value] of Object.entries(filter)) {
            // Support both single values and arrays
            if (Array.isArray(value)) {
              if (!value.includes(feature.properties[key])) {
                matches = false;
                break;
              }
            } else {
              if (feature.properties[key] !== value) {
                matches = false;
                break;
              }
            }
          }
          if (!matches) return; // Skip this feature
        }

        if (feature.geometry.type === 'MultiLineString') {
          // Each MultiLineString contains multiple line strings
          feature.geometry.coordinates.forEach(lineString => {
            // Convert from [lng, lat] to [lat, lng] format and translate 90° west
            const coords = lineString.map(coord => [coord[1], coord[0] - 90]);
            this.gData.push({
              coords: coords,
              color: color,
              width: width
            });
          });
        } else if (feature.geometry.type === 'LineString') {
          // Single LineString
          const coords = feature.geometry.coordinates.map(coord => [coord[1], coord[0] - 90]);
          this.gData.push({
            coords: coords,
            color: color,
            width: width
          });
        } else if (feature.geometry.type === 'Polygon') {
          // Polygon - draw each ring (outer boundary and holes)
          // Note: Uses 0 for modern timezones (no translation), -90 for historical maps (west)
          const translate = path.includes('timezones') ? 0 : -90;
          feature.geometry.coordinates.forEach(ring => {
            const coords = ring.map(coord => [coord[1], coord[0] + translate]);
            this.gData.push({
              coords: coords,
              color: color,
              width: width
            });
          });
        } else if (feature.geometry.type === 'MultiPolygon') {
          // MultiPolygon - each polygon has multiple rings
          // Note: Uses 0 for modern timezones (no translation), -90 for historical maps (west)
          const translate = path.includes('timezones') ? 0 : -90;
          feature.geometry.coordinates.forEach(polygon => {
            polygon.forEach(ring => {
              const coords = ring.map(coord => [coord[1], coord[0] + translate]);
              this.gData.push({
                coords: coords,
                color: color,
                width: width
              });
            });
          });
        }
      });
    } catch (error) {
      console.error('Error loading GeoJSON:', error);
    }
  }

  // Load GeoJSON Point file and add as settlements
  async loadGeoJsonPoints(path, color, radius, altitude) {
    try {
      const response = await fetch(path);
      const geoJson = await response.json();

      // Convert color name to hex
      const colorHex = color === 'purple' ? 0x800080 :
                      color === 'black' ? 0x000000 :
                      parseInt(color.replace('#', ''), 16);

      // Process each feature
      geoJson.features.forEach(feature => {
        if (feature.geometry.type === 'Point') {
          const coords = feature.geometry.coordinates;
          const lng = coords[0] - 90; // Translate 90° west
          const lat = coords[1];

          const settlement = {
            lat: lat,
            lng: lng,
            alt: altitude,
            radius: radius,
            color: colorHex,
            name: feature.properties.a_name || feature.properties.m_name || 'Unknown',
            isSettlement: true
          };

          this.settlements.push(settlement);

          // Store in lookup if there's a name
          if (feature.properties.a_name) {
            // Remove asterisk from ancient name
            const cleanName = feature.properties.a_name.replace('*', '');

            // Parse ID to get book and chapter
            const id = feature.properties.id || '';
            const idParts = id.split('.');
            const book = idParts[0] || '';
            const chapter = idParts.length > 1 ? idParts[1] : '';

            const settlementData = {
              name: cleanName,
              modernName: feature.properties.m_name,
              category: feature.properties.cat,
              id: id,
              book: book,
              chapter: chapter,
              longDeg: Math.floor(coords[0]),
              longMin: Math.round((coords[0] % 1) * 60),
              latDeg: Math.floor(coords[1]),
              latMin: Math.round((coords[1] % 1) * 60),
              isPtolemy: true
            };
            this.settlementLookup.set(feature.properties.a_name, settlementData);
          }
        }
      });

      console.log(`Loaded ${this.settlements.length} GeoJSON settlements from ${path}`);
    } catch (error) {
      console.error('Error loading GeoJSON points:', error);
    }
  }

  // Load CSV file and add settlements as points
  async loadCSV(path, color, radius, altitude) {
    try {
      const response = await fetch(path);
      const text = await response.text();

      // Parse CSV properly
      const lines = text.trim().split('\n');

      // Parse header
      const headers = this.parseCSVLine(lines[0]);

      // Find column indices
      const longDegIdx = headers.indexOf('long_deg');
      const longMinIdx = headers.indexOf('long_min');
      const latDegIdx = headers.indexOf('lat_deg');
      const latMinIdx = headers.indexOf('lat_min');
      const nameIdx = headers.indexOf('name');
      const arabicIdx = headers.indexOf('arabic');
      const pageRefIdx = headers.indexOf('page_ref');
      const refNoIdx = headers.indexOf('ref_no');
      const remarksIdx = headers.indexOf('remarks');
      const sourceCIdx = headers.indexOf('source_c');

      // Track highlighted cities to avoid duplicates
      const highlightedCities = new Set();

      // Process each row (skip header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Parse CSV line properly
        const values = this.parseCSVLine(line);

        // Skip entries where source_c is not null (filter out duplicates/alternative sources)
        const sourceC = values[sourceCIdx];
        if (sourceC && sourceC.trim() !== '') continue;

        // Convert degrees and minutes to decimal degrees
        const longDeg = parseFloat(values[longDegIdx]);
        const longMin = parseFloat(values[longMinIdx]);
        const latDeg = parseFloat(values[latDegIdx]);
        const latMin = parseFloat(values[latMinIdx]);

        if (isNaN(longDeg) || isNaN(latDeg)) continue;

        // Calculate decimal degrees and translate 90° west
        const lng = longDeg + (longMin / 60) - 90;
        const lat = latDeg + (latMin / 60);

        // Check if this is a highlighted city (Baghdad or Marv)
        const cityName = values[nameIdx];
        const shouldHighlight = (cityName === 'BAGHDAD' || cityName === 'MARV') && !highlightedCities.has(cityName);

        // Mark as highlighted if this is the first occurrence
        if (shouldHighlight) {
          highlightedCities.add(cityName);
        }

        // Convert color name to hex, or use orange for highlighted cities
        let colorHex;
        if (shouldHighlight) {
          colorHex = 0xFFA500; // Orange
        } else {
          colorHex = color === 'purple' ? 0x800080 :
                    color === 'black' ? 0x000000 :
                    parseInt(color.replace('#', ''), 16);
        }

        // Use larger radius for highlighted cities
        const cityRadius = shouldHighlight ? radius * 2 : radius;

        const settlementData = {
          name: values[nameIdx],
          arabic: values[arabicIdx],
          pageRef: values[pageRefIdx],
          refNo: values[refNoIdx],
          remarks: values[remarksIdx],
          longDeg: longDeg,
          longMin: longMin,
          latDeg: latDeg,
          latMin: latMin,
          isHighlighted: shouldHighlight
        };

        const settlement = {
          lat: lat,
          lng: lng,
          alt: altitude,
          radius: cityRadius,
          color: colorHex,
          name: values[nameIdx],
          arabic: values[arabicIdx],
          pageRef: values[pageRefIdx],
          refNo: values[refNoIdx],
          remarks: values[remarksIdx],
          longDeg: longDeg,
          longMin: longMin,
          latDeg: latDeg,
          latMin: latMin,
          isSettlement: true,
          isHighlighted: shouldHighlight,
          settlementData: settlementData
        };

        this.settlements.push(settlement);

        // Store full data in lookup map
        this.settlementLookup.set(values[nameIdx], settlementData);

        // Add label for highlighted cities
        if (shouldHighlight) {
          this.lData.push({
            lat: lat,
            lng: lng,
            text: cityName,
            size: 1.5,
            color: 'orange',
            rotation: '0'
          });
        }
      }

      console.log(`Loaded ${this.settlements.length} settlements from ${path}`);
    } catch (error) {
      console.error('Error loading CSV:', error);
    }
  }

  // Add map overlays to scene
  addMapOverlays(scene) {
    // Apply scene rotation if configured
    if (this.config.sceneRotation.y !== 0) {
      scene.rotation.y = this.config.sceneRotation.y * Math.PI / 180;
    }
    if (this.config.sceneRotation.x !== 0) {
      scene.rotation.x = this.config.sceneRotation.x * Math.PI / 180;
    }
    if (this.config.sceneRotation.z !== undefined && this.config.sceneRotation.z !== 0) {
      scene.rotation.z = this.config.sceneRotation.z * Math.PI / 180;
    }

    // Apply scene scale if configured (for different Earth sizes)
    if (this.config.sceneScale !== undefined && this.config.sceneScale !== 1.0) {
      scene.scale.set(this.config.sceneScale, this.config.sceneScale, this.config.sceneScale);
    }

    // Add all map overlays
    this.config.mapOverlays.forEach(overlay => {
      scene.add(this.createMapOverlay(
        overlay.radius,
        overlay.phistart,
        overlay.philength,
        overlay.northLat,
        overlay.southLat,
        overlay.texture
      ));
    });
  }

  // Load star data
  async loadStarData() {
    const response = await fetch('./assets/ptolemy_enhanced.json');
    const allStars = await response.json();

    // Get scale factor to counter-scale celestial objects
    const sceneScale = this.config.sceneScale || 1.0;
    const celestialScaleFactor = 1.0 / sceneScale; // Counter-scale stars to maintain distance

    this.sData = allStars
      .filter(star => {
        let mag = parseFloat(star.magnitude);
        if (isNaN(mag)) {
          const match = star.magnitude.match(/^(\d+)/);
          if (match) mag = parseFloat(match[1]);
          else return false;
        }
        return mag < 5; // Keep magnitudes 1, 2, 3, 4
      })
      .map(star => {
        let mag = parseFloat(star.magnitude);
        if (isNaN(mag)) {
          const match = star.magnitude.match(/^(\d+)/);
          mag = match ? parseFloat(match[1]) : 3;
        }
        const radius = Math.max(0.8, 3.33 - (mag * 0.67));

        const color = this.ZODIAC_COLORS[star.constellation] !== undefined
          ? this.ZODIAC_COLORS[star.constellation]
          : 0xFFFFFF;

        return {
          lat: star.declination,
          lng: star.right_ascension,
          alt: this.STAR_ALT * celestialScaleFactor, // Counter-scale altitude
          radius: radius,
          color: color,
          starData: star
        };
      });

    // Add the Sun
    this.sunData = [{
      lat: 0,
      lng: 0,
      alt: this.SUN_ALT * celestialScaleFactor, // Counter-scale altitude
      radius: 6.0,
      color: 0xFFDD00,
      isSun: true
    }];

    console.log(`Loaded ${this.sData.length} bright stars from ${allStars.length} total stars`);
  }

  // Prepare ecliptic points
  prepareEcliptic() {
    // Get scale factor to counter-scale ecliptic altitude
    const sceneScale = this.config.sceneScale || 1.0;
    this.eclipticAltitude = this.ECLIPTIC_ALT * (1.0 / sceneScale);

    for (let eclLon = 0; eclLon < 360; eclLon += 5) {
      const equatorial = this.eclipticToEquatorial(eclLon, 0);
      this.eclipticPoints.push({ lat: equatorial.dec, lng: equatorial.ra });
    }
  }

  // Display star information in side panel
  displayStarInfo(starObj) {
    const infoDiv = document.getElementById('starInfo');

    // If no info panel exists (simplified version), do nothing
    if (!infoDiv) return;

    if (!starObj || !starObj.starData) {
      infoDiv.innerHTML = '<div class="no-selection">Hover over a star to see its details</div>';
      return;
    }

    const star = starObj.starData;
    const colorHex = typeof starObj.color === 'number'
      ? '#' + starObj.color.toString(16).padStart(6, '0')
      : starObj.color;

    infoDiv.innerHTML = `
      <div class="info-row">
        <div class="info-label">Constellation</div>
        <div class="info-value">
          <span class="constellation-badge" style="background-color: ${colorHex}; color: black;">
            ${star.constellation}
          </span>
        </div>
      </div>
      <div class="info-row">
        <div class="info-label">Star Number</div>
        <div class="info-value">${star.constellation_seq}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Right Ascension (RA)</div>
        <div class="info-value">${star.right_ascension.toFixed(2)}°</div>
      </div>
      <div class="info-row">
        <div class="info-label">Declination (Dec)</div>
        <div class="info-value">${star.declination.toFixed(2)}°</div>
      </div>
      <div class="info-row">
        <div class="info-label">Ecliptic Longitude</div>
        <div class="info-value">${star.longitude.toFixed(2)}°</div>
      </div>
      <div class="info-row">
        <div class="info-label">Ecliptic Latitude</div>
        <div class="info-value">${star.latitude.toFixed(2)}°</div>
      </div>
      <div class="info-row">
        <div class="info-label">Zodiac Sign</div>
        <div class="info-value">${star.zodiac_name}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Magnitude</div>
        <div class="info-value">${star.magnitude}</div>
      </div>
      ${star.description ? `<div class="star-description">${star.description}</div>` : ''}
    `;
  }

  // Display settlement information
  displaySettlementInfo(settlement) {
    // Get full settlement data from lookup
    const fullData = this.settlementLookup.get(settlement.name);

    if (!fullData) {
      return;
    }

    // Merge with clicked settlement object
    const settlementInfo = {
      ...settlement,
      ...fullData
    };

    // Create or get info overlay
    let infoDiv = document.getElementById('settlementInfo');
    if (!infoDiv) {
      infoDiv = document.createElement('div');
      infoDiv.id = 'settlementInfo';
      infoDiv.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background-color: rgba(26, 26, 26, 0.95);
        padding: 20px;
        border-radius: 8px;
        border: 1px solid #333;
        color: white;
        font-family: 'Courier New', monospace;
        max-width: 350px;
        z-index: 1000;
      `;
      document.body.appendChild(infoDiv);
    }

    const formatDegrees = (deg, min) => {
      return `${deg}° ${min}'`;
    };

    // Check if this is Ptolemy data or Khwarizmi data
    if (settlementInfo.isPtolemy) {
      // Ptolemy settlement display
      infoDiv.innerHTML = `
        <div style="margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;">
          <div style="font-size: 20px; color: #4fc3f7; margin-bottom: 5px;">
            ${settlementInfo.name}
          </div>
          ${settlementInfo.modernName ? `
            <div style="font-size: 14px; color: #aaa;">
              ${settlementInfo.modernName}
            </div>
          ` : ''}
        </div>
        ${settlementInfo.id ? `
          <div style="margin: 10px 0;">
            <div style="color: #888; font-size: 12px; text-transform: uppercase;">ID</div>
            <div style="color: #fff; font-size: 14px; margin-top: 2px;">${settlementInfo.id}</div>
          </div>
        ` : ''}
        ${settlementInfo.book ? `
          <div style="margin: 10px 0;">
            <div style="color: #888; font-size: 12px; text-transform: uppercase;">Book</div>
            <div style="color: #fff; font-size: 14px; margin-top: 2px;">${settlementInfo.book}</div>
          </div>
        ` : ''}
        ${settlementInfo.chapter ? `
          <div style="margin: 10px 0;">
            <div style="color: #888; font-size: 12px; text-transform: uppercase;">Chapter</div>
            <div style="color: #fff; font-size: 14px; margin-top: 2px;">${settlementInfo.chapter}</div>
          </div>
        ` : ''}
        <div style="margin: 10px 0;">
          <div style="color: #888; font-size: 12px; text-transform: uppercase;">Coordinates</div>
          <div style="color: #fff; font-size: 14px; margin-top: 2px;">
            Longitude: ${formatDegrees(settlementInfo.longDeg, settlementInfo.longMin)}<br>
            Latitude: ${formatDegrees(settlementInfo.latDeg, settlementInfo.latMin)}
          </div>
        </div>
        ${settlementInfo.category ? `
          <div style="margin: 10px 0;">
            <div style="color: #888; font-size: 12px; text-transform: uppercase;">Category</div>
            <div style="color: #fff; font-size: 14px; margin-top: 2px;">${settlementInfo.category}</div>
          </div>
        ` : ''}
        <button onclick="document.getElementById('settlementInfo').style.display='none'"
                style="margin-top: 10px; padding: 8px 16px; background-color: #4fc3f7;
                       color: black; border: none; border-radius: 4px; cursor: pointer;
                       font-family: 'Courier New', monospace;">
          Close
        </button>
      `;
    } else {
      // Khwarizmi settlement display
      infoDiv.innerHTML = `
        <div style="margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;">
          <div style="font-size: 24px; color: #4fc3f7; margin-bottom: 5px; direction: rtl; text-align: right;">
            ${settlementInfo.arabic || 'N/A'}
          </div>
          <div style="font-size: 16px; color: #fff;">
            ${settlement.name}
          </div>
        </div>
        <div style="margin: 10px 0;">
          <div style="color: #888; font-size: 12px; text-transform: uppercase;">Page Reference</div>
          <div style="color: #fff; font-size: 14px; margin-top: 2px;">${settlementInfo.pageRef || 'N/A'}</div>
        </div>
        <div style="margin: 10px 0;">
          <div style="color: #888; font-size: 12px; text-transform: uppercase;">Reference Number</div>
          <div style="color: #fff; font-size: 14px; margin-top: 2px;">${settlementInfo.refNo || 'N/A'}</div>
        </div>
        <div style="margin: 10px 0;">
          <div style="color: #888; font-size: 12px; text-transform: uppercase;">Coordinates</div>
          <div style="color: #fff; font-size: 14px; margin-top: 2px;">
            Longitude: ${formatDegrees(settlementInfo.longDeg, settlementInfo.longMin)}<br>
            Latitude: ${formatDegrees(settlementInfo.latDeg, settlementInfo.latMin)}
          </div>
        </div>
        ${settlementInfo.remarks ? `
          <div style="margin: 10px 0;">
            <div style="color: #888; font-size: 12px; text-transform: uppercase;">Remarks</div>
            <div style="color: #fff; font-size: 14px; margin-top: 2px;">${settlementInfo.remarks}</div>
          </div>
        ` : ''}
      <button onclick="document.getElementById('settlementInfo').style.display='none'"
              style="margin-top: 10px; padding: 8px 16px; background-color: #4fc3f7;
                     color: black; border: none; border-radius: 4px; cursor: pointer;
                     font-family: 'Courier New', monospace;">
        Close
      </button>
    `;
    }

    infoDiv.style.display = 'block';
  }

  // Initialize globe
  async initGlobe() {
    // Load star data
    await this.loadStarData();

    // Populate map data
    await this.populateMapData();

    // Prepare ecliptic
    this.prepareEcliptic();

    // Initialize globe
    this.globe = Globe()(document.getElementById(this.containerId))
      .globeImageUrl(this.config.globeTexture || null)
      .pathsData(this.gData)
      .pathPoints('coords')
      .pathColor('color')
      .pathStroke('width')
      .pathPointAlt(this.config.altitudes.paths)
      .labelsData(this.lData)
      .labelText('text')
      .labelColor('color')
      .labelSize('size')
      .labelAltitude(this.config.altitudes.labels)
      .labelRotation('rotation')
      .customLayerData(this.sData.concat(this.sunData).concat(this.settlements))
      .customThreeObject(d => new THREE.Mesh(
        new THREE.SphereGeometry(d.radius),
        new THREE.MeshLambertMaterial({ color: d.color })
      ))
      .customThreeObjectUpdate((obj, d) => {
        Object.assign(obj.position, this.globe.getCoords(d.lat, d.lng, d.alt));
      })
      .onCustomLayerClick(obj => {
        if (obj && obj.isSettlement) {
          this.displaySettlementInfo(obj);
        }
      })
      .onCustomLayerHover(obj => {
        if (obj && obj.starData) {
          this.displayStarInfo(obj);
        }
      });

    // Add map overlays to the globe's scene
    this.addMapOverlays(this.globe.scene());

    // Change base globe material to respond to lighting
    this.globe.scene().traverse((obj) => {
      if (obj.isMesh && obj.geometry) {
        // Check if this is the base globe (BufferGeometry with MeshBasicMaterial)
        // This is the Globe.gl base globe, not our overlays (which are SphereGeometry)
        if (obj.geometry.type === 'BufferGeometry' && obj.material.type === 'MeshBasicMaterial') {
          const oldMaterial = obj.material;

          // If globeColor is specified, use it without texture. Otherwise use old material.
          if (this.config.globeColor !== undefined) {
            obj.material = new THREE.MeshLambertMaterial({
              color: new THREE.Color(this.config.globeColor)
            });
          } else {
            obj.material = new THREE.MeshLambertMaterial({
              map: oldMaterial.map,
              color: oldMaterial.color
            });
          }
        }
        // Also handle our SphereGeometry overlays - convert to Lambert for lighting
        else if (obj.geometry.type === 'SphereGeometry' && obj.geometry.parameters) {
          const oldMaterial = obj.material;
          obj.material = new THREE.MeshLambertMaterial({
            map: oldMaterial.map,
            color: oldMaterial.color
          });
        }
      }
    });

    // Add ecliptic as a custom THREE.js line
    const eclipticGeometry = new THREE.BufferGeometry();
    const eclipticPositions = [];

    this.eclipticPoints.forEach(point => {
      const coords = this.globe.getCoords(point.lat, point.lng, this.eclipticAltitude);
      eclipticPositions.push(coords.x, coords.y, coords.z);
    });

    eclipticGeometry.setAttribute('position', new THREE.Float32BufferAttribute(eclipticPositions, 3));
    const eclipticMaterial = new THREE.LineBasicMaterial({
      color: 0xFFFF00,
      linewidth: 2
    });
    this.eclipticLine = new THREE.LineLoop(eclipticGeometry, eclipticMaterial);
    this.globe.scene().add(this.eclipticLine);

    // Add polar axis as a brown line through the poles
    // Make it extend to the star altitude (much longer than before)
    const polarAxisGeometry = new THREE.BufferGeometry();
    const polarAxisAltitude = this.GLOBE_RADIUS * (1 + this.STAR_ALT);
    const northPole = new THREE.Vector3(0, polarAxisAltitude, 0);
    const southPole = new THREE.Vector3(0, -polarAxisAltitude, 0);
    polarAxisGeometry.setFromPoints([northPole, southPole]);

    // Use cylinder mesh for thickness since linewidth doesn't work in WebGL
    const axisLength = polarAxisAltitude * 2;
    const axisRadius = 0.3; // Thickness
    const cylinderGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const cylinderMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown
    this.polarAxisLine = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    this.globe.scene().add(this.polarAxisLine);

    // Add directional light from sun (illuminated side at 100%)
    this.sunLight = new THREE.DirectionalLight(0xffffff, 0.9);
    this.globe.scene().add(this.sunLight);

    // Add ambient light for base visibility (unilluminated side fairly dark)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    this.globe.scene().add(ambientLight);

    // Setup camera
    const camera = this.globe.camera();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (this.config.camera.positionX !== undefined) {
      camera.position.x = this.config.camera.positionX;
    }
    camera.position.z = this.config.camera.positionZ;
    camera.position.y = this.config.camera.positionY;
    camera.zoom = this.config.camera.zoom;

    // Start animation
    this.startAnimation();
  }

  // Animation loop
  startAnimation() {
    // Track sun's position
    let sunEclipticLon = 0;
    let sunEquatorial = this.eclipticToEquatorial(sunEclipticLon, 0);
    this.sunData[0].lat = sunEquatorial.dec;
    this.sunData[0].lng = sunEquatorial.ra;

    const allCelestialObjects = this.sData.concat(this.sunData).concat(this.settlements);
    const rotationMode = this.config.rotationMode || 'stars'; // Default to 'stars'

    const animate = () => {
      const numStars = this.sData.length;

      if (rotationMode === 'earth') {
        // Earth rotation mode: Earth rotates eastward, stars stay fixed

        // Rotate Earth (scene) eastward
        this.globe.scene().rotation.y += 0.05 * Math.PI / 180;

        // Counter-rotate stars westward to keep them stationary in space
        // (they rotate with the scene, so we need to counter that rotation)
        for (let i = 0; i < numStars; i++) {
          this.sData[i].lng -= 0.05;
          if (this.sData[i].lng < 0) this.sData[i].lng += 360;
        }

        // Counter-rotate ecliptic to keep it fixed with stars
        this.eclipticPoints.forEach(point => {
          point.lng -= 0.05;
          if (point.lng < 0) point.lng += 360;
        });

        // Update ecliptic line geometry
        const newEclipticPositions = [];
        this.eclipticPoints.forEach(point => {
          const coords = this.globe.getCoords(point.lat, point.lng, this.eclipticAltitude);
          newEclipticPositions.push(coords.x, coords.y, coords.z);
        });
        this.eclipticLine.geometry.setAttribute('position', new THREE.Float32BufferAttribute(newEclipticPositions, 3));

        // Sun moves eastward relative to stars (annual motion only)
        sunEclipticLon += 0.0167;
        if (sunEclipticLon >= 360) sunEclipticLon -= 360;

        // Update sun's declination based on ecliptic position
        const newEquatorial = this.eclipticToEquatorial(sunEclipticLon, 0);
        this.sunData[0].lat = newEquatorial.dec;

        // Sun's RA changes with annual motion and counter-rotation
        // Annual motion: +0.0167 (eastward along ecliptic)
        // Counter-rotation: -0.05 (to stay fixed with stars as scene rotates)
        this.sunData[0].lng += 0.0167;  // Annual eastward motion
        this.sunData[0].lng -= 0.05;    // Counter-rotation
        if (this.sunData[0].lng < 0) this.sunData[0].lng += 360;
        if (this.sunData[0].lng >= 360) this.sunData[0].lng -= 360;

      } else {
        // Stars rotation mode: Stars rotate westward, Earth stays fixed

        // Rotate stars westward
        for (let i = 0; i < numStars; i++) {
          this.sData[i].lng -= 0.05;
          if (this.sData[i].lng < 0) this.sData[i].lng += 360;
        }

        // Rotate ecliptic line westward with stars
        this.eclipticPoints.forEach(point => {
          point.lng -= 0.05;
          if (point.lng < 0) point.lng += 360;
        });

        // Update ecliptic line geometry
        const newEclipticPositions = [];
        this.eclipticPoints.forEach(point => {
          const coords = this.globe.getCoords(point.lat, point.lng, this.eclipticAltitude);
          newEclipticPositions.push(coords.x, coords.y, coords.z);
        });
        this.eclipticLine.geometry.setAttribute('position', new THREE.Float32BufferAttribute(newEclipticPositions, 3));

        // Sun rotates westward with stars (daily motion)
        this.sunData[0].lng -= 0.05;
        if (this.sunData[0].lng < 0) this.sunData[0].lng += 360;

        // Sun drifts slowly eastward through zodiac (annual motion)
        sunEclipticLon += 0.0167;
        if (sunEclipticLon >= 360) sunEclipticLon -= 360;

        // Update sun's declination based on its ecliptic position
        const newEquatorial = this.eclipticToEquatorial(sunEclipticLon, 0);
        this.sunData[0].lat = newEquatorial.dec;

        // Add the small eastward drift in RA from annual motion
        this.sunData[0].lng += 0.0167;
        if (this.sunData[0].lng >= 360) this.sunData[0].lng -= 360;
      }

      // Update sun light position to track the sun
      if (this.sunLight && this.sunData[0]) {
        const sunCoords = this.globe.getCoords(this.sunData[0].lat, this.sunData[0].lng, this.sunData[0].alt);
        this.sunLight.position.set(sunCoords.x, sunCoords.y, sunCoords.z);
      }

      // Update globe
      this.globe.customLayerData(allCelestialObjects);
      requestAnimationFrame(animate);
    };

    animate();
  }
}
