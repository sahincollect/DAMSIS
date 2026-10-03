import { useEffect } from 'react'
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { divIcon, type DivIcon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { EPICENTER, MAP_CENTER } from '../sim/data'
import { TEAM_COLOR, TEAM_GLYPH, STATUS_LABEL, TEAM_STATUS_LABEL } from '../format'
import type { BuildingStatus, SimSnapshot, TeamStatus, TeamType } from '../sim/types'

export interface FocusTarget {
  lat: number
  lng: number
  nonce: number
}

interface Props {
  snap: SimSnapshot
  selectedId: string | null
  onSelect: (id: string) => void
  focus: FocusTarget | null
}

const iconCache = new Map<string, DivIcon>()

function buildingIcon(status: BuildingStatus, selected: boolean): DivIcon {
  const key = `b:${status}:${selected}`
  let icon = iconCache.get(key)
  if (!icon) {
    icon = divIcon({
      className: 'marker-reset',
      html: `<div class="bm bm-${status.toLowerCase()}${selected ? ' bm-selected' : ''}"><span class="bm-ring"></span><span class="bm-core"></span></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    })
    iconCache.set(key, icon)
  }
  return icon
}

function teamIcon(type: TeamType, status: TeamStatus): DivIcon {
  const key = `t:${type}:${status}`
  let icon = iconCache.get(key)
  if (!icon) {
    icon = divIcon({
      className: 'marker-reset',
      html: `<div class="tm tm-${status.toLowerCase()}" style="--c:${TEAM_COLOR[type]}">${TEAM_GLYPH[type]}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })
    iconCache.set(key, icon)
  }
  return icon
}

const epicenterIcon = divIcon({
  className: 'marker-reset',
  html: '<div class="epi"><span></span><span></span></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

function FocusController({ focus }: { focus: FocusTarget | null }) {
  const map = useMap()
  useEffect(() => {
    if (!focus) return
    map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 15.5), { duration: 0.7 })
  }, [focus, map])
  return null
}

export function MapView({ snap, selectedId, onSelect, focus }: Props) {
  const amp = Math.min(7, snap.pga * 16)
  const shaking = snap.shaking && !snap.paused
  const buildingById = new Map(snap.buildings.map((b) => [b.id, b]))

  return (
    <div className="map-shell" style={{ ['--amp' as string]: `${amp.toFixed(2)}px` }}>
      <MapContainer
        center={MAP_CENTER}
        zoom={14}
        zoomSnap={0.5}
        className={`map-dark${shaking ? ' map-shaking' : ''}`}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <FocusController focus={focus} />

        {snap.waveRadius > 0 && (
          <>
            <Circle
              center={[EPICENTER.lat, EPICENTER.lng]}
              radius={snap.waveRadius}
              pathOptions={{ color: '#ef4444', weight: 2, opacity: Math.max(0.1, 1 - snap.waveRadius / 11000), fillColor: '#ef4444', fillOpacity: 0.05 }}
            />
            <Circle
              center={[EPICENTER.lat, EPICENTER.lng]}
              radius={snap.waveRadius * 0.6}
              pathOptions={{ color: '#f97316', weight: 1, opacity: Math.max(0.05, 0.7 - snap.waveRadius / 11000), fill: false }}
            />
          </>
        )}
        {snap.phase !== 'IDLE' && <Marker position={[EPICENTER.lat, EPICENTER.lng]} icon={epicenterIcon} interactive={false} />}

        {snap.teams.map((tm) => {
          if (tm.status !== 'EN_ROUTE' || !tm.targetId) return null
          const b = buildingById.get(tm.targetId)
          if (!b) return null
          return (
            <Polyline
              key={`r-${tm.id}`}
              positions={[
                [tm.lat, tm.lng],
                [b.lat, b.lng],
              ]}
              pathOptions={{ color: TEAM_COLOR[tm.type], weight: 2, opacity: 0.75, dashArray: '6 8' }}
            />
          )
        })}

        {snap.buildings.map((b) => (
          <Marker
            key={b.id}
            position={[b.lat, b.lng]}
            icon={buildingIcon(b.status, b.id === selectedId)}
            zIndexOffset={b.status === 'COLLAPSED' ? 600 : b.status === 'CRITICAL' ? 400 : b.status === 'WARNING' ? 200 : 0}
            eventHandlers={{ click: () => onSelect(b.id) }}
          >
            <Tooltip direction="top" offset={[0, -12]}>
              <strong>{b.id}</strong> · {STATUS_LABEL[b.status]}
              <br />
              {b.address} · {b.floors} kat
            </Tooltip>
          </Marker>
        ))}

        {snap.teams.map((tm) => (
          <Marker key={tm.id} position={[tm.lat, tm.lng]} icon={teamIcon(tm.type, tm.status)} zIndexOffset={1000}>
            <Tooltip direction="top" offset={[0, -10]}>
              <strong>{tm.callsign}</strong> · {TEAM_STATUS_LABEL[tm.status]}
              {tm.targetId ? ` → ${tm.targetId}` : ''}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
