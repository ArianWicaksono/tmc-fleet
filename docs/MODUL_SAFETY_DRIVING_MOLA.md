# MODUL SAFETY DRIVING — "MOLA" (Monitoring Log Activity)
**Perusahaan:** Kalla Transport & Logistics
**Dokumen ini untuk:** Konteks pengembangan AI/mini-project (referensi arsitektur data, logika bisnis, dan output dashboard)

---

## 1. Latar Belakang & Tujuan Modul

MOLA (Monitoring Log Activity) adalah modul pemantauan **perilaku berkendara (safety behavior)** dan **kecepatan (speed behavior)** armada logistik Kalla, berbasis data dari perangkat **GPS Tracker / Fleet Management System (FMS)** dan **kamera AI dalam kabin (Driver Monitoring System / VMS — video monitoring system)** yang terpasang di setiap unit kendaraan.

Tujuan modul:
1. Mendeteksi dan mencatat **pelanggaran perilaku berkendara** (mengantuk, merokok, menelpon, tidak pakai seatbelt, dll) secara otomatis dari kamera AI.
2. Mendeteksi dan mencatat **pelanggaran kecepatan (overspeeding)** dari data GPS.
3. Menyediakan **dashboard monitoring** per cabang/proyek untuk tim Safety & Operasional.
4. Menjadi dasar **tindak lanjut (action plan)** terhadap driver dan unit yang berisiko tinggi (coaching, teguran, pemanggilan).
5. Menghasilkan **rekap periodik (harian/mingguan/bulanan)** sebagai bahan evaluasi KPI safety perusahaan.

Cakupan wilayah operasional saat ini mencakup banyak cabang (lihat Master Data Cabang di bawah), dengan sample data yang diberikan berasal dari **1 cabang saja (VLI)** untuk periode **22–31 Mei 2026** sebagai contoh struktur — modul final harus mampu menangani **seluruh cabang** dan **periode berjalan (real-time/harian)**.

---

## 2. Sumber Data (Data Sources)

Ada 2 kategori sumber data mentah (raw data) yang diproses menjadi dashboard:

### 2.1 Speed Flag Report (dari GPS/FMS)
- **Nama file contoh:** `MOLA - SPEED FLAG REPORT VLI 22-31 MEI 2026.xlsx`
- **Struktur:** 1 sheet per tanggal (misal sheet "22", "23", ..., "31" — nama sheet = tanggal dalam bulan).
- **Kolom data per baris (1 baris = 1 kejadian/event kecepatan):**
  | Kolom | Tipe | Keterangan |
  |---|---|---|
  | No | integer | nomor urut event dalam hari tsb |
  | Tanggal | datetime | timestamp lengkap kejadian, format `YYYY/MM/DD HH:MM:SS` |
  | Vehicle Group | text | grup/cabang kendaraan, contoh: "VDC / VLI" |
  | Nopol | text | plat nomor kendaraan |
  | Event | text | kategori ambang batas kecepatan yang dilanggar, format `"Speed >= NN km"` — nilai N standarnya berjenjang: 40, 50, 60, 70, 80 |
  | Speed (km/h) | integer | kecepatan aktual terekam saat itu |
  | Location (Coordinate) | text | koordinat lat,long GPS saat kejadian |

  Catatan penting: **1 kejadian overspeed bisa memicu banyak baris berjenjang** (misal kendaraan ngebut di 65 km/jam akan tercatat di "Speed >= 40", "Speed >= 50", DAN "Speed >= 60" — bertingkat, bukan mutually exclusive). Volume data sangat besar: contoh 1 hari saja bisa 8.000–13.000 baris event untuk 1 cabang.

