import type { Point } from '../types/map'

const dateTime = new Intl.DateTimeFormat('hr-HR', { timeZone: 'Europe/Zagreb', dateStyle: 'medium', timeStyle: 'short' })
const hoursMinutes = new Intl.DateTimeFormat('hr-HR', { timeZone: 'Europe/Zagreb', hour: '2-digit', minute: '2-digit' })
const numbers = new Intl.NumberFormat('hr-HR', { maximumFractionDigits: 1 })
export const formatDate = (value: string) => dateTime.format(new Date(value))
export const formatClock = (value: string) => hoursMinutes.format(new Date(value))
export const number = (value: number) => numbers.format(value)
export const coordinates = ({ lat, lon }: Point) => `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`
