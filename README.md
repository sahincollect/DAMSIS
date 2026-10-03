# DAMSİS (Deprem Acil Müdahale Sistemi) 🌍📡

DAMSİS, olası yıkıcı depremlerde arama-kurtarma ekiplerinin nokta atışı yönlendirilmesini sağlayan, IoT tabanlı bir acil müdahale ve kriz yönetimi sistemidir. 

Binaların yapısal bütünlüğünü anlık olarak izleyerek, yıkım veya kritik hasar durumunda kurtarma ekiplerinin canlı haritalarına uyarı gönderir. Aynı zamanda enkaz altındaki vatandaşların hayati medikal bilgilerini (kronik hastalık, kullanılan ilaçlar vb.) sağlık ekiplerine ulaştırarak ilk yardımın hızını ve verimliliğini artırır.

---

## 🚨 Problem

Özellikle beklenen büyük İstanbul depremi gibi senaryolarda, binaların yenilenme hızının yetersiz kalacağı öngörülmektedir. Geçmiş depremlerde (örneğin Kahramanmaraş depreminde) görüldüğü üzere, en büyük sorunlardan biri **iletişim kopukluğu** ve **koordinasyon eksikliğidir**. 

* Arama kurtarma ekipleri, hangi binanın yıkıldığına dair net ihbar alamadığı için sahada körlemesine keşif yapmak zorunda kalmaktadır.
* Gözden kaçan veya geç fark edilen yıkıntılarda, hava şartları veya müdahale gecikmesi sebebiyle can kayıpları artmaktadır.
* Sağlık ekipleri, enkaz altındaki kişilerin özel durumlarını (diyabet, kalp hastası vb.) bilmediği için olay yerine standart ekipmanla gitmekte, bu da spesifik müdahaleleri geciktirmektedir.

## 💡 Çözüm: DAMSİS Nasıl Çalışır?

1. **Donanım Yerleşimi:** Binaların ana taşıyıcı kolonlarına ivmeölçer, jiroskop ve haberleşme modülü içeren DAMSİS cihazları yerleştirilir.
2. **Eksen ve Stabilite Kalibrasyonu:** Cihaz, monte edildiği kolonun standart eksenini ve eğimini referans olarak kaydeder.
3. **Anlık İzleme ve Yıkım Tespiti:** Deprem anında, kolonun eksenindeki ani ve geri dönülemez değişimler (eğilme, göçme, çökme) cihaz tarafından algılanır.
4. **Acil Durum Sinyali:** Yıkım veya kritik eşik aşıldığında, cihaz doğrudan arama-kurtarma merkezlerindeki **Canlı Kriz Haritasına** SOS sinyali gönderir.
5. **Bina ve Sakin Verisi:** Sinyalle birlikte; binanın kat sayısı, daire sayısı, içeride yaşayan vatandaşların listesi ve acil tıbbi gereksinimleri (kullandıkları ilaçlar, kan grupları) doğrudan AFAD, UMKE ve ambulans ekiplerinin ekranına düşer.

---

## ✨ Yeni ve Gelişmiş Özellikler (V2)

Ortaokul projesinin üzerine eklenen modern mühendislik yaklaşımları:

* 📶 **Alternatif İletişim Protokolleri (LoRaWAN & Mesh):** Deprem anında hücresel ağların (GSM/İnternet) çökmesi ihtimaline karşı, cihazlar LoRaWAN veya binalar arası Mesh ağı (BLE/Wi-Fi) üzerinden haberleşerek ana merkeze veriyi ulaştırır.
* 🔋 **Enerji Bağımsızlığı:** Şebeke elektriği kesilse bile cihazın günlerce çalışabilmesi için Lityum-Polimer (Li-Po) batarya ve uyku modu yönetimi. 
* 🧠 **Yapay Zeka ile Hasar Tahmini:** Sadece yıkılma anını değil, deprem sırasındaki sarsıntı ivmesini analiz ederek binanın doğal frekansındaki bozulmayı (gizli hasarı) makine öğrenmesi ile tespit etme.
* 📍 **Enkaz Altı Sinyalizasyon (Beacon):** Bina tamamen çökerse ve dış dünyayla iletişim kopsa bile, cihazın Bluetooth Low Energy (BLE) beacon moduna geçerek enkaz üstünde arama yapan ekiplerin cihazlarına (veya dronelara) "Buradayım" sinyali yayması.

---

## 🛠️ Sistem Mimarisi

DAMSİS 3 ana katmandan oluşmaktadır:

### 1. Edge Katmanı (IoT Cihazı)
* **Sensörler:** MPU6050 (6 Eksen İvmeölçer ve Jiroskop)
* **Mikrodenetleyici:** ESP32 veya STM32 (Düşük güç tüketimi ve Wi-Fi/Bluetooth/LoRa desteği)
* **Güç:** Şebeke + Li-Po Batarya (BMS ile şarj kontrolü)

### 2. Bulut / Backend Katmanı
* **Haberleşme:** MQTT veya CoAP protokolleri.
* **Veritabanı:** 
  * *Zaman Serisi (Time-series):* Sensör ivme verileri için (örn. InfluxDB, TimescaleDB).
  * *İlişkisel/NoSQL:* Bina ve vatandaş profilleri için (örn. PostgreSQL, Firebase/Firestore).
* **API:** Verileri işleyen ve doğrulayan Node.js / Python (FastAPI) sunucusu.

### 3. Frontend / Arama Kurtarma Dashboard'u
* **Harita Entegrasyonu:** React.js ve Mapbox/Leaflet kullanılarak geliştirilmiş, canlı güncellenen şehir haritası.
* **Renk Kodlaması:**
  * 🟢 **Yeşil:** Bina sağlam, eksen sapması yok.
  * 🟡 **Sarı:** Kritik yapısal sarsıntı/eğim (Riskli bina, gizli hasar olabilir).
  * 🔴 **Kırmızı:** Tam çökme veya aşırı devrilme tespit edildi (Acil müdahale ekibi sevk ediliyor).

---

## 🚀 Kurulum ve Çalıştırma (Simülasyon Ortamı)

Harvard CS standartlarında bir MVP (Minimum Viable Product) olarak tasarlanan bu repo, donanıma ihtiyaç duymadan sistemi test edebilmeniz için bir simülasyon ortamı içerir.

### 1. Backend (FastAPI + Simülasyon Motoru)
Binaların durumunu, sensör verilerini ve kurtarma ekiplerinin (İtfaiye, AFAD) konumlarını anlık olarak hesaplayan ana sunucu.
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend (React + Leaflet Harita Paneli)
Arama kurtarma ekiplerinin gördüğü, harita tabanlı canlı kriz yönetim paneli.
```bash
cd frontend
npm install
npm run dev
```

*Not: Uygulamayı açtıktan sonra sol menüdeki **"SİMÜLASYONU BAŞLAT"** butonuna basarak Fatih bölgesindeki 20 binanın deprem anındaki davranışını, binaların yıkılmasını ve ardından AFAD/İtfaiye ekiplerinin otomatik olarak enkazlara yönlendirilmesini harita üzerinde canlı izleyebilirsiniz.*

## 🤝 Katkıda Bulunma
Bu proje açık kaynaklı bir sosyal sorumluluk ve acil durum teknolojisi projesidir. Pull request'ler (PR), hata bildirimleri (issues) ve yeni fikirler her zaman memnuniyetle karşılanır.

---
*DAMSİS, teknolojinin hayat kurtardığı bir gelecek için tasarlanmıştır.*