### 2.2 Safety Behaviour Report (dari AI Camera / VMS dalam kabin)
- **Nama file contoh:** `MOLA - SAFETY BEHAVIOUR VLI 22-31 MEI 2026.xlsx`
- **Struktur:** workbook dengan beberapa sheet:

  **a. Sheet "MOLA"** (data transaksi utama — 1 baris = 1 kejadian pelanggaran perilaku)
  | Kolom | Sifat Input | Keterangan |
  |---|---|---|
  | NO. | otomatis | nomor urut |
  | DATE | otomatis | tanggal kejadian |
  | BRANCH / PROJECT | dropdown | kode cabang (relasi ke master DB-CABANG) |
  | NO. UNIT | dropdown | kombinasi kode unit + nopol, format `"KODEUNIT / NOPOL"` (relasi ke master DB-UNIT) |
  | CATEGORY UNIT | otomatis | jenis kendaraan, auto-lookup dari NO. UNIT (contoh: CC TANSYA, CC DOUBLE TOWING, CC SEMI TRAILER, MICRO BUS, BIG BUS, CC SINGLE TOWING, CDD LONG BOX, CDD JUMBO) |
  | DRIVER | dropdown | nama driver (relasi ke DB-DRIVER), bisa kosong/NOT FOUND jika belum teridentifikasi |
  | NID | otomatis | ID karyawan driver, auto-lookup |
  | NO. HANDPHONE | otomatis | kontak driver, auto-lookup |
  | EVENT CODE | otomatis | ID unik event, format `EC-YYMMDD-CABANG-000001` (auto-generate, increment harian per cabang) |
  | EVENT CATEGORY | dropdown | jenis pelanggaran (relasi ke master EVENT CATEGORY — lihat 2.2.b) |
  | EVENT DESCRIPTION | manual | deskripsi naratif kejadian |
  | EVENT FLAG | otomatis | level risiko: LOW / MEDIUM / HIGH / VERY HIGH — auto-lookup dari master EVENT CATEGORY (Priority Level) |
  | ACTION PLAN | manual | tindak lanjut yang dilakukan tim safety |
  | STATUS | dropdown | status penanganan, contoh: OPEN, CLOSE (tindak lanjut belum/selesai) |
  | FEEDBACK INFORMATION | manual | hasil komunikasi ke driver/PIC |
  | EVIDENCE | manual | link/attachment bukti (foto/video snapshot dari kamera AI) |
  | PIC REMINDER | manual | penanggung jawab follow-up |
  | NOTES | manual | catatan tambahan |

  **b. Sheet "EVENT CATEGORY"** — master jenis pelanggaran perilaku, dengan struktur:
  | NO. | EVENT CATEGORY | PRIORITY LEVEL | DESCRIPTION | CONTROL CATEGORY | SOURCE INFORMATION |
  |---|---|---|---|---|---|

  Daftar kategori event yang sudah terdefinisi (contoh dari master):

  | Event Category | Priority Level | Deskripsi | Control Category | Sumber |
  |---|---|---|---|---|
  | PARKIR > 1440 MENIT | HIGH | Unit mati tidak bergerak di atas 24 jam | EVENT CONTROL | Telegram |
  | OVERSPEEDING | HIGH | Kecepatan di atas speed limit | EVENT CONTROL | Telegram |
  | IDLE > 60 MENIT | MEDIUM | Unit menyala tapi tidak bergerak lebih dari 1 jam | EVENT CONTROL | Telegram |
  | LOCATION NOT UPDATE | LOW | Lokasi tracking tidak update | EVENT CONTROL | TMS report |
  | INSIDEN / EXIDENT | VERY HIGH | Terjadi insiden/kecelakaan | EVENT CONTROL | Telegram |
  | DRIVING FATIGUE | HIGH | Driver mengemudi 4 jam tanpa berhenti | EVENT CONTROL | Telegram |
  | EXCESSIVE NIGHT DRIVING | MEDIUM | Driver mengemudi malam hari (00.00–05.00 WITA) | EVENT CONTROL | Telegram |
  | SMOKING EVENT | MEDIUM | Driver merokok saat mengemudi | EVENT CONTROL | VMS report (AI camera) |
  | CALLING EVENT | MEDIUM | Driver menelpon saat mengemudi | EVENT CONTROL | VMS report (AI camera) |
  | PSYCOLOGICAL FATIGUE | HIGH | Driver terdeteksi mengantuk/menguap | EVENT CONTROL | VMS report (AI camera) |
  | ILLEGAL BACKHAUL | HIGH | Muatan balik tidak terlapor | DIRECT CONTROL | TMS maps |
  | BACKHAUL CONFIRMATION | LOW | Muatan balik sudah terlapor | DIRECT CONTROL | TMS maps |
  | NO GEOFENCE AREA | MEDIUM | Unit parkir di lokasi tanpa geofence | DIRECT CONTROL | TMS maps |
  | ROUTE DEVIATION | MEDIUM | Unit melewati rute salah/tidak diinfokan | DIRECT CONTROL | TMS maps |
  | DRIVER ACCESS VIOLATION | HIGH | Driver belum terdaftar/tidak berizin | DIRECT CONTROL | — |
  | DRIVING LICENSE | HIGH | Lisensi berkendara driver (bermasalah/kadaluarsa) | DIRECT CONTROL | — |
  | P2H & DRIVER CONDITION | HIGH | Kelengkapan P2H & deklarasi kesiapan driver | DIRECT CONTROL | — |
  | PPE Violation | MEDIUM | APD tidak digunakan/tidak standar | DIRECT CONTROL | — |
  | SEATBELT VIOLATION | HIGH | Tidak menggunakan seatbelt saat mengemudi | DIRECT CONTROL | — |

  Catatan: master ini **terbuka untuk ditambah** kategori baru sesuai temuan lapangan; setiap kategori punya bobot **Priority Level** yang menentukan **Event Flag/Risk Category** di laporan (MEDIUM/HIGH/VERY HIGH — pada sample data hanya muncul MEDIUM & HIGH, karena LOW dan VERY HIGH belum terjadi di periode tsb).

  **c. Sheet "DB-CABANG"** — master cabang/proyek:
  | BRANCH CODE | BRANCH NAME |
  |---|---|
  | LMKS | LOGISTIK MAKASSAR |
  | VLI | VEHICLE LOGISTIK INTEGRATED |
  | LJKT | LOGISTIK JAKARTA |
  | SBY1 | SURABAYA |
  | BPP1 | BALIKPAPAN |
  | LWU | LUWU RAYA |
  | KDR1 | SULTRA |
  | MKS1 | SULSELBAR |
  | MKS2 | MAMAGO |
  | CABO | CAHAYA BONE |

  **d. Sheet "DB-UNIT"** — master seluruh armada perusahaan (ribuan unit), kolom:
  `No, tm (kode unit / nopol), Cabang, No. Rangka, No. Mesin, Merk, Tahun, Category Unit, EWD, Product Category, PIC`
  - Contoh Category Unit: DUMP TRUCK TRONTON, CC TANSYA, MICRO BUS, BIG BUS, CDD JUMBO, CDD LONG BOX, CC DOUBLE TOWING, CC SINGLE TOWING, CC SEMI TRAILER, dll.
  - Product Category contoh: TRUCKING.
  - "EWD" tampaknya kode internal (angka) — kemungkinan terkait usia unit/kelas armada, perlu konfirmasi ke tim internal.

  **e. Sheet "DB-DRIVER"** — master seluruh driver perusahaan, kolom:
  `Employee Name, Driver ID, KTP, Work Mobile, Work Phone, Work Email, Company, Branch, Job Position, Nopol, Private Street, Private City, Private State, Private Zip, Private Country, Private Email, Private Phone, Driver License, Marital Status, Spouse Complete Name, Spouse Birthdate, Number of Dependent Children`
  - Data ini adalah **data pribadi/sensitif karyawan** — perlu perlakuan khusus (akses terbatas, tidak untuk ditampilkan mentah di dashboard publik internal, hanya untuk keperluan HR/lookup PIC).

  **f. Sheet "DB-CALENDER"** — kalender master (DATE, MONTH, YEARS), dipakai untuk relasi filter periode/bulan pada dashboard, mencakup rentang panjang (Januari 2025 dst).

  **g. Sheet "INDEX-SPEED"** — master index/rekap referensi kecepatan per nopol (No, NOPOL, UNIT NAME, CABANG, TOP SPEED, REDAKSI) — tampak sebagai tabel bantu (helper table) untuk kalkulasi ranking top speed per unit.

