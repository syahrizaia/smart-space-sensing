# Modul Integrasi Data

Backend menyediakan `GET /api/integrations`, atau `GET /api/integrations?source=wifi-csi`.
Pilihan sumber: `wifi-csi`, `energy-meter`, `bms`, `hvac`, `plc`, `mes`, `scada`.
Semua konektor menggunakan HTTP GET ke gateway. Ini bukan driver native MQTT, Modbus,
OPC-UA atau vendor CSI. Gateway/vendor harus memetakan payload ke kontrak berikut.
Koneksi perangkat nyata memerlukan endpoint, kredensial dan adapter vendor yang sesuai.

## Konfigurasi server

Tambahkan ke `.env.local` (jangan commit kredensial):

```dotenv
INTEGRATION_API_TOKEN=replace-with-a-long-random-secret
INTEGRATION_TIMEOUT_MS=5000
INTEGRATION_WIFI_CSI_URL=https://gateway.example/occupancy
INTEGRATION_WIFI_CSI_TOKEN=replace-with-read-token
INTEGRATION_ENERGY_METER_URL=https://gateway.example/energy
INTEGRATION_BMS_URL=https://gateway.example/bms
INTEGRATION_HVAC_URL=https://gateway.example/hvac
INTEGRATION_PLC_URL=https://gateway.example/plc
INTEGRATION_MES_URL=https://gateway.example/mes
INTEGRATION_SCADA_URL=https://gateway.example/scada
```

Setiap URL mendukung token opsional dengan nama prefix yang sama dan suffix `_TOKEN`.
URL hanya berasal dari konfigurasi server, tidak dari query pengguna. Redirect ditolak.
Gunakan HTTPS dan kredensial read-only pada gateway terutama PLC/MES/SCADA.
Tidak tersedia operasi tulis/kontrol perangkat. Batas timeout 1–30000 ms per sumber;
body maksimum 2 MiB dan maksimum 10000 record per respons. Sumber dibaca bersamaan.

Panggil dengan header `Authorization: Bearer <INTEGRATION_API_TOKEN>` dari backend
frontend/BFF yang dipercaya. Jangan menaruh token ini pada `NEXT_PUBLIC_*` atau bundle
browser. Integrasikan autentikasi sesi aplikasi sebelum memanggil API langsung dari browser.
Dashboard yang ada masih menggunakan mock; perubahan ini menyediakan backend API.

## Kontrak gateway

Semua gateway mengembalikan `{ "data": [...] }`. Setiap record wajib memiliki `id`
(unik dalam respons sumber), `zoneId` (ID zona dashboard), dan `observedAt` ISO 8601
dengan timezone. Timestamp keluaran dinormalisasi ke UTC. ID antar sumber dapat sama;
frontend menggunakan pasangan `source` dan `id` sebagai key.

WiFi/CSI:
```json
{"data":[{"id":"CSI-01","zoneId":"Z-01","observedAt":"2026-09-29T12:00:00+07:00","status":"active","occupied":true,"activity":"motion"}]}
```
`status`: active/idle/offline. `occupied`: boolean atau null bila tidak diketahui.
`activity`: motion/stationary/none/unknown. Keluaran memiliki `kind: occupancy`.

Energy Meter/BMS/HVAC:
```json
{"data":[{"id":"EM-01","zoneId":"Z-01","observedAt":"2026-09-29T12:00:00+07:00","status":"running","energy":{"value":1500,"unit":"Wh"},"power":{"value":500,"unit":"W"}}]}
```
`status`: running/idle/off/fault/offline/unknown. `energy` dan `power` opsional/null;
nilai harus numerik non-negatif. Satuan energy: Wh/kWh/MWh; power: W/kW/MW.
Keluaran mengganti pengukuran dengan `energyKwh` dan `powerKw` (null bila tidak tersedia),
serta `kind: facility`. Energy adalah pembacaan meter dari sumber, bukan otomatis konsumsi
harian; agregasi periode membutuhkan delta meter dan penanganan reset di lapisan analitik.

PLC/MES/SCADA:
```json
{"data":[{"id":"PLC-01","zoneId":"Z-01","observedAt":"2026-09-29T12:00:00+07:00","machineId":"M-01","lineId":"L-01","machineStatus":"running","lineStatus":"running","schedule":[{"orderId":"PO-001","startAt":"2026-09-29T08:00:00+07:00","endAt":"2026-09-29T16:00:00+07:00"}]}]}
```
Kedua status: running/idle/stopped/fault/offline/unknown. `schedule` wajib berupa array
(boleh kosong); akhir jadwal harus setelah awal. Keluaran memiliki `kind: production`.

## Respons dan kegagalan

```json
{"data":[],"errors":[{"source":"plc","code":"NOT_CONFIGURED"}],"meta":{"schemaVersion":"1.0","fetchedAt":"2026-09-29T05:00:00.000Z","status":"unavailable","sources":[{"source":"plc","status":"error","count":0}]}}
```

HTTP 200 untuk `ok` atau `partial`, 503 bila seluruh sumber gagal atau token API belum
dikonfigurasi, 401 untuk autentikasi gagal, 400 untuk query tidak valid. Respons tidak di-cache.
Kesalahan sumber: NOT_CONFIGURED, INVALID_CONFIG, UPSTREAM_ERROR, INVALID_PAYLOAD, TIMEOUT.
Satu record tidak valid menggagalkan sumber tersebut; sumber lain tetap dikembalikan.
Data kosong yang valid tetap sukses. Tidak ada fallback mock atau angka nol buatan.
Periksa `observedAt` untuk umur data; `fetchedAt` hanya waktu pengambilan, bukan waktu sensor.
Endpoint dan pesan error upstream tidak diekspos.

Validasi: `npm run test:integration`, `npx tsc --noEmit`, `npm run lint`.
