import type { Building, BuildingStatus, LogEntry, LogLevel, Phase, Scenario, SimSnapshot, Stats, Team } from './types'
import { EPICENTER, SCENARIOS, generateBuildings, generateTeams, isSarTeam, mulberry32 } from './data'

// Timeline (scenario seconds)
const T_PWAVE = 3
const T_QUAKE_START = 6
const T_QUAKE_RISE = 16
const T_QUAKE_END = 44
const T_GSM_DOWN = 12
const T_AFTER_START = 360
const T_AFTER_RISE = 3
const T_AFTER_END = 376
const AFTERSHOCK_RATIO = 0.55

/** After the main shock the clock is compressed so the rescue phase fits into a demo. */
const AFTERMATH_TIME_SCALE = 16
const TEAM_SPEED_MS = 11
const SEISMO_LEN = 300
const SAMPLE_INTERVAL = 0.025
const MAX_LOGS = 150
/** Time the system needs to validate a report and compute assignments (scenario seconds). */
const DISPATCH_DELAY = 3

const STATUS_RANK: Record<BuildingStatus, number> = { SAFE: 0, WARNING: 1, CRITICAL: 2, COLLAPSED: 3 }

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m} dk ${String(r).padStart(2, '0')} sn` : `${r} sn`
}

function envelope(t: number, start: number, rise: number, end: number): number {
  if (t < start || t >= end) return 0
  const x = t - start
  if (x < rise) {
    const s = x / rise
    return s * s * (3 - 2 * s)
  }
  const tau = (end - start - rise) / 3
  return Math.exp(-(x - rise) / tau)
}

function distM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * 111320
  const dLng = (lng2 - lng1) * 111320 * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180)
  return Math.hypot(dLat, dLng)
}

interface PendingReport {
  id: string
  status: BuildingStatus
  at: number
}

interface Flags {
  pwave: boolean
  quake: boolean
  magnitude: boolean
  gsm: boolean
  quakeEnd: boolean
  afterWarn: boolean
  afterStart: boolean
  afterEnd: boolean
}

function freshFlags(): Flags {
  return { pwave: false, quake: false, magnitude: false, gsm: false, quakeEnd: false, afterWarn: false, afterStart: false, afterEnd: false }
}

export class Simulation {
  private scenario: Scenario = SCENARIOS[1]
  private phase: Phase = 'IDLE'
  private t = 0
  private paused = false
  private speed = 1
  private rng: () => number = mulberry32(1)
  private buildings: Building[] = []
  private teams: Team[] = []
  private logs: LogEntry[] = []
  private logId = 0
  private seismo: number[] = []
  private sampleAcc = 0
  private sampleN = 0
  private pga = 0
  private gsmDown = false
  private waveRadius = 0
  private pending: PendingReport[] = []
  private flags: Flags = freshFlags()
  private priorityAt = -10

  constructor(scenario: Scenario) {
    this.reset(scenario)
  }

  reset(scenario?: Scenario): void {
    if (scenario) this.scenario = scenario
    this.rng = mulberry32(this.scenario.seed * 7919)
    this.phase = 'IDLE'
    this.t = 0
    this.paused = false
    this.buildings = generateBuildings(this.scenario.seed)
    this.teams = generateTeams()
    this.logs = []
    this.logId = 0
    this.seismo = new Array(SEISMO_LEN).fill(0)
    this.sampleAcc = 0
    this.sampleN = 0
    this.pga = 0
    this.gsmDown = false
    this.waveRadius = 0
    this.pending = []
    this.flags = freshFlags()
    this.priorityAt = -10
  }

  start(): void {
    if (this.phase === 'COMPLETE') this.reset()
    if (this.phase !== 'IDLE') return
    this.phase = 'PRE'
    this.t = 0
    this.log('info', `Sistem aktif. ${this.buildings.length} bina sensörü çevrimiçi, ${this.teams.length} ekip hazırda.`)
  }

  setPaused(p: boolean): void {
    this.paused = p
  }

  setSpeed(s: number): void {
    this.speed = s
  }

  get isRunning(): boolean {
    return this.phase !== 'IDLE' && this.phase !== 'COMPLETE'
  }

  private log(level: LogLevel, message: string): void {
    this.logs.unshift({ id: ++this.logId, t: this.t, level, message })
    if (this.logs.length > MAX_LOGS) this.logs.pop()
  }

  private timeScale(): number {
    if (this.phase !== 'AFTERMATH') return 1
    const inAftershock = this.t >= T_AFTER_START - 10 && this.t < T_AFTER_END
    return inAftershock ? 1 : AFTERMATH_TIME_SCALE
  }

  step(realDt: number): void {
    if (!this.isRunning || this.paused) return
    const dtReal = Math.min(realDt, 0.1)

    this.sampleAcc += dtReal
    while (this.sampleAcc >= SAMPLE_INTERVAL) {
      this.sampleAcc -= SAMPLE_INTERVAL
      this.pushSample()
    }

    let remaining = dtReal * this.speed * this.timeScale()
    while (remaining > 1e-9 && this.isRunning) {
      const h = Math.min(0.5, remaining)
      this.advance(h)
      remaining -= h
    }
  }

  private pushSample(): void {
    this.sampleN++
    const n = this.sampleN
    let v = (this.rng() - 0.5) * 0.004
    if (this.pga > 0.004) {
      v += this.pga * (0.65 * Math.sin(n * 0.9) + 0.45 * Math.sin(n * 2.3 + 1) + (this.rng() - 0.5) * 0.8)
    } else if (this.t >= T_PWAVE && this.t < T_QUAKE_START) {
      v += 0.02 * Math.sin(n * 1.7) * ((this.t - T_PWAVE) / (T_QUAKE_START - T_PWAVE))
    }
    this.seismo.push(v)
    if (this.seismo.length > SEISMO_LEN) this.seismo.shift()
  }

  private advance(h: number): void {
    this.t += h
    this.updateEvents()
    this.updateGroundMotion(h)
    this.processReports()
    if (this.t - this.priorityAt >= 1) {
      this.priorityAt = this.t
      this.recalcPriority()
    }
    this.dispatch()
    this.moveTeams(h)
    this.updateRescue(h)
    this.checkComplete()
  }

  private updateEvents(): void {
    const f = this.flags
    const t = this.t
    if (!f.pwave && t >= T_PWAVE) {
      f.pwave = true
      this.log('warn', 'P dalgası algılandı. Erken uyarı yayınlandı.')
    }
    if (!f.quake && t >= T_QUAKE_START) {
      f.quake = true
      this.phase = 'QUAKE'
      this.log('critical', 'DEPREM BAŞLADI. S dalgası şehre ulaştı.')
    }
    if (!f.magnitude && t >= 8) {
      f.magnitude = true
      this.log('critical', `Büyüklük tahmini: Mw ${this.scenario.magnitude.toFixed(1)}. Merkez üssü: Marmara Denizi (varsayımsal).`)
    }
    if (!f.gsm && t >= T_GSM_DOWN) {
      f.gsm = true
      this.gsmDown = true
      for (const b of this.buildings) if (b.link === 'CELLULAR') b.link = 'LORA'
      this.log('warn', 'GSM şebekesi yanıt vermiyor. Cihazlar LoRa mesh hattına geçti.')
    }
    if (!f.quakeEnd && t >= T_QUAKE_END) {
      f.quakeEnd = true
      this.phase = 'AFTERMATH'
      this.log('info', `Ana sarsıntı sona erdi. Arama-kurtarma fazı. Zaman ×${AFTERMATH_TIME_SCALE} hızlandırıldı.`)
    }
    if (!f.afterWarn && t >= T_AFTER_START - 8) {
      f.afterWarn = true
      this.log('warn', 'Artçı sarsıntı için P dalgası algılandı.')
    }
    if (!f.afterStart && t >= T_AFTER_START) {
      f.afterStart = true
      this.log('critical', 'ARTÇI ŞOK. Hasarlı yapılar risk altında.')
    }
    if (!f.afterEnd && t >= T_AFTER_END) {
      f.afterEnd = true
      this.log('info', 'Artçı şok sona erdi.')
    }
  }

  private updateGroundMotion(h: number): void {
    const main = envelope(this.t, T_QUAKE_START, T_QUAKE_RISE, T_QUAKE_END)
    const after = AFTERSHOCK_RATIO * envelope(this.t, T_AFTER_START, T_AFTER_RISE, T_AFTER_END)
    this.pga = this.scenario.peakG * (main + after)

    const mainR = this.t >= T_QUAKE_START && this.t - T_QUAKE_START < 16 ? (this.t - T_QUAKE_START) * 650 : 0
    const afterR = this.t >= T_AFTER_START && this.t - T_AFTER_START < 16 ? (this.t - T_AFTER_START) * 650 : 0
    this.waveRadius = Math.max(mainR, afterR)

    for (const b of this.buildings) {
      if (b.physical === 'COLLAPSED') continue
      const d = distM(b.lat, b.lng, EPICENTER.lat, EPICENTER.lng)
      const local = this.pga * Math.exp(-d / 8000) * b.siteFactor
      b.sensorAccelG = local > 0.002 ? local * (0.85 + this.rng() * 0.3) : (this.rng() - 0.5) * 0.002
      if (local > b.peakAccelG) b.peakAccelG = local

      const threshold = 0.07 + (1 - b.vulnerability) * 0.3
      const excess = Math.max(0, local - threshold)
      if (excess > 0) {
        b.damage = Math.min(1, b.damage + excess * h * 1.0 * (1 + b.floors / 20))
      }
      b.tiltDeg = Math.pow(b.damage, 1.5) * 22 + (local > 0.02 ? (this.rng() - 0.5) * 0.6 : 0)

      const next: BuildingStatus = b.damage >= 1 ? 'COLLAPSED' : b.damage >= 0.55 ? 'CRITICAL' : b.damage >= 0.2 ? 'WARNING' : 'SAFE'
      if (STATUS_RANK[next] > STATUS_RANK[b.physical]) {
        b.physical = next
        if (next === 'COLLAPSED') this.onPhysicalCollapse(b)
        const latency = b.link === 'CELLULAR' ? 0.4 : 1.5 + this.rng() * 2
        this.pending.push({ id: b.id, status: next, at: this.t + latency })
      }
    }
  }

  private onPhysicalCollapse(b: Building): void {
    b.tiltDeg = 62 + this.rng() * 25
    b.trapped = Math.round(b.occupants * (0.3 + this.rng() * 0.35))
    const eq = new Set<string>(['Ezilme sendromu (crush) seti', 'Turnike'])
    for (const r of b.residents) for (const e of r.equipment) eq.add(e)
    b.equipment = Array.from(eq)
  }

  private processReports(): void {
    if (this.pending.length === 0) return
    const due = this.pending.filter((p) => p.at <= this.t).sort((a, b) => a.at - b.at)
    if (due.length === 0) return
    this.pending = this.pending.filter((p) => p.at > this.t)
    for (const p of due) {
      const b = this.buildings.find((x) => x.id === p.id)
      if (!b || STATUS_RANK[p.status] <= STATUS_RANK[b.status]) continue
      b.status = p.status
      if (p.status === 'COLLAPSED') {
        b.reportedAt = this.t
        b.link = 'BEACON'
        this.log('critical', `${b.id} ${b.address}: YIKILDI. ${b.floors} katlı, tahmini ${b.trapped} kişi enkaz altında. Beacon modu aktif.`)
      } else if (p.status === 'CRITICAL') {
        this.log('warn', `${b.id} ${b.address}: kritik eksen kayması (${b.tiltDeg.toFixed(1)}°).`)
      } else {
        this.log('warn', `${b.id} ${b.address}: ivme eşiği aşıldı (${b.peakAccelG.toFixed(2)} g).`)
      }
    }
  }

  private recalcPriority(): void {
    for (const b of this.buildings) {
      if (b.status !== 'COLLAPSED' || b.rescued) continue
      const risk = b.residents.filter((r) => r.condition !== 'Kronik hastalık yok').length
      const waited = b.reportedAt !== null ? (this.t - b.reportedAt) / 60 : 0
      b.priority = Math.round((b.trapped + risk * 8 + b.floors * 1.5 + waited) * 10) / 10
    }
  }

  private nearestIdle(b: Building, sar: boolean): Team | null {
    let best: Team | null = null
    let bestD = Infinity
    for (const tm of this.teams) {
      if (tm.status !== 'STANDBY' && tm.status !== 'RETURNING') continue
      if (isSarTeam(tm.type) !== sar) continue
      const d = distM(tm.lat, tm.lng, b.lat, b.lng)
      if (d < bestD) {
        bestD = d
        best = tm
      }
    }
    return best
  }

  private assign(tm: Team, b: Building): void {
    if (tm.targetId) {
      const prev = this.buildings.find((x) => x.id === tm.targetId)
      if (prev) prev.assigned = prev.assigned.filter((id) => id !== tm.id)
    }
    tm.status = 'EN_ROUTE'
    tm.targetId = b.id
    tm.distanceM = distM(tm.lat, tm.lng, b.lat, b.lng)
    tm.etaSec = tm.distanceM / TEAM_SPEED_MS
    tm.equipment = tm.type === 'AMBULANCE' ? b.equipment.slice() : []
    b.assigned.push(tm.id)
    if (b.firstDispatchAt === null) b.firstDispatchAt = this.t

    const eq = tm.type === 'AMBULANCE' && tm.equipment.length > 0 ? ` Ekipman: ${tm.equipment.slice(0, 4).join(', ')}.` : ''
    this.log('info', `${tm.callsign} → ${b.id} ${b.address}. Tahmini varış ${formatDuration(tm.etaSec)}.${eq}`)
  }

  private dispatch(): void {
    const incidents = this.buildings.filter((b) => b.status === 'COLLAPSED' && !b.rescued && b.reportedAt !== null && this.t - b.reportedAt >= DISPATCH_DELAY).sort((a, b) => b.priority - a.priority)
    if (incidents.length === 0) return

    const needSar = (b: Building) => (b.floors >= 10 ? 3 : b.floors >= 6 ? 2 : 1)
    const needAmb = (b: Building) => (b.trapped >= 30 ? 2 : 1)
    const count = (b: Building, sar: boolean) => this.teams.filter((t) => t.targetId === b.id && t.status !== 'RETURNING' && isSarTeam(t.type) === sar).length

    for (const pass of [1, 2]) {
      for (const b of incidents) {
        const wantSar = pass === 1 ? 1 : needSar(b)
        const wantAmb = pass === 1 ? 1 : needAmb(b)
        while (count(b, true) < wantSar) {
          const tm = this.nearestIdle(b, true)
          if (!tm) break
          this.assign(tm, b)
        }
        while (count(b, false) < wantAmb) {
          const tm = this.nearestIdle(b, false)
          if (!tm) break
          this.assign(tm, b)
        }
      }
    }
  }

  private moveTeams(h: number): void {
    const step = TEAM_SPEED_MS * h
    for (const tm of this.teams) {
      if (tm.status === 'EN_ROUTE' && tm.targetId) {
        const b = this.buildings.find((x) => x.id === tm.targetId)
        if (!b) continue
        const d = distM(tm.lat, tm.lng, b.lat, b.lng)
        if (d <= step) {
          tm.lat = b.lat
          tm.lng = b.lng
          tm.status = 'ON_SCENE'
          tm.etaSec = 0
          tm.distanceM = 0
          if (b.firstArrivalAt === null) b.firstArrivalAt = this.t
          this.log('success', `${tm.callsign} olay yerine ulaştı: ${b.id} ${b.address}.`)
        } else {
          const f = step / d
          tm.lat += (b.lat - tm.lat) * f
          tm.lng += (b.lng - tm.lng) * f
          tm.distanceM = d - step
          tm.etaSec = (d - step) / TEAM_SPEED_MS
        }
      } else if (tm.status === 'RETURNING') {
        const d = distM(tm.lat, tm.lng, tm.baseLat, tm.baseLng)
        if (d <= step) {
          tm.lat = tm.baseLat
          tm.lng = tm.baseLng
          tm.status = 'STANDBY'
          tm.distanceM = 0
          tm.etaSec = 0
        } else {
          const f = step / d
          tm.lat += (tm.baseLat - tm.lat) * f
          tm.lng += (tm.baseLng - tm.lng) * f
          tm.distanceM = d - step
          tm.etaSec = (d - step) / TEAM_SPEED_MS
        }
      }
    }
  }

  private updateRescue(h: number): void {
    for (const b of this.buildings) {
      if (b.status !== 'COLLAPSED' || b.rescued) continue
      const sarOn = this.teams.filter((t) => t.targetId === b.id && t.status === 'ON_SCENE' && isSarTeam(t.type)).length
      if (sarOn === 0) continue
      const duration = 420 + b.floors * 45
      b.rescueProgress = Math.min(100, b.rescueProgress + (100 * h * sarOn) / duration)
      b.rescuedCount = Math.round((b.trapped * b.rescueProgress) / 100)
      if (b.rescueProgress >= 100) {
        b.rescued = true
        b.rescuedAt = this.t
        b.rescuedCount = b.trapped
        for (const tm of this.teams) {
          if (tm.targetId === b.id) {
            tm.status = 'RETURNING'
            tm.targetId = null
            tm.equipment = []
          }
        }
        b.assigned = []
        this.log('success', `${b.id} ${b.address}: tahliye tamamlandı. Tahmini ${b.trapped} kişi kurtarıldı.`)
      }
    }
  }

  private checkComplete(): void {
    if (this.phase !== 'AFTERMATH' || !this.flags.afterEnd || this.pending.length > 0) return
    const open = this.buildings.some((b) => b.physical === 'COLLAPSED' && !b.rescued)
    if (open) return
    this.phase = 'COMPLETE'
    this.log('success', 'Operasyon tamamlandı. Tüm bildirilen enkazlarda tahliye bitti.')
  }

  private computeStats(): Stats {
    const bs = this.buildings
    const collapsed = bs.filter((b) => b.status === 'COLLAPSED')
    const avg = (vals: number[]) => (vals.length ? vals.reduce((a, c) => a + c, 0) / vals.length : null)
    const disp = collapsed.filter((b) => b.reportedAt !== null && b.firstDispatchAt !== null).map((b) => (b.firstDispatchAt as number) - (b.reportedAt as number))
    const arr = collapsed.filter((b) => b.reportedAt !== null && b.firstArrivalAt !== null).map((b) => (b.firstArrivalAt as number) - (b.reportedAt as number))
    return {
      collapsed: collapsed.length,
      critical: bs.filter((b) => b.status === 'CRITICAL').length,
      warning: bs.filter((b) => b.status === 'WARNING').length,
      trapped: collapsed.reduce((s, b) => s + (b.trapped - b.rescuedCount), 0),
      rescued: collapsed.reduce((s, b) => s + b.rescuedCount, 0),
      teamsActive: this.teams.filter((t) => t.status !== 'STANDBY').length,
      teamsTotal: this.teams.length,
      sensorsOnline: bs.length - collapsed.length,
      sensorsBeacon: collapsed.length,
      sensorsTotal: bs.length,
      avgDispatchSec: avg(disp),
      avgArrivalSec: avg(arr),
      rescuedBuildings: collapsed.filter((b) => b.rescued).length,
    }
  }

  snapshot(): SimSnapshot {
    return {
      scenario: this.scenario,
      phase: this.phase,
      t: this.t,
      timeScale: this.timeScale(),
      paused: this.paused,
      speed: this.speed,
      pga: this.pga,
      shaking: this.pga > 0.03,
      aftershock: this.t >= T_AFTER_START && this.t < T_AFTER_END,
      gsmDown: this.gsmDown,
      waveRadius: this.waveRadius,
      buildings: this.buildings.map((b) => ({ ...b, assigned: b.assigned.slice() })),
      teams: this.teams.map((t) => ({ ...t, equipment: t.equipment.slice() })),
      logs: this.logs.slice(),
      seismo: this.seismo.slice(),
      stats: this.computeStats(),
    }
  }
}
