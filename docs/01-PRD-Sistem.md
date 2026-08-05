# PRD — Sistem Monitoring Armada & Manajemen Permintaan

> **Dokumen**: `Docs/01-PRD-Sistem.md`
> **Status**: Draft v0.1
> **Tanggal**: 04 Agustus 2026
> **Aplikasi**: Fleet Dashcam Webapp (`fleet-dashcam-webapp`)

---

## 1. Ringkasan Eksekutif

Sistem ini adalah platform internal (tanpa login, 1–2 pengguna) untuk **memonitor kesehatan armada berbasis dashcam/GPS** dan **mengelola permintaan/servis perangkat** dalam satu tempat. Berawal dari dashboard unggahan laporan vendor harian, sistem akan berkembang menjadi **platform multi-modul**:

1. **Dashcam Monitoring** — status kesegaran update & gangguan perangkat per unit.
2. **Tiketing Report** — permintaan user (pindah/update/aktivasi/nonaktif) beserta alurnya.
3. **Safety Report** — data pelanggaran driver (rencana).
4. **Modul lain** — masih didiskusikan.

Landasan utama: **master data armada dibuat lebih dulu** sebagai "golden record" yang dipakai semua modul, agar sistem bisa dikembangkan jauh tanpa menjadi kumpulan silo yang tidak terhubung.

---

## 2. Tujuan & Latar Belakang

### 2.1 Masalah yang dijawab
- Memantau ribuan unit kendaraan dari laporan vendor dashcam/GPS yang datang **harian dalam format Excel** (format dapat berubah kolomnya).
- Mengetahui unit yang **tidak update** (stale), **out of service**, dan yang bermasalah perangkat (gangguan Video lost / Storage fault).
- Mencatat & menindaklanjuti **permintaan user** tentang perangkat (pindah, update, aktivasi, nonaktif) yang selama ini tidak terdokumentasi rapi.
- (Rencana) Mendokumentasikan **pelanggaran driver** untuk laporan keselamatan.

### 2.2 Tujuan
- Menyajikan ringkasan yang **konsisten dan sum-to-100%** sehingga mudah dibaca manajemen.
- Menjadi **satu sumber data** untuk semua modul (dashboard, tiket, safety) melalui master data.
- **Mudah dikembangkan**: menambah modul baru tanpa merombak modul lama.

### 2.3 Pengguna
- **1–2 pengguna internal** (Analis Monev + pimpinan). Tanpa fitur login pada fase awal; kredensial menyusul saat data bersifat sensitif (Safety).

---

## 3. Ruang Lingkup & Non-Goal

### Dalam lingkup (fase awal)
- Unggah laporan Excel → parse → simpan snapshot harian per proyek.
- Dashboard kesegaran & kesehatan armada (ringkasan, tren, peta, watchlist, tabel detail).
- Modul Tiket (form, kanban status, ringkasan).
- Master data armada + pemetaan unit vendor → VHCID.
- Konfigurasi via SQL migration (`supabase/*.sql`).

### Non-goal (belum/sengaja tidak dilakukan)
- Tidak ada login & manajemen pengguna di fase awal (keputusan disengaja, direvisi sebelum modul Safety).
- Tidak ada integrasi real-time ke perangkat (data tetap dari laporan vendor).
- Tidak ada alur approval berjenjang.
- Tidak ada multi-branch/tanant di fase awal (jika diperlukan, tambahkan `branch` sebagai dimensi RLS).

---

## 4. Prinsip Desain (Landasan Berpikir)

