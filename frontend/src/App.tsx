import { useState } from 'react'
import { useSimulation } from './useSimulation'
import { MapView, type FocusTarget } from './components/MapView'
import { ControlPanel, EventLog, KpiGrid, Seismograph } from './components/LeftPanel'
import { RightPanel } from './components/RightPanel'
import { AlertBanner, Header, IdleOverlay, Legend, SummaryOverlay } from './components/Chrome'
import './App.css'

function App() {
  const { snap, start, reset, setPaused, setSpeed } = useSimulation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<FocusTarget | null>(null)
  const [summaryDismissed, setSummaryDismissed] = useState(false)

  const select = (id: string | null) => {
    setSelectedId(id)
    if (id) {
      const b = snap.buildings.find((x) => x.id === id)
      if (b) setFocus({ lat: b.lat, lng: b.lng, nonce: Date.now() })
    }
  }

  const handleReset = (s?: Parameters<typeof reset>[0]) => {
    setSelectedId(null)
    setSummaryDismissed(false)
    reset(s)
  }

  return (
    <div className="app">
      <Header snap={snap} />
      <div className="main">
        <aside className="panel left">
          <ControlPanel snap={snap} onStart={start} onReset={handleReset} onPause={setPaused} onSpeed={setSpeed} />
          <KpiGrid snap={snap} />
          <Seismograph snap={snap} />
          <EventLog logs={snap.logs} />
        </aside>

        <main className="stage">
          <MapView snap={snap} selectedId={selectedId} onSelect={select} focus={focus} />
          <AlertBanner snap={snap} />
          <Legend />
          {snap.phase === 'IDLE' && <IdleOverlay snap={snap} onStart={start} onScenario={handleReset} />}
          {snap.phase === 'COMPLETE' && !summaryDismissed && (
            <SummaryOverlay snap={snap} onReplay={() => handleReset()} onClose={() => setSummaryDismissed(true)} />
          )}
        </main>

        <RightPanel snap={snap} selectedId={selectedId} onSelect={select} />
      </div>
    </div>
  )
}

export default App
