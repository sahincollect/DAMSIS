import { useCallback, useEffect, useState } from 'react'
import { Simulation } from './sim/engine'
import { SCENARIOS } from './sim/data'
import type { Scenario, SimSnapshot } from './sim/types'

const PUBLISH_INTERVAL_MS = 80

export function useSimulation() {
  const [sim] = useState(() => new Simulation(SCENARIOS[1]))
  const [snap, setSnap] = useState<SimSnapshot>(() => sim.snapshot())

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let lastPublish = 0
    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      sim.step(dt)
      if (now - lastPublish > PUBLISH_INTERVAL_MS) {
        lastPublish = now
        setSnap(sim.snapshot())
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [sim])

  const start = useCallback(() => {
    sim.start()
    setSnap(sim.snapshot())
  }, [sim])

  const reset = useCallback(
    (scenario?: Scenario) => {
      sim.reset(scenario)
      setSnap(sim.snapshot())
    },
    [sim],
  )

  const setPaused = useCallback(
    (p: boolean) => {
      sim.setPaused(p)
      setSnap(sim.snapshot())
    },
    [sim],
  )

  const setSpeed = useCallback(
    (s: number) => {
      sim.setSpeed(s)
      setSnap(sim.snapshot())
    },
    [sim],
  )

  return { snap, start, reset, setPaused, setSpeed }
}
