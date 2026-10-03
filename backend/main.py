from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import math

app = FastAPI(title="DAMSIS API", description="Deprem Acil Müdahale Sistemi Backend", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock Database Models
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
    status: str = "GREEN" # GREEN: Normal, YELLOW: Hasarlı, RED: Yıkık
    last_updated: str
    residents: List[Resident]

# Initial Seed Data
buildings_db = {
    "B001": Building(
        id="B001", lat=41.0082, lng=28.9784, address="Fatih, Istanbul", floors=5,
        status="GREEN", last_updated=datetime.now().isoformat(),
        residents=[Resident(name="Ahmet Yilmaz", age=65, medical_info="Diyabet (İnsülin)")]
    ),
    "B002": Building(
        id="B002", lat=40.9903, lng=29.0206, address="Kadikoy, Istanbul", floors=8,
        status="GREEN", last_updated=datetime.now().isoformat(),
        residents=[Resident(name="Ayse Demir", age=72, medical_info="Kalp pili, Hipertansiyon")]
    ),
    "B003": Building(
        id="B003", lat=41.0500, lng=28.9833, address="Sisli, Istanbul", floors=12,
        status="GREEN", last_updated=datetime.now().isoformat(),
        residents=[Resident(name="Caner Yildiz", age=30, medical_info="Yok"), Resident(name="Zeynep Yildiz", age=28, medical_info="Astım")]
    )
}

class Telemetry(BaseModel):
    building_id: str
    accel_x: float
    accel_y: float
    accel_z: float

@app.get("/api/buildings", response_model=List[Building])
def get_buildings():
    return list(buildings_db.values())

@app.get("/api/buildings/{building_id}", response_model=Building)
def get_building(building_id: str):
    if building_id not in buildings_db:
        raise HTTPException(status_code=404, detail="Bina bulunamadı")
    return buildings_db[building_id]

@app.post("/api/telemetry")
def receive_telemetry(data: Telemetry):
    if data.building_id not in buildings_db:
        raise HTTPException(status_code=404, detail="Bina bulunamadı")
    
    b = buildings_db[data.building_id]
    
    # Yıkım / Hasar Algoritması (Basitleştirilmiş)
    # Z ekseni yerçekimi sebebiyle normalde 1g (veya 9.8) olmalıdır. 
    # Sapmalar binanın yattığını veya ivmelendiğini gösterir.
    magnitude = math.sqrt(data.accel_x**2 + data.accel_y**2 + data.accel_z**2)
    tilt = abs(data.accel_z - 1.0)
    
    # Eğer çok şiddetli bir şok veya yataylanma (devrilme) varsa
    if magnitude > 2.5 or tilt > 0.6: 
        b.status = "RED" # YIKILDI
    elif magnitude > 1.5 or tilt > 0.3:
        if b.status != "RED": # Kırmızıya döndüyse sarıya dönmesin
            b.status = "YELLOW" # AĞIR HASARLI
            
    b.last_updated = datetime.now().isoformat()
    
    return {"status": "success", "building_status": b.status}
