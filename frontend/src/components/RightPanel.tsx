import { ChevronLeft, HeartPulse, Navigation, Package, Pill } from 'lucide-react'
import { useState } from 'react'
import { TEAM_LABEL } from '../sim/data'
import { formatDuration } from '../sim/engine'
import { LINK_LABEL, STATUS_COLOR, STATUS_LABEL, TEAM_COLOR, TEAM_GLYPH, TEAM_STATUS_LABEL, isAtRisk, recommendedEquipment } from '../format'
import type { Building, SimSnapshot, Team } from '../sim/types'

interface Props {
  snap: SimSnapshot
  selectedId: string | null
  onSelect: (id: string | null) => void
}

type Tab = 'incidents' | 'teams'

function TeamChip({ team }: { team: Team }) {
  return (
    <span className="chip" style={{ ['--c' as string]: TEAM_COLOR[team.type] }}>
      <i>{TEAM_GLYPH[team.type]}</i>
      {team.callsign}
    </span>
  )
}

function IncidentRow({ b, teams, onClick }: { b: Building; teams: Team[]; onClick: () => void }) {
  const assigned = teams.filter((t) => t.targetId === b.id)
  return (
    <li>
      <button className={`incident${b.rescued ? ' done' : ''}`} onClick={onClick}>
        <span className="dot" style={{ background: STATUS_COLOR[b.status] }} />
        <span className="incident-main">
          <span className="incident-title">
            <strong>{b.id}</strong> {b.address}
          </span>
          <span className="muted small">
            {b.floors} kat · {STATUS_LABEL[b.status]}
            {b.status === 'COLLAPSED' && ` · ${b.trapped - b.rescuedCount} kişi enkazda`}
          </span>
          {b.status === 'COLLAPSED' && (
            <span className="bar">
              <span style={{ width: `${b.rescueProgress}%` }} />
            </span>
          )}
          {assigned.length > 0 && (
            <span className="chips">
              {assigned.map((t) => (
                <TeamChip key={t.id} team={t} />
              ))}
            </span>
          )}
        </span>
        {b.status === 'COLLAPSED' && !b.rescued && <span className="prio mono">P{Math.round(b.priority)}</span>}
        {b.rescued && <span className="tag ok">Tahliye</span>}
      </button>
    </li>
  )
}

