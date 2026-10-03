import { useEffect, useState } from 'react'
import './App.css'

interface Resident {
  name: string;
  age: number;
  medical_info: string;
}

interface Building {
  id: string;
  lat: number;
  lng: number;
  address: string;
  floors: number;
  status: string;
  last_updated: string;
  residents: Resident[];
}

function App() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/buildings')
        if (!res.ok) throw new Error('API Error')
        const data = await res.json()
        setBuildings(data)
        setError('')
      } catch (err) {
        setError('Sunucu bağlantı hatası. Backend çalışıyor mu?')
      }
    }

    fetchBuildings()
    const interval = setInterval(fetchBuildings, 1000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'RED': return '#dc3545'
      case 'YELLOW': return '#ffc107'
      case 'GREEN': return '#198754'
      default: return '#0d6efd'
    }
  }

  return (
    <div className="dashboard">
      <header className="header">
        <h1>🚨 DAMSİS Görev Kontrol Merkezi</h1>
        <p>Deprem Acil Müdahale ve Canlı Yapısal İzleme Sistemi</p>
      </header>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <div className="grid">
        {buildings.map(b => (
          <div key={b.id} className={`card ${b.status.toLowerCase()}`} style={{ borderTop: `5px solid ${getStatusColor(b.status)}` }}>
            <div className="card-header">
              <h2>{b.id} 
                <span className="badge" style={{ backgroundColor: getStatusColor(b.status) }}>
                  {b.status === 'RED' ? 'YIKILDI / ACİL' : b.status === 'YELLOW' ? 'RİSKLİ' : 'GÜVENLİ'}
                </span>
              </h2>
            </div>
            <div className="card-body">
              <p><strong>📍 Konum:</strong> {b.address}</p>
              <p><strong>🏢 Kat Sayısı:</strong> {b.floors}</p>
              <p><strong>⏱️ Son Veri:</strong> {new Date(b.last_updated).toLocaleTimeString()}</p>
              
              <div className="residents-section">
                <h3>Vatandaş Medikal Profili</h3>
                <ul>
                  {b.residents.map((r, i) => (
                    <li key={i}>
                      <span>{r.name} ({r.age})</span>
                      {r.medical_info !== 'Yok' && <span className="medical-alert">🚑 {r.medical_info}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