1. **Master data adalah fondasi.** Setiap modul merujuk `vehicles` (VHCID), bukan teks bebas.
2. **Satu codebase, satu database, banyak modul.** Bukan 4–5 aplikasi terpisah; pisahkan sebagai *route group* dengan shell bersama.
3. **Kunci stabil ≠ atribut berubah.** `VHCID` & `Nomor Rangka` permanen; `Nopol`, `Branch`, `Project`, `Product` dapat berubah → simpan tanggal aktif (`valid_from`/`valid_to`).
4. **Ringkasan harus sum-to-100%.** Model dua-sumbu: kesegaran update (selalu 100% semua unit) dan kesehatan perangkat (dimensi terpisah).
5. **Parsing laporan yang kebal pergeseran.** Deteksi header + alias + fallback, bukan posisi kolom mati (sudah terbukti 12/12 uji).
6. **Keamanan proporsional.** RLS nonaktif cukup untuk data internal non-sensitif; **wajib diaktifkan kembali + login sebelum modul Safety**.
7. **Mudah dieksekusi.** Skema database dieksekusi via SQL Editor; semua perubahan terdokumentasi di `Docs/`.

---

## 5. Arsitektur Teknologi

| Lapisan | Teknologi |
|---|---|
| Frontend | Next.js **14.2.5** (App Router), React, Tailwind CSS |
| Grafik | `react-chartjs-2` / Chart.js |
| Spreadsheet | `xlsx` (parse laporan vendor) |
| Peta | `react-leaflet` |
| Database | **Supabase** (PostgreSQL) |
| Client DB | `@supabase/supabase-js` (anon key) |
| Deploy | **Vercel** (auto redeploy saat push ke GitHub) |
| Repo | GitHub `ArianWicaksono/tmc-fleet` |

### Struktur aplikasi
- `app/page.js` — shell utama + tab (sementara; akan jadi route-group per modul).
- `app/components/*` — modul UI.
- `lib/parseWorkbook.js` — parser Excel + `computeKPIs`.
- `lib/supabaseClient.js` — akses Supabase.
- `supabase/*.sql` — skema database (dijalankan manual di SQL Editor).