function IncidentDetail({ b, snap, onBack }: { b: Building; snap: SimSnapshot; onBack: () => void }) {
  const assigned = snap.teams.filter((t) => t.targetId === b.id)
  const equipment = recommendedEquipment(b)
  return (
    <div className="detail">
      <button className="back" onClick={onBack}>
        <ChevronLeft size={16} /> Listeye dön
      </button>
      <div className="detail-head">
        <span className="dot lg" style={{ background: STATUS_COLOR[b.status] }} />
        <div>
          <div className="detail-title">
            {b.id} · {STATUS_LABEL[b.status]}
          </div>
          <div className="muted small">{b.address}</div>
        </div>
      </div>

      <dl className="facts">
        <div><dt>Kat sayısı</dt><dd>{b.floors}</dd></div>
        <div><dt>Yapım yılı</dt><dd>{b.yearBuilt}</dd></div>
        <div><dt>Tahmini sakin</dt><dd>{b.occupants}</dd></div>
        <div><dt>Enkaz altında</dt><dd>{b.status === 'COLLAPSED' ? b.trapped - b.rescuedCount : '—'}</dd></div>
        <div><dt>Eksen eğimi</dt><dd className="mono">{b.tiltDeg.toFixed(1)}°</dd></div>
        <div><dt>Tepe ivme</dt><dd className="mono">{b.peakAccelG.toFixed(2)} g</dd></div>
        <div><dt>Bağlantı</dt><dd>{LINK_LABEL[b.link]}</dd></div>
        <div><dt>Öncelik</dt><dd className="mono">{b.status === 'COLLAPSED' ? b.priority.toFixed(1) : '—'}</dd></div>
      </dl>

      {b.status === 'COLLAPSED' && (
        <div className="block">
          <div className="block-title">Kurtarma ilerlemesi · %{Math.round(b.rescueProgress)}</div>
          <span className="bar lg">
            <span style={{ width: `${b.rescueProgress}%` }} />
          </span>
        </div>
      )}

      <div className="block">
        <div className="block-title">
          <Navigation size={13} /> Atanan ekipler
        </div>
        {assigned.length === 0 ? (
          <div className="muted small">{b.status === 'COLLAPSED' ? (b.rescued ? 'Tahliye tamamlandı.' : 'Uygun ekip bekleniyor.') : 'Atama yok.'}</div>
        ) : (
          <ul className="plain">
            {assigned.map((t) => (
              <li key={t.id} className="row between">
                <TeamChip team={t} />
                <span className="muted small">
                  {TEAM_STATUS_LABEL[t.status]}
                  {t.status === 'EN_ROUTE' && ` · ${formatDuration(t.etaSec)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="block">
        <div className="block-title">
          <HeartPulse size={13} /> Kayıtlı sakin profilleri
        </div>
        <ul className="plain">
          {b.residents.map((r, i) => (
            <li key={i} className="resident">
              <div className="row between">
                <strong>{r.name}</strong>
                <span className="muted small">{r.age} yaş</span>
              </div>
              <div className="small">{r.condition}</div>
              {r.medication !== '-' && (
                <div className="muted small row gap-s center">
                  <Pill size={11} /> {r.medication}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="block">
        <div className="block-title">
          <Package size={13} /> Ambulans için önerilen ekipman
        </div>
        {equipment.length === 0 ? (
          <div className="muted small">Özel ekipman gerekmiyor.</div>
        ) : (
          <div className="chips wrap">
            {equipment.map((e) => (
              <span key={e} className="tag">
                {e}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function RightPanel({ snap, selectedId, onSelect }: Props) {
  const [tab, setTab] = useState<Tab>('incidents')
  const [filter, setFilter] = useState<'collapsed' | 'risk'>('collapsed')

  const selected = selectedId ? snap.buildings.find((b) => b.id === selectedId) : null
  if (selected) {
    return (
      <aside className="panel right">
        <IncidentDetail b={selected} snap={snap} onBack={() => onSelect(null)} />
      </aside>
    )
  }

  const collapsed = snap.buildings
    .filter((b) => b.status === 'COLLAPSED')
    .sort((a, b) => Number(a.rescued) - Number(b.rescued) || b.priority - a.priority)
  const risk = snap.buildings
    .filter(isAtRisk)
    .sort((a, b) => Number(b.status === 'CRITICAL') - Number(a.status === 'CRITICAL') || b.tiltDeg - a.tiltDeg)
  const list = filter === 'collapsed' ? collapsed : risk

  const order = { EN_ROUTE: 0, ON_SCENE: 1, RETURNING: 2, STANDBY: 3 } as const
  const teams = snap.teams.slice().sort((a, b) => order[a.status] - order[b.status] || a.callsign.localeCompare(b.callsign))

  return (
    <aside className="panel right">
      <div className="tabs">
        <button className={tab === 'incidents' ? 'on' : ''} onClick={() => setTab('incidents')}>
          Olaylar
        </button>
        <button className={tab === 'teams' ? 'on' : ''} onClick={() => setTab('teams')}>
          Ekipler
        </button>
      </div>

      {tab === 'incidents' ? (
        <>
          <div className="segmented compact stretch">
            <button className={filter === 'collapsed' ? 'on' : ''} onClick={() => setFilter('collapsed')}>
              Yıkılan ({collapsed.length})
            </button>
            <button className={filter === 'risk' ? 'on' : ''} onClick={() => setFilter('risk')}>
              Riskli ({risk.length})
            </button>
          </div>
          <ul className="list">
            {list.length === 0 && (
              <li className="empty">{snap.phase === 'IDLE' ? 'Simülasyonu başlatın.' : filter === 'collapsed' ? 'Bildirilen yıkım yok.' : 'Riskli bina yok.'}</li>
            )}
            {list.map((b) => (
              <IncidentRow key={b.id} b={b} teams={snap.teams} onClick={() => onSelect(b.id)} />
            ))}
          </ul>
        </>
      ) : (
        <ul className="list">
          {teams.map((t) => (
            <li key={t.id} className="team-row">
              <span className="tm static" style={{ ['--c' as string]: TEAM_COLOR[t.type] }}>
                {TEAM_GLYPH[t.type]}
              </span>
              <span className="incident-main">
                <span className="incident-title">
                  <strong>{t.callsign}</strong> <span className="muted small">{TEAM_LABEL[t.type]}</span>
                </span>
                <span className="muted small">
                  {TEAM_STATUS_LABEL[t.status]}
                  {t.targetId && ` → ${t.targetId}`}
                  {t.status === 'EN_ROUTE' && ` · ${formatDuration(t.etaSec)}`}
                </span>
              </span>
              <span className={`status-dot ${t.status.toLowerCase()}`} />
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
