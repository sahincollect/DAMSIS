import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import './App.css'

interface Building {
  id: string; lat: number; lng: number; status: string; address: string;
}

interface Team {
  id: string; type: string; lat: number; lng: number; status: string;
}

function App() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [simulating, setSimulating] = useState(false)

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/state')
        const data = await res.json()
        setBuildings(data.buildings)
        setTeams(data.teams)
        setLogs(data.logs)
      } catch (err) {
        console.error('Backend offline')
      }
    }
    fetchState()
    const int = setInterval(fetchState, 500)
    return () => clearInterval(int)
  }, [])

  const startSim = async () => {
    setSimulating(true)
    try {
      await fetch('http://localhost:8000/api/simulate/start', { method: 'POST' })
    } catch (e) {}
    setTimeout(() => setSimulating(false), 30000)
  }

  const getStatusColor = (status: string) => {
    if (status === 'RED') return '#dc3545'
    if (status === 'YELLOW') return '#ffc107'
    return '#198754'
  }

  const createTeamIcon = (type: string) => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color:${type==='AFAD'?'#e67e22':'#e74c3c'}; width:24px; height:24px; border-radius:50%; border:2px solid white; display:flex; justify-content:center; align-items:center; color:white; font-size:12px; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.3);">${type === 'AFAD' ? 'A' : 'İ'}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    })
  }

  return (
    <div className="dashboard-layout">
      <div className="sidebar">
        <h1 style={{color: '#dc3545', margin: '0 0 10px 0'}}>🚨 DAMSİS</h1>
        <p style={{margin: '0 0 30px 0', color: '#6c757d', fontWeight: 'bold'}}>Acil Müdahale Simülatörü</p>
        
        <button onClick={startSim} disabled={simulating} className={`sim-btn ${simulating ? 'active' : ''}`}>
          {simulating ? 'SİMÜLASYON ÇALIŞIYOR...' : '▶ SİMÜLASYONU BAŞLAT'}
        </button>

        <div className="logs">
          <h3>📡 Canlı Sistem Logları</h3>
          <ul>
            {logs.map((l, i) => (
              <li key={i} className={l.includes('YIKILDI') ? 'log-danger' : l.includes('DEPREM') ? 'log-warning' : ''}>
                {l}
              </li>
            ))}
            {logs.length === 0 && <li style={{color: '#999'}}>Sistem hazır, simülasyonu başlatın.</li>}
          </ul>
        </div>
      </div>

      <div className="map-container">
        <MapContainer center={[41.015, 28.960]} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {buildings.map(b => (
            <CircleMarker 
              key={b.id} 
              center={[b.lat, b.lng]} 
              pathOptions={{ 
                color: getStatusColor(b.status), 
                fillColor: getStatusColor(b.status), 
                fillOpacity: b.status === 'RED' ? 0.9 : 0.6 
              }} 
              radius={b.status === 'RED' ? 14 : 8}
            >
              <Popup>
                <strong>{b.id}</strong><br/>
                Durum: {b.status}<br/>
                Adres: {b.address}
              </Popup>
            </CircleMarker>
          ))}

          {teams.map(t => (
            <Marker key={t.id} position={[t.lat, t.lng]} icon={createTeamIcon(t.type)}>
              <Popup>
                <strong>{t.id} ({t.type})</strong><br/>
                Durum: {t.status}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

export default App
