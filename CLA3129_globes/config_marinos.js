// Configuration for Marinos of Tyre's Geography Globe
// Marinos: 180,000 stades circumference (0.714x Eratosthenes' 252,000)
export const config = {
  // Globe title and description
  title: "Marinos of Tyre's Geography - Interactive Globe",
  infoTitle: "Star Information",

  // Globe base texture
  globeTexture: './assets/textures/planets/paleblue.png',

  // Scene rotation (in degrees) - vertical orientation, no rotation
  sceneRotation: {
    x: 0,
    y: 0
  },

  // Scene scale - smaller Earth (180k vs 252k stades)
  sceneScale: 0.714,

  // Camera configuration - looking parallel to equator at Syene (23.83° N)
  camera: {
    positionX: 0,
    positionY: 90,
    positionZ: 250,
    zoom: 0.7
  },

  // Path and label altitudes
  altitudes: {
    paths: 0.004,
    labels: 0.003
  },

  // Parallels (latitude lines)
  parallels: [
    { lat: 0, color: 'blue', width: 2, name: 'equator' },
    { lat: 16.42, color: 'red', width: 2, name: '4th Clime (Meroe)' },
    { lat: 23.83, color: 'red', width: 2, name: '6th Clime (Syene)' },
    { lat: 36, color: 'red', width: 2, name: '10th Clime (Rhodes)' },
    { lat: 43.08, color: 'red', width: 2, name: '13th Clime(Byzantium)' },
    { lat: 48.5, color: 'red', width: 2, name: '15th Clime (Borysthenes)' },
    { lat: 54, color: 'red', width: 2, name: '17th Clime (Rhone/London)' },
    { lat: 58, color: 'red', width: 2, name: '19th Clime (Cataractonium)' },
    { lat: 63, color: 'red', width: 2, name: '21st Clime (Thule)' },
    { lat: -8.42, color: 'red', width: 1, name: 'Anti-2nd clime' },
    { lat: -16.42, color: 'red', width: 2, name: 'Anti-Meroe' }
  ],

  // Meridians (longitude lines)
  meridians: [
    { lng: 0, color: 'green', width: 2, name: '' },
    { lng: 180, color: 'green', width: 2, name: '' }
  ],

  // Map overlays (radius, phistart, philength, northern_lat, southern_lat, texture)
  // Marinos' map: 225 degrees longitude (1.25 in philength), 63°N to 24°S
  mapOverlays: [
    { radius: 100.2, phistart: 0, philength: 1.25, northLat: 63, southLat: 24,
      texture: "./assets/textures/planets/marinos_regions.png" }
  ]
};
