# Integrasi data eksternal dashboard

Backend menyediakan response JSON kanonis untuk WiFi/CSI, energy meter, BMS/HVAC, PLC, dan MES/SCADA. Endpoint PLC dan MES hanya melakukan `GET`; backend tidak menulis tag, mengirim perintah, atau mengubah jadwal.

Set konfigurasi berikut di `.env.local` pada root aplikasi. Semua endpoint sumber eksternal harus mengembalikan JSON. Token dikirim sebagai `Authorization: Bearer ...` dari server dan tidak pernah diekspos ke browser.

```dotenv
WIFI_CSI_API_URL=https://sensor-gateway.example/api/zones/activity
WIFI_CSI_API_TOKEN=
WIFI_CSI_MQTT_TOPIC=smart-space/wifi-csi/activity
MQTT_URL=mqtts://broker.example:8883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TIMEOUT_MS=5000
ENERGY_METER_API_URL=https://energy-gateway.example/api/meters/latest
ENERGY_METER_API_TOKEN=
BMS_API_URL=https://bms.example/api/hvac/status
BMS_API_TOKEN=
PLC_API_URL=https://plc-gateway.example/api/machines/status
PLC_API_TOKEN=
MES_API_URL=https://mes.example/api/production/schedule
MES_API_TOKEN=
ANALYTICS_HISTORY_API_URL=https://analytics.example/api/shifts/energy-utilization
ANALYTICS_HISTORY_API_TOKEN=
ENERGY_IDLE_THRESHOLD_KWH=50
EXTERNAL_API_TIMEOUT_MS=5000
```

URL `http://` hanya diterima untuk `localhost` (pengembangan lokal). Gunakan HTTPS untuk gateway jaringan. Setiap URL mengarah ke resource GET yang menghasilkan satu objek, array, atau pembungkus `{ "data": [...] }`, `{ "items": [...] }`, maupun `{ "results": [...] }`.

## Endpoint aplikasi

- `GET /api/sensors/wifi` — aktivitas, status dihuni, jumlah orang, dan confidence tiap zona.
- `GET /api/facilities` — pemakaian energi dan status BMS/HVAC.
- `GET /api/operations` — status mesin PLC dan jadwal produksi MES/SCADA.
- `GET /api/dashboard` — seluruh data di atas beserta status koneksi tiap sumber.
- `GET /api/analytics` — konsumsi energi per area, peringatan area kosong, utilisasi, tren energi/utilisasi per shift, dan status sumber.

Contoh format data sumber (mapper menerima alias umum seperti `zone_id`, `consumption`, `state`, `machine_id`, dan `planned`):

REST dan MQTT WiFi/CSI menggunakan format data berikut:

```json
[{"zoneId":"Z-01","activity":"active","occupied":true,"peopleCount":4,"confidence":0.94,"timestamp":"2026-09-28T05:00:00Z"}]
```

MQTT mengirim satu objek per pesan (tanpa array). Endpoint memilih URL REST bila `WIFI_CSI_API_URL` diisi; jika kosong, ia membaca pesan dari `WIFI_CSI_MQTT_TOPIC`. Pesan retained cocok untuk request snapshot.

```json
[{"zoneId":"Z-01","energyUsage":142,"energyUnit":"kWh","power":8.2,"timestamp":"2026-09-28T05:00:00Z"}]
```

```json
[{"id":"ahu-01","zoneId":"Z-01","system":"HVAC","status":"running","temperature":23.5,"setpoint":22,"timestamp":"2026-09-28T05:00:00Z"}]
```

```json
[{"machineId":"machine-01","name":"Conveyor 1","lineId":"Line 1","status":"running","orderId":"WO-1001","timestamp":"2026-09-28T05:00:00Z"}]
```

```json
[{"orderId":"WO-1001","lineId":"Line 1","product":"Widget A","plannedQuantity":10000,"producedQuantity":8420,"startsAt":"2026-09-28T00:00:00Z","endsAt":"2026-09-28T09:00:00Z","status":"in_progress"}]
```

Untuk tren historis, `ANALYTICS_HISTORY_API_URL` menerima daftar catatan per shift. Baris dapat diagregasi dari beberapa zona; `energyKwh` dijumlahkan dan `utilizationPct` dirata-ratakan per shift. Contoh:

```json
[
  {"shift":"Shift A","period":"2026-09-28","zoneId":"Z-01","energyKwh":142,"utilizationPct":82.5},
  {"shift":"Shift A","period":"2026-09-28","zoneId":"Z-02","energyKwh":126,"utilizationPct":74.0},
  {"shift":"Shift B","period":"2026-09-28","zoneId":"Z-01","energyKwh":155,"utilizationPct":68.0}
]
```

Peringatan area kosong dibuat ketika WiFi/CSI melaporkan `occupied: false` dan meter melaporkan `energyUsage` di atas `ENERGY_IDLE_THRESHOLD_KWH` (default 50 kWh). Tren contoh di halaman Analytics hanya ditampilkan saat API historis belum tersambung, dan diberi label agar tidak disalahartikan sebagai data live.

Semua data dibakukan ke ID dan status kanonis, waktu ISO 8601, dan unit eksplisit. Endpoint selalu mengembalikan `data: []` untuk sumber yang belum dikonfigurasi atau gagal, dengan `status` (`connected`, `not_configured`, `error`) dan pesan error aman untuk diagnosis; sumber lain tetap tersedia. Baca melalui helper di `api-client.ts`, misalnya `const snapshot = await getDashboardData();`.

Kredensial, sertifikat, dan skema autentikasi spesifik harus dikelola oleh gateway/infrastruktur. PLC/SCADA sebaiknya diekspos lewat gateway read-only; jangan membuka port kontrol PLC langsung ke aplikasi web. Dashboard saat ini masih merender mock data, sehingga pemanggilan `getDashboardData()` perlu digunakan pada komponen dashboard untuk mengganti nilai mock dengan data live.
