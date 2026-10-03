import asyncio
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import math
import random

app = FastAPI(title="DAMSIS API Simulation", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Resident(BaseModel):
    name: str
    age: int
    medical_info: str

class Building(BaseModel):
    id: str
    lat: float
    lng: float
    address: str
    floors: int
    status: str = "GREEN" # GREEN, YELLOW, RED
    last_updated: str
    residents: List[Resident]

class Team(BaseModel):
    id: str
    type: str
    lat: float
    lng: float
    status: str
    target_building_id: Optional[str] = None

buildings_db = {}
base_lat, base_lng = 41.015, 28.960
for i in range(1, 21):
    bid = f"B{i:03d}"
    buildings_db[bid] = Building(
        id=bid, 
        lat=base_lat + random.uniform(-0.015, 0.015), 
        lng=base_lng + random.uniform(-0.02, 0.02), 
        address=f"Fatih Mah. {i}. Sokak", 
        floors=random.randint(4, 12),
        status="GREEN", 
        last_updated=datetime.now().isoformat(),
        residents=[Resident(name="Örnek Vatandaş", age=45, medical_info="Belirtilmedi")]
    )

teams_db = {
    "T1": Team(id="AFAD-1", type="AFAD", lat=41.025, lng=28.940, status="BEKLIYOR"),
    "T2": Team(id="AFAD-2", type="AFAD", lat=41.005, lng=28.980, status="BEKLIYOR"),
    "T3": Team(id="AMB-1", type="Ambulans", lat=41.020, lng=28.970, status="BEKLIYOR"),
    "T4": Team(id="ITF-1", type="İtfaiye", lat=41.010, lng=28.940, status="BEKLIYOR"),
}

logs = []
def add_log(msg: str):
    logs.insert(0, f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    if len(logs) > 30: logs.pop()

@app.get("/api/state")
def get_state():
    return {
        "buildings": list(buildings_db.values()),
        "teams": list(teams_db.values()),
        "logs": logs
    }

simulation_running = False

async def run_simulation():
    global simulation_running
    if simulation_running: return
    simulation_running = True
    
    logs.clear()
    add_log("SİMÜLASYON BAŞLATILDI. Sensörler aktif.")
    
    for b in buildings_db.values(): b.status = "GREEN"
    for t in teams_db.values(): 
        t.status = "BEKLIYOR"
        t.target_building_id = None
        
    await asyncio.sleep(2)
    add_log("⚠️ UYARI: P dalgası (Öncü sarsıntı) tespit edildi!")
    await asyncio.sleep(3)
    
    add_log("🚨 DEPREM BAŞLADI! S dalgaları ulaştı.")
    affected = random.sample(list(buildings_db.keys()), 10)
    for bid in affected:
        buildings_db[bid].status = "YELLOW"
        buildings_db[bid].last_updated = datetime.now().isoformat()
    
    await asyncio.sleep(4)
    
    collapsed = random.sample(affected, 4)
    for bid in collapsed:
        buildings_db[bid].status = "RED"
        buildings_db[bid].last_updated = datetime.now().isoformat()
        add_log(f"💥 {bid} NUMARALI BİNA YIKILDI! İletişim koptu (Beacon aktif).")
        
    await asyncio.sleep(2)
    
    add_log("📡 DAMSİS koordinatları Acil Durum Merkezine iletiyor...")
    await asyncio.sleep(2)
    
    team_keys = list(teams_db.keys())
    for i, bid in enumerate(collapsed):
        if i < len(team_keys):
            t = teams_db[team_keys[i]]
            t.status = "YOLDA"
            t.target_building_id = bid
            add_log(f"🚑 {t.id} ekibi {bid} enkazına sevk edildi!")
            
    for _ in range(60):
        for t in teams_db.values():
            if t.status == "YOLDA" and t.target_building_id:
                b = buildings_db[t.target_building_id]
                t.lat += (b.lat - t.lat) * 0.05
                t.lng += (b.lng - t.lng) * 0.05
                
                dist = math.hypot(b.lat - t.lat, b.lng - t.lng)
                if dist < 0.0005:
                    t.status = "MÜDAHALE EDİYOR"
                    t.target_building_id = None
                    add_log(f"✅ {t.id} ekibi {b.id} enkazına ulaştı, kurtarma başladı.")
        await asyncio.sleep(0.5)
        
    simulation_running = False
    add_log("Simülasyon tamamlandı.")

@app.post("/api/simulate/start")
async def start_sim(background_tasks: BackgroundTasks):
    global simulation_running
    if simulation_running:
        raise HTTPException(status_code=400, detail="Simülasyon zaten çalışıyor")
    background_tasks.add_task(run_simulation)
    return {"message": "Simülasyon başlatıldı"}
