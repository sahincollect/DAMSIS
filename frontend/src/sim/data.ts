import type { Building, Resident, Scenario, Team, TeamType } from './types'

/** Deterministic PRNG so every scenario replays identically. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'mw65',
    label: 'Mw 6.5',
    magnitude: 6.5,
    peakG: 0.37,
    seed: 11,
    description: 'Orta şiddet. Hasar ağırlıklı olarak eski ve zayıf yapılarda.',
  },
  {
    id: 'mw72',
    label: 'Mw 7.2',
    magnitude: 7.2,
    peakG: 0.46,
    seed: 23,
    description: 'Şiddetli. Birden fazla bina çöker, artçı şok ek yıkım yaratır.',
  },
  {
    id: 'mw78',
    label: 'Mw 7.8',
    magnitude: 7.8,
    peakG: 0.56,
    seed: 37,
    description: 'Çok şiddetli. Ekip kapasitesi aşılır, önceliklendirme belirleyici olur.',
  },
]

/** Hypothetical offshore epicenter south of the Fatih district (Marmara Sea). */
export const EPICENTER = { lat: 40.962, lng: 28.935 }
export const MAP_CENTER: [number, number] = [41.0135, 28.9425]

interface Neighborhood {
  name: string
  lat: number
  lng: number
  weight: number
}

const NEIGHBORHOODS: Neighborhood[] = [
  { name: 'Aksaray', lat: 41.0117, lng: 28.9547, weight: 3 },
  { name: 'Laleli', lat: 41.0105, lng: 28.9575, weight: 2 },
  { name: 'Vefa', lat: 41.0165, lng: 28.9587, weight: 2 },
  { name: 'Zeyrek', lat: 41.0206, lng: 28.9566, weight: 1 },
  { name: 'Balat', lat: 41.0294, lng: 28.9487, weight: 2 },
  { name: 'Karagümrük', lat: 41.023, lng: 28.934, weight: 2 },
  { name: 'Çapa', lat: 41.0126, lng: 28.9386, weight: 2 },
  { name: 'Cerrahpaşa', lat: 41.0073, lng: 28.938, weight: 2 },
  { name: 'Samatya', lat: 40.9985, lng: 28.9247, weight: 2 },
  { name: 'Yedikule', lat: 40.9951, lng: 28.9229, weight: 2 },
]

const FIRST_NAMES = [
  'Ahmet', 'Mehmet', 'Ayşe', 'Fatma', 'Mustafa', 'Zeynep', 'Hüseyin', 'Emine', 'Ali', 'Hatice',
  'İbrahim', 'Elif', 'Hasan', 'Meryem', 'Murat', 'Selin', 'Can', 'Deniz', 'Burak', 'Esra',
  'Kemal', 'Gül', 'Osman', 'Nur', 'Yusuf', 'Sevgi', 'Emre', 'Leyla', 'Orhan', 'Derya',
]
const LAST_NAMES = [
  'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Aydın', 'Öztürk', 'Arslan', 'Doğan',
  'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özdemir', 'Polat', 'Erdoğan', 'Güneş',
]

interface Condition {
  condition: string
  medication: string
  equipment: string[]
}

