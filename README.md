# DAMSİS: Deprem Acil Müdahale Sistemi

Depremde yıkılan binaları sensörlerle tespit edip arama-kurtarma ekiplerini otomatik yönlendiren bir acil müdahale sisteminin etkileşimli simülasyonu.

Proje, ortaokulda geliştirdiğim bir fikir olarak başladı. Bu depo fikrin yeniden tasarlanmış ve çalışan bir simülasyonunu içerir.

## Simülasyonu çalıştırma

Backend gerekmez; simülasyon tamamen tarayıcıda çalışır.

```bash
cd frontend
npm install
npm run dev
```

Sonra `http://localhost:5173` adresini açın. Node.js 20.19+ veya 22.12+ gerekir (Vite 8 gereksinimi).

Depo GitHub Pages'e yayınlanacak şekilde yapılandırılmıştır (`.github/workflows/deploy.yml`). Repo ayarlarında **Settings → Pages → Source: GitHub Actions** seçildiğinde her `main` push'unda yayınlanır.

## Problem

Büyük depremlerde (ör. 2023 Kahramanmaraş) birçok bina yıkılır ve iletişim altyapısı çöker. Arama-kurtarma ekipleri hangi binanın yıkıldığına dair ihbar alamadığında yalnızca görebildikleri enkazlara gidebilir. Enkaz altındaki kişilerin sağlık durumu da ekipler yola çıkarken bilinmez.

## Fikir

1. Binanın taşıyıcı kolonuna ivmeölçer ve haberleşme modülü içeren bir cihaz takılır. Cihaz, kolonun normal eksenini referans olarak kaydeder.
2. Deprem sırasında ivme ve eksen eğimi izlenir. Eşik aşımı "izlemede", "kritik" ve "yıkıldı" durumlarını üretir.
3. Bildirim, GSM çalışmıyorsa LoRa mesh hattıyla komuta merkezine gider. Bina çökerse cihaz BLE beacon moduna geçer.
4. Komuta merkezi yıkılan binayı canlı haritada gösterir ve en yakın uygun ekipleri atar.
5. Cihaza kayıtlı kat sayısı ve sakinlerin sağlık bilgileri (hastalık, ilaç) ambulansa ekipman önerisi olarak iletilir.

## Simülasyonda neler var

- Üç senaryo: Mw 6.5, 7.2 ve 7.8. Her senaryo sabit bir tohumla üretilir, aynı senaryo her seferinde aynı sonucu verir.
- Fatih (İstanbul) çevresinde 42 kurgusal bina; yapım yılı, kat sayısı ve yapısal kırılganlık değerleriyle.
- Zaman çizelgesi: P dalgası uyarısı, ana sarsıntı, GSM kesintisi, artçı şok.
- Binalar zemin ivmesine göre hasar biriktirir. Durum komuta merkezine bağlantı gecikmesiyle (GSM veya LoRa) ulaşır.
- 16 ekip: AFAD, UMKE, İtfaiye ve Ambulans. Ekipler öncelik sırasına göre otomatik atanır. Yoldaki ekipler gerekirse yeniden yönlendirilir.
- Öncelik puanı: enkaz altındaki tahmini kişi sayısı, kronik hastalığı olan kayıtlı sakin sayısı, kat sayısı ve bekleme süresi.
- Canlı sismograf, olay günlüğü, ekip listesi, bina detayı (sakin profilleri, önerilen ambulans ekipmanı) ve operasyon özeti.

## Model varsayımları ve sınırlar

Bu bir mühendislik doğrulaması değildir.

- Hasar modeli basittir: yerel zemin ivmesi, binanın eşik değerini aştıkça hasar birikir. Gerçek yapı davranışını (rezonans, kolon-kiriş detayları, zemin sıvılaşması) modellemez.
- Zemin ivmesi merkez üssüne uzaklıkla üstel olarak azalır; parametreler bu simülasyon için ayarlanmıştır.
- Ekipler 40 km/sa hızla düz hat üzerinde ilerler; yol ağı ve trafik yoktur.
- Ana sarsıntı sonrası saat ×16 hızlandırılır. Ekranda görünen süreler senaryo zamanıdır.
- Bina, sakin, ekip ve sağlık verileri rastgele üretilmiştir.
- Harita altlığı OpenStreetMap'ten gelir; tema CSS ile koyulaştırılmıştır.

## Mimari

```
frontend/            React + TypeScript + Vite + Leaflet
  src/sim/           Simülasyon motoru (UI'dan bağımsız)
    engine.ts          zaman çizelgesi, hasar, bildirim gecikmesi, sevk, kurtarma
    data.ts            senaryolar, bina/sakin/ekip üretimi
    types.ts           ortak tipler
  src/components/    Harita, paneller, katmanlar
backend/             Referans telemetri API'si (FastAPI), simülasyon için gerekmez
```

`backend/` klasörü, gerçek bir cihazdan gelen ivme verisini alıp bina durumunu hesaplayan basit bir örnek içerir:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Yol haritası (uygulanmadı)

- Donanım prototipi: ESP32 + MPU6050, LoRa modülü, batarya yönetimi.
- Gerçek sensör verisiyle eşik kalibrasyonu ve yanlış alarm analizi.
- Binanın doğal frekans değişiminden gizli hasar tespiti.
- Gerçek yol ağı üzerinden rota hesabı.
- Kişisel sağlık verisi için KVKK uyumu, rıza yönetimi ve şifreli saklama. Bu veri türü gerçek bir dağıtımda en hassas bileşendir.

## Lisans

Henüz bir lisans seçilmedi.
