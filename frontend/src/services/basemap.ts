import type L from 'leaflet'
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl'

// Podloga karte: OpenFreeMap 
const styleUrl = 'https://tiles.openfreemap.org/styles/'

// Reljef: Mapzen Terrain Tiles na AWS-u. Autorstvo se mora navesti.
const terrainTiles = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
const terrainCredit = '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Reljef: Mapzen, AWS Terrain Tiles</a>'

type Paint = Record<string, unknown>
type Layer = LayerSpecification & { paint?: Paint; filter?: unknown; 'source-layer'?: string; minzoom?: number; maxzoom?: number }

// Boje 

const darkLand = '#354A49'
const darkSea = '#273A4C'

// Svijetla tema (stil Liberty)
const lightPaint: Record<string, Paint> = {
  background: { 'background-color': '#e4ead3' },
  park: { 'fill-color': '#d3e2c1' },
  landcover_wood: { 'fill-color': 'hsla(98, 34%, 66%, 0.55)' },
  landcover_grass: { 'fill-color': '#d5e0c2' },
  water: { 'fill-color': '#a9bfd3' },
  waterway_tunnel: { 'line-color': '#a9bfd3' },
  waterway_river: { 'line-color': '#a9bfd3' },
  waterway_other: { 'line-color': '#a9bfd3' },
  boundary_2: { 'line-color': 'rgba(101, 106, 99, 0.58)' },
  boundary_disputed: { 'line-color': 'rgba(101, 106, 99, 0.58)' },
}

// Svijetla tema
const lightRoadColors: Record<string, string> = {
  '#e9ac77': '#bfb8aa',
  'hsl(26,87%,62%)': '#d2c9b8',
  '#fc8': '#e8dfcf',
  '#ffdaa6': '#e8dfcf',
  '#fea': '#f1ece2',
  '#fff4c6': '#f1ece2',
}

// Tamna tema (stil Fiord
const darkPaint: Record<string, Paint> = {
  background: { 'background-color': darkLand },
  water: { 'fill-color': darkSea },
  waterway: { 'line-color': '#2d4459' },
  landcover_ice_shelf: { 'fill-color': '#4a6263' },
  landuse_residential: { 'fill-color': 'rgba(74, 96, 94, 0.45)' },
  landcover_wood: { 'fill-color': 'rgba(43, 70, 60, 0.62)', 'fill-opacity': 1 },
  park: { 'fill-color': 'rgba(48, 78, 64, 0.5)' },
  park_outline: { 'line-color': 'rgba(70, 104, 86, 0.5)' },
  building: { 'fill-color': 'rgba(33, 48, 49, 0.7)' },
  road_area_pier: { 'fill-color': darkLand },
  road_pier: { 'line-color': darkLand },
  highway_major_casing: { 'line-color': '#616761' },
  highway_major_inner: { 'line-color': '#515952' },
  highway_major_subtle: { 'line-color': '#565d56' },
  highway_motorway_casing: { 'line-color': '#606762' },
  highway_motorway_inner: { 'line-color': '#525a55' },
  highway_motorway_subtle: { 'line-color': 'rgba(166, 162, 150, 0.24)' },
  boundary_state: { 'line-color': 'rgba(188, 208, 200, 0.3)' },
  'boundary_country_z0-4': { 'line-color': 'rgba(206, 220, 214, 0.48)' },
  'boundary_country_z5-': { 'line-color': 'rgba(206, 220, 214, 0.48)' },
  water_name: { 'text-color': '#86a0b6', 'text-halo-color': 'rgba(27, 42, 57, 0.8)' },
  highway_name_other: { 'text-color': '#a9bcb7', 'text-halo-color': 'rgba(34, 49, 48, 0.85)' },
  highway_ref: { 'text-color': '#c3d3ce', 'text-halo-color': 'rgba(34, 49, 48, 0.85)' },
  place_other: { 'text-color': '#b3c5c0' },
  place_suburb: { 'text-color': '#a3b7b2' },
  place_village: { 'text-color': '#b5c7c2' },
  place_town: { 'text-color': '#dbe6e2' },
  place_city: { 'text-color': '#e8f0ed' },
  place_city_large: { 'text-color': '#f1f6f4' },
  place_state: { 'text-color': '#93a8a3' },
}

function reliefPaint(dark: boolean): Paint {
  if (dark) {
    return { 'hillshade-exaggeration': 0.85, 'hillshade-shadow-color': '#131d22', 'hillshade-highlight-color': 'rgba(170, 204, 188, 0.42)', 'hillshade-accent-color': '#1b282a' }
  }
  return { 'hillshade-exaggeration': 0.9, 'hillshade-shadow-color': '#3f5137', 'hillshade-highlight-color': '#fbfdf3', 'hillshade-accent-color': '#62744f' }
}