export const CONDITIONS: Condition[] = [
  { condition: 'Tip 1 diyabet', medication: 'İnsülin', equipment: ['Glukometre', 'Glukoz / insülin seti'] },
  { condition: 'Kalp yetmezliği', medication: 'Beta bloker, diüretik', equipment: ['Defibrilatör (AED)', 'EKG monitörü'] },
  { condition: 'KOAH', medication: 'Bronkodilatör inhaler', equipment: ['Oksijen tüpü', 'Nebülizatör'] },
  { condition: 'Astım', medication: 'Salbutamol inhaler', equipment: ['Nebülizatör', 'Oksijen tüpü'] },
  { condition: 'Epilepsi', medication: 'Antiepileptik', equipment: ['Diazepam acil seti'] },
  { condition: 'Kronik böbrek yetmezliği', medication: 'Diyaliz programı', equipment: ['IV sıvı seti', 'Potasyum takibi (EKG)'] },
  { condition: 'Hipertansiyon', medication: 'ACE inhibitörü', equipment: ['Tansiyon monitörü'] },
  { condition: 'Gebelik (3. trimester)', medication: 'Demir / folik asit', equipment: ['Obstetrik acil set'] },
  { condition: 'Antikoagülan tedavi', medication: 'Varfarin', equipment: ['Hemostatik pansuman', 'Turnike'] },
]

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function gauss(rng: () => number): number {
  const u = Math.max(rng(), 1e-9)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function makeResident(rng: () => number): Resident {
  const age = rng() < 0.18 ? 2 + Math.floor(rng() * 14) : 18 + Math.floor(rng() * 70)
  const name = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`
  if (age < 16) {
    return { name, age, condition: rng() < 0.3 ? 'Astım' : 'Kronik hastalık yok', medication: rng() < 0.3 ? 'Salbutamol inhaler' : '-', equipment: rng() < 0.3 ? ['Nebülizatör', 'Pediatrik set'] : ['Pediatrik set'] }
  }
  if (rng() < 0.3) return { name, age, condition: 'Kronik hastalık yok', medication: '-', equipment: [] }
  const c = pick(rng, CONDITIONS)
  if (c.condition.startsWith('Gebelik') && (age > 42 || rng() < 0.3)) {
    const alt = CONDITIONS[6]
    return { name, age, condition: alt.condition, medication: alt.medication, equipment: alt.equipment }
  }
  return { name, age, condition: c.condition, medication: c.medication, equipment: c.equipment }
}

export function generateBuildings(seed: number, count = 42): Building[] {
  const rng = mulberry32(seed)
  const totalWeight = NEIGHBORHOODS.reduce((s, n) => s + n.weight, 0)
  const out: Building[] = []

  for (let i = 0; i < count; i++) {
    let r = rng() * totalWeight
    let nb = NEIGHBORHOODS[0]
    for (const n of NEIGHBORHOODS) {
      r -= n.weight
      if (r <= 0) {
        nb = n
        break
      }
    }

    const lat = nb.lat + gauss(rng) * 0.0028
    const lng = nb.lng + gauss(rng) * 0.0036

    const yr = rng()
    const yearBuilt = yr < 0.35 ? 1955 + Math.floor(rng() * 25) : yr < 0.7 ? 1980 + Math.floor(rng() * 20) : yr < 0.92 ? 2000 + Math.floor(rng() * 18) : 2018 + Math.floor(rng() * 7)
    const fr = rng()
    const floors = fr < 0.3 ? 3 + Math.floor(rng() * 3) : fr < 0.8 ? 6 + Math.floor(rng() * 4) : 10 + Math.floor(rng() * 6)

    const base = yearBuilt < 1980 ? 0.75 : yearBuilt < 2000 ? 0.55 : yearBuilt < 2018 ? 0.35 : 0.18
    const vulnerability = Math.min(0.97, Math.max(0.05, base + (floors > 9 ? 0.05 : 0) + gauss(rng) * 0.07))

    const occupants = Math.round(floors * (3 + rng() * 2) * 2.4)
    const profileCount = 2 + Math.floor(rng() * 3)
    const residents = Array.from({ length: profileCount }, () => makeResident(rng))

    out.push({
      id: `B${String(i + 1).padStart(3, '0')}`,
      address: `${nb.name} Mah. ${1 + Math.floor(rng() * 60)}. Sk. No:${1 + Math.floor(rng() * 48)}`,
      district: nb.name,
      lat,
      lng,
      floors,
      yearBuilt,
      vulnerability,
      siteFactor: 0.85 + rng() * 0.35,
      damage: 0,
      physical: 'SAFE',
      status: 'SAFE',
      tiltDeg: 0,
      sensorAccelG: 0,
      peakAccelG: 0,
      occupants,
      trapped: 0,
      rescuedCount: 0,
      rescueProgress: 0,
      rescued: false,
      link: 'CELLULAR',
      residents,
      equipment: [],
      priority: 0,
      assigned: [],
      reportedAt: null,
      firstDispatchAt: null,
      firstArrivalAt: null,
      rescuedAt: null,
    })
  }
  return out
}

interface TeamSeed {
  type: TeamType
  prefix: string
  bases: [number, number][]
}

const TEAM_SEEDS: TeamSeed[] = [
  { type: 'AFAD', prefix: 'AFAD', bases: [[41.0265, 28.9285], [41.005, 28.948], [41.0215, 28.961], [41.0105, 28.927], [41.0305, 28.944]] },
  { type: 'UMKE', prefix: 'UMKE', bases: [[41.0185, 28.942], [41.0085, 28.936]] },
  { type: 'FIRE', prefix: 'İTF', bases: [[41.014, 28.951], [41.0, 28.93], [41.027, 28.952], [41.018, 28.925]] },
  { type: 'AMBULANCE', prefix: 'AMB', bases: [[41.012, 28.944], [41.023, 28.9395], [41.0035, 28.9395], [41.016, 28.956], [41.029, 28.933]] },
]

export const TEAM_LABEL: Record<TeamType, string> = {
  AFAD: 'AFAD Arama Kurtarma',
  UMKE: 'UMKE',
  FIRE: 'İtfaiye',
  AMBULANCE: 'Ambulans',
}

export function isSarTeam(type: TeamType): boolean {
  return type !== 'AMBULANCE'
}

export function generateTeams(): Team[] {
  const out: Team[] = []
  for (const seed of TEAM_SEEDS) {
    seed.bases.forEach(([lat, lng], i) => {
      out.push({
        id: `${seed.prefix}-${String(i + 1).padStart(2, '0')}`,
        callsign: `${seed.prefix}-${String(i + 1).padStart(2, '0')}`,
        type: seed.type,
        status: 'STANDBY',
        lat,
        lng,
        baseLat: lat,
        baseLng: lng,
        targetId: null,
        etaSec: 0,
        distanceM: 0,
        equipment: [],
      })
    })
  }
  return out
}
