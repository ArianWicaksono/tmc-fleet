# Fleet & Dashcam Monitor — TMC EasyGo

Dashboard untuk mengunggah dan menganalisis laporan harian kondisi dashcam armada
(format `.xlsx` dari vendor VMS). Dibangun dengan **Next.js** + **Supabase**
(database) + **Vercel** (hosting), supaya bisa online hari ini juga dan gratis
untuk skala pemakaian tim internal.

---

## 0. Yang Anda butuhkan (semua gratis)

- **Node.js** versi 18 ke atas — cek dengan `node -v` di terminal. Kalau belum ada, unduh di https://nodejs.org
- Akun **Supabase** (database) — daftar gratis di https://supabase.com
- Akun **Vercel** (hosting) — daftar gratis di https://vercel.com (bisa langsung pakai akun GitHub/Google)
- Terminal / command prompt untuk menjalankan beberapa perintah di bawah

Waktu yang dibutuhkan kalau diikuti berurutan: **±20–30 menit** sampai online.

---

## 1. Setup Database (Supabase) — ±5 menit

1. Buka https://supabase.com/dashboard → **New Project**.
2. Isi nama project (misal `tmc-fleet-dashboard`), buat password database (simpan baik-baik, tapi kita tidak akan memakainya langsung), pilih region terdekat (Singapore paling dekat untuk Indonesia).
3. Tunggu ±2 menit sampai project selesai dibuat.
4. Buka menu **SQL Editor** di sidebar kiri → **New query**.
5. Buka file [`supabase/schema.sql`](./supabase/schema.sql) di folder ini, **copy semua isinya**, paste ke SQL Editor, lalu klik **Run**.
   - Ini akan membuat tabel `snapshots` tempat semua data harian disimpan, beserta izin akses (RLS) yang terbuka supaya dashboard langsung bisa dipakai tanpa sistem login.
6. Buka menu **Project Settings** (ikon gerigi) → **API**. Catat dua nilai ini:
   - **Project URL** (bentuknya `https://xxxxx.supabase.co`)
   - **publishable/public** key (kunci panjang di bagian "Project API keys" atau yang disediakan di bagian connect)

   Anda akan pakai keduanya di langkah berikutnya.

---

## 2. Jalankan di komputer Anda dulu (opsional tapi disarankan) — ±5 menit

```bash
cd fleet-dashcam-webapp
npm install
cp .env.local.example .env.local
```

Buka file `.env.local` yang baru dibuat, isi dua baris dengan nilai dari Supabase tadi:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Lalu jalankan:

```bash
npm run dev
```

Buka http://localhost:3000 di browser — coba upload file Excel laporan harian Anda untuk memastikan semuanya bekerja sebelum online-kan ke publik.

---

## 3. Deploy ke Vercel — ±10 menit

### Opsi A — Tercepat, langsung dari terminal (disarankan untuk online hari ini)

```bash
npm install -g vercel
vercel login
```

Dari dalam folder `fleet-dashcam-webapp`, jalankan:

```bash
vercel
```

Ikuti pertanyaan yang muncul (pilih default untuk semua kecuali diminta nama project). Setelah selesai, **jangan langsung buka link yang muncul** — link itu belum punya kredensial Supabase. Tambahkan dulu:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
```
(paste Project URL Anda saat diminta)

```bash
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
```
(paste publishable/public key Anda saat diminta)
```

Anda akan mendapat URL seperti `https://fleet-dashcam-webapp-xxxx.vercel.app` — **ini yang Anda kirim ke bos Anda**. Bisa dibuka siapa saja, dari HP maupun laptop, tanpa install apapun.

### Opsi B — Lewat GitHub (lebih baik untuk jangka panjang)

Lebih baik dipakai setelah hari ini, karena setiap kali Anda `git push`, Vercel otomatis build & deploy ulang — cocok kalau nanti ada perbaikan/fitur tambahan.