---

## 3. Output / Dashboard yang Sudah Ada (Power BI)

Dashboard existing bernama **"DASHBOARD MOLA"** dari Kalla Transport & Logistics, dibuat di Microsoft Power BI, terdiri dari (minimal) **9 halaman/page**, dengan 2 sub-modul utama:

### A. Page "SAFETY & BEHAVIOR" (dari data VMS/kamera AI — Sheet MOLA)
Filter global di header: **CATEGORY UNIT, PERIODE (bulan/tahun), EVENT CATEGORY, BRANCH/PROJECT**.

Widget yang ada:
1. **Trend Event Summary** (donut chart) — proporsi jumlah kejadian per Event Category (contoh: Smoking 49,88%, Idle>60 menit 25,24%, Calling Event 22,73%, Psycological Fatigue 1,97%, dst).
2. **Branch Summary Event** (bar chart horizontal) — total kejadian per cabang.
3. **Category Unit Summary** (bar chart horizontal) — total kejadian per jenis unit kendaraan.
4. **Risk Category** (pie chart) — proporsi Event Flag: MEDIUM vs HIGH (persentase & jumlah).
5. **Trend by Date** (line chart) — tren jumlah total kejadian harian dalam 1 bulan, plus **rata-rata (Average)** ditampilkan sebagai angka besar di sisi kanan.
6. **Tabel detail transaksi** — kolom: Branch/Project, Event Category, Category Unit, Date, No. Unit, Driver, Status (scrollable, data mentah per kejadian).
7. **Trend by Month** — angka total kejadian bulan berjalan (big number card).
8. **Trend by Week** — tren total kejadian per minggu dalam bulan berjalan (line chart, minggu 1–5).
9. **Trend by Category Event** (matrix/tabel silang) — baris = Category Unit, kolom = tiap Event Category (Calling Event, Idle>60 menit, Parkir>1440 menit, Psycological Fatigue, Seatbelt, dst), sel = jumlah kejadian, dengan baris Total di bawah.
10. **Top Trend by [Kategori Event]** — 4 mini-tabel ranking Top 5 unit dengan kejadian terbanyak, dipecah per jenis event spesifik: Top Trend by Call Event, Top Trend by Smoking, Top Trend by Seatbelt, Top Trend by Fatigue — masing-masing kolom No. Unit & Qty, plus baris Total.

