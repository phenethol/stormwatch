export type Point = { lat: number; lon: number }
export type Layer = 'reports' | 'stations'
export type Layers = Record<Layer, boolean>
export type Selection = { kind: Layer; id: number }
