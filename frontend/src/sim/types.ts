export type BuildingStatus = 'SAFE' | 'WARNING' | 'CRITICAL' | 'COLLAPSED'
export type TeamType = 'AFAD' | 'UMKE' | 'FIRE' | 'AMBULANCE'
export type TeamStatus = 'STANDBY' | 'EN_ROUTE' | 'ON_SCENE' | 'RETURNING'
export type Phase = 'IDLE' | 'PRE' | 'QUAKE' | 'AFTERMATH' | 'COMPLETE'
export type LogLevel = 'info' | 'warn' | 'critical' | 'success'
export type LinkType = 'CELLULAR' | 'LORA' | 'BEACON'

export interface Resident {
  name: string
  age: number
  condition: string
  medication: string
  equipment: string[]
}

export interface Building {
  id: string
  address: string
  district: string
  lat: number
  lng: number
  floors: number
  yearBuilt: number
  /** 0..1, higher means structurally weaker. */
  vulnerability: number
  siteFactor: number
  /** Cumulative structural damage, 0..1 (ground truth, not visible to the command center). */
  damage: number
  /** Ground-truth state. */
  physical: BuildingStatus
  /** State as reported to the command center (after link latency). */
  status: BuildingStatus
  tiltDeg: number
  sensorAccelG: number
  peakAccelG: number
  occupants: number
  trapped: number
  rescuedCount: number
  rescueProgress: number
  rescued: boolean
  link: LinkType
  residents: Resident[]
  equipment: string[]
  priority: number
  assigned: string[]
  reportedAt: number | null
  firstDispatchAt: number | null
  firstArrivalAt: number | null
  rescuedAt: number | null
}

export interface Team {
  id: string
  callsign: string
  type: TeamType
  status: TeamStatus
  lat: number
  lng: number
  baseLat: number
  baseLng: number
  targetId: string | null
  etaSec: number
  distanceM: number
  equipment: string[]
}

export interface LogEntry {
  id: number
  t: number
  level: LogLevel
  message: string
}

export interface Stats {
  collapsed: number
  critical: number
  warning: number
  trapped: number
  rescued: number
  teamsActive: number
  teamsTotal: number
  sensorsOnline: number
  sensorsBeacon: number
  sensorsTotal: number
  avgDispatchSec: number | null
  avgArrivalSec: number | null
  rescuedBuildings: number
}

export interface Scenario {
  id: string
  label: string
  magnitude: number
  peakG: number
  seed: number
  description: string
}

export interface SimSnapshot {
  scenario: Scenario
  phase: Phase
  t: number
  timeScale: number
  paused: boolean
  speed: number
  pga: number
  shaking: boolean
  aftershock: boolean
  gsmDown: boolean
  waveRadius: number
  buildings: Building[]
  teams: Team[]
  logs: LogEntry[]
  seismo: number[]
  stats: Stats
}