### B. Page "SPEED BEHAVIOR" (dari data GPS — Speed Flag Report)
Filter global di header: **SPEED CATEGORY, PERIODE (bulan), BRANCH, TIME CATEGORY**. Ada juga indikator gauge kecil di pojok atas (kemungkinan overall speed score/index).

Widget yang ada:
1. **Trend by Month** — total event overspeed bulan berjalan (big number).
2. **Trend by Day** — line chart tren jumlah event overspeed per tanggal (1–31) dengan 2 baris angka (atas & bawah — kemungkinan breakdown 2 kategori zona/kondisi berbeda per titik, perlu dikonfirmasi).
3. **Trend by Week** — tren total event per minggu (line chart menurun tajam di minggu ke-5 karena hanya 1 hari data).
4. **Trend by Hours** — bar chart 24 jam (00–23), dengan **color-coding per Zona waktu**: Malam (kuning), Pagi (hijau muda), Siang (hijau tua), Sore (hijau tua gelap), Subuh (merah), Tengah Malam (merah tua) — pembagian zona:
   - Tengah Malam: 00.00–02.00-an
   - Subuh: 03.00–05.00-an
   - Pagi: 06.00–10.00-an
   - Siang: 11.00–15.00-an
   - Sore: 16.00–18.00-an
   - Malam: 19.00–23.00-an
   *(batas jam pasti perlu dikonfirmasi ke tim, estimasi dari pola warna chart)*