1. Buat repository baru di https://github.com/new, lalu:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: fleet dashcam dashboard"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```
2. Di https://vercel.com/new, klik **Import Git Repository**, pilih repo yang baru dibuat.
3. Sebelum klik Deploy, buka bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL` → Project URL Anda
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → publishable/public key Anda
4. Klik **Deploy**. Selesai dalam ±2 menit, dapat URL publik.

---

## 4. Cara pakai sehari-hari

1. Buka URL dashboard Anda (dari Vercel).
2. Setiap hari, saat vendor kirim file Excel via WhatsApp — download filenya, lalu **drag & drop** ke kotak upload di dashboard (bisa upload 2 file sekaligus, misal VMS1 & VMS2).
3. Tanggal terdeteksi otomatis dari nama file (pola `...-DDMMYYYY.xlsx`). Kalau nama file beda formatnya, dashboard akan tanya tanggalnya secara manual.
4. Data langsung tersimpan ke database — siapa pun (termasuk bos Anda) yang buka URL yang sama akan melihat data yang sama, tanpa perlu upload ulang.
5. Tab **Ringkasan** untuk laporan ke atasan (KPI, tren, breakdown per proyek). Tab **Operasional** untuk kerja harian tim (watchlist, peta, tabel detail per unit).

---

## 5. Definisi & Logika Penting

- **Gangguan perangkat** = alarm mengandung *Video lost* atau *Storage unit fault* — ini diturunkan langsung dari konvensi font merah yang dipakai vendor di file aslinya.
- **Tidak reporting** = update posisi terakhir unit lebih dari **2 jam** dari waktu laporan terbaru pada proyek/sheet tersebut. Bisa diubah di `STALE_HOURS` pada `lib/parseWorkbook.js`.
- **Alarm keselamatan** = emergency button, rollover, seat belt, collision, over speed, dsb — dikelompokkan terpisah dari gangguan perangkat karena sifatnya beda (perilaku berkendara, bukan kerusakan alat).

---

## 6. Catatan Keamanan (penting dibaca)

Supabase menggunakan `anon public key` yang **memang dirancang untuk ditaruh di kode sisi browser** — ini bukan kebocoran. Yang membatasi apa yang boleh dilakukan siapa adalah **Row Level Security (RLS) policy** di `supabase/schema.sql`.

Saat ini policy dibuat **terbuka** (siapa pun yang tahu URL dashboard bisa baca & tulis data) — supaya bisa langsung dipakai hari ini tanpa sistem login. Ini wajar untuk pemakaian internal tim yang saling percaya, tapi:

- **Jangan pernah** menaruh `service_role key` Supabase di kode frontend (kita tidak memakainya sama sekali di project ini).
- Kalau nanti perlu membatasi siapa yang boleh mengunggah data (misal hanya tim TMC EasyGo yang login), tambahkan **Supabase Auth** dan ubah policy di `schema.sql` dari `using (true)` menjadi mensyaratkan `auth.role() = 'authenticated'`. Saya bisa bantu implementasikan ini kapan saja Anda butuh.

---

## 7. Struktur Folder

```
fleet-dashcam-webapp/
├── README.md                  ← Anda di sini
├── package.json
├── next.config.js
├── tailwind.config.js
├── .env.local.example         ← contoh, salin jadi .env.local
├── supabase/
│   └── schema.sql             ← jalankan di Supabase SQL Editor
├── lib/
│   ├── parseWorkbook.js       ← parsing Excel & logika klasifikasi (fault/stale/alarm)
│   └── supabaseClient.js      ← koneksi & query ke database
└── app/
    ├── layout.js
    ├── globals.css
    ├── page.js                ← halaman dashboard utama
    └── components/
        ├── UploadZone.js
        ├── KpiCards.js
        ├── StatusBoard.js
        ├── Charts.js           (tren + distribusi alarm)
        ├── Watchlist.js
        ├── FleetMap.js
        └── FleetTable.js
```

---

## 8. Troubleshooting

| Gejala | Kemungkinan penyebab & solusi |
|---|---|
| Halaman muncul tapi data kosong terus / error di console soal Supabase | `.env.local` belum diisi, atau environment variable belum ditambahkan di Vercel. Cek langkah 2 & 3. |
| Upload gagal / tidak tersimpan | Cek apakah `schema.sql` sudah dijalankan di Supabase SQL Editor (tabel `snapshots` harus ada). |
| Peta kosong | Normal kalau kolom Posisi berisi alamat teks, bukan koordinat `lat,long`. Hanya unit dengan format koordinat presisi yang tampil di peta. |
| Kolom data tidak terbaca dengan benar | Pastikan urutan kolom di file Excel vendor tetap: Number, Vehicle Number, Company, Positioning Time, Alarm, Status, Position. |
| Setelah `vercel env add`, env masih belum ke-apply | Wajib deploy ulang dengan `vercel --prod` setelah menambahkan environment variable. |

---

## 9. Kalau butuh dikembangkan lagi

Beberapa arah lanjutan yang bisa ditambahkan kapan pun dibutuhkan: login tim (Supabase Auth), notifikasi otomatis ke WhatsApp saat unit red-flag baru muncul, export laporan mingguan ke PDF/Excel, atau riwayat per-unit (histori satu kendaraan dari waktu ke waktu). Tinggal bilang ke saya kapan diperlukan.
