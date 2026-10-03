import time
import requests
import random
import threading

API_URL = "http://localhost:8000/api/telemetry"

def simulate_building(building_id, collapse_after_sec=-1):
    print(f"[+] {building_id} için sensör simülasyonu başlatıldı.")
    start_time = time.time()
    
    while True:
        elapsed = time.time() - start_time
        
        # Normal Stabil Durum (Z ekseni yerçekimi yönünde ~1g)
        ax = random.uniform(-0.05, 0.05)
        ay = random.uniform(-0.05, 0.05)
        az = random.uniform(0.95, 1.05)
        
        # Yıkım / Deprem Anı Tetikleyici
        if collapse_after_sec > 0 and elapsed > collapse_after_sec:
            print(f"🚨 DİKKAT: {building_id} BİNASINDA YIKIM/AĞIR HASAR TESPİT EDİLDİ!")
            # Sensör yana yattı (Z sıfıra yaklaştı, X/Y fırladı)
            ax = random.uniform(1.5, 3.0)
            ay = random.uniform(1.5, 3.0)
            az = random.uniform(-0.5, 0.5)
            # Sadece bir kere büyük ivme göndersin, sonra o pozisyonda kalsın diye collapse_after_sec'i disable edebiliriz ama
            # simülasyon devam etsin diye bırakıyorum. Gerçekte cihaz yan yatmış halde statik ivme gönderir.
            
        data = {
            "building_id": building_id,
            "accel_x": ax,
            "accel_y": ay,
            "accel_z": az
        }
        
        try:
            res = requests.post(API_URL, json=data)
            status = res.json().get('building_status')
            print(f"[{building_id}] Veri iletildi -> Bina Durumu: {status}")
        except Exception as e:
            print(f"[{building_id}] Sunucuya bağlanılamadı! (Sunucu açık mı?)")
            
        time.sleep(2) # 2 saniyede bir telemetri gönder

if __name__ == "__main__":
    print("====================================")
    print("DAMSIS IoT Sensör Simülatörü")
    print("====================================")
    
    # B001 normal kalacak
    t1 = threading.Thread(target=simulate_building, args=("B001", -1))
    
    # B002 10 saniye sonra yıkılacak
    t2 = threading.Thread(target=simulate_building, args=("B002", 10))
    
    # B003 normal kalacak
    t3 = threading.Thread(target=simulate_building, args=("B003", -1))
    
    t1.start()
    t2.start()
    t3.start()