5. **4 Tabel "Top Speed Qty"** — ranking Top 5 nopol dengan jumlah event terbanyak, dipecah per ambang kecepatan: **> 50 km/jam, > 60 km/jam, > 70 km/jam, > 80 km/jam** — kolom: Nopol, Category Unit, Qty Event.
6. **Branch Summary Event** (bar chart) — total event overspeed per cabang (dalam satuan "Rb" = ribu).
7. **Time Category** (donut chart) — proporsi event overspeed per Zona waktu (Siang 25,97%, Malam 21,38%, dst).
8. **Speed Category** (bar chart horizontal) — total event per ambang kecepatan (Speed>=40, >=50, >=60, >=70, >=80), dengan jumlah menurun tajam semakin tinggi ambang (pola piramida — wajar karena berjenjang/nested).
9. **Details table** — tabel mentah: Nopol, Tanggal, Speed (km/h), Zona.
10. **Area Speed Event** (peta interaktif Microsoft Bing Maps) — visualisasi sebaran titik kejadian overspeed di peta, dengan color-coding per ambang kecepatan (biru=>=40, dst hingga merah muda=>=80), menampilkan rute/jalur perjalanan unit di wilayah Sulawesi (Makassar dan sekitarnya) — mengonfirmasi cabang VLI beroperasi di area Sulawesi Selatan/Tengah.

---

## 4. Logika Bisnis Kunci (Business Rules) yang Perlu Direplikasi

1. **Event Flag / Risk Category** unit ditentukan bukan manual per baris, melainkan **lookup otomatis dari master Event Category → Priority Level** (LOW/MEDIUM/HIGH/VERY HIGH). Ini penting: kategorisasi risiko adalah **atribut dari jenis pelanggaran**, bukan dari kejadian individual.
2. **Overspeed bersifat berjenjang (cumulative threshold)**: satu kejadian kecepatan tinggi otomatis "naik kelas" ke semua ambang batas di bawahnya. Saat menghitung "Qty Event" per ambang, jangan double count sebagai insiden terpisah — tetap 1 insiden fisik, tapi tercatat di beberapa bucket threshold.
3. **Zona waktu (Time Category)** adalah hasil binning dari jam kejadian (00:00–23:59) ke 6 kategori (Tengah Malam, Subuh, Pagi, Siang, Sore, Malam) — dipakai baik di dashboard Speed maupun sebagai referensi jam kerja aman (mis. "Excessive Night Driving" 00.00–05.00 WITA).
4. **EVENT CODE unik auto-generate**: format `EC-YYMMDD-BRANCHCODE-NNNNNN`, increment per cabang per hari — perlu direplikasi sebagai primary key kejadian.
5. **Kode Unit majemuk**: identitas kendaraan selalu ditulis gabungan `KODE_INTERNAL / NOPOL` (contoh: `CTS038 / DD 8042 SQ`) — relasi ke Category Unit dan Cabang dilakukan lewat lookup ke master DB-UNIT berdasarkan kode ini, bukan nopol saja (karena nopol bisa berubah/dipakai ulang, kode internal lebih stabil).
6. **STATUS tindak lanjut** (OPEN/CLOSE) adalah lapisan workflow terpisah dari kategorisasi risiko — dashboard perlu mampu memisahkan "jumlah kejadian" vs "jumlah kejadian yang belum ditindaklanjuti (OPEN)" sebagai KPI operasional tim safety.
7. **Ranking "Top" (Top Speed, Top Trend by X)** selalu dihitung per **unit/nopol**, bukan per driver — karena satu unit bisa dipakai bergantian oleh beberapa driver (banyak field DRIVER kosong/"NOT FOUND" di sample data, menunjukkan identifikasi driver otomatis dari sistem belum selalu akurat/terhubung sempurna — modul perlu mengantisipasi data driver yang tidak lengkap).

