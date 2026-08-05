-- ============================================================
-- Tiket (Report) — Monev internal permintaan user
-- Perangkat: GPS / Dashcam
-- Aksi: Pindah / Update / Aktivasi / Nonaktif
-- Alur status: BARU -> DIPROSES -> MENUNGGU USER -> SELESAI / BATAL
--
-- Cara pakai:
--   Supabase Dashboard > SQL Editor > New query > salin seluruh file ini > Run.
-- RLS dinonaktifkan karena aplikasi internal (1-2 user, tanpa login);
-- anon key dipakai langsung dari client.
-- ============================================================

create extension if not exists pgcrypto;

-- Tabel utama tiket
create table if not exists public.tickets (
  id          uuid        primary key default gen_random_uuid(),
  perangkat   text        not null check (perangkat in ('GPS','Dashcam')),
  aksi        text        not null check (aksi in ('Pindah','Update','Aktivasi','Nonaktif')),
  unit        text        not null default '',
  judul       text        not null default '',
  pengaju     text        not null default '',
  kontak      text        not null default '',
  prioritas   text        not null default 'Sedang' check (prioritas in ('Rendah','Sedang','Tinggi')),
  status      text        not null default 'baru'   check (status in ('baru','diproses','menunggu','selesai','batal')),
  ticket_no   text,                                -- nomor tiket penanganan, format RQT-DDM-YYMMDD-XXXX
  deskripsi   text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  resolved_at timestamptz
);

-- Riwayat / audit perubahan (untuk pelacakan & monev)
create table if not exists public.ticket_events (
  id         uuid        primary key default gen_random_uuid(),
  ticket_id  uuid        not null references public.tickets(id) on delete cascade,
  status     text        not null default 'baru',
  note       text        not null default '',
  created_at timestamptz not null default now()
);

-- Akses langsung utk anon key (internal, tanpa login)
alter table public.tickets        disable row level security;
alter table public.ticket_events  disable row level security;

-- Indeks umum
create index if not exists idx_tickets_status  on public.tickets(status);
create index if not exists idx_tickets_created  on public.tickets(created_at);
create index if not exists idx_events_ticket     on public.ticket_events(ticket_id);