// Tamna tema
function muted(color: string) {
  const hsl = /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(color)
  if (hsl) {
    const lightness = Math.min(62, Number(hsl[3]) + 9)
    return `hsla(172, 12%, ${lightness}%, ${hsl[4] ?? 1})`
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(color)
  if (!hex) return color
  const r = parseInt(hex[1].slice(0, 2), 16) / 255
  const g = parseInt(hex[1].slice(2, 4), 16) / 255
  const b = parseInt(hex[1].slice(4, 6), 16) / 255
  const lightness = Math.round(Math.min(62, (Math.max(r, g, b) + Math.min(r, g, b)) * 50 + 9))
  return `hsla(172, 12%, ${lightness}%, 1)`
}

function recolor(value: unknown, change: (color: string) => string): unknown {
  if (typeof value === 'string') return change(value)
  if (Array.isArray(value)) return value.map(part => recolor(part, change))
  return value
}


function restyleLayer(layer: Layer, dark: boolean): Layer {
  const palette = dark ? darkPaint : lightPaint
  const paint: Paint = { ...layer.paint }
  const next = { ...layer, paint } as Layer
  const sourceLayer = layer['source-layer']

  if (dark && (sourceLayer === 'transportation' || sourceLayer === 'aeroway') && !palette[layer.id]) {
    if (paint['line-color'] !== undefined) paint['line-color'] = recolor(paint['line-color'], muted)
    if (paint['fill-color'] !== undefined) paint['fill-color'] = recolor(paint['fill-color'], muted)
  }

  if (!dark && layer.type === 'line' && sourceLayer === 'transportation' && paint['line-color'] !== undefined) {
    paint['line-color'] = recolor(paint['line-color'], color => lightRoadColors[color] ?? color)
  }

  // Nazivi država na hrvatskom kad ih karta ima
  if (next.type === 'symbol' && sourceLayer === 'place' && /^(label|place)_country_/.test(layer.id)) {
    const name = next.layout?.['text-field']
    if (Array.isArray(name)) next.layout = { ...next.layout, 'text-field': ['coalesce', ['get', 'name:hr'], name] }
    if (dark) paint['text-color'] = '#b9c5c1'
  }

  if (dark && layer.type === 'symbol' && layer.id.startsWith('place_')) {
    paint['text-halo-color'] = 'rgba(29, 42, 42, 0.82)'
    paint['text-halo-width'] = 1.3
  }

  Object.assign(paint, palette[layer.id])

  if (dark && layer.id === 'landcover_wood') delete next.minzoom

  if (sourceLayer === 'boundary' && !JSON.stringify(layer.filter ?? '').includes('maritime')) {
    const onLand = ['!=', ['get', 'maritime'], 1]
    next.filter = (layer.filter ? ['all', layer.filter, onLand] : onLand) as Layer['filter']
  }

  return next
}

function addRelief(layers: Layer[], dark: boolean): Layer[] {
  const relief = { id: 'relief', type: 'hillshade', source: 'terrain', paint: reliefPaint(dark) } as unknown as Layer
  const water = layers.find(layer => layer.id === 'water')
  const firstWaterway = layers.findIndex(layer => layer['source-layer'] === 'waterway')

  if (water && firstWaterway >= 0 && layers.indexOf(water) < firstWaterway) {
    const result = layers.filter(layer => layer !== water)
    const index = result.findIndex(layer => layer['source-layer'] === 'waterway')
    result.splice(index, 0, relief, water)
    return result
  }

  const result = [...layers]
  result.splice(firstWaterway >= 0 ? firstWaterway : 1, 0, relief)
  return result
}

export function basemapStyle(source: StyleSpecification, dark: boolean): StyleSpecification {
  const kept = (source.layers as Layer[]).filter(layer => !layer.id.startsWith('poi_') && layer.id !== 'building-3d')
  const layers = addRelief(kept.map(layer => restyleLayer(layer, dark)), dark)

  return {
    ...source,
    sources: {
      ...source.sources,
      terrain: { type: 'raster-dem', tiles: [terrainTiles], encoding: 'terrarium', tileSize: 256, maxzoom: 13, attribution: terrainCredit },
    },
    layers: layers as LayerSpecification[],
  }
}


// Stil se preuzima samo jednom po temi; kod greške se briše da se idući put pokuša ponovno
const styleCache = new Map<boolean, Promise<StyleSpecification>>()

function loadStyle(dark: boolean) {
  const cached = styleCache.get(dark)
  if (cached) return cached

  const loading = fetch(styleUrl + (dark ? 'fiord' : 'liberty'))
    .then(response => {
      if (!response.ok) throw new Error('Stil podloge nije dostupan.')
      return response.json() as Promise<StyleSpecification>
    })
    .then(style => basemapStyle(style, dark))
  loading.catch(() => styleCache.delete(dark))
  styleCache.set(dark, loading)
  return loading
}

// Učitava MapLibre (samo kad zatreba) i vraća podlogu kao običan Leaflet sloj
export async function openFreeMapLayer(leaflet: typeof L, dark: boolean): Promise<L.MaplibreGL> {
  const [style, { setWorkerUrl }, { default: workerUrl }] = await Promise.all([
    loadStyle(dark),
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    import('maplibre-gl/dist/maplibre-gl.css'),
    import('@maplibre/maplibre-gl-leaflet'),
  ])
  // MapLibre 6 treba adresu svog workera da bi crtao kartu i nazive
  setWorkerUrl(workerUrl)
  return leaflet.maplibreGL({ style, interactive: false, zoomLevelsToOverscale: undefined })
}