---

## 5. Skala Data & Implikasi Teknis

- Data mentah **sangat granular dan volumenya besar**: 1 cabang, 10 hari, bisa menghasilkan >100.000 baris raw speed event, dan ratusan baris safety behavior event.
- Untuk multi-cabang & real-time, arsitektur perlu:
  - **Ingestion terjadwal** dari sumber GPS/FMS dan VMS/AI-camera (kemungkinan API/export berkala, saat ini tampak manual export ke Excel per hari/per cabang — kandidat kuat untuk otomatisasi).
  - **Star schema**: tabel fakta (`fact_speed_event`, `fact_behavior_event`) + tabel dimensi (`dim_branch`, `dim_unit`, `dim_driver`, `dim_event_category`, `dim_calendar`, `dim_time_zone`).
  - **Agregasi pre-computed** untuk kebutuhan trend (harian/mingguan/bulanan) agar dashboard tidak query jutaan baris raw setiap refresh.
- Data driver mengandung PII (KTP, alamat, kontak pribadi, status pernikahan) — **wajib** dipisah dari layer analitik/dashboard publik internal dan diberi kontrol akses.

---

## 6. Arah Pengembangan yang Diharapkan (untuk AI/Mini-Project)

Standar minimum yang **tidak boleh diturunkan** dari kondisi existing (Power BI) di atas — pengembangan berikutnya idealnya justru **meningkatkan**, bukan menyederhanakan, cakupan berikut:
1. Kemampuan filter multi-dimensi yang sama: Cabang, Periode, Kategori Unit, Kategori Event, Kategori Kecepatan, Zona Waktu.
2. Seluruh jenis visualisasi trend (bulanan, mingguan, harian, per-jam) untuk kedua sub-modul (Safety Behavior & Speed Behavior).
3. Ranking/leaderboard top pelanggar (per unit) dengan breakdown per jenis pelanggaran.
4. Matrix silang Category Unit x Event Category.
5. Peta sebaran geografis kejadian overspeed (given koordinat GPS tersedia di raw data).
6. Tabel detail transaksi yang bisa ditelusuri (drill-down) sampai ke baris kejadian individual, termasuk status tindak lanjutnya.
7. Kalkulasi otomatis Risk/Event Flag berbasis master kategori (bukan input manual berulang).
8. Skalabilitas ke **seluruh cabang** (bukan hanya VLI) dan ke **rentang waktu berjalan** (bukan hanya 1 bulan sampel).

Nilai tambah yang bisa dieksplorasi AI (di luar yang sudah ada di Power BI, sebagai pengembangan lanjutan, bukan pengganti):
- Natural-language query/chat terhadap data ("berapa kejadian mengantuk minggu ini di cabang VLI?").
- Deteksi anomali otomatis (driver/unit dengan tren pelanggaran memburuk).
- Notifikasi otomatis (misal ke Telegram, sesuai kanal "Source Information" yang sudah dipakai tim saat ini) untuk kejadian HIGH/VERY HIGH.
- Rekomendasi action plan otomatis berbasis riwayat driver/unit.
- Prediksi risiko (mis. skor risiko gabungan driver berdasarkan histori speed + behavior event).

---

## 7. Catatan/Asumsi yang Perlu Dikonfirmasi ke Tim Internal

- Definisi jam pasti untuk tiap Zona Waktu (Tengah Malam/Subuh/Pagi/Siang/Sore/Malam).
- Arti kolom "EWD" di master DB-UNIT.
- Sumber & mekanisme pasti integrasi data GPS/FMS dan VMS/AI-camera (real-time API vs export manual berkala) — apakah ada vendor pihak ketiga.
- Threshold speed limit resmi per kategori unit (apakah 40/50/60/70/80 berlaku sama untuk semua jenis kendaraan, atau berbeda per kategori unit seperti Bus vs Truk Tronton).
- Alur approval/eskalasi status OPEN → CLOSE (siapa yang berwenang menutup kejadian).
