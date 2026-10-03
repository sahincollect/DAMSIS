import { Play, Radio, Signal, SignalZero, Siren } from 'lucide-react'
import { SCENARIOS } from '../sim/data'
import { formatDuration } from '../sim/engine'
import { PHASE_LABEL, STATUS_COLOR, TEAM_COLOR, TEAM_GLYPH, formatClock } from '../format'
import type { Scenario, SimSnapshot, TeamType } from '../sim/types'

export function Header({ snap }: { snap: SimSnapshot }) {
  const s = snap.stats
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">
          <Siren size={16} />
        </span>
        <div>
          <div className="brand-name">DAMSİS</div>
          <div className="brand-sub">Deprem Acil Müdahale Sistemi · Komuta Merkezi</div>
        </div>
      </div>

      <div className="topbar-right">
        <span className={`chip-status phase-${snap.phase.toLowerCase()}`}>{PHASE_LABEL[snap.phase]}</span>
        <span className="chip-status">
          <span className="ok-dot" />
          Sensör {s.sensorsOnline}/{s.sensorsTotal}
          {s.sensorsBeacon > 0 && <em> · {s.sensorsBeacon} beacon</em>}
        </span>
        <span className={`chip-status${snap.gsmDown ? ' bad' : ''}`}>
          {snap.gsmDown ? <SignalZero size={13} /> : <Signal size={13} />}
          GSM {snap.gsmDown ? 'kesik' : 'aktif'}
        </span>
        <span className={`chip-status${snap.gsmDown ? ' good' : ''}`}>
          <Radio size={13} />
          LoRa mesh {snap.gsmDown ? 'devrede' : 'yedek'}
        </span>
        <span className="clock mono">{formatClock(snap.t)}</span>
        {snap.phase === 'AFTERMATH' && snap.timeScale > 1 && <span className="chip-status warn">×{snap.timeScale} zaman</span>}
      </div>
    </header>
  )
}

export function AlertBanner({ snap }: { snap: SimSnapshot }) {
  let text: string | null = null
  let tone = 'warn'
  if (snap.phase === 'PRE' && snap.t >= 3) text = 'P DALGASI ALGILANDI · ERKEN UYARI'
  if (snap.phase === 'QUAKE') {
    text = `DEPREM · Mw ${snap.scenario.magnitude.toFixed(1)} · otomatik sevk aktif`
    tone = 'danger'
  }
  if (snap.aftershock) {
    text = 'ARTÇI ŞOK · hasarlı yapılar risk altında'
    tone = 'danger'
  }
  if (!text) return null
  return <div className={`banner ${tone}`}>{text}</div>
}

export function Legend() {
  const teams: [TeamType, string][] = [
    ['AFAD', 'AFAD'],
    ['UMKE', 'UMKE'],
    ['FIRE', 'İtfaiye'],
    ['AMBULANCE', 'Ambulans'],
  ]
  return (
    <div className="legend">
      <div className="legend-row">
        {(['SAFE', 'WARNING', 'CRITICAL', 'COLLAPSED'] as const).map((k) => (
          <span key={k}>
            <i className="dot" style={{ background: STATUS_COLOR[k] }} />
            {{ SAFE: 'Güvenli', WARNING: 'İzlemede', CRITICAL: 'Kritik', COLLAPSED: 'Yıkıldı' }[k]}
          </span>
        ))}
      </div>
      <div className="legend-row">
        {teams.map(([k, label]) => (
          <span key={k}>
            <i className="tm static sm" style={{ ['--c' as string]: TEAM_COLOR[k] }}>
              {TEAM_GLYPH[k]}
            </i>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

interface IdleProps {
  snap: SimSnapshot
  onStart: () => void
  onScenario: (s: Scenario) => void
}

export function IdleOverlay({ snap, onStart, onScenario }: IdleProps) {
  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-eyebrow">Etkileşimli simülasyon</div>
        <h1>Bir depremde DAMSİS nasıl çalışır?</h1>
        <p>
          Binaların taşıyıcı kolonlarına yerleştirilen ivmeölçerler, eksen kaymasını ve çökmeyi algılar. Bildirim, GSM çökse bile LoRa mesh üzerinden komuta merkezine ulaşır. Sistem
          yıkılan binaya en yakın uygun ekipleri otomatik atar ve ambulansa sakinlerin kayıtlı sağlık bilgilerine göre ekipman önerir.
        </p>
        <div className="steps">
          <div><b>1</b> Büyüklüğü seçin ve başlatın.</div>
          <div><b>2</b> Haritada binaların durumunu ve ekip hareketlerini izleyin.</div>
          <div><b>3</b> Bir binaya tıklayarak sakin profillerini ve atanan ekipleri görün.</div>
        </div>
        <div className="segmented stretch">
          {SCENARIOS.map((s) => (
            <button key={s.id} className={s.id === snap.scenario.id ? 'on' : ''} onClick={() => onScenario(s)}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="muted small">{snap.scenario.description}</p>
        <button className="btn primary lg" onClick={onStart}>
          <Play size={18} /> Simülasyonu başlat
        </button>
        <p className="disclaimer">Bina, sakin, ekip ve deprem verileri kurgusaldır. Bu bir model simülasyonudur; gerçek hasar tahmini değildir.</p>
      </div>
    </div>
  )
}

interface SummaryProps {
  snap: SimSnapshot
  onReplay: () => void
  onClose: () => void
}

export function SummaryOverlay({ snap, onReplay, onClose }: SummaryProps) {
  const s = snap.stats
  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-eyebrow">Operasyon özeti · {snap.scenario.label}</div>
        <h1>Simülasyon tamamlandı</h1>
        <dl className="summary">
          <div><dt>Yıkılan bina</dt><dd>{s.collapsed}</dd></div>
          <div><dt>Kurtarılan (tahmini)</dt><dd>{s.rescued}</dd></div>
          <div><dt>Ort. sevk süresi</dt><dd>{s.avgDispatchSec === null ? '—' : formatDuration(s.avgDispatchSec)}</dd></div>
          <div><dt>Ort. varış süresi</dt><dd>{s.avgArrivalSec === null ? '—' : formatDuration(s.avgArrivalSec)}</dd></div>
          <div><dt>Toplam operasyon</dt><dd>{formatDuration(snap.t)}</dd></div>
          <div><dt>Hasar görüp ayakta kalan</dt><dd>{s.critical + s.warning}</dd></div>
        </dl>
        {s.collapsed > 0 && s.avgDispatchSec !== null && s.avgDispatchSec > 60 && (
          <p className="note">Ortalama sevk süresi yüksek: yıkılan bina sayısı ekip kapasitesini aştı ve atamalar önceliğe göre sıraya alındı.</p>
        )}
        <p className="disclaimer">Süreler senaryo zamanıdır ve model varsayımlarına dayanır (ekip hızı 40 km/sa, düz hat rota). Gerçek ölçüm değildir.</p>
        <div className="row gap">
          <button className="btn primary grow" onClick={onReplay}>
            Yeniden oyna
          </button>
          <button className="btn" onClick={onClose}>
            Haritayı incele
          </button>
        </div>
      </div>
    </div>
  )
}
