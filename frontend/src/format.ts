import type { Building, BuildingStatus, LinkType, Phase, TeamStatus, TeamType } from './sim/types'

export const STATUS_LABEL: Record<BuildingStatus, string> = {
  SAFE: 'Güvenli',
  WARNING: 'İzlemede',
  CRITICAL: 'Kritik',
  COLLAPSED: 'Yıkıldı',
}

export const STATUS_COLOR: Record<BuildingStatus, string> = {
  SAFE: '#22c55e',
  WARNING: '#f59e0b',
  CRITICAL: '#f97316',
  COLLAPSED: '#ef4444',
}

export const TEAM_STATUS_LABEL: Record<TeamStatus, string> = {
  STANDBY: 'Hazırda',
  EN_ROUTE: 'Yolda',
  ON_SCENE: 'Müdahalede',
  RETURNING: 'Dönüşte',
}

export const TEAM_COLOR: Record<TeamType, string> = {
  AFAD: '#f59e0b',
  UMKE: '#a78bfa',
  FIRE: '#f87171',
  AMBULANCE: '#22d3ee',
}

export const TEAM_GLYPH: Record<TeamType, string> = {
  AFAD: 'A',
  UMKE: 'U',
  FIRE: 'İ',
  AMBULANCE: '+',
}

export const LINK_LABEL: Record<LinkType, string> = {
  CELLULAR: 'GSM',
  LORA: 'LoRa mesh',
  BEACON: 'BLE beacon',
}

export const PHASE_LABEL: Record<Phase, string> = {
  IDLE: 'Beklemede',
  PRE: 'Normal izleme',
  QUAKE: 'Deprem',
  AFTERMATH: 'Arama kurtarma',
  COMPLETE: 'Tamamlandı',
}

export function formatClock(t: number): string {
  const s = Math.floor(t)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `T+${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export function recommendedEquipment(b: Building): string[] {
  const set = new Set<string>()
  for (const r of b.residents) for (const e of r.equipment) set.add(e)
  if (b.status === 'COLLAPSED') {
    set.add('Ezilme sendromu (crush) seti')
    set.add('Turnike')
  }
  return Array.from(set)
}

export function isAtRisk(b: Building): boolean {
  return b.status === 'CRITICAL' || b.status === 'WARNING'
}
