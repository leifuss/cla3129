// Configuration for Eratosthenes' Geography Globe
// Eratosthenes: 252,000 stades circumference (1.4x larger than Marinos/Ptolemy's 180,000)
export const config = {
  // Globe title and description
  title: "Eratosthenes' Geography - Interactive Globe",
  infoTitle: "Star Information",

  // Globe base texture
  globeTexture: './assets/textures/planets/paleblue.png',

  // Scene rotation (in degrees) - vertical orientation, no rotation
  sceneRotation: {
    x: 0,
    y: 0
  },

  // Camera configuration - pulled back 1.4x for larger globe (stars provide scale reference)
  camera: {
    positionX: 0,
    positionY: 90,
    positionZ: 350,
    zoom: 0.7
  },

  // Path and label altitudes
  altitudes: {
    paths: 0.004,
    labels: 0.003
  },

  // Parallels (latitude lines)
  parallels: [],

  // Meridians (longitude lines)
  meridians: [
    { lng: 0, color: 'green', width: 2, name: '' },
    { lng: 180, color: 'green', width: 2, name: '' }
  ],

  // Map overlays (radius, phistart, philength, northern_lat, southern_lat, texture)
  // Eratosthenes' map: 180 degrees longitude (1.0 in philength)
  // Equator through Taprobane (southern edge), Rhodes at 36°N
  // Extent: 70°N to 0° (equator)
  mapOverlays: [
    { radius: 100.2, phistart: 0, philength: 1.0, northLat: 66, southLat: 0,
      texture: "./assets/textures/planets/Eratosthenes.png" }
  ]
};
