import { Activity, Clock, HeartPulse, Pause, Play, RotateCcw, Timer, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { SCENARIOS } from '../sim/data'
import { formatClock } from '../format'
import { formatDuration } from '../sim/engine'
import type { LogEntry, Scenario, SimSnapshot } from '../sim/types'

interface ControlProps {
  snap: SimSnapshot
  onStart: () => void
  onReset: (s?: Scenario) => void
  onPause: (p: boolean) => void
  onSpeed: (s: number) => void
}

export function ControlPanel({ snap, onStart, onReset, onPause, onSpeed }: ControlProps) {
  const idle = snap.phase === 'IDLE'
  const done = snap.phase === 'COMPLETE'
  return (
    <section className="card">
      <div className="card-title">Senaryo</div>
      <div className="segmented" role="group" aria-label="Deprem büyüklüğü">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            className={s.id === snap.scenario.id ? 'on' : ''}
            disabled={!idle && !done}
            onClick={() => onReset(s)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="muted small">{snap.scenario.description}</p>

      <div className="row gap">
        {idle || done ? (
          <button className="btn primary grow" onClick={done ? () => onReset() : onStart}>
            {done ? <RotateCcw size={16} /> : <Play size={16} />}
            {done ? 'Yeniden başlat' : 'Simülasyonu başlat'}
          </button>
        ) : (
          <>
            <button className="btn grow" onClick={() => onPause(!snap.paused)}>
              {snap.paused ? <Play size={16} /> : <Pause size={16} />}
              {snap.paused ? 'Devam et' : 'Duraklat'}
            </button>
            <button className="btn" onClick={() => onReset()} aria-label="Sıfırla" title="Sıfırla">
              <RotateCcw size={16} />
            </button>
          </>
        )}
      </div>

      <div className="row gap center">
        <span className="muted small">Hız</span>
        <div className="segmented compact">
          {[1, 2, 4].map((s) => (
            <button key={s} className={snap.speed === s ? 'on' : ''} onClick={() => onSpeed(s)}>
              {s}×
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function Kpi({ label, value, sub, tone, icon }: { label: string; value: ReactNode; sub?: string; tone?: string; icon?: ReactNode }) {
  return (
    <div className={`kpi${tone ? ` kpi-${tone}` : ''}`}>
      <div className="kpi-label">
        {icon}
        {label}
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

export function KpiGrid({ snap }: { snap: SimSnapshot }) {
  const s = snap.stats
  return (
    <section className="kpi-grid">
      <Kpi label="Yıkılan bina" value={s.collapsed} sub={`${s.critical} kritik · ${s.warning} izlemede`} tone={s.collapsed ? 'danger' : undefined} />
      <Kpi label="Enkaz altında" value={s.trapped} sub="tahmini kişi" tone={s.trapped ? 'danger' : undefined} icon={<Users size={12} />} />
      <Kpi label="Kurtarılan" value={s.rescued} sub={`${s.rescuedBuildings}/${s.collapsed} enkaz`} tone={s.rescued ? 'ok' : undefined} icon={<HeartPulse size={12} />} />
      <Kpi label="Aktif ekip" value={`${s.teamsActive}/${s.teamsTotal}`} sub="sevk edilmiş" />
      <Kpi label="Ort. sevk süresi" value={s.avgDispatchSec === null ? '—' : formatDuration(s.avgDispatchSec)} sub="bildirimden atamaya" icon={<Timer size={12} />} />
      <Kpi label="Ort. varış süresi" value={s.avgArrivalSec === null ? '—' : formatDuration(s.avgArrivalSec)} sub="bildirimden varışa" icon={<Clock size={12} />} />
    </section>
  )
}

export function Seismograph({ snap }: { snap: SimSnapshot }) {
  const W = 320
  const H = 96
  const mid = H / 2
  const yMax = 0.5
  const n = snap.seismo.length
  const points = snap.seismo
    .map((v, i) => {
      const y = mid - Math.max(-1, Math.min(1, v / yMax)) * (mid - 4)
      return `${((i / (n - 1)) * W).toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const hot = snap.pga > 0.1
  return (
    <section className="card">
      <div className="card-title row between">
        <span className="row gap-s center">
          <Activity size={14} /> Sismograf
        </span>
        <span className={`mono${hot ? ' text-danger' : ''}`}>{snap.pga.toFixed(3)} g</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="seismo" preserveAspectRatio="none" role="img" aria-label="Canlı ivme grafiği">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="seismo-grid" />
        ))}
        <polyline points={points} className={`seismo-line${hot ? ' hot' : ''}`} />
      </svg>
      <div className="muted small">Referans sensör · ±{yMax} g ölçek</div>
    </section>
  )
}

export function EventLog({ logs }: { logs: LogEntry[] }) {
  return (
    <section className="card log-card">
      <div className="card-title">Olay günlüğü</div>
      <ul className="log">
        {logs.length === 0 && <li className="muted small">Henüz kayıt yok.</li>}
        {logs.map((l) => (
          <li key={l.id} className={`log-${l.level}`}>
            <span className="log-time mono">{formatClock(l.t)}</span>
            <span>{l.message}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