### Environment
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` di `.env.local` (tidak di-commit; contoh di `.env.local.example`).

---

## 6. Data & Model

### 6.1 Master Data Armada (`vehicles`) — 6 kolom utama
Ditetapkan oleh pemilik sistem (dibuat manual, nanti dipindahkan ke file MD/seed):

| # | Kolom | Peran |
|---|---|---|
| 1 | `vhid` | ID internal unik & **stabil** → **primary key** |
| 2 | `nopol_actual` | Plat nomor (dapat berubah → bukan key) |
| 3 | `branch` | Cabang |
| 4 | `project` | Kelompok proyek |
| 5 | `nomor_rangka` | VIN, unik & immutable |
| 6 | `product` | Jenis perangkat/produk (GPS/Dashcam/model) |

Rekomendasi tambahan (untuk kehandalan masa depan):
- `valid_from` / `valid_to` — periode aktif, agar perubahan nopol/cabang tidak menimpa riwayat.
- `vehicle_mapping` — pemetaan teks unit dari laporan vendor → `vhid`; unit tanpa pemetaan diberi tanda `unmapped` (metrik kualitas data).
- Tabel `drivers` **sengaja belum dibuat** (belum ada data); akan ditambahkan bersamaan modul Safety.

> ### ⚠️ KLARIFIKASI PENTING — JANGAN SAMA KAN DENGAN MASTER DI SUMBER MOLA
>
> **Master data milik kita (6 kolom: `vhid, nopol_actual, branch, project, nomor_rangka, product`) BUKAN master data yang tertanam di file sumber MOLA.**
>
> Tabel `DB-UNIT`, `DB-CABANG`, `DB-DRIVER`, dan `EVENT CATEGORY` di dalam file MOLA (`MODUL_SAFETY_DRIVING_MOLA.md`) adalah **master data khusus yang dibuat bos hanya untuk menarik data-data tertentu** pada dashboard Power BI tersebut. Skopnya terbatas dan terkait kebutuhan pelaporan MOLA, **bukan** master data kanonik armada kita.
>
> Aturan agar tidak keliru ke depannya:
> 1. **Jangan pernah men-seed/menggunakan `DB-UNIT`, `DB-CABANG`, `DB-DRIVER` MOLA sebagai sumber master data kita.** Mereka bukan source of truth untuk `vehicles`/`drivers` kita.
> 2. **Keberadaan `DB-DRIVER` di MOLA TIDAK berarti kita sudah punya data driver.** Kita tetap belum memilikinya; tabel `drivers` kita tetap belum dibuat sampai ada data nyata.
> 3. Master data `vehicles` (6 kolom) kita **tetap dibangun sesuai keputusan awal**: dibuat manual, nanti diimpor via file MD.
> 4. Data MOLA hanya relevan untuk modul Safety (mentah per kejadian), bukan untuk membangun master armada kita.

### 6.2 Data Historis
- `snapshots(date, project, records JSON, updated_at)` — hasil parse harian per proyek. JSON dipertahankan untuk snapshot analitik; **query lintas-modul harus lewat `vhid`**, bukan teks unit.
- `upload_logs(filename, report_date, project_names, file_hash, status, message, created_at)` — jejak unggahan & deteksi duplikat.

### 6.3 Tiket
- `tickets` — `perangkat (GPS/Dashcam)`, `aksi (Pindah/Update/Aktivasi/Nonaktif)`, `unit`, `judul`, `pengaju`, `kontak`, `prioritas (Rendah/Sedang/Tinggi)`, `status`, `deskripsi`, timestamp.
  - **Evolusi**: kolom `unit` (teks bebas) akan diubah menjadi FK `vehicle_id` setelah master data aktif.
- `ticket_events` — jejak perubahan status untuk audit & monev.

---

## 7. Modul 1 — Dashcam Monitoring (SELESAI, terus disempurnakan)

### 7.1 Definisi status (dua sumbu)
- **Kesegaran Update** (kategori hari, selalu total 100% dari seluruh unit):
  - `update` — update < 7 hari
  - `notUpdate` — 7–30 hari
  - `outOfService` — > 30 hari
- **Kesehatan Perangkat** (dimensi terpisah, bukan persentase dari total):
  - `fault` — alarm vendor: *Video lost* atau *Storage unit fault*

### 7.2 Fitur
- **Ringkasan (Management)**: KPI 5 kartu, doughnut ganda (kesegaran + kesehatan), tren harian (stacked area kesegaran + garis putus `% gangguan`), bar status per proyek.
- **Operasional (Detail)**: Watchlist unit terlama tidak update, peta sebaran (hanya unit dengan koordinat presisi), tabel detail dengan filter "Unit Kritis" (gangguan + tidak update).
- **Riwayat Upload**: jejak file diunggah + status (berhasil/duplikat/gagal).

### 7.3 Aturan parsing
- Deteksi baris header + alias kolom (fuzzy) + fallback; `parsePositioningTime` menangani Date/serial.
- Referensi waktu (`refTime`) per proyek untuk menghitung `staleDays`.

---

## 8. Modul 2 — Tiketing Report (FASE 1 SELESAI)

### 8.1 Tujuan
Mencatat & menindaklanjuti permintaan user terhadap perangkat, dengan jejak untuk monev.

### 8.2 Tipe tiket (dua dimensi)
- **Perangkat**: `GPS`, `Dashcam`
- **Aksi**: `Pindah`, `Update`, `Aktivasi`, `Nonaktif`
(dua dimensi kecil ini dipilih agar mudah disajikan sebagai grafik/ringkasan)

### 8.3 Alur status
`BARU → DIPROSES → MENUNGGU USER → SELESAI` atau `BATAL` (timestamp di `ticket_events`; `resolved_at` terisi saat Selesai/Batal).

### 8.4 Fitur (implementasi saat ini)
- Form tiket (perangkat, aksi, unit, judul, pengaju, kontak, prioritas, deskripsi).
- Kanban 5 kolom + filter status.
- Ringkasan per perangkat & per aksi.
- Peringatan aging: `>7 hari` (kuning), `>30 hari` (merah) untuk status aktif.

### 8.5 Evolusi yang dijadwalkan
- `unit` bebas → FK `vehicle_id` (mengikuti master data).
- Filter/ringkasan per `branch`/`project`.
- Metrik monev: aging, rata-rata hari selesai, jumlah per perangkat/aksi.

---

## 9. Modul 3 — Safety Report (RENCANA)

- Data pelanggaran driver (kecepatan, SOP, dll.) dari laporan/alat.
- Dependensi: `vehicles` + `drivers`; **syarat wajib: aktifkan RLS + login** sebelum rilis karena data sensitif.
- Output: ringkasan per driver/unit/branch, tren pelanggaran, daftar hitam sementara.
- Skema & UI akan dirinci di dokumen PRD terpisah.

---

## 10. Modul Lain (Diskusi)

- Daftar kandidat: perawatan berkala (maintenance), garansi perangkat, inventaris SIM & dokumen, laporan produktivitas, dsb.
- **Kriteria masuk modul baru**: punya referensi ke `vehicles`/`drivers`, bisa diringkas untuk manajemen, dan tidak menambah silo baru.

---

## 11. Konvensi Teknis (SOP Pengembangan)

- Skema DB ditulis sebagai **SQL migration** di `supabase/` lalu dijalankan di Supabase **SQL Editor** (RLS nonaktif untuk data internal non-sensitif saat ini).
- Setiap keputusan/desain didokumentasikan di `Docs/` sebelum/bersamaan dengan implementasi.
- Perubahan parser harus diuji (uji sintetik dengan format lama/baru/geser).
- Jangan mengaktifkan RLS tanpa menyiapkan login terlebih dahulu (agar tidak memblokir anon key yang dipakai sekarang).
- Dev server: `npm run dev` (port 3000); hindari `npm run build` bersamaan dengan dev berjalan.
- `git commit`/`push` hanya atas permintaan eksplisit; push memicu auto-deploy Vercel.

---

## 12. Roadmap

| Fase | Isi | Status |
|---|---|---|
| **0 — Fondasi dashboard** | Unggah+parse, KPI dua-sumbu, peta, watchlist, tabel, riwayat | ✅ Selesai |
| **1 — Tiket** | Tab & modul Tiket, kanban, skema `tickets`/`ticket_events` | ✅ Selesai |
| **2 — Master Data** | `vehicles` (6 kolom + `valid_from`), `drivers`, `vehicle_mapping`; seed manual → file MD | ⏳ Berikutnya |
| **3 — Platforming** | Route-group per modul; tiket FK `vehicle_id`; konfigurasi env | ⏳ Rencana |
| **4 — Keamanan** | Login + RLS per peran | ⏳ Rencana |
| **5 — Safety** | Modul pelanggaran driver | ⏳ Rencana |
| **6 — Modul lain** | Menunggu keputusan | ⏳ Diskusi |

---

## 13. Kriteria Keberhasilan

- Ringkasan konsisten: semua kartu/grafik kesegaran selalu total 100%.
- Semua tiket bisa dilacak status + riwayatnya, dan dihubungkan ke unit (`vhid`).
- Tambah modul baru **tanpa** menyentuh kode modul lama (independensi longgar).
- Kualitas data terukur: persentase unit vendor yang berhasil dipetakan ke `vhid` (target tinggi).
- Data Safety dilindungi login + RLS sebelum dipublikasikan.

---

## 14. Glosarium

| Istilah | Arti |
|---|---|
| VHCID | ID internal unik kendaraan (primary key master) |
| VIN / Nomor Rangka | Nomor identitas fisik kendaraan, immutable |
| Nopol Actual | Plat nomor terpasang saat ini |
| Gangguan / fault | Alarm vendor: Video lost atau Storage unit fault |
| OUT OF SERVICE | Unit tidak update > 30 hari |
| NOT UPDATE | Unit tidak update 7–30 hari |
| refTime | Waktu referensi per proyek untuk menghitung selisih hari |
